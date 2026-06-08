const TTS_MODE = (import.meta.env.VITE_TTS_MODE || 'live').toLowerCase();
const DEMO_TTS_BASE_URL = (import.meta.env.VITE_DEMO_TTS_BASE_URL || '/demo-tts').replace(/\/+$/, '');

function isPrebuiltTtsMode() {
  return TTS_MODE === 'prebuilt';
}

function isTtsOff() {
  return TTS_MODE === 'off';
}

export function getSpeechAssetId({ input, kind, speakerName }) {
  const raw = [kind || 'npc', speakerName || '', String(input || '').trim()].join('|');
  let hash = 0x811c9dc5;

  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, '0');
}

export function getSpeechAssetName({ input, kind, speakerName, responseFormat = 'mp3' }) {
  const prefix = kind === 'card' ? 'card' : 'npc';
  return `${prefix}-${getSpeechAssetId({ input, kind, speakerName })}.${responseFormat}`;
}

function readSseBlock(block) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');

  if (!data) return null;
  if (data === '[DONE]') return { done: true };
  return { event: JSON.parse(data) };
}

async function readSseStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('SSE response body is empty');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const parsed = readSseBlock(block);
      if (parsed?.done) return;
      if (parsed?.event && onEvent(parsed.event) === false) {
        reader.cancel().catch(() => {});
        return;
      }
    }

    if (done) break;
  }

  const parsed = readSseBlock(buffer);
  if (parsed?.event) onEvent(parsed.event);
}

async function readError(response) {
  const text = await response.text();
  if (!text) return `HTTP ${response.status}`;

  try {
    const payload = JSON.parse(text);
    return payload.detail || payload.error || text;
  } catch {
    return text;
  }
}

export async function fetchVoiceStatus() {
  if (isTtsOff()) {
    return { configured: false, mode: 'off' };
  }

  if (isPrebuiltTtsMode()) {
    return {
      configured: true,
      mode: 'prebuilt',
      baseUrl: DEMO_TTS_BASE_URL,
      ttsModel: 'prebuilt-demo-audio',
      keyCount: 0,
    };
  }

  const response = await fetch('/api/voice/status');
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  return { ...payload, mode: 'live' };
}

export function getSpeechInstruction(kind, npcName) {
  if (kind === 'card') {
    return '语气清晰、稳定、自然，像在认真回答面试问题。';
  }

  return `扮演${npcName || '对方'}，语气自然、克制，有现实对话里的停顿和压迫感。`;
}

export function buildSpeechFileUrl({ input, kind, speakerName, responseFormat = 'mp3', sampleRate = '24000' }) {
  if (isPrebuiltTtsMode()) {
    return `${DEMO_TTS_BASE_URL}/${getSpeechAssetName({ input, kind, speakerName, responseFormat })}`;
  }

  const params = new URLSearchParams({
    input,
    instruction: getSpeechInstruction(kind, speakerName),
    responseFormat,
    sampleRate,
  });
  return `/api/voice/tts-file?${params.toString()}`;
}

export async function prefetchSpeech({ input, kind, speakerName, timeoutMs = 30000 }) {
  if (isTtsOff()) {
    return { bytes: 0, type: 'off', skipped: true };
  }

  const abortController = new AbortController();
  const timeout = window.setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(
      buildSpeechFileUrl({
        input,
        kind,
        speakerName,
      }),
      { signal: abortController.signal },
    );
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const blob = await response.blob();
    return { bytes: blob.size, type: blob.type };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('语音预热超时');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function synthesizeSpeech({
  input,
  instruction,
  kind = 'npc',
  speakerName = '',
  voice = 'cixingnansheng',
  timeoutMs = 30000,
}) {
  if (isTtsOff()) {
    throw new Error('语音已关闭');
  }

  const abortController = new AbortController();
  const timeout = window.setTimeout(() => abortController.abort(), timeoutMs);

  try {
    if (isPrebuiltTtsMode()) {
      const response = await fetch(
        buildSpeechFileUrl({
          input,
          kind,
          speakerName,
        }),
        { signal: abortController.signal },
      );
      if (!response.ok) {
        throw new Error(`预制语音不存在：${response.url}`);
      }
      return response.blob();
    }

    const response = await fetch('/api/voice/tts-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        voice,
        instruction,
        responseFormat: 'mp3',
        sampleRate: 24000,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return response.blob();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('语音生成超时');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
