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

const flushUi = async () => {
  await Promise.resolve();
  await Promise.resolve();
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
    requestGeneratedSceneEventMock.mockReset();
    requestStoryReplyStreamMock.mockReset();
    requestEventTimeSettlementMock.mockReset();
    requestStoryReplyStreamMock.mockImplementation(async function* () {});
    requestEventTimeSettlementMock.mockResolvedValue({
      minutesElapsed: 20,
      summary: '这次事件过去了二十分钟。'
    });
  });

  it('auto-enters the newly generated current scene even if another scene event was previously active', async () => {
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
    expect(document.body.textContent).toContain('事件中');

    (document.querySelector('[data-scene-id="hallway"]') as HTMLButtonElement).click();
    await flushUi();

    expect(document.body.textContent).toContain('风吹过的走廊');
    expect(document.body.textContent).not.toContain('放学后的空教室');
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
});
