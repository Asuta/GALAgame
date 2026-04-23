import { worldData } from '../data/world';
import type { GameState } from './store';

export const getCurrentRegion = (state: GameState) =>
  worldData.regions.find((region) => region.id === state.navigation.currentRegionId) ?? null;

export const getCurrentScene = (state: GameState) =>
  worldData.scenes.find((scene) => scene.id === state.navigation.currentSceneId) ?? null;

export const getActiveEvent = (state: GameState) => state.event.activeEvent;

export const getVisibleActiveEvent = (state: GameState) => {
  const currentScene = getCurrentScene(state);
  const activeEvent = getActiveEvent(state);

  if (!activeEvent) {
    return null;
  }

  if (!currentScene) {
    return activeEvent;
  }

  return activeEvent.sceneId === currentScene.id ? activeEvent : null;
};
