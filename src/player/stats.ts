import type { PlayerAcademics, PlayerAttributes, PlayerStat, PlayerStatGroup, PlayerState } from './types';

export const CORE_STAT_GROUP_ID = 'core';
export const ACADEMIC_STAT_GROUP_ID = 'academics';

export const ATTRIBUTE_STAT_LABELS: Record<keyof PlayerAttributes, string> = {
  intelligence: '智力',
  stamina: '体力',
  agility: '敏捷',
  insight: '悟性',
  hp: 'HP'
};

export const ACADEMIC_STAT_LABELS: Record<keyof PlayerAcademics, string> = {
  math: '数学',
  literature: '语文',
  english: '英语',
  physics: '物理'
};

export const DEFAULT_ATTRIBUTES: PlayerAttributes = {
  intelligence: 10,
  stamina: 10,
  agility: 10,
  insight: 10,
  hp: 100
};

export const DEFAULT_ACADEMICS: PlayerAcademics = {
  math: 60,
  literature: 60,
  english: 60,
  physics: 60
};

const cloneStat = (stat: PlayerStat): PlayerStat => ({ ...stat });

export const cloneStatGroups = (groups: PlayerStatGroup[]): PlayerStatGroup[] =>
  groups.map((group) => ({
    ...group,
    stats: group.stats.map(cloneStat)
  }));

export const createStatGroupsFromLegacy = (
  attributes: PlayerAttributes = DEFAULT_ATTRIBUTES,
  academics: PlayerAcademics = DEFAULT_ACADEMICS
): PlayerStatGroup[] => [
  {
    id: CORE_STAT_GROUP_ID,
    label: '基础属性',
    stats: (Object.entries(attributes) as Array<[keyof PlayerAttributes, number]>).map(([id, value]) => ({
      id,
      label: ATTRIBUTE_STAT_LABELS[id],
      value
    }))
  },
  {
    id: ACADEMIC_STAT_GROUP_ID,
    label: '学科能力',
    stats: (Object.entries(academics) as Array<[keyof PlayerAcademics, number]>).map(([id, value]) => ({
      id,
      label: ACADEMIC_STAT_LABELS[id],
      value
    }))
  }
];

const valueFromGroup = (groups: PlayerStatGroup[], groupId: string, statId: string, fallback: number): number => {
  const value = groups.find((group) => group.id === groupId)?.stats.find((stat) => stat.id === statId)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const deriveLegacyAttributes = (groups: PlayerStatGroup[]): PlayerAttributes => ({
  intelligence: valueFromGroup(groups, CORE_STAT_GROUP_ID, 'intelligence', DEFAULT_ATTRIBUTES.intelligence),
  stamina: valueFromGroup(groups, CORE_STAT_GROUP_ID, 'stamina', DEFAULT_ATTRIBUTES.stamina),
  agility: valueFromGroup(groups, CORE_STAT_GROUP_ID, 'agility', DEFAULT_ATTRIBUTES.agility),
  insight: valueFromGroup(groups, CORE_STAT_GROUP_ID, 'insight', DEFAULT_ATTRIBUTES.insight),
  hp: valueFromGroup(groups, CORE_STAT_GROUP_ID, 'hp', DEFAULT_ATTRIBUTES.hp)
});

export const deriveLegacyAcademics = (groups: PlayerStatGroup[]): PlayerAcademics => ({
  math: valueFromGroup(groups, ACADEMIC_STAT_GROUP_ID, 'math', DEFAULT_ACADEMICS.math),
  literature: valueFromGroup(groups, ACADEMIC_STAT_GROUP_ID, 'literature', DEFAULT_ACADEMICS.literature),
  english: valueFromGroup(groups, ACADEMIC_STAT_GROUP_ID, 'english', DEFAULT_ACADEMICS.english),
  physics: valueFromGroup(groups, ACADEMIC_STAT_GROUP_ID, 'physics', DEFAULT_ACADEMICS.physics)
});

export const syncLegacyStats = (player: PlayerState): PlayerState => {
  const statGroups = cloneStatGroups(player.statGroups);

  return {
    ...player,
    statGroups,
    attributes: deriveLegacyAttributes(statGroups),
    academics: deriveLegacyAcademics(statGroups)
  };
};

export const upsertStatInGroups = (
  groups: PlayerStatGroup[],
  input: {
    groupId: string;
    groupLabel?: string;
    statId: string;
    label?: string;
    value?: number;
    delta?: number;
    description?: string;
  }
): PlayerStatGroup[] => {
  const nextGroups = cloneStatGroups(groups);
  const groupId = input.groupId.trim();
  const statId = input.statId.trim();

  if (!groupId || !statId) {
    return nextGroups;
  }

  let group = nextGroups.find((item) => item.id === groupId);
  if (!group) {
    group = {
      id: groupId,
      label: input.groupLabel?.trim() || groupId,
      stats: []
    };
    nextGroups.push(group);
  } else if (input.groupLabel?.trim()) {
    group.label = input.groupLabel.trim();
  }

  const stat = group.stats.find((item) => item.id === statId);
  if (!stat) {
    group.stats.push({
      id: statId,
      label: input.label?.trim() || statId,
      value: input.value ?? input.delta ?? 0,
      ...(input.description?.trim() ? { description: input.description.trim() } : {})
    });
    return nextGroups;
  }

  if (input.label?.trim()) {
    stat.label = input.label.trim();
  }
  if (input.description?.trim()) {
    stat.description = input.description.trim();
  }
  if (typeof input.value === 'number' && Number.isFinite(input.value)) {
    stat.value = input.value;
  }
  if (typeof input.delta === 'number' && Number.isFinite(input.delta)) {
    stat.value += input.delta;
  }

  return nextGroups;
};
