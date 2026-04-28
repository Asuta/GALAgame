import { beforeEach, describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  createInitialState,
  enterRegion,
  openTaskPlanningPage,
  startTask,
  updateMemory,
  upsertCharacter,
  upsertPlayerStat,
  upsertRegion,
  upsertScene
} from '../../src/state/store';
import { createInitialPlayerState } from '../../src/player/initialState';
import {
  exportGameSaveZip,
  importGameSave,
  isGameStateBusy,
  resetGameProgress
} from '../../src/save/gameSave';
import { loadStoredGameState, saveStoredGameState } from '../../src/save/storage';

const imageFetch = async (): Promise<Response> =>
  new Response(new Blob(['asset'], { type: 'image/png' }), {
    status: 200,
    headers: {
      'content-type': 'image/png'
    }
  });

describe('game save bundles', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resets game progress while preserving player settings', () => {
    let state = openTaskPlanningPage(createInitialState());
    state = {
      ...state,
      settings: {
        ...state.settings,
        currentModel: 'gpt-4o-mini',
        streamCharsPerSecond: 6
      },
      player: {
        ...state.player,
        money: 999
      }
    };

    const reset = resetGameProgress(state.settings);

    expect(reset.ui.currentPage).toBe('game');
    expect(reset.memory.facts).toEqual([]);
    expect(reset.player.money).toBe(createInitialPlayerState().money);
    expect(reset.settings.currentModel).toBe('gpt-4o-mini');
    expect(reset.settings.streamCharsPerSecond).toBe(6);
  });

  it('resets runtime data mutations back to the original baseline', () => {
    let state = createInitialState();
    state = upsertRegion(state, { id: 'gym', name: '体育馆', sceneIds: [] });
    state = upsertPlayerStat(state, 'social', {
      id: 'empathy',
      label: '共情',
      value: 5,
      groupLabel: '社交能力'
    });
    state = {
      ...state,
      player: {
        ...state.player,
        money: 999,
        inventory: {
          ...state.player.inventory,
          items: [
            {
              id: 'ticket',
              name: '电影票',
              description: '临时获得的票。',
              abilityText: '可以进入电影院。',
              effects: [],
              quantity: 1
            }
          ]
        }
      }
    };

    const reset = resetGameProgress(state.settings);

    expect(reset.world.data.regions.map((region) => region.id)).toEqual(['school', 'hospital', 'mall', 'home']);
    expect(reset.player.statGroups.some((group) => group.id === 'social')).toBe(false);
    expect(reset.player.inventory.items).toEqual([]);
    expect(reset.player.money).toBe(createInitialPlayerState().money);
  });

  it('persists and reloads the current game state from localStorage', () => {
    const state = updateMemory(createInitialState(), {
      summary: '你保留了一份本地进度。',
      facts: ['本地存档存在']
    });

    saveStoredGameState({
      ...state,
      player: {
        ...state.player,
        money: 77
      }
    });

    const restored = loadStoredGameState();

    expect(restored?.memory.summary).toContain('本地进度');
    expect(restored?.player.money).toBe(77);
  });

  it('exports default visual assets and omits temporary generated images', async () => {
    let state = enterRegion(createInitialState(), 'school');
    state = {
      ...state,
      event: {
        ...state.event,
        generatedImages: {
          eventA: 'data:image/png;base64,QUJD'
        },
        generatedImagePrompts: {
          eventA: '教室窗边的两人'
        }
      }
    };

    const archive = await exportGameSaveZip(state, { now: new Date('2026-04-27T10:00:00.000Z'), fetchImpl: imageFetch });
    const zip = await JSZip.loadAsync(archive);
    const manifest = await zip.file('save.json')?.async('text');
    const file = new File([archive], 'save.zip', { type: 'application/zip' });
    const savedMedia = new Map<string, Blob>();
    const bundle = await importGameSave(file, {
      saveMediaBlob: async (key, blob) => {
        savedMedia.set(key, blob);
      }
    });

    expect(manifest).toContain('asset:map:city-overview');
    expect(manifest).toContain('asset:scene:classroom');
    expect(manifest).toContain('asset:character:lin-cheng');
    expect(manifest).not.toContain('data:image/png;base64,QUJD');
    expect(manifest).not.toContain('eventA');
    expect(zip.file('media/asset/map/city-overview.png')).not.toBeNull();
    expect(zip.file('media/asset/scene/classroom.png')).not.toBeNull();
    expect(zip.file('media/asset/character/lin-cheng.png')).not.toBeNull();
    expect(zip.file('media/event/eventA.png')).toBeNull();
    expect(savedMedia.get('asset:scene:classroom')?.type).toBe('image/png');
    expect(bundle.gameState.event.generatedImages.eventA).toBeUndefined();
  });

  it('exports runtime visual assets from the current world snapshot', async () => {
    let state = createInitialState();
    state = upsertRegion(state, {
      id: 'gym',
      name: '体育馆',
      sceneIds: [],
      imageUrl: '/assets/backgrounds/region-school-main.png'
    });
    state = upsertScene(state, {
      id: 'gym-court',
      regionId: 'gym',
      name: '篮球馆',
      description: '木地板上还留着训练后的回声。',
      imageUrl: '/assets/backgrounds/scene-playground-main.png',
      eventSeed: {
        baseTitle: '训练后的体育馆',
        castIds: ['许夏'],
        tones: [],
        buildUpGoals: ['观察场馆'],
        triggerHints: ['灯光闪了一下'],
        resolutionDirections: ['暂时离开'],
        premiseTemplates: ['体育馆里很安静。'],
        suspenseSeeds: []
      }
    });
    state = upsertCharacter(state, {
      id: '许夏',
      name: '许夏',
      gender: '女',
      identity: '体育馆里新出现的角色',
      age: '17岁左右',
      personality: '直接、爽朗',
      speakingStyle: '短句',
      relationshipToPlayer: '刚认识',
      hardRules: [],
      imageUrl: '/assets/characters/lin-cheng-half-body.png'
    });

    const archive = await exportGameSaveZip(state, { fetchImpl: imageFetch });
    const zip = await JSZip.loadAsync(archive);
    const manifest = await zip.file('save.json')?.async('text');
    const savedMedia = new Map<string, Blob>();
    const bundle = await importGameSave(new File([archive], 'save.zip', { type: 'application/zip' }), {
      saveMediaBlob: async (key, blob) => {
        savedMedia.set(key, blob);
      }
    });

    expect(manifest).toContain('asset:region:gym');
    expect(manifest).toContain('asset:scene:gym-court');
    expect(manifest).toContain('asset:character:许夏');
    expect(zip.file('media/asset/region/gym.png')).not.toBeNull();
    expect(zip.file('media/asset/scene/gym-court.png')).not.toBeNull();
    expect(zip.file('media/asset/character/许夏.png')).not.toBeNull();
    expect(savedMedia.get('asset:scene:gym-court')?.type).toBe('image/png');
    expect(bundle.gameState.world.data.regions.find((region) => region.id === 'gym')?.imageUrl).toBe('media://asset:region:gym');
    expect(bundle.gameState.world.data.scenes.find((scene) => scene.id === 'gym-court')?.imageUrl).toBe(
      'media://asset:scene:gym-court'
    );
    expect(bundle.gameState.world.data.characters.find((character) => character.id === '许夏')?.imageUrl).toBe(
      'media://asset:character:许夏'
    );
  });

  it('keeps zip media in external storage instead of hydrating data urls during import', async () => {
    const state = {
      ...createInitialState(),
      event: {
        ...createInitialState().event,
        generatedImages: {
          eventA: 'data:image/png;base64,QUJD'
        }
      }
    };
    const savedMedia = new Map<string, Blob>();
    const archive = await exportGameSaveZip(state, { fetchImpl: imageFetch });
    const file = new File([archive], 'save.zip', { type: 'application/zip' });
    const bundle = await importGameSave(file, {
      saveMediaBlob: async (key, blob) => {
        savedMedia.set(key, blob);
      }
    });

    expect(savedMedia.get('asset:map:city-overview')?.type).toBe('image/png');
    expect(bundle.gameState.event.generatedImages.eventA).toBeUndefined();
    expect(bundle.embeddedMedia['asset:map:city-overview'].url).toBe('media://asset:map:city-overview');
  });

  it('rejects non-zip save files', async () => {
    const file = new File(['{}'], 'save.json', { type: 'application/json' });

    await expect(
      importGameSave(file, {
        saveMediaBlob: async () => undefined
      })
    ).rejects.toThrow('请导入 ZIP 格式的游戏存档');
  });

  it('does not export generated media references from external storage', async () => {
    const state = {
      ...createInitialState(),
      event: {
        ...createInitialState().event,
        generatedImages: {
          eventA: 'media://event:eventA'
        },
        generatedImagePrompts: {
          eventA: '索引图片'
        }
      }
    };
    const archive = await exportGameSaveZip(state, {
      fetchImpl: imageFetch,
      loadMediaBlob: async (key) => (key === 'event:eventA' ? new Blob(['ABC'], { type: 'image/png' }) : null)
    });
    const zip = await JSZip.loadAsync(archive);
    const manifest = await zip.file('save.json')?.async('text');

    expect(manifest).not.toContain('media://event:eventA');
    expect(zip.file('media/event/eventA.png')).toBeNull();
    expect(zip.file('media/asset/map/city-overview.png')).not.toBeNull();
  });

  it('detects busy states before import, export, or reset actions', () => {
    expect(isGameStateBusy(createInitialState())).toBe(false);

    const state = startTask(createInitialState(), {
      content: '学习数学',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      executionMode: 'result',
      segmentMinutes: 10
    });

    expect(isGameStateBusy(state)).toBe(true);
  });
});
