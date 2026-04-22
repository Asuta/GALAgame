import { createPhaserHost } from '../game/createPhaserHost';
import { createInitialState } from '../state/store';
import { bindUi } from '../ui/bindings';
import { renderApp } from '../ui/renderApp';

export const createApp = (root: HTMLDivElement): void => {
  renderApp(root, createInitialState());
  createPhaserHost('phaser-root');
  bindUi(root);
};
