import { describe, expect, it } from 'vitest';
import { createInitialState, setCurrentModel, toggleModelMenu } from '../../src/state/store';

describe('model selection state', () => {
  it('uses deepseek-chat as the default model', () => {
    const state = createInitialState();

    expect(state.settings.currentModel).toBe('deepseek-chat');
  });

  it('toggles model menu and updates current model immediately', () => {
    let state = createInitialState();

    state = toggleModelMenu(state);
    expect(state.ui.isModelMenuOpen).toBe(true);

    state = setCurrentModel(state, 'gpt-4o-mini');
    expect(state.settings.currentModel).toBe('gpt-4o-mini');
    expect(state.ui.isModelMenuOpen).toBe(false);
  });
});
