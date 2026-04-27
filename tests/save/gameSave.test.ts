import { beforeEach, describe, expect, it } from 'vitest';
import { worldData } from '../../src/data/world';
import { createInitialState, enterRegion, openTaskPlanningPage, setPlayerState, startTask, updateMemory } from '../../src/state/store';
import { createInitialPlayerState } from '../../src/player/initialState';
import {
  exportGameSave,
  importGameSave,
  isGameStateBusy,
  parseGameSave,
  resetGameProgress,
  restoreGameSaveBundle,
  serializeGameSave
} from '../../src/save/gameSave';
import { loadStoredGameState, saveStoredGameState } from '../../src/save/storage';

describe('game save bundles', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exports the full state with player, settings, world snapshot, and embedded media', async () => {
    let state = enterRegion(createInitialState(), 'school');
    state = updateMemory(state, {
      summary: '你已经在教室里见过林澄。',
      facts: ['林澄今天有点心事']
    });
    state = setPlayerState(state, {
      ...createInitialPlayerState(),
      money: 300
    });
    state = {
      ...state,
      event: {
        ...state.event,
        generatedImages: {
          eventA: 'data:image/png;base64,abc'
        },
        generatedImagePrompts: {
          eventA: '教室窗边的两人'
        }
      }
    };

    const bundle = await exportGameSave(state, { now: new Date('2026-04-27T10:00:00.000Z') });

    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.appName).toBe('romance-map-chat-game');
    expect(bundle.exportedAt).toBe('2026-04-27T10:00:00.000Z');
    expect(bundle.worldSnapshot).toEqual(worldData);
    expect(bundle.gameState.memory.summary).toContain('教室');
    expect(bundle.player.money).toBe(300);
    expect(bundle.settings.currentModel).toBe('deepseek-chat');
    expect(bundle.embeddedMedia['event:eventA']).toEqual({
      url: 'data:image/png;base64,abc',
      dataUrl: 'data:image/png;base64,abc',
      prompt: '教室窗边的两人'
    });
  });

  it('restores a valid save bundle and rejects broken or incompatible files', () => {
    const state = updateMemory(createInitialState(), {
      summary: '你已经完成一次任务。',
      facts: ['获得了新的线索']
    });
    const serialized = serializeGameSave({
      schemaVersion: 1,
      appName: 'romance-map-chat-game',
      exportedAt: '2026-04-27T10:00:00.000Z',
      worldSnapshot: worldData,
      gameState: state,
      player: {
        ...createInitialPlayerState(),
        money: 128
      },
      settings: {
        currentModel: 'gpt-4o-mini',
        streamCharsPerSecond: 5
      },
      embeddedMedia: {}
    });

    const bundle = parseGameSave(serialized);
    const restored = restoreGameSaveBundle(bundle);

    expect(restored.memory.summary).toContain('任务');
    expect(restored.player.money).toBe(128);
    expect(restored.settings.currentModel).toBe('gpt-4o-mini');
    expect(() => parseGameSave('{bad json')).toThrow('存档文件不是有效的 JSON');
    const changedWorld = parseGameSave(
      serializeGameSave({
        ...bundle,
        worldSnapshot: {
          ...worldData,
          regions: [...worldData.regions, { id: 'toilet', name: '厕所', sceneIds: [] }]
        }
      })
    );
    expect(changedWorld.gameState.world.data.regions.map((region) => region.id)).toContain('toilet');
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

  it('imports a save file object', async () => {
    const state = createInitialState();
    const bundle = await exportGameSave(state);
    const file = new File([serializeGameSave(bundle)], 'save.json', { type: 'application/json' });

    await expect(importGameSave(file)).resolves.toMatchObject({
      appName: 'romance-map-chat-game',
      schemaVersion: 1
    });
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
