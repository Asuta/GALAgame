import { worldData } from '../data/world';
import { getActiveEvent, getCurrentRegion, getCurrentScene } from '../state/selectors';
import type { GameState } from '../state/store';

export const createAppMarkup = (state: GameState): string => {
  const currentRegion = getCurrentRegion(state);
  const currentScene = getCurrentScene(state);
  const activeEvent = getActiveEvent(state);

  const regionButtons = worldData.regions
    .map((region) => `<button class="choice-button" data-region-id="${region.id}">${region.name}</button>`)
    .join('');

  const sceneButtons = currentRegion
    ? worldData.scenes
        .filter((scene) => scene.regionId === currentRegion.id)
        .map((scene) => `<button class="choice-button" data-scene-id="${scene.id}">${scene.name}</button>`)
        .join('')
    : '';

  const historyMarkup = state.event.transcript
    .map(
      (message) => `
        <div class="chat-message ${message.role}">
          <div class="chat-label">${message.label}</div>
          <div class="chat-content">${message.content}</div>
        </div>
      `
    )
    .join('');

  const streamingMarkup =
    state.event.streamingReply && state.ui.mode === 'event'
      ? `
        <div class="chat-message character is-streaming">
          <div class="chat-label">${state.event.streamingLabel || activeEvent?.cast[0] || '角色'}</div>
          <div class="chat-content">${state.event.streamingReply}<span class="stream-cursor"></span></div>
        </div>
      `
      : '';

  const emptyPrompt = activeEvent
    ? activeEvent.intro
    : currentScene?.description ?? state.memory.summary;

  return `
    <div class="phone-frame">
      <section class="visual-panel" data-testid="visual-panel">
        <div class="visual-card">
          <p class="visual-label">${currentRegion ? currentRegion.name : '世界地图'}</p>
          <div id="phaser-root" class="visual-stage"></div>
        </div>
      </section>
      <section class="dialogue-panel" data-testid="dialogue-panel">
        <header class="status-row">
          <div>
            <strong>${currentRegion?.name ?? '城市'}</strong>
            <span>${currentScene ? ` / ${currentScene.name}` : ''}</span>
          </div>
          <div class="status-tools">
            <button class="model-toggle" data-action="toggle-model-menu">${state.settings.currentModel}</button>
            <span class="mode-pill">${state.ui.mode === 'event' ? '事件中' : '探索中'}</span>
          </div>
        </header>
        ${state.ui.isModelMenuOpen
          ? `<div class="model-menu">
              ${state.settings.availableModels
                .map(
                  (model) =>
                    `<button class="model-option ${model === state.settings.currentModel ? 'is-active' : ''}" data-model-id="${model}">${model}</button>`
                )
                .join('')}
            </div>`
          : ''}
        <article class="story-box" data-chat-history>
          ${historyMarkup || `<div class="story-placeholder">${emptyPrompt}</div>`}
          ${streamingMarkup}
        </article>
        <section class="memory-box">
          <h3>记忆</h3>
          <p>${state.memory.summary}</p>
          <ul>
            ${state.memory.facts.map((fact) => `<li>${fact}</li>`).join('')}
          </ul>
        </section>
        <div class="choices">
          ${currentRegion ? sceneButtons : regionButtons}
        </div>
        <div class="input-row">
          <textarea placeholder="进入事件后，在这里输入你想说的话。回车发送，Shift+回车换行。" ${state.ui.mode === 'event' ? '' : 'disabled'}></textarea>
          <div class="action-row">
            <button data-action="compress">记忆压缩</button>
            <button data-action="end-event" ${state.ui.mode === 'event' && !state.ui.isSending ? '' : 'disabled'}>结束当前事件</button>
            <button data-action="back">离开地点</button>
            <button data-action="send" ${state.ui.mode === 'event' && !state.ui.isSending ? '' : 'disabled'}>
              ${state.ui.isSending ? '生成中' : '发送'}
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
};
