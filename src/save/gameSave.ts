import { worldData } from '../data/world';
import { createInitialState, type GameState } from '../state/store';
import { clampStreamCharsPerSecond, type StoredSettings } from '../settings/storage';
import { normalizePlayerState } from '../player/storage';
import type { PlayerState } from '../player/types';
import type { SceneEventSeed, TimeSlot, WorldData } from '../data/types';

export const SAVE_APP_NAME = 'romance-map-chat-game';
export const SAVE_SCHEMA_VERSION = 1;

export interface EmbeddedMediaEntry {
  url: string;
  dataUrl?: string;
  prompt?: string;
  error?: string;
}

export interface GameSaveBundle {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  appName: typeof SAVE_APP_NAME;
  exportedAt: string;
  worldSnapshot: WorldData;
  gameState: GameState;
  player: PlayerState;
  settings: StoredSettings;
  embeddedMedia: Record<string, EmbeddedMediaEntry>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const normalizeWorldData = (value: unknown): WorldData => {
  if (!isRecord(value)) {
    return cloneJson(worldData);
  }

  const normalizeSeed = (seed: unknown): SceneEventSeed => {
    const source = isRecord(seed) ? seed : {};

    return {
      baseTitle: typeof source.baseTitle === 'string' ? source.baseTitle : '未命名事件',
      castIds: isStringArray(source.castIds) ? source.castIds : [],
      tones: isStringArray(source.tones) ? source.tones : [],
      buildUpGoals: isStringArray(source.buildUpGoals) ? source.buildUpGoals : ['让玩家观察这个地点的异常之处'],
      triggerHints: isStringArray(source.triggerHints) ? source.triggerHints : ['这里出现了一点微妙变化'],
      resolutionDirections: isStringArray(source.resolutionDirections) ? source.resolutionDirections : ['把这一幕暂时收束'],
      premiseTemplates: isStringArray(source.premiseTemplates) ? source.premiseTemplates : ['这里似乎刚刚发生过什么。'],
      suspenseSeeds: isStringArray(source.suspenseSeeds) ? source.suspenseSeeds : [],
      preferredTimeSlots: isStringArray(source.preferredTimeSlots)
        ? source.preferredTimeSlots.filter((slot): slot is TimeSlot =>
            ['dawn', 'morning', 'afternoon', 'evening', 'night', 'late_night'].includes(slot)
          )
        : undefined
    };
  };

  const regions = Array.isArray(value.regions)
    ? value.regions.filter(isRecord).map((region) => ({
        id: typeof region.id === 'string' ? region.id : '',
        name: typeof region.name === 'string' ? region.name : '',
        sceneIds: isStringArray(region.sceneIds) ? region.sceneIds : []
      })).filter((region) => region.id && region.name)
    : [];

  const scenes = Array.isArray(value.scenes)
    ? value.scenes.filter(isRecord).map((scene) => ({
        ...scene,
        id: typeof scene.id === 'string' ? scene.id : '',
        regionId: typeof scene.regionId === 'string' ? scene.regionId : '',
        name: typeof scene.name === 'string' ? scene.name : '',
        description: typeof scene.description === 'string' ? scene.description : '',
        eventSeed: normalizeSeed(scene.eventSeed),
        ...(isRecord(scene.fallbackEventSeed) ? { fallbackEventSeed: normalizeSeed(scene.fallbackEventSeed) } : {})
      })).filter((scene) => scene.id && scene.regionId && scene.name)
    : [];

  const characters = Array.isArray(value.characters)
    ? value.characters.filter(isRecord).map((character) => ({
        id: typeof character.id === 'string' ? character.id : '',
        name: typeof character.name === 'string' ? character.name : '',
        gender: typeof character.gender === 'string' ? character.gender : '',
        identity: typeof character.identity === 'string' ? character.identity : '',
        age: typeof character.age === 'string' ? character.age : '',
        personality: typeof character.personality === 'string' ? character.personality : '',
        speakingStyle: typeof character.speakingStyle === 'string' ? character.speakingStyle : '',
        relationshipToPlayer: typeof character.relationshipToPlayer === 'string' ? character.relationshipToPlayer : '',
        hardRules: isStringArray(character.hardRules) ? character.hardRules : []
      })).filter((character) => character.id && character.name)
    : [];

  return {
    regions,
    scenes,
    characters
  };
};

const normalizeSettings = (value: unknown, fallback: GameState['settings']): GameState['settings'] => {
  const source = isRecord(value) ? value : {};
  const currentModel =
    typeof source.currentModel === 'string' && fallback.availableModels.includes(source.currentModel)
      ? source.currentModel
      : fallback.currentModel;

  return {
    ...fallback,
    currentModel,
    streamCharsPerSecond:
      typeof source.streamCharsPerSecond === 'number'
        ? clampStreamCharsPerSecond(source.streamCharsPerSecond)
        : fallback.streamCharsPerSecond
  };
};

const sanitizeGameState = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false,
    isSending: false,
    generatingSceneIds: [],
    eventImageGeneration: {
      eventId: null,
      isGenerating: false,
      error: null
    }
  },
  event: {
    ...state.event,
    streamingReply: '',
    streamingLabel: ''
  },
  task: {
    ...state.task,
    activeTask: state.task.activeTask
      ? {
          ...state.task.activeTask,
          imageGeneration: {
            isGenerating: false,
            error: null
          },
          streamingReply: '',
          streamingLabel: ''
        }
      : null
  }
});

export const isGameStateBusy = (state: GameState): boolean =>
  state.ui.isSending ||
  state.ui.generatingSceneIds.length > 0 ||
  state.ui.eventImageGeneration.isGenerating ||
  !!state.task.activeTask?.imageGeneration.isGenerating;

export const normalizeImportedGameState = (
  value: unknown,
  playerValue?: unknown,
  settingsValue?: unknown,
  worldValue?: unknown
): GameState => {
  const fallback = createInitialState();

  if (!isRecord(value)) {
    return fallback;
  }

  const incoming = value as Partial<GameState>;
  const normalized: GameState = {
    ...fallback,
    ...incoming,
    navigation: {
      ...fallback.navigation,
      ...(isRecord(incoming.navigation) ? incoming.navigation : {})
    },
    ui: {
      ...fallback.ui,
      ...(isRecord(incoming.ui) ? incoming.ui : {})
    },
    clock: {
      ...fallback.clock,
      ...(isRecord(incoming.clock) ? incoming.clock : {})
    },
    world: {
      ...fallback.world,
      ...(isRecord(incoming.world) ? incoming.world : {}),
      data: normalizeWorldData(worldValue ?? (isRecord(incoming.world) ? incoming.world.data : undefined))
    },
    event: {
      ...fallback.event,
      ...(isRecord(incoming.event) ? incoming.event : {})
    },
    task: {
      ...fallback.task,
      ...(isRecord(incoming.task) ? incoming.task : {})
    },
    memory: {
      ...fallback.memory,
      ...(isRecord(incoming.memory) ? incoming.memory : {})
    },
    settings: normalizeSettings(settingsValue ?? incoming.settings, fallback.settings),
    player: normalizePlayerState(playerValue ?? incoming.player),
    settlement: {
      ...fallback.settlement,
      ...(isRecord(incoming.settlement) ? incoming.settlement : {})
    }
  };

  return sanitizeGameState(normalized);
};

const resolveImageUrl = (url: string): string => {
  if (url.startsWith('data:image/')) {
    return url;
  }

  if (typeof window === 'undefined') {
    return url;
  }

  return new URL(url, window.location.origin).toString();
};

const blobToDataUrl = async (blob: Blob): Promise<string> =>
  await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片转换失败。'));
    reader.readAsDataURL(blob);
  });

const embedImage = async (
  url: string,
  prompt: string,
  fetchImpl: typeof fetch
): Promise<EmbeddedMediaEntry> => {
  if (url.startsWith('data:image/')) {
    return { url, dataUrl: url, prompt };
  }

  try {
    const response = await fetchImpl(resolveImageUrl(url));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      url,
      dataUrl: await blobToDataUrl(await response.blob()),
      prompt
    };
  } catch (error) {
    return {
      url,
      prompt,
      error: error instanceof Error ? error.message : '图片读取失败。'
    };
  }
};

export const exportGameSave = async (
  state: GameState,
  options: { fetchImpl?: typeof fetch; now?: Date } = {}
): Promise<GameSaveBundle> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const exportedState = cloneJson(sanitizeGameState(state));
  const embeddedMedia: Record<string, EmbeddedMediaEntry> = {};

  await Promise.all(
    Object.entries(exportedState.event.generatedImages).map(async ([eventId, imageUrl]) => {
      const entry = await embedImage(imageUrl, exportedState.event.generatedImagePrompts[eventId] ?? '', fetchImpl);
      embeddedMedia[`event:${eventId}`] = entry;

      if (entry.dataUrl) {
        exportedState.event.generatedImages[eventId] = entry.dataUrl;
      }
    })
  );

  const activeTask = exportedState.task.activeTask;
  if (activeTask?.generatedImageUrl) {
    const entry = await embedImage(activeTask.generatedImageUrl, activeTask.generatedImagePrompt, fetchImpl);
    embeddedMedia[`task:${activeTask.id}`] = entry;

    if (entry.dataUrl) {
      activeTask.generatedImageUrl = entry.dataUrl;
    }
  }

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    appName: SAVE_APP_NAME,
    exportedAt: (options.now ?? new Date()).toISOString(),
    worldSnapshot: cloneJson(exportedState.world.data),
    gameState: exportedState,
    player: normalizePlayerState(exportedState.player),
    settings: {
      currentModel: exportedState.settings.currentModel,
      streamCharsPerSecond: exportedState.settings.streamCharsPerSecond
    },
    embeddedMedia
  };
};

export const serializeGameSave = (bundle: GameSaveBundle): string => JSON.stringify(bundle, null, 2);

export const parseGameSave = (text: string): GameSaveBundle => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('存档文件不是有效的 JSON。');
  }

  if (!isRecord(parsed)) {
    throw new Error('存档文件结构不正确。');
  }

  if (parsed.appName !== SAVE_APP_NAME || parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
    throw new Error('存档版本不兼容。');
  }

  const worldSnapshot = normalizeWorldData(parsed.worldSnapshot);

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    appName: SAVE_APP_NAME,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    worldSnapshot,
    gameState: normalizeImportedGameState(parsed.gameState, parsed.player, parsed.settings, worldSnapshot),
    player: normalizePlayerState(parsed.player),
    settings: parsed.settings as StoredSettings,
    embeddedMedia: isRecord(parsed.embeddedMedia) ? (parsed.embeddedMedia as Record<string, EmbeddedMediaEntry>) : {}
  };
};

const readFileAsText = async (file: File): Promise<string> =>
  await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('存档文件读取失败。'));
    reader.readAsText(file);
  });

export const importGameSave = async (file: File): Promise<GameSaveBundle> => parseGameSave(await readFileAsText(file));

export const restoreGameSaveBundle = (bundle: GameSaveBundle): GameState =>
  normalizeImportedGameState(bundle.gameState, bundle.player, bundle.settings, bundle.worldSnapshot);

export const resetGameProgress = (settings: GameState['settings']): GameState => {
  const initialState = createInitialState();

  return {
    ...initialState,
    settings: {
      ...initialState.settings,
      currentModel: settings.currentModel,
      streamCharsPerSecond: settings.streamCharsPerSecond
    }
  };
};
