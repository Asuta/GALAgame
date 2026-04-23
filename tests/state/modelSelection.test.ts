import { describe, expect, it } from 'vitest';
import {
  closeSettingsPage,
  createInitialState,
  openSettingsPage,
  setCurrentModel,
  setStreamCharsPerSecond,
  toggleStreamSpeedMenu
} from '../../src/state/store';

describe('model selection state', () => {
  it('uses deepseek-chat as the default model', () => {
    const state = createInitialState();

    expect(state.settings.currentModel).toBe('deepseek-chat');
  });

  it('opens settings page and updates current model immediately', () => {
    let state = createInitialState();

    state = openSettingsPage(state);
    expect(state.ui.currentPage).toBe('settings');

    state = setCurrentModel(state, 'gpt-4o-mini');
    expect(state.settings.currentModel).toBe('gpt-4o-mini');
    expect(state.ui.isModelMenuOpen).toBe(false);

    state = closeSettingsPage(state);
    expect(state.ui.currentPage).toBe('game');
  });

  it('toggles stream speed menu and updates the speed immediately', () => {
    let state = createInitialState();

    state = toggleStreamSpeedMenu(state);
    expect(state.ui.isStreamSpeedMenuOpen).toBe(true);

    state = setStreamCharsPerSecond(state, 3);
    expect(state.settings.streamCharsPerSecond).toBe(3);
    expect(state.ui.isStreamSpeedMenuOpen).toBe(false);
  });
});
