# 预制 TTS 音频目录

`VITE_TTS_MODE=prebuilt` 时，前端会从这个目录读取演示音频，不会调用实时 TTS API，也不需要 `STEPFUN_VOICE_API_KEY`。

音频文件命名由 `src/voice/voiceStreamClient.js` 的 `getSpeechAssetName()` 生成：

```text
npc-<hash>.mp3
card-<hash>.mp3
```

生成 hash 时使用三段内容：

```text
kind | speakerName | input
```

建议继续开发时保留这个目录作为演示资产目录；真实联调时改用 `.env.llm-live.example`，让 `VITE_TTS_MODE=live` 走服务端 TTS 代理。

可以用脚本计算文件名：

```bash
npm run tts:name -- npc "陈总" "你这个想法还是太学生气了。"
npm run tts:name -- card "我" "我理解您对成熟度的担心，但我想先对齐可量化的结果。"
```
