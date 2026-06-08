function getSpeechAssetId({ input, kind, speakerName }) {
  const raw = [kind || 'npc', speakerName || '', String(input || '').trim()].join('|');
  let hash = 0x811c9dc5;

  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, '0');
}

const [kind, speakerName, ...inputParts] = process.argv.slice(2);
const input = inputParts.join(' ').trim();

if (!['npc', 'card'].includes(kind) || !speakerName || !input) {
  console.error('Usage: npm run tts:name -- <npc|card> "<speakerName>" "<line text>"');
  console.error('Example: npm run tts:name -- npc "陈总" "你这个想法还是太学生气了。"');
  process.exit(1);
}

const prefix = kind === 'card' ? 'card' : 'npc';
const id = getSpeechAssetId({ input, kind, speakerName });
console.log(`public/demo-tts/${prefix}-${id}.mp3`);
