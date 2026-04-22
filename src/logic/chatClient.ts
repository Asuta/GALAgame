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
  intent?: 'continue' | 'end_event';
}

export interface ChatRuntimeConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

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
        '5. 保持现代恋爱文字冒险的细腻语气。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `地点：${locationLabel}`,
        `事件：${eventTitle}`,
        `角色：${castName}`,
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
