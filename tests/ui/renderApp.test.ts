import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../src/ui/renderApp';
import {
  appendTranscriptMessage,
  cacheSceneEvent,
  createInitialState,
  failEventImageGeneration,
  finishEventImageGeneration,
  openCharacterPage,
  openImagePromptPage,
  openTaskPlanningPage,
  recordSettlementEffects,
  setSceneSummary,
  startTask,
  appendTaskSegment,
  completeTask,
  finishTaskImageGeneration,
  startTaskImageGeneration,
  startEvent,
  startEventImageGeneration
} from '../../src/state/store';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { worldData } from '../../src/data/world';

describe('renderApp', () => {
  it('renders city map art in the visual area and keeps the dialogue panel', () => {
    const state = createInitialState();
    document.body.innerHTML = '<div id="app"></div>';

    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    const backgroundImage = document.querySelector('[data-testid="visual-background"]');
    const characterImage = document.querySelector('[data-testid="visual-character"]');

    expect(document.querySelector('[data-testid="visual-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dialogue-panel"]')).not.toBeNull();
    expect(backgroundImage?.getAttribute('src')).toBe('/assets/map/city-overview-main.png');
    expect(characterImage).toBeNull();
    expect(document.body.textContent).toContain('世界地图');
    expect(document.body.textContent).toContain('傍晚 18:00');
    expect(document.querySelector('[data-action="open-settings"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('设置流式输出速度');
    expect(document.querySelector('[data-action="compress"]')).toBeNull();
  });

  it('renders region choices from runtime world data', () => {
    const state = {
      ...createInitialState(),
      world: {
        ...createInitialState().world,
        data: {
          ...worldData,
          regions: [...worldData.regions, { id: 'toilet', name: '厕所', sceneIds: [] }]
        }
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('厕所');
  });

  it('renders chat history entries with speaker labels', () => {
    let state = createInitialState();
    state = appendTranscriptMessage(state, { role: 'player', label: '你', content: '今天你怎么还没回家？' });
    state = appendTranscriptMessage(state, { role: 'character', label: '林澄', content: '我还想再坐一会儿。' });

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('你');
    expect(document.body.textContent).toContain('林澄');
    expect(document.body.textContent).toContain('我还想再坐一会儿');
  });

  it('escapes dynamic dialogue and model text before inserting markup', () => {
    let state = createInitialState();
    state = {
      ...state,
      settings: {
        ...state.settings,
        currentModel: 'gpt-4o-mini <fast&fun>'
      }
    };
    state = appendTranscriptMessage(state, {
      role: 'player',
      label: '你 <b>玩家</b>',
      content: '先看这里 <img src=x onerror="alert(1)"> & 再说'
    });

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    const storyBox = document.querySelector('.story-box');
    const modelToggle = document.querySelector('.model-toggle');

    expect(storyBox?.querySelector('img')).toBeNull();
    expect(storyBox?.textContent).toContain('你 <b>玩家</b>');
    expect(storyBox?.textContent).toContain('先看这里 <img src=x onerror="alert(1)"> & 再说');
    expect(modelToggle?.textContent).toContain('gpt-4o-mini <fast&fun>');
  });

  it('only exposes the event opening to the player and hides internal planner notes', () => {
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

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('放学后的空教室');
    expect(document.body.textContent).toContain('她一个人坐在窗边');
    expect(document.body.textContent).not.toContain('超限触发');
    expect(document.body.textContent).not.toContain('收束方向');
    expect(document.body.textContent).not.toContain('当前目标');
  });

  it('renders event art with region background and character portrait', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
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

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="visual-background"]')?.getAttribute('src')).toBe(
      '/assets/backgrounds/scene-classroom-main.png'
    );
    expect(document.querySelector('[data-testid="visual-character"]')?.getAttribute('src')).toBe(
      '/assets/characters/lin-cheng-half-body.png'
    );
    expect(document.body.textContent).toContain('学校 / 教室');
  });

  it('renders a generated event image as the full visual and hides the portrait overlay', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    const event = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });
    state = startEvent(state, event);
    state = finishEventImageGeneration(state, event.id, 'https://example.com/event.png', '\u56fa\u5b9a\u63d0\u793a\u8bcd\uff1a\u7a97\u8fb9\u5bf9\u89c6');

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="visual-background"]')?.getAttribute('src')).toBe(
      'https://example.com/event.png'
    );
    expect(document.querySelector('[data-testid="visual-character"]')).toBeNull();
    const promptButton = document.querySelector('[data-action="open-image-prompt"]') as HTMLButtonElement;
    expect(promptButton.closest('.visual-stage')).not.toBeNull();
    expect(promptButton.classList.contains('event-image-prompt-button')).toBe(true);
    expect(promptButton.hasAttribute('disabled')).toBe(false);
  });

  it('renders the latest generated image prompt page', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    const event = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '\u5b66\u6821 / \u6559\u5ba4',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });
    state = startEvent(state, event);
    state = finishEventImageGeneration(state, event.id, 'https://example.com/event.png', '\u56fa\u5b9a\u63d0\u793a\u8bcd\uff1a\u7a97\u8fb9\u5bf9\u89c6');
    state = openImagePromptPage(state);

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="image-prompt-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('\u4e0a\u6b21\u751f\u56fe\u63d0\u793a\u8bcd');
    expect(document.body.textContent).toContain('\u56fa\u5b9a\u63d0\u793a\u8bcd\uff1a\u7a97\u8fb9\u5bf9\u89c6');
    expect(document.body.textContent).toContain('\u4e0a\u6b21\u751f\u56fe\u63d0\u793a\u8bcd');
  });

  it('shows image generation progress and errors on the event image button', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    const event = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = startEventImageGeneration(startEvent(state, event), event.id);
    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);
    const loadingButton = document.querySelector('[data-action="generate-event-image"]');
    const visualStage = loadingButton?.closest('.visual-stage');
    expect(visualStage).not.toBeNull();
    expect(visualStage?.classList.contains('visual-stage--image-generating')).toBe(true);
    expect(document.querySelector('[data-testid="event-image-generating-overlay"]')).not.toBeNull();
    expect(loadingButton?.classList.contains('event-image-refresh-button')).toBe(true);
    expect(loadingButton?.classList.contains('is-loading')).toBe(true);
    expect(loadingButton?.getAttribute('aria-label')).toBe('正在生成事件图');
    expect(loadingButton?.hasAttribute('disabled')).toBe(true);

    state = failEventImageGeneration(state, event.id, '接口超时');
    renderApp(document.querySelector('#app') as HTMLDivElement, state);
    expect(document.querySelector('[data-action="generate-event-image"]')?.getAttribute('aria-label')).toBe('重新生成事件图');
    expect(document.body.textContent).toContain('出图失败：接口超时');
  });

  it('shows only the event-ending action during an active event', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
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

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-action="end-event"]')).not.toBeNull();
    expect(document.querySelector('[data-action="continue-story"]')).not.toBeNull();
    expect(document.querySelector('[data-action="back"]')).toBeNull();
    expect(document.querySelectorAll('[data-scene-id]')).toHaveLength(0);
  });

  it('shows only the leave-location action while exploring', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'hospital',
        currentSceneId: null
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-action="end-event"]')).toBeNull();
    expect(document.querySelector('[data-action="continue-story"]')).toBeNull();
    expect(document.querySelector('[data-action="back"]')).not.toBeNull();
  });

  it('shows a generated scene event as waiting instead of active before the player speaks', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    state = cacheSceneEvent(
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

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('待开场');
    expect(document.body.textContent).not.toContain('事件中');
    expect(document.querySelector('[data-action="end-event"]')).toBeNull();
    expect(document.querySelector('[data-action="continue-story"]')).toBeNull();
    expect(document.querySelector('[data-action="back"]')).not.toBeNull();
    expect(document.querySelector('textarea')?.hasAttribute('disabled')).toBe(false);
    expect(document.querySelector('[data-testid="visual-character"]')?.getAttribute('src')).toBe(
      '/assets/characters/lin-cheng-half-body.png'
    );
  });

  it('does not render the internal memory panel for players', () => {
    const state = createInitialState();

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).not.toContain('记忆');
    expect(document.querySelector('.memory-box')).toBeNull();
  });

  it('shows a short scene summary in the story box after an event ends', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      }
    };
    state = setSceneSummary(state, 'classroom', '刚才那场对话像一阵风一样过去了，你们谁都没有把最想说的话真正说出口。');

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('刚才那场对话像一阵风一样过去了');
    expect(document.body.textContent).not.toContain('记忆');
  });

  it('renders stream speed controls on the separate settings page', () => {
    const state = {
      ...createInitialState(),
      ui: {
        ...createInitialState().ui,
        currentPage: 'settings' as const
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('流式输出速度');
    expect(document.body.textContent).toContain('每秒');
    expect(document.body.textContent).toContain('整理线索');
    expect(document.querySelector('[data-action="compress"]')).not.toBeNull();
    expect(document.querySelector('[data-action="back-to-game"]')).not.toBeNull();
    expect(document.querySelector('[data-stream-speed-slider]')).not.toBeNull();
  });

  it('renders generated event details on a separate page', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      },
      ui: {
        ...state.ui,
        currentPage: 'event-details' as const
      }
    };
    state = cacheSceneEvent(
      state,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: ['玩家刚进入教室。'],
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      })
    );

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="event-details-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('事件详情');
    expect(document.body.textContent).toContain('学校 / 教室');
    expect(document.body.textContent).toContain('事件前提');
    expect(document.body.textContent).toContain('开场状态');
    expect(document.body.textContent).toContain('推进目标');
    expect(document.body.textContent).toContain('越界触发');
    expect(document.body.textContent).toContain('收束方向');
    expect(document.body.textContent).toContain('生成时记忆事实');
    expect(document.body.textContent).toContain('玩家刚进入教室。');
    expect(document.querySelector('[data-action="back-to-game"]')).not.toBeNull();
  });

  it('renders model options on the settings page and removes the main-page model toggle button', () => {
    const settingsState = {
      ...createInitialState(),
      ui: {
        ...createInitialState().ui,
        currentPage: 'settings' as const
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, settingsState);

    expect(document.body.textContent).toContain('模型选择');
    expect(document.querySelectorAll('[data-model-id]')).toHaveLength(settingsState.settings.availableModels.length);
    expect(document.querySelector('.model-option.is-active')?.textContent).toContain(settingsState.settings.currentModel);

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, createInitialState());

    expect(document.querySelector('[data-action="toggle-model-menu"]')).toBeNull();
    expect(document.querySelector('.model-menu')).toBeNull();
  });

  it('renders the player character page with attributes, money, and inventory', () => {
    let state = openCharacterPage(createInitialState());
    state = {
      ...state,
      player: {
        ...state.player,
        money: 500,
        inventory: {
          optionDefinitions: [],
          items: [
            {
              id: 'item-mind-glasses',
              name: '揣测心意的眼镜',
              description: '一副看起来普通的细框眼镜。',
              abilityText: '佩戴后可以感知对方当前最强烈的情绪倾向。',
              effects: [{ type: 'read_emotion_hint', scope: 'conversation' }],
              quantity: 1
            }
          ]
        }
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="character-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('主角状态');
    expect(document.body.textContent).toContain('当前资产');
    expect(document.body.textContent).toContain('500');
    expect(document.body.textContent).toContain('智力');
    expect(document.body.textContent).toContain('揣测心意的眼镜');
    expect(document.body.textContent).toContain('read_emotion_hint');
  });

  it('renders task planning, task running, and decision pages', () => {
    let state = openTaskPlanningPage(createInitialState());

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="task-planning-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('安排任务');
    expect(document.querySelector('[data-task-content]')).not.toBeNull();
    expect(document.querySelector('[data-action="start-task"]')).not.toBeNull();

    state = startTask(state, {
      content: '晨跑一小时',
      startMinutes: 360,
      executionMode: 'process',
      durationMinutes: 60,
      segmentCount: 6
    });
    state = appendTaskSegment(
      state,
      {
        id: 'segment-1',
        fromLabel: '06:00',
        toLabel: '06:10',
        content: '你沿着河边慢慢跑开，清晨的风让人清醒。',
        complication: '远处有人也在同一条跑道上停下',
        attentionLevel: 'medium'
      },
      370
    );

    renderApp(document.querySelector('#app') as HTMLDivElement, state);
    expect(document.querySelector('[data-testid="task-running-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="task-visual-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="task-visual-placeholder"]')).not.toBeNull();
    expect(document.body.textContent).toContain('晨跑一小时');
    expect(document.body.textContent).toContain('远处有人也在同一条跑道上停下');
    expect(document.querySelector('[data-action="task-next-segment"]')).not.toBeNull();
    expect(document.querySelector('[data-action="task-manual-mode"]')).not.toBeNull();

    state = startTaskImageGeneration(state);
    renderApp(document.querySelector('#app') as HTMLDivElement, state);
    expect(document.body.textContent).toContain('正在生成任务画面');
    expect(document.querySelector('[data-testid="task-image-generating-overlay"]')).not.toBeNull();

    state = finishTaskImageGeneration(state, 'https://example.com/task.png', '任务 CG 提示词');
    renderApp(document.querySelector('#app') as HTMLDivElement, state);
    expect(document.querySelector('[data-testid="task-visual-image"]')?.getAttribute('src')).toBe('https://example.com/task.png');
    expect(document.querySelector('[data-testid="task-visual-placeholder"]')).toBeNull();

    state = completeTask(state, '晨跑结束后，你的状态明显更清醒。', ['完成晨跑']);
    state = recordSettlementEffects(state, '晨跑结束后，你的状态明显更清醒。', [
      { type: 'attribute_delta', target: 'stamina', delta: 2 },
      { type: 'money_delta', delta: -5 }
    ]);
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="decision-page"]')).not.toBeNull();
    expect(document.body.textContent).toContain('接下来做什么');
    expect(document.body.textContent).toContain('晨跑结束后');
    expect(document.querySelector('[data-testid="settlement-effects-card"]')).not.toBeNull();
    expect(document.body.textContent).toContain('体力 +2');
    expect(document.body.textContent).toContain('资产 -5');
    expect(document.querySelector('[data-action="open-task-planning"]')).not.toBeNull();
  });

  it('renders a visible transition panel for resolving result-oriented tasks', () => {
    let state = createInitialState();
    state = startTask(state, {
      content: '在早上整理书包',
      startMinutes: 360,
      executionMode: 'result',
      durationMinutes: 60,
      segmentCount: 6
    });

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.querySelector('[data-testid="task-running-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="task-result-loading"]')).not.toBeNull();
    expect(document.body.textContent).toContain('正在推演任务结果');
    expect(document.body.textContent).toContain('读取角色数据');
    expect(document.body.textContent).toContain('结算属性与背包');
    expect(document.querySelector('[data-action="task-finish"]')).toBeNull();
  });

  it('shows an animated scene-generation placeholder while an event is loading', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      },
      ui: {
        ...state.ui,
        generatingSceneIds: ['classroom']
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('正在生成事件中');
    expect(document.querySelector('.story-placeholder.is-loading')).not.toBeNull();
    expect(document.querySelectorAll('.loading-dot')).toHaveLength(3);
  });

  it('shows the stored generation error for the current scene when planning fails', () => {
    let state = createInitialState();
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'classroom'
      },
      ui: {
        ...state.ui,
        sceneGenerationErrors: {
          classroom: '模型请求失败：401'
        }
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('事件生成失败：模型请求失败：401');
  });

  it('prefers the current scene loading placeholder over another scene active event content', () => {
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
    state = appendTranscriptMessage(state, { role: 'character', label: '林澄', content: '教室里的旧内容。' });
    state = {
      ...state,
      navigation: {
        currentRegionId: 'school',
        currentSceneId: 'hallway'
      },
      ui: {
        ...state.ui,
        generatingSceneIds: ['hallway']
      }
    };

    document.body.innerHTML = '<div id="app"></div>';
    renderApp(document.querySelector('#app') as HTMLDivElement, state);

    expect(document.body.textContent).toContain('正在生成事件中');
    expect(document.body.textContent).not.toContain('教室里的旧内容');
    expect(document.body.textContent).not.toContain('放学后的空教室');
  });
});

describe('createApp', () => {
  it('passes stored settings into bindUi without a second bootstrap render', async () => {
    const bindUi = vi.fn();
    const createInitialState = vi.fn(() => ({
      settings: {
        availableModels: ['deepseek-chat', 'gpt-4o-mini'],
        currentModel: 'deepseek-chat',
        streamCharsPerSecond: 17
      }
    }));
    const loadStoredSettings = vi.fn(() => ({
      currentModel: 'gpt-4o-mini',
      streamCharsPerSecond: 5
    }));
    const loadStoredGameState = vi.fn(() => null);

    vi.resetModules();
    vi.doMock('../../src/ui/bindings', () => ({
      bindUi
    }));
    vi.doMock('../../src/state/store', () => ({
      createInitialState
    }));
    vi.doMock('../../src/settings/storage', () => ({
      loadStoredSettings
    }));
    vi.doMock('../../src/save/storage', () => ({
      loadStoredGameState
    }));

    const { createApp } = await import('../../src/app/createApp');
    const root = document.createElement('div') as HTMLDivElement;

    createApp(root);

    expect(bindUi).toHaveBeenCalledOnce();
    expect(bindUi).toHaveBeenCalledWith(root, {
      settings: {
        availableModels: ['deepseek-chat', 'gpt-4o-mini'],
        currentModel: 'gpt-4o-mini',
        streamCharsPerSecond: 5
      }
    });
    expect(createInitialState).toHaveBeenCalledOnce();
    expect(loadStoredSettings).toHaveBeenCalledOnce();
    expect(loadStoredGameState).toHaveBeenCalledOnce();

    vi.doUnmock('../../src/ui/bindings');
    vi.doUnmock('../../src/state/store');
    vi.doUnmock('../../src/settings/storage');
    vi.doUnmock('../../src/save/storage');
    vi.resetModules();
  });
});
