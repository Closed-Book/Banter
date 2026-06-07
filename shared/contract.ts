/**
 * ❄️ 冻结契约层 —— 《别把天聊死》前后端单一事实源
 *
 * 这是 P1(前端) / P2(Prompt) / P3(内容) 三方之间唯一约定的数据结构。
 * 修改前必须全员同步、群里喊一声，禁止单方面私改。
 *
 *  - P2 的 system prompt 必须严格输出 RoundResponse / EndingResponse 结构
 *  - P1 的前端必须按这些结构解析渲染，不做二次计算（拿到 JSON 直接画）
 *  - P3 的剧本 / 评分 / 文案都落在这些字段里
 *
 * 运行时常量（CARD_TYPES、DEFAULT_STATS 等）可被前端直接 import；
 * interface 仅作类型约束，Vite/esbuild 编译时会剥离。
 * 前端用法： import { CARD_TYPES, DEFAULT_STATS, STAT_LABELS } from '@shared/contract'
 */

// ============ 1. 卡牌策略类型（固定四类，每轮 4 张 type 各不相同）============
export const CARD_TYPES = {
  high_eq: '高情商',          // 认可对方但不让步，以退为进
  veteran: '老油条',          // 打太极、拖时间、转移焦点
  naive: '学生思维',          // 老实听话、容易被拿捏（明显会吃亏的对照项）
  confrontational: '硬刚',    // 直接怼，摆事实讲道理，不留面子
} as const;
export type CardType = keyof typeof CARD_TYPES;

export interface Card {
  type: CardType;     // 策略类型
  label: string;      // 前端卡面标签，如 "高情商 · 以退为进"
  summary: string;    // 一句话摘要（卡面可见）
  full_text: string;  // 完整话术（点击展开可见，实际作为用户发言发送给 NPC）
}

// ============ 2. 数值系统 ============
export const STAT_KEYS = ['initiative', 'patience', 'goal_progress'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  initiative: '主动权',
  patience: '对方耐心',
  goal_progress: '目标达成率',
};

/** 数值初始值（老板先手优势，主动权偏低） */
export const DEFAULT_STATS: Record<StatKey, number> = {
  initiative: 40,
  patience: 80,
  goal_progress: 10,
};

export interface StatChange {
  delta: number;   // 本轮变化量（可正可负）
  current: number; // 变化后的当前值，恒定 0-100
}

export type StatsChange = Record<StatKey, StatChange>;

// ============ 3. NPC 发言（多人场景按发言顺序排列）============
export interface NpcResponse {
  name: string;           // NPC 姓名，如 "张总" / "李明" / "王总"
  role: string;           // 角色标识，如 "boss" / "colleague" / "manager"
  dialogue: string;       // 台词
  inner_thought?: string; // 内心 OS（可选，括号展示，增加沉浸感）
}

// ============ 4. 游戏状态 ============
export type EndTrigger = 'rounds_exhausted' | 'patience_zero' | null;

export interface GameState {
  current_round: number;
  total_rounds: number;    // 8 / 10 / 15
  is_ended: boolean;
  end_trigger: EndTrigger; // 结束原因：轮次耗尽 / 耐心归零 / 未结束(null)
}

// ============ 5. 每轮对话 API 返回 ============
export interface RoundResponse {
  npc_responses: NpcResponse[]; // 多人场景按发言顺序排列
  stats_change: StatsChange;
  next_cards: Card[];           // 固定 4 张，type 互不相同
  game_state: GameState;
}

// ============ 6. 结局评分 API 返回（game_state.is_ended=true 后额外请求一次）============
export const GRADES = ['S', 'A', 'B', 'C', 'D'] as const;
export type Grade = (typeof GRADES)[number];

/** 结局等级判定阈值（前端兜底用，正常由 prompt 给出 grade） */
export const GRADE_RULES = {
  S: { note: '目标达成率≥90 且 主动权≥70', keyword: '高情商通关' },
  A: { note: '目标达成率≥70', keyword: '稳定通关' },
  B: { note: '目标达成率≥50', keyword: '勉强过关' },
  C: { note: '目标达成率<50 且 耐心>0', keyword: '被拿捏了' },
  D: { note: '耐心归零（谈崩）', keyword: '把天聊死了' },
} as const;

export interface Radar {
  expression: number; // 表达力
  empathy: number;    // 共情力
  strategy: number;   // 策略性
  resilience: number; // 抗压力
  boundary: number;   // 边界感
}

export const RADAR_LABELS: Record<keyof Radar, string> = {
  expression: '表达力',
  empathy: '共情力',
  strategy: '策略性',
  resilience: '抗压力',
  boundary: '边界感',
};

export interface QuoteReplay {
  round: number;
  text: string;
}

export interface Ending {
  grade: Grade;
  title: string;           // 结局称号，如 "稳扎稳打的谈判者"
  one_liner: string;       // 一句话点评
  radar: Radar;            // 五维能力
  best_line: QuoteReplay;  // 最佳一句话回放
  worst_line: QuoteReplay; // 最危险一句话回放
  real_advice: string;     // 现实行动建议（一句话）
}

export interface EndingResponse {
  ending: Ending;
}

// ============ 7. 轮次选项（第一屏底部）============
export const ROUND_OPTIONS = [
  { value: 8, label: '8 轮速战', locked: false },
  { value: 10, label: '10 轮标准', locked: false, isDefault: true },
  { value: 15, label: '15 轮深度', locked: true }, // 即将开放
] as const;
