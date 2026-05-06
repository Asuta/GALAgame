import { describe, expect, it } from 'vitest';
import { worldData } from '../../src/data/world';
import { buildFallbackSceneEvent } from '../../src/logic/chatClient';
import { cacheSceneEvent, createInitialState, enterRegion, enterScene, startEvent } from '../../src/state/store';
import { collectEventImageCastNames, collectEventImageReferences, resolveVisualSelection } from '../../src/visual/assetCatalog';

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
    expect(worldData.characters.map((character) => character.id)).toEqual(['主角', '林澄', '周然']);
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
    let state = createInitialState();
    const character = state.world.data.characters.find((item) => item.id === '林澄')!;
    character.name = '林澄同学';
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

  it('collects scene and the most relevant character portraits for event image references', () => {
    const state = createInitialState();
    const scene = worldData.scenes.find((item) => item.id === 'classroom')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    const references = collectEventImageReferences({
      event: {
        ...event,
        cast: ['林澄', '周然'],
        facts: ['周然刚刚在门口说话，林澄坐在窗边。']
      },
      currentRegionId: 'school',
      worldData,
      transcript: [
        { label: '林澄', content: '你怎么来了？' },
        { label: '周然', content: '我只是路过。' }
      ]
    });

    expect(references).toEqual([
      {
        kind: 'scene',
        label: '学校 / 教室',
        url: '/assets/backgrounds/scene-classroom-main.png'
      },
      {
        kind: 'character',
        label: '林澄',
        url: '/assets/characters/lin-cheng-half-body.png',
        characterId: '林澄'
      },
      {
        kind: 'character',
        label: '周然',
        url: '/assets/characters/zhou-ran-half-body.png',
        characterId: '周然'
      }
    ]);
  });

  it('uses generated media portraits when collecting dynamic character references', () => {
    const state = createInitialState();
    const scene = worldData.scenes.find((item) => item.id === 'classroom')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    const references = collectEventImageReferences({
      event: {
        ...event,
        cast: ['沈听'],
        facts: ['沈听站在教室门口。']
      },
      currentRegionId: 'school',
      worldData: {
        ...worldData,
        characters: [
          ...worldData.characters,
          {
            id: '沈听',
            name: '沈听',
            aliases: ['电影院女生'],
            gender: '女',
            identity: '转校生',
            age: '17岁左右',
            personality: '温和',
            speakingStyle: '语气轻',
            relationshipToPlayer: '刚认识',
            hardRules: [],
            imageUrl: 'media://character:沈听'
          }
        ]
      },
      transcript: [{ label: '沈听', content: '我可以坐这里吗？' }]
    });

    expect(references).toContainEqual({
      kind: 'character',
      label: '沈听',
      url: 'media://character:沈听',
      characterId: '沈听'
    });
  });

  it('includes the player character portrait when the event references the player', () => {
    const state = createInitialState();
    const scene = worldData.scenes.find((item) => item.id === 'classroom')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '学校 / 教室',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });

    const references = collectEventImageReferences({
      event: {
        ...event,
        cast: ['林澄'],
        facts: ['林澄站在主角（玩家角色）对侧。']
      },
      currentRegionId: 'school',
      worldData,
      transcript: [
        { label: '你', content: '今天怎么还没回家？' },
        { label: '林澄', content: '我想再坐一会儿。' }
      ]
    });

    expect(references).toEqual([
      {
        kind: 'scene',
        label: '学校 / 教室',
        url: '/assets/backgrounds/scene-classroom-main.png'
      },
      {
        kind: 'character',
        label: '林澄',
        url: '/assets/characters/lin-cheng-half-body.png',
        characterId: '林澄'
      },
      {
        kind: 'character',
        label: '主角（玩家角色）',
        url: '/assets/characters/player-protagonist-half-body.png',
        characterId: '主角'
      }
    ]);
  });

  it('prioritizes characters mentioned in the current moment over the original event cast', () => {
    const state = createInitialState();
    const scene = worldData.scenes.find((item) => item.id === 'cinema-gate')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '商场 / 电影院门口',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });
    const worldWithNana = {
      ...worldData,
      characters: [
        ...worldData.characters,
        {
          id: '娜娜',
          name: '娜娜',
          aliases: ['咖啡店女生'],
          gender: '女',
          identity: '在电影院门口遇到的女生',
          age: '17岁左右',
          personality: '明亮直接',
          speakingStyle: '轻快',
          relationshipToPlayer: '刚认识',
          hardRules: [],
          imageUrl: 'media://character:娜娜'
        }
      ]
    };

    const references = collectEventImageReferences({
      event: {
        ...event,
        cast: ['林澄'],
        facts: ['事件开场时林澄在附近。', '娜娜站在主角身后，手里拿着樱花拿铁。']
      },
      currentRegionId: 'mall',
      worldData: worldWithNana,
      transcript: [
        { label: '你', content: '回头一看，就在身后。' },
        { label: '旁白', content: '娜娜正站在那里，手里拿着樱花拿铁。' },
        { label: '娜娜', content: '早上好呀，我找人找得挺认真嘛。' }
      ]
    });

    expect(references).toEqual([
      {
        kind: 'scene',
        label: '商场 / 电影院门口',
        url: '/assets/backgrounds/scene-cinema-gate-main.png'
      },
      {
        kind: 'character',
        label: '娜娜',
        url: 'media://character:娜娜',
        characterId: '娜娜'
      },
      {
        kind: 'character',
        label: '主角（玩家角色）',
        url: '/assets/characters/player-protagonist-half-body.png',
        characterId: '主角'
      }
    ]);

    expect(
      collectEventImageCastNames({
        event: {
          ...event,
          cast: ['林澄'],
          facts: ['娜娜站在主角身后。']
        },
        worldData: worldWithNana,
        transcript: [{ label: '娜娜', content: '早上好呀。' }]
      })
    ).toEqual(['娜娜', '主角（玩家角色）']);
  });

  it('uses the current moment character name for image prompts even before a portrait exists', () => {
    const state = createInitialState();
    const scene = worldData.scenes.find((item) => item.id === 'cinema-gate')!;
    const event = buildFallbackSceneEvent({
      scene,
      locationLabel: '商场 / 电影院门口',
      memorySummary: state.memory.summary,
      memoryFacts: state.memory.facts,
      timeLabel: state.clock.label,
      timeSlot: state.clock.timeSlot
    });
    const worldWithNanaWithoutPortrait = {
      ...worldData,
      characters: [
        ...worldData.characters,
        {
          id: '娜娜',
          name: '娜娜',
          aliases: [],
          gender: '女',
          identity: '在电影院门口遇到的女生',
          age: '17岁左右',
          personality: '明亮直接',
          speakingStyle: '轻快',
          relationshipToPlayer: '刚认识',
          hardRules: []
        }
      ]
    };

    expect(
      collectEventImageReferences({
        event: {
          ...event,
          cast: ['林澄'],
          facts: ['娜娜站在主角身后。']
        },
        currentRegionId: 'mall',
        worldData: worldWithNanaWithoutPortrait,
        transcript: [{ label: '娜娜', content: '早上好呀。' }]
      }).map((reference) => reference.label)
    ).toEqual(['商场 / 电影院门口', '主角（玩家角色）']);

    expect(
      collectEventImageCastNames({
        event: {
          ...event,
          cast: ['林澄'],
          facts: ['娜娜站在主角身后。']
        },
        worldData: worldWithNanaWithoutPortrait,
        transcript: [{ label: '娜娜', content: '早上好呀。' }]
      })
    ).toEqual(['娜娜', '主角（玩家角色）']);
  });
});

