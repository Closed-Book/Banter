const DEFAULT_BASE_URL = 'https://api.stepfun.com/v1';
const DEFAULT_TTS_MODEL = 'stepaudio-2.5-tts';
const DEFAULT_VOICE = 'cixingnansheng';
const MAX_JSON_BODY_BYTES = 32 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_TTS_CACHE_ENTRIES = 96;
const TTS_UPSTREAM_INTERVAL_MS = 6800;
const TTS_RATE_LIMIT_RETRY_MS = 20000;
const TTS_RATE_LIMIT_RETRIES = 4;

function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_JSON_BODY_BYTES) {
        tooLarge = true;
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      if (tooLarge) {
        const error = new Error('Request body is too large');
        error.statusCode = 413;
        reject(error);
        return;
      }

      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        const error = new Error('Request body must be valid JSON');
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function createTtsCacheKey(requestBody) {
  return JSON.stringify({
    model: requestBody.model,
    input: requestBody.input,
    voice: requestBody.voice,
    response_format: requestBody.response_format,
    speed: requestBody.speed,
    volume: requestBody.volume,
    sample_rate: requestBody.sample_rate,
    stream_format: requestBody.stream_format,
    markdown_filter: requestBody.markdown_filter,
    instruction: requestBody.instruction || '',
  });
}

function rememberTtsAudio(cache, key, payload) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, payload);

  while (cache.size > MAX_TTS_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function sendAudio(res, audio, contentType, cacheStatus) {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-TTS-Cache', cacheStatus);
  res.end(audio);
}

async function readUpstreamError(response) {
  const text = await response.text();
  if (!text) return `Stepfun request failed with ${response.status}`;

  try {
    const parsed = JSON.parse(text);
    return parsed.error?.message || parsed.message || text;
  } catch {
    return text.slice(0, 1200);
  }
}

function createTtsScheduler(getIntervalMs = () => TTS_UPSTREAM_INTERVAL_MS) {
  const queue = [];
  let active = false;
  let lastStartedAt = 0;

  function drain() {
    if (active || queue.length === 0) return;

    const waitMs = Math.max(0, lastStartedAt + getIntervalMs() - Date.now());
    if (waitMs > 0) {
      setTimeout(drain, waitMs);
      return;
    }

    const item = queue.shift();
    active = true;
    lastStartedAt = Date.now();

    item
      .task()
      .then(item.resolve, item.reject)
      .finally(() => {
        active = false;
        drain();
      });
  }

  return function scheduleTts(task) {
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      drain();
    });
  };
}

async function requestSpeechAudioFile({ config, getApiKey, requestBody }) {
  const responseFormat = requestBody.response_format;
  const contentType = responseFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';

  for (let attempt = 0; attempt <= TTS_RATE_LIMIT_RETRIES; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
    const apiKey = getApiKey();

    try {
      const response = await fetch(`${config.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: createRequestHeaders(apiKey),
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (response.status === 429 && attempt < TTS_RATE_LIMIT_RETRIES) {
        await readUpstreamError(response);
        await wait(config.apiKeys.length > 1 ? 1000 : TTS_RATE_LIMIT_RETRY_MS);
        continue;
      }

      if (!response.ok) {
        const error = new Error(await readUpstreamError(response));
        error.statusCode = response.status;
        throw error;
      }

      const audio = await collectSpeechAudio(response);
      if (!audio.length) {
        const error = new Error('No audio chunks returned');
        error.statusCode = 502;
        throw error;
      }

      return { audio, contentType };
    } finally {
      clearTimeout(timeout);
    }
  }

  const error = new Error('Stepfun TTS rate limit is still active');
  error.statusCode = 429;
  throw error;
}

async function relaySse(req, res, response, abortController) {
  const reader = response.body?.getReader();
  if (!reader) {
    sendJson(res, 502, { error: 'Stepfun response body is empty' });
    return;
  }

  req.on('close', () => {
    abortController.abort();
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
}

async function collectSpeechAudio(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Stepfun response body is empty');

  const decoder = new TextDecoder();
  const chunks = [];
  let buffer = '';

  function readSseBlock(block) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');

    if (!data) return true;
    if (data === '[DONE]') return false;

    const event = JSON.parse(data);
    if (event.type === 'speech.audio.error' || event.type === 'error') {
      throw new Error(event.message || 'Stepfun TTS stream failed');
    }
    if (event.type === 'speech.audio.delta' && event.audio) {
      chunks.push(Buffer.from(event.audio, 'base64'));
    }
    return event.type !== 'speech.audio.done';
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      if (!readSseBlock(block)) {
        reader.cancel().catch(() => {});
        return Buffer.concat(chunks);
      }
    }

    if (done) break;
  }

  if (buffer) readSseBlock(buffer);
  return Buffer.concat(chunks);
}

function getAuthConfig(env) {
  return {
    apiKeys: uniqueValues([env.STEPFUN_VOICE_API_KEY, env.STEPFUN_ROLEPLAY_API_KEY]),
    baseUrl: normalizeBaseUrl(env.STEPFUN_BASE_URL || env.STEP_API_BASE_URL || env.VITE_STEPFUN_BASE_URL),
    ttsModel: env.STEPFUN_TTS_MODEL || DEFAULT_TTS_MODEL,
  };
}

function createRequestHeaders(apiKey) {
  return {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function validateMethod(req, res, allowedMethod) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }

  if (req.method !== allowedMethod) {
    sendJson(res, 405, { error: `Use ${allowedMethod} for this endpoint` });
    return false;
  }

  return true;
}

export function createStepfunVoiceProxy(env) {
  const config = getAuthConfig(env);
  const ttsAudioCache = new Map();
  const pendingTtsAudio = new Map();
  const scheduleTts = createTtsScheduler(() =>
    Math.max(3000, Math.ceil(TTS_UPSTREAM_INTERVAL_MS / Math.max(1, config.apiKeys.length))),
  );
  let apiKeyCursor = 0;

  function getNextApiKey() {
    const key = config.apiKeys[apiKeyCursor % config.apiKeys.length];
    apiKeyCursor += 1;
    return key;
  }

  async function handleStatus(req, res) {
    if (!validateMethod(req, res, 'GET')) return;
    sendJson(res, 200, {
      configured: config.apiKeys.length > 0,
      baseUrl: config.baseUrl,
      ttsModel: config.ttsModel,
      keyCount: config.apiKeys.length,
    });
  }

  async function handleTts(req, res) {
    if (!validateMethod(req, res, 'POST')) return;
    if (!config.apiKeys.length) {
      sendJson(res, 503, { error: 'STEPFUN_VOICE_API_KEY or STEPFUN_ROLEPLAY_API_KEY is not configured' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const input = String(body.input || '').trim();
      if (!input) {
        sendJson(res, 400, { error: 'input is required' });
        return;
      }

      if (input.length > 1000) {
        sendJson(res, 400, { error: 'input must be 1000 characters or fewer' });
        return;
      }

      const model = body.model || config.ttsModel;
      const requestBody = {
        model,
        input,
        voice: body.voice || DEFAULT_VOICE,
        response_format: body.responseFormat || body.response_format || 'mp3',
        speed: getNumber(body.speed, 1),
        volume: getNumber(body.volume, 1),
        sample_rate: getNumber(body.sampleRate || body.sample_rate, 24000),
        stream_format: 'sse',
        markdown_filter: body.markdownFilter ?? body.markdown_filter ?? true,
      };

      const instruction = String(body.instruction || '').trim();
      if (instruction && model === DEFAULT_TTS_MODEL) {
        requestBody.instruction = instruction.slice(0, 200);
      }

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${config.baseUrl}/audio/speech`, {
          method: 'POST',
          headers: createRequestHeaders(getNextApiKey()),
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        if (!response.ok) {
          sendJson(res, response.status, {
            error: 'Stepfun TTS request failed',
            detail: await readUpstreamError(response),
          });
          return;
        }

        await relaySse(req, res, response, abortController);
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message });
    }
  }

  async function handleTtsFile(req, res) {
    if (req.method === 'GET') {
      // GET is used as an <audio src> target for automatic playback.
    } else if (!validateMethod(req, res, 'POST')) {
      return;
    }
    if (!config.apiKeys.length) {
      sendJson(res, 503, { error: 'STEPFUN_VOICE_API_KEY or STEPFUN_ROLEPLAY_API_KEY is not configured' });
      return;
    }

    try {
      const body =
        req.method === 'GET'
          ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries())
          : await readJsonBody(req);
      const input = String(body.input || '').trim();
      if (!input) {
        sendJson(res, 400, { error: 'input is required' });
        return;
      }

      if (input.length > 1000) {
        sendJson(res, 400, { error: 'input must be 1000 characters or fewer' });
        return;
      }

      const model = body.model || config.ttsModel;
      const requestBody = {
        model,
        input,
        voice: body.voice || DEFAULT_VOICE,
        response_format: body.responseFormat || body.response_format || 'mp3',
        speed: getNumber(body.speed, 1),
        volume: getNumber(body.volume, 1),
        sample_rate: getNumber(body.sampleRate || body.sample_rate, 24000),
        stream_format: 'sse',
        markdown_filter: body.markdownFilter ?? body.markdown_filter ?? true,
      };

      const instruction = String(body.instruction || '').trim();
      if (instruction && model === DEFAULT_TTS_MODEL) {
        requestBody.instruction = instruction.slice(0, 200);
      }

      const cacheKey = createTtsCacheKey(requestBody);
      const cachedAudio = ttsAudioCache.get(cacheKey);
      if (cachedAudio) {
        rememberTtsAudio(ttsAudioCache, cacheKey, cachedAudio);
        sendAudio(res, cachedAudio.audio, cachedAudio.contentType, 'hit');
        return;
      }

      let pendingAudio = pendingTtsAudio.get(cacheKey);
      if (!pendingAudio) {
        pendingAudio = scheduleTts(() => requestSpeechAudioFile({ config, getApiKey: getNextApiKey, requestBody }));
        pendingTtsAudio.set(cacheKey, pendingAudio);
        pendingAudio.finally(() => pendingTtsAudio.delete(cacheKey)).catch(() => {});
      }

      const generatedAudio = await pendingAudio;
      rememberTtsAudio(ttsAudioCache, cacheKey, generatedAudio);
      sendAudio(res, generatedAudio.audio, generatedAudio.contentType, 'miss');
    } catch (error) {
      sendJson(res, error.name === 'AbortError' ? 504 : error.statusCode || 500, {
        error:
          error.statusCode === 429
            ? '语音生成排队中，请稍后再试。'
            : error.name === 'AbortError'
              ? 'Stepfun TTS request timed out'
              : error.message,
      });
    }
  }

  return {
    name: 'stepfun-voice-proxy',
    configureServer(server) {
      server.middlewares.use('/api/voice/status', handleStatus);
      server.middlewares.use('/api/voice/tts-file', handleTtsFile);
      server.middlewares.use('/api/voice/tts', handleTts);
    },
  };
}
