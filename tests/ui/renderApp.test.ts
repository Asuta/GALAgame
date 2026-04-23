import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../src/ui/renderApp';
import { appendTranscriptMessage, createInitialState, setSceneSummary, startEvent } from '../../src/state/store';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';

describe('renderApp', () => {
  it('renders city map art in the visual area and keeps the dialogue panel', () => {
    const state = createInitialState();
    document.body.innerHTML = '<div id="app"></div>';

    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    const backgroundImage = document.querySelector('[data-testid="visual-background"]');
    const characterImage = document.querySelector('[data-testid="visual-character"]');

    expect(document.querySelector('[data-testid="visual-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dialogue-panel"]')).not.toBeNull();
    expect(backgroundImage?.getAttribute('src')).toBe('/assets/map/city-overview-main.png');
    expect(characterImage).toBeNull();
    expect(document.body.textContent).toContain('世界地图');
    expect(document.body.textContent).toContain('傍晚 18:00');
  });

  it('renders chat history entries with speaker labels', () => {
    let state = createInitialState();
    state = appendTranscriptMessage(state, { role: 'player', label: '你', content: '今天你怎么还没回家？' });
    state = appendTranscriptMessage(state, { role: 'character', label: '林澄', content: '我还想再坐一会儿。' });

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('你');
    expect(document.body.textContent).toContain('林澄');
    expect(document.body.textContent).toContain('我还想再坐一会儿');
  });

  it('escapes dynamic dialogue and model text before inserting markup', () => {
    let state = createInitialState();
    state = {
      ...state,
      settings: {
        ...state.settings,
        currentModel: 'gpt-4o-mini <fast&fun>'
      }
    };
    state = appendTranscriptMessage(state, {
      role: 'player',
      label: '你 <b>玩家</b>',
      content: '先看这里 <img src=x onerror="alert(1)"> & 再说'
    });

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    const storyBox = document.querySelector('.story-box');
    const modelToggle = document.querySelector('.model-toggle');

    expect(storyBox?.querySelector('img')).toBeNull();
    expect(storyBox?.textContent).toContain('你 <b>玩家</b>');
    expect(storyBox?.textContent).toContain('先看这里 <img src=x onerror="alert(1)"> & 再说');
    expect(modelToggle?.textContent).toContain('gpt-4o-mini <fast&fun>');
  });

  it('only exposes the event opening to the player and hides internal planner notes', () => {
    let state = createInitialState();
    state = startEvent(
      state,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      })
    );

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('放学后的空教室');
    expect(document.body.textContent).toContain('她一个人坐在窗边');
    expect(document.body.textContent).not.toContain('超限触发');
    expect(document.body.textContent).not.toContain('收束方向');
    expect(document.body.textContent).not.toContain('当前目标');
  });

  it('renders event art with region background and character portrait', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    state = startEvent(
      state,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      })
    );

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="visual-background"]')?.getAttribute('src')).toBe(
      '/assets/backgrounds/region-school-main.png'
    );
    expect(document.querySelector('[data-testid="visual-character"]')?.getAttribute('src')).toBe(
      '/assets/characters/lin-cheng-half-body.png'
    );
    expect(document.body.textContent).toContain('学校 / 教室');
  });

  it('does not render the internal memory panel for players', () => {
    const state = createInitialState();

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).not.toContain('记忆');
    expect(document.querySelector('.memory-box')).toBeNull();
  });

  it('shows a short scene summary in the story box after an event ends', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    state = setSceneSummary(state, 'classroom', '刚才那场对话像一阵风一样过去了，你们谁都没有把最想说的话真正说出口。');

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('刚才那场对话像一阵风一样过去了');
    expect(document.body.textContent).not.toContain('记忆');
  });
});

describe('createApp', () => {
  it('delegates initial rendering to bindUi without a second bootstrap render', async () => {
    const bindUi = vi.fn();
    const renderApp = vi.fn();
    const createInitialState = vi.fn();

    vi.resetModules();
    vi.doMock('../../src/ui/bindings', () => ({
      bindUi
    }));
    vi.doMock('../../src/ui/renderApp', () => ({
      renderApp
    }));
    vi.doMock('../../src/state/store', () => ({
      createInitialState
    }));

    const { createApp } = await import('../../src/app/createApp');
    const root = document.createElement('div') as HTMLDivElement;

    createApp(root);

    expect(bindUi).toHaveBeenCalledOnce();
    expect(bindUi).toHaveBeenCalledWith(root);
    expect(renderApp).not.toHaveBeenCalled();
    expect(createInitialState).not.toHaveBeenCalled();

    vi.doUnmock('../../src/ui/bindings');
    vi.doUnmock('../../src/ui/renderApp');
    vi.doUnmock('../../src/state/store');
    vi.resetModules();
  });
});
