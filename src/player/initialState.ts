import type { PlayerState } from './types';

export const createInitialPlayerState = (): PlayerState => ({
  attributes: {
    intelligence: 10,
    stamina: 10,
    agility: 10,
    insight: 10,
    hp: 100
  },
  academics: {
    math: 60,
    literature: 60,
    english: 60,
    physics: 60
  },
  money: 100,
  inventory: {
    items: []
  }
});

