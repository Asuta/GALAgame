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
  createClockState,
  finishTaskImageGeneration,
  getClockTotalMinutes,
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
  startStreamingReply,
  removeRegion,
  removeScene,
  upsertCharacter,
  upsertRegion,
  upsertScene
} from '../../src/state/store';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';

describe('store transitions', () => {
  it('creates fresh initial world data without reusing a mutated runtime object', () => {
    const first = createInitialState();
    first.world.data.regions.push({ id: 'gym', name: '体育馆', sceneIds: [] });

    const second = createInitialState();

    expect(second.world.data.regions.map((region) => region.id)).toEqual(['school', 'hospital', 'mall', 'home']);
  });

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

  it('adds runtime regions, scenes, and characters while invalidating stale scene caches', () => {
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
    state = upsertRegion(state, { id: 'gym', name: '体育馆', sceneIds: [] });
    state = upsertScene(state, {
      id: 'gym-court',
      regionId: 'gym',
      name: '篮球馆',
      description: '木地板上还留着训练后的回声。',
      eventSeed: {
        baseTitle: '训练后的体育馆',
        castIds: ['许夏'],
        tones: ['开阔'],
        buildUpGoals: ['让玩家注意到新场景里的异常'],
        triggerHints: ['器材室忽然响了一下'],
        resolutionDirections: ['把这一幕收在场馆灯光下'],
        premiseTemplates: ['体育馆里只剩几盏灯亮着。'],
        suspenseSeeds: ['器材室里是谁']
      }
    });
    state = upsertCharacter(state, {
      id: '许夏',
      name: '许夏',
      gender: '女',
      identity: '体育馆里新出现的角色',
      age: '17岁左右',
      personality: '直接、爽朗',
      speakingStyle: '短句，语气利落',
      relationshipToPlayer: '刚认识',
      hardRules: ['不改变姓名']
    });

    expect(state.world.data.regions.find((region) => region.id === 'gym')?.sceneIds).toContain('gym-court');
    expect(state.world.data.scenes.find((scene) => scene.id === 'gym-court')?.name).toBe('篮球馆');
    expect(state.world.data.characters.find((character) => character.id === '许夏')?.identity).toContain('体育馆');
    expect(state.world.revision).toBe(3);
    expect(isSceneEventReusable(state, 'classroom')).toBe(false);
  });

  it('removes runtime scenes and regions while clearing navigation and generated state', () => {
    let state = createInitialState();
    state = upsertRegion(state, { id: 'gym', name: '体育馆', sceneIds: [] });
    state = upsertScene(state, {
      id: 'gym-court',
      regionId: 'gym',
      name: '篮球馆',
      description: '木地板上还留着训练后的回声。',
      eventSeed: {
        baseTitle: '训练后的体育馆',
        castIds: [],
        tones: [],
        buildUpGoals: ['观察场馆'],
        triggerHints: ['灯光闪了一下'],
        resolutionDirections: ['暂时离开'],
        premiseTemplates: ['体育馆里很安静。'],
        suspenseSeeds: []
      }
    });
    state = enterRegion(state, 'gym');
    state = enterScene(state, 'gym-court');
    state = startSceneGeneration(state, 'gym-court');

    state = removeScene(state, 'gym-court');

    expect(state.navigation.currentSceneId).toBeNull();
    expect(state.world.data.scenes.some((scene) => scene.id === 'gym-court')).toBe(false);
    expect(state.ui.generatingSceneIds).not.toContain('gym-court');

    state = removeRegion(state, 'gym');

    expect(state.navigation.currentRegionId).toBeNull();
    expect(state.world.data.regions.some((region) => region.id === 'gym')).toBe(false);
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
    expect(state.clock.year).toBe(2026);
    expect(state.clock.month).toBe(4);
    expect(state.clock.day).toBe(29);
    expect(state.clock.label).toBe('2026年4月29日 傍晚 18:35');
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
    const startMinutes = getClockTotalMinutes(createClockState(2026, 4, 30, 6, 0));

    state = openTaskPlanningPage(state);
    state = startTask(state, {
      content: '晨跑一小时',
      startMinutes,
      executionMode: 'result',
      durationMinutes: 60,
      segmentCount: 6
    });

    expect(state.ui.mode).toBe('task');
    expect(state.task.activeTask?.content).toBe('晨跑一小时');
    expect(state.task.activeTask?.startMinutes).toBe(startMinutes);

    state = completeTask(state, '你完成了晨跑，精神变得清醒。', ['完成晨跑', '体力状态更好']);

    expect(state.ui.currentPage).toBe('decision');
    expect(state.clock.label).toBe('2026年4月30日 清晨 07:00');
    expect(state.task.lastCompletedSummary).toContain('完成了晨跑');
    expect(state.memory.facts).toContain('完成晨跑');
  });

  it('derives task end time from duration and keeps process split count', () => {
    let state = createInitialState();
    const startMinutes = getClockTotalMinutes(createClockState(2026, 4, 29, 18, 25));

    state = startTask(state, {
      content: '长期训练计划',
      startMinutes,
      executionMode: 'process',
      durationMinutes: 5 * 365 * 24 * 60,
      segmentCount: 5
    });

    expect(state.task.activeTask?.startMinutes).toBe(startMinutes);
    expect(state.task.activeTask?.durationMinutes).toBe(5 * 365 * 24 * 60);
    expect(state.task.activeTask?.endMinutes).toBe(startMinutes + 5 * 365 * 24 * 60);
    expect(state.task.activeTask?.segmentCount).toBe(5);
  });

  it('advances process task segments and switches between auto and manual control', () => {
    let state = createInitialState();

    state = startTask(state, {
      content: '复习数学',
      startMinutes: 20 * 60,
      executionMode: 'process',
      durationMinutes: 60,
      segmentCount: 6
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
      executionMode: 'process',
      durationMinutes: 60,
      segmentCount: 6
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
