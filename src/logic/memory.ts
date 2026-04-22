import type { GeneratedEvent } from '../data/types';

export interface MemoryInput {
  latestSummary: string;
  unlockedFacts: string[];
  currentGoal: string;
}

export interface EventMemoryInput {
  event: GeneratedEvent;
  transcript: string[];
  memoryFacts: string[];
}

export interface PlayerSceneSummaryInput {
  event: GeneratedEvent;
  transcript: string[];
  settlementSummary: string;
}

export interface MemoryResult {
  summary: string;
  facts: string[];
}

export const compressMemory = ({ latestSummary, unlockedFacts, currentGoal }: MemoryInput): MemoryResult => ({
  summary: `局势摘要：${latestSummary}`,
  facts: [...unlockedFacts, `当前目标：${currentGoal}`]
});

export const summarizeResolvedEvent = ({ event, transcript, memoryFacts }: EventMemoryInput): MemoryResult => {
  const transcriptTail = transcript.slice(-2).join(' ');
  const summary = `你在${event.locationLabel}经历了【${event.title}】。${event.resolutionDirection}${transcriptTail ? ` 最近的余波是：${transcriptTail}` : ''}`;

  return {
    summary,
    facts: Array.from(
      new Set([
        ...memoryFacts,
        ...event.facts,
        `你在${event.locationLabel}卷入了一段新的事件`,
        ...event.suspenseThreads.map((thread) => `悬念：${thread}`)
      ])
    )
  };
};

export const buildPlayerFacingSceneSummary = ({
  event,
  transcript,
  settlementSummary
}: PlayerSceneSummaryInput): string => {
  const latestExchange = transcript
    .slice(-2)
    .map((line) => line.replace(/^[^：]+：/, '').trim())
    .filter(Boolean)
    .join(' ');

  const recap = latestExchange ? `最后只留下${latestExchange}` : '这件事暂时落下了帷幕';
  return `刚才在${event.locationLabel}，关于“${event.title}”的这一幕先告一段落。${recap}。${settlementSummary}`;
};
