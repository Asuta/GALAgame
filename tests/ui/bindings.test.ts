import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requestGeneratedSceneEventMock,
  requestStoryReplyStreamMock,
  requestEventTimeSettlementMock
} = vi.hoisted(() => ({
  requestGeneratedSceneEventMock: vi.fn(),
  requestStoryReplyStreamMock: vi.fn(),
  requestEventTimeSettlementMock: vi.fn()
}));

vi.mock('../../src/logic/chatClient', async () => {
  const actual = await vi.importActual<typeof import('../../src/logic/chatClient')>('../../src/logic/chatClient');

  return {
    ...actual,
    requestGeneratedSceneEvent: requestGeneratedSceneEventMock,
    requestStoryReplyStream: requestStoryReplyStreamMock,
    requestEventTimeSettlement: requestEventTimeSettlementMock
  };
});

import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';
import { bindUi } from '../../src/ui/bindings';

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

const waitForText = async (text: string) => {
  for (let index = 0; index < 20; index += 1) {
    if (document.body.textContent?.includes(text)) {
      return;
    }

    await waitForStreamTick();
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
    requestGeneratedSceneEventMock.mockReset();
    requestStoryReplyStreamMock.mockReset();
    requestEventTimeSettlementMock.mockReset();
    requestStoryReplyStreamMock.mockImplementation(async function* () {});
    requestEventTimeSettlementMock.mockResolvedValue({
      minutesElapsed: 20,
      summary: '这次事件过去了二十分钟。'
    });
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
});
