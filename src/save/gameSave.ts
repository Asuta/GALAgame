import JSZip from 'jszip';
import { worldData } from '../data/world';
import { createInitialState, type GameState } from '../state/store';
import { clampStreamCharsPerSecond, type StoredSettings } from '../settings/storage';
import { normalizePlayerState } from '../player/storage';
import type { PlayerState } from '../player/types';
import type { SceneEventSeed, TimeSlot, WorldData } from '../data/types';
import { createStoredMediaUrl, dataUrlToBlob, getStoredMediaKey, isStoredMediaUrl } from './mediaStore';
import { getExportableVisualAssets } from '../visual/assetCatalog';

export const SAVE_APP_NAME = 'romance-map-chat-game';
export const SAVE_SCHEMA_VERSION = 1;

export interface EmbeddedMediaEntry {
  url: string;
  mediaPath?: string;
  contentType?: string;
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

export interface GameSaveMediaOptions {
  loadMediaBlob?: (key: string) => Promise<Blob | null>;
  saveMediaBlob?: (key: string, blob: Blob) => Promise<void>;
}

export interface ImportGameSaveOptions {
  saveMediaBlob: (key: string, blob: Blob) => Promise<void>;
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

const stripTemporaryGeneratedImages = (state: GameState): GameState => ({
  ...state,
  event: {
    ...state.event,
    generatedImages: {},
    generatedImagePrompts: {}
  },
  task: {
    ...state.task,
    activeTask: state.task.activeTask
      ? {
          ...state.task.activeTask,
          generatedImageUrl: null,
          generatedImagePrompt: ''
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

const getImageExtension = (contentType: string, fallbackUrl = ''): string => {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    return 'jpg';
  }

  if (contentType.includes('webp')) {
    return 'webp';
  }

  if (contentType.includes('gif')) {
    return 'gif';
  }

  if (contentType.includes('svg')) {
    return 'svg';
  }

  const extensionMatch = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(fallbackUrl);
  if (extensionMatch && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extensionMatch[1].toLowerCase())) {
    return extensionMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : extensionMatch[1].toLowerCase();
  }

  return 'png';
};

const sanitizeMediaSegment = (value: string): string =>
  value
    .replace(/[^a-z0-9_-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'image';

const collectZipImage = async (
  key: string,
  url: string,
  prompt: string,
  fetchImpl: typeof fetch,
  loadMediaBlob?: (key: string) => Promise<Blob | null>
): Promise<{ entry: EmbeddedMediaEntry; blob?: Blob }> => {
  const pathSegments = key.split(':').map(sanitizeMediaSegment);
  const filename = pathSegments[pathSegments.length - 1] ?? 'image';
  const folder = pathSegments.slice(0, -1).join('/') || 'media';
  const basePath = `media/${folder}/${filename}`;

  try {
    const storedMediaKey = getStoredMediaKey(url);
    const response = url.startsWith('data:image/') || storedMediaKey ? null : await fetchImpl(resolveImageUrl(url));

    if (response && !response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = url.startsWith('data:image/')
      ? dataUrlToBlob(url)
      : storedMediaKey
        ? await loadMediaBlob?.(storedMediaKey)
        : await response!.blob();

    if (!blob) {
      throw new Error('IndexedDB 中缺少对应图片。');
    }

    const contentType = blob.type || 'image/png';
    const mediaPath = `${basePath}.${getImageExtension(contentType, url)}`;

    return {
      blob,
      entry: {
        url: url.startsWith('data:image/') || isStoredMediaUrl(url) ? createStoredMediaUrl(key) : url,
        mediaPath,
        contentType,
        prompt
      }
    };
  } catch (error) {
    return {
      entry: {
        url,
        prompt,
        error: error instanceof Error ? error.message : '图片读取失败。'
      }
    };
  }
};

const serializeSaveManifest = (bundle: GameSaveBundle): string => JSON.stringify(bundle, null, 2);

export const exportGameSaveZip = async (
  state: GameState,
  options: { fetchImpl?: typeof fetch; now?: Date } & Pick<GameSaveMediaOptions, 'loadMediaBlob'> = {}
): Promise<Blob> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const exportedState = cloneJson(stripTemporaryGeneratedImages(sanitizeGameState(state)));
  const embeddedMedia: Record<string, EmbeddedMediaEntry> = {};
  const zip = new JSZip();

  await Promise.all(
    getExportableVisualAssets().map(async (asset) => {
      const result = await collectZipImage(
        asset.key,
        asset.url,
        '',
        fetchImpl,
        options.loadMediaBlob
      );

      embeddedMedia[asset.key] = result.entry;

      if (result.entry.mediaPath && result.blob) {
        zip.file(result.entry.mediaPath, result.blob);
      }
    })
  );

  const bundle: GameSaveBundle = {
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

  zip.file('save.json', serializeSaveManifest(bundle));

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
};

const parseSaveManifest = (text: string): GameSaveBundle => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ZIP 存档清单不是有效的 JSON。');
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

const isZipFile = (file: File): boolean =>
  file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

export const importGameSave = async (file: File, options: ImportGameSaveOptions): Promise<GameSaveBundle> => {
  if (!isZipFile(file)) {
    throw new Error('请导入 ZIP 格式的游戏存档。');
  }

  const zip = await JSZip.loadAsync(file);
  const manifest = zip.file('save.json');

  if (!manifest) {
    throw new Error('ZIP 存档缺少 save.json。');
  }

  const bundle = parseSaveManifest(await manifest.async('text'));

  await Promise.all(
    Object.entries(bundle.embeddedMedia).map(async ([key, entry]) => {
      if (!entry.mediaPath) {
        return;
      }

      const mediaFile = zip.file(entry.mediaPath);
      if (!mediaFile) {
        bundle.embeddedMedia[key] = {
          ...entry,
          error: 'ZIP 存档缺少对应图片文件。'
        };
        return;
      }

      const bytes = await mediaFile.async('arraybuffer');
      const blob = new Blob([bytes], { type: entry.contentType || 'application/octet-stream' });

      await options.saveMediaBlob(key, blob);
      bundle.embeddedMedia[key] = {
        ...entry,
        url: createStoredMediaUrl(key)
      };

      if (key.startsWith('event:')) {
        const eventId = key.slice('event:'.length);
        bundle.gameState.event.generatedImages[eventId] = createStoredMediaUrl(key);
        return;
      }

      if (key.startsWith('task:') && bundle.gameState.task.activeTask?.id === key.slice('task:'.length)) {
        bundle.gameState.task.activeTask.generatedImageUrl = createStoredMediaUrl(key);
      }
    })
  );

  return bundle;
};

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
