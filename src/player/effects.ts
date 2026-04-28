import type { GameEffect, InventoryItem, PlayerState } from './types';
import { ACADEMIC_STAT_GROUP_ID, CORE_STAT_GROUP_ID, syncLegacyStats, upsertStatInGroups } from './stats';

const normalizeIdPart = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const createInventoryItemId = (name: string): string => {
  const normalizedName = normalizeIdPart(name);
  const suffix = Math.random().toString(36).slice(2, 8);

  return `item-${normalizedName || 'unknown'}-${suffix}`;
};

const resolveItemIndex = (items: InventoryItem[], input: { itemId?: string; name?: string }): number => {
  if (input.itemId) {
    const index = items.findIndex((item) => item.id === input.itemId);

    if (index !== -1) {
      return index;
    }
  }

  if (input.name) {
    return items.findIndex((item) => item.name === input.name);
  }

  return -1;
};

const normalizeQuantity = (value: number | undefined, fallback = 1): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value ?? fallback));
};

const MONEY_ITEM_PATTERN = /(现金|金钱|钱|资产|收入|工资|奖金|借款|贷款|报酬|零花钱|元|块)/;

const extractMoneyAmount = (value: string): number | null => {
  const match = /(\d+(?:\.\d+)?)\s*(?:元|块|人民币)?/.exec(value);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);

  return Number.isFinite(amount) ? amount : null;
};

const resolveMoneyItemAmount = (effect: Extract<GameEffect, { type: 'item_add' }>): number | null => {
  const text = [effect.item.name, effect.item.description, effect.item.abilityText, effect.reason ?? ''].join(' ');

  if (!MONEY_ITEM_PATTERN.test(text)) {
    return null;
  }

  return extractMoneyAmount(text);
};

export const applyGameEffects = (player: PlayerState, effects: GameEffect[] = []): PlayerState => {
  const hasCashItemCredit = effects.some((effect) => effect.type === 'item_add' && resolveMoneyItemAmount(effect) !== null);
  let nextPlayer: PlayerState = {
    ...player,
    statGroups: player.statGroups.map((group) => ({
      ...group,
      stats: group.stats.map((stat) => ({ ...stat }))
    })),
    attributes: { ...player.attributes },
    academics: { ...player.academics },
    inventory: {
      items: player.inventory.items.map((item) => ({
        ...item,
        effects: item.effects.map((effect) => ({ ...effect }))
      })),
      optionDefinitions: player.inventory.optionDefinitions.map((option) => ({ ...option }))
    }
  };

  for (const effect of effects) {
    if (effect.type === 'stat_delta') {
      nextPlayer = syncLegacyStats({
        ...nextPlayer,
        statGroups: upsertStatInGroups(nextPlayer.statGroups, {
          groupId: effect.groupId,
          groupLabel: effect.groupLabel,
          statId: effect.statId,
          label: effect.label,
          delta: effect.delta
        })
      });
      continue;
    }

    if (effect.type === 'attribute_delta') {
      nextPlayer = {
        ...nextPlayer,
        statGroups: upsertStatInGroups(nextPlayer.statGroups, {
          groupId: CORE_STAT_GROUP_ID,
          statId: effect.target,
          delta: effect.delta
        })
      };
      nextPlayer = syncLegacyStats(nextPlayer);
      continue;
    }

    if (effect.type === 'academic_delta') {
      nextPlayer = {
        ...nextPlayer,
        statGroups: upsertStatInGroups(nextPlayer.statGroups, {
          groupId: ACADEMIC_STAT_GROUP_ID,
          statId: effect.subject,
          delta: effect.delta
        })
      };
      nextPlayer = syncLegacyStats(nextPlayer);
      continue;
    }

    if (effect.type === 'money_delta') {
      if (hasCashItemCredit && effect.delta > 0) {
        continue;
      }

      nextPlayer = {
        ...nextPlayer,
        money: nextPlayer.money + effect.delta
      };
      continue;
    }

    if (effect.type === 'item_add') {
      const moneyAmount = resolveMoneyItemAmount(effect);

      if (moneyAmount !== null) {
        nextPlayer = {
          ...nextPlayer,
          money: nextPlayer.money + moneyAmount
        };
        continue;
      }

      const quantity = normalizeQuantity(effect.quantity ?? effect.item.quantity);
      const item: InventoryItem = {
        id: effect.item.id?.trim() || createInventoryItemId(effect.item.name),
        name: effect.item.name.trim() || '未命名物品',
        description: effect.item.description?.trim() || '暂无描述。',
        abilityText: effect.item.abilityText?.trim() || '暂无特殊能力说明。',
        effects: Array.isArray(effect.item.effects) ? effect.item.effects.map((itemEffect) => ({ ...itemEffect })) : [],
        quantity
      };
      const existingIndex = resolveItemIndex(nextPlayer.inventory.items, { itemId: item.id, name: item.name });

      if (existingIndex === -1) {
        nextPlayer = {
          ...nextPlayer,
          inventory: {
            ...nextPlayer.inventory,
            items: [...nextPlayer.inventory.items, item]
          }
        };
      } else {
        const items = nextPlayer.inventory.items.slice();
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: items[existingIndex].quantity + quantity
        };
        nextPlayer = {
          ...nextPlayer,
          inventory: { ...nextPlayer.inventory, items }
        };
      }
      continue;
    }

    if (effect.type === 'item_remove') {
      const index = resolveItemIndex(nextPlayer.inventory.items, effect);

      if (index === -1) {
        continue;
      }

      const quantity = normalizeQuantity(effect.quantity);
      const items = nextPlayer.inventory.items.slice();
      const currentItem = items[index];
      const nextQuantity = currentItem.quantity - quantity;

      if (nextQuantity <= 0) {
        items.splice(index, 1);
      } else {
        items[index] = {
          ...currentItem,
          quantity: nextQuantity
        };
      }

      nextPlayer = {
        ...nextPlayer,
        inventory: { ...nextPlayer.inventory, items }
      };
      continue;
    }

    if (effect.type === 'item_update') {
      const index = resolveItemIndex(nextPlayer.inventory.items, effect);

      if (index === -1) {
        continue;
      }

      const items = nextPlayer.inventory.items.slice();
      const currentItem = items[index];
      items[index] = {
        ...currentItem,
        ...effect.patch,
        id: currentItem.id,
        effects: effect.patch.effects?.map((itemEffect) => ({ ...itemEffect })) ?? currentItem.effects,
        quantity: effect.patch.quantity ?? currentItem.quantity
      };

      nextPlayer = {
        ...nextPlayer,
        inventory: { ...nextPlayer.inventory, items }
      };
    }
  }

  return nextPlayer;
};
