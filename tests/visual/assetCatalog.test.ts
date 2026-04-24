import { describe, expect, it } from 'vitest';
import { worldData } from '../../src/data/world';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { cacheSceneEvent, createInitialState, enterRegion, enterScene, startEvent } from '../../src/state/store';
import { resolveVisualSelection } from '../../src/visual/assetCatalog';

describe('resolveVisualSelection', () => {
  it('keeps the first art pack aligned with the intended region and character set', () => {
    expect(worldData.regions.map((region) => region.id)).toEqual(['school', 'hospital', 'mall', 'home']);
    expect(worldData.scenes.map((scene) => scene.id)).toEqual([
      'classroom',
      'hallway',
      'playground',
      'rooftop',
      'lobby',
      'ward',
      'hospital-hallway',
      'vending-zone',
      'atrium',
      'cafe',
      'cinema-gate',
      'accessory-shop',
      'living-room',
      'bedroom',
      'balcony',
      'entryway'
    ]);
    expect(worldData.characters.map((character) => character.id)).toEqual(['林澄', '周然']);
  });

  it('returns the city map before a region is selected', () => {
    const state = createInitialState();

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'map',
      background: '/assets/map/city-overview-main.png',
      character: null,
      locationLabel: '世界地图',
      isGeneratedEventImage: false
    });
  });

  it('returns the region background while exploring inside school', () => {
    let state = createInitialState();
    state = enterRegion(state, 'school');

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'region',
      background: '/assets/backgrounds/region-school-main.png',
      character: null,
      locationLabel: '学校',
      isGeneratedEventImage: false
    });
  });

  it('prefers scene backgrounds over region backgrounds while exploring a specific scene', () => {
    let state = createInitialState();
    state = enterRegion(state, 'school');
    state = enterScene(state, 'playground');

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'region',
      background: '/assets/backgrounds/scene-playground-main.png',
      character: null,
      locationLabel: '学校',
      isGeneratedEventImage: false
    });
  });

  it('switches the background when the current scene changes inside the same region', () => {
    let state = createInitialState();
    state = enterRegion(state, 'school');

    const hallwayVisual = resolveVisualSelection(enterScene(state, 'hallway'));
    const rooftopVisual = resolveVisualSelection(enterScene(state, 'rooftop'));

    expect(hallwayVisual.background).toBe('/assets/backgrounds/scene-hallway-main.png');
    expect(rooftopVisual.background).toBe('/assets/backgrounds/scene-rooftop-main.png');
    expect(hallwayVisual.background).not.toBe(rooftopVisual.background);
  });

  it('returns the active character portrait during a classroom event', () => {
    let state = createInitialState();
    state = enterRegion(state, 'school');
    state = enterScene(state, 'classroom');

    const event = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = startEvent(state, event);

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'event',
      background: '/assets/backgrounds/scene-classroom-main.png',
      character: '/assets/characters/lin-cheng-half-body.png',
      locationLabel: '学校 / 教室',
      isGeneratedEventImage: false
    });
  });

  it('returns the prepared event character portrait before the player starts the event', () => {
    let state = createInitialState();
    state = enterRegion(state, 'school');
    state = enterScene(state, 'classroom');

    state = cacheSceneEvent(
      state,
      buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      })
    );

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'event',
      background: '/assets/backgrounds/scene-classroom-main.png',
      character: '/assets/characters/lin-cheng-half-body.png',
      locationLabel: '学校 / 教室',
      isGeneratedEventImage: false
    });
  });

  it('resolves portraits through character metadata when a display name drifts from the canonical id', () => {
    const character = worldData.characters.find((item) => item.id === '林澄')!;
    const originalName = character.name;

    try {
      character.name = '林澄同学';

      let state = createInitialState();
      state = enterRegion(state, 'school');
      state = enterScene(state, 'classroom');

      const event = buildFallbackSceneEvent({
        scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
        locationLabel: '学校 / 教室',
        memorySummary: state.memory.summary,
        memoryFacts: state.memory.facts,
        timeLabel: state.clock.label,
        timeSlot: state.clock.timeSlot
      });

      state = startEvent(state, {
        ...event,
        cast: [character.name]
      });

      expect(resolveVisualSelection(state)).toEqual({
        mode: 'event',
        background: '/assets/backgrounds/scene-classroom-main.png',
        character: '/assets/characters/lin-cheng-half-body.png',
        locationLabel: '学校 / 教室',
        isGeneratedEventImage: false
      });
    } finally {
      character.name = originalName;
    }
  });

  it('uses a generated event image as the full visual without a character overlay', () => {
    let state = createInitialState();
    state = enterRegion(state, 'school');
    state = enterScene(state, 'classroom');

    const event = buildFallbackSceneEvent({
      scene: worldData.scenes.find((scene) => scene.id === 'classroom')!,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    state = startEvent(state, event);
    state = {
      ...state,
      event: {
        ...state.event,
        generatedImages: {
          [event.id]: 'https://example.com/event.png'
        }
      }
    };

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'event',
      background: 'https://example.com/event.png',
      character: null,
      locationLabel: '学校 / 教室',
      isGeneratedEventImage: true
    });
  });
});

