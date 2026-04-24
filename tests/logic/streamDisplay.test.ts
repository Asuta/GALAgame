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

  it('reveals the remaining text immediately after stream skipping is requested', async () => {
    const rendered: string[] = [];
    const sleep = vi.fn(async (_ms: number) => {});
    let shouldSkip = false;

    await appendStreamWithRateLimit({
      source: createSource(['你好世界']),
      getCharsPerSecond: () => 1,
      shouldSkipRateLimit: () => shouldSkip,
      onCharacter: (character) => {
        rendered.push(character);
        if (character === '好') {
          shouldSkip = true;
        }
      },
      sleep
    });

    expect(rendered).toEqual(['你', '好', '世', '界']);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
