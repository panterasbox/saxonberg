/**
 * Aroma words as documents: a pack's word needs no kernel edit. A word loads from
 * `/aromas/<word>`, learns its tree from `parent:`, takes what it leaves unstated
 * from its parent and reads at the depth a nose can name.
 */

import '../../../../test-bootstrap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aroma } from '../Aroma';
import { DocumentApi } from '../../../api/document';
import { StuffApi } from '../../../api/stuff';

function docs(rows: Record<string, Record<string, unknown>>): void {
  vi.spyOn(DocumentApi, 'readByKey').mockImplementation(async (_kind: string, word: string) => {
    const data = rows[word];
    return data
      ? ({ getKind: () => 'aroma', getData: () => ({ word, ...data }), getPath: () => `/base-library/aromas/${word}` } as never)
      : null;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  Aroma.forgetAll();
});

describe('Aroma', () => {
  it("a word no kernel file names loads from its document, under someone else's", async () => {
    docs({
      tar: { threshold: 0.5 },
      'pine-tar': { parent: 'tar' },
      'kiln-pine-tar': { parent: 'pine-tar', discipline: 'silviculture' },
    });
    const leaf = await Aroma.ensure('kiln-pine-tar');
    expect(leaf.ancestry()).toEqual(['tar', 'pine-tar', 'kiln-pine-tar']);
    expect(leaf.wordAt(0)).toBe('tar');
    expect(leaf.wordAt(1)).toBe('pine-tar');
    expect(leaf.wordAt(99)).toBe('kiln-pine-tar');
    // What a word leaves unstated comes from its parent; the parents are read with it.
    expect(leaf.getThreshold()).toBe(0.5);
    expect(leaf.disciplineOf()).toBe('silviculture');
    expect(Aroma.resolveKnown('tar')).not.toBeNull();
  });

  it('a cold read starts the load and answers null; the next read has it', async () => {
    docs({ tar: {} });
    expect(Aroma.resolve('tar')).toBeNull();
    await Aroma.settling();
    expect(Aroma.resolve('tar')?.word()).toBe('tar');
  });

  it('a word with no document fails where it is named, naming the word', async () => {
    docs({});
    await expect(Aroma.ensure('tarr')).rejects.toThrow(/tarr/);
    await expect(
      Aroma.resolveOdorTags([{ word: 'tarr', strength: 1 }], 'Material.smells'),
    ).rejects.toThrow(/tarr/);
  });

  it('a document of another kind is not a word', async () => {
    vi.spyOn(DocumentApi, 'readByKey').mockResolvedValue({
      getKind: () => 'recipe',
      getData: () => ({}),
    } as never);
    await expect(Aroma.ensure('tar')).rejects.toThrow(/no aroma document/);
  });

  it('a malformed tag fails on its shape', async () => {
    await expect(Aroma.resolveOdorTags([{ word: 'Not A Word', strength: 1 }], 'x')).rejects.toThrow(/aroma word/);
    await expect(Aroma.resolveOdorTags([{ word: 'tar', strength: 0 }], 'x')).rejects.toThrow(/strength/);
    await expect(Aroma.resolveOdorTags('tar', 'x')).rejects.toThrow(/list/);
  });

  it('a row that fails to load twice is never left to reject unheard', async () => {
    const rejected: unknown[] = [];
    const onRejection = (reason: unknown) => rejected.push(reason);
    process.on('unhandledRejection', onRejection);
    vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('Template not found: /x/dust'));
    Aroma.loadRow('/x/dust');
    Aroma.loadRow('/x/dust');
    await Aroma.settling();
    await new Promise((r) => setTimeout(r, 10));
    process.off('unhandledRejection', onRejection);
    expect(rejected).toEqual([]);
    expect(StuffApi.singleton).toHaveBeenCalledTimes(1);
  });

  it('reads with its hyphens as spaces', () => {
    expect(Aroma.phraseOf('peat-smoke')).toBe('peat smoke');
  });
});
