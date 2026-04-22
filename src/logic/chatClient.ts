import type { EventPhase, GeneratedEvent, Scene, TimeSlot } from '../data/types';
import { buildMockReply } from './dialogue';

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
}

export interface BuildEventTimeSettlementRequestInput {
  model: string;
  systemPrompt: string;
  startTimeLabel: string;
  locationLabel: string;
  eventTitle: string;
  transcript: string[];
  eventFacts: string[];
}

export interface BuildFallbackTimeSettlementInput {
  transcript: string[];
  eventFacts: string[];
}

const sanitizeFact = (value: string): string => value.replace(/\s+/g, ' ').trim();

const extractJsonObject = (text: string): string | null => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
};

const buildLocalAssistantReply = ({
  eventTitle,
  locationLabel,
  castName,
  playerInput,
  intent
}: Pick<BuildChatRequestInput, 'eventTitle' | 'locationLabel' | 'castName' | 'playerInput' | 'intent'>): string => {
  if (intent === 'end_event') {
    return `旁白：${locationLabel}里的气氛慢慢落回安静。\n${castName || '旁白'}：那今天就先到这里吧。[EVENT_END]`;
  }

  if (!castName || castName === '旁白') {
    return `旁白：${locationLabel}里没有新的熟人出现，空气里只剩下这一刻的细微动静。\n旁白：你刚才选择了“${playerInput}”，周围的气氛因此轻轻偏移了一点，像是在等你决定接下来要不要继续停留。`;
  }

  return buildMockReply({
    eventTitle,
    locationLabel,
    castName,
    playerInput
  });
};

const clampMinutes = (minutes: number): number => Math.max(10, Math.min(180, Math.round(minutes)));

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
  intent = 'continue'
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
  memoryFacts
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
  eventFacts
}: BuildEventTimeSettlementRequestInput): ChatRequestPayload => ({
  model,
  messages: [
    {
      role: 'system',
      content: [
        systemPrompt,
        '你负责为已结束的事件做时间结算。',
        '请输出 JSON 对象，不要添加代码块。',
        '必须包含字段：minutesElapsed, summary。',
        'minutesElapsed 代表这次事件在世界里实际消耗的分钟数。'
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
        '请根据事件规模、对话长度、冲突和推进强度，判断这次事件大概耗时多少分钟。',
        '如果只是短暂交流，耗时分钟可以在 10-30；如果剧情很多、经历明显冲突，耗时分钟可以更长。'
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
    summary: `这次事件包含 ${transcript.length} 段互动与 ${eventFacts.length} 条事件事实，时间自然推进到了 ${minutesElapsed} 分钟之后。`
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

  return {
    minutesElapsed: clampMinutes(parsed.minutesElapsed ?? 20),
    summary: parsed.summary?.trim() || '这次事件自然过去了一小段时间。'
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

export const requestStoryReply = async (
  input: Omit<BuildChatRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<string> => {
  try {
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
  } catch {
    return buildLocalAssistantReply(input);
  }
};

export const requestGeneratedSceneEvent = async (
  input: Omit<BuildEventPlanRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string; worldRevision?: number }
): Promise<GeneratedEvent> => {
  try {
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
  } catch {
    return buildFallbackSceneEvent({
      scene: input.scene,
      locationLabel: input.locationLabel,
      timeLabel: input.timeLabel,
      timeSlot: input.timeSlot,
      memorySummary: input.memorySummary,
      memoryFacts: input.memoryFacts,
      worldRevision: input.worldRevision
    });
  }
};

export const requestEventTimeSettlement = async (
  input: Omit<BuildEventTimeSettlementRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): Promise<EventTimeSettlement> => {
  try {
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
  } catch {
    return buildFallbackTimeSettlement({
      transcript: input.transcript,
      eventFacts: input.eventFacts
    });
  }
};

export async function* requestStoryReplyStream(
  input: Omit<BuildChatRequestInput, 'model' | 'systemPrompt'> & { model?: string; systemPrompt?: string }
): AsyncGenerator<string> {
  try {
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
  } catch {
    yield buildLocalAssistantReply(input);
  }
}
