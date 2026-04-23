import { describe, expect, it } from 'vitest';
import { worldData } from '../../src/data/world';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { createInitialState, enterRegion, enterScene, startEvent } from '../../src/state/store';
import { resolveVisualSelection } from '../../src/visual/assetCatalog';

describe('resolveVisualSelection', () => {
  it('keeps the first art pack aligned with the intended region and character set', () => {
    expect(worldData.regions.map((region) => region.id)).toEqual(['school', 'hospital', 'mall', 'home']);
    expect(worldData.characters.map((character) => character.id)).toEqual(['林澄', '周然']);
  });

  it('returns the city map before a region is selected', () => {
    const state = createInitialState();

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'map',
      background: '/assets/map/city-overview-main.png',
      character: null,
      locationLabel: '世界地图'
    });
  });

  it('returns the region background while exploring inside school', () => {
    let state = createInitialState();
    state = enterRegion(state, 'school');

    expect(resolveVisualSelection(state)).toEqual({
      mode: 'region',
      background: '/assets/backgrounds/region-school-main.png',
      character: null,
      locationLabel: '学校'
    });
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
      background: '/assets/backgrounds/region-school-main.png',
      character: '/assets/characters/lin-cheng-half-body.png',
      locationLabel: '学校 / 教室'
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
        background: '/assets/backgrounds/region-school-main.png',
        character: '/assets/characters/lin-cheng-half-body.png',
        locationLabel: '学校 / 教室'
      });
    } finally {
      character.name = originalName;
    }
  });
});
