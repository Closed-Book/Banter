import { useEffect, useRef, useState } from 'react';
import { buildSpeechFileUrl, fetchVoiceStatus, getSpeechInstruction, synthesizeSpeech } from './voiceStreamClient';

function VoicePracticePanel({ npcName, npcText, selectedCard, currentRound, autoPlayNpc = false }) {
  const [status, setStatus] = useState(null);
  const [playTarget, setPlayTarget] = useState(null);
  const [autoPlaybackStatus, setAutoPlaybackStatus] = useState('idle');
  const [autoSpeakerName, setAutoSpeakerName] = useState('');
  const [ttsError, setTtsError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const autoPlayKeyRef = useRef('');
  const activeSourceRef = useRef(null);
  const audioUrlRef = useRef('');

  const configured = Boolean(status?.configured);
  const cardText = selectedCard?.full_text || '';
  const autoPlayKey =
    autoPlayNpc && configured && npcText?.trim() ? `${currentRound}:${npcName || 'npc'}:${npcText}` : '';

  useEffect(() => {
    let cancelled = false;
    fetchVoiceStatus()
      .then((payload) => {
        if (!cancelled) setStatus(payload);
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTtsError('');
    setAutoPlaybackStatus('idle');
    setAutoSpeakerName('');
  }, [currentRound, npcText]);

  useEffect(() => {
    return () => {
      stopActiveSource();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  useEffect(() => {
    window.addEventListener('roleplay:unlock-voice', unlockAudioPlayback);
    return () => window.removeEventListener('roleplay:unlock-voice', unlockAudioPlayback);
  }, []);

  useEffect(() => {
    function handleAutoVoice(event) {
      const input = String(event.detail?.input || '').trim();
      const kind = event.detail?.kind === 'card' ? 'card' : 'npc';
      const speakerName = event.detail?.speakerName || (kind === 'card' ? '我' : npcName);
      if (!input || status?.configured === false) return;
      playTextSpeech(kind, input, speakerName, { auto: true });
    }

    window.addEventListener('roleplay:auto-voice', handleAutoVoice);
    return () => window.removeEventListener('roleplay:auto-voice', handleAutoVoice);
  }, [npcName, playTarget, status?.configured]);

  useEffect(() => {
    if (!autoPlayKey || autoPlayKeyRef.current === autoPlayKey || playTarget) return;
    autoPlayKeyRef.current = autoPlayKey;
    playSpeech('npc', { auto: true });
  }, [autoPlayKey, playTarget]);

  function getAudioContext() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    return audioContextRef.current;
  }

  function createSilentAudioUrl() {
    const sampleRate = 8000;
    const sampleCount = 320;
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);

    function writeString(offset, value) {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, sampleCount * 2, true);

    return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
  }

  function unlockAudioPlayback() {
    if (audioUnlockedRef.current) return;

    const audio = audioRef.current;
    if (audio && !(audio.currentSrc || audio.src)) {
      const url = createSilentAudioUrl();
      replaceAudioUrl(url);
      audio.src = url;
      audio.loop = true;
      audio.muted = true;
      audio
        .play?.()
        .then(() => {
          audioUnlockedRef.current = true;
        })
        .catch(() => {});
    }

    const audioContext = getAudioContext();
    if (audioContext) {
      audioContext.resume?.().then(() => {
        const source = audioContext.createBufferSource();
        source.buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        source.connect(audioContext.destination);
        source.start(0);
        audioUnlockedRef.current = true;
      });
    }
  }

  async function playBlobWithAudioContext(blob) {
    const audioContext = getAudioContext();
    if (!audioContext) return false;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    if (audioContext.state !== 'running') return false;

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await Promise.race([
      audioContext.decodeAudioData(arrayBuffer),
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('Audio decode timed out')), 5000);
      }),
    ]);
    stopActiveSource();

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    activeSourceRef.current = source;
    setAutoPlaybackStatus('played');
    return true;
  }

  function replaceAudioUrl(url) {
    if (audioUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = url;
    setAudioUrl(url);
  }

  function stopActiveSource() {
    try {
      activeSourceRef.current?.stop?.();
    } catch {
      // The source may have already ended; stopping it is only a cleanup courtesy.
    }
    activeSourceRef.current = null;
  }

  async function playAutoSpeechWithAudioElement(input, kind, speakerName) {
    const audio = audioRef.current;
    if (!audio) return false;

    const url = buildSpeechFileUrl({
      input,
      kind,
      speakerName,
    });
    replaceAudioUrl(url);

    audio.loop = false;
    audio.muted = false;
    audio.src = url;
    audio.currentTime = 0;

    const playback = audio.play?.();
    if (!playback?.then) {
      setAutoSpeakerName(speakerName || (kind === 'card' ? '我' : npcName || '对方'));
      setAutoPlaybackStatus('played');
      return true;
    }

    try {
      await playback;
      setAutoSpeakerName(speakerName || (kind === 'card' ? '我' : npcName || '对方'));
      setAutoPlaybackStatus('played');
      return true;
    } catch {
      setAutoPlaybackStatus('blocked');
      setTtsError('语音已生成，点击继续。');
      return false;
    }
  }

  async function playGeneratedAudio() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    setTtsError('');
    try {
      audio.loop = false;
      audio.muted = false;
      audio.currentTime = 0;
      const playback = audio.play?.();
      if (playback?.then) await playback;
      audioUnlockedRef.current = true;
      setAutoPlaybackStatus('played');
    } catch {
      setAutoPlaybackStatus('blocked');
      setTtsError('还没继续成功，请再点一次或检查浏览器声音设置。');
    }
  }

  async function playSpeech(kind, options = {}) {
    const input = kind === 'card' ? cardText : npcText;
    const speakerName = kind === 'card' ? '我' : npcName || '对方';
    return playTextSpeech(kind, input, speakerName, options);
  }

  async function playTextSpeech(kind, input, speakerName, options = {}) {
    if (!input?.trim() || playTarget) return;

    setPlayTarget(kind);
    setTtsError('');
    if (options.auto) {
      setAutoSpeakerName(speakerName || (kind === 'card' ? '我' : npcName || '对方'));
    }

    try {
      if (options.auto && (await playAutoSpeechWithAudioElement(input.trim(), kind, speakerName))) {
        return;
      }

      const blob = await synthesizeSpeech({
        input: input.trim(),
        instruction: getSpeechInstruction(kind, speakerName),
        kind,
        speakerName,
      });
      if (options.auto) {
        const playedWithAudioContext = await playBlobWithAudioContext(blob).catch(() => false);
        if (playedWithAudioContext) return;
      }

      const url = URL.createObjectURL(blob);
      replaceAudioUrl(url);
      window.setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.loop = false;
          audioRef.current.muted = false;
          audioRef.current.currentTime = 0;
        }
        const playback = audioRef.current?.play?.();
        if (!playback?.then) {
          if (options.auto) setAutoPlaybackStatus('played');
          return;
        }
        playback
          .then(() => {
            if (options.auto) setAutoPlaybackStatus('played');
          })
          .catch(() => {
            if (options.auto) {
              setAutoPlaybackStatus('blocked');
              setTtsError('语音已生成，点击继续。');
            }
          });
      }, 0);
    } catch (error) {
      setTtsError(error.message);
    } finally {
      setPlayTarget(null);
    }
  }

  const serviceLabel =
    playTarget === 'card'
      ? '我语音生成中'
      : playTarget === 'npc'
      ? `${npcName || '对方'}语音生成中`
      : autoPlaybackStatus === 'played'
        ? `${autoSpeakerName || npcName || '对方'}语音已自动播放`
        : autoPlaybackStatus === 'blocked'
          ? `${autoSpeakerName || npcName || '对方'}语音已生成`
        : configured
          ? status?.mode === 'prebuilt'
            ? '预制语音已连接'
            : '语音已连接'
          : status?.mode === 'off'
            ? '语音已关闭'
            : '语音未连接';
  const canManuallyPlay = autoPlaybackStatus === 'blocked' && Boolean(audioUrl);

  return (
    <div className="voice-dialogue-controls" aria-label="语音播放">
      <div className="voice-control-row">
        <span className={`voice-status ${configured ? 'ready' : 'missing'}`}>{serviceLabel}</span>
        {canManuallyPlay && (
          <button className="voice-continue-button" onClick={playGeneratedAudio} type="button">
            <b>继续</b>
          </button>
        )}
      </div>

      <audio className="voice-audio-source" preload="auto" ref={audioRef} src={audioUrl || undefined} />
      {ttsError && <p className={canManuallyPlay ? 'voice-playback-hint' : 'voice-error'}>{ttsError}</p>}
    </div>
  );
}

export default VoicePracticePanel;
