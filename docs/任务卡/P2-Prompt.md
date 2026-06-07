# P2 · Prompt 工程师 任务卡

**独占目录**：`prompts/`（只在这里写文件）
**只读依赖**：`shared/contract.ts`、`shared/mock-responses/`、`docs/API契约.md`、`content/`（P3 的剧本边界）
**核心产出**：稳定输出合规 JSON 的 prompt 套件

---

## 铁律：你的 prompt 输出必须严格匹配契约

NPC 每轮返回必须能被 `JSON.parse`，且字段完全匹配 `shared/contract.ts` 的 `RoundResponse`；结局匹配 `EndingResponse`。
**拿 `shared/mock-responses/round-sample.json` 当输出标杆**——你的 prompt 让模型产出的就该长这样。

## 你要交付的 prompt 文件

```
prompts/
├── system/
│   ├── 场景1-老板PUA.md      MVP 首发：1v1 笑面虎张总压薪
│   └── 场景2-同事甩锅.md     加分项：多人(暴躁李明 + 沉着王总)
├── anchoring.md             角色防漂移锚定段（每轮 user message 头部附带）
├── ending-report.md         结局评分 prompt（生成 EndingResponse）
└── few-shot/
    └── 场景1-示例对话.md     few-shot 示例，稳住 JSON 格式与角色一致性
```

## 场景 1 system prompt 必含模块（见手册 · 五）

1. **角色设定**：张总，部门总监，笑面虎，表面温和句句施压，底层目标把涨薪压到 5% 以内。
2. **不可违反规则**（每轮遵守）：绝不主动同意涨薪(除非用户连续 3 轮+用数据施压且主动权>80)、绝不打破角色、不暴力违法、每句推进谈话、按用户出牌类型调整策略。
3. **用户人设占位** `{user_persona}`：跳过则填"入职两年普通员工，性格中等偏内向"。
4. **数值系统规则**：三个数值的加减规则（用数据 +、被动接受 -、硬刚 + 但耐心 - 等）。
5. **输出格式**：严格 JSON，无任何额外文字，结构 = `RoundResponse`。
6. **卡牌生成要求**：4 张风格明确区分(不能 4 张都合理)；C 类(学生思维)必须是明显吃亏的对照项；数值变化符合逻辑不随机；节奏感(前 3 轮试探/中 4 轮拉锯/后 3 轮摊牌)。

## 角色锚定段（anchoring.md）

每轮 user message 头部重复，对抗角色漂移。模板见手册 · 五。要点：重申"我是张总(笑面虎)、核心目标压薪、不心软不让步不破角色" + 当前第 n/total 轮 + 当前三数值 + 用户本轮出牌 full_text。

## 场景 2 多人补充

system prompt 增加第二个 NPC：李明(暴躁同事，先发制人甩锅) + 王总(沉着领导，提问判断真相)。发言顺序：李明先 → 王总回应/提问 → 用户出牌。`npc_responses` 数组按此顺序。卡牌标注对话对象("对李明说"/"对王总说"/"对两人说")。参考 `shared/mock-responses/round-multiplayer-sample.json`。

## 调试重点（手册 · 八 风险）

- **JSON 稳定性**：prompt 带 few-shot 示例；提醒前端 try-catch + 自动重试。
- **角色漂移**：连跑 10 轮检查老板是否变暖男；锚定段 + 写死不可违反规则。
- **边界 case**：用户连选 D 会不会谈崩太快？连选 C 会不会无聊？调数值规则。

## 时间线

- **第 1 小时**：场景 1 完整 system prompt；调试工具里跑通"输入一句话→输出合规 JSON"；与 P3 结对确认角色行为边界。
- **第 2 小时**：与 P1 联调真实返回格式；防漂移连跑 10 轮；写结局评分 prompt；有余力起场景 2。
- **第 3 小时**：边界 case 调优；有余力完成场景 2 并与 P1 联调。

## 验证（交付前）

把你的 system prompt + 一段模拟用户出牌喂给阶跃星辰（或任意 OpenAI 兼容端点），**连续 5~10 轮**，确认：每轮返回都能 `JSON.parse`、字段齐全匹配 `contract.ts`、角色不漂移。把跑通的样例存进 `few-shot/`。
