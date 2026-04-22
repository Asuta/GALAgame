import type { GameState } from '../state/store';
import { createAppMarkup } from './templates';

export const renderApp = (root: HTMLDivElement, state: GameState): void => {
  root.innerHTML = createAppMarkup(state);
};
