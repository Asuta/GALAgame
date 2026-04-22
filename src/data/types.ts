export type Mode = 'explore' | 'event';

export type TimeSlot = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';

export type EventPhase = 'opening' | 'build_up' | 'overlimit' | 'resolution';

export type GeneratedEventStatus = 'seeded' | 'active' | 'resolved' | 'stale';

export interface Region {
  id: string;
  name: string;
  sceneIds: string[];
}

export interface SceneEventSeed {
  baseTitle: string;
  castIds: string[];
  tones: string[];
  buildUpGoals: string[];
  triggerHints: string[];
  resolutionDirections: string[];
  premiseTemplates: string[];
  suspenseSeeds: string[];
  preferredTimeSlots?: TimeSlot[];
}

export interface Scene {
  id: string;
  regionId: string;
  name: string;
  description: string;
  eventSeed: SceneEventSeed;
  fallbackEventSeed?: SceneEventSeed;
}

export interface GeneratedEventSnapshot {
  timeSlot: TimeSlot;
  timeLabel: string;
  worldRevision: number;
  memorySummary: string;
  memoryFacts: string[];
}

export interface GeneratedEvent {
  id: string;
  title: string;
  sceneId: string;
  locationLabel: string;
  cast: string[];
  premise: string;
  openingState: string;
  buildUpGoal: string;
  overlimitTrigger: string;
  resolutionDirection: string;
  suspenseThreads: string[];
  currentPhase: EventPhase;
  phaseHistory: EventPhase[];
  facts: string[];
  status: GeneratedEventStatus;
  snapshot: GeneratedEventSnapshot;
  turnCount: number;
}

export interface CharacterProfile {
  id: string;
  name: string;
  gender: string;
  identity: string;
  age: string;
  personality: string;
  speakingStyle: string;
  relationshipToPlayer: string;
  hardRules: string[];
}

export interface WorldData {
  regions: Region[];
  scenes: Scene[];
  characters: CharacterProfile[];
}
