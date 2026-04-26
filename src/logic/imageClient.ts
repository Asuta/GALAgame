import type { GeneratedEvent, Scene, TaskRuntime } from '../data/types';

const DEFAULT_IMAGE_MODEL = 'qwen-image-2.0';
const DEFAULT_IMAGE_SIZE = '1280*800';
const DEFAULT_IMAGE_ENDPOINT = 'https://token.fun.tv/v1/images/generations';
const DEFAULT_NEGATIVE_PROMPT =
  '真实照片，真人摄影，写实摄影，电影剧照，3D渲染，欧美写实，低清晰度，模糊，畸形手指，多余手指，多余肢体，文字，水印，logo，低质量';
const UNIFIED_ANIME_STYLE_PROMPT =
  '统一画风：高质量二次元动漫视觉小说 CG 插画风格，横屏 16:10 构图，适合视觉小说横向画面窗口，清晰角色线稿，柔和赛璐璐上色，干净细节，完整场景背景，叙事感强。禁止真实照片、真人摄影、写实摄影、电影剧照、3D 渲染、欧美写实风格。';

export interface ImageGenerationPayload {
  model: string;
  input: {
    messages: Array<{
      role: 'user';
      content: Array<{ image: string } | { text: string }>;
    }>;
  };
  parameters: {
    prompt_extend: boolean;
    watermark: boolean;
    n: number;
    negative_prompt: string;
    size: string;
  };
}

export interface ImageRuntimeConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface BuildEventImagePromptInput {
  event: GeneratedEvent;
  scene: Scene | null;
  locationLabel: string;
  transcript?: string[];
  memorySummary?: string;
  memoryFacts?: string[];
  prompt?: string;
}

export interface BuildTaskImagePromptInput {
  task: TaskRuntime;
  locationLabel: string;
  memorySummary?: string;
  memoryFacts?: string[];
  prompt?: string;
}

export const sanitizeTaskVisualText = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  return normalized
    .replace(/不正规/g, '特别主题风格')
    .replace(/地下/g, '街角')
    .replace(/非法/g, '非日常')
    .replace(/色情|成人|性服务|擦边|下流|低俗/g, '成熟氛围')
    .replace(/女仆咖啡店/g, '主题咖啡店')
    .replace(/女仆/g, '主题店员')
    .replace(/调教|诱惑|挑逗/g, '互动')
    .replace(/暴力|血腥|杀人/g, '紧张');
};

export const applyUnifiedAnimeStyle = (prompt: string): string => {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    return trimmedPrompt;
  }

  return [UNIFIED_ANIME_STYLE_PROMPT, trimmedPrompt].join('\n');
};

export const normalizeImageSize = (size: string): string => {
  const normalized = String(size || '')
    .trim()
    .replace(/x/gi, '*');

  if (!/^\d+\*\d+$/.test(normalized)) {
    throw new Error('Invalid image size');
  }

  return normalized;
};

export const buildImageGenerationPayload = ({
  model = DEFAULT_IMAGE_MODEL,
  prompt,
  size = DEFAULT_IMAGE_SIZE,
  negativePrompt = DEFAULT_NEGATIVE_PROMPT,
  promptExtend = true,
  watermark = false,
  referenceImages
}: {
  model?: string;
  prompt: string;
  size?: string;
  negativePrompt?: string;
  promptExtend?: boolean;
  watermark?: boolean;
  referenceImages?: string[];
}): ImageGenerationPayload => {
  const trimmedPrompt = applyUnifiedAnimeStyle(prompt);

  if (!trimmedPrompt) {
    throw new Error('Prompt is required');
  }

  const normalizedReferenceImages = normalizeReferenceImages(referenceImages);

  return {
    model,
    input: {
      messages: [
        {
          role: 'user',
          content: [...normalizedReferenceImages.map((image) => ({ image })), { text: trimmedPrompt }]
        }
      ]
    },
    parameters: {
      prompt_extend: promptExtend,
      watermark,
      n: 1,
      negative_prompt: negativePrompt,
      size: normalizeImageSize(size)
    }
  };
};

export const normalizeReferenceImages = (referenceImages?: string[]): string[] => {
  if (!Array.isArray(referenceImages) || referenceImages.length === 0) {
    return [];
  }

  if (referenceImages.length > 3) {
    throw new Error('You can upload at most 3 reference images');
  }

  return referenceImages.map((image) => {
    const value = String(image || '').trim();

    if (!value.startsWith('data:image/')) {
      throw new Error('Invalid reference image');
    }

    return value;
  });
};

const resolveAssetUrl = (url: string): string => new URL(url, window.location.origin).toString();

export const readImageUrlAsDataUrl = async (url: string, fetchImpl: typeof fetch = fetch): Promise<string> => {
  const response = await fetchImpl(resolveAssetUrl(url));

  if (!response.ok) {
    throw new Error(`参考图读取失败：HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const bytes = await response.arrayBuffer();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('参考图转换失败。'));
    reader.readAsDataURL(new Blob([bytes], { type: contentType }));
  });
};

export const extractGeneratedImageUrls = (responseBody: unknown): string[] => {
  const body = responseBody as {
    data?: Array<{ url?: string }>;
    metadata?: { output?: { choices?: Array<{ message?: { content?: Array<{ image?: string }> } }> } };
  };
  const urls: string[] = [];
  const seen = new Set<string>();
  const pushUrl = (url?: string): void => {
    if (!url || seen.has(url)) {
      return;
    }

    seen.add(url);
    urls.push(url);
  };

  for (const item of body.data ?? []) {
    pushUrl(item.url);
  }

  for (const choice of body.metadata?.output?.choices ?? []) {
    for (const item of choice.message?.content ?? []) {
      pushUrl(item.image);
    }
  }

  return urls;
};

export const buildEventImagePrompt = ({
  event,
  scene,
  locationLabel,
  transcript = [],
  memorySummary = '',
  memoryFacts = []
}: BuildEventImagePromptInput): string => {
  const cast = event.cast.length ? event.cast.join('、') : '没有固定角色';
  const tones = scene?.eventSeed.tones.length ? scene.eventSeed.tones.join('、') : '暧昧、安静、现代感';
  const sceneDescription = scene?.description ?? event.premise;
  const recentTranscript = transcript.slice(-8);
  const eventFacts = event.facts.slice(-6);
  const recentMemoryFacts = memoryFacts.slice(-6);

  return [
    '现代恋爱向视觉小说事件插图，横屏 16:10 构图，适合偏横向的游戏图片窗口。',
    '请生成当前剧情这一刻的画面，不要回到事件开场，也不要画成泛用场景。',
    `地点：${locationLabel}。`,
    `主要角色：${cast}。`,
    `事件标题：${event.title}。`,
    `当前剧情阶段：${event.currentPhase}。`,
    `场景描述：${sceneDescription}`,
    `事件开场状态：${event.openingState}`,
    `当前事件事实：${eventFacts.length ? eventFacts.join('；') : '暂无。'}`,
    `最近对话：\n${recentTranscript.length ? recentTranscript.join('\n') : '暂无。'}`,
    `世界记忆摘要：${memorySummary || '暂无。'}`,
    `关键记忆：${recentMemoryFacts.length ? recentMemoryFacts.join('；') : '暂无。'}`,
    `氛围关键词：${tones}。`,
    '画面需要优先表现最近对话和当前阶段里的动作、距离、情绪和构图。',
    '画面需要包含完整场景背景和自然融入画面的角色，人物不要顶满画面，避免半身被裁切，像游戏 CG 一样有叙事感。',
    '高质量二次元动漫视觉小说 CG 风格，柔和光影，干净细节，不要文字，不要 UI，不要水印，不要真实照片或写实摄影。'
  ].join('\n');
};

export const buildTaskImagePrompt = ({
  task,
  locationLabel,
  memorySummary = '',
  memoryFacts = []
}: BuildTaskImagePromptInput): string => {
  const latestSegment = task.segments.slice(-1)[0];
  const safeTaskContent = sanitizeTaskVisualText(task.content);
  const safeLocationLabel = sanitizeTaskVisualText(locationLabel);
  const safeMemorySummary = sanitizeTaskVisualText(memorySummary);
  const visualMoment = `当前画面：玩家正在执行“${safeTaskContent}”，画面聚焦公开场所里的日常行动、人物状态、环境氛围和时间感。`;

  return [
    '现代恋爱向视觉小说任务插图，横屏 16:10 构图，适合偏横向的游戏图片窗口。',
    '请生成全年龄、安全、日常向的画面；如果原任务含有暧昧、违规或成人暗示，请改写成普通公开场所里的主题体验。',
    '不要表现违法、成人服务、性暗示、暴力伤害、未成年人不当内容；不要画成 UI 截图，不要出现文字、水印或 logo。',
    `当前位置：${safeLocationLabel}。`,
    `任务内容：${safeTaskContent}。`,
    `任务进度：${task.startMinutes} 到 ${task.endMinutes} 分钟刻度，当前在 ${task.currentMinutes}。`,
    latestSegment ? `时间片：${latestSegment.fromLabel}-${latestSegment.toLabel}。` : '时间片：任务刚开始。',
    visualMoment,
    '画面小细节：可以加入菜单、街景、窗边座位、手机、饮品、路灯等安全日常物件。',
    `世界记忆摘要：${safeMemorySummary || '暂无。'}`,
    '画面只需要表现一个安全、清晰、可视化的当前瞬间，不要复述任务日志，不要加入额外剧情。',
    '人物需要完整融入横向场景，不要竖屏全身肖像式构图，不要让头部、腿部或主体被窗口裁掉。',
    '画面需要优先表现任务本身的动作、地点、时间氛围和人物状态；如果有插曲，只作为画面里的小细节处理。',
    '高质量二次元动漫视觉小说 CG 风格，完整背景，自然光影，叙事感强，干净细节，不要真实照片或写实摄影。'
  ].join('\n');
};

export const getImageRuntimeConfig = (): ImageRuntimeConfig => {
  const endpoint = import.meta.env.VITE_IMAGE_API_BASE_URL || DEFAULT_IMAGE_ENDPOINT;
  const apiKey = import.meta.env.VITE_IMAGE_API_KEY;
  const model = import.meta.env.VITE_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  if (!apiKey) {
    throw new Error('缺少图片生成配置，请检查 VITE_IMAGE_API_KEY。');
  }

  return { endpoint, apiKey, model };
};

export const requestGeneratedEventImage = async ({
  event,
  scene,
  locationLabel,
  transcript = [],
  memorySummary = '',
  memoryFacts = [],
  prompt,
  referenceImageUrls = [],
  fetchImpl = fetch
}: BuildEventImagePromptInput & { referenceImageUrls?: string[]; fetchImpl?: typeof fetch }): Promise<string> => {
  const config = getImageRuntimeConfig();
  const referenceImages = await Promise.all(
    referenceImageUrls.slice(0, 3).map((imageUrl) => readImageUrlAsDataUrl(imageUrl, fetchImpl))
  );
  const payload = buildImageGenerationPayload({
    model: config.model,
    prompt: prompt?.trim() || buildEventImagePrompt({ event, scene, locationLabel, transcript, memorySummary, memoryFacts }),
    referenceImages
  });
  const response = await fetchImpl(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : {};

  if (!response.ok) {
    throw new Error(responseBody?.error?.message || responseBody?.message || '图片生成失败。');
  }

  const imageUrls = extractGeneratedImageUrls(responseBody);

  if (!imageUrls.length) {
    throw new Error('图片生成接口没有返回图片地址。');
  }

  return imageUrls[0];
};

export const requestGeneratedTaskImage = async ({
  task,
  locationLabel,
  memorySummary = '',
  memoryFacts = [],
  prompt,
  fetchImpl = fetch
}: BuildTaskImagePromptInput & { fetchImpl?: typeof fetch }): Promise<string> => {
  const config = getImageRuntimeConfig();
  const finalPrompt = prompt?.trim() || buildTaskImagePrompt({ task, locationLabel, memorySummary, memoryFacts });
  const payload = buildImageGenerationPayload({
    model: config.model,
    prompt: finalPrompt
  });
  const response = await fetchImpl(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : {};

  if (!response.ok) {
    throw new Error(responseBody?.error?.message || responseBody?.message || '任务图片生成失败。');
  }

  const imageUrls = extractGeneratedImageUrls(responseBody);

  if (!imageUrls.length) {
    throw new Error('图片生成接口没有返回图片地址。');
  }

  return imageUrls[0];
};
