import { clampStreamCharsPerSecond } from '../settings/storage';

const defaultSleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const appendStreamWithRateLimit = async ({
  source,
  getCharsPerSecond,
  onCharacter,
  sleep = defaultSleep
}: {
  source: AsyncIterable<string>;
  getCharsPerSecond: () => number;
  onCharacter: (character: string) => void;
  sleep?: (ms: number) => Promise<void>;
}): Promise<void> => {
  let hasRenderedCharacter = false;

  for await (const chunk of source) {
    for (const character of Array.from(chunk)) {
      if (hasRenderedCharacter) {
        const charsPerSecond = clampStreamCharsPerSecond(getCharsPerSecond());
        await sleep(1000 / charsPerSecond);
      }

      onCharacter(character);
      hasRenderedCharacter = true;
    }
  }
};

