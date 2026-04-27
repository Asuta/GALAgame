import { createInitialPlayerState } from './initialState';
import type { InventoryItem, InventoryItemEffect, PlayerState } from './types';

const PLAYER_STORAGE_KEY = 'romance-map-chat-game.player';
const MONEY_ITEM_PATTERN = /(现金|金钱|钱|资产|收入|工资|奖金|借款|贷款|报酬|零花钱|元|块)/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const readItemEffects = (value: unknown): InventoryItemEffect[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((effect) => ({
      type: readString(effect.type, 'unknown'),
      value:
        typeof effect.value === 'string' || typeof effect.value === 'number' || typeof effect.value === 'boolean'
          ? effect.value
          : undefined,
      scope: readString(effect.scope)
    }))
    .filter((effect) => effect.type.trim());
};

const readInventoryItems = (value: unknown): InventoryItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((item, index) => ({
    id: readString(item.id, `item-${index + 1}`),
    name: readString(item.name, '未命名物品'),
    description: readString(item.description, '暂无描述。'),
    abilityText: readString(item.abilityText, '暂无特殊能力说明。'),
    effects: readItemEffects(item.effects),
    quantity: Math.max(1, Math.round(readNumber(item.quantity, 1)))
  }));
};

const extractMoneyAmount = (value: string): number | null => {
  const match = /(\d+(?:\.\d+)?)\s*(?:元|块|人民币)?/.exec(value);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);

  return Number.isFinite(amount) ? amount : null;
};

const splitMoneyLikeItems = (items: InventoryItem[]): { items: InventoryItem[]; money: number } => {
  let money = 0;
  const normalizedItems = items.filter((item) => {
    const text = [item.name, item.description, item.abilityText].join(' ');

    if (!MONEY_ITEM_PATTERN.test(text)) {
      return true;
    }

    const amount = extractMoneyAmount(text);

    if (amount === null) {
      return false;
    }

    money += amount * item.quantity;
    return false;
  });

  return { items: normalizedItems, money };
};

export const normalizePlayerState = (value: unknown): PlayerState => {
  const fallback = createInitialPlayerState();

  if (!isRecord(value)) {
    return fallback;
  }

  const attributes = isRecord(value.attributes) ? value.attributes : {};
  const academics = isRecord(value.academics) ? value.academics : {};
  const inventory = isRecord(value.inventory) ? value.inventory : {};
  const splitInventory = splitMoneyLikeItems(readInventoryItems(inventory.items));

  return {
    attributes: {
      intelligence: readNumber(attributes.intelligence, fallback.attributes.intelligence),
      stamina: readNumber(attributes.stamina, fallback.attributes.stamina),
      agility: readNumber(attributes.agility, fallback.attributes.agility),
      insight: readNumber(attributes.insight, fallback.attributes.insight),
      hp: readNumber(attributes.hp, fallback.attributes.hp)
    },
    academics: {
      math: readNumber(academics.math, fallback.academics.math),
      literature: readNumber(academics.literature, fallback.academics.literature),
      english: readNumber(academics.english, fallback.academics.english),
      physics: readNumber(academics.physics, fallback.academics.physics)
    },
    money: readNumber(value.money, fallback.money) + splitInventory.money,
    inventory: {
      items: splitInventory.items
    }
  };
};

export const loadStoredPlayerState = (): PlayerState => {
  const raw = localStorage.getItem(PLAYER_STORAGE_KEY);

  if (!raw) {
    return createInitialPlayerState();
  }

  try {
    return normalizePlayerState(JSON.parse(raw));
  } catch {
    return createInitialPlayerState();
  }
};

export const saveStoredPlayerState = (player: PlayerState): void => {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(normalizePlayerState(player)));
};
