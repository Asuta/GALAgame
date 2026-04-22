import { worldData } from '../data/world';
import type { GameState } from './store';

export const getCurrentRegion = (state: GameState) =>
  worldData.regions.find((region) => region.id === state.navigation.currentRegionId) ?? null;

export const getCurrentScene = (state: GameState) =>
  worldData.scenes.find((scene) => scene.id === state.navigation.currentSceneId) ?? null;

export const getActiveEvent = (state: GameState) =>
  worldData.events.find((storyEvent) => storyEvent.id === state.event.activeEventId) ?? null;
