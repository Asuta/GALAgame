import { createInitialState } from '../state/store';
import { loadStoredSettings } from '../settings/storage';
import { bindUi } from '../ui/bindings';
import { loadStoredGameState } from '../save/storage';

export const createApp = (root: HTMLDivElement): void => {
  const storedSettings = loadStoredSettings();
  const baseState = loadStoredGameState() ?? createInitialState();
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

  bindUi(root, initialState);
};
