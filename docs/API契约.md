# API 契约（人话版）

`shared/contract.ts` 的说明文档。**类型定义以 `contract.ts` 为准**，本文件只解释含义和调用流程。

## 核心原则

> **单次调用返回全部内容，前端零计算。**

每轮对话只发一次 API 请求，返回结构化 JSON，一次性包含：NPC 回复、数值变化、下一轮 4 张卡牌、游戏状态。前端拿到直接渲染，不做任何二次计算。

## 调用流程

```
第 1 屏选场景/轮次 → 第 2 屏配人设 → 第 3 屏 briefing
   ↓
第 4 屏每一轮：
   用户点卡牌 → 发请求(对话历史 + 出牌 full_text + 当前数值) → 返回 RoundResponse
   → 前端按 stats_change 跑数值条动画、按 npc_responses 弹气泡、展开 next_cards
   ↓ (game_state.is_ended = true)
额外请求一次 → 返回 EndingResponse → 第 5 屏结局页
```

## 请求结构

```jsonc
POST {VITE_STEPFUN_BASE_URL}/chat/completions
{
  "model": "step-2-16k",
  "messages": [
    { "role": "system", "content": "<<完整系统 prompt，见 prompts/system/>>" },
    { "role": "user",   "content": "<<角色锚定段 + 对话历史 + 用户本轮出牌 + 当前数值>>" }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 0.7
}
```

## 返回结构（两种）

### 1. 每轮对话 —— `RoundResponse`

```jsonc
{
  "npc_responses": [          // 多人场景按发言顺序排列
    { "name": "张总", "role": "boss", "dialogue": "…", "inner_thought": "(…)" }
  ],
  "stats_change": {           // 三个数值，每个给 delta + 变化后 current(0-100)
    "initiative":    { "delta": 5,   "current": 55 },
    "patience":      { "delta": -10, "current": 70 },
    "goal_progress": { "delta": 8,   "current": 38 }
  },
  "next_cards": [             // 固定 4 张，type 互不相同
    { "type": "high_eq",         "label": "…", "summary": "…", "full_text": "…" },
    { "type": "veteran",         "label": "…", "summary": "…", "full_text": "…" },
    { "type": "naive",           "label": "…", "summary": "…", "full_text": "…" },
    { "type": "confrontational", "label": "…", "summary": "…", "full_text": "…" }
  ],
  "game_state": { "current_round": 3, "total_rounds": 10, "is_ended": false, "end_trigger": null }
}
```

`type` 取值固定四类：`high_eq`(高情商) / `veteran`(老油条) / `naive`(学生思维) / `confrontational`(硬刚)。

### 2. 结局评分 —— `EndingResponse`（`is_ended=true` 后再请求一次）

```jsonc
{
  "ending": {
    "grade": "A",                          // S / A / B / C / D
    "title": "稳扎稳打的谈判者",
    "one_liner": "你没拿到最多，但守住了底线……",
    "radar": { "expression": 75, "empathy": 60, "strategy": 85, "resilience": 70, "boundary": 80 },
    "best_line":  { "round": 5, "text": "…" },
    "worst_line": { "round": 2, "text": "…" },
    "real_advice": "下次谈薪前准备好 3 个可量化的业绩数据……"
  }
}
```

## 数值规则（初始值）

| 数值 | key | 初始 | 说明 |
|------|-----|------|------|
| 主动权 | `initiative` | 40 | 老板先手，偏低 |
| 对方耐心 | `patience` | 80 | 归零 = 谈崩 = D 级结局 |
| 目标达成率 | `goal_progress` | 10 | 决定 S/A/B/C 等级 |

详细加减规则见 [项目执行手册 · 五 Prompt 架构](项目执行手册.md)。

## 容错（前端实现，见 P1 任务卡）

- JSON 解析失败 → 自动重试一次（同样请求）
- 连续两次失败 → "网络波动，请稍等"，5 秒后重试
- 角色漂移兜底 → 每轮 user message 头部带「角色锚定重复段」（prompt 由 P2 提供）

## 样例数据

`shared/mock-responses/` 下有三份可直接 `JSON.parse` 的样例：
- `round-sample.json` —— 单人（场景 1 老板 PUA）
- `round-multiplayer-sample.json` —— 多人（场景 2 同事甩锅）
- `ending-sample.json` —— 结局评分

P1 用它们空跑，P2 拿它们当输出标杆。
