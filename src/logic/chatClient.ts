import type { EventPhase, GeneratedEvent, Scene, TaskRuntime, TaskSegment, TimeSlot } from '../data/types';
import type { GameEffect, PlayerAcademics, PlayerAttributes } from '../player/types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequestPayload {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | Array<{ type: string; text?: string }>;
    };
  }>;
}

export interface BuildChatRequestInput {
  model: string;
  systemPrompt: string;
  characterProfile: string;
  memorySummary: string;
  memoryFacts: string[];
  locationLabel: string;
  eventTitle: string;
  castName: string;
  transcript: string[];
  playerInput: string;
  eventPhase?: EventPhase;
  phaseGoal?: string;
  overlimitTrigger?: string;
  suspenseThreads?: string[];
  intent?: 'continue' | 'end_event';
  playerStatePrompt?: string;
}

export interface BuildEventPlanRequestInput {
  model: string;
  systemPrompt: string;
  scene: Scene;
  locationLabel: string;
  timeLabel: string;
  timeSlot: TimeSlot;
  memorySummary: string;
  memoryFacts: string[];
  playerStatePrompt?: string;
}

export interface ParsePlannedSceneEventInput {
  scene: Scene;
  locationLabel: string;
  timeLabel: string;
  timeSlot: TimeSlot;
  responseText: string;
  worldRevision?: number;
}

export interface BuildFallbackSceneEventInput {
  scene: Scene;
  locationLabel: string;
  timeLabel: string;
  timeSlot: TimeSlot;
  memorySummary: string;
  memoryFacts: string[];
  worldRevision?: number;
}

export interface ChatRuntimeConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface EventTimeSettlement {
  minutesElapsed: number;
  summary: string;
  effects: GameEffect[];
}

export interface BuildEventTimeSettlementRequestInput {
  model: string;
  systemPrompt: string;
  startTimeLabel: string;
  locationLabel: string;
  eventTitle: string;
  transcript: string[];
  eventFacts: string[];
  playerStatePrompt?: string;
}

export interface BuildEventImagePromptRequestInput {
  model: string;
  systemPrompt: string;
  locationLabel: string;
  eventTitle: string;
  castName: string;
  eventPhase: EventPhase;
  sceneDescription: string;
  openingState: string;
  eventFacts: string[];
  memorySummary: string;
  memoryFacts: string[];
  transcript: string[];
}

export interface BuildFallbackTimeSettlementInput {
  transcript: string[];
  eventFacts: string[];
}

export interface TaskSettlement {
  summary: string;
  facts: string[];
  effects: GameEffect[];
}

export interface BuildTaskResultRequestInput {
  model: string;
  systemPrompt: string;
  task: TaskRuntime;
  timeLabel: string;
  memorySummary: string;
  memoryFacts: string[];
  locationLabel: string;
  playerStatePrompt?: string;
}

export interface BuildTaskSegmentRequestInput {
  model: string;
  systemPrompt: string;
  task: TaskRuntime;
  fromLabel: string;
  toLabel: string;
  memorySummary: string;
  memoryFacts: string[];
  locationLabel: string;
  playerStatePrompt?: string;
}

export interface BuildTaskManualRequestInput {
  model: string;
  systemPrompt: string;
  task: TaskRuntime;
  playerInput: string;
  memorySummary: string;
  memoryFacts: string[];
  locationLabel: string;
  playerStatePrompt?: string;
}

export interface BuildTaskFinalSummaryRequestInput {
  model: string;
  systemPrompt: string;
  task: TaskRuntime;
  memorySummary: string;
  memoryFacts: string[];
  locationLabel: string;
  playerStatePrompt?: string;
}

export interface BuildTaskImagePromptRequestInput {
  model: string;
  systemPrompt: string;
  task: TaskRuntime;
  locationLabel: string;
  memorySummary: string;
  memoryFacts: string[];
  playerStatePrompt?: string;
}

const formatTaskDurationForPrompt = (minutes: number): string => {
  const rounded = Math.max(1, Math.round(minutes));
  const dayMinutes = 24 * 60;
  const yearMinutes = 365 * dayMinutes;

  if (rounded >= yearMinutes && rounded % yearMinutes === 0) {
    return `${rounded / yearMinutes} 年`;
  }

  if (rounded >= dayMinutes && rounded % dayMinutes === 0) {
    return `${rounded / dayMinutes} 天`;
  }

  if (rounded >= 60 && rounded % 60 === 0) {
    return `${rounded / 60} 小时`;
  }

  return `${rounded} 分钟`;
};

const sanitizeFact = (value: string): string => value.replace(/\s+/g, ' ').trim();

const extractJsonObject = (text: string): string | null => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
};

const clampMinutes = (minutes: number): number => Math.max(10, Math.min(180, Math.round(minutes)));

const isTaskAttentionLevel = (value: string): value is TaskSegment['attentionLevel'] =>
  value === 'low' || value === 'medium' || value === 'high';

const withPlayerStatePrompt = (playerStatePrompt?: string): string[] =>
  playerStatePrompt?.trim()
    ? [
        '',
        playerStatePrompt.trim(),
        '注意：如果历史上下文、长期记忆或旧结算内容与当前权威角色数据冲突，请以当前权威角色数据为准。'
      ]
    : [];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const PLAYER_ATTRIBUTE_KEYS: Array<keyof PlayerAttributes> = ['intelligence', 'stamina', 'agility', 'insight', 'hp'];
const PLAYER_ACADEMIC_KEYS: Array<keyof PlayerAcademics> = ['math', 'literature', 'english', 'physics'];
const EFFECT_TYPE_ALIASES: Record<string, GameEffect['type']> = {
  stat_delta: 'stat_delta',
  statDelta: 'stat_delta',
  属性数值变化: 'stat_delta',
  attribute_delta: 'attribute_delta',
  attributeDelta: 'attribute_delta',
  属性变化: 'attribute_delta',
  属性增减: 'attribute_delta',
  academic_delta: 'academic_delta',
  academicDelta: 'academic_delta',
  学科变化: 'academic_delta',
  学科增减: 'academic_delta',
  money_delta: 'money_delta',
  moneyDelta: 'money_delta',
  金钱变化: 'money_delta',
  资产变化: 'money_delta',
  item_add: 'item_add',
  itemAdd: 'item_add',
  add_item: 'item_add',
  获得物品: 'item_add',
  添加物品: 'item_add',
  item_remove: 'item_remove',
  itemRemove: 'item_remove',
  remove_item: 'item_remove',
  移除物品: 'item_remove',
  item_update: 'item_update',
  itemUpdate: 'item_update',
  update_item: 'item_update',
  更新物品: 'item_update'
};
const ATTRIBUTE_KEY_ALIASES: Record<string, keyof PlayerAttributes> = {
  intelligence: 'intelligence',
  智力: 'intelligence',
  stamina: 'stamina',
  体力: 'stamina',
  agility: 'agility',
  敏捷: 'agility',
  insight: 'insight',
  悟性: 'insight',
  hp: 'hp',
  HP: 'hp',
  生命: 'hp',
  健康: 'hp'
};
const ACADEMIC_KEY_ALIASES: Record<string, keyof PlayerAcademics> = {
  math: 'math',
  数学: 'math',
  literature: 'literature',
  语文: 'literature',
  english: 'english',
  英语: 'english',
  physics: 'physics',
  物理: 'physics'
};

const isPlayerAttributeKey = (value: string): value is keyof PlayerAttributes =>
  PLAYER_ATTRIBUTE_KEYS.includes(value as keyof PlayerAttributes);

const isPlayerAcademicKey = (value: string): value is keyof PlayerAcademics =>
  PLAYER_ACADEMIC_KEYS.includes(value as keyof PlayerAcademics);

const normalizeEffectType = (value: unknown): GameEffect['type'] | null =>
  typeof value === 'string' ? (EFFECT_TYPE_ALIASES[value.trim()] ?? null) : null;

const readTextId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeAttributeKey = (value: unknown): keyof PlayerAttributes | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = ATTRIBUTE_KEY_ALIASES[value.trim()];

  return normalized && isPlayerAttributeKey(normalized) ? normalized : null;
};

const normalizeAcademicKey = (value: unknown): keyof PlayerAcademics | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = ACADEMIC_KEY_ALIASES[value.trim()];

  return normalized && isPlayerAcademicKey(normalized) ? normalized : null;
};

const readNumericDelta = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeItemEffects = (value: unknown): Array<{ type: string; value?: string | number | boolean; scope?: string }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((itemEffect) => ({
      type: typeof itemEffect.type === 'string' ? itemEffect.type : 'unknown',
      value:
        typeof itemEffect.value === 'string' || typeof itemEffect.value === 'number' || typeof itemEffect.value === 'boolean'
          ? itemEffect.value
          : undefined,
      scope: typeof itemEffect.scope === 'string' ? itemEffect.scope : undefined
    }))
    .filter((effect) => effect.type.trim());
};

const cleanInferredItemName = (value: string): string =>
  value
    .replace(/[，。,.；;！!？?].*$/g, '')
    .replace(/^(一把|一个|一件|一瓶|一副|一些|新的|合适的|适合且价格合理的)/, '')
    .trim();

const inferPurchaseEffectsFromText = (text: string): GameEffect[] => {
  const purchaseMatch =
    /(?:买到|买了|购买了|购买到|获得了|拿到了|带着新|带着|找到了|找到)(?:一把|一个|一件|一瓶|一副|合适的|适合且价格合理的)?([^，。,.；;！!？?\n]{1,18}?)(?:并|离开|$|[，。,.；;！!？?\n])/.exec(
      text
    );

  if (!purchaseMatch) {
    return [];
  }

  const itemName = cleanInferredItemName(purchaseMatch[1] ?? '');

  if (!itemName) {
    return [];
  }

  const effects: GameEffect[] = [
    {
      type: 'item_add',
      item: {
        name: itemName,
        description: `任务结算中获得的物品：${itemName}。`,
        abilityText: `普通物品：${itemName}。可以在后续剧情中作为玩家拥有的物品被引用。`,
        effects: [{ type: 'owned_item', scope: 'inventory' }]
      },
      quantity: 1,
      reason: '模型结算文本提到玩家获得了该物品，但没有返回结构化 effects，系统自动补全。'
    }
  ];
  const priceMatch = /(?:花了|花费|支付|价格|售价|付了)\s*(\d+)\s*(?:元|块|人民币)/.exec(text);

  if (priceMatch) {
    effects.push({
      type: 'money_delta',
      delta: -Number(priceMatch[1]),
      reason: '模型结算文本提到购买价格，系统自动补全金钱变化。'
    });
  }

  return effects;
};

const inferSettlementEffects = (summary: string, facts: string[]): GameEffect[] =>
  inferPurchaseEffectsFromText([summary, ...facts].join('\n'));

const parseGameEffects = (value: unknown): GameEffect[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).flatMap((effect): GameEffect[] => {
    const effectType = normalizeEffectType(effect.type);

    if (
      effectType === 'stat_delta' &&
      readTextId(effect.groupId) &&
      readTextId(effect.statId) &&
      readNumericDelta(effect.delta) !== null
    ) {
      return [
        {
          type: 'stat_delta',
          groupId: readTextId(effect.groupId)!,
          groupLabel: typeof effect.groupLabel === 'string' ? effect.groupLabel : undefined,
          statId: readTextId(effect.statId)!,
          label: typeof effect.label === 'string' ? effect.label : undefined,
          delta: readNumericDelta(effect.delta)!,
          reason: typeof effect.reason === 'string' ? effect.reason : undefined
        }
      ];
    }

    if (
      effectType === 'attribute_delta' &&
      normalizeAttributeKey(effect.target) &&
      readNumericDelta(effect.delta) !== null
    ) {
      return [
        {
          type: 'attribute_delta',
          target: normalizeAttributeKey(effect.target)!,
          delta: readNumericDelta(effect.delta)!,
          reason: typeof effect.reason === 'string' ? effect.reason : undefined
        }
      ];
    }

    if (
      effectType === 'academic_delta' &&
      normalizeAcademicKey(effect.subject) &&
      readNumericDelta(effect.delta) !== null
    ) {
      return [
        {
          type: 'academic_delta',
          subject: normalizeAcademicKey(effect.subject)!,
          delta: readNumericDelta(effect.delta)!,
          reason: typeof effect.reason === 'string' ? effect.reason : undefined
        }
      ];
    }

    if (effectType === 'money_delta' && readNumericDelta(effect.delta) !== null) {
      return [
        {
          type: 'money_delta',
          delta: readNumericDelta(effect.delta)!,
          reason: typeof effect.reason === 'string' ? effect.reason : undefined
        }
      ];
    }

    if (effectType === 'item_add' && isRecord(effect.item)) {
      const item = effect.item;

      return [
        {
          type: 'item_add',
          item: {
            id: typeof item.id === 'string' ? item.id : undefined,
            name: typeof item.name === 'string' ? item.name : '未命名物品',
            description: typeof item.description === 'string' ? item.description : '暂无描述。',
            abilityText:
              typeof item.abilityText === 'string'
                ? item.abilityText
                : typeof item.ability === 'string'
                  ? item.ability
                  : '暂无特殊能力说明。',
            effects: normalizeItemEffects(item.effects),
            quantity: typeof item.quantity === 'number' ? item.quantity : undefined
          },
          quantity: typeof effect.quantity === 'number' ? effect.quantity : undefined,
          reason: typeof effect.reason === 'string' ? effect.reason : undefined
        }
      ];
    }

    if (effectType === 'item_remove') {
      return [
        {
          type: 'item_remove',
          itemId: typeof effect.itemId === 'string' ? effect.itemId : undefined,
          name: typeof effect.name === 'string' ? effect.name : undefined,
          quantity: typeof effect.quantity === 'number' ? effect.quantity : undefined,
          reason: typeof effect.reason === 'string' ? effect.reason : undefined
        }
      ];
    }

    if (effectType === 'item_update' && isRecord(effect.patch)) {
      return [
        {
          type: 'item_update',
          itemId: typeof effect.itemId === 'string' ? effect.itemId : undefined,
          name: typeof effect.name === 'string' ? effect.name : undefined,
          patch: {
            name: typeof effect.patch.name === 'string' ? effect.patch.name : undefined,
            description: typeof effect.patch.description === 'string' ? effect.patch.description : undefined,
            abilityText: typeof effect.patch.abilityText === 'string' ? effect.patch.abilityText : undefined,
            quantity: typeof effect.patch.quantity === 'number' ? effect.patch.quantity : undefined,
            effects: Array.isArray(effect.patch.effects) ? normalizeItemEffects(effect.patch.effects) : undefined
          },
          reason: typeof effect.reason === 'string' ? effect.reason : undefined
        }
      ];
    }

    return [];
  });
};

export const buildChatRequest = ({
  model,
  systemPrompt,
  characterProfile,
  memorySummary,
  memoryFacts,
  locationLabel,
  eventTitle,
  castName,
  transcript,
  playerInput,
  eventPhase = 'opening',
  phaseGoal,
  overlimitTrigger,
  suspenseThreads = [],
  intent = 'continue',
  playerStatePrompt
}: BuildChatRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '输出必须遵守以下规则：',
        '1. 使用“旁白：...”和“角色名：...”这种格式组织内容。',
        '2. 每次回复控制在当前场景的小推进内，结尾要停在等待玩家回应的位置。',
        '3. 不要代替玩家说话、行动或做决定。',
        '4. 不要跳出当前地点，不要突然切换到别的场景。',
        '5. 保持现代恋爱文字冒险的细腻语气。',
        '6. 当前事件是一个有结构的现场剧情，你要沿着当前阶段推进，而不是随意散开。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `地点：${locationLabel}`,
        `事件：${eventTitle}`,
        `角色：${castName}`,
        `事件阶段：${eventPhase}`,
        `当前阶段目标：${phaseGoal ?? '沿着当前气氛自然推进这一幕'}`,
        `超限触发：${overlimitTrigger ?? '暂无，继续推进当前气氛即可'}`,
        `悬念线程：${suspenseThreads.length ? suspenseThreads.join('；') : '暂无'}`,
        `角色设定：\n${characterProfile}`,
        `局势摘要：${memorySummary}`,
        `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
        ...withPlayerStatePrompt(playerStatePrompt),
        `最近对话：${transcript.length ? transcript.join('\n') : '暂无'}`,
        `玩家本轮输入：${playerInput}`,
        intent === 'end_event'
          ? '玩家准备结束当前事件，请你基于当前语境自然收尾这一幕。请用一小段旁白和角色对白完成收束；如果收尾完成，请在最后附加隐藏标记 [EVENT_END]。'
          : '请继续输出一小段剧情，至少包含一行“旁白：”和一行角色对白，并在最后等待玩家继续输入。',
        '特别注意：严格遵守角色设定，不得擅自改变角色性别、身份、自称、关系定位。'
      ].join('\n')
    }
  ]
});

export const buildEventPlanRequest = ({
  model,
  systemPrompt,
  scene,
  locationLabel,
  timeLabel,
  timeSlot,
  memorySummary,
  memoryFacts,
  playerStatePrompt
}: BuildEventPlanRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你负责为当前场景规划一个半分段事件。',
        '请输出 JSON 对象，不要添加代码块。',
        '必须包含字段：title, cast, premise, openingState, buildUpGoal, overlimitTrigger, resolutionDirection, suspenseThreads。',
        '这个事件不是整局主线，只是当前场景的一次剧情实例。',
        '剧情必须包含“开场状态 -> 中段推进 -> 超限触发 -> 收束方向”的骨架。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `地点：${locationLabel}`,
        `时间：${timeLabel}`,
        `时间段：${timeSlot}`,
        `场景描述：${scene.description}`,
        `场景基础标题：${scene.eventSeed.baseTitle}`,
        `可出场角色：${scene.eventSeed.castIds.length ? scene.eventSeed.castIds.join('、') : '无固定角色'}`,
        `氛围关键词：${scene.eventSeed.tones.join('、')}`,
        `中段推进方向：${scene.eventSeed.buildUpGoals.join('；')}`,
        `超限触发候选：${scene.eventSeed.triggerHints.join('；')}`,
        `收束方向候选：${scene.eventSeed.resolutionDirections.join('；')}`,
        `悬念种子：${scene.eventSeed.suspenseSeeds.join('；')}`,
        `当前记忆摘要：${memorySummary}`,
        `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
        ...withPlayerStatePrompt(playerStatePrompt),
        '请基于以上上下文生成一个当前场景可用的事件骨架。超限触发必须明确，且不要把结局写死成成功或失败。'
      ].join('\n')
    }
  ]
});

export const buildEventTimeSettlementRequest = ({
  model,
  systemPrompt,
  startTimeLabel,
  locationLabel,
  eventTitle,
  transcript,
  eventFacts,
  playerStatePrompt
}: BuildEventTimeSettlementRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你负责为已结束的事件做时间结算。',
        '请输出 JSON 对象，不要添加代码块。',
        '必须包含字段：minutesElapsed, summary, effects。',
        'minutesElapsed 代表这次事件在世界里实际消耗的分钟数。',
        'effects 是这次经历对玩家数值和背包的影响数组；没有影响时返回空数组。',
        'effects 支持：stat_delta, money_delta, item_add, item_remove, item_update。数值属性变化优先使用 stat_delta，字段为 groupId, statId, delta，可选 groupLabel, label, reason。',
        '属性 target 只能是 intelligence, stamina, agility, insight, hp；学科 subject 只能是 math, literature, english, physics。',
        '如果事件中购买了物品，effects 必须同时包含 item_add；如果能判断花费，必须包含 money_delta。',
        '如果事件中受伤、疲惫、学习、训练、赚钱、花钱或获得物品，不要只写进 summary/facts，必须写进 effects。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `事件开始时间：${startTimeLabel}`,
        `地点：${locationLabel}`,
        `事件标题：${eventTitle}`,
        `对话记录：${transcript.length ? transcript.join('\n') : '暂无'}`,
        `事件事实：${eventFacts.length ? eventFacts.join('；') : '暂无'}`,
        ...withPlayerStatePrompt(playerStatePrompt),
        '请根据事件规模、对话长度、冲突和推进强度，判断这次事件大概耗时多少分钟。',
        '如果只是短暂交流，耗时分钟可以在 10-30；如果剧情很多、经历明显冲突，耗时分钟可以更长。',
        '输出示例：{"minutesElapsed":20,"summary":"你买到了一把剪刀。","effects":[{"type":"stat_delta","groupId":"core","statId":"stamina","label":"体力","delta":-1,"reason":"来回奔走"},{"type":"item_add","item":{"name":"剪刀","description":"一把普通剪刀。","abilityText":"可以剪开纸张、线头或简单包装。","effects":[{"type":"cut_simple_material","scope":"ordinary"}]},"quantity":1},{"type":"money_delta","delta":-12,"reason":"购买剪刀"}]}'
      ].join('\n')
    }
  ]
});

export const buildFallbackSceneEvent = ({
  scene,
  locationLabel,
  timeLabel,
  timeSlot,
  memorySummary,
  memoryFacts,
  worldRevision = 0
}: BuildFallbackSceneEventInput): GeneratedEvent => {
  const cast = scene.eventSeed.castIds.slice(0, 2);
  const premise = scene.eventSeed.premiseTemplates[0] ?? scene.description;
  const buildUpGoal = scene.eventSeed.buildUpGoals[0] ?? '让玩家逐渐察觉场上还有别的隐情。';
  const overlimitTrigger = scene.eventSeed.triggerHints[0] ?? '环境里突然出现一个会打破平静的人。';
  const resolutionDirection = scene.eventSeed.resolutionDirections[0] ?? '把这一幕收在带余波的沉默里。';
  const suspenseThreads = scene.eventSeed.suspenseSeeds.slice(0, 2);

  return {
    id: `${scene.id}-${timeSlot}-${sanitizeFact(scene.eventSeed.baseTitle).replace(/\s+/g, '-').toLowerCase()}`,
    title: scene.eventSeed.baseTitle,
    sceneId: scene.id,
    locationLabel,
    cast,
    premise,
    openingState: `${timeLabel}的${scene.name}里，${premise}`,
    buildUpGoal,
    overlimitTrigger,
    resolutionDirection,
    suspenseThreads,
    currentPhase: 'opening',
    phaseHistory: ['opening'],
    facts: [
      `时间是${timeLabel}`,
      `当前地点是${locationLabel}`,
      `局势摘要：${sanitizeFact(memorySummary)}`,
      ...memoryFacts.slice(0, 2).map((fact) => `延续记忆：${sanitizeFact(fact)}`)
    ],
    status: 'seeded',
    snapshot: {
      timeSlot,
      timeLabel,
      worldRevision,
      memorySummary,
      memoryFacts
    },
    turnCount: 0
  };
};

export const buildEventImagePromptRequest = ({
  model,
  systemPrompt,
  locationLabel,
  eventTitle,
  castName,
  eventPhase,
  sceneDescription,
  openingState,
  eventFacts,
  memorySummary,
  memoryFacts,
  transcript
}: BuildEventImagePromptRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你只输出最终生图提示词，不要解释，不要 JSON，不要 Markdown。',
        '提示词必须描述当前剧情这一刻的可视画面，而不是复述所有上下文。',
        '必须保留地点、主要角色、当前动作/距离/情绪、构图、光影和画风要求。',
        '构图必须是横屏 16:10，适合偏横向的视觉小说图片窗口，避免竖屏全身肖像导致裁切。',
        '画风必须统一为高质量二次元动漫视觉小说 CG 插画风格，禁止写成真实照片、真人摄影、写实摄影、电影剧照、3D 渲染或欧美写实风格。',
        '不要生成文字、UI、水印、logo。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `地点：${locationLabel}`,
        `事件标题：${eventTitle}`,
        `主要角色：${castName || '无固定角色'}`,
        `当前阶段：${eventPhase}`,
        `场景描述：${sceneDescription}`,
        `事件开场：${openingState}`,
        `当前事件事实：${eventFacts.length ? eventFacts.join('；') : '暂无'}`,
        `世界记忆摘要：${memorySummary || '暂无'}`,
        `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
        `最近对话：\n${transcript.length ? transcript.slice(-10).join('\n') : '暂无'}`,
        '',
        '请把以上上下文浓缩成一个适合文生图/图生图的中文提示词。',
        '提示词需要像导演分镜一样明确“此刻画面”，可以补充合理动作和表情，但不要加入上下文没有支撑的新剧情。',
        '提示词里必须明确写出“横屏 16:10 构图，适合视觉小说横向画面窗口”。',
        '提示词里必须明确写出“二次元动漫视觉小说 CG 风格”，并明确不要真实照片或写实摄影。',
        '输出一段完整提示词，长度控制在 300 字以内。'
      ].join('\n')
    }
  ]
});

export const buildTaskResultRequest = ({
  model,
  systemPrompt,
  task,
  timeLabel,
  memorySummary,
  memoryFacts,
  locationLabel,
  playerStatePrompt
}: BuildTaskResultRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你负责结算玩家安排的一段时间任务。',
        '请输出 JSON 对象，不要添加代码块。',
        '必须包含字段：summary, facts, effects。',
        'summary 是给玩家看的几段结果总结；facts 是可以写入世界记忆的短句数组。',
        'effects 是这次任务对玩家数值和背包的影响数组；没有影响时返回空数组。',
        'effects 支持：stat_delta, money_delta, item_add, item_remove, item_update。数值属性变化优先使用 stat_delta，字段为 groupId, statId, delta，可选 groupLabel, label, reason。',
        '属性 target 只能是 intelligence, stamina, agility, insight, hp；学科 subject 只能是 math, literature, english, physics。',
        '如果任务目标是购买、获得或带回某个实体物品，effects 必须包含 item_add；如果能判断花费，必须包含 money_delta。',
        '如果任务导致受伤、疲惫、学习、训练、赚钱、花钱或获得物品，不要只写进 summary/facts，必须写进 effects。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `当前时间：${timeLabel}`,
        `当前位置：${locationLabel}`,
        `任务内容：${task.content}`,
        `任务时间：${task.startMinutes} 分钟刻度到 ${task.endMinutes} 分钟刻度`,
        `任务总时长：${task.durationMinutes} 分钟`,
        `过程拆分次数：${task.segmentCount} 次`,
        `世界记忆摘要：${memorySummary}`,
        `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
        ...withPlayerStatePrompt(playerStatePrompt),
        '请忽略细节过程，直接推演这段时间结束后发生了什么、任务完成得如何、世界状态有什么轻微变化。',
        '可以出现插曲，但插曲必须留在任务内部，不要把它升级为独立事件。',
        '输出示例：{"summary":"你去超市买到了一把剪刀。","facts":["你购买了剪刀"],"effects":[{"type":"stat_delta","groupId":"academics","statId":"math","label":"数学","delta":1,"reason":"路上复盘错题"},{"type":"item_add","item":{"name":"剪刀","description":"一把普通剪刀。","abilityText":"可以剪开纸张、线头或简单包装。","effects":[{"type":"cut_simple_material","scope":"ordinary"}]},"quantity":1},{"type":"money_delta","delta":-12,"reason":"购买剪刀"}]}'
      ].join('\n')
    }
  ]
});

export const buildTaskSegmentRequest = ({
  model,
  systemPrompt,
  task,
  fromLabel,
  toLabel,
  memorySummary,
  memoryFacts,
  locationLabel,
  playerStatePrompt
}: BuildTaskSegmentRequestInput): ChatRequestPayload => {
  const segmentNumber = task.segments.length + 1;
  const segmentDuration = Math.max(1, Math.round(task.durationMinutes / task.segmentCount));
  const totalDurationLabel = formatTaskDurationForPrompt(task.durationMinutes);
  const segmentDurationLabel = formatTaskDurationForPrompt(segmentDuration);

  return {
    model,
    messages: [
      {
        role: 'system',
        content: [
          systemPrompt,
          '你负责按时间片推进玩家正在执行的任务。',
          '请输出 JSON 对象，不要添加代码块。',
          '必须包含字段：content, complication, attentionLevel。',
          'attentionLevel 只能是 low, medium, high。',
          'content 必须描述玩家围绕任务内容持续执行、遇到的实际困难、阶段性进展和当前状态。',
          '如果时间片跨越数小时、数天或数年，要写成阶段性过程汇报，不要写成一场临时事件。',
          '不要引入与任务目标无关的支线、谜题、物品、短信、陌生人委托或新事件。',
          'complication 可以为 null；如果存在，必须是和任务本身直接相关的小阻碍。'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `当前位置：${locationLabel}`,
          `任务内容：${task.content}`,
          `任务总时间：${task.startMinutes} 到 ${task.endMinutes}`,
          `任务总时长：${task.durationMinutes} 分钟（约 ${totalDurationLabel}）`,
          `过程拆分次数：${task.segmentCount} 次`,
          `当前片段：第 ${segmentNumber} / ${task.segmentCount} 次汇报`,
          `当前时间片：${fromLabel} 到 ${toLabel}`,
          `本片段覆盖时长：约 ${segmentDurationLabel}`,
          `已有片段：${task.segments.length ? task.segments.map((segment) => `${segment.fromLabel}-${segment.toLabel}：${segment.content}`).join('\n') : '暂无'}`,
          `手动托管记录：${task.transcript.length ? task.transcript.map((message) => `${message.label}：${message.content}`).join('\n') : '暂无'}`,
          `世界记忆摘要：${memorySummary}`,
          `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
          ...withPlayerStatePrompt(playerStatePrompt),
          '请只生成这一段时间里玩家如何推进该任务。必须让内容和任务目标、当前片段时长、已有进展保持一致。',
          '长期任务要总结习惯、训练/执行节奏、阶段成果、消耗和状态变化；短期任务可以写具体动作。'
        ].join('\n')
      }
    ]
  };
};

export const buildTaskManualRequest = ({
  model,
  systemPrompt,
  task,
  playerInput,
  memorySummary,
  memoryFacts,
  locationLabel,
  playerStatePrompt
}: BuildTaskManualRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你正在托管一个任务内部的手动互动。',
        '输出保持中文，使用“旁白：...”和相关角色名对白。',
        '玩家可以介入当前情节，但你必须维持任务目标、当前时间段和世界背景。',
        '不要把突发情况升级为独立事件，不要跳出任务结束时间。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `当前位置：${locationLabel}`,
        `任务内容：${task.content}`,
        `任务时间：${task.startMinutes} 到 ${task.endMinutes}`,
        `任务总时长：${task.durationMinutes} 分钟`,
        `过程拆分次数：${task.segmentCount} 次`,
        `当前进度分钟刻度：${task.currentMinutes}`,
        `已有片段：${task.segments.length ? task.segments.map((segment) => `${segment.fromLabel}-${segment.toLabel}：${segment.content}`).join('\n') : '暂无'}`,
        `最近托管对话：${task.transcript.length ? task.transcript.map((message) => `${message.label}：${message.content}`).join('\n') : '暂无'}`,
        `世界记忆摘要：${memorySummary}`,
        `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
        ...withPlayerStatePrompt(playerStatePrompt),
        `玩家本轮输入：${playerInput}`,
        '请在任务内部自然回应，并停在等待玩家继续或交还自动托管的位置。'
      ].join('\n')
    }
  ],
  stream: true
});

export const buildTaskFinalSummaryRequest = ({
  model,
  systemPrompt,
  task,
  memorySummary,
  memoryFacts,
  locationLabel,
  playerStatePrompt
}: BuildTaskFinalSummaryRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你负责把一个过程导向任务整理成最终结算。',
        '请输出 JSON 对象，不要添加代码块。',
        '必须包含字段：summary, facts, effects。',
        'effects 是这次任务对玩家数值和背包的影响数组；没有影响时返回空数组。',
        'effects 支持：stat_delta, money_delta, item_add, item_remove, item_update。数值属性变化优先使用 stat_delta，字段为 groupId, statId, delta，可选 groupLabel, label, reason。',
        '如果任务中购买、获得或带回某个实体物品，effects 必须包含 item_add；如果能判断花费，必须包含 money_delta。',
        '如果任务导致受伤、疲惫、学习、训练、赚钱、花钱或获得物品，不要只写进 summary/facts，必须写进 effects。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `当前位置：${locationLabel}`,
        `任务内容：${task.content}`,
        `任务时间：${task.startMinutes} 到 ${task.endMinutes}`,
        `任务总时长：${task.durationMinutes} 分钟`,
        `过程拆分次数：${task.segmentCount} 次`,
        `任务片段：${task.segments.length ? task.segments.map((segment) => `${segment.fromLabel}-${segment.toLabel}：${segment.content}`).join('\n') : '暂无'}`,
        `手动托管记录：${task.transcript.length ? task.transcript.map((message) => `${message.label}：${message.content}`).join('\n') : '暂无'}`,
        `世界记忆摘要：${memorySummary}`,
        `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
        ...withPlayerStatePrompt(playerStatePrompt),
        '请总结这段任务的完成情况、重要插曲和可以留下的记忆事实。'
      ].join('\n')
    }
  ]
});

export const buildTaskImagePromptRequest = ({
  model,
  systemPrompt,
  task,
  locationLabel,
  memorySummary,
  memoryFacts
}: BuildTaskImagePromptRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你负责把当前任务进度改写成一条安全、可执行的图片生成提示词。',
        '只输出最终生图提示词，不要解释，不要 JSON，不要 Markdown。',
        '提示词必须反映当前任务进度、当前时间片、地点氛围和最近发生的可视化动作。',
        '构图必须是横屏 16:10，适合偏横向的视觉小说图片窗口，避免竖屏全身肖像导致裁切。',
        '画风必须统一为高质量二次元动漫视觉小说 CG 插画风格，禁止写成真实照片、真人摄影、写实摄影、电影剧照、3D 渲染或欧美写实风格。',
        '如果原文包含违规、成人、擦边、暴力或不适合生图的内容，请改写成全年龄、公开场所、日常主题体验的画面。',
        '不要输出违法、成人服务、性暗示、暴力伤害、未成年人不当内容；不要要求图片里出现文字、水印、logo 或 UI。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `当前位置：${locationLabel}`,
        `任务内容：${task.content}`,
        `任务时间：${task.startMinutes} 到 ${task.endMinutes}`,
        `任务总时长：${task.durationMinutes} 分钟`,
        `过程拆分次数：${task.segmentCount} 次`,
        `当前进度分钟刻度：${task.currentMinutes}`,
        `任务执行方式：${task.executionMode}`,
        `托管模式：${task.controlMode}`,
        `任务片段：${task.segments.length ? task.segments.map((segment) => `${segment.fromLabel}-${segment.toLabel}：${segment.content}${segment.complication ? `（插曲：${segment.complication}）` : ''}`).join('\n') : '暂无'}`,
        `手动托管记录：${task.transcript.length ? task.transcript.map((message) => `${message.label}：${message.content}`).join('\n') : '暂无'}`,
        `任务事实：${task.facts.length ? task.facts.join('；') : '暂无'}`,
        `世界记忆摘要：${memorySummary || '暂无'}`,
        `关键记忆：${memoryFacts.length ? memoryFacts.join('；') : '暂无'}`,
        '',
        '请先在心里判断当前任务最适合画成哪一个“此刻画面”，再直接输出一条中文生图提示词。',
        '提示词要像导演分镜：包含人物状态、动作、场景、光线、构图、氛围和画风。',
        '提示词里必须明确写出“横屏 16:10 构图，适合视觉小说横向画面窗口”。',
        '提示词里必须明确写出“二次元动漫视觉小说 CG 风格”，并明确不要真实照片或写实摄影。',
        '长度控制在 300 字以内。'
      ].join('\n')
    }
  ]
});

export const buildFallbackTimeSettlement = ({
  transcript,
  eventFacts
}: BuildFallbackTimeSettlementInput): EventTimeSettlement => {
  const transcriptWeight = transcript.length * 8;
  const phaseWeight = eventFacts.filter((fact) => fact.includes('剧情阶段进入')).length * 12;
  const overlimitWeight = eventFacts.some((fact) => fact.includes('overlimit')) ? 20 : 0;
  const baseMinutes = 15;
  const minutesElapsed = clampMinutes(baseMinutes + transcriptWeight + phaseWeight + overlimitWeight);

  return {
    minutesElapsed,
    summary: `这次事件包含 ${transcript.length} 段互动与 ${eventFacts.length} 条事件事实，时间自然推进到了 ${minutesElapsed} 分钟之后。`,
    effects: []
  };
};

export const parsePlannedSceneEvent = ({
  scene,
  locationLabel,
  timeLabel,
  timeSlot,
  responseText,
  worldRevision = 0
}: ParsePlannedSceneEventInput): GeneratedEvent => {
  const jsonText = extractJsonObject(responseText);

  if (!jsonText) {
    throw new Error('事件规划结果里没有可解析的 JSON。');
  }

  const parsed = JSON.parse(jsonText) as Partial<{
    title: string;
    cast: string[];
    premise: string;
    openingState: string;
    buildUpGoal: string;
    overlimitTrigger: string;
    resolutionDirection: string;
    suspenseThreads: string[];
  }>;

  return {
    ...buildFallbackSceneEvent({
      scene,
      locationLabel,
      timeLabel,
      timeSlot,
      memorySummary: '',
      memoryFacts: [],
      worldRevision
    }),
    title: parsed.title?.trim() || scene.eventSeed.baseTitle,
    cast: parsed.cast?.length ? parsed.cast : scene.eventSeed.castIds.slice(0, 2),
    premise: parsed.premise?.trim() || scene.eventSeed.premiseTemplates[0] || scene.description,
    openingState:
      parsed.openingState?.trim() || `${timeLabel}的${scene.name}里，${scene.eventSeed.premiseTemplates[0] || scene.description}`,
    buildUpGoal: parsed.buildUpGoal?.trim() || scene.eventSeed.buildUpGoals[0] || '让这一幕逐渐升温。',
    overlimitTrigger: parsed.overlimitTrigger?.trim() || scene.eventSeed.triggerHints[0] || '平静突然被外部事件打断。',
    resolutionDirection:
      parsed.resolutionDirection?.trim() || scene.eventSeed.resolutionDirections[0] || '把局势收在悬念仍未消散的位置。',
    suspenseThreads:
      parsed.suspenseThreads?.map((thread) => thread.trim()).filter(Boolean) || scene.eventSeed.suspenseSeeds.slice(0, 2)
  };
};

export const parseEventTimeSettlement = (responseText: string): EventTimeSettlement => {
  const jsonText = extractJsonObject(responseText);

  if (!jsonText) {
    throw new Error('时间结算结果里没有可解析的 JSON。');
  }

  const parsed = JSON.parse(jsonText) as Partial<EventTimeSettlement>;
  const summary = parsed.summary?.trim() || '这次事件自然过去了一小段时间。';
  const effects = parseGameEffects((parsed as { effects?: unknown }).effects);

  return {
    minutesElapsed: clampMinutes(parsed.minutesElapsed ?? 20),
    summary,
    effects: effects.length ? effects : inferSettlementEffects(summary, [])
  };
};

export const parseTaskSettlement = (responseText: string): TaskSettlement => {
  const jsonText = extractJsonObject(responseText);

  if (!jsonText) {
    return {
      summary: responseText.trim() || '任务已经完成。',
      facts: [],
      effects: []
    };
  }

  const parsed = JSON.parse(jsonText) as Partial<TaskSettlement>;
  const summary = parsed.summary?.trim() || '任务已经完成。';
  const facts = Array.isArray(parsed.facts) ? parsed.facts.map((fact) => fact.trim()).filter(Boolean) : [];
  const effects = parseGameEffects((parsed as { effects?: unknown }).effects);

  return {
    summary,
    facts,
    effects: effects.length ? effects : inferSettlementEffects(summary, facts)
  };
};

export const parseTaskSegment = ({
  task,
  fromLabel,
  toLabel,
  responseText
}: {
  task: TaskRuntime;
  fromLabel: string;
  toLabel: string;
  responseText: string;
}): TaskSegment => {
  const jsonText = extractJsonObject(responseText);
  const fallbackContent = responseText.trim() || `${fromLabel} 到 ${toLabel}，任务继续向前推进。`;

  if (!jsonText) {
    return {
      id: `${task.id}-segment-${task.segments.length + 1}`,
      fromLabel,
      toLabel,
      content: fallbackContent,
      complication: null,
      attentionLevel: 'low'
    };
  }

  const parsed = JSON.parse(jsonText) as Partial<{
    content: string;
    summary: string;
    complication: string | null;
    attentionLevel: string;
  }>;
  const attentionLevel = parsed.attentionLevel && isTaskAttentionLevel(parsed.attentionLevel) ? parsed.attentionLevel : 'low';

  return {
    id: `${task.id}-segment-${task.segments.length + 1}`,
    fromLabel,
    toLabel,
    content: parsed.content?.trim() || parsed.summary?.trim() || fallbackContent,
    complication: parsed.complication?.trim() || null,
    attentionLevel
  };
};

export const parseSseDelta = (line: string): string | null => {
  const trimmed = line.trim();

  if (!trimmed.startsWith('data:')) {
    return null;
  }

  const payload = trimmed.replace(/^data:\s*/, '');

  if (!payload || payload === '[DONE]') {
    return null;
  }

  const parsed = JSON.parse(payload) as {
    choices?: Array<{
      delta?: {
        content?: string;
      };
    }>;
  };

  return parsed.choices?.[0]?.delta?.content ?? null;
};

export const stripEventEndMarker = (text: string): { cleanedText: string; shouldEndEvent: boolean } => {
  const shouldEndEvent = text.includes('[EVENT_END]');
  const cleanedText = text.replace(/\[EVENT_END\]/g, '').trim();

  return {
    cleanedText,
    shouldEndEvent
  };
};

export const extractAssistantReply = (response: ChatCompletionResponse): string => {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((item) => item.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n')
      .trim();

    if (joined) {
      return joined;
    }
  }

  throw new Error('模型没有返回可用文本。');
};

export const getChatRuntimeConfig = (): ChatRuntimeConfig => {
  const endpoint = import.meta.env.VITE_CHAT_COMPLETIONS_URL;
  const apiKey = import.meta.env.VITE_CHAT_API_KEY;
  const model = import.meta.env.VITE_CHAT_MODEL;

  if (!endpoint || !apiKey || !model) {
    throw new Error('缺少模型配置，请检查本地环境变量。');
  }

  return { endpoint, apiKey, model };
};

export const requestTaskResult = async (
  input: Omit<BuildTaskResultRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<TaskSettlement> => {
  const config = getChatRuntimeConfig();
  const payload = buildTaskResultRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt: input.systemPrompt ?? '你是恋爱文字冒险游戏里的日程任务结算器。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`任务结算失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return parseTaskSettlement(extractAssistantReply(data));
};

export const requestTaskSegment = async (
  input: Omit<BuildTaskSegmentRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<TaskSegment> => {
  const config = getChatRuntimeConfig();
  const payload = buildTaskSegmentRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt: input.systemPrompt ?? '你是恋爱文字冒险游戏里的任务过程推进器。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`任务片段生成失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return parseTaskSegment({
    task: input.task,
    fromLabel: input.fromLabel,
    toLabel: input.toLabel,
    responseText: extractAssistantReply(data)
  });
};

export const requestTaskFinalSummary = async (
  input: Omit<BuildTaskFinalSummaryRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<TaskSettlement> => {
  const config = getChatRuntimeConfig();
  const payload = buildTaskFinalSummaryRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt: input.systemPrompt ?? '你是恋爱文字冒险游戏里的任务总结器。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`任务总结失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return parseTaskSettlement(extractAssistantReply(data));
};

export const requestTaskImagePrompt = async (
  input: Omit<BuildTaskImagePromptRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<string> => {
  const config = getChatRuntimeConfig();
  const payload = buildTaskImagePromptRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt: input.systemPrompt ?? '你是视觉小说游戏的任务生图提示词导演。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`任务生图提示词生成失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return extractAssistantReply(data);
};

export const requestStoryReply = async (
  input: Omit<BuildChatRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<string> => {
  const config = getChatRuntimeConfig();
  const payload = buildChatRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt:
      input.systemPrompt ??
      '你是一款现代恋爱向文字冒险游戏的叙事主持人与角色扮演者。保持中文输出，维持细腻、克制、暧昧的现代校园恋爱气质。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`模型请求失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return extractAssistantReply(data);
};

export const requestGeneratedSceneEvent = async (
  input: Omit<BuildEventPlanRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string; worldRevision?: number }
): Promise<GeneratedEvent> => {
  const config = getChatRuntimeConfig();
  const payload = buildEventPlanRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt:
      input.systemPrompt ??
      '你是恋爱文字冒险游戏的事件编剧，请为进入场景时生成一段带骨架但可自由发挥的剧情事件。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`模型请求失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const text = extractAssistantReply(data);

  return parsePlannedSceneEvent({
    scene: input.scene,
    locationLabel: input.locationLabel,
    timeLabel: input.timeLabel,
    timeSlot: input.timeSlot,
    responseText: text,
    worldRevision: input.worldRevision
  });
};

export const requestEventTimeSettlement = async (
  input: Omit<BuildEventTimeSettlementRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<EventTimeSettlement> => {
  const config = getChatRuntimeConfig();
  const payload = buildEventTimeSettlementRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt: input.systemPrompt ?? '你是恋爱剧情游戏的时间结算器。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`模型请求失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const text = extractAssistantReply(data);
  return parseEventTimeSettlement(text);
};

export const requestEventImagePrompt = async (
  input: Omit<BuildEventImagePromptRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<string> => {
  const config = getChatRuntimeConfig();
  const payload = buildEventImagePromptRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt: input.systemPrompt ?? '你是视觉小说游戏的生图提示词导演，负责把剧情上下文整理成稳定、具体、可执行的图片生成提示词。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`生图提示词生成失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return extractAssistantReply(data);
};

export async function* requestStoryReplyStream(
  input: Omit<BuildChatRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): AsyncGenerator<string> {
  const config = getChatRuntimeConfig();
  const payload: ChatRequestPayload = {
    ...buildChatRequest({
      ...input,
      model: input.model ?? config.model,
      systemPrompt:
        input.systemPrompt ??
        '你是一款现代恋爱向文字冒险游戏的叙事主持人与角色扮演者。保持中文输出，维持细腻、克制、暧昧的现代校园恋爱气质。'
    }),
    stream: true
  };

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`模型请求失败：${response.status}`);
  }

  if (!response.body) {
    throw new Error('模型接口没有返回流式响应。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const delta = parseSseDelta(line);

      if (delta) {
        yield delta;
      }
    }
  }

  buffer += decoder.decode();

  for (const line of buffer.split(/\r?\n/)) {
    const delta = parseSseDelta(line);

    if (delta) {
      yield delta;
    }
  }
}

export async function* requestTaskManualReplyStream(
  input: Omit<BuildTaskManualRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): AsyncGenerator<string> {
  const config = getChatRuntimeConfig();
  const payload = buildTaskManualRequest({
    ...input,
    model: input.model ?? config.model,
    systemPrompt: input.systemPrompt ?? '你是一款现代恋爱向文字冒险游戏的任务托管主持人。'
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`任务托管失败：${response.status}`);
  }

  if (!response.body) {
    throw new Error('模型接口没有返回流式响应。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const delta = parseSseDelta(line);

      if (delta) {
        yield delta;
      }
    }
  }

  buffer += decoder.decode();

  for (const line of buffer.split(/\r?\n/)) {
    const delta = parseSseDelta(line);

    if (delta) {
      yield delta;
    }
  }
}
