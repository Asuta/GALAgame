import type { GameState } from '../state/store';
import { createAppMarkup, renderCharacterDiscoveryReview } from './templates';

export const renderApp = (root: HTMLDivElement, state: GameState): void => {
  root.innerHTML = createAppMarkup(state) + renderCharacterDiscoveryReview(state);
};
