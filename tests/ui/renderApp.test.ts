import { describe, expect, it } from 'vitest';
import { renderApp } from '../../src/ui/renderApp';
import { appendTranscriptMessage, createInitialState, toggleSettingsPanel } from '../../src/state/store';

describe('renderApp', () => {
  it('renders portrait visual area and dialogue panel', () => {
    const state = createInitialState();
    document.body.innerHTML = '<div id="app"></div>';

    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="visual-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dialogue-panel"]')).not.toBeNull();
    expect(document.body.textContent).toContain('世界地图');
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

  it('renders settings panel with stream speed control when opened', () => {
    let state = createInitialState();
    state = toggleSettingsPanel(state);

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('设置');
    expect(document.body.textContent).toContain('文字显示速度');
    expect((document.querySelector('[data-setting="stream-speed"]') as HTMLInputElement)?.value).toBe('8');
  });
});
