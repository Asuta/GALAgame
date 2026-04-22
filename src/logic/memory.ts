export interface MemoryInput {
  latestSummary: string;
  unlockedFacts: string[];
  currentGoal: string;
}

export interface MemoryResult {
  summary: string;
  facts: string[];
}

export const compressMemory = ({ latestSummary, unlockedFacts, currentGoal }: MemoryInput): MemoryResult => ({
  summary: `局势摘要：${latestSummary}`,
  facts: [...unlockedFacts, `当前目标：${currentGoal}`]
});
