import { describe, expect, it } from 'vitest';
import { compressMemory } from '../../src/logic/memory';

describe('compressMemory', () => {
  it('returns summary and key facts for romance progression', () => {
    const result = compressMemory({
      latestSummary: '你在雨天的咖啡店再次见到了林澄，你们的语气比之前柔和得多。',
      unlockedFacts: ['你已经正式认识林澄', '她最近经常去医院'],
      currentGoal: '找机会问出她隐瞒的原因'
    });

    expect(result.summary).toContain('林澄');
    expect(result.facts).toContain('当前目标：找机会问出她隐瞒的原因');
  });
});
