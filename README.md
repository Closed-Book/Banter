# 别把天聊死

> AI 现实社交副本训练智能体 —— 用剧本杀的形式训练真实社交能力：选场景、选对手、出牌对话、数值博弈、通关评分。
> 不是话术生成器，是让你**开口练**的实战沙盘。

3 小时 Hackathon 冲刺项目。本仓库为**四人并行协作**而设计，目录按角色切分，每人独占一块，文件级零冲突。

---

## 30 秒上手

```bash
git clone <repo-url>
cd bie-ba-tian-liao-si
npm install
cp .env.example .env      # 默认 VITE_USE_MOCK=true，没有 API key 也能空跑五屏
npm run dev               # 打开 http://localhost:5173
```

Windows PowerShell 可用 `Copy-Item .env.example .env` 复制环境变量模板。

接真实 API：把 `.env` 里 `VITE_USE_MOCK` 改为 `false`，填入服务端变量 `STEPFUN_ROLEPLAY_API_KEY`。不要把真实 key 写进前端代码或提交到 GitHub。

### 运行模式

项目保留完整 LLM 代理代码，但通过 `.env` 区分运行模式：

- 实时 LLM 开发：复制 `.env.llm-live.example` 为 `.env`，填写自己的 `STEPFUN_ROLEPLAY_API_KEY`，按需填写 `STEPFUN_VOICE_API_KEY`。
- 演示预制 TTS：复制 `.env.demo-prebuilt-tts.example` 为 `.env`，使用 `public/demo-tts/` 下的预制音频，不需要 API key。
- 纯 UI 空跑：复制 `.env.example` 为 `.env`，保持 `VITE_USE_MOCK=true` 和 `VITE_TTS_MODE=off`。

详细说明见 [版本模式说明](docs/版本模式说明.md)。

### Stepfun TTS 语音播放

对话页内置 TTS：可以朗读 NPC 台词，也可以在选中卡牌后朗读当前卡牌的示范话术。复制 `.env.example` 为 `.env` 后，至少填入服务端变量：

```bash
STEPFUN_VOICE_API_KEY=
STEPFUN_BASE_URL=https://api.stepfun.com/v1
```

再运行：

```bash
npm run dev
```

修改 `.env` 后需要重启 dev server 才会重新读取 key。

进入对话页后，右侧 `语音播放` 面板会使用：

- TTS：调用本地 `/api/voice/tts`，由 Vite dev server 代理到 Stepfun `/audio/speech`。

---

## 谁干什么（点开各自的任务卡）

| 角色 | 独占目录 | 任务卡 | 核心产出 |
|------|----------|--------|----------|
| **P1 前端主力** | `src/` | [任务卡](docs/任务卡/P1-前端.md) | 可交互的完整五屏应用 |
| **P2 Prompt 工程师** | `prompts/` | [任务卡](docs/任务卡/P2-Prompt.md) | 稳定输出合规 JSON 的 prompt 套件 |
| **P3 内容策划** | `content/` | [任务卡](docs/任务卡/P3-内容策划.md) | 完整场景剧本 + 评分逻辑 + 文案 |
| **P4 视觉+兜底** | `design/` | [任务卡](docs/任务卡/P4-视觉兜底.md) | 视觉方案 + 录屏备份 + bug 清单 |

> ❄️ `shared/` 是**冻结契约层**（前后端 JSON 接口），全员只读，改动需全员同步——见下。

---

## 仓库结构

```
bie-ba-tian-liao-si/
├── shared/                 ❄️ 冻结契约（全员只读，单一事实源）
│   ├── contract.ts         请求/返回 JSON、数值、卡牌、结局的类型 + 运行时常量
│   └── mock-responses/     样例 JSON，前端没接通 API 也能空跑
├── src/          ← P1   React 五屏 + 组件 + API client（容错重试）
├── prompts/      ← P2   场景 system prompt + 防漂移锚定 + 评分 prompt + few-shot
├── content/      ← P3   三级标签 scenarios.json + briefing 文案 + 评分规则 + 人设问答
├── design/       ← P4   design tokens + 素材占位 + 测试清单 + demo 脚本
├── docs/
│   ├── 项目执行手册.md      产品 / 流程 / 技术 / prompt 全量设计（总纲，必读）
│   ├── API契约.md          contract.ts 的人话版说明
│   └── 任务卡/             P1-P4 各自第一步干什么
├── CONTRIBUTING.md         🔴 并行协作铁律（开工前必读）
└── package.json / vite.config.js / index.html
```

---

## 技术栈

- 前端：React 18 + Vite（纯前端 SPA）
- 路由：react-router-dom（五屏）
- 图表：recharts（五维雷达图）
- AI：阶跃星辰 API（OpenAI 兼容格式，`step-2-16k`）
- 部署：本地 dev / Vercel（评委试玩）

---

## MVP 生死线（Demo 必须做到）

- [ ] 场景选择页能选，MVP 场景高亮、其余置灰
- [ ] 1v1 老板 PUA 场景完整可玩（10 轮）
- [ ] 4 张卡牌展示 + 点击出牌 + NPC 回应，循环不卡
- [ ] 3 个数值条实时变化可见
- [ ] 结局页展示等级 + 点评
- [ ] JSON 解析容错（失败自动重试）

完整 MVP 边界、加分项、明确不做项见 [项目执行手册 · 七](docs/项目执行手册.md)。
