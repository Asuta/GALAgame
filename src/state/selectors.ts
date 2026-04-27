import type { GameState } from './store';

export const getCurrentRegion = (state: GameState) =>
  state.world.data.regions.find((region) => region.id === state.navigation.currentRegionId) ?? null;

export const getCurrentScene = (state: GameState) =>
  state.world.data.scenes.find((scene) => scene.id === state.navigation.currentSceneId) ?? null;

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

export const getVisiblePreparedEvent = (state: GameState) => {
  const currentScene = getCurrentScene(state);

  if (!currentScene) {
    return null;
  }

  const preparedEvent = state.event.sceneEventCache[currentScene.id];

  if (!preparedEvent || preparedEvent.status !== 'seeded') {
    return null;
  }

  if (preparedEvent.snapshot.timeSlot !== state.clock.timeSlot) {
    return null;
  }

  if (preparedEvent.snapshot.worldRevision !== state.world.revision) {
    return null;
  }

  return preparedEvent;
};
