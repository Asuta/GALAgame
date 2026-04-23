import { createPhaserHost } from '../game/createPhaserHost';
import { createInitialState } from '../state/store';
import { loadStoredSettings } from '../settings/storage';
import { bindUi } from '../ui/bindings';
import { renderApp } from '../ui/renderApp';

export const createApp = (root: HTMLDivElement): void => {
  const storedSettings = loadStoredSettings();
  const baseState = createInitialState();
  const initialState = {
    ...baseState,
    settings: {
      ...baseState.settings,
      currentModel:
        storedSettings.currentModel && baseState.settings.availableModels.includes(storedSettings.currentModel)
          ? storedSettings.currentModel
          : baseState.settings.currentModel,
      streamCharsPerSecond: storedSettings.streamCharsPerSecond ?? baseState.settings.streamCharsPerSecond
    }
  };

  renderApp(root, initialState);
  createPhaserHost('phaser-root');
  bindUi(root, initialState);
};
