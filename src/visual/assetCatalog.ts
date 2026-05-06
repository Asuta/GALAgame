import { getVisiblePreparedEvent } from '../state/selectors';
import type { GameState } from '../state/store';
import type { GeneratedEvent, WorldData } from '../data/types';

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
  主角: '/assets/characters/player-protagonist-half-body.png',
  林澄: '/assets/characters/lin-cheng-half-body.png',
  周然: '/assets/characters/zhou-ran-half-body.png'
} as const;
type VisualCharacterId = keyof typeof CHARACTER_PORTRAITS;

const CHARACTER_ASSET_KEYS: Record<VisualCharacterId, string> = {
  主角: 'player-protagonist',
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

export interface EventImageReference {
  kind: 'scene' | 'character';
  label: string;
  url: string;
  characterId?: string;
}

export interface ExportableVisualAsset {
  key: string;
  url: string;
}

const sanitizeAssetKeyPart = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'asset';

export const getExportableVisualAssets = (worldData?: WorldData): ExportableVisualAsset[] => {
  if (!worldData) {
    return [
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
  }

  const assets: ExportableVisualAsset[] = [];

  if (worldData.mapImageUrl) {
    assets.push({ key: 'asset:map:city-overview', url: worldData.mapImageUrl });
  }

  for (const region of worldData.regions) {
    const url = region.imageUrl ?? (isVisualRegionId(region.id) ? REGION_BACKGROUNDS[region.id] : null);
    if (url) {
      assets.push({ key: `asset:region:${sanitizeAssetKeyPart(region.id)}`, url });
    }
  }

  for (const scene of worldData.scenes) {
    const url = scene.imageUrl ?? (isVisualSceneId(scene.id) ? SCENE_BACKGROUNDS[scene.id] : null);
    if (url) {
      assets.push({ key: `asset:scene:${sanitizeAssetKeyPart(scene.id)}`, url });
    }
  }

  for (const character of worldData.characters) {
    const url =
      character.imageUrl ??
      (isVisualCharacterId(character.id)
        ? CHARACTER_PORTRAITS[character.id]
        : isVisualCharacterId(character.name)
          ? CHARACTER_PORTRAITS[character.name]
          : null);
    if (url) {
      const characterKey =
        isVisualCharacterId(character.id) ? CHARACTER_ASSET_KEYS[character.id] : sanitizeAssetKeyPart(character.id);
      assets.push({ key: `asset:character:${characterKey}`, url });
    }
  }

  return assets;
};

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

  if (matchedCharacter.imageUrl) {
    return matchedCharacter.imageUrl;
  }

  if (isVisualCharacterId(matchedCharacter.id)) {
    return CHARACTER_PORTRAITS[matchedCharacter.id];
  }

  if (isVisualCharacterId(matchedCharacter.name)) {
    return CHARACTER_PORTRAITS[matchedCharacter.name];
  }

  return null;
};

export const resolveSceneBackground = (sceneId: string | null, regionId: string | null, worldData?: WorldData): string => {
  const scene = sceneId ? worldData?.scenes.find((item) => item.id === sceneId) : null;
  const region = regionId ? worldData?.regions.find((item) => item.id === regionId) : null;

  if (scene?.imageUrl) {
    return scene.imageUrl;
  }

  if (sceneId && isVisualSceneId(sceneId)) {
    return SCENE_BACKGROUNDS[sceneId];
  }

  if (region?.imageUrl) {
    return region.imageUrl;
  }

  if (regionId && isVisualRegionId(regionId)) {
    return REGION_BACKGROUNDS[regionId];
  }

  return CITY_MAP_BACKGROUND;
};

export const resolveCharacterReference = (castMember: string | null, worldData: WorldData): string | null =>
  resolveCharacterPortrait(castMember, worldData);

const normalizeReferenceName = (value: string): string => value.trim().toLowerCase();

const getCharacterReferenceUrl = (character: WorldData['characters'][number]): string | null => {
  if (character.imageUrl) {
    return character.imageUrl;
  }

  if (isVisualCharacterId(character.id)) {
    return CHARACTER_PORTRAITS[character.id];
  }

  if (isVisualCharacterId(character.name)) {
    return CHARACTER_PORTRAITS[character.name];
  }

  return null;
};

const characterReferenceNames = (character: WorldData['characters'][number]): string[] =>
  [character.id, character.name, ...(character.aliases ?? [])].map(normalizeReferenceName).filter(Boolean);

const GENERIC_PLAYER_REFERENCE_NAMES = new Set(['你', '我']);
const NARRATION_REFERENCE_NAMES = new Set(['旁白', '系统', '世界', '角色', '相关角色', '在场角色']);

const countOccurrences = (text: string, term: string): number => {
  if (!term) {
    return 0;
  }

  let count = 0;
  let position = text.indexOf(term);

  while (position >= 0) {
    count += 1;
    position = text.indexOf(term, position + term.length);
  }

  return count;
};

const isPlayerCharacter = (character: WorldData['characters'][number]): boolean =>
  character.id === '主角' || character.name.includes('玩家角色');

const isPlayerReferenceName = (name: string): boolean =>
  name === '你' || name === '我' || name.includes('主角') || name.includes('玩家');

const isNarrationReferenceName = (name: string): boolean => NARRATION_REFERENCE_NAMES.has(name);

const collectInlineSpeakerNames = (text: string): string[] => {
  const names: string[] = [];
  const speakerPattern = /(?:^|\n|[。！？；\s])([\u4e00-\u9fa5A-Za-z0-9_（）()]{1,16})\s*[：:]/g;
  let match = speakerPattern.exec(text);

  while (match) {
    const rawName = match[1].trim();
    const normalized = normalizeReferenceName(rawName);

    if (normalized && !isPlayerReferenceName(normalized) && !isNarrationReferenceName(rawName)) {
      names.push(rawName);
    }

    match = speakerPattern.exec(text);
  }

  return names;
};

const collectCurrentMomentCharacterNames = (
  characters: WorldData['characters'],
  transcript: Array<{ label: string; content?: string }>,
  recentMomentText: string
): Set<string> => {
  const currentNames = new Set<string>();

  for (const message of transcript) {
    const label = normalizeReferenceName(message.label);

    if (label && !isPlayerReferenceName(label) && !isNarrationReferenceName(message.label)) {
      currentNames.add(label);
    }

    for (const speakerName of collectInlineSpeakerNames(message.content ?? '')) {
      currentNames.add(normalizeReferenceName(speakerName));
    }
  }

  for (const character of characters) {
    if (isPlayerCharacter(character)) {
      continue;
    }

    const mentionCount = countCharacterMentions(character, recentMomentText);

    if (mentionCount > 0) {
      for (const name of characterReferenceNames(character)) {
        currentNames.add(name);
      }
    }
  }

  return currentNames;
};

const countCharacterMentions = (
  character: WorldData['characters'][number],
  text: string,
  { includeGenericPlayerPronouns = false }: { includeGenericPlayerPronouns?: boolean } = {}
): number => {
  const names = characterReferenceNames(character).filter(
    (name) => includeGenericPlayerPronouns || !GENERIC_PLAYER_REFERENCE_NAMES.has(name)
  );

  return names.reduce((count, name) => count + countOccurrences(text, name), 0);
};

export const collectEventImageReferences = ({
  event,
  currentRegionId,
  worldData,
  transcript = []
}: {
  event: GeneratedEvent;
  currentRegionId: string | null;
  worldData: WorldData;
  transcript?: Array<{ label: string; content?: string }>;
}): EventImageReference[] => {
  const references: EventImageReference[] = [
    {
      kind: 'scene',
      label: event.locationLabel,
      url: resolveSceneBackground(event.sceneId, currentRegionId, worldData)
    }
  ];
  const castNames = event.cast.map(normalizeReferenceName).filter(Boolean);
  const castNameSet = new Set(castNames);
  const recentTranscript = transcript.slice(-8);
  const recentSpeakerNames = recentTranscript.map((message) => normalizeReferenceName(message.label)).filter(Boolean);
  const recentSpeakerSet = new Set(recentSpeakerNames);
  const recentMomentText = recentTranscript
    .slice(-3)
    .map((message) => `${message.label} ${message.content ?? ''}`)
    .join('\n')
    .toLowerCase();
  const currentMomentCharacterNames = collectCurrentMomentCharacterNames(worldData.characters, recentTranscript.slice(-3), recentMomentText);
  const searchableStoryText = [
    event.title,
    event.premise,
    event.openingState,
    event.currentPhase,
    ...event.facts,
    ...recentTranscript.map((message) => `${message.label} ${message.content ?? ''}`)
  ]
    .join('\n')
    .toLowerCase();

  const characterReferences = worldData.characters
    .map((character) => {
      const url = getCharacterReferenceUrl(character);

      if (!url) {
        return null;
      }

      const names = characterReferenceNames(character);
      const castIndex = castNames.findIndex((name) => names.includes(name));
      const latestSpeakerIndex = [...recentSpeakerNames].reverse().findIndex((name) => names.includes(name));
      const isPlayer = isPlayerCharacter(character);
      const isCurrentMomentCharacter = names.some((name) => currentMomentCharacterNames.has(name));
      const recentMomentMentionCount = countCharacterMentions(character, recentMomentText);
      const storyMentionCount =
        currentMomentCharacterNames.size > 0 && !isPlayer && !isCurrentMomentCharacter
          ? 0
          : countCharacterMentions(character, searchableStoryText);
      const playerPronounMention =
        isPlayer && (recentSpeakerSet.has('你') || recentMomentText.includes('主角') || recentMomentText.includes('玩家')) ? 1 : 0;
      const defaultPlayerPresence = isPlayer && (event.cast.length > 0 || transcript.length > 0) ? 1 : 0;
      const castMatch = names.some((name) => castNameSet.has(name));
      const allowCastMatch = castMatch && (isPlayer || currentMomentCharacterNames.size === 0 || isCurrentMomentCharacter);
      const exactMatch =
        allowCastMatch ||
        names.some((name) => recentSpeakerSet.has(name)) ||
        recentMomentMentionCount > 0 ||
        storyMentionCount > 0 ||
        playerPronounMention > 0 ||
        defaultPlayerPresence > 0;

      if (!exactMatch) {
        return null;
      }

      return {
        character,
        url,
        score:
          (recentMomentMentionCount > 0 ? 140 + recentMomentMentionCount * 35 : 0) +
          (latestSpeakerIndex >= 0 ? 90 - latestSpeakerIndex * 8 : 0) +
          playerPronounMention * 75 +
          defaultPlayerPresence * 38 +
          (castIndex >= 0 && (isPlayer || currentMomentCharacterNames.size === 0 || isCurrentMomentCharacter) ? 45 - castIndex * 8 : 0) +
          storyMentionCount * 8
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(({ character, url }) => ({
      kind: 'character' as const,
      label: character.name,
      url,
      characterId: character.id
    }));

  return [...references, ...characterReferences].slice(0, 3);
};

export const collectEventImageCastNames = ({
  event,
  worldData,
  transcript = []
}: {
  event: GeneratedEvent;
  worldData: WorldData;
  transcript?: Array<{ label: string; content?: string }>;
}): string[] => {
  const recentTranscript = transcript.slice(-8);
  const recentMomentTranscript = recentTranscript.slice(-3);
  const recentMomentText = recentMomentTranscript
    .map((message) => `${message.label} ${message.content ?? ''}`)
    .join('\n')
    .toLowerCase();
  const currentMomentCharacterNames = collectCurrentMomentCharacterNames(
    worldData.characters,
    recentMomentTranscript,
    recentMomentText
  );
  const searchableStoryText = [
    event.title,
    event.premise,
    event.openingState,
    event.currentPhase,
    ...event.facts,
    ...recentTranscript.map((message) => `${message.label} ${message.content ?? ''}`)
  ]
    .join('\n')
    .toLowerCase();
  const scoredNames = worldData.characters
    .map((character) => {
      const names = characterReferenceNames(character);
      const isPlayer = isPlayerCharacter(character);
      const isCurrentMomentCharacter = names.some((name) => currentMomentCharacterNames.has(name));
      const latestSpeakerIndex = [...recentTranscript]
        .reverse()
        .findIndex((message) => names.includes(normalizeReferenceName(message.label)));
      const castIndex = event.cast.map(normalizeReferenceName).findIndex((name) => names.includes(name));
      const recentMomentMentionCount = countCharacterMentions(character, recentMomentText);
      const storyMentionCount =
        currentMomentCharacterNames.size > 0 && !isPlayer && !isCurrentMomentCharacter
          ? 0
          : countCharacterMentions(character, searchableStoryText);
      const playerPresence =
        isPlayer &&
        (recentTranscript.some((message) => isPlayerReferenceName(normalizeReferenceName(message.label))) ||
          recentMomentText.includes('主角') ||
          recentMomentText.includes('玩家') ||
          event.cast.length > 0);

      if (
        latestSpeakerIndex < 0 &&
        (castIndex < 0 || (currentMomentCharacterNames.size > 0 && !isPlayer && !isCurrentMomentCharacter)) &&
        recentMomentMentionCount <= 0 &&
        storyMentionCount <= 0 &&
        !playerPresence
      ) {
        return null;
      }

      return {
        name: character.name,
        score:
          (recentMomentMentionCount > 0 ? 140 + recentMomentMentionCount * 35 : 0) +
          (latestSpeakerIndex >= 0 ? 90 - latestSpeakerIndex * 8 : 0) +
          (playerPresence ? 75 : 0) +
          (castIndex >= 0 && (isPlayer || currentMomentCharacterNames.size === 0 || isCurrentMomentCharacter) ? 45 - castIndex * 8 : 0) +
          storyMentionCount * 8
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.name);
  const inlineSpeakerNames = recentMomentTranscript.flatMap((message) => [
    ...collectInlineSpeakerNames(message.content ?? ''),
    ...(isPlayerReferenceName(normalizeReferenceName(message.label)) || isNarrationReferenceName(message.label) ? [] : [message.label])
  ]);
  const names = [...scoredNames];

  for (const speakerName of inlineSpeakerNames) {
    if (!names.includes(speakerName)) {
      names.unshift(speakerName);
    }
  }

  if (!names.some((name) => name.includes('玩家角色')) && (event.cast.length || transcript.length)) {
    const playerCharacter = worldData.characters.find(isPlayerCharacter);

    if (playerCharacter) {
      names.push(playerCharacter.name);
    }
  }

  if (!names.length) {
    return event.cast.slice(0, 3);
  }

  return names.slice(0, 3);
};

export const resolveVisualSelection = (state: GameState): VisualSelection => {
  const regionId = state.navigation.currentRegionId;
  const sceneId = state.navigation.currentSceneId;

  if (!regionId) {
    return {
      mode: 'map',
      background: state.world.data.mapImageUrl ?? CITY_MAP_BACKGROUND,
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
    background: generatedEventImage ?? resolveSceneBackground(sceneId, regionId, state.world.data),
    character: isEventVisual && !generatedEventImage ? resolveCharacterPortrait(activeCharacterId, state.world.data) : null,
    locationLabel: visualEvent?.locationLabel ?? region?.name ?? '世界地图',
    isGeneratedEventImage: !!generatedEventImage
  };
};
