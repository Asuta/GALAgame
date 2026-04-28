export interface PlayerAttributes {
  intelligence: number;
  stamina: number;
  agility: number;
  insight: number;
  hp: number;
}

export interface PlayerAcademics {
  math: number;
  literature: number;
  english: number;
  physics: number;
}

export interface InventoryItemEffect {
  type: string;
  value?: string | number | boolean;
  scope?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  abilityText: string;
  effects: InventoryItemEffect[];
  quantity: number;
}

export interface InventoryOptionDefinition {
  id: string;
  label: string;
  description: string;
  effectType?: string;
}

export interface PlayerStat {
  id: string;
  label: string;
  value: number;
  description?: string;
}

export interface PlayerStatGroup {
  id: string;
  label: string;
  stats: PlayerStat[];
}

export interface PlayerState {
  statGroups: PlayerStatGroup[];
  /**
   * Legacy mirrors kept for older call sites and saved data. statGroups is the
   * authoritative structure for rendering, prompts, and new effects.
   */
  attributes: PlayerAttributes;
  academics: PlayerAcademics;
  money: number;
  inventory: {
    items: InventoryItem[];
    optionDefinitions: InventoryOptionDefinition[];
  };
}

export interface StatDeltaEffect {
  type: 'stat_delta';
  groupId: string;
  statId: string;
  delta: number;
  label?: string;
  groupLabel?: string;
  reason?: string;
}

export interface AttributeDeltaEffect {
  type: 'attribute_delta';
  target: keyof PlayerAttributes;
  delta: number;
  reason?: string;
}

export interface AcademicDeltaEffect {
  type: 'academic_delta';
  subject: keyof PlayerAcademics;
  delta: number;
  reason?: string;
}

export interface MoneyDeltaEffect {
  type: 'money_delta';
  delta: number;
  reason?: string;
}

export interface ItemAddEffect {
  type: 'item_add';
  item: Omit<InventoryItem, 'id' | 'quantity'> & {
    id?: string;
    quantity?: number;
  };
  quantity?: number;
  reason?: string;
}

export interface ItemRemoveEffect {
  type: 'item_remove';
  itemId?: string;
  name?: string;
  quantity?: number;
  reason?: string;
}

export interface ItemUpdateEffect {
  type: 'item_update';
  itemId?: string;
  name?: string;
  patch: Partial<Omit<InventoryItem, 'id'>>;
  reason?: string;
}

export type GameEffect =
  | StatDeltaEffect
  | AttributeDeltaEffect
  | AcademicDeltaEffect
  | MoneyDeltaEffect
  | ItemAddEffect
  | ItemRemoveEffect
  | ItemUpdateEffect;

