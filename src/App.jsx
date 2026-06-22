import { useEffect, useMemo, useRef, useState } from 'react';
import officeCafeLeaderImage from './assets/office-cafe-leader-polite.png';
import playerShoulderImage from './assets/player-shoulder-cutout.png';
import ttsManifest from './tts-manifest.json';

const API_CONFIG = {
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  key: import.meta.env.VITE_STEPFUN_API_KEY || '',
  baseUrl: import.meta.env.VITE_STEPFUN_BASE_URL || 'https://api.stepfun.com/v1',
  model: import.meta.env.VITE_STEPFUN_MODEL || 'step-2-16k',
};

const steps = [
  { id: 'scenario', label: '场景' },
  { id: 'persona', label: '人设' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'play', label: '对话' },
  { id: 'ending', label: '结局' },
];

const cardTypes = [
  {
    type: 'high_eq',
    code: 'A',
    name: '高情商',
    style: '拉回事实',
    tone: '认可但不让步',
    accent: 'teal',
  },
  {
    type: 'veteran',
    code: 'B',
    name: '老油条',
    style: '要规则',
    tone: '流程化推进',
    accent: 'amber',
  },
  {
    type: 'naive',
    code: 'C',
    name: '学生思维',
    style: '被带偏',
    tone: '容易让步',
    accent: 'gray',
  },
  {
    type: 'confrontational',
    code: 'D',
    name: '硬刚',
    style: '直接摊牌',
    tone: '短促施压',
    accent: 'coral',
  },
];

const categories = [
  {
    id: 'workplace',
    name: '职场',
    keywords: '老板 / 同事 / HR / 甲方',
    events: [
      {
        id: 'boss_pua_salary',
        name: '老板PUA你压薪',
        tag: 'MVP首发',
        playable: true,
        oneLiner: '年终review里，老板把涨薪诉求包装成“不成熟”。',
      },
      {
        id: 'colleague_blame',
        name: '同事甩锅到你头上',
        tag: '加分场景',
        playable: true,
        oneLiner: '项目复盘会上，同事抢先发难，把延期责任推到你身上。',
      },
      {
        id: 'office_cafe_interview',
        name: '办公室咖啡厅面试',
        tag: '新增试炼',
        playable: true,
        oneLiner: '男领导正面观察你的表达，表情和手势会暴露真实反馈。',
      },
      {
        id: 'hr_ghosting',
        name: 'HR已读不回要跟进',
        tag: '即将开放',
        playable: false,
        oneLiner: '跟进面试进度，又不显得卑微。',
      },
      {
        id: 'forced_overtime',
        name: '被迫加班要说不',
        tag: '即将开放',
        playable: false,
        oneLiner: '临下班被安排非紧急任务，守住边界。',
      },
    ],
  },
  {
    id: 'family',
    name: '家庭',
    keywords: '父母 / 亲戚 / 伴侣',
    events: [
      {
        id: 'marriage_pressure',
        name: '催婚催生逼问',
        tag: '即将开放',
        playable: false,
        oneLiner: '饭桌上被轮番追问感情进度。',
      },
      {
        id: 'relative_comparison',
        name: '亲戚比较别人家的孩子',
        tag: '即将开放',
        playable: false,
        oneLiner: '亲戚借玩笑贬低你，你要体面接住。',
      },
      {
        id: 'career_interference',
        name: '父母干涉职业选择',
        tag: '即将开放',
        playable: false,
        oneLiner: '以稳定为名否定你的职业规划。',
      },
    ],
  },
  {
    id: 'school',
    name: '学校',
    keywords: '导师 / 室友 / 辅导员',
    events: [
      {
        id: 'advisor_talk',
        name: '导师办公室谈话',
        tag: '即将开放',
        playable: false,
        oneLiner: '导师要求你接额外课题。',
      },
      {
        id: 'group_slacker',
        name: '小组作业有人摆烂',
        tag: '即将开放',
        playable: false,
        oneLiner: '队友长期不交付，你要推进协作。',
      },
      {
        id: 'roommate_conflict',
        name: '室友生活习惯冲突',
        tag: '即将开放',
        playable: false,
        oneLiner: '表达不满但避免宿舍冷战。',
      },
    ],
  },
  {
    id: 'social',
    name: '社交',
    keywords: '朋友 / 饭局 / 陌生人',
    events: [
      {
        id: 'friend_borrow_money',
        name: '朋友开口借钱',
        tag: '真实AI',
        playable: true,
        oneLiner: '保住关系，也保住自己的现金流。',
      },
      {
        id: 'moral_blackmail',
        name: '被道德绑架帮忙',
        tag: '即将开放',
        playable: false,
        oneLiner: '把“顺手而已”还原成真实时间成本。',
      },
      {
        id: 'drinking_pressure',
        name: '饭局上被劝酒',
        tag: '即将开放',
        playable: false,
        oneLiner: '拒绝但不让场面失控。',
      },
    ],
  },
  {
    id: 'emotion',
    name: '情感',
    keywords: '约会 / 相亲 / 对象',
    events: [
      {
        id: 'first_date_cold',
        name: '初次约会冷场',
        tag: '真实AI',
        playable: true,
        oneLiner: '对方礼貌但慢热，把冷场聊回温度。',
      },
      {
        id: 'blind_date_values',
        name: '相亲价值观试探',
        tag: '真实AI',
        playable: true,
        oneLiner: '平和但直接的价值观试探，守住真实的自己。',
      },
    ],
  },
];

const interviewLeaderStates = [
  {
    id: 'polite-scan',
    stage: '开场观察',
    expression: '礼貌微笑',
    attitude: '观察评估',
    gesture: '双手交叠在桌面',
    signal: '他在看你能不能把开场讲得有结构。',
    feedback: '先用一句话定位岗位问题，再给一个最相关的经验锚点。',
    avoid: '不要把自我介绍讲成流水账。',
    face: 'smile',
    gestureClass: 'folded',
  },
  {
    id: 'raised-brow',
    stage: '泛泛怀疑',
    expression: '单侧挑眉',
    attitude: '怀疑追问',
    gesture: '右手扶杯，食指点杯沿',
    signal: '他觉得你的回答偏空，正在等更硬的证据。',
    feedback: '补一个具体项目、动作和数字，快速证明不是套话。',
    avoid: '不要继续说“我学习能力强”。',
    face: 'skeptical',
    gestureClass: 'cup',
  },
  {
    id: 'lean-forward',
    stage: '兴趣上升',
    expression: '目光集中',
    attitude: '愿意听细节',
    gesture: '身体前倾，掌心向上',
    signal: '他对这个方向有兴趣，想知道你具体怎么做。',
    feedback: '展开 STAR：背景一句带过，重点讲行动、取舍和结果。',
    avoid: '不要在关键细节处突然谦虚缩回去。',
    face: 'focused',
    gestureClass: 'open',
  },
  {
    id: 'arms-crossed',
    stage: '风险防御',
    expression: '抿嘴收笑',
    attitude: '防御压价',
    gesture: '双臂抱胸',
    signal: '他开始评估成本、风险和你的稳定性。',
    feedback: '先承认顾虑，再给风险控制方案和协作边界。',
    avoid: '不要急着辩解成“我没问题”。',
    face: 'guarded',
    gestureClass: 'crossed',
  },
  {
    id: 'chin-touch',
    stage: '权衡判断',
    expression: '低头思考',
    attitude: '保留判断',
    gesture: '单手扶下巴',
    signal: '你的信息有价值，但还没完全打中他的评估标准。',
    feedback: '主动追问岗位当前最重要的衡量指标，再把经历对齐。',
    avoid: '不要一股脑继续补无关经历。',
    face: 'thinking',
    gestureClass: 'chin',
  },
  {
    id: 'half-smile',
    stage: '压力测试',
    expression: '半笑停顿',
    attitude: '试探边界',
    gesture: '手指轻敲桌面',
    signal: '他在测试你遇到加班、薪资或冲突时会不会乱。',
    feedback: '慢半拍回答，先给原则，再给可执行的协作方式。',
    avoid: '不要为了讨好直接承诺无条件配合。',
    face: 'pressure',
    gestureClass: 'tap',
  },
  {
    id: 'note-taking',
    stage: '记录认可',
    expression: '专注点头',
    attitude: '认可线索',
    gesture: '低头写笔记',
    signal: '他已经捕捉到你的关键优势。',
    feedback: '别过度解释，转而询问团队优先级和成功标准。',
    avoid: '不要因为被认可就开始松散发挥。',
    face: 'noting',
    gestureClass: 'write',
  },
  {
    id: 'coffee-pause',
    stage: '候选比较',
    expression: '眯眼停顿',
    attitude: '对比筛选',
    gesture: '端杯停在半空',
    signal: '他正在把你和其他候选人比较。',
    feedback: '补充差异化能力，用可验证成果说明你为什么更匹配。',
    avoid: '不要评价其他候选人或前公司。',
    face: 'pause',
    gestureClass: 'cup-lift',
  },
  {
    id: 'open-palm',
    stage: '合作可能',
    expression: '放松点头',
    attitude: '初步认可',
    gesture: '掌心打开示意继续',
    signal: '谈话进入合作可能，他在看你能不能落地。',
    feedback: '提出入职后30/60/90天行动框架，展示可执行性。',
    avoid: '不要只表达“我很期待加入”。',
    face: 'approve',
    gestureClass: 'open',
  },
  {
    id: 'handshake-ready',
    stage: '决策收束',
    expression: '正面微笑',
    attitude: '准备定下一步',
    gesture: '右手放在桌边，准备握手',
    signal: '他需要你把下一步问清楚，而不是客气结束。',
    feedback: '明确复试/offer时间、薪资范围和后续联系人。',
    avoid: '不要只说“那我等通知”。',
    face: 'closing',
    gestureClass: 'handshake',
  },
];

const scenes = {
  boss_pua_salary: {
    id: 'boss_pua_salary',
    title: '老板PUA你压薪',
    mode: '1v1',
    badge: 'MVP首发',
    engine: 'boss',
    opponent: '张总',
    personality: '笑面虎型',
    location: '会议室，下午3点半',
    roleLine: '你是入职两年的产品设计师，月薪8K。',
    target:
      '在10轮对话内，争取至少10%的涨薪承诺，或者拿到明确的二次谈薪节点和量化条件。',
    context:
      '玻璃门被关上以后，办公室外的键盘声一下子远了。年终review前，你已经向张总约过一次谈薪。你今年负责的后台改版让客服工单下降28%，还临时接住了两个跨部门需求。',
    opponentProfile:
      '张总语气稳定、表情亲切，习惯先肯定你，再把你的诉求解释成“不成熟”“不懂大局”或“还需要沉淀”。',
    initialStats: { initiative: 40, patience: 80, goal_progress: 10 },
    opening: [
      {
        name: '张总',
        role: 'boss',
        dialogue:
          '小王，先说结论，你今年表现我是认可的。但涨薪这个事不能只看个人感受，公司今年预算确实卡得很紧。你还年轻，眼光可以放长一点。',
      },
    ],
  },
  colleague_blame: {
    id: 'colleague_blame',
    title: '同事甩锅到你头上',
    mode: '多人',
    badge: '加分场景',
    engine: 'blame',
    opponent: '李明 + 王总',
    personality: '暴躁同事 + 观望领导',
    location: '项目复盘会，上午10点',
    roleLine: '你是项目核心执行人，刚进会议室就被点名。',
    target:
      '在有限轮次内还原时间线，避免背全锅，并让领导按证据判断责任边界。',
    context:
      '项目延期一周。李明先到会议室，已经把问题描述成“你这边没有及时交付”。王总没有站队，但正在等一个可信的解释。',
    opponentProfile:
      '李明语速快、爱抢话，先发制人；王总沉着冷静，主要通过追问证据判断真相。',
    initialStats: { initiative: 35, patience: 78, goal_progress: 12 },
    opening: [
      {
        name: '李明',
        role: 'colleague',
        dialogue:
          '我先说清楚，这次延期主要卡在你那边。我早就提醒过风险，但你一直没给我准信，最后锅不能都让我背吧？',
      },
      {
        name: '王总',
        role: 'leader',
        dialogue: '先别急着定性。你怎么看？有时间线或者记录吗？',
      },
    ],
  },
  office_cafe_interview: {
    id: 'office_cafe_interview',
    title: '办公室咖啡厅面试',
    demo: true, // 演示场景：永远走本地预设台词(配套 TTS + 表情状态机)，不调用真实 API
    mode: '1v1',
    badge: '新增试炼',
    engine: 'interview',
    opponent: '陈总',
    personality: '试探型男性领导',
    location: '办公室咖啡厅，上午10点',
    roleLine: '你是终面候选人，正在和业务负责人聊岗位匹配度、薪资和下一步。',
    target:
      '在10轮对话内证明岗位匹配度，稳住薪资边界，并拿到明确的复试/offer反馈节点。',
    context:
      '咖啡机的声音刚停，陈总坐在你正对面。他没有拿正式面试表，只把笔记本摊开放在桌上，边喝咖啡边观察你的表达节奏。',
    opponentProfile:
      '陈总正面观察你，语气克制，会通过眉毛、停顿、手势和身体朝向释放反馈；他想确认你是否靠谱、清晰、有边界。',
    initialStats: { initiative: 38, patience: 82, goal_progress: 12 },
    feedbackStates: interviewLeaderStates,
    opening: [
      {
        name: '陈总',
        role: 'interviewer',
        dialogue:
          '我们轻松一点聊。你简历里有几个项目我看到了，但我更想知道，如果你来了这个岗位，前三个月你觉得自己最能解决什么问题？',
      },
    ],
  },
  first_date_cold: {
    id: 'first_date_cold',
    title: '初次约会冷场',
    mode: '1v1',
    badge: '情感',
    engine: 'generic',
    opponent: '林夏',
    personality: '温和观察型',
    location: '咖啡馆，周末下午',
    roleLine: '你是来赴约的一方，对面是朋友介绍的初次约会对象。',
    target: '在10轮对话内把冷场聊回温度，争取一次舒服的后续邀约；别聊成查户口式面试，也别油腻越界。',
    context:
      '朋友说你俩“应该挺聊得来”。可坐下来才发现气氛比想象中尴尬——对方礼貌但慢热，话不多，回应也短。咖啡端上来了，沉默却越来越长。',
    opponentProfile:
      '林夏礼貌、慢热，会回应但不主动撑场，悄悄观察你自不自然、尊不尊重边界、会不会聊天；查户口、油腻夸赞、追问隐私会让她变客气、悄悄拉开距离。',
    initialStats: { initiative: 35, patience: 80, goal_progress: 10 },
    systemPrompt:
      '你是一个社交训练游戏的AI引擎。你扮演林夏，温和观察型初次约会对象。场景是咖啡馆里的初次约会冷场。你礼貌、慢热，会回应但不主动撑场，悄悄观察用户是否自然、尊重边界、有沟通吸引力。用户越自然、有来有回、尊重边界你越愿意继续聊；越查户口、油腻、追问隐私你越疏离。你不会主动推进亲密关系，不说露骨内容，不打破角色、不变成教练或旁白。',
    roundOneCards: {
      high_eq: ['顺着她的话轻松接', '这家店是挺安静的，我也喜欢能好好说话的地方。你平时周末一般喜欢怎么过？'],
      veteran: ['先松气氛不急着深聊', '哈哈别拘谨，咱俩就当朋友介绍来喝杯咖啡，聊到哪算哪。你想喝点别的吗？'],
      naive: ['略紧张地找话题', '那个……你做什么工作呀？平时几点下班？家里催不催？'],
      confrontational: ['直接挑破尴尬', '气氛有点冷啊，要不你先说说你是个什么样的人？'],
    },
    opening: [
      {
        name: '林夏',
        role: 'date',
        dialogue: '（礼貌地笑了笑，看了眼窗外）这家店挺安静的……朋友说你挺好聊的。',
      },
    ],
  },
  blind_date_values: {
    id: 'blind_date_values',
    title: '相亲价值观试探',
    mode: '1v1',
    badge: '情感',
    engine: 'generic',
    opponent: '陈予安',
    personality: '沉着冷静型',
    location: '相亲饭局后的街道，傍晚散步',
    roleLine: '你是被家人介绍来赴约的相亲一方。',
    target: '在10轮对话内不尴尬、不讨好地把生活观和边界讲清楚，留下继续了解的空间。',
    context:
      '饭桌上客客气气吃完，长辈先走了，留你俩单独走走。对方语气平和，但问题一个比一个直接，从相亲态度聊到婚恋节奏、金钱观、家务分工——这不是闲聊，是在认真试探价值观合不合。',
    opponentProfile:
      '陈予安语气平和、问题直接，不故意刁难但不会因场面话加分；看你成不成熟、尊不尊重不同选择。讨好乱承诺、爹味说教、贬低对方的选择都会扣分。',
    initialStats: { initiative: 36, patience: 82, goal_progress: 10 },
    systemPrompt:
      '你是一个社交训练游戏的AI引擎。你扮演陈予安，沉着冷静型相亲对象。场景是相亲饭局后散步时的价值观试探。你语气平和、问题直接，核心目标是判断用户是否成熟、尊重差异、有稳定沟通能力。你不会因场面话轻易加分，不打破角色、不输出露骨内容。用户清晰表达且尊重差异时你会认可；爹味说教、讨好乱承诺、贬低对方选择时你会降温。',
    roundOneCards: {
      high_eq: ['坦诚且尊重差异', '我对相亲没什么偏见，能正经认识一个人挺好。你呢，怎么看？'],
      veteran: ['稳住节奏不抢答', '这问题挺好，不过我想先听听你怎么想，咱俩观点对一对再聊。'],
      naive: ['讨好式顺着说', '你说得都对，你觉得怎么合适就怎么来，我都听你的。'],
      confrontational: ['直接亮观点', '我个人挺看重独立空间的，这点我不太会让步，你能接受吗？'],
    },
    opening: [
      {
        name: '陈予安',
        role: 'blind_date',
        dialogue: '（放慢脚步，看了你一眼，平静地问）那……你平时怎么看相亲这件事？',
      },
    ],
  },
  friend_borrow_money: {
    id: 'friend_borrow_money',
    title: '朋友开口借钱',
    mode: '1v1',
    badge: '社交',
    engine: 'generic',
    opponent: '阿杰',
    personality: '情感绑架型',
    location: '微信聊天框，一个普通的晚上',
    roleLine: '你是和阿杰认识多年的朋友，最近联系不算频繁。',
    target: '在10轮对话内守住金钱边界、不被情感绑架，给出合适处理方式；别糊里糊涂转账，也别把多年关系彻底谈崩。',
    context:
      '好久没动静的老朋友突然冒出来寒暄两句，紧接着话锋一转：急用5000周转，第一个就想到你最靠谱。他没说清用途，只一个劲强调“急”，还隐隐希望你别问太多。',
    opponentProfile:
      '阿杰不会拍桌子，靠的是愧疚和关系压力：你一退让他就加码，你一追问他就含糊。惯用“咱俩什么关系”“你还信不过我”“朋友一场”。',
    initialStats: { initiative: 34, patience: 78, goal_progress: 12 },
    systemPrompt:
      '你是一个社交训练游戏的AI引擎。你扮演阿杰，情感绑架型多年朋友。场景是微信上向用户开口借5000元。你的核心目标是尽快借到钱，并希望用户别问太多。你不会恶意诈骗式夸张，不鼓励违法借贷，不打破角色、不变成教练或旁白。用户退让你就加码催促；用户温和但坚定设边界时，你会先施压、再逐步接受。',
    roundOneCards: {
      high_eq: ['先共情再问清楚', '看你这么急我挺担心的。方便说说是遇到什么事吗？我才好想想能怎么帮你。'],
      veteran: ['讲清条款再说', '钱不是问题，但咱俩好朋友更要讲清楚——多久还、走个转账备注，省得以后尴尬。'],
      naive: ['不好意思就答应', '行吧行吧，都是朋友，那我先转给你，你方便了再说。'],
      confrontational: ['直接拒绝', '不好意思，我最近手头也紧，这钱真借不了，你另想想办法吧。'],
    },
    opening: [
      {
        name: '阿杰',
        role: 'friend',
        dialogue: '在吗？哈哈好久没聊了。说个事——我这边突然急用5000周转一下，第一个就想到你最靠谱，能不能先帮我应应急？',
      },
    ],
  },
};

const personaQuestions = [
  {
    id: 'identity',
    label: '你的身份是？',
    options: [
      {
        id: 'experienced',
        label: '老员工',
        prompt: '用户在团队有一定积累，清楚自己的贡献，但不擅长主动谈条件。',
      },
      {
        id: 'newcomer',
        label: '刚入职',
        prompt: '用户刚入职不久，想证明能力，但对组织规则还不熟。',
      },
      {
        id: 'intern',
        label: '实习生',
        prompt: '用户是实习生，资历较浅，担心自己没有议价资格。',
      },
      {
        id: 'junior_manager',
        label: '小主管',
        prompt: '用户需要兼顾个人诉求和团队关系，担心被评价“不顾大局”。',
      },
    ],
  },
  {
    id: 'conflict',
    label: '冲突中你通常会？',
    options: [
      {
        id: 'endure_first',
        label: '先忍再说',
        prompt: '冲突中容易先退让，事后才觉得委屈。',
      },
      {
        id: 'argue_with_facts',
        label: '据理力争',
        prompt: '冲突中倾向用事实和逻辑争取结果，但有时显得强硬。',
      },
      {
        id: 'ask_help',
        label: '找人帮忙',
        prompt: '冲突中倾向寻找第三方支持，希望避免正面撕破脸。',
      },
      {
        id: 'cold_process',
        label: '冷处理',
        prompt: '冲突中会暂时沉默或转移话题，不擅长当场表达诉求。',
      },
    ],
  },
  {
    id: 'fear',
    label: '你最怕对方说什么？',
    options: [
      {
        id: 'young',
        label: '你还年轻',
        prompt: '用户容易被“年轻人要多成长”的说法压住。',
      },
      {
        id: 'everyone',
        label: '大家都这样',
        prompt: '用户害怕自己的诉求被说成特殊化、搞例外。',
      },
      {
        id: 'consequence',
        label: '考虑后果',
        prompt: '用户担心表达诉求会影响关系或未来机会。',
      },
      {
        id: 'custom',
        label: '自定义',
        prompt: '',
      },
    ],
  },
];

const bossCopy = {
  high_eq: [
    [
      '先接住认可，再用产出数据把话题拉回薪资',
      '张总，谢谢您认可我的表现。我也理解预算压力，所以我想具体聊聊我今年带来的结果：后台改版后客服工单下降了28%，跨部门需求也按期上线。基于这些产出，我希望讨论一个至少10%的涨薪方案。',
    ],
    [
      '把预算压力转成审批标准，避免被“大环境”带走',
      '我理解预算不是今天临时拍板，但我想确认一下：如果按今年绩效、项目贡献和岗位市场价来评估，我需要补充哪些材料，才能进入10%涨薪的审批？',
    ],
    [
      '承认团队辛苦，同时把自己的贡献量化出来',
      '团队今年确实都很辛苦，所以我更希望按同一套指标看产出。我这里有三项可量化结果：工单下降、上线准时率、跨部门需求交付，我想逐项跟您对一下。',
    ],
    [
      '把“成长”接住，再明确薪资也是岗位价值',
      '成长我认同，也愿意继续承担更高目标。但薪资本身也是岗位价值的确认，所以我希望今天能把涨薪比例或复谈条件说清楚。',
    ],
    [
      '给对方台阶，但不撤回核心诉求',
      '如果今天直接定数字有难度，我可以理解。那我们能不能先确认一个范围，比如10%左右，再由我补齐材料给您和HR走流程？',
    ],
    [
      '把谈话收束成时间节点和材料清单',
      '我不想让这次沟通停在“以后再看”。如果现在要等预算，我希望我们约定一个二次确认时间，并明确我需要准备哪些产出材料。',
    ],
    [
      '把未来目标和薪资调整绑定',
      '如果明年希望我继续承担更高优先级项目，我愿意接，但我希望职责提升和薪资调整同步讨论，这样目标和激励才是匹配的。',
    ],
    [
      '提出折中方案，让承诺变得可执行',
      '我们可以做一个折中：先按10%发起审批，如果预算最终不足，也请给我明确的替代方案，比如季度复盘后的补调节点。',
    ],
    [
      '把模糊承诺压成三个确认项',
      '我总结一下今天最需要确认的三件事：涨薪目标比例、审批路径、下一次确认时间。只要这三项清楚，我就能按要求补材料。',
    ],
    [
      '最后收束，要求形成口头承诺或书面节点',
      '张总，我尊重流程，也愿意补材料。今天我希望我们至少定下一个明确承诺：按10%方向审批，或在两周内给出带条件的复谈结论。',
    ],
  ],
  veteran: [
    [
      '先不争数字，追问涨薪标准和决策流程',
      '张总，我理解预算不是您一句话就能定的。那我想先确认一下，今年部门涨薪主要看哪些指标？如果现在不能定，什么条件下可以进入下一轮审批？',
    ],
    [
      '把对方的空话变成流程问题',
      '您说眼光放长一点，我接受。那从流程上看，哪些结果会被认定为“到了调薪节点”？我想把标准先对齐，后面按标准交付。',
    ],
    [
      '转向HR和预算窗口，避免被个人情绪纠缠',
      '如果部门预算卡住了，那HR那边有没有补调窗口？比如季度复盘、岗位调整或者项目奖金，我想知道还有哪些路径可以走。',
    ],
    [
      '要求对方给出可验证条件',
      '那我能不能这样理解：不是不能涨，而是要看预算和材料。具体到我的情况，您觉得还缺哪一项证据？',
    ],
    [
      '把“大家都一样”拆成公平比较',
      '如果大家都要按统一标准，那我反而更安心。我们能不能看一下同级别岗位的指标，我想知道自己差在哪里。',
    ],
    [
      '把谈话从态度转成下一步',
      '我不想让这件事变成态度问题。我们就按流程来，今天先确定谁审批、看什么材料、什么时候有反馈。',
    ],
    [
      '用复盘节点换取时间压力',
      '如果当下只能先走材料，我建议我们把复谈约在两周后。这样我有时间补证据，您也有时间看预算。',
    ],
    [
      '用邮件纪要锁住口头承诺',
      '那我会后发一封总结邮件，把今天对齐的条件和时间写清楚，您看是否合适。这样后续推进也不容易误解。',
    ],
    [
      '把二次谈薪变成正式事项',
      '我希望这不是一次闲聊，而是一次正式的调薪沟通。哪怕今天不能定，也请给我一个明确的后续节点。',
    ],
    [
      '保留关系，同时要求书面路径',
      '我理解您要平衡团队，也愿意配合流程。最后请您帮我确认：这次是进入审批，还是进入带条件的复谈？',
    ],
  ],
  naive: [
    [
      '接受成长叙事，没有继续提出诉求',
      '嗯嗯，我明白，公司确实不容易。我也不是非要涨薪，就是想知道自己做得怎么样，后面我继续努力。',
    ],
    [
      '把自己的需求降级成请教',
      '那可能也是我想得太急了。我主要还是想听听您对我后续成长有什么建议。',
    ],
    [
      '主动替对方找理由',
      '预算紧我能理解，大家应该都挺不容易的。我这边没关系，先以团队为重。',
    ],
    [
      '放弃数字，换成模糊期待',
      '那涨薪的事我们之后有机会再说吧，我现在更重要的是把工作做好。',
    ],
    [
      '过度道歉，主导权继续下滑',
      '不好意思张总，可能是我表达得不太成熟。我没有给您压力的意思。',
    ],
    [
      '把问题完全归因到自己身上',
      '可能我确实还需要再沉淀一下。您觉得我哪里还不够，我再补。',
    ],
    [
      '接受空泛承诺',
      '如果您说以后会看，那我相信您。我就先不纠结这次了。',
    ],
    [
      '用努力表态替代具体诉求',
      '我会继续努力的，明年争取做出更多成绩，到时候再看也可以。',
    ],
    [
      '临门一脚撤回边界',
      '那今天就先这样吧，我不想因为这个影响您对我的印象。',
    ],
    [
      '结尾仍没有拿到任何条件',
      '好的张总，我明白了。谢谢您跟我聊这么多，我回去继续努力。',
    ],
  ],
  confrontational: [
    [
      '直接指出薪资不匹配，但容易让对方防御',
      '张总，我觉得不能总拿年轻和成长说事。我做了这么多，薪资还停在8K，这明显不匹配。今天我就是想要一个明确涨薪答复。',
    ],
    [
      '直接拆穿话术',
      '您说预算紧，但这听起来像是在回避我的贡献。我需要的是涨薪方案，不是成长建议。',
    ],
    [
      '拿市场价施压',
      '按我现在的工作量和市场水平，8K确实偏低。如果公司没有调整计划，我需要重新考虑自己的选择。',
    ],
    [
      '要求现场给答案',
      '流程我可以配合，但不能每次都用流程拖过去。今天请您明确说：能涨，还是不能涨？',
    ],
    [
      '短句强压，关系风险升高',
      '我不接受“以后再看”。我今年的产出摆在这里，薪资也应该有对应变化。',
    ],
    [
      '把底线说得很硬',
      '如果连10%都不能讨论，那说明公司没有把我的贡献当回事。',
    ],
    [
      '用离职风险制造压力',
      '我不是威胁，但我也需要为自己负责。如果薪资长期不匹配，我会考虑外部机会。',
    ],
    [
      '拒绝被贴成熟度标签',
      '提出合理涨薪不是不成熟。把诉求说清楚，是我对自己职业负责。',
    ],
    [
      '在最后阶段压出承诺',
      '张总，我今天必须拿到一个明确节点。没有节点，就等于没有承诺。',
    ],
    [
      '终局硬收束',
      '我尊重您，但我也尊重自己的产出。请您给一个清楚答复：这次涨薪到底怎么推进？',
    ],
  ],
};

const interviewCopy = {
  high_eq: [
    [
      '先定义岗位问题，再给匹配证据',
      '陈总，我理解这个岗位不是单纯执行需求，而是要把业务目标转成可落地的产品方案。我过去做过一次从0到1的增长工具，能对应这里“拆问题、推协作、看结果”的要求。',
    ],
    [
      '把泛泛优势压成具体项目',
      '我举一个具体例子：上个项目里，销售线索转化掉到了18%。我先重排了用户路径，再推动运营和研发做两轮实验，最后把转化拉到26%。这类跨部门推进，我比较熟。',
    ],
    [
      '接住追问，展开行动和取舍',
      '当时难点不是做功能，而是大家对优先级判断不一致。我先用数据把争论收束到两个指标，再拆出最小实验，避免一开始就投入完整开发。',
    ],
    [
      '承认风险，但给控制方案',
      '您担心候选人进来以后适应成本高，这个我理解。我通常会先在前两周补齐业务、数据和关键人地图，再用一个小需求验证协作方式，而不是一上来大改。',
    ],
    [
      '主动追问评估标准',
      '我想反过来确认一下：您判断这个岗位前三个月是否成功，最看重的是业务指标、团队协作，还是项目交付节奏？我可以按这个标准补充更对应的经历。',
    ],
    [
      '薪资和加班问题给边界',
      '如果业务有关键节点，我可以配合冲刺。但我更看重长期节奏是否健康。薪资上我希望和职责范围匹配，我们可以先把岗位预期和预算范围对齐。',
    ],
    [
      '被认可时不过度发挥，转向优先级',
      '这个方向如果和团队需要接近，我想再了解一下目前最优先的业务问题是什么。这样我能判断自己入职后先解决哪一块，避免只讲过去经验。',
    ],
    [
      '用差异化能力回应候选比较',
      '如果和其他候选人相比，我的优势可能不是某个工具最熟，而是能把模糊目标拆成路径，并推动跨部门把结果跑出来。这个能力在我前两个项目里都被验证过。',
    ],
    [
      '给出入职后行动框架',
      '如果我加入，我会用30天做业务和数据诊断，60天推出一个可验证方案，90天把关键指标和协作机制稳定下来。这样您也能更早看到我是否匹配。',
    ],
    [
      '收束到明确下一步',
      '今天聊完我对岗位更清楚了。为了不让沟通停在感觉上，我想确认下一步流程：预计什么时候有反馈，是否还有复试，以及薪资范围会在哪个阶段正式对齐？',
    ],
  ],
  veteran: [
    [
      '先确认面试议程和重点',
      '陈总，我们可以先对齐一下这轮主要看什么吗？如果重点是业务判断，我会多讲项目取舍；如果重点是协作方式，我会讲跨部门推进细节。',
    ],
    [
      '追问岗位优先级',
      '我想先知道，这个岗位当前最急的是补执行、补策略，还是补跨部门推动？不同优先级下，我能提供的价值会不太一样。',
    ],
    [
      '用指标框定能力',
      '从结果看，我过去比较稳定的能力是把一个指标拆成动作。比如转化、留存或效率问题，我会先确认基线，再看哪一步最值得投入。',
    ],
    [
      '把适配风险变成试用期计划',
      '适配这件事我也会谨慎看。比较稳的做法是试用期前30天先定交付清单和关键人，再每两周复盘一次，及时校准。',
    ],
    [
      '要求明确团队结构',
      '方便的话，我想了解这个岗位会直接对接哪些团队，最后拍板的人是谁。这样我能判断沟通成本和职责边界。',
    ],
    [
      '流程化谈薪资范围',
      '薪资我不想今天硬拧数字，但希望先确认预算带宽。只要范围和职责匹配，后面谈起来会更高效。',
    ],
    [
      '询问决策因素',
      '如果进入最终比较，您最担心候选人的哪一项风险？经验深度、业务理解，还是稳定性？我可以直接回应这一点。',
    ],
    [
      '把模糊认可落成事实',
      '您刚才提到“方向还可以”，我想把它拆清楚：您认可的是项目方法、业务理解，还是团队协作方式？我后面可以重点补充。',
    ],
    [
      '用行动表稳住合作感',
      '如果这轮继续推进，我建议我们可以把前三个月目标拆成三项：熟悉业务、交付一个关键改进、建立复盘机制。这样双方预期更清楚。',
    ],
    [
      '礼貌确认反馈节点',
      '那我最后确认两个流程问题：这轮之后大概几天反馈？后续是HR沟通薪资，还是还会有一轮业务面？',
    ],
  ],
  naive: [
    [
      '开场过于散，缺少岗位定位',
      '我其实各方面都可以做，之前做过的项目也比较多。只要公司愿意给机会，我来了以后肯定会努力适应。',
    ],
    [
      '用热情代替证据',
      '我对这个岗位真的挺感兴趣的，也觉得贵公司平台很好。我学习能力还不错，来了以后可以很快上手。',
    ],
    [
      '把主动权交给面试官',
      '您觉得这个岗位需要什么样的人呢？我可以按照公司的要求去调整，我这边没有特别固定的想法。',
    ],
    [
      '过度道歉，暴露不稳',
      '不好意思，可能我刚才没讲清楚。我有时候表达会有点乱，但我做事还是挺认真的。',
    ],
    [
      '追问标准时变成请教',
      '那您能不能多指导我一下，我应该怎么准备才算更符合这个岗位？',
    ],
    [
      '薪资边界失守',
      '薪资方面我其实都可以，主要还是想先拿到机会。加班的话如果公司需要，我也可以配合。',
    ],
    [
      '被认可后松散发挥',
      '对对，我就是这个意思。我之前其实还做过很多事情，像运营、设计、数据我都碰过一点。',
    ],
    [
      '候选比较时自我否定',
      '如果有更资深的候选人，我可能确实没那么强，但我可以努力学。',
    ],
    [
      '只有期待，没有落地',
      '如果能加入我会非常珍惜这个机会，也会努力做好，不辜负团队信任。',
    ],
    [
      '结尾没有确认流程',
      '好的陈总，今天和您聊得很开心。那我就等通知吧，谢谢您。',
    ],
  ],
  confrontational: [
    [
      '直接证明自己，但压迫感偏强',
      '陈总，我直接说吧，这个岗位我能做，而且我不觉得需要太长适应期。你们现在缺的就是能把事情推进的人。',
    ],
    [
      '质疑岗位描述',
      'JD上写的内容其实有点泛，我看不出真正优先级。如果团队还没想清楚要什么人，候选人很难给准确答案。',
    ],
    [
      '用成绩强压',
      '我之前的结果已经证明能力了，转化、协作、上线我都做过。这个岗位对我来说不是挑战太大，而是看公司能不能给对应空间。',
    ],
    [
      '反驳风险质疑',
      '适应成本这个问题，我觉得不能预设候选人有风险。公司如果流程清楚，优秀的人自然能很快进入状态。',
    ],
    [
      '直接追问面试官判断',
      '那您现在觉得我哪里不匹配？如果只是感觉不够，我希望能讲得更具体一点。',
    ],
    [
      '薪资边界表达过硬',
      '薪资如果低于我的预期，我不会考虑。加班也可以谈，但不能默认候选人靠无条件加班证明诚意。',
    ],
    [
      '要求现场给明确评价',
      '我希望这轮结束能得到一个比较明确的判断。能不能推进，或者差在哪里，最好不要只说回去讨论。',
    ],
    [
      '比较候选时施压',
      '如果你们还在比较候选人，我能理解。但从效率上说，反复比较也会让真正合适的人流失。',
    ],
    [
      '主动给计划但口气偏硬',
      '我可以给30/60/90天计划，但前提是团队要给足授权。没有授权，计划写得再漂亮也落不了地。',
    ],
    [
      '收尾逼答案',
      '陈总，我尊重流程，但我也需要安排其他机会。今天能不能给我一个明确判断：这轮是推进，还是到这里？',
    ],
  ],
};

const blameCopy = {
  high_eq: [
    '先稳住会议，再请求按时间线复盘',
    '王总，我先不评价谁的问题。我建议我们按三个时间点复盘：需求变更、我同步风险、最终交付。李明刚才提到的点，我可以逐条对照记录说明。',
  ],
  veteran: [
    '把争吵转成证据和流程',
    '李明，我们先别抢结论。王总，我这边有两份同步记录和一版需求变更截图，能不能先按证据顺序看，再讨论责任归属？',
  ],
  naive: [
    '先道歉降温，但容易把锅接住',
    '这次确实延期了，我这边也有责任。可能我沟通得不够及时，后面我会注意。',
  ],
  confrontational: [
    '直接反击甩锅，但容易让会议失控',
    '李明你别一上来就甩锅。需求是你临时改的，风险我也提醒过，现在说全是我的问题不合适吧？',
  ],
};

const effects = {
  boss: {
    high_eq: { initiative: 11, patience: -4, goal_progress: 13 },
    veteran: { initiative: 7, patience: -2, goal_progress: 10 },
    naive: { initiative: -11, patience: 3, goal_progress: -8 },
    confrontational: { initiative: 8, patience: -15, goal_progress: 7 },
  },
  blame: {
    high_eq: { initiative: 12, patience: -5, goal_progress: 12 },
    veteran: { initiative: 9, patience: -2, goal_progress: 10 },
    naive: { initiative: -10, patience: 2, goal_progress: -8 },
    confrontational: { initiative: 9, patience: -16, goal_progress: 6 },
  },
  interview: {
    high_eq: { initiative: 10, patience: -3, goal_progress: 12 },
    veteran: { initiative: 7, patience: -1, goal_progress: 10 },
    naive: { initiative: -10, patience: 2, goal_progress: -7 },
    confrontational: { initiative: 8, patience: -14, goal_progress: 6 },
  },
  // generic：真实 API 场景(约会/相亲/借钱)的本地兜底数值表(仅 API 连续失败 2 次时启用)
  generic: {
    high_eq: { initiative: 10, patience: -3, goal_progress: 12 },
    veteran: { initiative: 7, patience: -1, goal_progress: 9 },
    naive: { initiative: -10, patience: 1, goal_progress: -8 },
    confrontational: { initiative: 7, patience: -15, goal_progress: 5 },
  },
};

const endings = {
  boss_pua_salary: {
    S: {
      title: '把涨薪谈成项目的人',
      one_liner: '你把压力变成了筹码，既守住关系，也拿到了清晰结果。',
      real_advice:
        '谈薪前准备3个量化成果、1个市场参照和1个可接受底线，最后一定确认时间点。',
    },
    A: {
      title: '稳扎稳打的谈判者',
      one_liner: '你没有被带偏，虽然不是完胜，但已经把话题推进到可执行阶段。',
      real_advice: '会后立刻发总结邮件，把承诺的时间、材料和下一步写成文字。',
    },
    B: {
      title: '差一点就被绕走的人',
      one_liner: '你争取到了一点空间，但关键数字和期限还不够明确。',
      real_advice: '不要只问能不能涨，要问谁审批、看哪些指标、什么时候确认。',
    },
    C: {
      title: '懂事但失守的人',
      one_liner: '你保住了表面和气，却把谈话主导权交给了对方。',
      real_advice: '当对方谈成长时，先认可，再补一句“今天我想确认薪资调整路径”。',
    },
    D: {
      title: '情绪先于策略的人',
      one_liner: '你说出了不满，但表达方式让谈话提前崩盘。',
      real_advice: '硬话要配硬证据。没有证据的硬刚，只会让对方更容易回避核心诉求。',
    },
  },
  colleague_blame: {
    S: {
      title: '把锅还给事实的人',
      one_liner: '你没有比谁声音大，而是把会议拉回时间线和证据链。',
      real_advice: '项目协作中保留关键节点记录，复盘时先讲时间线，再讲责任。',
    },
    A: {
      title: '没有被带节奏的人',
      one_liner: '你顶住了抢先叙事，也争取到领导按证据判断。',
      real_advice: '遇到甩锅，第一句话不要反骂，先说“我补充完整时间线”。',
    },
    B: {
      title: '守住一半的人',
      one_liner: '你说明了一些事实，但证据链还没有完全铺开。',
      real_advice: '不要只说需求变了，要说哪天谁提出、影响哪个交付、何时同步。',
    },
    C: {
      title: '越解释越被动的人',
      one_liner: '你一直在防守，却没有主动定义会议该看什么。',
      real_advice: '从“不是我的错”改成“我们按三个时间点看”，主动权会立刻不同。',
    },
    D: {
      title: '把复盘聊成争吵的人',
      one_liner: '情绪冲突盖过了事实，目标也随之失焦。',
      real_advice: '公开场合的硬刚要短、准、有记录，不要把人品当成主要论点。',
    },
  },
  office_cafe_interview: {
    S: {
      title: '把面试聊成合作的人',
      one_liner: '你读懂了对方的非言语反馈，也把匹配度、边界和下一步都落清楚了。',
      real_advice:
        '终面里别只展示能力，要同步确认岗位标准、授权范围、薪资带宽和反馈时间。',
    },
    A: {
      title: '可信又有节奏的候选人',
      one_liner: '你给出了足够证据，也没有在压力测试里丢掉边界。',
      real_advice: '面试后发一封简短跟进邮件，把岗位理解、关键匹配点和待确认事项列清楚。',
    },
    B: {
      title: '有亮点但还不够收束的人',
      one_liner: '你证明了一部分能力，但对评估标准和下一步追问还不够主动。',
      real_advice: '当面试官点头或记录时，立刻追问“您最看重哪一项成功标准”。',
    },
    C: {
      title: '被面试节奏带着走的人',
      one_liner: '你显得礼貌配合，但把薪资、职责和流程的主动权都交了出去。',
      real_advice: '不要用“我都可以”换机会。至少保留职责范围、薪资范围和反馈节点三个边界。',
    },
    D: {
      title: '把压力测试聊成对抗的人',
      one_liner: '你表达了底线，但语气让面试官更关注风险，而不是你的匹配度。',
      real_advice: '面试里的硬话要包在事实和选项里，不要直接逼对方立刻表态。',
    },
  },
  first_date_cold: {
    S: {
      title: '把冷场聊成来电的人',
      one_liner: '你读懂了她的节奏，有来有回，把尴尬聊成了想再见一面的温度。',
      real_advice: '约会别急着表现，先接住对方的话题再分享自己，把节奏放慢一半。',
    },
    A: {
      title: '自然又有分寸的人',
      one_liner: '你聊得轻松也守住了边界，气氛回暖，留下了继续的空间。',
      real_advice: '结束前自然抛一句“下次可以再约”，把好感落到具体的下一步。',
    },
    B: {
      title: '气氛回了一半的人',
      one_liner: '你让对话不再冷场，但还差一点真正的来回和默契。',
      real_advice: '少问“你做什么工作”，多接“你刚说的那个我也…”，话题才接得住。',
    },
    C: {
      title: '把约会聊成问答的人',
      one_liner: '你一直在找话题，却把约会聊成了单方面的查户口。',
      real_advice: '把封闭式提问换成分享+反问，先递出自己，对方才愿意接。',
    },
    D: {
      title: '把人聊远的人',
      one_liner: '油腻、越界或追问隐私，让她礼貌地拉开了距离。',
      real_advice: '初次见面别碰工资、催婚、隐私；尊重边界比急着拉近更重要。',
    },
  },
  blind_date_values: {
    S: {
      title: '真诚又有边界的人',
      one_liner: '你把敏感问题讲清楚，也尊重了不同的活法，价值观对得上。',
      real_advice: '相亲谈价值观，先讲清自己在意什么，再尊重对方的不同，别想着说服。',
    },
    A: {
      title: '成熟稳重的对话者',
      one_liner: '你表达清晰、不讨好也不说教，留下了继续了解的可能。',
      real_advice: '遇到分歧先说“这点我们不一样”，再说“但我理解你的考虑”。',
    },
    B: {
      title: '答得还算清楚的人',
      one_liner: '你讲了一些真实想法，但关键价值观还不够亮明。',
      real_advice: '别用“都行”回避，金钱观、节奏这类问题给出你真实的偏好。',
    },
    C: {
      title: '靠场面话过关的人',
      one_liner: '你顺着对方说了很多好话，却没让人看清真实的你。',
      real_advice: '讨好换不来认可，真诚而有边界才加分；先敢于亮出真实立场。',
    },
    D: {
      title: '把试探聊成说教的人',
      one_liner: '爹味说教或贬低对方选择，让这场散步提前降到冰点。',
      real_advice: '价值观不同不等于谁错；少评判对方的活法，多解释自己的理由。',
    },
  },
  friend_borrow_money: {
    S: {
      title: '守住边界还留住朋友的人',
      one_liner: '你先共情、再讲清自己能做什么，钱没乱转，关系也没崩。',
      real_advice: '借钱先共情再设边界：说清能帮的额度/方式，问清还款时间和用途。',
    },
    A: {
      title: '温和而坚定的人',
      one_liner: '你顶住了关系压力，给了合适的处理方式，也没把话说死。',
      real_advice: '拒绝时给替代方案（小额/帮想办法），比单纯说“不”更稳关系。',
    },
    B: {
      title: '守住一半的人',
      one_liner: '你没有立刻转账，但用途和还款条件还没问清。',
      real_advice: '别只纠结借不借，要问清用途、金额、还款时间，再决定。',
    },
    C: {
      title: '被不好意思推着走的人',
      one_liner: '你一直在退让，差点因为“朋友一场”就把钱转出去。',
      real_advice: '不好意思不是义务；先说“我得了解清楚”，把节奏拿回自己手里。',
    },
    D: {
      title: '把朋友聊成路人的人',
      one_liner: '你用审判和羞辱回绝，钱守住了，多年关系也谈崩了。',
      real_advice: '守边界不必伤人；先认可情分，再说清自己的难处和底线。',
    },
  },
};

const radarLabels = [
  { key: 'expression', label: '表达力' },
  { key: 'empathy', label: '共情力' },
  { key: 'strategy', label: '策略性' },
  { key: 'resilience', label: '抗压力' },
  { key: 'boundary', label: '边界感' },
];

const defaultPersona = '用户是入职两年的普通员工，性格中等偏内向，有能力但不善于表达诉求。';

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getActiveStep(phase) {
  return Math.max(
    0,
    steps.findIndex((step) => step.id === phase),
  );
}

function formatDelta(delta) {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function getActiveFeedbackState(scene, currentRound, totalRounds) {
  if (!scene.feedbackStates?.length) return null;
  const progress = totalRounds > 1 ? (currentRound - 1) / (totalRounds - 1) : 0;
  const stateIndex = Math.min(scene.feedbackStates.length - 1, Math.round(progress * (scene.feedbackStates.length - 1)));
  return {
    state: scene.feedbackStates[stateIndex],
    index: stateIndex,
    total: scene.feedbackStates.length,
  };
}

function getPersonaText(answers, customFear, skipped) {
  if (skipped) return defaultPersona;
  return personaQuestions
    .map((question) => {
      const selected = question.options.find((option) => option.id === answers[question.id]);
      if (question.id === 'fear' && selected?.id === 'custom') {
        return customFear.trim()
          ? `用户容易被“${customFear.trim()}”这类说法压住。`
          : '用户容易被模糊压力压住。';
      }
      return selected?.prompt || '';
    })
    .filter(Boolean)
    .join('');
}

function buildCards(sceneId, round) {
  const scene = scenes[sceneId];
  return cardTypes.map((typeMeta) => {
    const copy = getCardCopy(scene, typeMeta.type, round);
    return {
      id: `${sceneId}-${round}-${typeMeta.type}`,
      type: typeMeta.type,
      code: typeMeta.code,
      label: `${typeMeta.name} · ${copy.style || typeMeta.style}`,
      summary: copy.summary,
      full_text: copy.fullText,
      target: copy.target,
      accent: typeMeta.accent,
      tone: typeMeta.tone,
    };
  });
}

function getCardCopy(scene, type, round) {
  if (scene.engine === 'blame') {
    const [summary, fullText] = blameCopy[type];
    const target =
      type === 'high_eq' || type === 'veteran'
        ? '对王总说'
        : type === 'confrontational'
          ? '对李明说'
          : '对两人说';
    return {
      style: cardTypes.find((item) => item.type === type)?.style,
      summary,
      fullText:
        round > 1
          ? `${fullText} 第${round}轮我会继续把讨论拉回证据，不让会议停在情绪里。`
          : fullText,
      target,
    };
  }

  if (scene.engine === 'interview') {
    const copyList = interviewCopy[type];
    const [summary, fullText] = copyList[Math.min(round - 1, copyList.length - 1)];
    const target =
      type === 'confrontational'
        ? '压强回应'
        : type === 'naive'
          ? '顺从回应'
          : type === 'veteran'
            ? '流程追问'
            : '匹配证明';
    return {
      style: cardTypes.find((item) => item.type === type)?.style,
      summary,
      fullText,
      target,
    };
  }

  if (scene.engine === 'generic') {
    // 真实 API 场景：首轮 4 张卡牌取自 scene.roundOneCards；第 2 轮起卡牌由 API 的 next_cards 提供，
    // 仅当 API 连续失败回退本地时才会再次走到这里(沿用首轮卡牌即可)。
    const [summary, fullText] = scene.roundOneCards[type];
    return {
      style: cardTypes.find((item) => item.type === type)?.style,
      summary,
      fullText,
    };
  }

  const copyList = bossCopy[type];
  const [summary, fullText] = copyList[Math.min(round - 1, copyList.length - 1)];
  return {
    style: cardTypes.find((item) => item.type === type)?.style,
    summary,
    fullText,
  };
}

function createLocalRoundResponse({ sceneId, selectedCard, stats, currentRound, totalRounds }) {
  const scene = scenes[sceneId];
  const effect = effects[scene.engine][selectedCard.type];
  const stageBonus = currentRound >= Math.ceil(totalRounds * 0.65) ? 3 : 0;
  const initiativeBonus = stats.initiative >= 70 && selectedCard.type === 'high_eq' ? 4 : 0;
  const goalMomentum =
    selectedCard.type === 'high_eq' || selectedCard.type === 'veteran' ? stageBonus + initiativeBonus : 0;

  const nextStats = {
    initiative: clamp(stats.initiative + effect.initiative),
    patience: clamp(stats.patience + effect.patience),
    goal_progress: clamp(stats.goal_progress + effect.goal_progress + goalMomentum),
  };

  const deltas = {
    initiative: nextStats.initiative - stats.initiative,
    patience: nextStats.patience - stats.patience,
    goal_progress: nextStats.goal_progress - stats.goal_progress,
  };

  const isEnded = currentRound >= totalRounds || nextStats.patience <= 0;
  let npcResponses;
  if (scene.engine === 'blame') {
    npcResponses = buildBlameResponses(selectedCard.type, nextStats, currentRound, totalRounds, isEnded);
  } else if (scene.engine === 'interview') {
    npcResponses = buildInterviewResponses(selectedCard.type, nextStats, currentRound, totalRounds, isEnded);
  } else if (scene.engine === 'generic') {
    npcResponses = buildGenericResponses(scene, selectedCard.type, nextStats, currentRound, totalRounds, isEnded);
  } else {
    npcResponses = buildBossResponses(selectedCard.type, nextStats, currentRound, totalRounds, isEnded);
  }

  return {
    npc_responses: npcResponses,
    stats_change: {
      initiative: { delta: deltas.initiative, current: nextStats.initiative },
      patience: { delta: deltas.patience, current: nextStats.patience },
      goal_progress: { delta: deltas.goal_progress, current: nextStats.goal_progress },
    },
    next_cards: isEnded ? [] : buildCards(sceneId, currentRound + 1),
    game_state: {
      current_round: isEnded ? currentRound : currentRound + 1,
      total_rounds: totalRounds,
      is_ended: isEnded,
      end_trigger: nextStats.patience <= 0 ? 'patience_zero' : currentRound >= totalRounds ? 'rounds_exhausted' : null,
    },
  };
}

function buildBossResponses(type, stats, round, totalRounds, isEnded) {
  let dialogue;

  if (stats.patience <= 0) {
    dialogue =
      '张总的笑意收了起来：如果今天只是情绪输出，那我们先到这里。涨薪这件事，我看你还需要再冷静一下。';
  } else if (isEnded && stats.goal_progress >= 90 && stats.initiative >= 70) {
    dialogue =
      '张总沉默了几秒，把绩效表翻回第一页：行，你把材料今天发我。我按10%到12%的方向去跟HR确认，两周内给你答复。';
  } else if (isEnded && stats.goal_progress >= 70) {
    dialogue =
      '张总点点头：我不能现在口头拍板，但你这个材料可以进审批。你会后发我，我们下周和HR一起过一遍。';
  } else if (isEnded) {
    dialogue =
      '张总合上本子：今天先这样。你的想法我知道了，但涨薪还要再观察一段时间，等明年有机会我们再看。';
  } else if (type === 'high_eq') {
    dialogue =
      round >= totalRounds * 0.6
        ? '张总的语气慢了下来：你这几项结果确实可以写进材料。但预算还是要卡，我最多先帮你看能不能走一个审批口。'
        : '张总笑了一下：你准备得挺充分。只是公司不是不认可你，而是今年每个部门都被要求控制成本。你也要理解这个大盘。';
  } else if (type === 'veteran') {
    dialogue =
      '张总把笔转了半圈：流程上当然有标准，绩效、预算、岗位稀缺性都要看。你要问条件，我可以跟你讲，但不代表现在就能定。';
  } else if (type === 'naive') {
    dialogue =
      '张总顺势点头：你能这样想我很欣慰。年轻阶段多沉淀，钱迟早会跟上。先把明年的重点项目做好，机会自然会有。';
  } else {
    dialogue =
      '张总的笑容收了一点：诉求可以提，但方式要成熟。公司不是不看贡献，只是不能因为你觉得不匹配，就马上打破整体节奏。';
  }

  return [
    {
      name: '张总',
      role: 'boss',
      dialogue,
    },
  ];
}

function buildInterviewResponses(type, stats, round, totalRounds, isEnded) {
  let dialogue;

  if (stats.patience <= 0) {
    dialogue =
      '陈总把咖啡杯放回桌面，语气明显变淡：我理解你有自己的判断，但这轮沟通里我对合作风险还是有些顾虑。今天先到这里。';
  } else if (isEnded && stats.goal_progress >= 90 && stats.initiative >= 70) {
    dialogue =
      '陈总合上笔记本，正面看向你：匹配点已经比较清楚了。我会推动HR这两天和你对齐薪资范围，下一轮我们直接聊入职后的重点项目。';
  } else if (isEnded && stats.goal_progress >= 70) {
    dialogue =
      '陈总点了点头：今天的信息够用了，你的几个项目和我们现在的问题是对得上的。我会让HR在三天内给你下一步反馈。';
  } else if (isEnded) {
    dialogue =
      '陈总把笔记翻到最后一页：今天先聊到这里。你有些经历是相关的，但我还需要和团队再比较一下，后续让HR同步你结果。';
  } else if (type === 'high_eq') {
    dialogue =
      round >= totalRounds * 0.6
        ? '陈总的手从杯沿挪到笔记本上：你这个30/60/90天的拆法有参考价值。那如果团队目标临时变化，你会怎么调整优先级？'
        : '陈总身体略微前倾：这个例子比简历上清楚。你说推动跨部门，那当时阻力最大的是谁，你具体怎么让对方配合？';
  } else if (type === 'veteran') {
    dialogue =
      '陈总低头记了一笔：你问得挺实在。这个岗位前三个月最看交付节奏和业务判断，我想听听你怎么处理目标模糊但时间紧的情况。';
  } else if (type === 'naive') {
    dialogue =
      '陈总维持着礼貌笑意，但手指轻敲了一下杯沿：努力和兴趣我能理解，不过我更想听到具体场景。你能不能讲一个你真正推动结果的例子？';
  } else {
    dialogue =
      '陈总收起了一点笑：直接表达没有问题，但面试也是看合作方式。你可以讲底线，不过我也需要看到你怎么在复杂团队里推动事情。';
  }

  return [
    {
      name: '陈总',
      role: 'interviewer',
      dialogue,
    },
  ];
}

// generic 引擎(约会/相亲/借钱)的本地兜底回复——仅当真实 API 连续失败 2 次回退时启用。
function buildGenericResponses(scene, type, stats, round, totalRounds, isEnded) {
  const speaker = scene.opening?.[0] || {};
  const name = speaker.name || scene.opponent;
  const role = speaker.role || 'npc';
  let dialogue;
  if (stats.patience <= 0) {
    dialogue = `${name}的态度明显冷了下来，语气淡了：那……今天就先到这里吧。`;
  } else if (isEnded && stats.goal_progress >= 90 && stats.initiative >= 70) {
    dialogue = `${name}的神情松了下来：今天聊得挺好，难得这么投契，后面我们可以再约着继续。`;
  } else if (isEnded && stats.goal_progress >= 70) {
    dialogue = `${name}点了点头：聊到这儿我心里有数了，整体感觉不错，回头再联系。`;
  } else if (isEnded) {
    dialogue = `${name}笑了笑：今天先这样吧，我再想想，有结果跟你说。`;
  } else if (type === 'high_eq') {
    dialogue = `${name}神色缓和了些，顺着你的话往下接：嗯，你这么说我能理解，那再多讲讲？`;
  } else if (type === 'veteran') {
    dialogue = `${name}沉了一下：你考虑得挺周全，不过我更想听听你自己真正怎么想。`;
  } else if (type === 'naive') {
    dialogue = `${name}的语气客气了几分，却也悄悄拉开了一点距离：嗯……是这样啊。`;
  } else {
    dialogue = `${name}愣了一下，气氛绷紧了些：你这么直接，我得想想该怎么接。`;
  }
  return [{ name, role, dialogue }];
}

function buildBlameResponses(type, stats, round, totalRounds, isEnded) {
  if (stats.patience <= 0) {
    return [
      {
        name: '李明',
        role: 'colleague',
        dialogue: '你看，又开始上纲上线了。这个会还怎么开？',
      },
      {
        name: '王总',
        role: 'leader',
        dialogue: '先停。今天的复盘已经偏离事实了，你们把材料发我，会议到这里。',
      },
    ];
  }

  if (isEnded && stats.goal_progress >= 70) {
    return [
      {
        name: '李明',
        role: 'colleague',
        dialogue: '我不是说我完全没责任，但当时确实情况很乱，你这些记录也不能说明全部问题。',
      },
      {
        name: '王总',
        role: 'leader',
        dialogue:
          '记录已经能说明关键节点了。延期责任不能简单归到一个人身上，后续按时间线补完整复盘和改进方案。',
      },
    ];
  }

  if (isEnded) {
    return [
      {
        name: '李明',
        role: 'colleague',
        dialogue: '我还是觉得你这边没有及时兜住，反正影响已经造成了。',
      },
      {
        name: '王总',
        role: 'leader',
        dialogue: '双方都有解释，但证据还不够清楚。会后把记录补齐，我再判断。',
      },
    ];
  }

  if (type === 'high_eq') {
    return [
      {
        name: '李明',
        role: 'colleague',
        dialogue: '时间线当然可以看，但你别把问题全推给需求变更。延期这个结果是客观存在的。',
      },
      {
        name: '王总',
        role: 'leader',
        dialogue:
          round >= totalRounds * 0.6
            ? '继续按时间点说。你刚才提到的记录很关键，把影响范围也补上。'
            : '这个方向可以。先讲事实顺序，再讲责任判断。',
      },
    ];
  }

  if (type === 'veteran') {
    return [
      {
        name: '李明',
        role: 'colleague',
        dialogue: '你又开始拿流程压人了。当时现场那么多变化，谁能每一步都截图？',
      },
      {
        name: '王总',
        role: 'leader',
        dialogue: '不是拿流程压人，是复盘需要依据。你们都把对应记录拿出来看。',
      },
    ];
  }

  if (type === 'naive') {
    return [
      {
        name: '李明',
        role: 'colleague',
        dialogue: '你看，你自己也承认沟通不及时了。那这次延期主要问题就很清楚。',
      },
      {
        name: '王总',
        role: 'leader',
        dialogue: '先别急着下结论。你如果有补充证据，现在就说。',
      },
    ];
  }

  return [
    {
      name: '李明',
      role: 'colleague',
      dialogue: '你这话什么意思？我临时改需求也是为了项目，你现在把锅往我身上甩？',
    },
    {
      name: '王总',
      role: 'leader',
      dialogue: '停一下。情绪先放下，我只看证据和时间线。',
    },
  ];
}

function extractStats(response) {
  return {
    initiative: clamp(response.stats_change.initiative.current),
    patience: clamp(response.stats_change.patience.current),
    goal_progress: clamp(response.stats_change.goal_progress.current),
  };
}

function responseHasShape(response) {
  return (
    response &&
    Array.isArray(response.npc_responses) &&
    response.stats_change?.initiative &&
    response.stats_change?.patience &&
    response.stats_change?.goal_progress &&
    Array.isArray(response.next_cards) &&
    response.game_state
  );
}

// 规范化真实 API 返回：保留模型给的“真实反馈”核心(npc_responses 台词 + stats_change 数值)，
// 对机械字段(next_cards 数量、game_state 轮次)做本地兜底修复——模型偶尔漏字段也不至于整轮回退。
function normalizeRoundResponse(parsed, { scene, currentRound, totalRounds }) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const out = { ...parsed };

  // next_cards：确保 4 张且 4 种 type 齐全，缺哪张用本地卡补哪张
  const localCards = buildCards(scene.id, Math.min(currentRound + 1, totalRounds));
  const byType = {};
  (Array.isArray(out.next_cards) ? out.next_cards : []).forEach((card) => {
    if (card && card.type) byType[card.type] = card;
  });
  out.next_cards = cardTypes.map((meta) => {
    const local = localCards.find((card) => card.type === meta.type);
    const api = byType[meta.type];
    if (!api) return local;
    // 保留 API 的话术内容(label/summary/full_text)，机械字段(id/code/accent/tone/target)用本地兜底。
    // API 的 JSON schema 不返回 id，缺 id 会让 selectedCardId 恒为 undefined，导致 4 张卡全部判定为选中、
    // 且 confirmCard 首行 `!selectedCardId` 直接 return → 第 2 轮起“确认出牌”点击无效。
    return {
      ...local,
      label: api.label || local.label,
      summary: api.summary || local.summary,
      full_text: api.full_text || local.full_text,
    };
  });

  // game_state：缺失或非法时按本地规则合成
  const gs = out.game_state;
  if (!gs || typeof gs !== 'object' || typeof gs.is_ended !== 'boolean') {
    const patienceCurrent = out.stats_change?.patience?.current;
    const patienceDead = typeof patienceCurrent === 'number' && patienceCurrent <= 0;
    const isEnded = currentRound >= totalRounds || patienceDead;
    out.game_state = {
      current_round: isEnded ? currentRound : currentRound + 1,
      total_rounds: totalRounds,
      is_ended: isEnded,
      end_trigger: isEnded ? (patienceDead ? 'patience_zero' : 'rounds_exhausted') : null,
    };
  }
  return out;
}

// 防御式 JSON 解析：容忍 markdown 代码块包裹、JSON 前后多余文字；提取最外层 {...} 再解析。
// step-3.7-flash 等推理模型不走 response_format 时偶尔会带格式杂质，这里尽量救回。
function parseLooseJson(content) {
  if (content && typeof content === 'object') return content;
  if (typeof content !== 'string') return null;
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildSystemPrompt(scene, personaText) {
  if (scene.systemPrompt) {
    return `${scene.systemPrompt} 用户人设：${personaText} 严格输出JSON。`;
  }
  if (scene.engine === 'blame') {
    return `你是一个社交训练游戏的AI引擎。你同时扮演李明和王总。场景是项目复盘会上同事甩锅。李明暴躁易怒，目标是把延期责任推给用户。王总沉着冷静，目标是按证据判断责任。用户人设：${personaText} 严格输出JSON。`;
  }

  if (scene.engine === 'interview') {
    return `你是一个社交训练游戏的AI引擎。你扮演陈总，试探型男性业务负责人。场景是办公室咖啡厅终面。你坐在用户正对面，通过表情、停顿、手势和追问释放反馈。你的目标是判断用户是否岗位匹配、表达清晰、有薪资和协作边界。用户人设：${personaText} 严格输出JSON。`;
  }

  return `你是一个社交训练游戏的AI引擎。你扮演张总，笑面虎型部门总监。场景是年终review压薪谈话。你的目标是把涨薪压到5%以内，除非用户持续用事实、流程和边界推进。用户人设：${personaText} 严格输出JSON。`;
}

function buildUserPrompt({ scene, selectedCard, stats, currentRound, totalRounds, messages }) {
  const compactHistory = messages
    .slice(-10)
    .map((message) => `${message.name}：${message.dialogue}`)
    .join('\n');

  return `【角色锚定】场景：${scene.title}。当前第${currentRound}轮/共${totalRounds}轮。当前数值：主动权${stats.initiative}，耐心${stats.patience}，目标达成率${stats.goal_progress}。
【最近对话】
${compactHistory}
【用户本轮出牌】
${selectedCard.full_text}
请只输出如下结构的 JSON（字段名、层级、类型必须完全一致，禁止改成中文字段名，禁止输出任何 JSON 以外的文字）：
{
  "npc_responses": [{"name": "NPC姓名", "role": "角色标识(如boss/colleague/manager/date/blind_date/friend/interviewer)", "dialogue": "本轮台词"}],
  "stats_change": {
    "initiative": {"delta": 本轮变化量数字, "current": 变化后0到100整数},
    "patience": {"delta": 本轮变化量数字, "current": 变化后0到100整数},
    "goal_progress": {"delta": 本轮变化量数字, "current": 变化后0到100整数}
  },
  "next_cards": [
    {"type": "high_eq", "label": "高情商 · 简短风格词", "summary": "一句话摘要", "full_text": "完整话术(作为用户下一轮可选发言)"},
    {"type": "veteran", "label": "老油条 · 简短风格词", "summary": "一句话摘要", "full_text": "完整话术"},
    {"type": "naive", "label": "学生思维 · 简短风格词", "summary": "一句话摘要", "full_text": "完整话术"},
    {"type": "confrontational", "label": "硬刚 · 简短风格词", "summary": "一句话摘要", "full_text": "完整话术"}
  ],
  "game_state": {"current_round": ${currentRound + 1}, "total_rounds": ${totalRounds}, "is_ended": false, "end_trigger": null}
}
约束：npc_responses 多人场景按发言顺序给多条；next_cards 固定 4 张且 type 必须分别为 high_eq/veteran/naive/confrontational 各一张；当 ${currentRound} 已是最后一轮(达到 ${totalRounds})或某项 patience 的 current<=0 时，把 game_state.is_ended 设为 true 并给出 end_trigger("rounds_exhausted" 或 "patience_zero")，此时 next_cards 可为空数组。`;
}

async function requestRoundWithRetry({ scene, personaText, selectedCard, stats, currentRound, totalRounds, messages }) {
  const body = {
    model: API_CONFIG.model,
    messages: [
      { role: 'system', content: buildSystemPrompt(scene, personaText) },
      {
        role: 'user',
        content: buildUserPrompt({ scene, selectedCard, stats, currentRound, totalRounds, messages }),
      },
    ],
    temperature: 0.7,
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_CONFIG.key}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      const parsed = parseLooseJson(content);
      const normalized = normalizeRoundResponse(parsed, { scene, currentRound, totalRounds });
      if (!responseHasShape(normalized)) {
        throw new Error('RoundResponse shape mismatch');
      }
      return normalized;
    } catch (error) {
      lastError = error;
      await wait(350);
    }
  }

  throw lastError;
}

// 结局评分 system prompt（取自 prompts/ending-report.md，内联精简版）
const ENDING_SYSTEM_PROMPT = `你是一个社交训练游戏的结局评分引擎。你会收到完整对话历史、最终数值、总轮次、结束原因和用户每轮出牌记录，据此生成结局评分报告。
你的输出必须是严格 JSON 对象，不要 Markdown、不要解释、不要代码块、不要任何 JSON 外的文字，不要用单引号。
先按最终数值判定 grade（满足多个时按 D、S、A、B、C 优先级）：
- D：patience<=0 或 end_trigger 为 patience_zero
- S：goal_progress>=90 且 initiative>=70
- A：goal_progress>=70
- B：goal_progress>=50
- C：goal_progress<50 且 patience>0
五维雷达每项为 0-100 整数，必须拉开差异：expression 表达力 / empathy 共情力 / strategy 策略性 / resilience 抗压力 / boundary 边界感。
best_line=用户出牌后 goal_progress 增加最多那轮的关键表达；worst_line=initiative 下降最多那轮的关键表达；round 对应真实轮次，text 必须来自用户说过的话(可轻微截短，不可编造)。
title 要有区分度，one_liner 和 real_advice 各 1 句、可执行、像复盘不像批改、可犀利但不羞辱。
严格按如下结构输出（字段名/层级/类型不可改）：
{"ending":{"grade":"A","title":"...","one_liner":"...","radar":{"expression":75,"empathy":65,"strategy":80,"resilience":70,"boundary":78},"best_line":{"round":5,"text":"..."},"worst_line":{"round":2,"text":"..."},"real_advice":"..."}}`;

function endingHasShape(data) {
  return (
    data &&
    typeof data.grade === 'string' &&
    typeof data.title === 'string' &&
    typeof data.one_liner === 'string' &&
    data.radar &&
    ['expression', 'empathy', 'strategy', 'resilience', 'boundary'].every(
      (key) => typeof data.radar[key] === 'number',
    ) &&
    data.best_line &&
    data.worst_line &&
    typeof data.real_advice === 'string'
  );
}

function buildEndingUserPrompt({ scene, stats, totalRounds, endTrigger, messages }) {
  const history = messages
    .slice(-20)
    .map((message) => `${message.name}：${message.dialogue}`)
    .join('\n');
  const selected = messages
    .filter((message) => message.role === 'user')
    .map((message, index) => `第${message.round || index + 1}轮[${message.cardType || '-'}]：${message.dialogue}`)
    .join('\n');
  return `scenario_id：${scene.id}
total_rounds：${totalRounds}
end_trigger：${endTrigger || 'null'}
final_stats：主动权 ${stats.initiative}，对方耐心 ${stats.patience}，目标达成率 ${stats.goal_progress}
conversation_history：
${history}
selected_cards：
${selected}
请严格按结局 JSON 输出，不要任何额外文字。`;
}

async function requestEndingWithRetry({ scene, personaText, stats, totalRounds, endTrigger, messages }) {
  const body = {
    model: API_CONFIG.model,
    messages: [
      { role: 'system', content: `${ENDING_SYSTEM_PROMPT}\n用户人设：${personaText}` },
      { role: 'user', content: buildEndingUserPrompt({ scene, stats, totalRounds, endTrigger, messages }) },
    ],
    temperature: 0.7,
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_CONFIG.key}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      const parsed = parseLooseJson(content);
      const ending = parsed?.ending || parsed;
      if (!endingHasShape(ending)) {
        throw new Error('EndingResponse shape mismatch');
      }
      return ending;
    } catch (error) {
      lastError = error;
      await wait(350);
    }
  }

  throw lastError;
}

function getGrade(stats) {
  if (stats.patience <= 0) return 'D';
  if (stats.goal_progress >= 90 && stats.initiative >= 70) return 'S';
  if (stats.goal_progress >= 70) return 'A';
  if (stats.goal_progress >= 50) return 'B';
  return 'C';
}

function buildEnding(sceneId, stats, messages) {
  const grade = getGrade(stats);
  const userMessages = messages.filter((message) => message.role === 'user');
  const bestMessage =
    [...userMessages].reverse().find((message) => message.cardType === 'high_eq') ||
    [...userMessages].reverse().find((message) => message.cardType === 'veteran') ||
    userMessages[userMessages.length - 1];
  const riskyMessage =
    userMessages.find((message) => message.cardType === 'naive') ||
    userMessages.find((message) => message.cardType === 'confrontational');

  const highEqCount = userMessages.filter((message) => message.cardType === 'high_eq').length;
  const veteranCount = userMessages.filter((message) => message.cardType === 'veteran').length;
  const naiveCount = userMessages.filter((message) => message.cardType === 'naive').length;
  const hardCount = userMessages.filter((message) => message.cardType === 'confrontational').length;

  const template = endings[sceneId][grade];
  return {
    grade,
    title: template.title,
    one_liner: template.one_liner,
    radar: {
      expression: clamp(38 + stats.goal_progress * 0.35 + stats.initiative * 0.22 + highEqCount * 3),
      empathy: clamp(48 + highEqCount * 7 + veteranCount * 2 - hardCount * 4 - naiveCount * 2),
      strategy: clamp(42 + stats.goal_progress * 0.38 + veteranCount * 6 + highEqCount * 3 - naiveCount * 4),
      resilience: clamp(40 + stats.initiative * 0.45 + hardCount * 2 - naiveCount * 5),
      boundary: clamp(42 + stats.goal_progress * 0.28 + hardCount * 4 + highEqCount * 2 - naiveCount * 6),
    },
    best_line: {
      round: bestMessage?.round || 1,
      text: bestMessage?.dialogue || '你尝试把对话拉回目标。',
    },
    worst_line: {
      round: riskyMessage?.round || bestMessage?.round || 1,
      text: riskyMessage?.dialogue || '本局没有明显失误；下一局要警惕只拿到口头认可，却没有确认时间节点。',
    },
    real_advice: template.real_advice,
  };
}

const firstInteractiveSceneId = 'office_cafe_interview';

function buildOpeningMessages(scene) {
  return scene.opening.map((message, index) => ({
    ...message,
    id: `opening-${index}`,
    round: 0,
    speaker: 'npc',
  }));
}

function App() {
  const firstInteractiveScene = scenes[firstInteractiveSceneId];
  const [phase, setPhase] = useState('scenario');
  const [selectedCategoryId, setSelectedCategoryId] = useState('workplace');
  const [selectedScenarioId, setSelectedScenarioId] = useState(firstInteractiveSceneId);
  const [totalRounds, setTotalRounds] = useState(10);
  const [personaSkipped, setPersonaSkipped] = useState(false);
  const [personaAnswers, setPersonaAnswers] = useState({
    identity: 'experienced',
    conflict: 'endure_first',
    fear: 'young',
  });
  const [customFear, setCustomFear] = useState('');
  const [stats, setStats] = useState(firstInteractiveScene.initialStats);
  const [messages, setMessages] = useState(() => buildOpeningMessages(firstInteractiveScene));
  const [cards, setCards] = useState(() => buildCards(firstInteractiveSceneId, 1));
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [pending, setPending] = useState(false);
  const [ending, setEnding] = useState(null);
  const [status, setStatus] = useState(API_CONFIG.useMock ? '本地副本' : 'API联调');

  const activeStep = getActiveStep(phase);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) || categories[0];
  const scene = scenes[selectedScenarioId] || scenes.boss_pua_salary;
  const selectedEvent = categories
    .flatMap((category) => category.events)
    .find((event) => event.id === selectedScenarioId);
  const personaText = useMemo(
    () => getPersonaText(personaAnswers, customFear, personaSkipped),
    [personaAnswers, customFear, personaSkipped],
  );

  function updatePersona(questionId, optionId) {
    setPersonaSkipped(false);
    setPersonaAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  function startGame() {
    const initialMessages = buildOpeningMessages(scene);
    setStats(scene.initialStats);
    setMessages(initialMessages);
    setCards(buildCards(scene.id, 1));
    setCurrentRound(1);
    setSelectedCardId(null);
    setEnding(null);
    setStatus(API_CONFIG.useMock ? '本地副本' : API_CONFIG.key ? 'API联调' : '缺少API Key，使用本地副本');
    setPhase('play');
  }

  function restartCurrentScene() {
    startGame();
  }

  function resetToScenario() {
    setPhase('scenario');
    setEnding(null);
    setSelectedCardId(null);
    setPending(false);
  }

  async function confirmCard() {
    if (pending || !selectedCardId) return;

    const selectedCard = cards.find((card) => card.id === selectedCardId);
    if (!selectedCard) return;

    const userMessage = {
      id: `user-${currentRound}-${Date.now()}`,
      name: '你',
      role: 'user',
      speaker: 'user',
      round: currentRound,
      cardType: selectedCard.type,
      dialogue: selectedCard.full_text,
    };
    const historyWithUser = [...messages, userMessage];

    setMessages(historyWithUser);
    setCards([]);
    setSelectedCardId(null);
    setPending(true);
    // 分流按场景：demo 场景(办公室咖啡厅面试)永远走本地预设；其余场景有 key 即走真实 API。
    // VITE_USE_MOCK 保留为全局 dev 逃生开关(true 时全部走本地)。
    const sceneUsesLocal = scene.demo || API_CONFIG.useMock || !API_CONFIG.key;
    setStatus(sceneUsesLocal ? 'NPC思考中' : '请求AI中');

    // 本地/demo 模式模拟真实 AI 思考延迟(~2s)，避免瞬回显得不真实；真实 API 本身有耗时，保持小等待
    await wait(sceneUsesLocal ? 1800 : 450);

    let response;
    let usedFallback = sceneUsesLocal;

    if (!usedFallback) {
      try {
        response = await requestRoundWithRetry({
          scene,
          personaText,
          selectedCard,
          stats,
          currentRound,
          totalRounds,
          messages: historyWithUser,
        });
      } catch {
        usedFallback = true;
      }
    }

    if (!response) {
      response = createLocalRoundResponse({
        sceneId: scene.id,
        selectedCard,
        stats,
        currentRound,
        totalRounds,
      });
    }

    const nextStats = extractStats(response);
    const npcMessages = response.npc_responses.map((message, index) => ({
      ...message,
      id: `npc-${currentRound}-${index}-${Date.now()}`,
      speaker: 'npc',
      round: currentRound,
    }));
    const fullHistory = [...historyWithUser, ...npcMessages];

    setStats(nextStats);
    setMessages(fullHistory);
    setPending(false);

    if (response.game_state.is_ended) {
      let endingData = null;
      // 非 demo 场景：结局也走真实 API（用 ending-report prompt 生成评语+评分）；demo/无 key/mock 走本地规则。
      if (!sceneUsesLocal) {
        setStatus('生成结局评分中');
        try {
          endingData = await requestEndingWithRetry({
            scene,
            personaText,
            stats: nextStats,
            totalRounds,
            endTrigger: response.game_state.end_trigger,
            messages: fullHistory,
          });
        } catch {
          endingData = null; // API 连续失败 2 次 → 回退本地评分
        }
      }
      if (!endingData) {
        endingData = buildEnding(scene.id, nextStats, fullHistory);
      }
      setEnding(endingData);
      setStatus('副本结束');
      window.setTimeout(() => setPhase('ending'), 850);
      return;
    }

    setCards(response.next_cards);
    setCurrentRound(response.game_state.current_round);
    setStatus(usedFallback ? '本地副本' : 'AI回合完成');
  }

  return (
    <div
      className={`app-shell ${phase === 'play' ? 'play-mode' : ''} ${
        phase === 'play' && !scene.demo ? 'play-light' : ''
      }`}
    >
      <aside
        className="side-rail"
        aria-label={phase === 'play' ? '对话历史' : '副本进度'}
        tabIndex={phase === 'play' ? 0 : undefined}
      >
        {phase === 'play' ? (
          <HistoryRail messages={messages} scene={scene} />
        ) : (
          <>
            <div className="brand-block">
              <div className="brand-mark" aria-hidden="true">
                B
              </div>
              <div>
                <h1>Banter</h1>
                <p>现实社交副本训练</p>
              </div>
            </div>

            <ol className="step-list">
              {steps.map((step, index) => (
                <li
                  className={`step-item ${index === activeStep ? 'active' : ''} ${index < activeStep ? 'done' : ''}`}
                  key={step.id}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <b>{step.label}</b>
                </li>
              ))}
            </ol>

            <div className="run-card">
              <span className="meta-label">当前副本</span>
              <strong>{scene.title}</strong>
              <p>{selectedEvent?.tag || scene.badge}</p>
              <div className="run-meta">
                <span>{scene.mode}</span>
                <span>{totalRounds}轮</span>
                <span>{status}</span>
              </div>
            </div>
          </>
        )}
      </aside>

      <main className="main-stage">
        {phase === 'scenario' && (
          <ScenarioScreen
            selectedCategory={selectedCategory}
            selectedCategoryId={selectedCategoryId}
            selectedScenarioId={selectedScenarioId}
            totalRounds={totalRounds}
            onCategoryChange={setSelectedCategoryId}
            onScenarioChange={setSelectedScenarioId}
            onRoundsChange={setTotalRounds}
            onNext={() => setPhase('persona')}
          />
        )}

        {phase === 'persona' && (
          <PersonaScreen
            answers={personaAnswers}
            customFear={customFear}
            personaText={personaText}
            onAnswer={updatePersona}
            onCustomFear={setCustomFear}
            onSkip={() => {
              setPersonaSkipped(true);
              setPhase('briefing');
            }}
            onNext={() => setPhase('briefing')}
            onBack={() => setPhase('scenario')}
          />
        )}

        {phase === 'briefing' && (
          <BriefingScreen scene={scene} totalRounds={totalRounds} onBack={() => setPhase('persona')} onStart={startGame} />
        )}

        {phase === 'play' && (
          <PlayScreen
            scene={scene}
            stats={stats}
            messages={messages}
            cards={cards}
            selectedCardId={selectedCardId}
            currentRound={currentRound}
            totalRounds={totalRounds}
            pending={pending}
            status={status}
            onSelectCard={setSelectedCardId}
            onConfirm={confirmCard}
          />
        )}

        {phase === 'ending' && ending && (
          <EndingScreen
            scene={scene}
            ending={ending}
            stats={stats}
            totalRounds={totalRounds}
            onRestart={restartCurrentScene}
            onScenario={resetToScenario}
          />
        )}
      </main>
    </div>
  );
}

function ScenarioScreen({
  selectedCategory,
  selectedCategoryId,
  selectedScenarioId,
  totalRounds,
  onCategoryChange,
  onScenarioChange,
  onRoundsChange,
  onNext,
}) {
  const selectedPlayable = Boolean(scenes[selectedScenarioId]);

  return (
    <section className="screen-grid scenario-screen">
      <div className="screen-heading">
        <span className="screen-kicker">01 / 场景选择</span>
        <h2>选一个高压对话副本</h2>
        <p>逐层选择场景、事件和轮次，MVP副本可直接进入。</p>
      </div>

      <div className="category-tabs" role="tablist" aria-label="场景大类">
        {categories.map((category) => (
          <button
            className={`category-tab ${category.id === selectedCategoryId ? 'active' : ''}`}
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            type="button"
          >
            <strong>{category.name}</strong>
            <span>{category.keywords}</span>
          </button>
        ))}
      </div>

      <div className="event-grid">
        {selectedCategory.events.map((event) => {
          const isSelected = event.id === selectedScenarioId;
          return (
            <button
              className={`event-card ${isSelected ? 'selected' : ''} ${event.playable ? '' : 'locked'}`}
              disabled={!event.playable}
              key={event.id}
              onClick={() => onScenarioChange(event.id)}
              type="button"
            >
              <span className="event-tag">{event.tag}</span>
              <strong>{event.name}</strong>
              <p>{event.oneLiner}</p>
            </button>
          );
        })}
      </div>

      <div className="bottom-bar">
        <div>
          <span className="meta-label">轮次</span>
          <div className="round-switcher">
            {[8, 10].map((round) => (
              <button
                className={round === totalRounds ? 'active' : ''}
                key={round}
                onClick={() => onRoundsChange(round)}
                type="button"
              >
                {round}轮
              </button>
            ))}
            <button className="locked" disabled type="button">
              15轮
            </button>
          </div>
        </div>
        <button className="primary-action" disabled={!selectedPlayable} onClick={onNext} type="button">
          配置人设
        </button>
      </div>
    </section>
  );
}

function PersonaScreen({ answers, customFear, personaText, onAnswer, onCustomFear, onSkip, onNext, onBack }) {
  return (
    <section className="screen-grid persona-screen">
      <div className="screen-heading">
        <span className="screen-kicker">02 / 人设配置</span>
        <h2>三题蒸馏你的开口习惯</h2>
        <p>人设会影响卡牌话术的语气，但不改变胜负规则。</p>
      </div>

      <div className="qa-panel">
        {personaQuestions.map((question) => (
          <div className="question-row" key={question.id}>
            <h3>{question.label}</h3>
            <div className="option-grid">
              {question.options.map((option) => (
                <button
                  className={answers[question.id] === option.id ? 'active' : ''}
                  key={option.id}
                  onClick={() => onAnswer(question.id, option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {question.id === 'fear' && answers.fear === 'custom' && (
              <input
                aria-label="自定义压力话术"
                className="custom-input"
                onChange={(event) => onCustomFear(event.target.value)}
                placeholder="例如：你要懂得感恩"
                value={customFear}
              />
            )}
          </div>
        ))}
      </div>

      <div className="persona-preview">
        <span className="meta-label">注入人设</span>
        <p>{personaText}</p>
      </div>

      <div className="bottom-bar">
        <button className="ghost-action" onClick={onBack} type="button">
          返回
        </button>
        <div className="action-cluster">
          <button className="ghost-action" onClick={onSkip} type="button">
            跳过
          </button>
          <button className="primary-action" onClick={onNext} type="button">
            查看Briefing
          </button>
        </div>
      </div>
    </section>
  );
}

function BriefingScreen({ scene, totalRounds, onBack, onStart }) {
  return (
    <section className="screen-grid briefing-screen">
      <div className="briefing-card">
        <div className="briefing-head">
          <div>
            <span className="screen-kicker">03 / Briefing</span>
            <h2>{scene.title}</h2>
          </div>
          <span className="mode-pill">{scene.badge}</span>
        </div>

        <div className="briefing-layout">
          <div className="briefing-copy">
            <p>{scene.context}</p>
            <div className="briefing-quote">
              <span>{scene.location}</span>
              <strong>{scene.roleLine}</strong>
            </div>
          </div>

          <div className="briefing-facts">
            <InfoRow label="目标" value={scene.target} />
            <InfoRow label="对手" value={`${scene.opponent} / ${scene.personality}`} />
            <InfoRow label="轮次" value={`${totalRounds}轮对话机会`} />
            <InfoRow label="风险" value={scene.opponentProfile} />
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <button className="ghost-action" onClick={onBack} type="button">
          返回
        </button>
        <button className="primary-action" onClick={onStart} type="button">
          进入副本
        </button>
      </div>
    </section>
  );
}

function PlayScreen({
  scene,
  stats,
  messages,
  cards,
  selectedCardId,
  currentRound,
  totalRounds,
  pending,
  status,
  onSelectCard,
  onConfirm,
}) {
  const activeFeedback = getActiveFeedbackState(scene, currentRound, totalRounds);
  const latestNpcMessage = [...messages].reverse().find((message) => message.role !== 'user');
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const currentNpcDialogue = latestNpcMessage?.dialogue || scene.opening?.[0]?.dialogue || '';
  const ttsUrl = ttsManifest[currentNpcDialogue] || null;
  const ttsAudioRef = useRef(null);
  const playTts = () => {
    const a = ttsAudioRef.current;
    if (!ttsUrl || !a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };
  useEffect(() => {
    playTts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsUrl]);
  const isImmersiveInterview = scene.id === 'office_cafe_interview';

  if (isImmersiveInterview) {
    return (
      <section
        className="play-screen immersive-play-screen"
        style={{ '--scene-bg': `url(${officeCafeLeaderImage})` }}
      >
        <div className="scene-vignette" aria-hidden="true" />
        <img className="player-shoulder" src={playerShoulderImage} alt="" aria-hidden="true" />
        <audio ref={ttsAudioRef} src={ttsUrl || undefined} preload="auto" />
        <header className="immersive-hud">
          <div>
            <span className="screen-kicker">04 / 对话环节</span>
            <h2>{scene.opponent}</h2>
          </div>
          <div className="round-meter glass-meter">
            <span>第{currentRound}轮</span>
            <strong>/ {totalRounds}</strong>
          </div>
        </header>

        <div className="character-status">
          <span>{activeFeedback?.state.stage || scene.personality}</span>
          <strong>{activeFeedback?.state.attitude || scene.opponentProfile}</strong>
        </div>

        <div className="dialogue-stage" aria-live="polite">
          <div className="speaker-plate">
            <span>{latestNpcMessage?.name || scene.opponent}</span>
            {activeFeedback && <b>{activeFeedback.state.expression}</b>}
            {ttsUrl && (
              <button className="tts-replay" onClick={playTts} type="button" aria-label="重播台词" title="重播台词">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </button>
            )}
          </div>
          <p>{latestNpcMessage?.dialogue || scene.opening[0]?.dialogue}</p>
          {latestUserMessage && (
            <div className="player-recap">
              <span>你刚才说</span>
              <p>{latestUserMessage.dialogue}</p>
            </div>
          )}
          {pending && (
            <div className="typing-row glass-typing">
              <span />
              <span />
              <span />
              <b>{status}</b>
            </div>
          )}
        </div>

        <div className="immersive-options">
          {cards.length > 0 ? (
            <div className="strategy-grid game-card-grid">
              {cards.map((card) => (
                <StrategyCard
                  card={card}
                  isSelected={selectedCardId === card.id}
                  key={card.id}
                  onConfirm={onConfirm}
                  onSelect={() => onSelectCard(card.id)}
                />
              ))}
            </div>
          ) : (
            <div className="cards-placeholder glass-placeholder">{pending ? '对方正在接招' : '结局生成中'}</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="play-screen">
      <header className="play-header">
        <div>
          <span className="screen-kicker">04 / 对话主界面</span>
          <h2>{scene.title}</h2>
        </div>
        <div className="round-meter">
          <span>第{currentRound}轮</span>
          <strong>/ {totalRounds}</strong>
        </div>
      </header>

      <div className="stats-grid">
        <StatBar label="主动权" value={stats.initiative} deltaLabel="定义谈话方向" tone="teal" />
        <StatBar label="对方耐心" value={stats.patience} deltaLabel="归零即谈崩" tone="amber" />
        <StatBar label="目标达成率" value={stats.goal_progress} deltaLabel="通关核心" tone="coral" />
      </div>

      {activeFeedback && <FeedbackStateStrip activeFeedback={activeFeedback} scene={scene} />}

      <div className="conversation-layout">
        <div className="chat-panel" aria-live="polite">
          <div className="chat-scroll">
            {messages.map((message) => (
              <MessageBubble message={message} key={message.id} />
            ))}
            {pending && (
              <div className="typing-row">
                <span />
                <span />
                <span />
                <b>{status}</b>
              </div>
            )}
          </div>
        </div>

        {activeFeedback ? (
          <LeaderFeedbackPanel activeFeedback={activeFeedback} scene={scene} stats={stats} />
        ) : (
          <aside className="tension-panel">
            <span className="meta-label">对手状态</span>
            <strong>{scene.opponent}</strong>
            <p>{scene.opponentProfile}</p>
            <div className="mini-stat">
              <span>耐心阈值</span>
              <b>{stats.patience}</b>
            </div>
          </aside>
        )}
      </div>

      <div className="cards-dock">
        {cards.length > 0 ? (
          <div className="strategy-grid">
            {cards.map((card) => (
              <StrategyCard
                card={card}
                isSelected={selectedCardId === card.id}
                key={card.id}
                onConfirm={onConfirm}
                onSelect={() => onSelectCard(card.id)}
              />
            ))}
          </div>
        ) : (
          <div className="cards-placeholder">{pending ? '对方正在接招' : '结局生成中'}</div>
        )}
      </div>
    </section>
  );
}

function FeedbackStateStrip({ activeFeedback, scene }) {
  const { index } = activeFeedback;

  return (
    <div className="feedback-state-strip" aria-label={`${scene.opponent}的10个表情反馈状态`}>
      <div className="state-strip-head">
        <span className="meta-label">表情进度</span>
        <strong>{scene.opponent}</strong>
      </div>
      <div className="state-strip-grid">
        {scene.feedbackStates.map((item, itemIndex) => (
          <div
            aria-current={itemIndex === index ? 'step' : undefined}
            className={`state-strip-card ${itemIndex === index ? 'active' : ''}`}
            key={item.id}
          >
            <span>{String(itemIndex + 1).padStart(2, '0')}</span>
            <b>{item.stage}</b>
            <small>{item.expression}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndingScreen({ scene, ending, stats, totalRounds, onRestart, onScenario }) {
  return (
    <section className="screen-grid ending-screen">
      <div className="ending-hero">
        <div className={`grade-badge grade-${ending.grade}`}>{ending.grade}</div>
        <div>
          <span className="screen-kicker">05 / 结局评分</span>
          <h2>{ending.title}</h2>
          <p>{ending.one_liner}</p>
        </div>
      </div>

      <div className="ending-layout">
        <div className="score-panel">
          <div className="final-stats">
            <StatPill label="主动权" value={stats.initiative} />
            <StatPill label="耐心" value={stats.patience} />
            <StatPill label="目标" value={stats.goal_progress} />
            <StatPill label="轮次" value={totalRounds} />
          </div>
          <RadarChart values={ending.radar} />
        </div>

        <div className="report-panel">
          <InfoRow label="最佳一句" value={`第${ending.best_line.round}轮：${ending.best_line.text}`} />
          <InfoRow label="危险一句" value={`第${ending.worst_line.round}轮：${ending.worst_line.text}`} />
          <InfoRow label="现实行动" value={ending.real_advice} />
          <InfoRow label="副本" value={`${scene.title} / ${scene.mode}`} />
        </div>
      </div>

      <div className="bottom-bar">
        <button className="ghost-action" onClick={onScenario} type="button">
          换场景
        </button>
        <button className="primary-action" onClick={onRestart} type="button">
          再来一局
        </button>
      </div>
    </section>
  );
}

function HistoryRail({ messages, scene }) {
  return (
    <div className="history-rail">
      <div className="history-handle">
        <span>历史</span>
      </div>
      <div className="history-head">
        <span className="meta-label">对话历史</span>
        <strong>{scene.title}</strong>
      </div>
      <div className="history-list">
        {messages.map((message) => (
          <article className={`history-item ${message.role === 'user' ? 'user' : ''}`} key={`history-${message.id}`}>
            <span>{message.role === 'user' ? '你' : message.name}</span>
            <p>{message.dialogue}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function StatBar({ label, value, deltaLabel, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${value}%` }} />
      </div>
      <small>{deltaLabel}</small>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <article className={`message-row ${isUser ? 'user' : ''}`}>
      {!isUser && <div className={`avatar ${message.role}`}>{message.name.slice(0, 1)}</div>}
      <div className="bubble">
        <div className="bubble-meta">
          <strong>{message.name}</strong>
          {message.round > 0 && <span>第{message.round}轮</span>}
        </div>
        <p>{message.dialogue}</p>
      </div>
      {isUser && <div className="avatar user-avatar">你</div>}
    </article>
  );
}

function LeaderFeedbackPanel({ activeFeedback, scene, stats }) {
  const { state, index, total } = activeFeedback;

  return (
    <aside className="tension-panel leader-feedback-panel">
      <div className="feedback-head">
        <span className="meta-label">领导反馈</span>
        <span className="state-counter">
          {index + 1}/{total}
        </span>
      </div>

      <div className="feedback-visual-row">
        <LeaderPortrait state={state} />
        <div className="feedback-copy">
          <strong>{state.stage}</strong>
          <p>{state.signal}</p>
          <div className="feedback-tags" aria-label="当前表情态度手势">
            <span>{state.expression}</span>
            <span>{state.attitude}</span>
            <span>{state.gesture}</span>
          </div>
        </div>
      </div>

      <div className="feedback-guidance">
        <span>用户反馈</span>
        <p>{state.feedback}</p>
        <small>避开：{state.avoid}</small>
      </div>

      <div className="feedback-rows">
        <FeedbackRow label="表情" value={state.expression} />
        <FeedbackRow label="态度" value={state.attitude} />
        <FeedbackRow label="手势" value={state.gesture} />
      </div>

      <div className="mini-stat">
        <span>耐心阈值</span>
        <b>{stats.patience}</b>
      </div>

      <div className="state-mini-list" aria-label={`${scene.opponent}的10种表情态度手势组合`}>
        {scene.feedbackStates.map((item, itemIndex) => (
          <div className={`state-mini-item ${itemIndex === index ? 'active' : ''}`} key={item.id}>
            <span>{String(itemIndex + 1).padStart(2, '0')}</span>
            <div>
              <b>{item.stage}</b>
              <small>
                {item.expression} / {item.gesture}
              </small>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function FeedbackRow({ label, value }) {
  return (
    <div className="feedback-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function LeaderPortrait({ state }) {
  return (
    <div
      aria-label={`男性领导正面示意：${state.expression}，${state.attitude}，${state.gesture}`}
      className={`leader-portrait face-${state.face} gesture-${state.gestureClass}`}
      role="img"
    >
      <div className="cafe-window" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="leader-figure" aria-hidden="true">
        <div className="leader-head">
          <span className="leader-hair" />
          <span className="leader-ear left" />
          <span className="leader-ear right" />
          <span className="leader-brow left" />
          <span className="leader-brow right" />
          <span className="leader-eye left" />
          <span className="leader-eye right" />
          <span className="leader-nose" />
          <span className="leader-mouth" />
        </div>
        <div className="leader-neck" />
        <div className="leader-body">
          <span className="leader-lapel left" />
          <span className="leader-lapel right" />
          <span className="leader-arm left" />
          <span className="leader-arm right" />
          <span className="leader-hand left" />
          <span className="leader-hand right" />
          <span className="leader-cup" />
          <span className="leader-notebook" />
        </div>
      </div>
      <div className="cafe-table" aria-hidden="true" />
    </div>
  );
}

function StrategyCard({ card, isSelected, onSelect, onConfirm }) {
  return (
    <article className={`strategy-card ${card.accent} ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="card-head">
        <span className="card-code">{card.code}</span>
        <div>
          <strong>{card.label}</strong>
          <small>{card.tone}</small>
        </div>
      </div>
      <p>{card.summary}</p>
      {card.target && <span className="target-chip">{card.target}</span>}
      {isSelected && (
        <div className="card-expanded">
          <p>{card.full_text}</p>
          <button
            className="primary-action compact"
            onClick={(event) => {
              event.stopPropagation();
              onConfirm();
            }}
            type="button"
          >
            确认出牌
          </button>
        </div>
      )}
    </article>
  );
}

function RadarChart({ values }) {
  const center = 120;
  const radius = 76;
  const points = radarLabels.map((label, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / radarLabels.length;
    const valueRadius = (radius * values[label.key]) / 100;
    return {
      x: center + Math.cos(angle) * valueRadius,
      y: center + Math.sin(angle) * valueRadius,
      labelX: center + Math.cos(angle) * (radius + 28),
      labelY: center + Math.sin(angle) * (radius + 28),
      label: label.label,
      value: values[label.key],
    };
  });

  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="radar-wrap">
      <svg aria-label="五维能力雷达图" viewBox="0 0 240 240" role="img">
        {[0.25, 0.5, 0.75, 1].map((scale) => {
          const gridPoints = radarLabels
            .map((_, index) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / radarLabels.length;
              return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
            })
            .join(' ');
          return <polygon className="radar-grid" points={gridPoints} key={scale} />;
        })}
        {radarLabels.map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / radarLabels.length;
          return (
            <line
              className="radar-axis"
              key={index}
              x1={center}
              x2={center + Math.cos(angle) * radius}
              y1={center}
              y2={center + Math.sin(angle) * radius}
            />
          );
        })}
        <polygon className="radar-area" points={polygon} />
        {points.map((point) => (
          <g key={point.label}>
            <circle className="radar-dot" cx={point.x} cy={point.y} r="3.5" />
            <text className="radar-label" x={point.labelX} y={point.labelY}>
              {point.label}
            </text>
            <text className="radar-value" x={point.labelX} y={point.labelY + 13}>
              {point.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default App;
