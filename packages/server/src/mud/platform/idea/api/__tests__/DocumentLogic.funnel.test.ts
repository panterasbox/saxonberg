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
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

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
      col === 'documents' ? rows.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)) : [],
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
