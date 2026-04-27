import { worldData } from '../data/world';
import { requestGeneratedEventImage, requestGeneratedTaskImage } from '../logic/imageClient';
import {
  requestEventImagePrompt,
  requestEventTimeSettlement,
  requestGeneratedSceneEvent,
  requestTaskFinalSummary,
  requestTaskImagePrompt,
  requestTaskManualReplyStream,
  requestTaskResult,
  requestTaskSegment,
  requestStoryReplyStream,
  stripEventEndMarker
} from '../logic/chatClient';
import { buildPlayerFacingSceneSummary, summarizeResolvedEvent, compressMemory } from '../logic/memory';
import { getVisibleActiveEvent, getVisiblePreparedEvent } from '../state/selectors';
import { appendStreamWithRateLimit } from '../logic/streamDisplay';
import { clampStreamCharsPerSecond, loadStoredSettings, saveStoredSettings } from '../settings/storage';
import { applyGameEffects } from '../player/effects';
import { formatGameEffectsInline } from '../player/effectSummary';
import { serializePlayerStateForPrompt } from '../player/serializeForPrompt';
import { loadStoredPlayerState, saveStoredPlayerState } from '../player/storage';
import type { GameEffect } from '../player/types';
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
  failEventImageGeneration,
  finishEventImageGeneration,
  finishStreamingReply,
  invalidateSceneEventCache,
  isSceneEventReusable,
  markEventReadyToEnd,
  appendTaskSegment,
  appendTaskStreamingReply,
  appendTaskTranscriptMessage,
  closeSettingsPage,
  completeTask,
  failTaskImageGeneration,
  finishTaskRequest,
  finishTaskImageGeneration,
  finishTaskStreamingReply,
  openEventDetailsPage,
  openCharacterPage,
  openImagePromptPage,
  openTaskPlanningPage,
  openSettingsPage,
  recordSettlementEffects,
  recordWorldAdvance,
  selectSceneEventSeed,
  setTaskControlMode,
  setTaskError,
  setSceneSummary,
  setSceneGenerationError,
  setCurrentModel,
  setPlayerState,
  startTask,
  startTaskImageGeneration,
  startTaskRequest,
  startTaskStreamingReply,
  startSceneGeneration,
  setStreamCharsPerSecond,
  startEventImageGeneration,
  startEvent,
  startStreamingReply,
  updateMemory,
  finishSceneGeneration,
  type GameState
} from '../state/store';
import { renderApp } from './renderApp';
import { resolveCharacterReference, resolveSceneBackground } from '../visual/assetCatalog';

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 16;

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

const applyStoredPlayerState = (state: GameState): GameState => ({
  ...state,
  player: loadStoredPlayerState()
});

const persistSettings = (state: GameState): void => {
  saveStoredSettings({
    currentModel: state.settings.currentModel,
    streamCharsPerSecond: state.settings.streamCharsPerSecond
  });
};

const persistPlayerState = (state: GameState): void => {
  saveStoredPlayerState(state.player);
};

const getPlayerStatePrompt = (state: GameState): string => serializePlayerStateForPrompt(state.player);

const CONTINUE_STORY_PROMPT = '玩家暂时没有回应，只是在等待、观察和感受当前气氛。请根据当前场景自然推进一小段剧情，然后停在等待玩家选择或回应的位置。';
const STREAM_REVEAL_BOOST_CHARS = 10;

const parseTimeInput = (value: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

const formatTaskTimeLabel = (minutes: number): string => {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export const bindUi = (root: HTMLDivElement, initialState = createInitialState()): void => {
  let state: GameState = applyStoredPlayerState(applyStoredSettings(initialState));
  let shouldAutoScrollHistory = true;
  let preservedHistoryScrollTop = 0;
  let streamRevealBoostCharacters = 0;
  let taskStreamRevealBoostCharacters = 0;

  const applySettlementEffectsToState = (summary: string, effects: GameEffect[] = []): void => {
    if (!effects.length) {
      state = recordSettlementEffects(state, summary, []);
      return;
    }

    state = setPlayerState(state, applyGameEffects(state.player, effects));
    state = recordSettlementEffects(state, summary, effects);
    persistPlayerState(state);
  };

  const updateHistoryScrollPreference = (history: HTMLElement): void => {
    const maxScrollTop = Math.max(history.scrollHeight - history.clientHeight, 0);
    const nextScrollTop = Math.min(history.scrollTop, maxScrollTop);
    const distanceFromBottom = maxScrollTop - nextScrollTop;

    preservedHistoryScrollTop = nextScrollTop;
    shouldAutoScrollHistory = distanceFromBottom <= AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
  };

  const applyHistoryScrollPosition = (history: HTMLElement): void => {
    const maxScrollTop = Math.max(history.scrollHeight - history.clientHeight, 0);

    if (shouldAutoScrollHistory) {
      history.scrollTop = maxScrollTop;
      preservedHistoryScrollTop = maxScrollTop;
      return;
    }

    history.scrollTop = Math.min(preservedHistoryScrollTop, maxScrollTop);
  };

  const updateStreamingReplyDom = (): boolean => {
    const history = root.querySelector<HTMLElement>('[data-chat-history]');
    const streamingContent = root.querySelector<HTMLElement>('[data-streaming-content]');

    if (!history || !streamingContent || state.ui.mode !== 'event' || !getVisibleActiveEvent(state)) {
      return false;
    }

    streamingContent.textContent = state.event.streamingReply;
    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    streamingContent.append(cursor);
    applyHistoryScrollPosition(history);
    return true;
  };

  const updateTaskStreamingReplyDom = (): boolean => {
    const history = root.querySelector<HTMLElement>('[data-chat-history]');
    const streamingContent = root.querySelector<HTMLElement>('[data-task-streaming-content]');
    const task = state.task.activeTask;

    if (!history || !streamingContent || state.ui.mode !== 'task' || !task) {
      return false;
    }

    streamingContent.textContent = task.streamingReply;
    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    streamingContent.append(cursor);
    applyHistoryScrollPosition(history);
    return true;
  };

  const rerender = () => {
    const previousHistory = root.querySelector<HTMLElement>('[data-chat-history]');
    if (previousHistory) {
      updateHistoryScrollPreference(previousHistory);
    }

    renderApp(root, state);
    const history = root.querySelector<HTMLElement>('[data-chat-history]');
    if (history) {
      applyHistoryScrollPosition(history);
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
        worldRevision: state.world.revision,
        playerStatePrompt: getPlayerStatePrompt(state)
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
    streamRevealBoostCharacters = 0;
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
          intent,
          playerStatePrompt: getPlayerStatePrompt(state)
        }),
        getCharsPerSecond: () => state.settings.streamCharsPerSecond,
        shouldSkipRateLimit: () => {
          if (streamRevealBoostCharacters <= 0) {
            return false;
          }

          streamRevealBoostCharacters -= 1;
          return true;
        },
        onCharacter: (character) => {
          state = appendStreamingReply(state, character);
          if (!updateStreamingReplyDom()) {
            rerender();
          }
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
          eventFacts: resolvedEvent.facts,
          playerStatePrompt: getPlayerStatePrompt(state)
        });
        const memoryResult = summarizeResolvedEvent({
          event: resolvedEvent,
          transcript: transcriptForMemory,
          memoryFacts: state.memory.facts
        });
        const eventEffectSummary = formatGameEffectsInline(timeSettlement.effects ?? []);
        const eventSettlementSummary = eventEffectSummary
          ? `${timeSettlement.summary} 结算变化：${eventEffectSummary}。`
          : timeSettlement.summary;
        const playerSceneSummary = buildPlayerFacingSceneSummary({
          event: resolvedEvent,
          transcript: transcriptForMemory,
          settlementSummary: eventSettlementSummary
        });

        state = advanceClockByMinutes(state, timeSettlement.minutesElapsed);
        state = updateMemory(state, memoryResult);
        state = setSceneSummary(state, resolvedSceneId, playerSceneSummary);
        applySettlementEffectsToState(timeSettlement.summary, timeSettlement.effects);
        state = recordWorldAdvance(
          state,
          `事件【${resolvedTitle}】已经自然收束，时间推进了 ${timeSettlement.minutesElapsed} 分钟。${eventSettlementSummary}`
        );
        state = endEvent(state);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = failStreamingReply(state, message);
    } finally {
      streamRevealBoostCharacters = 0;
    }

    rerender();
  };

  const streamTaskText = async (text: string, label = '世界') => {
    taskStreamRevealBoostCharacters = 0;
    state = startTaskStreamingReply(state, label);
    rerender();

    await appendStreamWithRateLimit({
      source: (async function* () {
        yield text;
      })(),
      getCharsPerSecond: () => state.settings.streamCharsPerSecond,
      shouldSkipRateLimit: () => {
        if (taskStreamRevealBoostCharacters <= 0) {
          return false;
        }

        taskStreamRevealBoostCharacters -= 1;
        return true;
      },
      onCharacter: (character) => {
        state = appendTaskStreamingReply(state, character);
        if (!updateTaskStreamingReplyDom()) {
          rerender();
        }
      }
    });
  };

  const clearTaskStreamingDraft = (): void => {
    if (!state.task.activeTask) {
      return;
    }

    state = {
      ...state,
      task: {
        ...state.task,
        activeTask: {
          ...state.task.activeTask,
          streamingReply: '',
          streamingLabel: ''
        }
      }
    };
  };

  const generateCurrentTaskImage = async (options: { rerenderDuringGeneration?: boolean } = {}) => {
    const task = state.task.activeTask;

    if (!task || task.imageGeneration.isGenerating) {
      return;
    }

    const taskId = task.id;
    const locationLabel = resolveLocationLabel(state);
    const shouldRerenderDuringGeneration = options.rerenderDuringGeneration ?? true;

    state = startTaskImageGeneration(state);
    if (shouldRerenderDuringGeneration) {
      rerender();
    }

    try {
      const latestTask = state.task.activeTask ?? task;
      const imagePrompt = await requestTaskImagePrompt({
        model: state.settings.currentModel,
        task: latestTask,
        locationLabel,
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        playerStatePrompt: getPlayerStatePrompt(state)
      });
      const imageUrl = await requestGeneratedTaskImage({
        task: latestTask,
        locationLabel,
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        prompt: imagePrompt
      });

      if (state.task.activeTask?.id === taskId) {
        state = finishTaskImageGeneration(state, imageUrl, imagePrompt);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';

      if (state.task.activeTask?.id === taskId) {
        state = failTaskImageGeneration(state, message);
      }
    }

    if (shouldRerenderDuringGeneration) {
      rerender();
    }
  };

  const completeActiveTask = async () => {
    const task = state.task.activeTask;

    if (!task || state.ui.isSending) {
      return;
    }

    state = startTaskRequest(state);
    rerender();

    try {
      const settlement =
        task.executionMode === 'result' && task.summary
          ? { summary: task.summary, facts: task.facts, effects: [] }
          : await requestTaskFinalSummary({
              model: state.settings.currentModel,
              task,
              memorySummary: state.memory.summary,
              memoryFacts: state.memory.facts,
              locationLabel: resolveLocationLabel(state),
              playerStatePrompt: getPlayerStatePrompt(state)
            });
      applySettlementEffectsToState(settlement.summary, settlement.effects);
      state = completeTask(state, settlement.summary, settlement.facts);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = setTaskError(state, message);
    }

    rerender();
  };

  const generateNextTaskSegment = async () => {
    const task = state.task.activeTask;

    if (!task || state.ui.isSending || task.controlMode === 'manual') {
      return;
    }

    if (task.currentMinutes >= task.endMinutes) {
      await completeActiveTask();
      return;
    }

    const fromMinutes = task.currentMinutes;
    const toMinutes = Math.min(task.endMinutes, task.currentMinutes + task.segmentMinutes);
    const fromLabel = formatTaskTimeLabel(fromMinutes);
    const toLabel = formatTaskTimeLabel(toMinutes);

    state = startTaskRequest(state);
    rerender();

    try {
      const segment = await requestTaskSegment({
        model: state.settings.currentModel,
        task,
        fromLabel,
        toLabel,
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        locationLabel: resolveLocationLabel(state),
        playerStatePrompt: getPlayerStatePrompt(state)
      });

      await streamTaskText(segment.content, '世界');
      clearTaskStreamingDraft();
      state = appendTaskSegment(state, segment, toMinutes);
      rerender();

      if (toMinutes >= task.endMinutes) {
        const nextTask = state.task.activeTask;

        if (nextTask) {
          state = startTaskRequest(state);
          rerender();
          const settlement = await requestTaskFinalSummary({
            model: state.settings.currentModel,
            task: nextTask,
            memorySummary: state.memory.summary,
            memoryFacts: state.memory.facts,
            locationLabel: resolveLocationLabel(state),
            playerStatePrompt: getPlayerStatePrompt(state)
          });
          applySettlementEffectsToState(settlement.summary, settlement.effects);
          state = completeTask(state, settlement.summary, settlement.facts);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = setTaskError(state, message);
    } finally {
      state = finishTaskRequest(state);
    }

    rerender();
  };

  const startPlannedTask = async () => {
    if (state.ui.isSending) {
      return;
    }

    const content = root.querySelector<HTMLTextAreaElement>('[data-task-content]')?.value.trim() ?? '';
    const startInput = root.querySelector<HTMLInputElement>('[data-task-start-time]')?.value ?? '';
    const endInput = root.querySelector<HTMLInputElement>('[data-task-end-time]')?.value ?? '';
    const executionMode =
      root.querySelector<HTMLInputElement>('input[name="task-execution-mode"]:checked')?.value === 'process'
        ? 'process'
        : 'result';
    const segmentMinutes = Number(root.querySelector<HTMLSelectElement>('[data-task-segment-minutes]')?.value ?? 10);
    const startMinutes = parseTimeInput(startInput);
    const endMinutesRaw = parseTimeInput(endInput);

    if (!content) {
      state = setTaskError(state, '请先填写任务内容。');
      rerender();
      return;
    }

    if (startMinutes === null || endMinutesRaw === null) {
      state = setTaskError(state, '请填写有效的开始和结束时间。');
      rerender();
      return;
    }

    const endMinutes = endMinutesRaw <= startMinutes ? endMinutesRaw + 24 * 60 : endMinutesRaw;

    state = startTask(state, {
      content,
      startMinutes,
      endMinutes,
      executionMode,
      segmentMinutes
    });

    rerender();

    const task = state.task.activeTask;

    if (!task) {
      return;
    }

    try {
      if (executionMode === 'result') {
        const [settlement] = await Promise.all([
          requestTaskResult({
            model: state.settings.currentModel,
            task,
            timeLabel: state.clock.label,
            memorySummary: state.memory.summary,
            memoryFacts: state.memory.facts,
            locationLabel: resolveLocationLabel(state),
            playerStatePrompt: getPlayerStatePrompt(state)
          }),
          generateCurrentTaskImage()
        ]);
        applySettlementEffectsToState(settlement.summary, settlement.effects);
        state = completeTask(state, settlement.summary, settlement.facts);
      } else {
        await generateCurrentTaskImage();
        state = finishTaskRequest(state);
        rerender();
        await generateNextTaskSegment();
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = setTaskError(state, message);
    }

    rerender();
  };

  const runTaskManualTurn = async (playerInput: string) => {
    const task = state.task.activeTask;

    if (!task || task.controlMode !== 'manual' || state.ui.isSending || !playerInput.trim()) {
      return;
    }

    state = appendTaskTranscriptMessage(state, {
      role: 'player',
      label: '你',
      content: playerInput
    });
    taskStreamRevealBoostCharacters = 0;
    state = startTaskStreamingReply(state, '世界');
    rerender();

    try {
      await appendStreamWithRateLimit({
        source: requestTaskManualReplyStream({
          model: state.settings.currentModel,
          task,
          playerInput,
          memorySummary: state.memory.summary,
          memoryFacts: state.memory.facts,
          locationLabel: resolveLocationLabel(state),
          playerStatePrompt: getPlayerStatePrompt(state)
        }),
        getCharsPerSecond: () => state.settings.streamCharsPerSecond,
        shouldSkipRateLimit: () => {
          if (taskStreamRevealBoostCharacters <= 0) {
            return false;
          }

          taskStreamRevealBoostCharacters -= 1;
          return true;
        },
        onCharacter: (character) => {
          state = appendTaskStreamingReply(state, character);
          if (!updateTaskStreamingReplyDom()) {
            rerender();
          }
        }
      });

      state = finishTaskStreamingReply(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = setTaskError(state, message);
    }

    rerender();
  };

  const generateCurrentEventImage = async () => {
    const eventForImage = getVisibleActiveEvent(state) ?? getVisiblePreparedEvent(state);

    if (!eventForImage || state.ui.eventImageGeneration.isGenerating) {
      return;
    }

    const scene = worldData.scenes.find((item) => item.id === eventForImage.sceneId) ?? null;
    const referenceImageUrls = [
      resolveSceneBackground(eventForImage.sceneId, state.navigation.currentRegionId),
      resolveCharacterReference(eventForImage.cast[0] ?? null)
    ].filter((url): url is string => !!url);

    state = startEventImageGeneration(state, eventForImage.id);
    rerender();

    try {
      const transcript = state.event.transcript.map((message) => `${message.label}：${message.content}`);
      const imagePrompt = await requestEventImagePrompt({
        model: state.settings.currentModel,
        locationLabel: eventForImage.locationLabel,
        eventTitle: eventForImage.title,
        castName: eventForImage.cast[0] || '旁白',
        eventPhase: eventForImage.currentPhase,
        sceneDescription: scene?.description ?? eventForImage.premise,
        openingState: eventForImage.openingState,
        eventFacts: eventForImage.facts,
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        transcript
      });
      const imageUrl = await requestGeneratedEventImage({
        event: eventForImage,
        scene,
        locationLabel: eventForImage.locationLabel,
        prompt: imagePrompt,
        transcript,
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        referenceImageUrls
      });
      state = finishEventImageGeneration(state, eventForImage.id, imageUrl, imagePrompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      state = failEventImageGeneration(state, eventForImage.id, message);
    }

    rerender();
  };

  const bindEvents = () => {
    root.querySelector<HTMLElement>('[data-chat-history]')?.addEventListener('scroll', (event) => {
      updateHistoryScrollPreference(event.currentTarget as HTMLElement);
    });

    const submitCurrentInput = () => {
      const input = root.querySelector<HTMLTextAreaElement>('.input-row textarea');
      const value = input?.value.trim();
      const visibleActiveEvent = getVisibleActiveEvent(state);
      const visiblePreparedEvent = getVisiblePreparedEvent(state);

      if (!input || !value || (!visibleActiveEvent && !visiblePreparedEvent) || state.ui.isSending) {
        return;
      }

      input.value = '';
      void runEventTurn(value, 'continue');
    };

    const submitTaskInput = () => {
      const input = root.querySelector<HTMLTextAreaElement>('.task-input-row textarea');
      const value = input?.value.trim() ?? '';

      if (input) {
        input.value = '';
      }

      void runTaskManualTurn(value);
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

    root.querySelectorAll<HTMLButtonElement>('[data-model-id]').forEach((button) => {
      button.addEventListener('click', () => {
        state = setCurrentModel(state, button.dataset.modelId as string);
        persistSettings(state);
        rerender();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-action="open-settings"]').forEach((button) => button.addEventListener('click', () => {
      state = openSettingsPage(state);
      rerender();
    }));

    root.querySelectorAll<HTMLButtonElement>('[data-action="open-task-planning"]').forEach((button) => button.addEventListener('click', () => {
      state = openTaskPlanningPage(state);
      rerender();
    }));

    root.querySelectorAll<HTMLButtonElement>('[data-action="open-character"]').forEach((button) => button.addEventListener('click', () => {
      state = openCharacterPage(state);
      rerender();
    }));

    root.querySelectorAll<HTMLButtonElement>('[data-action="open-event-details"]').forEach((button) => button.addEventListener('click', () => {
      state = openEventDetailsPage(state);
      rerender();
    }));

    root.querySelectorAll<HTMLButtonElement>('[data-action="back-to-game"]').forEach((button) => {
      button.addEventListener('click', () => {
        state = closeSettingsPage(state);
        rerender();
      });
    });

    root.querySelector<HTMLButtonElement>('[data-action="start-task"]')?.addEventListener('click', () => {
      void startPlannedTask();
    });

    root.querySelector<HTMLButtonElement>('[data-action="task-next-segment"]')?.addEventListener('click', () => {
      void generateNextTaskSegment();
    });

    root.querySelector<HTMLButtonElement>('[data-action="task-manual-mode"]')?.addEventListener('click', () => {
      state = setTaskControlMode(state, 'manual');
      rerender();
    });

    root.querySelector<HTMLButtonElement>('[data-action="task-auto-mode"]')?.addEventListener('click', () => {
      state = setTaskControlMode(state, 'auto');
      rerender();
    });

    root.querySelector<HTMLButtonElement>('[data-action="task-finish"]')?.addEventListener('click', () => {
      void completeActiveTask();
    });

    root.querySelector<HTMLButtonElement>('[data-action="task-send"]')?.addEventListener('click', () => {
      submitTaskInput();
    });

    root.querySelector<HTMLButtonElement>('[data-action="continue-story"]')?.addEventListener('click', () => {
      const visibleActiveEvent = getVisibleActiveEvent(state);

      if (!visibleActiveEvent || state.ui.isSending) {
        return;
      }

      void runEventTurn(CONTINUE_STORY_PROMPT, 'continue');
    });

    root.querySelector<HTMLButtonElement>('[data-action="generate-event-image"]')?.addEventListener('click', () => {
      void generateCurrentEventImage();
    });

    root.querySelector<HTMLButtonElement>('[data-action="generate-task-image"]')?.addEventListener('click', () => {
      void generateCurrentTaskImage();
    });

    root.querySelector<HTMLButtonElement>('[data-action="open-image-prompt"]')?.addEventListener('click', () => {
      state = openImagePromptPage(state);
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

    const revealCurrentStream = () => {
      if (!state.ui.isSending || !state.event.streamingReply) {
        return;
      }

      streamRevealBoostCharacters += STREAM_REVEAL_BOOST_CHARS;
    };

    root.querySelector<HTMLElement>('[data-streaming-bubble]')?.addEventListener('click', () => {
      revealCurrentStream();
    });

    root.querySelector<HTMLElement>('[data-streaming-bubble]')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      revealCurrentStream();
    });

    const revealCurrentTaskStream = () => {
      const task = state.task.activeTask;

      if (!state.ui.isSending || !task?.streamingReply) {
        return;
      }

      taskStreamRevealBoostCharacters += STREAM_REVEAL_BOOST_CHARS;
    };

    root.querySelector<HTMLElement>('[data-task-streaming-bubble]')?.addEventListener('click', () => {
      revealCurrentTaskStream();
    });

    root.querySelector<HTMLElement>('[data-task-streaming-bubble]')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      revealCurrentTaskStream();
    });

    root.querySelector<HTMLTextAreaElement>('.input-row textarea')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();

        if (state.ui.mode === 'task') {
          submitTaskInput();
          return;
        }

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
