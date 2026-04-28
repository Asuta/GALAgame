import type { PlayerState } from './types';
import { DEFAULT_ACADEMICS, DEFAULT_ATTRIBUTES, createStatGroupsFromLegacy } from './stats';

export const createInitialPlayerState = (): PlayerState => ({
  statGroups: createStatGroupsFromLegacy(),
  attributes: { ...DEFAULT_ATTRIBUTES },
  academics: { ...DEFAULT_ACADEMICS },
  money: 100,
  inventory: {
    items: [],
    optionDefinitions: []
  }
});

