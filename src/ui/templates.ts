import { worldData } from '../data/world';
import { getActiveEvent, getCurrentRegion, getCurrentScene, getVisibleActiveEvent, getVisiblePreparedEvent } from '../state/selectors';
import type { GameState } from '../state/store';
import { resolveVisualSelection } from '../visual/assetCatalog';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

export const createAppMarkup = (state: GameState): string => {
  const currentRegion = getCurrentRegion(state);
  const currentScene = getCurrentScene(state);
  const activeEvent = getActiveEvent(state);
  const visualSelection = resolveVisualSelection(state);
  const visibleActiveEvent = getVisibleActiveEvent(state);
  const visiblePreparedEvent = getVisiblePreparedEvent(state);

  const regionButtons = worldData.regions
    .map(
      (region) =>
        `<button class="choice-button" data-region-id="${escapeHtml(region.id)}">${escapeHtml(region.name)}</button>`
    )
    .join('');

  const sceneButtons = currentRegion
    ? worldData.scenes
        .filter((scene) => scene.regionId === currentRegion.id)
        .map(
          (scene) =>
            `<button class="choice-button" data-scene-id="${escapeHtml(scene.id)}">${escapeHtml(scene.name)}</button>`
        )
        .join('')
    : '';
  const shouldHideSceneButtons = !!visibleActiveEvent;
  const choiceButtons = currentRegion ? (shouldHideSceneButtons ? '' : sceneButtons) : regionButtons;

  const shouldShowTranscript = !activeEvent || !!visibleActiveEvent;

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
    currentScene && state.ui.generatingSceneIds.includes(currentScene.id) && !visibleActiveEvent
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

  if (state.ui.currentPage === 'settings') {
    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page" data-testid="settings-page">
          <header class="settings-header">
            <button class="settings-back-button" data-action="back-to-game" aria-label="返回游戏">←</button>
            <div>
              <p>设置</p>
              <h1>游戏设置</h1>
            </div>
          </header>
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
        </section>
      </div>
    `;
  }

  if (state.ui.currentPage === 'event-details') {
    return `
      <div class="phone-frame phone-frame--settings">
        <section class="settings-page event-details-page" data-testid="event-details-page">
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
        </section>
      </div>
    `;
  }

  return `
    <div class="phone-frame">
      <section class="visual-panel" data-testid="visual-panel">
        <div class="visual-card">
          <p class="visual-label">${escapeHtml(visualSelection.locationLabel)}</p>
          <div class="visual-stage visual-stage--${visualSelection.mode}${visualSelection.isGeneratedEventImage ? ' visual-stage--event-generated' : ''}">
            <img
              class="visual-background"
              data-testid="visual-background"
              src="${escapeHtml(visualSelection.background)}"
              alt="${escapeHtml(visualSelection.locationLabel)}"
            />
            ${
              visualSelection.character
                ? `<img
                    class="visual-character"
                    data-testid="visual-character"
                    src="${escapeHtml(visualSelection.character)}"
                    alt="${escapeHtml(activeEvent?.cast[0] ?? '角色肖像')}"
                  />`
                : ''
            }
            <div class="visual-shade"></div>
            ${eventImageButton}
          </div>
        </div>
      </section>
      <section class="dialogue-panel" data-testid="dialogue-panel">
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
        <article class="story-box" data-chat-history>
          ${historyMarkup || loadingPlaceholder || `<div class="story-placeholder">${escapeHtml(emptyPrompt)}</div>`}
          ${eventImageErrorMarkup}
          ${streamingMarkup}
        </article>
        <div class="choices">
          ${choiceButtons}
        </div>
        <div class="input-row">
          <textarea placeholder="输入你想说的话。第一次发送后正式进入事件；回车发送，Shift+回车换行。" ${visibleActiveEvent || visiblePreparedEvent ? '' : 'disabled'}></textarea>
          <div class="action-row">
            <button data-action="open-settings">设置</button>
            <button data-action="open-event-details" ${currentScene || visibleActiveEvent ? '' : 'disabled'}>事件详情</button>
            ${
              visibleActiveEvent
                ? `
                  <button data-action="continue-story" ${!state.ui.isSending ? '' : 'disabled'}>继续剧情</button>
                  <button data-action="end-event" ${!state.ui.isSending ? '' : 'disabled'}>结束当前事件</button>
                `
                : '<button data-action="back">离开地点</button>'
            }
            <button data-action="send" ${(visibleActiveEvent || visiblePreparedEvent) && !state.ui.isSending ? '' : 'disabled'}>
              ${escapeHtml(state.ui.isSending ? '生成中' : '发送')}
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
};
