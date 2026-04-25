import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requestGeneratedEventImageMock,
  requestGeneratedTaskImageMock,
  requestEventImagePromptMock,
  requestGeneratedSceneEventMock,
  requestStoryReplyStreamMock,
  requestEventTimeSettlementMock,
  requestTaskResultMock,
  requestTaskSegmentMock,
  requestTaskManualReplyStreamMock,
  requestTaskFinalSummaryMock,
  requestTaskImagePromptMock
} = vi.hoisted(() => ({
  requestGeneratedEventImageMock: vi.fn(),
  requestGeneratedTaskImageMock: vi.fn(),
  requestEventImagePromptMock: vi.fn(),
  requestGeneratedSceneEventMock: vi.fn(),
  requestStoryReplyStreamMock: vi.fn(),
  requestEventTimeSettlementMock: vi.fn(),
  requestTaskResultMock: vi.fn(),
  requestTaskSegmentMock: vi.fn(),
  requestTaskManualReplyStreamMock: vi.fn(),
  requestTaskFinalSummaryMock: vi.fn(),
  requestTaskImagePromptMock: vi.fn()
}));

vi.mock('../../src/logic/imageClient', async () => {
  const actual = await vi.importActual<typeof import('../../src/logic/imageClient')>('../../src/logic/imageClient');

  return {
    ...actual,
    requestGeneratedEventImage: requestGeneratedEventImageMock,
    requestGeneratedTaskImage: requestGeneratedTaskImageMock
  };
});

vi.mock('../../src/logic/chatClient', async () => {
  const actual = await vi.importActual<typeof import('../../src/logic/chatClient')>('../../src/logic/chatClient');

  return {
    ...actual,
    requestEventImagePrompt: requestEventImagePromptMock,
    requestGeneratedSceneEvent: requestGeneratedSceneEventMock,
    requestStoryReplyStream: requestStoryReplyStreamMock,
    requestEventTimeSettlement: requestEventTimeSettlementMock,
    requestTaskResult: requestTaskResultMock,
    requestTaskSegment: requestTaskSegmentMock,
    requestTaskManualReplyStream: requestTaskManualReplyStreamMock,
    requestTaskFinalSummary: requestTaskFinalSummaryMock,
    requestTaskImagePrompt: requestTaskImagePromptMock
  };
});

import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';
import { bindUi } from '../../src/ui/bindings';
import { appendTranscriptMessage, createInitialState, startEvent } from '../../src/state/store';

let historyScrollTopStore = new WeakMap<HTMLElement, number>();
let historyClientHeight = 0;
let historyScrollHeight = 0;

Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
  configurable: true,
  get() {
    return historyScrollTopStore.get(this) ?? 0;
  },
  set(value: number) {
    historyScrollTopStore.set(this, value);
  }
});

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    return this.hasAttribute('data-chat-history') ? historyClientHeight : 0;
  }
});

Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
  configurable: true,
  get() {
    return this.hasAttribute('data-chat-history') ? historyScrollHeight : 0;
  }
});

const flushUi = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const waitForStreamTick = async () => {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
};

const waitForStreamFrame = async () => {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 80);
  });
};

const waitForText = async (text: string) => {
  for (let index = 0; index < 40; index += 1) {
    if (document.body.textContent?.includes(text)) {
      return;
    }

    await waitForStreamFrame();
    await flushUi();
  }

  throw new Error(`Timed out waiting for text: ${text}`);
};

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('bindUi scene switching', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    historyScrollTopStore = new WeakMap<HTMLElement, number>();
    historyClientHeight = 240;
    historyScrollHeight = 800;
    requestGeneratedEventImageMock.mockReset();
    requestGeneratedTaskImageMock.mockReset();
    requestEventImagePromptMock.mockReset();
    requestGeneratedSceneEventMock.mockReset();
    requestStoryReplyStreamMock.mockReset();
    requestEventTimeSettlementMock.mockReset();
    requestTaskResultMock.mockReset();
    requestTaskSegmentMock.mockReset();
    requestTaskManualReplyStreamMock.mockReset();
    requestTaskFinalSummaryMock.mockReset();
    requestTaskImagePromptMock.mockReset();
    requestStoryReplyStreamMock.mockImplementation(async function* () {});
    requestTaskManualReplyStreamMock.mockImplementation(async function* () {});
    requestEventTimeSettlementMock.mockResolvedValue({
      minutesElapsed: 20,
      summary: '这次事件过去了二十分钟。'
    });
    requestTaskResultMock.mockResolvedValue({
      summary: '任务顺利完成，状态变得更稳定。',
      facts: ['完成了一次任务']
    });
    requestTaskSegmentMock.mockImplementation(async ({ task, fromLabel, toLabel }) => ({
      id: `${task.id}-segment-${task.segments.length + 1}`,
      fromLabel,
      toLabel,
      content: `${fromLabel} 到 ${toLabel}，任务继续推进。`,
      complication: '途中出现一个小插曲',
      attentionLevel: 'medium'
    }));
    requestTaskFinalSummaryMock.mockResolvedValue({
      summary: '过程任务结束，留下了一点新的线索。',
      facts: ['完成过程任务']
    });
    requestTaskImagePromptMock.mockResolvedValue('模型重写的任务生图提示词：玩家在咖啡店窗边查看手机。');
    requestGeneratedEventImageMock.mockResolvedValue('https://example.com/generated-event.png');
    requestGeneratedTaskImageMock.mockResolvedValue('https://example.com/generated-task.png');
    requestEventImagePromptMock.mockResolvedValue('生成的固定生图提示词：当前她把练习册合上，窗边两人对视。');
  });

  it('keeps a generated scene event waiting until the player sends a message', async () => {
    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) =>
      buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      })
    );

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    expect(document.body.textContent).toContain('放学后的空教室');
    expect(document.body.textContent).toContain('待开场');
    expect(document.body.textContent).not.toContain('事件中');
    expect(document.querySelector('[data-action="end-event"]')).toBeNull();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '我先看向窗边的人。';
    (document.querySelector('[data-action="send"]') as HTMLButtonElement).click();
    await flushUi();

    expect(requestStoryReplyStreamMock).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain('事件中');
    expect(document.querySelector('[data-action="end-event"]')).not.toBeNull();
  });

  it('does not end a hidden previous event when leaving a newly selected loading scene', async () => {
    const hallwayDeferred = createDeferred<ReturnType<typeof buildFallbackSceneEvent>>();

    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) => {
      if (scene.id === 'hallway') {
        return hallwayDeferred.promise;
      }

      return buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      });
    });

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    (document.querySelector('[data-scene-id="hallway"]') as HTMLButtonElement).click();
    await flushUi();

    expect(document.body.textContent).toContain('正在生成事件中');

    (document.querySelector('[data-action="back"]') as HTMLButtonElement).click();
    await flushUi();

    expect(requestStoryReplyStreamMock).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('学校');
    expect(document.body.textContent).not.toContain('/ 走廊');

    hallwayDeferred.resolve(
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'hallway')!,
        locationLabel: '学校 / 走廊',
        memorySummary: '你刚开始在这座城市里探索，故事还没有真正展开。',
        memoryFacts: [],
        timeLabel: '傍晚 18:00',
        timeSlot: 'evening'
      })
    );
    await flushUi();
  });

  it('keeps the chat history position when the user is not at the bottom', async () => {
    const streamedReplyDeferred = createDeferred<void>();

    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) =>
      buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      })
    );
    requestStoryReplyStreamMock.mockImplementation(async function* () {
      yield '第';
      await streamedReplyDeferred.promise;
      yield '二';
    });

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '我想再观察一下。';
    (document.querySelector('[data-action="send"]') as HTMLButtonElement).click();
    await flushUi();

    let history = document.querySelector('[data-chat-history]') as HTMLElement;
    history.scrollTop = 320;
    history.dispatchEvent(new Event('scroll'));

    streamedReplyDeferred.resolve();
    await flushUi();

    history = document.querySelector('[data-chat-history]') as HTMLElement;
    expect(history.scrollTop).toBe(320);
  });

  it('keeps the same chat history element while streaming characters', async () => {
    const streamedReplyDeferred = createDeferred<void>();

    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) =>
      buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      })
    );
    requestStoryReplyStreamMock.mockImplementation(async function* () {
      yield '第';
      await streamedReplyDeferred.promise;
      yield '二';
    });

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '我想再观察一下。';
    (document.querySelector('[data-action="send"]') as HTMLButtonElement).click();
    await flushUi();

    const historyBeforeNextChar = document.querySelector('[data-chat-history]');

    streamedReplyDeferred.resolve();
    await flushUi();

    expect(document.querySelector('[data-chat-history]')).toBe(historyBeforeNextChar);
  });

  it('opens a separate settings page for stream speed and returns to the game', async () => {
    bindUi(document.querySelector('#app') as HTMLDivElement);

    expect(document.body.textContent).toContain('选择一个区域');
    expect(document.body.textContent).not.toContain('流式输出速度');

    (document.querySelector('[data-action="open-settings"]') as HTMLButtonElement).click();
    await flushUi();

    expect(document.body.textContent).toContain('设置');
    expect(document.body.textContent).toContain('流式输出速度');
    expect(document.querySelector('[data-stream-speed-slider]')).not.toBeNull();

    (document.querySelector('[data-action="back-to-game"]') as HTMLButtonElement).click();
    await flushUi();

    expect(document.body.textContent).toContain('选择一个区域');
    expect(document.body.textContent).not.toContain('流式输出速度');
  });

  it('changes model from the settings page and reflects it in the game header', async () => {
    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-action="open-settings"]') as HTMLButtonElement).click();
    await flushUi();

    const targetButton = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-model-id]')).find(
      (button) => button.dataset.modelId === 'gpt-4o-mini'
    );

    targetButton?.click();
    await flushUi();

    expect(document.querySelector('.model-option.is-active')?.textContent).toContain('gpt-4o-mini');

    (document.querySelector('[data-action="back-to-game"]') as HTMLButtonElement).click();
    await flushUi();

    expect(document.body.textContent).toContain('gpt-4o-mini');
    expect(document.querySelector('[data-action="toggle-model-menu"]')).toBeNull();
  });

  it('reveals the full current streaming bubble immediately when clicked', async () => {
    const streamStep = createDeferred<void>();
    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) =>
      buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      })
    );
    requestStoryReplyStreamMock.mockImplementation(async function* () {
      yield '旁白：你刚想开口';
      await streamStep.promise;
      yield '，她却先一步把后半句也说完了。';
    });

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '哈喽';
    (document.querySelector('[data-action="send"]') as HTMLButtonElement).click();
    await flushUi();

    const streamingBubble = document.querySelector<HTMLElement>('[data-streaming-bubble]');
    expect(streamingBubble).not.toBeNull();
    expect(streamingBubble?.textContent).toContain('旁');
    expect(streamingBubble?.textContent).not.toContain('后半句也说完了');

    streamingBubble?.click();
    streamStep.resolve();
    await waitForText('旁白：你刚想开口，她却先一步把后半句也说完了。');

    expect(document.querySelector('[data-streaming-bubble]')).toBeNull();
    expect(document.body.textContent).toContain('旁白：你刚想开口，她却先一步把后半句也说完了。');
  });

  it('continues the active event without player text when continue-story is clicked', async () => {
    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) =>
      buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      })
    );
    requestStoryReplyStreamMock
      .mockImplementationOnce(async function* () {})
      .mockImplementationOnce(async function* (input) {
        expect(input.intent).toBe('continue');
        expect(input.playerInput).toContain('玩家暂时没有回应');
        yield '旁白：她轻轻抬眼。';
        yield '林晚：嗯？';
      });

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '我先不说话，只是看着她。';
    (document.querySelector('[data-action="send"]') as HTMLButtonElement).click();
    await flushUi();
    (document.querySelector('[data-action="continue-story"]') as HTMLButtonElement).click();
    await flushUi();
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    await flushUi();

    expect(requestStoryReplyStreamMock).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain('旁白：她轻轻抬眼。林晚：');
  });

  it('generates an event image from the waiting event and uses it as the visual background', async () => {
    const imageDeferred = createDeferred<string>();
    requestGeneratedEventImageMock.mockReturnValueOnce(imageDeferred.promise);
    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) =>
      buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      })
    );

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    const generateButton = document.querySelector('[data-action="generate-event-image"]') as HTMLButtonElement;
    expect(generateButton).not.toBeNull();
    expect(generateButton.closest('.visual-stage')).not.toBeNull();
    generateButton.click();
    await flushUi();
    expect(document.querySelector('[data-action="generate-event-image"]')?.classList.contains('is-loading')).toBe(true);
    imageDeferred.resolve('https://example.com/generated-event.png');
    await flushUi();

    expect(requestGeneratedEventImageMock).toHaveBeenCalledOnce();
    expect(requestEventImagePromptMock).toHaveBeenCalledOnce();
    expect(requestEventImagePromptMock.mock.calls[0][0].eventTitle).toContain('放学后的空教室');
    expect(requestGeneratedEventImageMock.mock.calls[0][0].event.cast).toContain('林澄');
    expect(requestGeneratedEventImageMock.mock.calls[0][0].transcript).toEqual([]);
    expect(requestGeneratedEventImageMock.mock.calls[0][0].memorySummary).toContain('你刚开始');
    expect(requestGeneratedEventImageMock.mock.calls[0][0].prompt).toContain('生成的固定生图提示词');
    expect(requestGeneratedEventImageMock.mock.calls[0][0].referenceImageUrls).toEqual([
      '/assets/backgrounds/scene-classroom-main.png',
      '/assets/characters/lin-cheng-half-body.png'
    ]);
    expect(document.querySelector('[data-testid="visual-background"]')?.getAttribute('src')).toBe(
      'https://example.com/generated-event.png'
    );
    expect(document.querySelector('[data-testid="visual-character"]')).toBeNull();

    const promptButton = document.querySelector('[data-action="open-image-prompt"]') as HTMLButtonElement;
    expect(promptButton).not.toBeNull();
    expect(promptButton.hasAttribute('disabled')).toBe(false);
    promptButton.click();
    await flushUi();

    expect(document.querySelector('[data-testid="image-prompt-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('\u4e0a\u6b21\u751f\u56fe\u63d0\u793a\u8bcd');
    expect(document.body.textContent).toContain('\u751f\u6210\u7684\u56fa\u5b9a\u751f\u56fe\u63d0\u793a\u8bcd\uff1a\u5f53\u524d\u5979\u628a\u7ec3\u4e60\u518c\u5408\u4e0a\uff0c\u7a97\u8fb9\u4e24\u4eba\u5bf9\u89c6\u3002');
  });

  it('passes the latest transcript into event image prompt generation', async () => {
    let initialState = createInitialState();
    initialState = {
      ...initialState,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    initialState = startEvent(
      initialState,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: initialState.memory.summary,
        memoryFacts: initialState.memory.facts,
        timeLabel: initialState.clock.label,
        timeSlot: initialState.clock.timeSlot
      })
    );
    initialState = appendTranscriptMessage(initialState, {
      role: 'player',
      label: '你',
      content: '你看起来有点心事。'
    });
    initialState = appendTranscriptMessage(initialState, {
      role: 'character',
      label: '林澄',
      content: '旁白：她把练习册轻轻合上。'
    });

    bindUi(document.querySelector('#app') as HTMLDivElement, initialState);

    (document.querySelector('[data-action="generate-event-image"]') as HTMLButtonElement).click();
    await flushUi();
    await flushUi();

    const promptInput = requestEventImagePromptMock.mock.calls[0][0];
    const imageInput = requestGeneratedEventImageMock.mock.calls[0][0];
    expect(promptInput.transcript).toContain('你：你看起来有点心事。');
    expect(promptInput.transcript.join('\n')).toContain('旁白：她把练习册轻轻合上。');
    expect(imageInput.prompt).toContain('生成的固定生图提示词');
  });

  it('shows an event image generation error without blocking story controls', async () => {
    requestGeneratedEventImageMock.mockRejectedValueOnce(new Error('图片额度不足'));
    requestGeneratedSceneEventMock.mockImplementation(async ({ scene, locationLabel, memorySummary, memoryFacts, timeLabel, timeSlot }) =>
      buildFallbackSceneEvent({
        scene,
        locationLabel,
        memorySummary,
        memoryFacts,
        timeLabel,
        timeSlot
      })
    );

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-region-id="school"]') as HTMLButtonElement).click();
    (document.querySelector('[data-scene-id="classroom"]') as HTMLButtonElement).click();
    await flushUi();

    (document.querySelector('[data-action="generate-event-image"]') as HTMLButtonElement).click();
    await flushUi();
    await flushUi();

    expect(document.body.textContent).toContain('出图失败：图片额度不足');
    expect(document.querySelector('[data-action="send"]')?.hasAttribute('disabled')).toBe(false);
  });

  it('runs a global process task through manual takeover and completion', async () => {
    requestTaskManualReplyStreamMock.mockImplementation(async function* () {
      yield '旁白：你停下来确认那阵脚步声。';
    });

    bindUi(document.querySelector('#app') as HTMLDivElement);

    (document.querySelector('[data-action="open-task-planning"]') as HTMLButtonElement).click();
    await flushUi();

    expect(document.querySelector('[data-testid="task-planning-page"]')).not.toBeNull();

    const contentInput = document.querySelector('[data-task-content]') as HTMLTextAreaElement;
    contentInput.value = '晨跑一小时';
    (document.querySelector('input[value="process"]') as HTMLInputElement).click();
    (document.querySelector('[data-action="start-task"]') as HTMLButtonElement).click();
    await flushUi();
    await flushUi();

    expect(requestTaskSegmentMock).toHaveBeenCalledOnce();
    expect(requestTaskImagePromptMock).toHaveBeenCalledOnce();
    expect(requestGeneratedTaskImageMock).toHaveBeenCalledOnce();
    expect(requestTaskImagePromptMock.mock.calls[0][0].task.content).toBe('晨跑一小时');
    expect(requestGeneratedTaskImageMock.mock.calls[0][0].prompt).toContain('模型重写的任务生图提示词');
    expect(document.querySelector('[data-testid="task-running-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('途中出现一个小插曲');
    expect(document.querySelector('[data-testid="task-visual-image"]')?.getAttribute('src')).toBe('https://example.com/generated-task.png');

    (document.querySelector('[data-action="task-next-segment"]') as HTMLButtonElement).click();
    await flushUi();
    await flushUi();

    expect(requestTaskSegmentMock).toHaveBeenCalledTimes(2);
    expect(requestTaskImagePromptMock).toHaveBeenCalledOnce();
    expect(requestGeneratedTaskImageMock).toHaveBeenCalledOnce();

    (document.querySelector('[data-action="generate-task-image"]') as HTMLButtonElement).click();
    await flushUi();
    await flushUi();

    expect(requestTaskImagePromptMock).toHaveBeenCalledTimes(2);
    expect(requestTaskImagePromptMock.mock.calls[1][0].task.segments.length).toBeGreaterThan(0);
    expect(requestGeneratedTaskImageMock).toHaveBeenCalledTimes(2);

    (document.querySelector('[data-action="task-manual-mode"]') as HTMLButtonElement).click();
    await flushUi();
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '我放慢脚步看看是谁。';
    (document.querySelector('[data-action="task-send"]') as HTMLButtonElement).click();
    await flushUi();
    await waitForText('旁白：你停下来确认那阵脚步声。');

    expect(requestTaskManualReplyStreamMock).toHaveBeenCalledOnce();

    (document.querySelector('[data-action="task-auto-mode"]') as HTMLButtonElement).click();
    await flushUi();
    (document.querySelector('[data-action="task-finish"]') as HTMLButtonElement).click();
    await flushUi();
    await flushUi();

    expect(requestTaskFinalSummaryMock).toHaveBeenCalled();
    expect(document.querySelector('[data-testid="decision-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('过程任务结束');

    const mapButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action="back-to-game"]'));
    const bottomMapButton = mapButtons.find((button) => button.textContent?.includes('回到地图探索'));

    expect(bottomMapButton).not.toBeUndefined();
    bottomMapButton?.click();
    await flushUi();

    expect(document.querySelector('[data-testid="decision-page"]')).toBeNull();
    expect(document.querySelector('[data-testid="dialogue-panel"]')).not.toBeNull();
    expect(document.body.textContent).toContain('选择一个区域');
  });
});
