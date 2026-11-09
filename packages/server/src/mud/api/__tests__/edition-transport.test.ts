/**
 * ⭐ The edition transport and pages.
 *
 * A printing freezes the text AS SET into an `edition` at
 * `<source>/editions/<hash>`: owned by the source's owner (never a caller's
 * word), idempotent by the pages (a second run of the same text is the same
 * edition), and it throws on a source that names nothing. `pagesOf` renders
 * a document as pages over the closed kind table, and answers `null` for a
 * kind that does not read as a page.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../document';
import { StuffApi } from '../stuff';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { matchesDocumentQuery } from '../../lib/document/__tests__/document-query';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

function put(path: string, owner: string, kind: string, data: Record<string, unknown>): void {
  const id = `id-${idCounter++}`;
  store.set(id, { _id: id, path, owner, kind, data });
}

beforeEach(() => {
  StuffApi.clearAll();
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(async (col: string, query: Record<string, unknown>) => {
    if (col !== 'documents') return [] as never;
    return [...store.values()].filter((d) => matchesDocumentQuery(d, query)) as never;
  });
  vi.spyOn(pm, 'save').mockImplementation(async (col: string, doc: Record<string, unknown>) => {
    const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
    if (col === 'documents') store.set(id, { ...doc, _id: id });
    return id;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const FEED = '/test/press/gazette/feed';
const GAZETTE = '/test/press/gazette';

describe('⭐ freezeEdition', () => {
  it('freezes under the source, owned by the source\'s owner, and finds the same edition twice', async () => {
    put(`${FEED}/r1`, GAZETTE, 'release', { releaseId: 'r1', headline: 'Prices up', body: 'Wheat dear.' });
    const a = await DocumentApi.freezeEdition({ source: `${FEED}/r1`, pages: ['PRICES UP'] });
    expect(a.startsWith(`${FEED}/r1/editions/`)).toBe(true);
    const ed = [...store.values()].find((d) => d.path === a)!;
    expect(ed.owner).toBe(GAZETTE);
    expect(ed.kind).toBe('edition');
    const again = await DocumentApi.freezeEdition({ source: `${FEED}/r1`, pages: ['PRICES UP'] });
    expect(again).toBe(a);
    expect([...store.values()].filter((d) => d.kind === 'edition')).toHaveLength(1);
    const misprint = await DocumentApi.freezeEdition({ source: `${FEED}/r1`, pages: ['PRICES UO'] });
    expect(misprint).not.toBe(a);
  });

  it('a register prefix prints under the owner of its records', async () => {
    put('/test/press/gazette/print-shop/warehouse-receipts/x', GAZETTE, 'warehouse-receipt', { receiptId: 'x' });
    const p = await DocumentApi.freezeEdition({ source: '/test/press/gazette/print-shop', pages: ['x'] });
    expect([...store.values()].find((d) => d.path === p)!.owner).toBe(GAZETTE);
  });

  it('throws on a source that names nothing', async () => {
    await expect(DocumentApi.freezeEdition({ source: '/nowhere', pages: ['x'] })).rejects.toThrow(TypeError);
  });

  it('⭐ an edit to the source never reaches the edition', async () => {
    put(`${FEED}/r2`, GAZETTE, 'release', { releaseId: 'r2', headline: 'Fire', body: 'At the docks.' });
    const pages = (await DocumentApi.pagesOf(`${FEED}/r2`))!.pages;
    const ed = await DocumentApi.freezeEdition({ source: `${FEED}/r2`, pages });
    const src = [...store.values()].find((d) => d.path === `${FEED}/r2`)!;
    (src.data as Record<string, unknown>).body = 'Retracted.';
    (src.data as Record<string, unknown>).retracted = true;
    expect((await DocumentApi.pagesOf(ed))!.pages[0]).toMatch(/At the docks/);
    expect((await DocumentApi.pagesOf(`${FEED}/r2`))!.pages[0]).toMatch(/Retracted/);
  });
});

describe('⭐ pagesOf', () => {
  it('renders a recipe and says what it teaches', async () => {
    put('/recipes/ink', '/trade/printing', 'recipe', {
      recipeId: 'iron-gall-ink',
      name: 'Iron-gall ink',
      inputSlots: [{ slot: 'galls' }, { slot: 'copperas' }],
    });
    const p = (await DocumentApi.pagesOf('/recipes/ink'))!;
    expect(p.pages[0]).toMatch(/IRON-GALL INK/);
    expect(p.teaches).toEqual([{ recipeId: 'iron-gall-ink', name: 'Iron-gall ink' }]);
  });

  it('an edition reads as its pages; a script does not read as a page', async () => {
    put('/home/ann/editions/k', '/home/ann', 'edition', { pages: ['one', 'two'] });
    put('/home/ann/scripts/s', '/home/ann', 'msh', { source: 'say hi' });
    expect((await DocumentApi.pagesOf('/home/ann/editions/k'))!.pages).toEqual(['one', 'two']);
    expect(await DocumentApi.pagesOf('/home/ann/scripts/s')).toBeNull();
    expect(await DocumentApi.pagesOf('/home/ann/nothing')).toBeNull();
  });

  it('a warehouse receipt says who it is delivered to', async () => {
    put('/d/warehouse-receipts/r', '/d', 'warehouse-receipt', {
      receiptId: 'r',
      what: 'a crate',
      amountKg: 20,
      terms: { bearer: true, allowancePct: 1, feeMinorPerKg: 2 },
    });
    expect((await DocumentApi.pagesOf('/d/warehouse-receipts/r'))!.pages[0]).toMatch(/BEARER/);
  });
});
