import type { InventoryItemEffect, PlayerState } from './types';

const formatEffect = (effect: InventoryItemEffect): string => {
  const parts = [effect.type];

  if (effect.scope) {
    parts.push(`scope=${effect.scope}`);
  }

  if (effect.value !== undefined) {
    parts.push(`value=${String(effect.value)}`);
  }

  return parts.join(', ');
};

export const serializePlayerStateForPrompt = (player: PlayerState): string => {
  const itemLines = player.inventory.items.length
    ? player.inventory.items.flatMap((item, index) => [
        `${index + 1}. ${item.name} x${item.quantity}`,
        `   描述：${item.description}`,
        `   能力说明：${item.abilityText}`,
        `   结构化效果：${item.effects.length ? item.effects.map(formatEffect).join('；') : '暂无'}`
      ])
    : ['暂无'];

  return [
    '【当前权威角色数据】',
    '以下数据是游戏系统当前保存的最新状态。如果它和历史对话、长期记忆或旧结算内容冲突，请一律以本区块为准。',
    '',
    '基础属性：',
    `智力：${player.attributes.intelligence}`,
    `体力：${player.attributes.stamina}`,
    `敏捷：${player.attributes.agility}`,
    `悟性：${player.attributes.insight}`,
    `HP：${player.attributes.hp}`,
    '',
    '学科能力：',
    `数学：${player.academics.math}`,
    `语文：${player.academics.literature}`,
    `英语：${player.academics.english}`,
    `物理：${player.academics.physics}`,
    '',
    `金钱：${player.money}`,
    '',
    '背包：',
    ...itemLines
  ].join('\n');
};

