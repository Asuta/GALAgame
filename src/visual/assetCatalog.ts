import { worldData } from '../data/world';
import type { GameState } from '../state/store';

const REGION_BACKGROUNDS = {
  school: '/assets/backgrounds/region-school-main.png',
  hospital: '/assets/backgrounds/region-hospital-main.png',
  mall: '/assets/backgrounds/region-mall-main.png',
  home: '/assets/backgrounds/region-home-main.png'
} as const;
type VisualRegionId = keyof typeof REGION_BACKGROUNDS;

const SCENE_BACKGROUNDS = {
  classroom: '/assets/backgrounds/scene-classroom-main.png',
  hallway: '/assets/backgrounds/scene-hallway-main.png',
  playground: '/assets/backgrounds/scene-playground-main.png',
  rooftop: '/assets/backgrounds/scene-rooftop-main.png',
  lobby: '/assets/backgrounds/scene-lobby-main.png',
  ward: '/assets/backgrounds/scene-ward-main.png',
  'hospital-hallway': '/assets/backgrounds/scene-hospital-hallway-main.png',
  'vending-zone': '/assets/backgrounds/scene-vending-zone-main.png',
  atrium: '/assets/backgrounds/scene-atrium-main.png',
  cafe: '/assets/backgrounds/scene-cafe-main.png',
  'cinema-gate': '/assets/backgrounds/scene-cinema-gate-main.png',
  'accessory-shop': '/assets/backgrounds/scene-accessory-shop-main.png',
  'living-room': '/assets/backgrounds/scene-living-room-main.png',
  bedroom: '/assets/backgrounds/scene-bedroom-main.png',
  balcony: '/assets/backgrounds/scene-balcony-main.png',
  entryway: '/assets/backgrounds/scene-entryway-main.png'
} as const;
type VisualSceneId = keyof typeof SCENE_BACKGROUNDS;

const CHARACTER_PORTRAITS = {
  林澄: '/assets/characters/lin-cheng-half-body.png',
  周然: '/assets/characters/zhou-ran-half-body.png'
} as const;
type VisualCharacterId = keyof typeof CHARACTER_PORTRAITS;

export interface VisualSelection {
  mode: 'map' | 'region' | 'event';
  background: string;
  character: string | null;
  locationLabel: string;
}

const CITY_MAP_BACKGROUND = '/assets/map/city-overview-main.png';

const isVisualRegionId = (value: string): value is VisualRegionId =>
  value in REGION_BACKGROUNDS;

const isVisualSceneId = (value: string): value is VisualSceneId =>
  value in SCENE_BACKGROUNDS;

const isVisualCharacterId = (value: string): value is VisualCharacterId =>
  value in CHARACTER_PORTRAITS;

const resolveCharacterPortrait = (castMember: string | null): string | null => {
  if (!castMember) {
    return null;
  }

  if (isVisualCharacterId(castMember)) {
    return CHARACTER_PORTRAITS[castMember];
  }

  const matchedCharacter = worldData.characters.find((character) => character.id === castMember || character.name === castMember);

  if (!matchedCharacter) {
    return null;
  }

  if (isVisualCharacterId(matchedCharacter.id)) {
    return CHARACTER_PORTRAITS[matchedCharacter.id];
  }

  if (isVisualCharacterId(matchedCharacter.name)) {
    return CHARACTER_PORTRAITS[matchedCharacter.name];
  }

  return null;
};

export const resolveVisualSelection = (state: GameState): VisualSelection => {
  const regionId = state.navigation.currentRegionId;
  const sceneId = state.navigation.currentSceneId;

  if (!regionId) {
    return {
      mode: 'map',
      background: CITY_MAP_BACKGROUND,
      character: null,
      locationLabel: '世界地图'
    };
  }

  const region = worldData.regions.find((item) => item.id === regionId) ?? null;
  const isEventMode = state.ui.mode === 'event';
  const activeCharacterId = state.event.activeEvent?.cast[0] ?? null;

  return {
    mode: isEventMode ? 'event' : 'region',
    background:
      sceneId && isVisualSceneId(sceneId)
        ? SCENE_BACKGROUNDS[sceneId]
        : isVisualRegionId(regionId)
          ? REGION_BACKGROUNDS[regionId]
          : CITY_MAP_BACKGROUND,
    character: isEventMode ? resolveCharacterPortrait(activeCharacterId) : null,
    locationLabel: state.event.activeEvent?.locationLabel ?? region?.name ?? '世界地图'
  };
};
