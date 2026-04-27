import { describe, expect, it } from 'vitest';
import { formatGameEffectSummaries, formatGameEffectsInline } from '../../src/player/effectSummary';

describe('effect summary formatting', () => {
  it('formats player-facing settlement changes', () => {
    expect(
      formatGameEffectSummaries([
        { type: 'money_delta', delta: 300 },
        { type: 'attribute_delta', target: 'stamina', delta: -5 },
        { type: 'academic_delta', subject: 'math', delta: 3 },
        {
          type: 'item_add',
          item: {
            name: '万能钥匙',
            description: '可以开启绝大多数门。',
            abilityText: '开启所有门',
            effects: []
          },
          quantity: 1
        }
      ])
    ).toEqual(['资产 +300', '体力 -5', '数学 +3', '获得物品：万能钥匙 x1']);
  });

  it('shows cash-like item additions as assets instead of inventory items without double counting', () => {
    expect(
      formatGameEffectsInline([
        {
          type: 'item_add',
          item: {
            name: '现金 300 元',
            description: '任务报酬。',
            abilityText: '可以用于消费。',
            effects: []
          },
          quantity: 1
        },
        { type: 'money_delta', delta: 300 }
      ])
    ).toBe('资产 +300');
  });
});
