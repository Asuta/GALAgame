import { afterEach, describe, expect, it, vi } from 'vitest';
import { worldData } from '../../src/data/world';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import {
  buildEventImagePrompt,
  buildImageGenerationPayload,
  buildTaskImagePrompt,
  extractGeneratedImageUrls,
  normalizeImageSize,
  requestGeneratedEventImage,
  requestGeneratedTaskImage,
  sanitizeTaskVisualText
} from '../../src/logic/imageClient';
import { appendTaskSegment, createInitialState, startTask } from '../../src/state/store';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('imageClient', () => {
  it('builds a qwen-image generation payload for one event image', () => {
    const payload = buildImageGenerationPayload({
      model: 'qwen-image-2.0-pro',
      prompt: '学校教室里的恋爱事件图',
      size: '720x1280',
      referenceImages: ['data:image/png;base64,scene', 'data:image/png;base64,character']
    });

    expect(payload.model).toBe('qwen-image-2.0-pro');
    expect(payload.input.messages[0].content).toEqual([
      { image: 'data:image/png;base64,scene' },
      { image: 'data:image/png;base64,character' },
      { text: '学校教室里的恋爱事件图' }
    ]);
    expect(payload.parameters).toMatchObject({
      prompt_extend: true,
      watermark: false,
      n: 1,
      size: '720*1280'
    });
    expect(payload.parameters.negative_prompt).toContain('水印');
  });

  it('normalizes image sizes and rejects invalid sizes', () => {
    expect(normalizeImageSize('1024x1024')).toBe('1024*1024');
    expect(normalizeImageSize('720*1280')).toBe('720*1280');
    expect(() => normalizeImageSize('vertical')).toThrow('Invalid image size');
  });

  it('extracts generated image urls from supported response shapes', () => {
    expect(
      extractGeneratedImageUrls({
        data: [{ url: 'https://example.com/a.png' }, { url: 'https://example.com/b.png' }],
        metadata: {
          output: {
            choices: [
              {
                message: {
                  content: [{ image: 'https://example.com/b.png' }, { image: 'https://example.com/c.png' }]
                }
              }
            ]
          }
        }
      })
    ).toEqual(['https://example.com/a.png', 'https://example.com/b.png', 'https://example.com/c.png']);
  });

  it('builds an event image prompt from the active story context', () => {
    const scene = worldData.scenes.find((item) => item.id === 'classroom')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '学校 / 教室',
      memorySummary: '刚开局',
      memoryFacts: [],
      timeLabel: '傍晚 18:00',
      timeSlot: 'evening'
    });

    const prompt = buildEventImagePrompt({
      event: {
        ...event,
        currentPhase: 'build_up',
        facts: ['林澄把练习册合上', '窗边只剩两个人']
      },
      scene,
      locationLabel: '学校 / 教室',
      transcript: ['你：我注意到她的手在发抖。', '林澄：只是有点冷。'],
      memorySummary: '你和林澄刚建立起一点信任。',
      memoryFacts: ['林澄不太愿意直接说出心事']
    });

    expect(prompt).toContain('现代恋爱向视觉小说事件插图');
    expect(prompt).toContain('请生成当前剧情这一刻的画面');
    expect(prompt).toContain('学校 / 教室');
    expect(prompt).toContain('林澄');
    expect(prompt).toContain(event.title);
    expect(prompt).toContain('当前剧情阶段：build_up');
    expect(prompt).toContain('林澄把练习册合上');
    expect(prompt).toContain('你：我注意到她的手在发抖。');
    expect(prompt).toContain('你和林澄刚建立起一点信任。');
    expect(prompt).toContain('不要文字');
  });

  it('requests an event image with configured endpoint and extracts the first image url', async () => {
    vi.stubEnv('VITE_IMAGE_API_BASE_URL', 'https://example.com/v1/images/generations');
    vi.stubEnv('VITE_IMAGE_API_KEY', 'image-key');
    vi.stubEnv('VITE_IMAGE_MODEL', 'qwen-image-2.0');

    const scene = worldData.scenes.find((item) => item.id === 'classroom')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '学校 / 教室',
      memorySummary: '刚开局',
      memoryFacts: [],
      timeLabel: '傍晚 18:00',
      timeSlot: 'evening'
    });
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ url: 'https://example.com/generated.png' }] }), { status: 200 })
    );

    await expect(
      requestGeneratedEventImage({
        event,
        scene,
        locationLabel: '学校 / 教室',
        referenceImageUrls: [],
        fetchImpl
      })
    ).resolves.toBe('https://example.com/generated.png');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer image-key' })
      })
    );
  });

  it('builds a task image prompt from the current task process', () => {
    let state = createInitialState();
    state = startTask(state, {
      content: '去女仆咖啡店玩一玩',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      executionMode: 'process',
      segmentMinutes: 10
    });
    state = appendTaskSegment(
      state,
      {
        id: 'segment-1',
        fromLabel: '18:00',
        toLabel: '18:10',
        content: '你靠窗坐下，翻开菜单。',
        complication: '手机突然震动了一下',
        attentionLevel: 'medium'
      },
      18 * 60 + 10
    );

    const prompt = buildTaskImagePrompt({
      task: state.task.activeTask!,
      locationLabel: '城市',
      memorySummary: '玩家正在安排自己的行动。',
      memoryFacts: ['咖啡店里播放着轻快的歌']
    });

    expect(prompt).toContain('现代恋爱向视觉小说任务插图');
    expect(prompt).toContain('去主题咖啡店玩一玩');
    expect(prompt).not.toContain('你靠窗坐下');
    expect(prompt).not.toContain('手机突然震动了一下');
    expect(prompt).not.toContain('任务事实');
    expect(prompt).not.toContain('手动托管记录');
    expect(prompt).toContain('安全日常物件');
    expect(prompt).toContain('不要出现文字');
  });

  it('sanitizes risky task wording before sending an image prompt', () => {
    let state = createInitialState();
    state = startTask(state, {
      content: '去那种不正规的女仆咖啡店玩一玩',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      executionMode: 'process',
      segmentMinutes: 10
    });
    const prompt = buildTaskImagePrompt({
      task: state.task.activeTask!,
      locationLabel: '城市',
      memorySummary: '玩家想找一个特别主题的地方放松。'
    });

    expect(sanitizeTaskVisualText('不正规的地下女仆咖啡店')).toBe('特别主题风格的街角主题咖啡店');
    expect(prompt).toContain('特别主题风格的主题咖啡店');
    expect(prompt).not.toContain('不正规');
    expect(prompt).not.toContain('女仆');
    expect(prompt).not.toContain('地下');
    expect(prompt).toContain('全年龄、安全、日常向');
  });

  it('requests a task image without reference images and extracts the result url', async () => {
    vi.stubEnv('VITE_IMAGE_API_BASE_URL', 'https://example.com/v1/images/generations');
    vi.stubEnv('VITE_IMAGE_API_KEY', 'image-key');

    const state = startTask(createInitialState(), {
      content: '晨跑一小时',
      startMinutes: 360,
      endMinutes: 420,
      executionMode: 'process',
      segmentMinutes: 10
    });
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ url: 'https://example.com/task.png' }] }), { status: 200 })
    );

    await expect(
      requestGeneratedTaskImage({
        task: state.task.activeTask!,
        locationLabel: '城市',
        fetchImpl
      })
    ).resolves.toBe('https://example.com/task.png');

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(payload.input.messages[0].content).toEqual([
      expect.objectContaining({
        text: expect.stringContaining('晨跑一小时')
      })
    ]);
  });

  it('downloads reference image urls as data urls before sending the generation request', async () => {
    vi.stubEnv('VITE_IMAGE_API_BASE_URL', 'https://example.com/v1/images/generations');
    vi.stubEnv('VITE_IMAGE_API_KEY', 'image-key');

    const scene = worldData.scenes.find((item) => item.id === 'classroom')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '学校 / 教室',
      memorySummary: '刚开局',
      memoryFacts: [],
      timeLabel: '傍晚 18:00',
      timeSlot: 'evening'
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Blob(['scene-bytes'], { type: 'image/png' }), {
          status: 200,
          headers: { 'content-type': 'image/png' }
        })
      )
      .mockResolvedValueOnce(
        new Response(new Blob(['character-bytes'], { type: 'image/png' }), {
          status: 200,
          headers: { 'content-type': 'image/png' }
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ url: 'https://example.com/generated.png' }] }), { status: 200 }));

    await requestGeneratedEventImage({
      event,
      scene,
      locationLabel: '学校 / 教室',
      referenceImageUrls: ['/assets/backgrounds/scene-classroom-main.png', '/assets/characters/lin-cheng-half-body.png'],
      fetchImpl
    });

    const payload = JSON.parse(fetchImpl.mock.calls[2][1].body);
    expect(fetchImpl.mock.calls[0][0]).toBe('http://localhost:3000/assets/backgrounds/scene-classroom-main.png');
    expect(fetchImpl.mock.calls[1][0]).toBe('http://localhost:3000/assets/characters/lin-cheng-half-body.png');
    expect(payload.input.messages[0].content[0].image).toMatch(/^data:image\/png;base64,/);
    expect(payload.input.messages[0].content[1].image).toMatch(/^data:image\/png;base64,/);
    expect(payload.input.messages[0].content[2].text).toContain('学校 / 教室');
  });
});
