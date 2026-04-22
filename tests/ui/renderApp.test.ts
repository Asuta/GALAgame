import { describe, expect, it } from 'vitest';
import { renderApp } from '../../src/ui/renderApp';
import { appendTranscriptMessage, createInitialState, setSceneSummary, startEvent } from '../../src/state/store';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';

describe('renderApp', () => {
  it('renders portrait visual area and dialogue panel', () => {
    const state = createInitialState();
    document.body.innerHTML = '<div id="app"></div>';

    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="visual-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dialogue-panel"]')).not.toBeNull();
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
