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
  const statLines = player.statGroups.length
    ? player.statGroups.flatMap((group) => [
        `${group.label}：`,
        ...group.stats.map((stat) => `${stat.label}：${stat.value}${stat.description ? `（${stat.description}）` : ''}`)
      ])
    : ['暂无属性数据'];
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
    '动态属性：',
    ...statLines,
    '',
    `金钱：${player.money}`,
    '',
    '背包：',
    ...itemLines
  ].join('\n');
};

