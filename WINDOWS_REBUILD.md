# Windows 重建与交付说明

这份项目可以直接交给另一位 Windows 开发者重建。交付包里保留源码、素材、文档、`package-lock.json` 和空白环境变量模板；不会包含真实 `.env`、`node_modules`、`.git`、`dist`、临时生成文件或本地 Codex skill。

## 1. 准备环境

推荐安装：

- Node.js 20 LTS
- Git for Windows
- VS Code

在 PowerShell 里确认：

```powershell
node -v
npm -v
git --version
```

## 2. 解压或克隆项目

如果拿到的是 zip：

```powershell
Expand-Archive .\bie-ba-tian-liao-si-windows-handoff-20260608.zip -DestinationPath .\bie-ba-tian-liao-si
cd .\bie-ba-tian-liao-si
```

如果从 GitHub 克隆：

```powershell
git clone <repo-url>
cd <repo-folder>
```

## 3. 安装依赖

```powershell
npm ci
```

如果没有 `package-lock.json`，再改用：

```powershell
npm install
```

## 4. 配置 API key

复制模板：

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env.example` 里所有 key 默认留空。开发者按需要填写：

```dotenv
STEPFUN_VOICE_API_KEY=
STEPFUN_ROLEPLAY_API_KEY=
STEPFUN_ANALYSIS_API_KEY=
```

变量说明：

- `VITE_USE_MOCK=true`：使用本地 mock 数据，不需要任何 API key，适合先验证页面能跑。
- `VITE_USE_MOCK=false`：接真实角色扮演 API，需要填写 `STEPFUN_ROLEPLAY_API_KEY`。
- `VITE_TTS_MODE=off`：关闭语音，不需要 TTS key。
- `VITE_TTS_MODE=live`：接实时 TTS，需要填写 `STEPFUN_VOICE_API_KEY`。
- `VITE_TTS_MODE=prebuilt`：读取 `public/demo-tts/` 预制音频，不需要 TTS key。
- `STEPFUN_VOICE_API_KEY`：TTS 语音播放 key；不填时语音接口不可用，但页面仍可运行。
- `STEPFUN_ANALYSIS_API_KEY`：预留给后续评分、复盘、表达分析；当前基础运行不是必填。
- `STEPFUN_BASE_URL`：默认 `https://api.stepfun.com/v1`，通常不用改。

注意：不要把真实 `.env` 上传到 GitHub。当前 `.gitignore` 已排除 `.env`。

运行模式可直接用模板区分：

- `.env.llm-live.example`：实时 LLM 开发版，完整代理代码，key 本地填写。
- `.env.demo-prebuilt-tts.example`：演示预制 TTS 版，无 key，语音读取本地预制音频。
- `.env.example`：纯 UI 空跑默认模板。

更多说明见 `docs/版本模式说明.md`。

## 5. 本地运行

```powershell
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

修改 `.env` 后，需要停止 dev server 并重新运行 `npm run dev`。

## 6. 构建验证

```powershell
npm run build
npm run preview
```

`dist/` 是构建产物，不需要放进源码交付包；Windows 开发者可以用上面的命令重新生成。

## 7. GitHub 是否最合适

如果只是一次性发给别人重现，zip 最省事。如果还要多人继续协作、记录版本、提 PR、回滚改动，GitHub 更合适。

上传 GitHub 时建议：

- 上传源码、素材、文档、`package.json`、`package-lock.json`、`.env.example`。
- 不上传 `.env`、`node_modules/`、`.git/`、`dist/`、`tmp/`、`skills/`、交付 zip。
- 单个文件尽量小于 100MB；这个项目的源码素材包远低于这个限制。
