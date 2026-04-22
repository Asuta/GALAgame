import { worldData } from '../data/world';
import { requestStoryReplyStream, stripEventEndMarker } from '../logic/chatClient';
import { appendStreamWithRateLimit } from '../logic/streamDisplay';
import { loadStoredSettings, saveStoredSettings } from '../settings/storage';
import { compressMemory } from '../logic/memory';
import {
  appendStreamingReply,
  appendTranscriptMessage,
  createInitialState,
  endEvent,
  enterRegion,
  failStreamingReply,
  enterScene,
  finishStreamingReply,
  markEventReadyToEnd,
  setCurrentModel,
  setStreamCharsPerSecond,
  startEvent,
  startStreamingReply,
  toggleSettingsPanel,
  toggleModelMenu,
  updateMemory,
  type GameState
} from '../state/store';
import { renderApp } from './renderApp';

const resolveLocationLabel = (state: GameState): string => {
  const region = worldData.regions.find((item) => item.id === state.navigation.currentRegionId);
  const scene = worldData.scenes.find((item) => item.id === state.navigation.currentSceneId);
  return `${region?.name ?? '城市'}${scene ? ` / ${scene.name}` : ''}`;
};

const buildCharacterProfile = (name: string): string => {
  const character = worldData.characters.find((item) => item.name === name || item.id === name);

  if (!character) {
    return `角色名：${name}\n请严格保持该角色现有设定，不要擅自改变性别、身份与口吻。`;
  }

  return [
    `角色名：${character.name}`,
    `性别：${character.gender}`,
    `身份：${character.identity}`,
    `年龄：${character.age}`,
    `性格：${character.personality}`,
    `说话风格：${character.speakingStyle}`,
    `与玩家关系：${character.relationshipToPlayer}`,
    `硬约束：${character.hardRules.join('；')}`
  ].join('\n');
};

export const bindUi = (root: HTMLDivElement): void => {
  let state: GameState = createInitialState(loadStoredSettings());

  const runEventTurn = async (playerInput: string, intent: 'continue' | 'end_event') => {
    if (!state.event.activeEventId || state.ui.isSending) {
      return;
    }

    const activeEvent = worldData.events.find((item) => item.id === state.event.activeEventId);

    if (!activeEvent) {
      return;
    }

    state = appendTranscriptMessage(state, {
      role: 'player',
      label: '你',
      content: intent === 'end_event' ? '我准备结束这段对话，离开这里。' : playerInput
    });
    state = startStreamingReply(state, activeEvent.cast[0] || '角色');
    rerender();

    try {
      await appendStreamWithRateLimit({
        source: requestStoryReplyStream({
          model: state.settings.currentModel,
          characterProfile: buildCharacterProfile(activeEvent.cast[0]),
          memorySummary: state.memory.summary,
          memoryFacts: state.memory.facts,
          locationLabel: resolveLocationLabel(state),
          eventTitle: activeEvent.title,
          castName: activeEvent.cast[0],
          transcript: state.event.transcript.map((message) => `${message.label}：${message.content}`),
          playerInput:
            intent === 'end_event' ? '请基于当前气氛，自然地把这一幕收尾。' : playerInput,
          intent
        }),
        getCharsPerSecond: () => state.settings.streamCharsPerSecond,
        onCharacter: (character) => {
          state = appendStreamingReply(state, character);
          rerender();
        }
      });

      const streamingResult = stripEventEndMarker(state.event.streamingReply);
      state = {
        ...state,
        event: {
          ...state.event,
          streamingReply: streamingResult.cleanedText
        }
      };

      if (streamingResult.shouldEndEvent || intent === 'end_event') {
        state = markEventReadyToEnd(state);
      }

      state = finishStreamingReply(state);

      if (state.event.readyToEnd) {
        state = endEvent(state);
        state = appendTranscriptMessage(state, { role: 'system', label: '系统', content: '这段对话暂时告一段落。' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = failStreamingReply(state, message);
    }

    rerender();
  };

  const bindEvents = () => {
    const submitCurrentInput = () => {
      const input = root.querySelector<HTMLTextAreaElement>('textarea');
      const value = input?.value.trim();

      if (!input || !value || !state.event.activeEventId || state.ui.isSending) {
        return;
      }

      input.value = '';
      void runEventTurn(value, 'continue');
    };

    root.querySelectorAll<HTMLButtonElement>('[data-region-id]').forEach((button) => {
      button.addEventListener('click', () => {
        state = enterRegion(state, button.dataset.regionId as string);
        rerender();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-scene-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const sceneId = button.dataset.sceneId as string;
        const scene = worldData.scenes.find((item) => item.id === sceneId);

        state = enterScene(state, sceneId);

        if (scene?.eventIds[0]) {
          state = startEvent(state, scene.eventIds[0]);
        }

        rerender();
      });
    });

    root.querySelector<HTMLButtonElement>('[data-action="toggle-model-menu"]')?.addEventListener('click', () => {
      state = toggleModelMenu(state);
      rerender();
    });

    root.querySelectorAll<HTMLButtonElement>('[data-action="toggle-settings"]').forEach((button) => {
      button.addEventListener('click', () => {
        state = toggleSettingsPanel(state);
        rerender();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-model-id]').forEach((button) => {
      button.addEventListener('click', () => {
        state = setCurrentModel(state, button.dataset.modelId as string);
        saveStoredSettings(state.settings);
        rerender();
      });
    });

    root.querySelector<HTMLInputElement>('[data-setting="stream-speed"]')?.addEventListener('input', (event) => {
      const nextValue = Number((event.currentTarget as HTMLInputElement).value);
      state = setStreamCharsPerSecond(state, nextValue);
      saveStoredSettings(state.settings);
      rerender();
    });

    root.querySelector<HTMLButtonElement>('[data-action="back"]')?.addEventListener('click', () => {
      if (state.ui.mode === 'event') {
        state = endEvent(state);
      } else if (state.navigation.currentSceneId) {
        state = {
          ...state,
          navigation: {
            currentRegionId: state.navigation.currentRegionId,
            currentSceneId: null
          }
        };
      } else {
        state = {
          ...state,
          navigation: {
            currentRegionId: null,
            currentSceneId: null
          }
        };
      }

      rerender();
    });

    root.querySelector<HTMLButtonElement>('[data-action="end-event"]')?.addEventListener('click', () => {
      if (state.ui.mode !== 'event') {
        return;
      }

      void runEventTurn('', 'end_event');
    });

    root.querySelector<HTMLButtonElement>('[data-action="send"]')?.addEventListener('click', async () => {
      submitCurrentInput();
    });

    root.querySelector<HTMLTextAreaElement>('textarea')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitCurrentInput();
      }
    });

    root.querySelector<HTMLButtonElement>('[data-action="compress"]')?.addEventListener('click', () => {
      const latestSummary = state.event.transcript[state.event.transcript.length - 1]?.content ?? state.memory.summary;
      const activeEvent = state.event.activeEventId
        ? worldData.events.find((item) => item.id === state.event.activeEventId)
        : null;

      const unlockedFacts = Array.from(
        new Set([
          ...state.memory.facts,
          '你已经正式认识林澄',
          ...(activeEvent ? [`你最近在${resolveLocationLabel(state)}和${activeEvent.cast[0]}有更深入的交流`] : [])
        ])
      );

      state = updateMemory(
        state,
        compressMemory({
          latestSummary,
          unlockedFacts,
          currentGoal: activeEvent ? `继续确认${activeEvent.cast[0]}没有说出口的心事` : '找到下一个能拉近关系的地点'
        })
      );
      rerender();
    });
  };

  const rerender = () => {
    renderApp(root, state);
    const history = root.querySelector<HTMLElement>('[data-chat-history]');
    if (history) {
      history.scrollTop = history.scrollHeight;
    }
    bindEvents();
  };

  rerender();
};
