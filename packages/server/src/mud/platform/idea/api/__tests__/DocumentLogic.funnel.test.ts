/**
 * The store's one write funnel (naming overhaul A1): a kind nobody declares
 * is refused (never written and wiped at the next reset), a document the
 * kind's `fields:` refuses is refused, and a save goes live through the
 * kind's service — the recipe, archetype, help-concept, blueprint and
 * name-bank edits that never reached their readers before (defect 1).
 */

import '../../../../../test-bootstrap';
import { withSaveMany } from '../../../../lib/persistence/__tests__/pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../../../../api/document';
import { AccessApi } from '../../../../api/access';
import { StuffApi } from '../../../../api/stuff';
import { SpeciesApi } from '../../../../api/species';
import { ProvenanceApi } from '../../../../api/provenance';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Idea } from '../../../../lib/stuff/Idea';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { Refusal } from '../../../../lib/errors';
import { StoredDocument } from '../../../../lib/document/StoredDocument';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { RegistrarMixin, type Registrar } from '../../../../lib/document/Registrar';

let rows: Record<string, unknown>[];
let actor: Stuff;

function runAs<T>(fn: () => T | Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(Stuff, 'test', () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  }) as Promise<T>;
}

async function refusalOf(p: Promise<unknown>): Promise<Refusal> {
  try {
    await p;
  } catch (err) {
    if (err instanceof Refusal) return err;
    throw err;
  }
  throw new Error('expected a refusal');
}

beforeEach(() => {
  rows = [];
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(withSaveMany({
    isConnected: () => true,
    find: vi.fn(async (col: string, q: Record<string, unknown>) =>
      col === 'documents'
        ? rows.filter((d) =>
            Object.entries(q).every(([k, v]) =>
              v !== null && typeof v === 'object' && '$in' in (v as object)
                ? ((v as { $in: unknown[] }).$in).includes(d[k] ?? null)
                : d[k] === v,
            ),
          )
        : [],
    ),
    save: vi.fn(async (_c: string, doc: Record<string, unknown>) => {
      const i = rows.findIndex((r) => r._id === doc._id);
      if (i >= 0) rows[i] = { ...rows[i], ...doc };
      else rows.push({ ...doc, _id: String(rows.length + 1) });
      return String(doc._id ?? rows.length);
    }),
    findById: vi.fn(),
    delete: vi.fn(),
  }) as unknown as PersistenceManager);
  vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
  vi.spyOn(ProvenanceApi, 'recordAuthoring').mockResolvedValue(undefined as never);
  actor = makeStuffAtPath(() => new Idea(), '/platform/agent/Avatar/ann') as unknown as Stuff;
});
afterEach(() => vi.restoreAllMocks());

describe('the write funnel', () => {
  it('refuses a kind nobody declares', async () => {
    const r = await refusalOf(runAs(() => DocumentApi.save('/home/ann/x', 'sonnet', { lines: [] })));
    expect(r.reason).toBe('document-kind-undeclared');
    expect(rows).toHaveLength(0);
  });

  it("refuses a document its kind's fields refuse", async () => {
    const r = await refusalOf(runAs(() => DocumentApi.save('/home/ann/topics/x', 'topic', {})));
    expect(r.reason).toBe('invalid-document');
    expect(rows).toHaveLength(0);
  });

  it('writes the card from the declaration', async () => {
    await runAs(() => DocumentApi.save('/home/ann/concepts/tides', 'help-concept', { title: 'The Tides' }));
    expect(rows[0]).toMatchObject({ kind: 'help-concept', keys: { word: ['tides', 'the tides'] } });
  });

  it("refuses a document its kind's service refuses (an emote with no grammar)", async () => {
    const r = await refusalOf(runAs(() => DocumentApi.save('/home/ann/emotes/wave', 'emote', { searchTerms: [] })));
    expect(r.reason).toBe('invalid-document');
  });
});

describe("an edit goes live through the kind's service (defect 1)", () => {
  it('a name bank is forgotten, so the next suggest reads the edit', async () => {
    const banks = SpeciesApi.nameBanks();
    banks.remember('/home/ann/name-banks/x', banks.parse({ given: ['Old'] }, '/home/ann/name-banks/x'));
    await runAs(() => DocumentApi.save('/home/ann/name-banks/x', 'name-bank', { given: ['New'] }));
    expect(banks.peek('/home/ann/name-banks/x')).toBeNull();
  });

  for (const [kind, by] of [
    ['recipe', '/platform/idea/RecipeCatalogue'],
    ['archetype', '/platform/idea/ArchetypeCatalogue'],
    ['help-concept', '/platform/idea/HelpCatalogue'],
    ['blueprint', '/platform/idea/BlueprintCatalogue'],
  ] as const) {
    it(`a ${kind} save calls its resident catalogue's forget`, async () => {
      const forget = vi.fn(async () => undefined);
      const parse = vi.fn(() => undefined);
      const real = StuffApi.findByTemplatePath;
      vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) =>
        p === by ? ({ forget, parse } as unknown as Stuff) : real.call(StuffApi, p)) as typeof StuffApi.findByTemplatePath);
      const data = kind === 'help-concept' ? { title: 'T' } : { name: 'n' };
      await runAs(() => DocumentApi.save(`/home/ann/${kind}s/x`, kind, data));
      expect(parse).toHaveBeenCalled();
      expect(forget).toHaveBeenCalledWith([`/home/ann/${kind}s/x`]);
    });
  }
});

describe('filed records, ledgers and secret kinds (A2)', () => {
  it('a plain save over a filed kind refuses, naming its transport', async () => {
    const r = await refusalOf(runAs(() => DocumentApi.save('/trade/ranching/herds/h1', 'herd', { name: 'Bess' })));
    expect(r.reason).toBe('document-filed');
    expect(r.facts).toMatchObject({ kind: 'herd', transport: 'register' });
  });

  it("a bore log only grows: an append lands, a rewrite refuses", async () => {
    const register = makeStuffAtPath(() => new (RegistrarMixin(Idea))(), '/trade/drilling/idea/BoreRegistry') as unknown as Stuff & Registrar;
    (register as unknown as { setRegisterPrefix(v: string): void }).setRegisterPrefix('/trade/drilling/bores');
    (register as unknown as { setRegisterOwner(v: string): void }).setRegisterOwner('/trade/drilling');
    (register as unknown as { setRegisterKind(v: string): void }).setRegisterKind('bore');
    const path = '/trade/drilling/bores/b1';
    const call = (lines: unknown[]): Promise<void> =>
      ExecutionContextApi.runRoot(register as unknown as Stuff, 'test', () =>
        DocumentApi.saveToRegister(register, path, { wellhead: 'w', claim: 'c', since: 0, lines }),
      ) as Promise<void>;
    await call([{ depthM: 1 }]);
    await call([{ depthM: 1 }, { depthM: 2 }]);
    expect((rows[0]!.data as { lines: unknown[] }).lines).toHaveLength(2);
    const err = await call([{ depthM: 9 }]).then(() => null, (e: unknown) => e);
    expect((err as Refusal).reason).toBe('ledger-altered');
  });

  it('a secret kind is never listed', async () => {
    const doc = (path: string, kind: string): StoredDocument => {
      const d = new StoredDocument();
      d.path = path;
      d.kind = kind;
      return d;
    };
    rows.push({ _id: 't', path: '/platform/stream-tokens/abc', kind: 'stream-token', owner: '/platform/stream-tokens', data: {} });
    // The subtree scan is a range query the fake store does not serve.
    vi.spyOn(StoredDocument, 'find').mockResolvedValueOnce([
      doc('/platform/stream-tokens/abc', 'stream-token'),
      doc('/platform/stream-tokens/note', 'help-concept'),
    ]);
    const listed = await DocumentApi.list('/platform/stream-tokens');
    expect(listed.map((d) => d.getPath())).toEqual(['/platform/stream-tokens/note']);
    expect((await DocumentApi.read('/platform/stream-tokens/abc'))?.getKind()).toBe('stream-token');
  });

  it('turning `unique` on over two documents sharing a word refuses, naming both', async () => {
    rows.push({ _id: 'f1', path: '/a/forms/brick', kind: 'form', owner: '/a', data: {} });
    rows.push({ _id: 'f2', path: '/b/forms/brick', kind: 'form', owner: '/b', data: {} });
    const r = await refusalOf(
      runAs(() => DocumentApi.save('/platform/kinds/form', 'kind', { title: 'Form', traits: { keyworded: { unique: true } } })),
    );
    expect(r.reason).toBe('kind-in-use');
    expect(String(r.facts.why)).toMatch(/\/a\/forms\/brick.*\/b\/forms\/brick/);
  });

  it("a declaration with filed documents of its kind cannot be removed", async () => {
    rows.push({ _id: 'k', path: '/trade/ranching/kinds/herd', kind: 'kind', owner: '/trade/ranching', data: { traits: {} } });
    rows.push({ _id: 'h', path: '/trade/ranching/herds/h1', kind: 'herd', owner: '/trade/ranching', data: {} });
    const r = await refusalOf(runAs(() => DocumentApi.delete('/trade/ranching/kinds/herd')));
    expect(r.reason).toBe('kind-in-use');
  });
});

describe('every document prints (A3)', () => {
  it('an instrument reads as pages over its real fields, history included', async () => {
    rows.push({
      _id: 'i', path: '/home/ann/papers/c1', kind: 'instrument', owner: '/home/ann',
      data: { face: 'A NOTE of 10 crowns.', history: ['Day 1: issued.', 'Day 2: paid 2.'] },
    });
    const pages = await DocumentApi.pagesOf('/home/ann/papers/c1');
    expect(pages?.pages[0]).toContain('A NOTE of 10 crowns.');
    expect(pages?.pages[0]).toContain('Day 2: paid 2.');
  });

  it('a register entry prints one line: its title and its date in game time', async () => {
    rows.push({
      _id: 's', path: '/platform/ships/hesper', kind: 'ship', owner: '/platform',
      data: { name: 'Hesper', registeredAtS: 86_400 * 31 + 3600 },
    });
    const pages = await DocumentApi.pagesOf('/platform/ships/hesper');
    expect(pages?.title).toBe('Hesper');
    expect(pages?.pages).toEqual(['Hesper — Fourday, 2 Teliminus 1 01:00']);
  });

  it('a release reads with its masthead; a secret kind never prints', async () => {
    rows.push({
      _id: 'r', path: '/compact/press/releases/r1', kind: 'release', owner: '/compact/the-gazette',
      data: { headline: 'Bridge opens', body: 'At dawn.', publishedAtS: 0 },
    });
    const pages = await DocumentApi.pagesOf('/compact/press/releases/r1');
    expect(pages?.pages[0]).toBe('THE GAZETTE\n\nBridge opens\n\nAt dawn.');
    rows.push({ _id: 't', path: '/platform/stream-tokens/x', kind: 'stream-token', owner: '/platform', data: {} });
    expect(await DocumentApi.pagesOf('/platform/stream-tokens/x')).toBeNull();
  });

  it('a unique word is refused for a second document', async () => {
    const other = new StoredDocument();
    other.path = '/a/emotes/wave';
    other.kind = 'emote';
    // The card read is a `keys.word` query the fake store does not serve.
    const real = StoredDocument.find.bind(StoredDocument);
    vi.spyOn(StoredDocument, 'find').mockImplementation((async (q: Record<string, unknown>) =>
      'keys.word' in q ? [other] : real(q)) as typeof StoredDocument.find);
    const r = await refusalOf(
      runAs(() => DocumentApi.save('/home/ann/emotes/wave', 'emote', { grammar: { template: '$n waves.' } })),
    );
    expect(r.reason).toBe('invalid-document');
    expect(String(r.facts.why)).toMatch(/already names \/a\/emotes\/wave/);
  });
});
