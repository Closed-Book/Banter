# Banter

> AI 现实社交副本训练智能体 —— 用剧本杀的形式训练真实社交能力：选场景、选对手、出牌对话、数值博弈、通关评分。
> 不是话术生成器，是让你**开口练**的实战沙盘。

纯前端 SPA，无后端。AI 对话与结局评分接阶跃星辰（StepFun，OpenAI 兼容）API。

---

## 30 秒上手

```bash
git clone https://github.com/Closed-Book/Banter.git
cd Banter
npm install
cp .env.example .env      # 默认 VITE_USE_MOCK=true，没有 API key 也能空跑五屏
npm run dev               # 打开 http://localhost:5173
```

接真实 API：把 `.env` 里 `VITE_USE_MOCK` 改为 `false`，填入有效的 `VITE_STEPFUN_API_KEY`（模型默认 `VITE_STEPFUN_MODEL=step-3.7-flash`）。

---

## 场景与分流

现有 **6 个可玩场景**：

- `office_cafe_interview`（办公室咖啡厅面试）：**演示 demo**，预设台词 + 陈总 TTS 配音，**永远走本地**（不调 API）。预设台词与 `public/tts/*.mp3` 逐字匹配。
- `boss_pua_salary` / `colleague_blame` / `first_date_cold` / `blind_date_values` / `friend_borrow_money`：走**真实阶跃星辰 API**（每轮对话 + 结局评分都调），API 失败自动重试，连续失败回退本地规则。

分流开关在 `src/App.jsx`：`sceneUsesLocal = scene.demo || useMock || !key`。

---

## 关键文件

| 想改 / 想查 | 看这里 |
|------------|--------|
| 对话流程 / 场景分流 / 真实 API 调用 / 本地兜底 / 场景与卡牌内容 | `src/App.jsx`（自包含主文件，全部逻辑与内容都在此） |
| 全局样式 | `src/styles/global.css` |
| demo TTS 语音 | `public/tts/*.mp3` + `src/tts-manifest.json`（文本 ↔ 音轨 ↔ 表情映射，与音频逐字匹配，勿乱动） |
| API key / 模型 / mock 开关 | `.env`（基于 `.env.example`，已 gitignore，不入库） |

---

## 技术栈

- React 18 + Vite（纯前端 SPA）
- AI：阶跃星辰 API（OpenAI 兼容，对话默认 `step-3.7-flash`）
- 数据可视化：手写 SVG 五维雷达图（无第三方图表库）
- 部署：本地 dev / Vercel
