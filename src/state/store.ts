import { worldData } from '../data/world';
import type { EventPhase, GeneratedEvent, Mode, Scene, SceneEventSeed, TimeSlot } from '../data/types';

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
    currentPage: 'game' | 'settings' | 'event-details';
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
    hour: number;
    minute: number;
    timeSlot: TimeSlot;
    label: string;
  };
  world: {
    revision: number;
    lastEventSummary: string;
  };
  event: {
    activeEvent: GeneratedEvent | null;
    sceneEventCache: Record<string, GeneratedEvent>;
    generatedImages: Record<string, string>;
    transcript: TranscriptMessage[];
    streamingReply: string;
    streamingLabel: string;
    readyToEnd: boolean;
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
}

const EVENT_PHASE_ORDER: EventPhase[] = ['opening', 'build_up', 'overlimit', 'resolution'];
const NON_POSITIONAL_CASTS = new Set(['旁白', '系统']);

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
    hour: 18,
    minute: 0,
    timeSlot: resolveTimeSlot(18),
    label: formatClockLabel(18, 0)
  },
  world: {
    revision: 0,
    lastEventSummary: '世界还很安静，今天的故事刚准备开始。'
  },
  event: {
    activeEvent: null,
    sceneEventCache: {},
    generatedImages: {},
    transcript: [],
    streamingReply: '',
    streamingLabel: '',
    readyToEnd: false
  },
  memory: {
    summary: '你刚开始在这座城市里探索，故事还没有真正展开。',
    facts: []
  },
  settings: {
    availableModels: ['deepseek-reasoner', 'deepseek-chat', 'gpt-4o-mini', 'gpt-4.1-mini', 'claude-3.5-sonnet'],
    currentModel: 'deepseek-chat',
    streamCharsPerSecond: 17
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
  const scene = worldData.scenes.find((item) => item.id === sceneId);

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
    revision: state.world.revision + 1,
    lastEventSummary: reason
  }
});

export const setClockHour = (state: GameState, hour: number): GameState => ({
  ...state,
  clock: {
    hour,
    minute: 0,
    timeSlot: resolveTimeSlot(hour),
    label: formatClockLabel(hour, 0)
  }
});

export const advanceClockByMinutes = (state: GameState, minutesElapsed: number): GameState => {
  const startTotalMinutes = state.clock.hour * 60 + state.clock.minute;
  const nextTotalMinutes = Math.max(0, startTotalMinutes + Math.max(0, Math.round(minutesElapsed)));
  const nextHour = Math.floor(nextTotalMinutes / 60) % 24;
  const nextMinute = nextTotalMinutes % 60;

  return {
    ...state,
    clock: {
      hour: nextHour,
      minute: nextMinute,
      timeSlot: resolveTimeSlot(nextHour),
      label: formatClockLabel(nextHour, nextMinute)
    }
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

export const finishEventImageGeneration = (state: GameState, eventId: string, imageUrl: string): GameState => ({
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
      transcript: [],
      streamingReply: '',
      streamingLabel: '',
      readyToEnd: false
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

export const closeSettingsPage = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    currentPage: 'game',
    isModelMenuOpen: false,
    isStreamSpeedMenuOpen: false
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
