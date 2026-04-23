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
        <div class="chat-message character is-streaming">
          <div class="chat-label">${escapeHtml(state.event.streamingLabel || activeEvent?.cast[0] || '角色')}</div>
          <div class="chat-content">${escapeHtml(state.event.streamingReply)}<span class="stream-cursor"></span></div>
        </div>
      `
      : '';

  const visibleSceneSummary =
    currentScene && state.ui.sceneSummary.sceneId === currentScene.id ? state.ui.sceneSummary.content : null;
  const currentSceneError = currentScene ? state.ui.sceneGenerationErrors[currentScene.id] : null;

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

  return `
    <div class="phone-frame">
      <section class="visual-panel" data-testid="visual-panel">
        <div class="visual-card">
          <p class="visual-label">${escapeHtml(visualSelection.locationLabel)}</p>
          <div class="visual-stage visual-stage--${visualSelection.mode}">
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
          ${streamingMarkup}
        </article>
        <div class="choices">
          ${choiceButtons}
        </div>
        <div class="input-row">
          <textarea placeholder="输入你想说的话。第一次发送后正式进入事件；回车发送，Shift+回车换行。" ${visibleActiveEvent || visiblePreparedEvent ? '' : 'disabled'}></textarea>
          <div class="action-row">
            <button data-action="open-settings">设置</button>
            ${
              visibleActiveEvent
                ? `<button data-action="end-event" ${!state.ui.isSending ? '' : 'disabled'}>结束当前事件</button>`
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
