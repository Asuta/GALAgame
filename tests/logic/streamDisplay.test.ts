import { describe, expect, it, vi } from 'vitest';
import { appendStreamWithRateLimit } from '../../src/logic/streamDisplay';

async function* createSource(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe('appendStreamWithRateLimit', () => {
  it('reveals stream text one character at a time using the configured speed limit', async () => {
    const rendered: string[] = [];
    const sleep = vi.fn(async (_ms: number) => {});

    await appendStreamWithRateLimit({
      source: createSource(['你好']),
      getCharsPerSecond: () => 1,
      onCharacter: (character) => {
        rendered.push(character);
      },
      sleep
    });

    expect(rendered).toEqual(['你', '好']);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
