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
import { PerceptionApi } from '../../../api/perception';

const A = '/base-library/aromas/';

function docs(rows: Record<string, Record<string, unknown>>): void {
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const data = rows[path];
    return data ? ({ getKind: () => 'aroma', getData: () => data, getPath: () => path } as never) : null;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  PerceptionApi.aromas().forgetAll();
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
    const leaf = await PerceptionApi.aromas().ensure('/trade/forestry/aromas/kiln-pine-tar');
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
    expect(PerceptionApi.aromas().resolveKnown(`${A}tar`)).not.toBeNull();
  });

  it('⭐ the folder is the tree: a child in its parent\'s directory takes it as parent (D14)', async () => {
    docs({
      [`${A}fruit`]: { threshold: 2, discipline: 'tasting' },
      [`${A}fruit/citrus`]: {},
      [`${A}fruit/citrus/lemon`]: { threshold: 0.2 },
    });
    const lemon = await PerceptionApi.aromas().ensure(`${A}fruit/citrus/lemon`);
    expect(lemon.ancestry()).toEqual([`${A}fruit`, `${A}fruit/citrus`, `${A}fruit/citrus/lemon`]);
    expect(lemon.word()).toBe('lemon');
    expect(lemon.getThreshold()).toBe(0.2);
    expect(lemon.disciplineOf()).toBe('tasting');
    // A root directly under aromas/ has none.
    expect(PerceptionApi.aromas().folderParentOf(`${A}fruit`)).toBeNull();
  });

  it('two packs may each ship the same word, and neither is the other', async () => {
    docs({
      [`${A}smoke`]: { threshold: 1 },
      '/trade/fuel/aromas/smoke': { threshold: 7 },
    });
    expect((await PerceptionApi.aromas().ensure(`${A}smoke`)).getThreshold()).toBe(1);
    expect((await PerceptionApi.aromas().ensure('/trade/fuel/aromas/smoke')).getThreshold()).toBe(7);
  });

  it('a cold read starts the load and answers null; the next read has it', async () => {
    docs({ [`${A}tar`]: {} });
    expect(PerceptionApi.aromas().resolve(`${A}tar`)).toBeNull();
    await PerceptionApi.aromas().settling();
    expect(PerceptionApi.aromas().resolve(`${A}tar`)?.word()).toBe('tar');
  });

  it('a path with no document fails where it is named, naming the path', async () => {
    docs({});
    await expect(PerceptionApi.aromas().ensure(`${A}tarr`)).rejects.toThrow(/tarr/);
    await expect(
      PerceptionApi.aromas().resolveOdorTags([{ aroma: `${A}tarr`, strength: 1 }], 'Material.smells'),
    ).rejects.toThrow(/tarr/);
  });

  it('a document of another kind is not an aroma', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue({
      getKind: () => 'recipe',
      getData: () => ({}),
    } as never);
    await expect(PerceptionApi.aromas().ensure(`${A}tar`)).rejects.toThrow(/no aroma document/);
  });

  it('a malformed tag fails on its shape', async () => {
    await expect(PerceptionApi.aromas().resolveOdorTags([{ aroma: 'tar', strength: 1 }], 'x')).rejects.toThrow(/aroma path/);
    await expect(PerceptionApi.aromas().resolveOdorTags([{ word: 'tar', strength: 1 }], 'x')).rejects.toThrow(/aroma path/);
    await expect(PerceptionApi.aromas().resolveOdorTags([{ aroma: `${A}tar`, strength: 0 }], 'x')).rejects.toThrow(/strength/);
    await expect(PerceptionApi.aromas().resolveOdorTags('tar', 'x')).rejects.toThrow(/list/);
  });

  it('a row that fails to load twice is never left to reject unheard', async () => {
    const rejected: unknown[] = [];
    const onRejection = (reason: unknown) => rejected.push(reason);
    process.on('unhandledRejection', onRejection);
    vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('Template not found: /x/dust'));
    PerceptionApi.aromas().loadRow('/x/dust');
    PerceptionApi.aromas().loadRow('/x/dust');
    await PerceptionApi.aromas().settling();
    await new Promise((r) => setTimeout(r, 10));
    process.off('unhandledRejection', onRejection);
    expect(rejected).toEqual([]);
    expect(StuffApi.singleton).toHaveBeenCalledTimes(1);
  });

  it('reads as its word with its hyphens as spaces', () => {
    expect(PerceptionApi.aromas().wordOf(`${A}peat-smoke`)).toBe('peat-smoke');
    expect(PerceptionApi.aromas().phraseOf(`${A}peat-smoke`)).toBe('peat smoke');
  });
});
