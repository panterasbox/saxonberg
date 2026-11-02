/** Share — a fraction of a tract in a farmer's words (tracts build D29). */
import { describe, it, expect } from 'vitest';
import { Share } from '../Share';

describe('Share — the words a farmer says a fraction in', () => {
  it.each([
    ['a third', 1 / 3],
    ['a third of it', 1 / 3],
    ['two-thirds', 2 / 3],
    ['two thirds of it', 2 / 3],
    ['half', 1 / 2],
    ['a quarter', 1 / 4],
    ['three-quarters', 3 / 4],
    ['a fifth', 1 / 5],
    ['all of it', 1],
    ['40%', 0.4],
    ['0.4', 0.4],
    ['1/3', 1 / 3],
  ])('%s', (words, want) => {
    const share = new Share(words);
    expect(share.isRest()).toBe(false);
    expect(share.fraction()).toBeCloseTo(want, 6);
  });

  it('nothing, or the rest, is what is left', () => {
    for (const words of [undefined, '', 'the rest', 'rest', 'the rest of it']) {
      const share = new Share(words);
      expect(share.isRest()).toBe(true);
      expect(share.fraction()).toBeNull();
      expect(share.isReadable()).toBe(true);
    }
  });

  it('more than the whole, nothing, or nonsense is not a share', () => {
    for (const words of ['150%', '0', 'a lot', 'five thirds']) {
      expect(new Share(words).isReadable()).toBe(false);
    }
  });
});
