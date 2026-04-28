import { getVisiblePreparedEvent } from '../state/selectors';
import type { GameState } from '../state/store';
import type { WorldData } from '../data/types';

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

const CHARACTER_ASSET_KEYS: Record<VisualCharacterId, string> = {
  林澄: 'lin-cheng',
  周然: 'zhou-ran'
};

export interface VisualSelection {
  mode: 'map' | 'region' | 'event';
  background: string;
  character: string | null;
  locationLabel: string;
  isGeneratedEventImage: boolean;
}

const CITY_MAP_BACKGROUND = '/assets/map/city-overview-main.png';

export interface ExportableVisualAsset {
  key: string;
  url: string;
}

export const getExportableVisualAssets = (): ExportableVisualAsset[] => [
  {
    key: 'asset:map:city-overview',
    url: CITY_MAP_BACKGROUND
  },
  ...Object.entries(REGION_BACKGROUNDS).map(([regionId, url]) => ({
    key: `asset:region:${regionId}`,
    url
  })),
  ...Object.entries(SCENE_BACKGROUNDS).map(([sceneId, url]) => ({
    key: `asset:scene:${sceneId}`,
    url
  })),
  ...Object.entries(CHARACTER_PORTRAITS).map(([characterId, url]) => ({
    key: `asset:character:${CHARACTER_ASSET_KEYS[characterId as VisualCharacterId]}`,
    url
  }))
];

const STATIC_ASSET_MEDIA_URLS = new Map(getExportableVisualAssets().map((asset) => [asset.url, `media://${asset.key}`]));

export const resolveStaticAssetMediaUrl = (url: string): string | null => STATIC_ASSET_MEDIA_URLS.get(url) ?? null;

const isVisualRegionId = (value: string): value is VisualRegionId =>
  value in REGION_BACKGROUNDS;

const isVisualSceneId = (value: string): value is VisualSceneId =>
  value in SCENE_BACKGROUNDS;

const isVisualCharacterId = (value: string): value is VisualCharacterId =>
  value in CHARACTER_PORTRAITS;

const resolveCharacterPortrait = (castMember: string | null, worldData: WorldData): string | null => {
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

export const resolveSceneBackground = (sceneId: string | null, regionId: string | null): string => {
  if (sceneId && isVisualSceneId(sceneId)) {
    return SCENE_BACKGROUNDS[sceneId];
  }

  if (regionId && isVisualRegionId(regionId)) {
    return REGION_BACKGROUNDS[regionId];
  }

  return CITY_MAP_BACKGROUND;
};

export const resolveCharacterReference = (castMember: string | null, worldData: WorldData): string | null =>
  resolveCharacterPortrait(castMember, worldData);

export const resolveVisualSelection = (state: GameState): VisualSelection => {
  const regionId = state.navigation.currentRegionId;
  const sceneId = state.navigation.currentSceneId;

  if (!regionId) {
    return {
      mode: 'map',
      background: CITY_MAP_BACKGROUND,
      character: null,
      locationLabel: '世界地图',
      isGeneratedEventImage: false
    };
  }

  const region = state.world.data.regions.find((item) => item.id === regionId) ?? null;
  const visualEvent = state.event.activeEvent ?? getVisiblePreparedEvent(state);
  const isEventVisual = !!visualEvent;
  const activeCharacterId = visualEvent?.cast[0] ?? null;
  const generatedEventImage = visualEvent ? (state.event.generatedImages[visualEvent.id] ?? null) : null;

  return {
    mode: isEventVisual ? 'event' : 'region',
    background: generatedEventImage ?? resolveSceneBackground(sceneId, regionId),
    character: isEventVisual && !generatedEventImage ? resolveCharacterPortrait(activeCharacterId, state.world.data) : null,
    locationLabel: visualEvent?.locationLabel ?? region?.name ?? '世界地图',
    isGeneratedEventImage: !!generatedEventImage
  };
};
