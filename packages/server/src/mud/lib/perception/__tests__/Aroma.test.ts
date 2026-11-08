/**
 * Aromas as documents, named by path: a pack's aroma needs no kernel edit. An
 * aroma loads from its path, learns its tree from `parent:`, takes what it leaves
 * unstated from its parent and reads at the depth a nose can name.
 */

import '../../../../test-bootstrap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aroma } from '../Aroma';
import { DocumentApi } from '../../../api/document';
import { StuffApi } from '../../../api/stuff';

const A = '/base-library/aromas/';

function docs(rows: Record<string, Record<string, unknown>>): void {
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const data = rows[path];
    return data ? ({ getKind: () => 'aroma', getData: () => data, getPath: () => path } as never) : null;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  Aroma.forgetAll();
});

describe('Aroma', () => {
  it("an aroma no kernel file names loads from its path, under someone else's", async () => {
    docs({
      [`${A}tar`]: { threshold: 0.5 },
      '/trade/forestry/aromas/pine-tar': { parent: `${A}tar` },
      '/trade/forestry/aromas/kiln-pine-tar': {
        parent: '/trade/forestry/aromas/pine-tar',
        discipline: 'silviculture',
      },
    });
    const leaf = await Aroma.ensure('/trade/forestry/aromas/kiln-pine-tar');
    expect(leaf.ancestry()).toEqual([
      `${A}tar`,
      '/trade/forestry/aromas/pine-tar',
      '/trade/forestry/aromas/kiln-pine-tar',
    ]);
    expect(leaf.aromaAt(0)).toBe(`${A}tar`);
    expect(leaf.aromaAt(99)).toBe('/trade/forestry/aromas/kiln-pine-tar');
    expect(leaf.word()).toBe('kiln-pine-tar');
    // What an aroma leaves unstated comes from its parent; the parents are read with it.
    expect(leaf.getThreshold()).toBe(0.5);
    expect(leaf.disciplineOf()).toBe('silviculture');
    expect(Aroma.resolveKnown(`${A}tar`)).not.toBeNull();
  });

  it('two packs may each ship the same word, and neither is the other', async () => {
    docs({
      [`${A}smoke`]: { threshold: 1 },
      '/trade/fuel/aromas/smoke': { threshold: 7 },
    });
    expect((await Aroma.ensure(`${A}smoke`)).getThreshold()).toBe(1);
    expect((await Aroma.ensure('/trade/fuel/aromas/smoke')).getThreshold()).toBe(7);
  });

  it('a cold read starts the load and answers null; the next read has it', async () => {
    docs({ [`${A}tar`]: {} });
    expect(Aroma.resolve(`${A}tar`)).toBeNull();
    await Aroma.settling();
    expect(Aroma.resolve(`${A}tar`)?.word()).toBe('tar');
  });

  it('a path with no document fails where it is named, naming the path', async () => {
    docs({});
    await expect(Aroma.ensure(`${A}tarr`)).rejects.toThrow(/tarr/);
    await expect(
      Aroma.resolveOdorTags([{ aroma: `${A}tarr`, strength: 1 }], 'Material.smells'),
    ).rejects.toThrow(/tarr/);
  });

  it('a document of another kind is not an aroma', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue({
      getKind: () => 'recipe',
      getData: () => ({}),
    } as never);
    await expect(Aroma.ensure(`${A}tar`)).rejects.toThrow(/no aroma document/);
  });

  it('a malformed tag fails on its shape', async () => {
    await expect(Aroma.resolveOdorTags([{ aroma: 'tar', strength: 1 }], 'x')).rejects.toThrow(/aroma path/);
    await expect(Aroma.resolveOdorTags([{ word: 'tar', strength: 1 }], 'x')).rejects.toThrow(/aroma path/);
    await expect(Aroma.resolveOdorTags([{ aroma: `${A}tar`, strength: 0 }], 'x')).rejects.toThrow(/strength/);
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

  it('reads as its word with its hyphens as spaces', () => {
    expect(Aroma.wordOf(`${A}peat-smoke`)).toBe('peat-smoke');
    expect(Aroma.phraseOf(`${A}peat-smoke`)).toBe('peat smoke');
  });
});
