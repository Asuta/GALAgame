import { beforeEach, describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createInitialState, enterRegion, openTaskPlanningPage, startTask, updateMemory } from '../../src/state/store';
import { createInitialPlayerState } from '../../src/player/initialState';
import {
  exportGameSaveZip,
  importGameSave,
  isGameStateBusy,
  resetGameProgress,
  restoreGameSaveBundle
} from '../../src/save/gameSave';
import { loadStoredGameState, saveStoredGameState } from '../../src/save/storage';

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

  it('exports and imports a zip save with media files outside the JSON manifest', async () => {
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

    const archive = await exportGameSaveZip(state, { now: new Date('2026-04-27T10:00:00.000Z') });
    const zip = await JSZip.loadAsync(archive);
    const manifest = await zip.file('save.json')?.async('text');
    const file = new File([archive], 'save.zip', { type: 'application/zip' });
    const savedMedia = new Map<string, Blob>();
    const bundle = await importGameSave(file, {
      saveMediaBlob: async (key, blob) => {
        savedMedia.set(key, blob);
      }
    });

    expect(manifest).toContain('media://event:eventA');
    expect(manifest).not.toContain('data:image/png;base64,QUJD');
    expect(zip.file('media/event/eventA.png')).not.toBeNull();
    expect(bundle.embeddedMedia['event:eventA']).toMatchObject({
      mediaPath: 'media/event/eventA.png',
      prompt: '教室窗边的两人'
    });
    expect(savedMedia.get('event:eventA')?.type).toBe('image/png');
    expect(bundle.gameState.event.generatedImages.eventA).toBe('media://event:eventA');
  });

  it('can keep zip media in external storage instead of hydrating data urls during import', async () => {
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
    const archive = await exportGameSaveZip(state);
    const file = new File([archive], 'save.zip', { type: 'application/zip' });
    const bundle = await importGameSave(file, {
      saveMediaBlob: async (key, blob) => {
        savedMedia.set(key, blob);
      }
    });

    expect(savedMedia.get('event:eventA')?.type).toBe('image/png');
    expect(bundle.gameState.event.generatedImages.eventA).toBe('media://event:eventA');
    expect(bundle.embeddedMedia['event:eventA'].url).toBe('media://event:eventA');
  });

  it('rejects non-zip save files', async () => {
    const file = new File(['{}'], 'save.json', { type: 'application/json' });

    await expect(
      importGameSave(file, {
        saveMediaBlob: async () => undefined
      })
    ).rejects.toThrow('请导入 ZIP 格式的游戏存档');
  });

  it('exports media references by reading their blobs from external storage', async () => {
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
      loadMediaBlob: async (key) => (key === 'event:eventA' ? new Blob(['ABC'], { type: 'image/png' }) : null)
    });
    const zip = await JSZip.loadAsync(archive);
    const manifest = await zip.file('save.json')?.async('text');

    expect(manifest).toContain('media://event:eventA');
    expect(zip.file('media/event/eventA.png')).not.toBeNull();
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
