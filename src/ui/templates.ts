import { getActiveEvent, getCurrentRegion, getCurrentScene, getVisibleActiveEvent, getVisiblePreparedEvent } from '../state/selectors';
import { formatDurationMinutesLabel, formatTaskClockLabel, getClockTotalMinutes } from '../state/store';
import type { GameState } from '../state/store';
import { formatGameEffectSummaries } from '../player/effectSummary';
import { resolveStaticAssetMediaUrl, resolveVisualSelection } from '../visual/assetCatalog';
import { isStoredMediaUrl } from '../save/mediaStore';

const EMPTY_IMAGE_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderImageSourceAttributes = (url: string): string =>
  isStoredMediaUrl(url)
    ? `src="${EMPTY_IMAGE_DATA_URL}" data-media-src="${escapeHtml(url)}"`
    : resolveStaticAssetMediaUrl(url)
      ? `src="${escapeHtml(url)}" data-media-src="${escapeHtml(resolveStaticAssetMediaUrl(url) ?? '')}"`
      : `src="${escapeHtml(url)}"`;

const renderDetailRow = (label: string, value: string): string => `
  <div class="event-detail-row">
    <dt>${escapeHtml(label)}</dt>
    <dd>${escapeHtml(value || '暂无')}</dd>
  </div>
`;

const renderDetailList = (label: string, values: string[]): string => `
  <div class="event-detail-row">
    <dt>${escapeHtml(label)}</dt>
    <dd>
      ${
        values.length
          ? `<ul class="event-detail-list">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`
          : '暂无'
      }
    </dd>
  </div>
`;

const phaseLabels = {
  opening: '开场',
  build_up: '推进',
  overlimit: '越界',
  resolution: '收束'
};

const renderAppTopBar = (state: GameState, title: string): string => `
  <header class="app-topbar">
    <div class="app-topbar-time">${escapeHtml(state.clock.label.replace(' ', ' '))}</div>
    <div class="app-topbar-title">${escapeHtml(title)}</div>
    <button class="app-topbar-settings" data-action="open-settings" aria-label="打开设置" title="设置">⚙</button>
  </header>
`;

const renderBottomNav = (state: GameState, options: { hasEventContext?: boolean } = {}): string => {
  const isGame = state.ui.currentPage === 'game';
  const isTask = state.ui.currentPage === 'task-planning' || state.ui.currentPage === 'task-running' || state.ui.currentPage === 'decision';
  const isCharacter = state.ui.currentPage === 'character';
  const hasEventContext = options.hasEventContext ?? false;
  const canPlanTask = state.ui.mode !== 'event' && !state.ui.isSending;

  return `
    <nav class="bottom-nav" aria-label="主导航">
      <button class="${isGame ? 'is-active' : ''}" data-action="back-to-game">
        <span aria-hidden="true">⌂</span>
        <small>地图</small>
      </button>
      <button data-action="open-event-details" ${hasEventContext ? '' : 'disabled'}>
        <span aria-hidden="true">◇</span>
        <small>事件</small>
      </button>
      <button class="${isTask ? 'is-active' : ''}" data-action="open-task-planning" ${canPlanTask ? '' : 'disabled'}>
        <span aria-hidden="true">✓</span>
        <small>任务</small>
      </button>
      <button class="${isCharacter ? 'is-active' : ''}" data-action="open-character">
        <span aria-hidden="true">●</span>
        <small>角色</small>
      </button>
      <button class="${state.ui.currentPage === 'settings' ? 'is-active' : ''}" data-action="open-settings">
        <span aria-hidden="true">⚙</span>
        <small>设置</small>
      </button>
    </nav>
  `;
};

const renderTaskSegment = (segment: NonNullable<GameState['task']['activeTask']>['segments'][number]): string => `
  <div class="task-segment-card">
    <div class="task-segment-time">
      <span>${escapeHtml(segment.fromLabel)}</span>
      <span>${escapeHtml(segment.toLabel)}</span>
    </div>
    <p>${escapeHtml(segment.content)}</p>
    ${
      segment.complication
        ? `<div class="task-complication">插曲：${escapeHtml(segment.complication)}</div>`
        : ''
    }
  </div>
`;

const renderSettlementEffectsCard = (effects: GameState['settlement']['lastEffects']): string => {
  const summaries = formatGameEffectSummaries(effects);

  if (!summaries.length) {
    return '';
  }

  return `
    <div class="settings-card settlement-effects-card" data-testid="settlement-effects-card">
      <div class="settings-section-heading">
        <strong>属性变化</strong>
        <span>${summaries.length} 项</span>
      </div>
      <ul class="settlement-effect-list">
        ${summaries.map((summary) => `<li>${escapeHtml(summary)}</li>`).join('')}
      </ul>
    </div>
  `;
};

export const createAppMarkup = (state: GameState): string => {
  const currentRegion = getCurrentRegion(state);
  const currentScene = getCurrentScene(state);
  const activeEvent = getActiveEvent(state);
  const visualSelection = resolveVisualSelection(state);
  const visibleActiveEvent = getVisibleActiveEvent(state);
  const visiblePreparedEvent = getVisiblePreparedEvent(state);

  const regionButtons = state.world.data.regions
    .map(
      (region) =>
        `<button class="choice-button" data-region-id="${escapeHtml(region.id)}">${escapeHtml(region.name)}</button>`
    )
    .join('');

  const sceneButtons = currentRegion
    ? state.world.data.scenes
        .filter((scene) => scene.regionId === currentRegion.id)
        .map(
          (scene) =>
            `<button class="choice-button" data-scene-id="${escapeHtml(scene.id)}">${escapeHtml(scene.name)}</button>`
        )
        .join('')
    : '';
  const shouldHideSceneButtons = !!visibleActiveEvent;
  const choiceButtons = currentRegion ? (shouldHideSceneButtons ? '' : sceneButtons) : regionButtons;

  const isGeneratingSceneEvent = !!(currentScene && state.ui.generatingSceneIds.includes(currentScene.id) && !visibleActiveEvent);
  const shouldShowTranscript = !activeEvent || !!visibleActiveEvent;
  const appTopTitle = currentScene
    ? `${currentRegion?.name ?? '城市'} / ${currentScene.name}`
    : currentRegion
      ? `当前位置：${currentRegion.name}`
      : '当前位置：夜城市';

  const historyMarkup = shouldShowTranscript
    ? state.event.transcript
        .map(
          (message) => `
            <div class="chat-message ${message.role}">
              <div class="chat-label">${escapeHtml(message.label)}</div>
              <div class="chat-content">${escapeHtml(message.content)}</div>
            </div>
          `
        )
        .join('')
    : '';

  const streamingMarkup =
    state.event.streamingReply && state.ui.mode === 'event' && visibleActiveEvent
      ? `
        <div
          class="chat-message character is-streaming"
          data-streaming-bubble
          role="button"
          tabindex="0"
          aria-label="点击立即显示当前整条回复"
          title="点击立即显示当前整条回复"
        >
          <div class="chat-label">${escapeHtml(state.event.streamingLabel || activeEvent?.cast[0] || '角色')}</div>
          <div class="chat-content" data-streaming-content>${escapeHtml(state.event.streamingReply)}<span class="stream-cursor"></span></div>
        </div>
      `
      : '';

  const visibleSceneSummary =
    currentScene && state.ui.sceneSummary.sceneId === currentScene.id ? state.ui.sceneSummary.content : null;
  const currentSceneError = currentScene ? state.ui.sceneGenerationErrors[currentScene.id] : null;
  const detailEvent = visibleActiveEvent ?? visiblePreparedEvent ?? (currentScene ? state.event.sceneEventCache[currentScene.id] : null);

  const loadingPlaceholder =
    isGeneratingSceneEvent
      ? `
        <div class="story-placeholder is-loading" aria-live="polite">
          <span class="loading-text">正在生成事件中</span>
          <span class="loading-dots" aria-hidden="true">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
          </span>
        </div>
      `
      : null;

  const emptyPrompt = visibleActiveEvent
    ? `【${visibleActiveEvent.title}】\n${visibleActiveEvent.openingState}`
    : visiblePreparedEvent
      ? `【${visiblePreparedEvent.title}】\n${visiblePreparedEvent.openingState}`
    : currentSceneError
      ? `事件生成失败：${currentSceneError}`
      : visibleSceneSummary ?? currentScene?.description ?? '选择一个区域，看看接下来会发生什么。';

  const streamSpeedHint =
    state.settings.streamCharsPerSecond <= 4 ? '慢' : state.settings.streamCharsPerSecond >= 12 ? '快' : '默认';
  const visibleEventForImage = visibleActiveEvent ?? visiblePreparedEvent;
  const canUseEventInput = !!(visibleActiveEvent || visiblePreparedEvent);
  const isGeneratingEventImage =
    !!visibleEventForImage &&
    state.ui.eventImageGeneration.eventId === visibleEventForImage.id &&
    state.ui.eventImageGeneration.isGenerating;
  const eventImageError =
    visibleEventForImage && state.ui.eventImageGeneration.eventId === visibleEventForImage.id
      ? state.ui.eventImageGeneration.error
      : null;
  const eventImageButton = visibleEventForImage
    ? `
      <button
        class="event-image-refresh-button ${isGeneratingEventImage ? 'is-loading' : ''}"
        data-action="generate-event-image"
        aria-label="${escapeHtml(isGeneratingEventImage ? '正在生成事件图' : '重新生成事件图')}"
        title="${escapeHtml(isGeneratingEventImage ? '正在生成事件图' : '重新生成事件图')}"
        ${isGeneratingEventImage ? 'disabled' : ''}
      >
        <span aria-hidden="true">↻</span>
      </button>
    `
    : '';
  const eventImageErrorMarkup = eventImageError
    ? `<div class="event-image-error" role="alert">出图失败：${escapeHtml(eventImageError)}</div>`
    : '';
  const latestImagePrompt = visibleEventForImage ? (state.event.generatedImagePrompts[visibleEventForImage.id] ?? '') : '';
  const imagePromptButton = visibleEventForImage
    ? `
      <button
        class="event-image-prompt-button"
        data-action="open-image-prompt"
        aria-label="查看上一次生图提示词"
        title="查看上一次生图提示词"
        ${latestImagePrompt ? '' : 'disabled'}
      >
        <span aria-hidden="true">i</span>
      </button>
    `
    : '';
  const mapOverlayButtons = !currentScene && !visibleActiveEvent && !visiblePreparedEvent
    ? `
      <div class="map-location-overlay">
        ${choiceButtons}
      </div>
    `
    : '';
  const displayedChoiceButtons = currentScene ? '' : choiceButtons;
  const bottomNav = renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) });

  if (state.ui.currentPage === 'task-planning') {
    const startMinutes = getClockTotalMinutes(state.clock);

    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page task-page" data-testid="task-planning-page">
          ${renderAppTopBar(state, '安排任务')}
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>全局行动</p>
              <h1>安排任务</h1>
            </div>
          </header>
          <div class="settings-scroll-content task-planning-scroll">
            <div class="settings-card task-form-card">
              <label class="task-field">
                <span>任务内容</span>
                <textarea data-task-content placeholder="例如：晨跑、复习数学、去商场买礼物"></textarea>
              </label>
              <div class="task-time-grid">
                <label class="task-field">
                  <span>开始时间</span>
                  <div class="task-readonly-value">${escapeHtml(formatTaskClockLabel(startMinutes))}</div>
                </label>
                <label class="task-field">
                  <span>持续时间</span>
                  <div class="task-duration-row">
                    <input data-task-duration-amount type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="任务持续时间数值" />
                    <select data-task-duration-unit aria-label="任务持续时间单位">
                      <option value="minutes">分钟</option>
                      <option value="hours" selected>小时</option>
                      <option value="days">天</option>
                      <option value="years">年</option>
                    </select>
                  </div>
                </label>
              </div>
              <div class="task-choice-grid" role="group" aria-label="任务执行方式">
                <label class="task-choice">
                  <input type="radio" name="task-execution-mode" value="result" checked />
                  <span>结果导向</span>
                </label>
                <label class="task-choice">
                  <input type="radio" name="task-execution-mode" value="process" />
                  <span>过程导向</span>
                </label>
              </div>
              <label class="task-field">
                <span>过程次数</span>
                <input data-task-segment-count type="number" min="1" step="1" value="5" inputmode="numeric" aria-label="任务过程拆分次数" />
              </label>
              ${state.task.error ? `<div class="event-image-error" role="alert">${escapeHtml(state.task.error)}</div>` : ''}
              <button class="settings-action-button" data-action="start-task" ${state.ui.isSending ? 'disabled' : ''}>开始任务</button>
            </div>
          </div>
          ${renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) })}
        </section>
      </div>
    `;
  }

  if (state.ui.currentPage === 'task-running') {
    const task = state.task.activeTask;
    const taskImageUrl = task?.generatedImageUrl ?? null;
    const isGeneratingTaskImage = !!task?.imageGeneration.isGenerating;
    const taskImageError = task?.imageGeneration.error ?? null;
    const taskProgress = task
      ? Math.min(
          100,
          Math.max(0, Math.round(((task.currentMinutes - task.startMinutes) / (task.endMinutes - task.startMinutes)) * 100))
        )
      : 0;
    const isResultTaskResolving = !!task && task.executionMode === 'result' && state.ui.isSending;
    return `
      <div class="phone-frame phone-frame--settings phone-frame--task-running">
        <section class="settings-page task-page task-running-page" data-testid="task-running-page">
          ${renderAppTopBar(
            state,
            task
              ? `${task.executionMode === 'result' ? '结果导向' : '过程导向'} · ${task.controlMode === 'manual' ? '手动托管' : '自动执行'} · 进度 ${taskProgress}%`
              : '任务流程'
          )}
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>${escapeHtml(task ? `${formatTaskClockLabel(task.startMinutes)} / ${formatTaskClockLabel(task.endMinutes)}` : state.clock.label)}</p>
              <h1>${escapeHtml(task?.title ?? '任务执行中')}</h1>
            </div>
          </header>
          ${
            task
              ? `
                <section class="visual-card task-visual-card" data-testid="task-visual-panel">
                  <p class="visual-label">${escapeHtml(task.title)}</p>
                  <div class="visual-stage visual-stage--task${taskImageUrl ? ' visual-stage--event-generated' : ''}${isGeneratingTaskImage ? ' visual-stage--image-generating' : ''}">
                    ${
                      taskImageUrl
                        ? `
                          <img
                            class="visual-background"
                            data-testid="task-visual-image"
                            ${renderImageSourceAttributes(taskImageUrl)}
                            alt="${escapeHtml(task.title)}"
                          />
                        `
                        : `
                          <div class="task-visual-placeholder" data-testid="task-visual-placeholder">
                            ${escapeHtml(isGeneratingTaskImage ? '正在生成任务画面' : '任务画面还没有生成')}
                          </div>
                        `
                    }
                    <div class="visual-shade"></div>
                    ${
                      isGeneratingTaskImage
                        ? `
                          <div class="event-image-generating-overlay" data-testid="task-image-generating-overlay" aria-hidden="true">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        `
                        : ''
                    }
                    <button
                      class="event-image-refresh-button ${isGeneratingTaskImage ? 'is-loading' : ''}"
                      data-action="generate-task-image"
                      aria-label="${escapeHtml(isGeneratingTaskImage ? '正在生成任务图' : '重新生成任务图')}"
                      title="${escapeHtml(isGeneratingTaskImage ? '正在生成任务图' : '重新生成任务图')}"
                      ${isGeneratingTaskImage || state.ui.isSending ? 'disabled' : ''}
                    >
                      <span aria-hidden="true">↻</span>
                    </button>
                  </div>
                  ${taskImageError ? `<div class="event-image-error" role="alert">出图失败：${escapeHtml(taskImageError)}</div>` : ''}
                </section>
                ${
                  isResultTaskResolving
                    ? `
                      <section class="task-result-loading-card" data-testid="task-result-loading" aria-live="polite">
                        <div class="task-result-loading-orb" aria-hidden="true">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <div class="task-result-loading-copy">
                          <p>后台生成中</p>
                          <h2>正在推演任务结果</h2>
                          <span>模型正在根据当前角色数据、世界记忆和任务内容，生成这次行动的结算影响。</span>
                        </div>
                        <div class="task-result-loading-meta">
                          <span>任务：${escapeHtml(task.title)}</span>
                          <span>时间：${escapeHtml(formatTaskClockLabel(task.startMinutes))} - ${escapeHtml(formatTaskClockLabel(task.endMinutes))}</span>
                          <span>时长：${escapeHtml(formatDurationMinutesLabel(task.durationMinutes))}</span>
                          <span>过程：${task.segmentCount} 次</span>
                        </div>
                        <div class="task-result-loading-steps" aria-label="任务推演阶段">
                          <span class="is-active">读取角色数据</span>
                          <span>推演行动经过</span>
                          <span>结算属性与背包</span>
                        </div>
                      </section>
                    `
                    : `
                      <article class="task-log" data-chat-history>
                        ${
                          task.segments.length
                            ? task.segments.map(renderTaskSegment).join('')
                            : `<div class="story-placeholder">${escapeHtml(state.ui.isSending ? '正在推演任务中...' : '还没有生成任务片段。')}</div>`
                        }
                        ${task.transcript
                          .map(
                            (message) => `
                              <div class="chat-message ${message.role}">
                                <div class="chat-label">${escapeHtml(message.label)}</div>
                                <div class="chat-content">${escapeHtml(message.content)}</div>
                              </div>
                            `
                          )
                          .join('')}
                        ${
                          task.streamingReply
                            ? `
                              <div
                                class="chat-message character is-streaming"
                                data-task-streaming-bubble
                                role="button"
                                tabindex="0"
                                aria-label="点击加速显示任务文本"
                                title="点击加速显示任务文本"
                              >
                                <div class="chat-label">${escapeHtml(task.streamingLabel || '世界')}</div>
                                <div class="chat-content" data-task-streaming-content>${escapeHtml(task.streamingReply)}<span class="stream-cursor"></span></div>
                              </div>
                            `
                            : ''
                        }
                        ${state.task.error ? `<div class="event-image-error" role="alert">${escapeHtml(state.task.error)}</div>` : ''}
                      </article>
                      <div class="input-row task-input-row ${task.controlMode === 'manual' ? '' : 'task-input-row--auto'}">
                        ${
                          task.controlMode === 'manual'
                            ? `<textarea placeholder="手动托管时输入你的介入内容。" ${!state.ui.isSending ? '' : 'disabled'}></textarea>`
                            : ''
                        }
                        <div class="action-row task-action-row">
                          ${
                            task.executionMode === 'process'
                              ? task.controlMode === 'manual'
                                ? `
                                  <button data-action="task-auto-mode" ${state.ui.isSending ? 'disabled' : ''}>交还自动</button>
                                `
                                : `
                                  <button data-action="task-next-segment" ${state.ui.isSending || task.currentMinutes >= task.endMinutes ? 'disabled' : ''}>下一段</button>
                                  <button data-action="task-manual-mode" ${state.ui.isSending ? 'disabled' : ''}>手动接管</button>
                                `
                              : ''
                          }
                          <button data-action="task-finish" ${state.ui.isSending ? 'disabled' : ''}>完成任务</button>
                          ${
                            task.controlMode === 'manual'
                              ? `<button data-action="task-send" ${!state.ui.isSending ? '' : 'disabled'}>发送</button>`
                              : ''
                          }
                        </div>
                      </div>
                    `
                }
              `
              : `
                <div class="settings-card event-detail-empty">
                  <h2>当前没有任务</h2>
                  <p>返回后可以重新安排一个全局任务。</p>
                </div>
              `
          }
          ${renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) })}
        </section>
      </div>
    `;
  }

  if (state.ui.currentPage === 'decision') {
    const completedTask = state.task.activeTask?.status === 'completed' ? state.task.activeTask : null;
    const completedTaskImageUrl = completedTask?.generatedImageUrl ?? null;
    const completedTaskImageError = completedTask?.imageGeneration.error ?? null;

    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page task-page" data-testid="decision-page">
          ${renderAppTopBar(state, '任务完成')}
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>${escapeHtml(state.clock.label)}</p>
              <h1>接下来做什么</h1>
            </div>
          </header>
          <div class="settings-scroll-content decision-scroll">
            <section class="decision-result-card">
              <div class="decision-result-icon">✓</div>
              <div>
                <h2>任务完成</h2>
                <p>行动已经结算，新的世界状态已记录。</p>
              </div>
              <dl>
                <div>
                  <dt>任务评级</dt>
                  <dd>A</dd>
                </div>
                <div>
                  <dt>完成用时</dt>
                  <dd>${escapeHtml(state.clock.label)}</dd>
                </div>
                <div>
                  <dt>获得线索</dt>
                  <dd>${state.task.lastCompletedFacts.length} 条</dd>
                </div>
              </dl>
            </section>
            <div class="settings-card task-summary-card">
              <strong>刚完成的任务</strong>
              <p>${escapeHtml(state.task.lastCompletedSummary || '上一段行动已经结束，世界重新回到可选择的状态。')}</p>
            </div>
            ${renderSettlementEffectsCard(state.settlement.lastEffects)}
            ${
              completedTask
                ? `
                  <section class="visual-card decision-visual-card" data-testid="decision-task-visual-panel">
                    <p class="visual-label">${escapeHtml(completedTask?.title ?? '任务画面')}</p>
                    <div class="visual-stage visual-stage--task${completedTaskImageUrl ? ' visual-stage--event-generated' : ''}">
                      ${
                        completedTaskImageUrl
                          ? `
                            <img
                              class="visual-background"
                              data-testid="decision-task-visual-image"
                              ${renderImageSourceAttributes(completedTaskImageUrl)}
                              alt="${escapeHtml(completedTask?.title ?? '任务画面')}"
                            />
                          `
                          : `
                            <div class="task-visual-placeholder" data-testid="decision-task-visual-placeholder">
                              ${escapeHtml(completedTaskImageError ? '任务画面生成失败' : '任务画面还没有生成')}
                            </div>
                          `
                      }
                      <div class="visual-shade"></div>
                    </div>
                    ${completedTaskImageError ? `<div class="event-image-error" role="alert">任务画面生成失败：${escapeHtml(completedTaskImageError)}</div>` : ''}
                  </section>
                `
                : ''
            }
            ${
              state.task.lastCompletedFacts.length
                ? `
                  <div class="settings-card">
                    <div class="settings-section-heading">
                      <strong>留下的线索</strong>
                      <span>${state.task.lastCompletedFacts.length} 条</span>
                    </div>
                    <ul class="event-detail-list">
                      ${state.task.lastCompletedFacts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}
                    </ul>
                  </div>
                `
                : ''
            }
            <div class="decision-actions">
              <button class="settings-action-button" data-action="open-task-planning">安排新任务</button>
              <button class="settings-action-button decision-secondary" data-action="back-to-game">回到地图探索</button>
            </div>
          </div>
          ${renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) })}
        </section>
      </div>
    `;
  }

  if (state.ui.currentPage === 'character') {
    const characterCards = state.world.data.characters.length
      ? state.world.data.characters
          .map((character) => {
            const sourceLabel = character.source === 'runtime_generated' ? '新遇见' : '原版';
            const knownFacts = character.knownFacts?.length
              ? character.knownFacts.slice(-4).map((fact) => `<span>${escapeHtml(fact)}</span>`).join('')
              : '<span>还没有更多记录</span>';

            return `
              <article class="character-profile-card" data-testid="character-profile-card">
                <div class="character-profile-image">
                  ${
                    character.imageUrl
                      ? `<img ${renderImageSourceAttributes(character.imageUrl)} alt="${escapeHtml(character.name)}的人物立绘" />`
                      : `<div class="character-profile-placeholder" aria-label="${escapeHtml(character.name)}暂无立绘">${escapeHtml(character.name.slice(0, 2))}</div>`
                  }
                </div>
                <div class="character-profile-body">
                  <div class="character-profile-kicker">
                    <span>${escapeHtml(sourceLabel)}</span>
                    <span>${escapeHtml(character.lastSeenAt ?? character.firstMetAt ?? '时间未记录')}</span>
                  </div>
                  <h2>${escapeHtml(character.name)}</h2>
                  <p class="character-profile-identity">${escapeHtml(character.identity)}</p>
                  <dl class="character-profile-meta">
                    <div>
                      <dt>关系</dt>
                      <dd>${escapeHtml(character.relationshipToPlayer || '暂无')}</dd>
                    </div>
                    <div>
                      <dt>初遇</dt>
                      <dd>${escapeHtml(character.firstMetLocation ?? '未知地点')}</dd>
                    </div>
                    <div>
                      <dt>性格</dt>
                      <dd>${escapeHtml(character.personality || '仍在观察中')}</dd>
                    </div>
                    <div>
                      <dt>样貌</dt>
                      <dd>${escapeHtml(character.currentLook ?? character.appearance ?? '还没有稳定记录')}</dd>
                    </div>
                  </dl>
                  <div class="character-fact-list">
                    ${knownFacts}
                  </div>
                </div>
              </article>
            `;
          })
          .join('')
      : '<div class="settings-card event-detail-empty"><h2>还没有人物卡</h2><p>事件或任务结束后，值得保留的新角色会出现在这里。</p></div>';
    const statGroupCards = state.player.statGroups
      .map(
        (group) => `
          <div class="settings-card">
            <div class="settings-section-heading">
              <strong>${escapeHtml(group.label)}</strong>
              <span>${group.stats.length} 项</span>
            </div>
            <div class="player-stat-grid">
              ${group.stats
                .map(
                  (stat) => `
                    <div class="player-stat-row">
                      <span>${escapeHtml(stat.label)}</span>
                      <strong>${escapeHtml(String(stat.value))}</strong>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>
        `
      )
      .join('');
    const inventoryMarkup = state.player.inventory.items.length
      ? state.player.inventory.items
          .map(
            (item) => `
              <article class="inventory-item-card">
                <div class="settings-section-heading">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>x${escapeHtml(String(item.quantity))}</span>
                </div>
                <p>${escapeHtml(item.description)}</p>
                <p class="inventory-ability">${escapeHtml(item.abilityText)}</p>
                <div class="inventory-effects">
                  ${
                    item.effects.length
                      ? item.effects
                          .map(
                            (effect) =>
                              `<span>${escapeHtml(
                                [effect.type, effect.scope ? `scope=${effect.scope}` : '', effect.value !== undefined ? `value=${String(effect.value)}` : '']
                                  .filter(Boolean)
                                  .join(' · ')
                              )}</span>`
                          )
                          .join('')
                      : '<span>暂无结构化效果</span>'
                  }
                </div>
              </article>
            `
          )
          .join('')
      : '<div class="settings-card event-detail-empty"><h2>背包还是空的</h2><p>任务或事件结算后，获得的物品会出现在这里。</p></div>';
    const settlementEffects = state.settlement.lastEffects.length
      ? `
        <div class="settings-card">
          <div class="settings-section-heading">
            <strong>最近结算影响</strong>
            <span>${state.settlement.lastEffects.length} 项</span>
          </div>
          <ul class="event-detail-list">
            ${state.settlement.lastEffects
              .map((effect) => `<li>${escapeHtml(JSON.stringify(effect))}</li>`)
              .join('')}
          </ul>
        </div>
      `
      : '';

    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page character-page" data-testid="character-page">
          ${renderAppTopBar(state, '角色')}
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>当前权威数据</p>
              <h1>人物档案</h1>
            </div>
          </header>
          <div class="settings-scroll-content settings-panel-scroll">
            <section class="character-gallery-section" aria-label="人物图鉴">
              <div class="settings-section-heading character-gallery-heading">
                <strong>人物图鉴</strong>
                <span>${state.world.data.characters.length} 张人物卡</span>
              </div>
              <div class="character-profile-list">
                ${characterCards}
              </div>
            </section>
            <div class="settings-section-heading character-player-heading">
              <strong>主角状态</strong>
              <span>属性与背包</span>
            </div>
            <div class="settings-card player-money-card">
              <span>当前资产</span>
              <strong>${escapeHtml(String(state.player.money))}</strong>
            </div>
            ${statGroupCards}
            <div class="settings-card">
              <div class="settings-section-heading">
                <strong>背包</strong>
                <span>${state.player.inventory.items.length} 件物品</span>
              </div>
            </div>
            ${inventoryMarkup}
            ${settlementEffects}
          </div>
          ${renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) })}
        </section>
      </div>
    `;
  }

  if (state.ui.currentPage === 'settings') {
    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page" data-testid="settings-page">
          ${renderAppTopBar(state, '设置')}
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>设置</p>
              <h1>游戏设置</h1>
            </div>
          </header>
          <div class="settings-scroll-content settings-panel-scroll">
            <div class="settings-card">
              <div class="settings-section-heading">
                <strong>模型选择</strong>
                <span>当前：${escapeHtml(state.settings.currentModel)}</span>
              </div>
              <div class="settings-option-list">
                ${state.settings.availableModels
                  .map(
                    (model) =>
                      `<button class="model-option ${model === state.settings.currentModel ? 'is-active' : ''}" data-model-id="${escapeHtml(model)}">${escapeHtml(model)}</button>`
                  )
                  .join('')}
              </div>
            </div>
            <div class="settings-card">
              <div class="stream-speed-header">
                <strong>流式输出速度</strong>
                <span>${state.settings.streamCharsPerSecond} 字/秒 · ${streamSpeedHint}</span>
              </div>
              <input
                class="stream-speed-slider"
                data-stream-speed-slider
                type="range"
                min="1"
                max="20"
                step="1"
                value="${state.settings.streamCharsPerSecond}"
                aria-label="流式输出速度"
              />
              <div class="stream-speed-scale">
                <span>慢</span>
                <span>每秒</span>
                <span>快</span>
              </div>
            </div>
            <div class="settings-card">
              <div class="settings-section-heading">
                <strong>线索整理</strong>
                <span>压缩当前记忆</span>
              </div>
              <button class="settings-action-button" data-action="compress">整理线索</button>
            </div>
            <div class="settings-card save-management-card">
              <div class="settings-section-heading">
                <strong>数据管理</strong>
                <span>导入 / 导出 / 重置</span>
              </div>
              <p class="save-management-copy">导出当前完整进度，或把同版本客户端导出的存档导入回来。</p>
              <div class="save-management-actions">
                <button class="settings-action-button" data-action="export-game-save">导出游戏数据</button>
                <button class="settings-action-button decision-secondary" data-action="import-game-save">导入游戏数据</button>
                <button class="settings-action-button settings-danger-button" data-action="reset-game-progress">重置游戏进度</button>
              </div>
              <input data-game-save-input class="visually-hidden-file" type="file" accept="application/zip,.zip" />
            </div>
          </div>
          ${renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) })}
        </section>
      </div>
    `;
  }

  if (state.ui.currentPage === 'event-details') {
    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page event-details-page" data-testid="event-details-page">
          ${renderAppTopBar(state, '事件互动')}
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>生成事件</p>
              <h1>事件详情</h1>
            </div>
          </header>
          <div class="event-details-scroll">
          ${
            detailEvent
              ? `
                <div class="settings-card event-detail-summary">
                  <div>
                    <p>${escapeHtml(detailEvent.locationLabel)}</p>
                    <h2>${escapeHtml(detailEvent.title)}</h2>
                  </div>
                  <div class="event-detail-pills">
                    <span class="time-pill">${escapeHtml(detailEvent.snapshot.timeLabel)}</span>
                    <span class="mode-pill">${escapeHtml(detailEvent.status)}</span>
                    <span class="phase-pill">${escapeHtml(phaseLabels[detailEvent.currentPhase])}</span>
                  </div>
                </div>
                <dl class="settings-card event-detail-list-card">
                  ${renderDetailRow('事件 ID', detailEvent.id)}
                  ${renderDetailRow('所在场景', detailEvent.sceneId)}
                  ${renderDetailList('登场角色', detailEvent.cast)}
                  ${renderDetailRow('事件前提', detailEvent.premise)}
                  ${renderDetailRow('开场状态', detailEvent.openingState)}
                  ${renderDetailRow('推进目标', detailEvent.buildUpGoal)}
                  ${renderDetailRow('越界触发', detailEvent.overlimitTrigger)}
                  ${renderDetailRow('收束方向', detailEvent.resolutionDirection)}
                  ${renderDetailList('悬念线索', detailEvent.suspenseThreads)}
                  ${renderDetailList('事实记录', detailEvent.facts)}
                  ${renderDetailList('阶段历史', detailEvent.phaseHistory.map((phase) => phaseLabels[phase]))}
                  ${renderDetailRow('生成时世界版本', String(detailEvent.snapshot.worldRevision))}
                  ${renderDetailRow('生成时记忆摘要', detailEvent.snapshot.memorySummary)}
                  ${renderDetailList('生成时记忆事实', detailEvent.snapshot.memoryFacts)}
                </dl>
              `
              : `
                <div class="settings-card event-detail-empty">
                  <h2>${currentScene ? '事件还没有生成完成' : '还没有选中场景'}</h2>
                  <p>${currentSceneError ? `事件生成失败：${escapeHtml(currentSceneError)}` : '回到场景中，等待事件生成完成后，就能在这里查看完整信息列表。'}</p>
                </div>
              `
          }
          </div>
          ${renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) })}
        </section>
      </div>
    `;
  }

  if (state.ui.currentPage === 'image-prompt') {
    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page event-details-page" data-testid="image-prompt-page">
          ${renderAppTopBar(state, '生图提示词')}
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>生成图片</p>
              <h1>上次生图提示词</h1>
            </div>
          </header>
          <div class="event-details-scroll">
            <div class="settings-card event-detail-summary">
              <div>
                <p>${escapeHtml(visibleEventForImage?.locationLabel ?? currentScene?.name ?? '当前场景')}</p>
                <h2>${escapeHtml(visibleEventForImage?.title ?? '暂无生成事件')}</h2>
              </div>
            </div>
            <div class="settings-card image-prompt-card">
              <p>${escapeHtml(latestImagePrompt || '还没有生成过图片。回到场景后点击右下角刷新按钮生成一次图片，就能在这里查看最新提示词。')}</p>
            </div>
          </div>
          ${renderBottomNav(state, { hasEventContext: !!(currentScene || visibleActiveEvent || visiblePreparedEvent) })}
        </section>
      </div>
    `;
  }

  const frameModeClass = canUseEventInput
    ? 'phone-frame--event'
    : currentScene
      ? 'phone-frame--scene'
      : 'phone-frame--map';

  return `
    <div class="phone-frame ${frameModeClass}">
      <section class="visual-panel" data-testid="visual-panel">
        ${renderAppTopBar(
          state,
          canUseEventInput
            ? `${appTopTitle} · ${visibleActiveEvent ? '事件中' : '待开场'} · ${state.settings.currentModel}`
            : isGeneratingSceneEvent
              ? `${appTopTitle} · 生成中 · ${state.settings.currentModel}`
            : appTopTitle
        )}
        <div class="visual-card">
          <p class="visual-label">${escapeHtml(visualSelection.locationLabel)}</p>
          <div class="visual-stage visual-stage--${visualSelection.mode}${visualSelection.isGeneratedEventImage ? ' visual-stage--event-generated' : ''}${isGeneratingEventImage ? ' visual-stage--image-generating' : ''}">
            <img
              class="visual-background"
              data-testid="visual-background"
              ${renderImageSourceAttributes(visualSelection.background)}
              alt="${escapeHtml(visualSelection.locationLabel)}"
            />
            ${
              visualSelection.character
                ? `<img
                    class="visual-character"
                    data-testid="visual-character"
                    ${renderImageSourceAttributes(visualSelection.character)}
                    alt="${escapeHtml(activeEvent?.cast[0] ?? '角色肖像')}"
                  />`
                : ''
            }
            <div class="visual-shade"></div>
            ${
              isGeneratingEventImage
                ? `
                  <div class="event-image-generating-overlay" data-testid="event-image-generating-overlay" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                `
                : ''
            }
            ${imagePromptButton}
            ${eventImageButton}
            ${mapOverlayButtons}
          </div>
        </div>
      </section>
      <section class="dialogue-panel ${canUseEventInput ? 'dialogue-panel--event' : ''} ${isGeneratingSceneEvent ? 'dialogue-panel--scene-generating' : ''}" data-testid="dialogue-panel">
        ${
          canUseEventInput || isGeneratingSceneEvent
            ? ''
            : `
              <header class="status-row">
                <div>
                  <strong>${escapeHtml(currentRegion?.name ?? '城市')}</strong>
                  <span>${currentScene ? ` / ${escapeHtml(currentScene.name)}` : ''}</span>
                </div>
                <div class="status-tools">
                  <span class="time-pill">${escapeHtml(state.clock.label)}</span>
                  <span class="mode-pill">${escapeHtml(visibleActiveEvent ? '事件中' : visiblePreparedEvent ? '待开场' : '探索中')}</span>
                  <span class="model-toggle">${escapeHtml(state.settings.currentModel)}</span>
                </div>
              </header>
            `
        }
        <article class="story-box" data-chat-history>
          ${historyMarkup || loadingPlaceholder || `<div class="story-placeholder">${escapeHtml(emptyPrompt)}</div>`}
          ${eventImageErrorMarkup}
          ${streamingMarkup}
        </article>
        ${
          displayedChoiceButtons
            ? `<div class="choices ${mapOverlayButtons ? 'choices--compact' : ''}">${displayedChoiceButtons}</div>`
            : choiceButtons
              ? `<div class="choices choices--hidden" aria-hidden="true">${choiceButtons}</div>`
              : ''
        }
        ${
          canUseEventInput
            ? `
              <div class="input-row">
                <textarea placeholder="输入你的回应；回车发送，Shift+回车换行。"></textarea>
                <div class="action-row">
                  <button data-action="open-event-details" ${currentScene || visibleActiveEvent ? '' : 'disabled'}>事件详情</button>
                  ${
                    visibleActiveEvent
                      ? `
                        <button data-action="continue-story" ${!state.ui.isSending ? '' : 'disabled'}>继续剧情</button>
                        <button data-action="end-event" ${!state.ui.isSending ? '' : 'disabled'}>结束事件</button>
                      `
                      : '<button data-action="back">离开地点</button>'
                  }
                  <button data-action="send" ${!state.ui.isSending ? '' : 'disabled'}>
                    ${escapeHtml(state.ui.isSending ? '生成中' : '发送')}
                  </button>
                </div>
              </div>
            `
            : `
              <div class="explore-command-panel">
                <button class="explore-primary" ${currentScene ? `data-scene-id="${escapeHtml(currentScene.id)}"` : 'disabled'}>
                  ${escapeHtml(currentScene ? '探索事件' : '选择地点')}
                </button>
                <button class="explore-secondary" data-action="open-task-planning" ${state.ui.isSending ? 'disabled' : ''}>安排任务</button>
                <button class="explore-ghost" data-action="open-event-details" ${currentScene ? '' : 'disabled'}>事件详情</button>
                <button class="explore-ghost" data-action="back">${currentRegion ? '离开地点' : '重置地图'}</button>
              </div>
            `
        }
        ${bottomNav}
      </section>
    </div>
  `;
};
