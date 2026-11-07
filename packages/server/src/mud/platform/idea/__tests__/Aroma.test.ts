/**
 * Aroma words as rows: a pack's word needs no kernel edit. A row loads by path,
 * learns its tree from `extends:`, inherits its parent's fields and reads at the
 * depth a nose can name.
 */

import '../../../../test-bootstrap';
import { afterEach, describe, expect, it } from 'vitest';
import Aroma from '../Aroma';
import { seedKernelContentStore } from '../../../lib/security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';

const row = (word: string, doc: Record<string, unknown>) => ({
  path: `/stuff/idea/aroma/${word}`,
  ...doc,
});

afterEach(() => StuffApi.clearAll());

describe('Aroma', () => {
  it('a word no kernel file names loads from its row, under someone else\'s', async () => {
    seedKernelContentStore([
      row('tar', { class: '/platform/idea/Aroma', data: { threshold: 0.5 } }),
      row('pine-tar', { extends: '/stuff/idea/aroma/tar', data: {} }),
      row('kiln-pine-tar', { extends: '/stuff/idea/aroma/pine-tar', data: { discipline: 'silviculture' } }),
    ]);
    const leaf = await Aroma.ensure('kiln-pine-tar');
    expect(leaf.ancestry()).toEqual(['tar', 'pine-tar', 'kiln-pine-tar']);
    expect(leaf.wordAt(0)).toBe('tar');
    expect(leaf.wordAt(1)).toBe('pine-tar');
    expect(leaf.wordAt(99)).toBe('kiln-pine-tar');
    // Threshold inherits through the row; the parents are resident with it.
    expect(leaf.getThreshold()).toBe(0.5);
    expect(Aroma.resolve('tar')).not.toBeNull();
  });

  it('a word with no row fails where it is named, naming the word', async () => {
    seedKernelContentStore();
    await expect(Aroma.ensure('tarr')).rejects.toThrow(/tarr/);
    await expect(
      Aroma.resolveOdorTags([{ word: 'tarr', strength: 1 }], 'Material.smells'),
    ).rejects.toThrow(/tarr/);
  });

  it('a malformed tag fails on its shape', async () => {
    await expect(
      Aroma.resolveOdorTags([{ word: 'Not A Word', strength: 1 }], 'x'),
    ).rejects.toThrow(/aroma word/);
    await expect(Aroma.resolveOdorTags([{ word: 'tar', strength: 0 }], 'x')).rejects.toThrow(/strength/);
    await expect(Aroma.resolveOdorTags('tar', 'x')).rejects.toThrow(/list/);
  });

  it('reads with its hyphens as spaces', () => {
    expect(Aroma.phraseOf('peat-smoke')).toBe('peat smoke');
  });
});
