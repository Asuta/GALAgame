import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyGameEffects } from '../../src/player/effects';
import { createInitialPlayerState } from '../../src/player/initialState';
import { serializePlayerStateForPrompt } from '../../src/player/serializeForPrompt';
import { loadStoredPlayerState, saveStoredPlayerState } from '../../src/player/storage';

describe('player state helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies numeric and inventory effects through one pipeline', () => {
    const nextPlayer = applyGameEffects(createInitialPlayerState(), [
      {
        type: 'attribute_delta',
        target: 'hp',
        delta: -12,
        reason: '打架失败受伤'
      },
      {
        type: 'academic_delta',
        subject: 'math',
        delta: 3
      },
      {
        type: 'money_delta',
        delta: -30
      },
      {
        type: 'item_add',
        item: {
          name: '揣测心意的眼镜',
          description: '一副看起来普通的细框眼镜。',
          abilityText: '佩戴后可以感知对方当前最强烈的情绪倾向。',
          effects: [{ type: 'read_emotion_hint', scope: 'conversation' }]
        }
      }
    ]);

    expect(nextPlayer.attributes.hp).toBe(88);
    expect(nextPlayer.academics.math).toBe(63);
    expect(nextPlayer.money).toBe(70);
    expect(nextPlayer.inventory.items[0]).toMatchObject({
      name: '揣测心意的眼镜',
      quantity: 1,
      effects: [{ type: 'read_emotion_hint', scope: 'conversation' }]
    });
  });

  it('persists and restores player state', () => {
    const player = applyGameEffects(createInitialPlayerState(), [{ type: 'money_delta', delta: 400 }]);

    saveStoredPlayerState(player);

    expect(loadStoredPlayerState().money).toBe(500);
  });

  it('treats cash-like item additions as money instead of inventory items', () => {
    const nextPlayer = applyGameEffects(createInitialPlayerState(), [
      {
        type: 'money_delta',
        delta: 100,
        reason: '模型误判的额外现金变化'
      },
      {
        type: 'item_add',
        item: {
          name: '借款现金 300元',
          description: '林澄借给你的现金，她曾表示不用还了。',
          abilityText: '用于日常开销。',
          effects: [{ type: 'spendable', scope: 'money' }]
        }
      }
    ]);

    expect(nextPlayer.money).toBe(400);
    expect(nextPlayer.inventory.items).toHaveLength(0);
  });

  it('migrates previously saved cash-like inventory items into money', () => {
    localStorage.setItem(
      'romance-map-chat-game.player',
      JSON.stringify({
        ...createInitialPlayerState(),
        money: 200,
        inventory: {
          items: [
            {
              id: 'item-cash',
              name: '借款现金 300元',
              description: '林澄借给你的现金，她曾表示不用还了。',
              abilityText: '用于日常开销。',
              effects: [{ type: 'spendable', scope: 'money' }],
              quantity: 1
            }
          ]
        }
      })
    );

    const player = loadStoredPlayerState();

    expect(player.money).toBe(500);
    expect(player.inventory.items).toHaveLength(0);
  });

  it('serializes current player state as an authoritative prompt block', () => {
    const prompt = serializePlayerStateForPrompt(createInitialPlayerState());

    expect(prompt).toContain('【当前权威角色数据】');
    expect(prompt).toContain('如果它和历史对话、长期记忆或旧结算内容冲突');
    expect(prompt).toContain('智力：10');
    expect(prompt).toContain('金钱：100');
  });
});
