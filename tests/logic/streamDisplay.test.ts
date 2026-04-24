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

  it('reveals only the requested boosted characters before returning to the speed limit', async () => {
    const rendered: string[] = [];
    const sleep = vi.fn(async (_ms: number) => {});
    let boostedCharacters = 0;

    await appendStreamWithRateLimit({
      source: createSource(['你好世界呀']),
      getCharsPerSecond: () => 1,
      shouldSkipRateLimit: () => {
        if (boostedCharacters <= 0) {
          return false;
        }

        boostedCharacters -= 1;
        return true;
      },
      onCharacter: (character) => {
        rendered.push(character);
        if (character === '好') {
          boostedCharacters = 2;
        }
      },
      sleep
    });

    expect(rendered).toEqual(['你', '好', '世', '界', '呀']);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
