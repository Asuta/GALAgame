import type { GameEffect, PlayerAcademics, PlayerAttributes } from './types';

const attributeLabels: Record<keyof PlayerAttributes, string> = {
  intelligence: '智力',
  stamina: '体力',
  agility: '敏捷',
  insight: '悟性',
  hp: 'HP'
};

const academicLabels: Record<keyof PlayerAcademics, string> = {
  math: '数学',
  literature: '语文',
  english: '英语',
  physics: '物理'
};

const MONEY_ITEM_PATTERN = /(现金|金钱|钱|资产|收入|工资|奖金|借款|贷款|报酬|零花钱|元|块)/;

const formatSignedDelta = (delta: number): string => `${delta >= 0 ? '+' : ''}${delta}`;

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

export const formatGameEffectSummary = (effect: GameEffect): string | null => {
  if (effect.type === 'attribute_delta') {
    return `${attributeLabels[effect.target]} ${formatSignedDelta(effect.delta)}`;
  }

  if (effect.type === 'academic_delta') {
    return `${academicLabels[effect.subject]} ${formatSignedDelta(effect.delta)}`;
  }

  if (effect.type === 'money_delta') {
    return `资产 ${formatSignedDelta(effect.delta)}`;
  }

  if (effect.type === 'item_add') {
    const moneyAmount = resolveMoneyItemAmount(effect);

    if (moneyAmount !== null) {
      return `资产 +${moneyAmount}`;
    }

    const quantity = Math.max(1, Math.round(effect.quantity ?? effect.item.quantity ?? 1));
    return `获得物品：${effect.item.name || '未命名物品'} x${quantity}`;
  }

  if (effect.type === 'item_remove') {
    const quantity = Math.max(1, Math.round(effect.quantity ?? 1));
    return `失去物品：${effect.name ?? effect.itemId ?? '未知物品'} x${quantity}`;
  }

  if (effect.type === 'item_update') {
    return `物品更新：${effect.name ?? effect.itemId ?? '未知物品'}`;
  }

  return null;
};

export const formatGameEffectSummaries = (effects: GameEffect[]): string[] => {
  const hasCashItemCredit = effects.some((effect) => effect.type === 'item_add' && resolveMoneyItemAmount(effect) !== null);

  return effects
    .filter((effect) => !(hasCashItemCredit && effect.type === 'money_delta' && effect.delta > 0))
    .map(formatGameEffectSummary)
    .filter((summary): summary is string => !!summary);
};

export const formatGameEffectsInline = (effects: GameEffect[]): string => formatGameEffectSummaries(effects).join('；');
