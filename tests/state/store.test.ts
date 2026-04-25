import { describe, expect, it } from 'vitest';
import {
  advanceClockByMinutes,
  appendStreamingReply,
  cacheSceneEvent,
  createInitialState,
  endEvent,
  finishSceneGeneration,
  findCharacterScene,
  enterRegion,
  enterScene,
  finishEventImageGeneration,
  failTaskImageGeneration,
  finishStreamingReply,
  appendTaskSegment,
  completeTask,
  finishTaskImageGeneration,
  invalidateSceneEventCache,
  isSceneEventReusable,
  markEventReadyToEnd,
  openTaskPlanningPage,
  recordWorldAdvance,
  selectSceneEventSeed,
  setSceneGenerationError,
  setTaskControlMode,
  startTask,
  startTaskImageGeneration,
  startSceneGeneration,
  startEvent,
  startStreamingReply
} from '../../src/state/store';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';

describe('store transitions', () => {
  it('moves from world map to region scene to event and back', () => {
    let state = createInitialState();

    state = enterRegion(state, 'school');
    expect(state.navigation.currentRegionId).toBe('school');

    state = enterScene(state, 'classroom');
    expect(state.navigation.currentSceneId).toBe('classroom');

    const plannedEvent = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = cacheSceneEvent(state, plannedEvent);
    state = startEvent(state, plannedEvent);
    expect(state.event.activeEvent?.sceneId).toBe('classroom');
    expect(state.ui.mode).toBe('event');

    state = endEvent(state);
    expect(state.event.activeEvent).toBeNull();
    expect(state.ui.mode).toBe('explore');
  });

  it('streams a reply into transcript when complete', () => {
    let state = createInitialState();

    state = startEvent(
      state,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      })
    );
    state = startStreamingReply(state, '林澄');
    state = appendStreamingReply(state, '她');
    state = appendStreamingReply(state, '笑了');

    expect(state.event.streamingReply).toBe('她笑了');
    expect(state.ui.isSending).toBe(true);

    state = finishStreamingReply(state);

    expect(state.event.transcript[0]?.content).toBe('她笑了');
    expect(state.event.transcript[0]?.label).toBe('林澄');
    expect(state.event.streamingReply).toBe('');
    expect(state.ui.isSending).toBe(false);
  });

  it('marks event as ready to end when model emits finish signal', () => {
    let state = createInitialState();
    const plannedEvent = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = startEvent(state, plannedEvent);
    state = markEventReadyToEnd(state);

    expect(state.event.readyToEnd).toBe(true);
  });

  it('keeps ready-to-end state after finishing the final streamed reply', () => {
    let state = createInitialState();
    state = startEvent(
      state,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      })
    );
    state = startStreamingReply(state, '林澄');
    state = appendStreamingReply(state, '那今天就先到这里吧。');
    state = markEventReadyToEnd(state);

    state = finishStreamingReply(state);

    expect(state.event.readyToEnd).toBe(true);
  });

  it('reuses a cached scene event in the same time slot when the world has not advanced', () => {
    let state = createInitialState();
    const plannedEvent = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = cacheSceneEvent(state, plannedEvent);

    expect(isSceneEventReusable(state, 'classroom')).toBe(true);
  });

  it('keeps an earlier scene event reusable after generating another scene event in the same world state', () => {
    let state = createInitialState();
    const classroomEvent = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });
    const hallwayEvent = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'hallway')!,
      locationLabel: '学校 / 走廊',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = cacheSceneEvent(state, classroomEvent);
    state = cacheSceneEvent(state, hallwayEvent);

    expect(isSceneEventReusable(state, 'classroom')).toBe(true);
    expect(isSceneEventReusable(state, 'hallway')).toBe(true);
  });

  it('tracks scene generation state per scene instead of globally locking all scenes', () => {
    let state = createInitialState();

    state = startSceneGeneration(state, 'classroom');
    state = startSceneGeneration(state, 'hallway');

    expect(state.ui.generatingSceneIds).toContain('classroom');
    expect(state.ui.generatingSceneIds).toContain('hallway');

    state = finishSceneGeneration(state, 'classroom');

    expect(state.ui.generatingSceneIds).not.toContain('classroom');
    expect(state.ui.generatingSceneIds).toContain('hallway');
  });

  it('stores generation errors per scene and clears them when retrying that scene', () => {
    let state = createInitialState();

    state = setSceneGenerationError(state, 'classroom', '模型请求失败：401');
    expect(state.ui.sceneGenerationErrors.classroom).toBe('模型请求失败：401');

    state = startSceneGeneration(state, 'classroom');

    expect(state.ui.sceneGenerationErrors.classroom).toBeUndefined();
    expect(state.ui.generatingSceneIds).toContain('classroom');
  });

  it('invalidates a cached scene event after the world advances elsewhere', () => {
    let state = createInitialState();
    const plannedEvent = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = cacheSceneEvent(state, plannedEvent);
    state = recordWorldAdvance(state, '医院那边触发了另一段新剧情');
    state = invalidateSceneEventCache(state, 'classroom');

    expect(isSceneEventReusable(state, 'classroom')).toBe(false);
    expect(state.event.sceneEventCache.classroom?.status).toBe('stale');
  });

  it('falls back to a non-character scene seed when that character already occupies another location', () => {
    let state = createInitialState();
    const classroomEvent = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = cacheSceneEvent(state, classroomEvent);

    expect(findCharacterScene(state, '林澄', 'cafe')).toBe('classroom');

    const selectedSeed = selectSceneEventSeed(state, worldData.scenes.find((scene) => scene.id === 'cafe')!);

    expect(selectedSeed.castIds).toEqual([]);
    expect(selectedSeed.baseTitle).toContain('咖啡店');
  });

  it('advances the world clock by settled event minutes', () => {
    let state = createInitialState();

    state = advanceClockByMinutes(state, 35);

    expect(state.clock.hour).toBe(18);
    expect(state.clock.minute).toBe(35);
    expect(state.clock.label).toBe('傍晚 18:35');
    expect(state.clock.timeSlot).toBe('evening');
  });

  it('stores the latest generated image prompt with the generated image', () => {
    let state = createInitialState();

    state = finishEventImageGeneration(state, 'event-1', 'https://example.com/image.png', '竖屏教室窗边 CG');

    expect(state.event.generatedImages['event-1']).toBe('https://example.com/image.png');
    expect(state.event.generatedImagePrompts['event-1']).toBe('竖屏教室窗边 CG');
  });

  it('starts and completes a global task without depending on the current scene', () => {
    let state = createInitialState();

    state = openTaskPlanningPage(state);
    state = startTask(state, {
      content: '晨跑一小时',
      startMinutes: 6 * 60,
      endMinutes: 7 * 60,
      executionMode: 'result',
      segmentMinutes: 10
    });

    expect(state.ui.mode).toBe('task');
    expect(state.task.activeTask?.content).toBe('晨跑一小时');
    expect(state.task.activeTask?.startMinutes).toBe(360);

    state = completeTask(state, '你完成了晨跑，精神变得清醒。', ['完成晨跑', '体力状态更好']);

    expect(state.ui.currentPage).toBe('decision');
    expect(state.clock.label).toBe('清晨 07:00');
    expect(state.task.lastCompletedSummary).toContain('完成了晨跑');
    expect(state.memory.facts).toContain('完成晨跑');
  });

  it('advances process task segments and switches between auto and manual control', () => {
    let state = createInitialState();

    state = startTask(state, {
      content: '复习数学',
      startMinutes: 20 * 60,
      endMinutes: 21 * 60,
      executionMode: 'process',
      segmentMinutes: 10
    });
    state = appendTaskSegment(
      state,
      {
        id: 'segment-1',
        fromLabel: '20:00',
        toLabel: '20:10',
        content: '你先把错题本翻开，找到最容易失分的几道题。',
        complication: '手机忽然震了一下',
        attentionLevel: 'medium'
      },
      20 * 60 + 10
    );

    expect(state.task.activeTask?.currentMinutes).toBe(1210);
    expect(state.task.activeTask?.facts.join('\n')).toContain('手机忽然震了一下');

    state = setTaskControlMode(state, 'manual');
    expect(state.task.activeTask?.controlMode).toBe('manual');

    state = setTaskControlMode(state, 'auto');
    expect(state.task.activeTask?.controlMode).toBe('auto');
  });

  it('tracks task image generation without changing task progression', () => {
    let state = createInitialState();

    state = startTask(state, {
      content: '去女仆咖啡店玩一玩',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      executionMode: 'process',
      segmentMinutes: 10
    });
    state = startTaskImageGeneration(state);

    expect(state.task.activeTask?.imageGeneration.isGenerating).toBe(true);

    state = finishTaskImageGeneration(state, 'https://example.com/task.png', '任务 CG 提示词');

    expect(state.task.activeTask?.generatedImageUrl).toBe('https://example.com/task.png');
    expect(state.task.activeTask?.generatedImagePrompt).toBe('任务 CG 提示词');
    expect(state.task.activeTask?.imageGeneration.isGenerating).toBe(false);

    state = failTaskImageGeneration(startTaskImageGeneration(state), '图片额度不足');

    expect(state.task.activeTask?.generatedImageUrl).toBe('https://example.com/task.png');
    expect(state.task.activeTask?.imageGeneration.error).toBe('图片额度不足');
  });
});
