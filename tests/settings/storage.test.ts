import { beforeEach, describe, expect, it } from 'vitest';
import { loadStoredSettings, saveStoredSettings } from '../../src/settings/storage';

describe('settings storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and restores stream speed setting', () => {
    saveStoredSettings({
      currentModel: 'deepseek-chat',
      streamCharsPerSecond: 1
    });

    expect(loadStoredSettings()).toEqual({
      currentModel: 'deepseek-chat',
      streamCharsPerSecond: 1
    });
  });
});
