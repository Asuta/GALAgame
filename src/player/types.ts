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

export interface PlayerState {
  attributes: PlayerAttributes;
  academics: PlayerAcademics;
  money: number;
  inventory: {
    items: InventoryItem[];
  };
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
  | AttributeDeltaEffect
  | AcademicDeltaEffect
  | MoneyDeltaEffect
  | ItemAddEffect
  | ItemRemoveEffect
  | ItemUpdateEffect;

