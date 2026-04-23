import { worldData } from '../data/world';
import { getActiveEvent, getCurrentRegion, getCurrentScene } from '../state/selectors';
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

  const historyMarkup = state.event.transcript
    .map(
      (message) => `
        <div class="chat-message ${message.role}">
          <div class="chat-label">${escapeHtml(message.label)}</div>
          <div class="chat-content">${escapeHtml(message.content)}</div>
        </div>
      `
    )
    .join('');

  const streamingMarkup =
    state.event.streamingReply && state.ui.mode === 'event'
      ? `
        <div class="chat-message character is-streaming">
          <div class="chat-label">${escapeHtml(state.event.streamingLabel || activeEvent?.cast[0] || '角色')}</div>
          <div class="chat-content">${escapeHtml(state.event.streamingReply)}<span class="stream-cursor"></span></div>
        </div>
      `
      : '';

  const visibleSceneSummary =
    currentScene && state.ui.sceneSummary.sceneId === currentScene.id ? state.ui.sceneSummary.content : null;

  const emptyPrompt = activeEvent
    ? `【${activeEvent.title}】\n${activeEvent.openingState}`
    : visibleSceneSummary ?? currentScene?.description ?? '选择一个区域，看看接下来会发生什么。';

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
            <button class="model-toggle" data-action="toggle-model-menu">${escapeHtml(state.settings.currentModel)}</button>
            <span class="mode-pill">${escapeHtml(state.ui.mode === 'event' ? '事件中' : '探索中')}</span>
          </div>
        </header>
        ${state.ui.isModelMenuOpen
          ? `<div class="model-menu">
              ${state.settings.availableModels
                .map(
                  (model) =>
                    `<button class="model-option ${model === state.settings.currentModel ? 'is-active' : ''}" data-model-id="${escapeHtml(model)}">${escapeHtml(model)}</button>`
                )
                .join('')}
            </div>`
          : ''}
        <article class="story-box" data-chat-history>
          ${historyMarkup || `<div class="story-placeholder">${escapeHtml(emptyPrompt)}</div>`}
          ${streamingMarkup}
        </article>
        <div class="choices">
          ${currentRegion ? sceneButtons : regionButtons}
        </div>
        <div class="input-row">
          <textarea placeholder="进入事件后，在这里输入你想说的话。回车发送，Shift+回车换行。" ${state.ui.mode === 'event' ? '' : 'disabled'}></textarea>
          <div class="action-row">
            <button data-action="compress">整理线索</button>
            <button data-action="end-event" ${state.ui.mode === 'event' && !state.ui.isSending ? '' : 'disabled'}>结束当前事件</button>
            <button data-action="back">离开地点</button>
            <button data-action="send" ${state.ui.mode === 'event' && !state.ui.isSending ? '' : 'disabled'}>
              ${escapeHtml(state.ui.isSending ? '生成中' : '发送')}
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
};
