const DEFAULT_BASE_URL = 'https://api.stepfun.com/v1';
const DEFAULT_MODEL = 'step-2-16k';
const MAX_JSON_BODY_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 22_000;

function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, '');
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

function getAuthConfig(env) {
  return {
    apiKey: env.STEPFUN_ROLEPLAY_API_KEY || '',
    baseUrl: normalizeBaseUrl(env.STEPFUN_ROLEPLAY_BASE_URL || env.STEPFUN_BASE_URL || env.STEP_API_BASE_URL),
    model: env.STEPFUN_ROLEPLAY_MODEL || env.VITE_STEPFUN_MODEL || DEFAULT_MODEL,
  };
}

export function createStepfunRoleplayProxy(env) {
  const config = getAuthConfig(env);

  async function handleStatus(req, res) {
    if (!validateMethod(req, res, 'GET')) return;
    sendJson(res, 200, {
      configured: Boolean(config.apiKey),
      baseUrl: config.baseUrl,
      model: config.model,
    });
  }

  async function handleChatCompletions(req, res) {
    if (!validateMethod(req, res, 'POST')) return;
    if (!config.apiKey) {
      sendJson(res, 503, { error: 'STEPFUN_ROLEPLAY_API_KEY is not configured' });
      return;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    try {
      const body = await readJsonBody(req);
      const requestBody = {
        ...body,
        model: body.model || config.model,
      };

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        sendJson(res, response.status, {
          error: 'Stepfun roleplay request failed',
          detail: await readUpstreamError(response),
        });
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json; charset=utf-8');
      res.end(await response.text());
    } catch (error) {
      const isAbort = error.name === 'AbortError';
      sendJson(res, isAbort ? 504 : error.statusCode || 500, {
        error: isAbort ? 'Stepfun roleplay request timed out' : error.message,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    name: 'stepfun-roleplay-proxy',
    configureServer(server) {
      server.middlewares.use('/api/roleplay/status', handleStatus);
      server.middlewares.use('/api/roleplay/chat/completions', handleChatCompletions);
    },
  };
}
