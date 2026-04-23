export interface StoredSettings {
  currentModel?: string;
  streamCharsPerSecond?: number;
}

const SETTINGS_STORAGE_KEY = 'romance-map-chat-game.settings';
const DEFAULT_STREAM_CHARS_PER_SECOND = 17;
const MIN_STREAM_CHARS_PER_SECOND = 1;
const MAX_STREAM_CHARS_PER_SECOND = 20;

export const clampStreamCharsPerSecond = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_STREAM_CHARS_PER_SECOND;
  }

  return Math.min(MAX_STREAM_CHARS_PER_SECOND, Math.max(MIN_STREAM_CHARS_PER_SECOND, Math.round(value)));
};

export const loadStoredSettings = (): StoredSettings => {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as StoredSettings;

    return {
      currentModel: parsed.currentModel,
      streamCharsPerSecond:
        typeof parsed.streamCharsPerSecond === 'number'
          ? clampStreamCharsPerSecond(parsed.streamCharsPerSecond)
          : undefined
    };
  } catch {
    return {};
  }
};

export const saveStoredSettings = (settings: StoredSettings): void => {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      currentModel: settings.currentModel,
      streamCharsPerSecond: clampStreamCharsPerSecond(settings.streamCharsPerSecond ?? DEFAULT_STREAM_CHARS_PER_SECOND)
    })
  );
};

