import { createInitialPlayerState } from './initialState';
import {
  ACADEMIC_STAT_GROUP_ID,
  CORE_STAT_GROUP_ID,
  ACADEMIC_STAT_LABELS,
  ATTRIBUTE_STAT_LABELS,
  createStatGroupsFromLegacy,
  syncLegacyStats
} from './stats';
import type {
  InventoryItem,
  InventoryItemEffect,
  InventoryOptionDefinition,
  PlayerAcademics,
  PlayerAttributes,
  PlayerState,
  PlayerStatGroup
} from './types';

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

const readInventoryOptionDefinitions = (value: unknown): InventoryOptionDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((option, index) => ({
      id: readString(option.id, `option-${index + 1}`),
      label: readString(option.label, '未命名选项'),
      description: readString(option.description, '暂无说明。'),
      effectType: typeof option.effectType === 'string' ? option.effectType : undefined
    }))
    .filter((option) => option.id.trim() && option.label.trim());
};

const readStatGroups = (value: unknown): PlayerStatGroup[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((group) => ({
      id: readString(group.id).trim(),
      label: readString(group.label, readString(group.id, '未命名属性组')).trim(),
      stats: Array.isArray(group.stats)
        ? group.stats
            .filter(isRecord)
            .map((stat) => ({
              id: readString(stat.id).trim(),
              label: readString(stat.label, readString(stat.id, '未命名属性')).trim(),
              value: readNumber(stat.value, 0),
              description: typeof stat.description === 'string' ? stat.description : undefined
            }))
            .filter((stat) => stat.id && stat.label)
        : []
    }))
    .filter((group) => group.id && group.label);
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
  const normalizedAttributes: PlayerAttributes = {
    intelligence: readNumber(attributes.intelligence, fallback.attributes.intelligence),
    stamina: readNumber(attributes.stamina, fallback.attributes.stamina),
    agility: readNumber(attributes.agility, fallback.attributes.agility),
    insight: readNumber(attributes.insight, fallback.attributes.insight),
    hp: readNumber(attributes.hp, fallback.attributes.hp)
  };
  const normalizedAcademics: PlayerAcademics = {
    math: readNumber(academics.math, fallback.academics.math),
    literature: readNumber(academics.literature, fallback.academics.literature),
    english: readNumber(academics.english, fallback.academics.english),
    physics: readNumber(academics.physics, fallback.academics.physics)
  };
  const storedStatGroups = readStatGroups(value.statGroups);
  const statGroups = storedStatGroups.length
    ? storedStatGroups
    : createStatGroupsFromLegacy(normalizedAttributes, normalizedAcademics);
  const hasLegacyAttributes = Object.keys(attributes).length > 0;
  const hasLegacyAcademics = Object.keys(academics).length > 0;

  if (storedStatGroups.length && (hasLegacyAttributes || hasLegacyAcademics)) {
    const coreGroup = statGroups.find((group) => group.id === CORE_STAT_GROUP_ID);
    const academicGroup = statGroups.find((group) => group.id === ACADEMIC_STAT_GROUP_ID);

    if (coreGroup && hasLegacyAttributes) {
      for (const [id, value] of Object.entries(normalizedAttributes) as Array<[keyof PlayerAttributes, number]>) {
        const stat = coreGroup.stats.find((item) => item.id === id);
        if (!stat) {
          coreGroup.stats.push({ id, label: ATTRIBUTE_STAT_LABELS[id], value });
        }
      }
    }

    if (academicGroup && hasLegacyAcademics) {
      for (const [id, value] of Object.entries(normalizedAcademics) as Array<[keyof PlayerAcademics, number]>) {
        const stat = academicGroup.stats.find((item) => item.id === id);
        if (!stat) {
          academicGroup.stats.push({ id, label: ACADEMIC_STAT_LABELS[id], value });
        }
      }
    }
  }

  return syncLegacyStats({
    statGroups,
    attributes: normalizedAttributes,
    academics: normalizedAcademics,
    money: readNumber(value.money, fallback.money) + splitInventory.money,
    inventory: {
      items: splitInventory.items,
      optionDefinitions: readInventoryOptionDefinitions(inventory.optionDefinitions)
    }
  });
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
