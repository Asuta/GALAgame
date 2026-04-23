import { worldData } from '../data/world';
import { requestEventTimeSettlement, requestGeneratedSceneEvent, requestStoryReplyStream, stripEventEndMarker } from '../logic/chatClient';
import { buildPlayerFacingSceneSummary, summarizeResolvedEvent, compressMemory } from '../logic/memory';
import { getVisibleActiveEvent, getVisiblePreparedEvent } from '../state/selectors';
import { appendStreamWithRateLimit } from '../logic/streamDisplay';
import { clampStreamCharsPerSecond, loadStoredSettings, saveStoredSettings } from '../settings/storage';
import {
  appendActiveEventFacts,
  advanceClockByMinutes,
  appendStreamingReply,
  appendTranscriptMessage,
  cacheSceneEvent,
  createInitialState,
  endEvent,
  enterRegion,
  enterScene,
  failStreamingReply,
  finishStreamingReply,
  invalidateSceneEventCache,
  isSceneEventReusable,
  markEventReadyToEnd,
  recordWorldAdvance,
  selectSceneEventSeed,
  setSceneSummary,
  setSceneGenerationError,
  setCurrentModel,
  startSceneGeneration,
  setStreamCharsPerSecond,
  startEvent,
  startStreamingReply,
  toggleStreamSpeedMenu,
  toggleModelMenu,
  updateMemory,
  finishSceneGeneration,
  type GameState
} from '../state/store';
import { renderApp } from './renderApp';

const resolveLocationLabel = (state: GameState): string => {
  const region = worldData.regions.find((item) => item.id === state.navigation.currentRegionId);
  const scene = worldData.scenes.find((item) => item.id === state.navigation.currentSceneId);
  return `${region?.name ?? '城市'}${scene ? ` / ${scene.name}` : ''}`;
};

const buildCharacterProfile = (name?: string): string => {
  if (!name) {
    return '当前场景没有固定对话角色。请以旁白和环境反馈为主，允许玩家等待、观察、发消息或自言自语，不要突然生成一个无关角色强行接话。';
  }

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

const applyStoredSettings = (state: GameState): GameState => {
  const stored = loadStoredSettings();

  return {
    ...state,
    settings: {
      ...state.settings,
      currentModel: stored.currentModel && state.settings.availableModels.includes(stored.currentModel)
        ? stored.currentModel
        : state.settings.currentModel,
      streamCharsPerSecond:
        typeof stored.streamCharsPerSecond === 'number' ? stored.streamCharsPerSecond : state.settings.streamCharsPerSecond
    }
  };
};

const persistSettings = (state: GameState): void => {
  saveStoredSettings({
    currentModel: state.settings.currentModel,
    streamCharsPerSecond: state.settings.streamCharsPerSecond
  });
};

export const bindUi = (root: HTMLDivElement, initialState = createInitialState()): void => {
  let state: GameState = applyStoredSettings(initialState);

  const rerender = () => {
    renderApp(root, state);
    const history = root.querySelector<HTMLElement>('[data-chat-history]');
    if (history) {
      history.scrollTop = history.scrollHeight;
    }
    bindEvents();
  };

  const openSceneEvent = async (sceneId: string) => {
    const scene = worldData.scenes.find((item) => item.id === sceneId);

    if (!scene) {
      return;
    }

    state = enterScene(state, sceneId);
    rerender();

    if (isSceneEventReusable(state, sceneId)) {
      rerender();
      return;
    }

    if (state.ui.generatingSceneIds.includes(sceneId)) {
      rerender();
      return;
    }

    if (state.event.sceneEventCache[sceneId]) {
      state = invalidateSceneEventCache(state, sceneId);
    }

    state = startSceneGeneration(state, sceneId);
    rerender();

    const locationLabel = resolveLocationLabel(state);
    const planningScene = {
      ...scene,
      eventSeed: selectSceneEventSeed(state, scene)
    };
    try {
      const plannedEvent = await requestGeneratedSceneEvent({
        model: state.settings.currentModel,
        scene: planningScene,
        locationLabel,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot,
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        worldRevision: state.world.revision
      });

      state = cacheSceneEvent(state, plannedEvent);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = setSceneGenerationError(state, sceneId, message);
    } finally {
      state = finishSceneGeneration(state, sceneId);
    }

    rerender();
  };

  const runEventTurn = async (playerInput: string, intent: 'continue' | 'end_event') => {
    const visibleEvent = getVisibleActiveEvent(state);
    const preparedEvent = intent === 'continue' ? getVisiblePreparedEvent(state) : null;

    if ((!visibleEvent && !preparedEvent) || state.ui.isSending) {
      return;
    }

    if (!visibleEvent && preparedEvent) {
      state = startEvent(state, preparedEvent);
    }

    const activeEvent = getVisibleActiveEvent(state);

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
          locationLabel: activeEvent.locationLabel,
          eventTitle: activeEvent.title,
          castName: activeEvent.cast[0] || '旁白',
          eventPhase: activeEvent.currentPhase,
          phaseGoal: activeEvent.buildUpGoal,
          overlimitTrigger: activeEvent.overlimitTrigger,
          suspenseThreads: activeEvent.suspenseThreads,
          transcript: state.event.transcript.map((message) => `${message.label}：${message.content}`),
          playerInput: intent === 'end_event' ? '请基于当前气氛，自然地把这一幕收尾。' : playerInput,
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
      state = appendActiveEventFacts(state, [
        `玩家在${activeEvent.locationLabel}推进了${activeEvent.title}`,
        playerInput ? `玩家本轮提到：${playerInput}` : '玩家选择自然结束这段事件'
      ]);

      if (state.event.readyToEnd && state.event.activeEvent) {
        const transcriptForMemory = state.event.transcript.map((message) => `${message.label}：${message.content}`);
        const resolvedEvent = state.event.activeEvent;
        const resolvedSceneId = resolvedEvent.sceneId;
        const resolvedTitle = state.event.activeEvent.title;
        const timeSettlement = await requestEventTimeSettlement({
          model: state.settings.currentModel,
          startTimeLabel: state.clock.label,
          locationLabel: resolvedEvent.locationLabel,
          eventTitle: resolvedTitle,
          transcript: transcriptForMemory,
          eventFacts: resolvedEvent.facts
        });
        const memoryResult = summarizeResolvedEvent({
          event: resolvedEvent,
          transcript: transcriptForMemory,
          memoryFacts: state.memory.facts
        });
        const playerSceneSummary = buildPlayerFacingSceneSummary({
          event: resolvedEvent,
          transcript: transcriptForMemory,
          settlementSummary: timeSettlement.summary
        });

        state = advanceClockByMinutes(state, timeSettlement.minutesElapsed);
        state = updateMemory(state, memoryResult);
        state = setSceneSummary(state, resolvedSceneId, playerSceneSummary);
        state = recordWorldAdvance(
          state,
          `事件【${resolvedTitle}】已经自然收束，时间推进了 ${timeSettlement.minutesElapsed} 分钟。${timeSettlement.summary}`
        );
        state = endEvent(state);
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
      const visibleActiveEvent = getVisibleActiveEvent(state);
      const visiblePreparedEvent = getVisiblePreparedEvent(state);

      if (!input || !value || (!visibleActiveEvent && !visiblePreparedEvent) || state.ui.isSending) {
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
        void openSceneEvent(button.dataset.sceneId as string);
      });
    });

    root.querySelector<HTMLButtonElement>('[data-action="toggle-model-menu"]')?.addEventListener('click', () => {
      state = toggleModelMenu(state);
      rerender();
    });

    root.querySelectorAll<HTMLButtonElement>('[data-model-id]').forEach((button) => {
      button.addEventListener('click', () => {
        state = setCurrentModel(state, button.dataset.modelId as string);
        persistSettings(state);
        rerender();
      });
    });

    root.querySelector<HTMLButtonElement>('[data-action="toggle-stream-speed"]')?.addEventListener('click', () => {
      state = toggleStreamSpeedMenu(state);
      rerender();
    });

    root.querySelector<HTMLInputElement>('[data-stream-speed-slider]')?.addEventListener('change', (event) => {
      const nextValue = clampStreamCharsPerSecond(Number((event.currentTarget as HTMLInputElement).value));
      state = setStreamCharsPerSecond(state, nextValue);
      persistSettings(state);
      rerender();
    });

    root.querySelector<HTMLButtonElement>('[data-action="back"]')?.addEventListener('click', () => {
      if (getVisibleActiveEvent(state)) {
        void runEventTurn('', 'end_event');
        return;
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
      if (!getVisibleActiveEvent(state)) {
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
      const activeEvent = state.event.activeEvent;
      const latestSummary = activeEvent?.resolutionDirection ?? state.memory.summary;
      const unlockedFacts = Array.from(
        new Set([
          ...state.memory.facts,
          ...(activeEvent?.facts ?? []),
          ...(activeEvent?.cast?.length ? [`你刚刚在${activeEvent.locationLabel}遇到了${activeEvent.cast.join('、')}`] : [])
        ])
      );

      state = updateMemory(
        state,
        compressMemory({
          latestSummary,
          unlockedFacts,
          currentGoal: activeEvent ? `继续观察${activeEvent.cast[0]}没有说出口的意图` : '找到下一个值得进入的地点'
        })
      );
      rerender();
    });
  };

  rerender();
};
