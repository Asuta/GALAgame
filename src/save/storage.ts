import { createInitialState, type GameState } from '../state/store';
import { loadStoredSettings, saveStoredSettings } from '../settings/storage';
import { loadStoredPlayerState, saveStoredPlayerState } from '../player/storage';
import { normalizeImportedGameState } from './gameSave';

const GAME_STATE_STORAGE_KEY = 'romance-map-chat-game.state';

export const loadStoredGameState = (): GameState | null => {
  const raw = localStorage.getItem(GAME_STATE_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const baseState = createInitialState();
    const storedSettings = loadStoredSettings();

    return normalizeImportedGameState(parsed, loadStoredPlayerState(), {
      currentModel: storedSettings.currentModel ?? baseState.settings.currentModel,
      streamCharsPerSecond: storedSettings.streamCharsPerSecond ?? baseState.settings.streamCharsPerSecond
    });
  } catch {
    return null;
  }
};

const saveLightweightFallback = (state: GameState): void => {
  const fallbackState: GameState = {
    ...state,
    event: {
      ...state.event,
      generatedImages: {}
    },
    task: {
      ...state.task,
      activeTask: state.task.activeTask
        ? {
            ...state.task.activeTask,
            generatedImageUrl: null
          }
        : null
    }
  };

  localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(fallbackState));
};

export const saveStoredGameState = (state: GameState): void => {
  saveStoredSettings({
    currentModel: state.settings.currentModel,
    streamCharsPerSecond: state.settings.streamCharsPerSecond
  });
  saveStoredPlayerState(state.player);

  try {
    localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    try {
      saveLightweightFallback(state);
    } catch {
      localStorage.removeItem(GAME_STATE_STORAGE_KEY);
    }
  }
};

export const clearStoredGameState = (): void => {
  localStorage.removeItem(GAME_STATE_STORAGE_KEY);
};
