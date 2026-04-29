import { createInitialWorldData } from '../data/world';
import { createInitialPlayerState } from '../player/initialState';
import { syncLegacyStats, upsertStatInGroups } from '../player/stats';
import type { GameEffect, PlayerState, PlayerStat, PlayerStatGroup } from '../player/types';
import type {
  CharacterProfile,
  EventPhase,
  GeneratedEvent,
  Mode,
  Region,
  Scene,
  SceneEventSeed,
  TaskControlMode,
  TaskExecutionMode,
  TaskRuntime,
  TaskSegment,
  TimeSlot,
  WorldData
} from '../data/types';

export interface TranscriptMessage {
  role: 'player' | 'character' | 'system';
  label: string;
  content: string;
}

export interface GameState {
  navigation: {
    currentRegionId: string | null;
    currentSceneId: string | null;
  };
  ui: {
    currentPage:
      | 'game'
      | 'settings'
      | 'event-details'
      | 'image-prompt'
      | 'task-planning'
      | 'task-running'
      | 'decision'
      | 'character';
    mode: Mode;
    isModelMenuOpen: boolean;
    isStreamSpeedMenuOpen: boolean;
    isSending: boolean;
    generatingSceneIds: string[];
    sceneGenerationErrors: Record<string, string>;
    sceneSummary: {
      sceneId: string | null;
      content: string | null;
    };
    eventImageGeneration: {
      eventId: string | null;
      isGenerating: boolean;
      error: string | null;
    };
  };
  clock: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    timeSlot: TimeSlot;
    label: string;
  };
  world: {
    data: WorldData;
    revision: number;
    lastEventSummary: string;
  };
  event: {
    activeEvent: GeneratedEvent | null;
    sceneEventCache: Record<string, GeneratedEvent>;
    generatedImages: Record<string, string>;
    generatedImagePrompts: Record<string, string>;
    transcript: TranscriptMessage[];
    streamingReply: string;
    streamingLabel: string;
    readyToEnd: boolean;
  };
  task: {
    activeTask: TaskRuntime | null;
    lastCompletedSummary: string;
    lastCompletedFacts: string[];
    error: string | null;
  };
  memory: {
    summary: string;
    facts: string[];
  };
  settings: {
    availableModels: string[];
    currentModel: string;
    streamCharsPerSecond: number;
  };
  player: PlayerState;
  settlement: {
    lastEffects: GameEffect[];
    lastSummary: string;
  };
}

const EVENT_PHASE_ORDER: EventPhase[] = ['opening', 'build_up', 'overlimit', 'resolution'];
const NON_POSITIONAL_CASTS = new Set(['旁白', '系统']);
const INITIAL_GAME_CLOCK = {
  year: 2026,
  month: 4,
  day: 29,
  hour: 18,
  minute: 0
};

const getPhaseFromTurnCount = (turnCount: number): EventPhase => {
  if (turnCount >= 4) {
    return 'resolution';
  }

  if (turnCount >= 2) {
    return 'overlimit';
  }

  if (turnCount >= 1) {
    return 'build_up';
  }

  return 'opening';
};

const withActiveEvent = (state: GameState, updater: (event: GeneratedEvent) => GeneratedEvent): GameState => {
  if (!state.event.activeEvent) {
    return state;
  }

  const nextEvent = updater(state.event.activeEvent);

  return {
    ...state,
    event: {
      ...state.event,
      activeEvent: nextEvent,
      sceneEventCache: {
        ...state.event.sceneEventCache,
        [nextEvent.sceneId]: nextEvent
      }
    }
  };
};

export const resolveTimeSlot = (hour: number): TimeSlot => {
  if (hour < 6) {
    return 'late_night';
  }

  if (hour < 9) {
    return 'dawn';
  }

  if (hour < 12) {
    return 'morning';
  }

  if (hour < 18) {
    return 'afternoon';
  }

  if (hour < 21) {
    return 'evening';
  }

  return 'night';
};

export const formatClockLabel = (hour: number, minute = 0): string => {
  const timeSlot = resolveTimeSlot(hour);
  const prefix = {
    dawn: '清晨',
    morning: '上午',
    afternoon: '下午',
    evening: '傍晚',
    night: '晚上',
    late_night: '深夜'
  }[timeSlot];

  return `${prefix} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const formatFullClockLabel = (year: number, month: number, day: number, hour: number, minute = 0): string =>
  `${year}年${month}月${day}日 ${formatClockLabel(hour, minute)}`;

export const getClockTotalMinutes = (clock: Pick<GameState['clock'], 'year' | 'month' | 'day' | 'hour' | 'minute'>): number =>
  Math.floor(Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute) / 60000);

export const createClockFromTotalMinutes = (minutes: number): GameState['clock'] => {
  const date = new Date(Math.max(0, Math.round(minutes)) * 60000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  return {
    year,
    month,
    day,
    hour,
    minute,
    timeSlot: resolveTimeSlot(hour),
    label: formatFullClockLabel(year, month, day, hour, minute)
  };
};

export const createClockState = (
  year = INITIAL_GAME_CLOCK.year,
  month = INITIAL_GAME_CLOCK.month,
  day = INITIAL_GAME_CLOCK.day,
  hour = INITIAL_GAME_CLOCK.hour,
  minute = INITIAL_GAME_CLOCK.minute
): GameState['clock'] =>
  createClockFromTotalMinutes(
    Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 60000)
  );

export const normalizeClockState = (clock: Partial<GameState['clock']> | null | undefined): GameState['clock'] => {
  const fallback = createClockState();
  const year = Number.isFinite(clock?.year) ? Number(clock?.year) : fallback.year;
  const month = Number.isFinite(clock?.month) ? Number(clock?.month) : fallback.month;
  const day = Number.isFinite(clock?.day) ? Number(clock?.day) : fallback.day;
  const hour = Number.isFinite(clock?.hour) ? Number(clock?.hour) : fallback.hour;
  const minute = Number.isFinite(clock?.minute) ? Number(clock?.minute) : fallback.minute;

  return createClockState(year, month, day, hour, minute);
};

export const normalizeClockMinutes = (minutes: number): number => {
  const dayMinutes = 24 * 60;
  const rounded = Math.round(minutes);

  return ((rounded % dayMinutes) + dayMinutes) % dayMinutes;
};

export const formatMinutesClockLabel = (minutes: number): string => {
  const normalized = normalizeClockMinutes(minutes);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return formatClockLabel(hour, minute);
};

export const formatTaskClockLabel = (minutes: number): string => {
  return createClockFromTotalMinutes(minutes).label;
};

export const formatDurationMinutesLabel = (minutes: number): string => {
  let remaining = Math.max(1, Math.round(minutes));
  const years = Math.floor(remaining / (365 * 24 * 60));
  remaining -= years * 365 * 24 * 60;
  const days = Math.floor(remaining / (24 * 60));
  remaining -= days * 24 * 60;
  const hours = Math.floor(remaining / 60);
  remaining -= hours * 60;
  const parts = [
    years > 0 ? `${years}年` : '',
    days > 0 ? `${days}天` : '',
    hours > 0 ? `${hours}小时` : '',
    remaining > 0 ? `${remaining}分钟` : ''
  ].filter(Boolean);

  return parts.join('') || '1分钟';
};

export const createInitialState = (): GameState => ({
  navigation: {
    currentRegionId: null,
    currentSceneId: null
  },
  ui: {
    currentPage: 'game',
    mode: 'explore',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false,
    isSending: false,
    generatingSceneIds: [],
    sceneGenerationErrors: {},
    sceneSummary: {
      sceneId: null,
      content: null
    },
    eventImageGeneration: {
      eventId: null,
      isGenerating: false,
      error: null
    }
  },
  clock: {
    ...createClockState()
  },
  world: {
    data: createInitialWorldData(),
    revision: 0,
    lastEventSummary: '世界还很安静，今天的故事刚准备开始。'
  },
  event: {
    activeEvent: null,
    sceneEventCache: {},
    generatedImages: {},
    generatedImagePrompts: {},
    transcript: [],
    streamingReply: '',
    streamingLabel: '',
    readyToEnd: false
  },
  task: {
    activeTask: null,
    lastCompletedSummary: '',
    lastCompletedFacts: [],
    error: null
  },
  memory: {
    summary: '你刚开始在这座城市里探索，故事还没有真正展开。',
    facts: []
  },
  settings: {
    availableModels: ['deepseek-reasoner', 'deepseek-chat', 'gpt-4o-mini', 'gpt-4.1-mini', 'claude-3.5-sonnet'],
    currentModel: 'deepseek-chat',
    streamCharsPerSecond: 17
  },
  player: createInitialPlayerState(),
  settlement: {
    lastEffects: [],
    lastSummary: ''
  }
});

export const enterRegion = (state: GameState, regionId: string): GameState => ({
  ...state,
  navigation: {
    currentRegionId: regionId,
    currentSceneId: null
  },
  ui: {
    ...state.ui,
    currentPage: 'game',
    mode: 'explore',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false,
    isSending: false,
    sceneSummary: {
      sceneId: null,
      content: null
    }
  }
});

export const enterScene = (state: GameState, sceneId: string): GameState => {
  const scene = state.world.data.scenes.find((item) => item.id === sceneId);

  if (!scene) {
    return state;
  }

  return {
    ...state,
    navigation: {
      currentRegionId: scene.regionId,
      currentSceneId: sceneId
    }
  };
};

export const cacheSceneEvent = (state: GameState, event: GeneratedEvent): GameState => {
  const stampedEvent: GeneratedEvent = {
    ...event,
    status: 'seeded',
    snapshot: {
      ...event.snapshot,
      worldRevision: state.world.revision
    }
  };

  return {
    ...state,
    world: {
      ...state.world,
      lastEventSummary: `在${stampedEvent.locationLabel}生成了新的事件骨架：${stampedEvent.title}`
    },
    event: {
      ...state.event,
      sceneEventCache: {
        ...state.event.sceneEventCache,
        [event.sceneId]: stampedEvent
      }
    }
  };
};

export const isSceneEventReusable = (state: GameState, sceneId: string): boolean => {
  const cachedEvent = state.event.sceneEventCache[sceneId];

  if (!cachedEvent) {
    return false;
  }

  if (cachedEvent.status === 'stale' || cachedEvent.status === 'resolved') {
    return false;
  }

  return cachedEvent.snapshot.timeSlot === state.clock.timeSlot && cachedEvent.snapshot.worldRevision === state.world.revision;
};

export const findCharacterScene = (state: GameState, characterId: string, excludedSceneId?: string): string | null => {
  if (NON_POSITIONAL_CASTS.has(characterId)) {
    return null;
  }

  const match = Object.values(state.event.sceneEventCache).find((event) => {
    if (event.sceneId === excludedSceneId) {
      return false;
    }

    if (event.status === 'stale' || event.status === 'resolved') {
      return false;
    }

    if (event.snapshot.timeSlot !== state.clock.timeSlot || event.snapshot.worldRevision !== state.world.revision) {
      return false;
    }

    return event.cast.includes(characterId);
  });

  return match?.sceneId ?? null;
};

export const selectSceneEventSeed = (state: GameState, scene: Scene): SceneEventSeed => {
  const conflictingCast = scene.eventSeed.castIds.find((characterId) => findCharacterScene(state, characterId, scene.id));

  if (conflictingCast && scene.fallbackEventSeed) {
    return scene.fallbackEventSeed;
  }

  return scene.eventSeed;
};

export const invalidateSceneEventCache = (state: GameState, sceneId: string): GameState => {
  const cachedEvent = state.event.sceneEventCache[sceneId];

  if (!cachedEvent) {
    return state;
  }

  return {
    ...state,
    event: {
      ...state.event,
      sceneEventCache: {
        ...state.event.sceneEventCache,
        [sceneId]: {
          ...cachedEvent,
          status: 'stale'
        }
      }
    }
  };
};

export const recordWorldAdvance = (state: GameState, reason: string): GameState => ({
  ...state,
  world: {
    ...state.world,
    revision: state.world.revision + 1,
    lastEventSummary: reason
  }
});

const markSceneCacheStale = (
  cache: Record<string, GeneratedEvent>,
  sceneIds: string[] | null = null
): Record<string, GeneratedEvent> =>
  Object.fromEntries(
    Object.entries(cache).map(([sceneId, event]) => [
      sceneId,
      !sceneIds || sceneIds.includes(sceneId)
        ? {
            ...event,
            status: event.status === 'resolved' ? event.status : 'stale'
          }
        : event
    ])
  );

const pruneSceneCache = (cache: Record<string, GeneratedEvent>, sceneIds: string[]): Record<string, GeneratedEvent> =>
  Object.fromEntries(Object.entries(cache).filter(([sceneId]) => !sceneIds.includes(sceneId)));

export const upsertRegion = (state: GameState, region: Region): GameState => {
  const id = region.id.trim();
  const name = region.name.trim();

  if (!id || !name) {
    return state;
  }

  const existing = state.world.data.regions.find((item) => item.id === id);
  const nextRegion: Region = {
    ...existing,
    ...region,
    id,
    name,
    sceneIds: Array.from(new Set(region.sceneIds ?? existing?.sceneIds ?? []))
  };
  const regions = existing
    ? state.world.data.regions.map((item) => (item.id === id ? nextRegion : item))
    : [...state.world.data.regions, nextRegion];

  return {
    ...state,
    world: {
      data: {
        ...state.world.data,
        regions
      },
      revision: state.world.revision + 1,
      lastEventSummary: `世界结构已更新：${nextRegion.name}`
    },
    event: {
      ...state.event,
      sceneEventCache: markSceneCacheStale(state.event.sceneEventCache)
    }
  };
};

export const upsertScene = (state: GameState, scene: Scene): GameState => {
  const id = scene.id.trim();
  const regionId = scene.regionId.trim();
  const name = scene.name.trim();

  if (!id || !regionId || !name) {
    return state;
  }

  const existingScene = state.world.data.scenes.find((item) => item.id === id);
  const scenes = existingScene
    ? state.world.data.scenes.map((item) => (item.id === id ? { ...existingScene, ...scene, id, regionId, name } : item))
    : [...state.world.data.scenes, { ...scene, id, regionId, name }];
  const regions = state.world.data.regions.map((region) =>
    region.id === regionId
      ? {
          ...region,
          sceneIds: Array.from(new Set([...region.sceneIds, id]))
        }
      : existingScene?.regionId === region.id
        ? {
            ...region,
            sceneIds: region.sceneIds.filter((sceneId) => sceneId !== id)
          }
        : region
  );

  return {
    ...state,
    navigation:
      existingScene && existingScene.regionId !== regionId && state.navigation.currentSceneId === id
        ? {
            currentRegionId: regionId,
            currentSceneId: id
          }
        : state.navigation,
    world: {
      data: {
        ...state.world.data,
        regions,
        scenes
      },
      revision: state.world.revision + 1,
      lastEventSummary: `场景结构已更新：${name}`
    },
    event: {
      ...state.event,
      sceneEventCache: markSceneCacheStale(state.event.sceneEventCache, [id])
    },
    ui: {
      ...state.ui,
      sceneGenerationErrors: Object.fromEntries(
        Object.entries(state.ui.sceneGenerationErrors).filter(([sceneId]) => sceneId !== id)
      )
    }
  };
};

export const removeScene = (state: GameState, sceneId: string): GameState => {
  const existingScene = state.world.data.scenes.find((item) => item.id === sceneId);

  if (!existingScene) {
    return state;
  }

  const nextNavigation =
    state.navigation.currentSceneId === sceneId
      ? {
          currentRegionId: existingScene.regionId,
          currentSceneId: null
        }
      : state.navigation;

  return {
    ...state,
    navigation: nextNavigation,
    world: {
      data: {
        ...state.world.data,
        regions: state.world.data.regions.map((region) => ({
          ...region,
          sceneIds: region.sceneIds.filter((id) => id !== sceneId)
        })),
        scenes: state.world.data.scenes.filter((scene) => scene.id !== sceneId)
      },
      revision: state.world.revision + 1,
      lastEventSummary: `场景已移除：${existingScene.name}`
    },
    event: {
      ...state.event,
      activeEvent: state.event.activeEvent?.sceneId === sceneId ? null : state.event.activeEvent,
      sceneEventCache: pruneSceneCache(state.event.sceneEventCache, [sceneId])
    },
    ui: {
      ...state.ui,
      generatingSceneIds: state.ui.generatingSceneIds.filter((id) => id !== sceneId),
      sceneGenerationErrors: Object.fromEntries(
        Object.entries(state.ui.sceneGenerationErrors).filter(([id]) => id !== sceneId)
      ),
      sceneSummary: state.ui.sceneSummary.sceneId === sceneId ? { sceneId: null, content: null } : state.ui.sceneSummary
    }
  };
};

export const removeRegion = (state: GameState, regionId: string): GameState => {
  const existingRegion = state.world.data.regions.find((item) => item.id === regionId);

  if (!existingRegion) {
    return state;
  }

  const removedSceneIds = state.world.data.scenes
    .filter((scene) => scene.regionId === regionId || existingRegion.sceneIds.includes(scene.id))
    .map((scene) => scene.id);

  return {
    ...state,
    navigation:
      state.navigation.currentRegionId === regionId
        ? {
            currentRegionId: null,
            currentSceneId: null
          }
        : state.navigation,
    world: {
      data: {
        ...state.world.data,
        regions: state.world.data.regions.filter((region) => region.id !== regionId),
        scenes: state.world.data.scenes.filter((scene) => !removedSceneIds.includes(scene.id))
      },
      revision: state.world.revision + 1,
      lastEventSummary: `区域已移除：${existingRegion.name}`
    },
    event: {
      ...state.event,
      activeEvent: state.event.activeEvent && removedSceneIds.includes(state.event.activeEvent.sceneId) ? null : state.event.activeEvent,
      sceneEventCache: pruneSceneCache(state.event.sceneEventCache, removedSceneIds)
    },
    ui: {
      ...state.ui,
      generatingSceneIds: state.ui.generatingSceneIds.filter((id) => !removedSceneIds.includes(id)),
      sceneGenerationErrors: Object.fromEntries(
        Object.entries(state.ui.sceneGenerationErrors).filter(([id]) => !removedSceneIds.includes(id))
      ),
      sceneSummary:
        state.ui.sceneSummary.sceneId && removedSceneIds.includes(state.ui.sceneSummary.sceneId)
          ? { sceneId: null, content: null }
          : state.ui.sceneSummary
    }
  };
};

export const upsertCharacter = (state: GameState, character: CharacterProfile): GameState => {
  const id = character.id.trim();
  const name = character.name.trim();

  if (!id || !name) {
    return state;
  }

  const existing = state.world.data.characters.find((item) => item.id === id);
  const characters = existing
    ? state.world.data.characters.map((item) => (item.id === id ? { ...existing, ...character, id, name } : item))
    : [...state.world.data.characters, { ...character, id, name }];

  return {
    ...state,
    world: {
      data: {
        ...state.world.data,
        characters
      },
      revision: state.world.revision + 1,
      lastEventSummary: `人物结构已更新：${name}`
    },
    event: {
      ...state.event,
      sceneEventCache: markSceneCacheStale(state.event.sceneEventCache)
    }
  };
};

export const upsertPlayerStatGroup = (state: GameState, group: PlayerStatGroup): GameState => {
  const id = group.id.trim();
  const label = group.label.trim();

  if (!id || !label) {
    return state;
  }

  const existing = state.player.statGroups.find((item) => item.id === id);
  const statGroups = existing
    ? state.player.statGroups.map((item) =>
        item.id === id
          ? {
              ...existing,
              ...group,
              id,
              label,
              stats: group.stats.map((stat) => ({ ...stat }))
            }
          : item
      )
    : [
        ...state.player.statGroups,
        {
          ...group,
          id,
          label,
          stats: group.stats.map((stat) => ({ ...stat }))
        }
      ];

  return {
    ...state,
    player: syncLegacyStats({
      ...state.player,
      statGroups
    })
  };
};

export const upsertPlayerStat = (
  state: GameState,
  groupId: string,
  stat: PlayerStat & { groupLabel?: string }
): GameState => ({
  ...state,
  player: syncLegacyStats({
    ...state.player,
    statGroups: upsertStatInGroups(state.player.statGroups, {
      groupId,
      groupLabel: stat.groupLabel,
      statId: stat.id,
      label: stat.label,
      value: stat.value,
      description: stat.description
    })
  })
});

export const setClockHour = (state: GameState, hour: number): GameState => ({
  ...state,
  clock: createClockState(state.clock.year, state.clock.month, state.clock.day, hour, 0)
});

export const advanceClockByMinutes = (state: GameState, minutesElapsed: number): GameState => {
  const startTotalMinutes = getClockTotalMinutes(state.clock);
  const nextTotalMinutes = Math.max(0, startTotalMinutes + Math.max(0, Math.round(minutesElapsed)));

  return {
    ...state,
    clock: createClockFromTotalMinutes(nextTotalMinutes)
  };
};

export const startEvent = (state: GameState, event: GeneratedEvent): GameState => {
  const activatedEvent: GeneratedEvent = {
    ...event,
    status: 'active'
  };

  return {
    ...state,
    ui: {
      ...state.ui,
      mode: 'event',
      isModelMenuOpen: false,
      isSending: false,
      sceneSummary: {
        sceneId: null,
        content: null
      }
    },
    event: {
      ...state.event,
      activeEvent: activatedEvent,
      sceneEventCache: {
        ...state.event.sceneEventCache,
        [activatedEvent.sceneId]: activatedEvent
      },
      transcript: [],
      streamingReply: '',
      streamingLabel: '',
      readyToEnd: false
    }
  };
};

export const startEventImageGeneration = (state: GameState, eventId: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    eventImageGeneration: {
      eventId,
      isGenerating: true,
      error: null
    }
  }
});

export const finishEventImageGeneration = (state: GameState, eventId: string, imageUrl: string, prompt = ''): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    eventImageGeneration: {
      eventId,
      isGenerating: false,
      error: null
    }
  },
  event: {
    ...state.event,
    generatedImages: {
      ...state.event.generatedImages,
      [eventId]: imageUrl
    },
    generatedImagePrompts: {
      ...state.event.generatedImagePrompts,
      ...(prompt.trim() ? { [eventId]: prompt.trim() } : {})
    }
  }
});

export const failEventImageGeneration = (state: GameState, eventId: string, error: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    eventImageGeneration: {
      eventId,
      isGenerating: false,
      error
    }
  }
});

export const endEvent = (state: GameState): GameState => {
  const resolvedEvent = state.event.activeEvent
    ? {
        ...state.event.activeEvent,
        status: 'resolved' as const
      }
    : null;

  return {
    ...state,
    ui: {
      ...state.ui,
      mode: 'explore',
      isModelMenuOpen: false,
      isSending: false
    },
    event: {
      activeEvent: null,
      sceneEventCache: resolvedEvent
        ? {
            ...state.event.sceneEventCache,
            [resolvedEvent.sceneId]: resolvedEvent
          }
        : state.event.sceneEventCache,
      generatedImages: state.event.generatedImages,
      generatedImagePrompts: state.event.generatedImagePrompts,
      transcript: [],
      streamingReply: '',
      streamingLabel: '',
      readyToEnd: false
    }
  };
};

export const openTaskPlanningPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'task-planning',
    mode: 'explore',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false,
    isSending: false
  },
  task: {
    ...state.task,
    error: null
  }
});

export const openDecisionPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'decision',
    mode: 'explore',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false,
    isSending: false
  }
});

export const startTask = (
  state: GameState,
  input: {
    content: string;
    startMinutes: number;
    executionMode: TaskExecutionMode;
    durationMinutes: number;
    segmentCount: number;
  }
): GameState => {
  const content = input.content.trim();
  const title = content.length > 18 ? `${content.slice(0, 18)}...` : content;
  const startMinutes = Math.max(0, Math.round(input.startMinutes));
  const durationMinutes = Number.isFinite(input.durationMinutes) ? Math.max(1, Math.round(input.durationMinutes)) : 60;
  const endMinutes = startMinutes + durationMinutes;
  const segmentCount = Number.isFinite(input.segmentCount)
    ? Math.max(1, Math.min(durationMinutes, Math.round(input.segmentCount)))
    : 1;

  return {
    ...state,
    ui: {
      ...state.ui,
      currentPage: 'task-running',
      mode: 'task',
      isSending: true,
      isModelMenuOpen: false,
      isStreamSpeedMenuOpen: false
    },
    task: {
      activeTask: {
        id: `task-${Date.now()}`,
        title: title || '未命名任务',
        content,
        startMinutes,
        endMinutes,
        currentMinutes: startMinutes,
        durationMinutes,
        segmentCount,
        executionMode: input.executionMode,
        controlMode: 'auto',
        status: 'running',
        summary: '',
        facts: [],
        generatedImageUrl: null,
        generatedImagePrompt: '',
        imageGeneration: {
          isGenerating: false,
          error: null
        },
        segments: [],
        transcript: [],
        streamingReply: '',
        streamingLabel: ''
      },
      lastCompletedSummary: state.task.lastCompletedSummary,
      lastCompletedFacts: state.task.lastCompletedFacts,
      error: null
    }
  };
};

export const setTaskError = (state: GameState, message: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isSending: false
  },
  task: {
    ...state.task,
    error: message
  }
});

export const startTaskImageGeneration = (state: GameState): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    task: {
      ...state.task,
      activeTask: {
        ...state.task.activeTask,
        imageGeneration: {
          isGenerating: true,
          error: null
        }
      }
    }
  };
};

export const finishTaskImageGeneration = (state: GameState, imageUrl: string, prompt = ''): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    task: {
      ...state.task,
      activeTask: {
        ...state.task.activeTask,
        generatedImageUrl: imageUrl,
        generatedImagePrompt: prompt.trim() || state.task.activeTask.generatedImagePrompt,
        imageGeneration: {
          isGenerating: false,
          error: null
        }
      }
    }
  };
};

export const failTaskImageGeneration = (state: GameState, error: string): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    task: {
      ...state.task,
      activeTask: {
        ...state.task.activeTask,
        imageGeneration: {
          isGenerating: false,
          error
        }
      }
    }
  };
};

export const startTaskRequest = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isSending: true
  },
  task: {
    ...state.task,
    error: null
  }
});

export const finishTaskRequest = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isSending: false
  }
});

export const appendTaskSegment = (state: GameState, segment: TaskSegment, toMinutes: number): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    ui: {
      ...state.ui,
      isSending: false
    },
    task: {
      ...state.task,
      error: null,
      activeTask: {
        ...state.task.activeTask,
        currentMinutes: Math.min(toMinutes, state.task.activeTask.endMinutes),
        segments: [...state.task.activeTask.segments, segment],
        facts: Array.from(
          new Set([
            ...state.task.activeTask.facts,
            `任务片段 ${segment.fromLabel}-${segment.toLabel}：${segment.content}`,
            ...(segment.complication ? [`任务中出现插曲：${segment.complication}`] : [])
          ])
        )
      }
    }
  };
};

export const setTaskControlMode = (state: GameState, controlMode: TaskControlMode): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    task: {
      ...state.task,
      activeTask: {
        ...state.task.activeTask,
        controlMode
      }
    }
  };
};

export const appendTaskTranscriptMessage = (state: GameState, entry: TranscriptMessage): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    task: {
      ...state.task,
      activeTask: {
        ...state.task.activeTask,
        transcript: [...state.task.activeTask.transcript, entry]
      }
    }
  };
};

export const startTaskStreamingReply = (state: GameState, label: string): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    ui: {
      ...state.ui,
      isSending: true
    },
    task: {
      ...state.task,
      error: null,
      activeTask: {
        ...state.task.activeTask,
        streamingReply: '',
        streamingLabel: label
      }
    }
  };
};

export const appendTaskStreamingReply = (state: GameState, chunk: string): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  return {
    ...state,
    task: {
      ...state.task,
      activeTask: {
        ...state.task.activeTask,
        streamingReply: `${state.task.activeTask.streamingReply}${chunk}`
      }
    }
  };
};

export const finishTaskStreamingReply = (state: GameState): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  const reply = state.task.activeTask.streamingReply.trim();

  return {
    ...state,
    ui: {
      ...state.ui,
      isSending: false
    },
    task: {
      ...state.task,
      activeTask: {
        ...state.task.activeTask,
        transcript: reply
          ? [
              ...state.task.activeTask.transcript,
              {
                role: 'character',
                label: state.task.activeTask.streamingLabel || '世界',
                content: reply
              }
            ]
          : state.task.activeTask.transcript,
        facts: reply
          ? Array.from(new Set([...state.task.activeTask.facts, `手动托管推进：${reply}`]))
          : state.task.activeTask.facts,
        streamingReply: '',
        streamingLabel: ''
      }
    }
  };
};

export const completeTask = (state: GameState, summary: string, facts: string[]): GameState => {
  if (!state.task.activeTask) {
    return state;
  }

  const nextFacts = Array.from(new Set([...state.task.activeTask.facts, ...facts.filter(Boolean)]));
  const endMinutes = state.task.activeTask.endMinutes;

  return {
    ...state,
    ui: {
      ...state.ui,
      currentPage: 'decision',
      mode: 'explore',
      isSending: false,
      isModelMenuOpen: false,
      isStreamSpeedMenuOpen: false
    },
    clock: createClockFromTotalMinutes(endMinutes),
    world: {
      ...state.world,
      revision: state.world.revision + 1,
      lastEventSummary: `任务【${state.task.activeTask.title}】已经完成。${summary}`
    },
    memory: {
      summary: summary || state.memory.summary,
      facts: Array.from(new Set([...state.memory.facts, ...nextFacts])).slice(-12)
    },
    task: {
      activeTask: {
        ...state.task.activeTask,
        currentMinutes: state.task.activeTask.endMinutes,
        status: 'completed',
        summary,
        facts: nextFacts,
        streamingReply: '',
        streamingLabel: ''
      },
      lastCompletedSummary: summary,
      lastCompletedFacts: nextFacts,
      error: null
    }
  };
};

export const updateMemory = (
  state: GameState,
  memory: {
    summary: string;
    facts: string[];
  }
): GameState => ({
  ...state,
  memory
});

export const setSceneSummary = (state: GameState, sceneId: string, content: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    sceneSummary: {
      sceneId,
      content
    }
  }
});

export const startSceneGeneration = (state: GameState, sceneId: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    generatingSceneIds: state.ui.generatingSceneIds.includes(sceneId)
      ? state.ui.generatingSceneIds
      : [...state.ui.generatingSceneIds, sceneId],
    sceneGenerationErrors: Object.fromEntries(
      Object.entries(state.ui.sceneGenerationErrors).filter(([key]) => key !== sceneId)
    )
  }
});

export const finishSceneGeneration = (state: GameState, sceneId: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    generatingSceneIds: state.ui.generatingSceneIds.filter((id) => id !== sceneId)
  }
});

export const setSceneGenerationError = (state: GameState, sceneId: string, message: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    generatingSceneIds: state.ui.generatingSceneIds.filter((id) => id !== sceneId),
    sceneGenerationErrors: {
      ...state.ui.sceneGenerationErrors,
      [sceneId]: message
    }
  }
});

export const appendTranscriptMessage = (state: GameState, entry: TranscriptMessage): GameState => ({
  ...state,
  event: {
    ...state.event,
    transcript: [...state.event.transcript, entry]
  }
});

export const toggleModelMenu = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isModelMenuOpen: !state.ui.isModelMenuOpen,
    isStreamSpeedMenuOpen: false
  }
});

export const setCurrentModel = (state: GameState, model: string): GameState => ({
  ...state,
  settings: {
    ...state.settings,
    currentModel: model
  },
  ui: {
    ...state.ui,
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false
  }
});

export const openSettingsPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'settings',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false
  }
});

export const openEventDetailsPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'event-details',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false
  }
});

export const openImagePromptPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'image-prompt',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false
  }
});

export const openCharacterPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'character',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false
  }
});

export const closeSettingsPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'game',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false
  }
});

export const setPlayerState = (state: GameState, player: PlayerState): GameState => ({
  ...state,
  player
});

export const recordSettlementEffects = (state: GameState, summary: string, effects: GameEffect[]): GameState => ({
  ...state,
  settlement: {
    lastSummary: summary,
    lastEffects: effects
  }
});

export const toggleStreamSpeedMenu = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: !state.ui.isStreamSpeedMenuOpen
  }
});

export const setStreamCharsPerSecond = (state: GameState, value: number): GameState => ({
  ...state,
  settings: {
    ...state.settings,
    streamCharsPerSecond: value
  },
  ui: {
    ...state.ui,
    isStreamSpeedMenuOpen: false
  }
});

export const startStreamingReply = (state: GameState, label: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isSending: true
  },
  event: {
    ...state.event,
    streamingReply: '',
    streamingLabel: label,
    readyToEnd: false
  }
});

export const appendStreamingReply = (state: GameState, chunk: string): GameState => ({
  ...state,
  event: {
    ...state.event,
    streamingReply: `${state.event.streamingReply}${chunk}`
  }
});

export const finishStreamingReply = (state: GameState): GameState =>
  withActiveEvent(
    {
      ...state,
      ui: {
        ...state.ui,
        isSending: false
      },
      event: {
        ...state.event,
        transcript: state.event.streamingReply
          ? [
              ...state.event.transcript,
              {
                role: 'character',
                label: state.event.streamingLabel || '角色',
                content: state.event.streamingReply
              }
            ]
          : state.event.transcript,
        streamingReply: '',
        streamingLabel: '',
        readyToEnd: state.event.readyToEnd
      }
    },
    (activeEvent) => {
      const nextTurnCount = activeEvent.turnCount + 1;
      const nextPhase = getPhaseFromTurnCount(nextTurnCount);

      return {
        ...activeEvent,
        turnCount: nextTurnCount,
        currentPhase: nextPhase,
        phaseHistory: activeEvent.phaseHistory.includes(nextPhase)
          ? activeEvent.phaseHistory
          : [...activeEvent.phaseHistory, nextPhase],
        facts:
          nextPhase !== activeEvent.currentPhase
            ? [...activeEvent.facts, `剧情阶段进入${nextPhase}`]
            : activeEvent.facts
      };
    }
  );

export const failStreamingReply = (state: GameState, message: string): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    isSending: false
  },
  event: {
    ...state.event,
    transcript: [...state.event.transcript, { role: 'system', label: '系统', content: `模型调用失败（${message}）` }],
    streamingReply: '',
    streamingLabel: '',
    readyToEnd: false
  }
});

export const markEventReadyToEnd = (state: GameState): GameState => ({
  ...state,
  event: {
    ...state.event,
    readyToEnd: true
  }
});

export const appendActiveEventFacts = (state: GameState, facts: string[]): GameState =>
  withActiveEvent(state, (activeEvent) => ({
    ...activeEvent,
    facts: Array.from(new Set([...activeEvent.facts, ...facts.filter(Boolean)]))
  }));

export const setActiveEventPhase = (state: GameState, phase: EventPhase): GameState =>
  withActiveEvent(state, (activeEvent) => ({
    ...activeEvent,
    currentPhase: phase,
    phaseHistory: activeEvent.phaseHistory.includes(phase) ? activeEvent.phaseHistory : [...activeEvent.phaseHistory, phase]
  }));

export const getPhaseTitle = (phase: EventPhase): string =>
  ({
    opening: '开场状态',
    build_up: '中段推进',
    overlimit: '超限触发',
    resolution: '收束余波'
  })[phase];

export const getNextPhase = (phase: EventPhase): EventPhase => {
  const currentIndex = EVENT_PHASE_ORDER.indexOf(phase);
  return EVENT_PHASE_ORDER[Math.min(currentIndex + 1, EVENT_PHASE_ORDER.length - 1)];
};
