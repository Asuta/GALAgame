export type Mode = 'explore' | 'event';

export interface Region {
  id: string;
  name: string;
  sceneIds: string[];
}

export interface Scene {
  id: string;
  regionId: string;
  name: string;
  description: string;
  eventIds: string[];
}

export interface StoryEvent {
  id: string;
  title: string;
  sceneId: string;
  cast: string[];
  intro: string;
  repeatable: boolean;
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
  events: StoryEvent[];
  characters: CharacterProfile[];
}
