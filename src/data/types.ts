export type Mode = 'explore' | 'event' | 'task';

export type TimeSlot = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';

export type EventPhase = 'opening' | 'build_up' | 'overlimit' | 'resolution';

export type GeneratedEventStatus = 'seeded' | 'active' | 'resolved' | 'stale';

export type TaskExecutionMode = 'result' | 'process';

export type TaskControlMode = 'auto' | 'manual';

export type TaskStatus = 'running' | 'completed';

export type TaskAttentionLevel = 'low' | 'medium' | 'high';

export interface Region {
  id: string;
  name: string;
  sceneIds: string[];
  imageUrl?: string;
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
  imageUrl?: string;
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

export interface TaskSegment {
  id: string;
  fromLabel: string;
  toLabel: string;
  content: string;
  complication: string | null;
  attentionLevel: TaskAttentionLevel;
}

export interface TaskRuntime {
  id: string;
  title: string;
  content: string;
  startMinutes: number;
  endMinutes: number;
  currentMinutes: number;
  segmentMinutes: number;
  executionMode: TaskExecutionMode;
  controlMode: TaskControlMode;
  status: TaskStatus;
  summary: string;
  facts: string[];
  generatedImageUrl: string | null;
  generatedImagePrompt: string;
  imageGeneration: {
    isGenerating: boolean;
    error: string | null;
  };
  segments: TaskSegment[];
  transcript: Array<{
    role: 'player' | 'character' | 'system';
    label: string;
    content: string;
  }>;
  streamingReply: string;
  streamingLabel: string;
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
  imageUrl?: string;
}

export interface WorldData {
  mapImageUrl?: string;
  regions: Region[];
  scenes: Scene[];
  characters: CharacterProfile[];
}
