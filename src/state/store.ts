import { worldData } from '../data/world';
import type { Mode } from '../data/types';

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
    mode: Mode;
    isModelMenuOpen: boolean;
    isSending: boolean;
  };
  event: {
    activeEventId: string | null;
    completedEventIds: string[];
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
  };
}

export const createInitialState = (): GameState => ({
  navigation: {
    currentRegionId: null,
    currentSceneId: null
  },
  ui: {
    mode: 'explore',
    isModelMenuOpen: false,
    isSending: false
  },
  event: {
    activeEventId: null,
    completedEventIds: [],
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
    currentModel: 'deepseek-reasoner'
  }
});

export const enterRegion = (state: GameState, regionId: string): GameState => ({
  ...state,
  navigation: {
    currentRegionId: regionId,
    currentSceneId: null
  },
  ui: {
    mode: 'explore',
    isModelMenuOpen: false,
    isSending: false
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

export const startEvent = (state: GameState, eventId: string): GameState => ({
  ...state,
  ui: {
    mode: 'event',
    isModelMenuOpen: false,
    isSending: false
  },
  event: {
    ...state.event,
    activeEventId: eventId,
    transcript: [],
    streamingReply: '',
    streamingLabel: '',
    readyToEnd: false
  }
});

export const endEvent = (state: GameState): GameState => ({
  ...state,
  ui: {
    mode: 'explore',
    isModelMenuOpen: false,
    isSending: false
  },
  event: {
    activeEventId: null,
    completedEventIds: state.event.activeEventId
      ? Array.from(new Set([...state.event.completedEventIds, state.event.activeEventId]))
      : state.event.completedEventIds,
    transcript: [],
    streamingReply: '',
    streamingLabel: '',
    readyToEnd: false
  }
});

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
    isModelMenuOpen: !state.ui.isModelMenuOpen
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
    isModelMenuOpen: false
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

export const finishStreamingReply = (state: GameState): GameState => ({
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
    readyToEnd: false
  }
});

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
