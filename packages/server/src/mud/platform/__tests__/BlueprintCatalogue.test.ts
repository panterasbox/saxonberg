/**
 * BlueprintCatalogue — the runtime blueprint index singleton over two
 * layers (content-packs wave 2, D10): `rebuild()` regenerates the derived
 * skeleton (one concrete row per distinct backing class, deduped on
 * signature, drift-safe on id, orphans reaped, the `deleteMany` line
 * once); `warm()` indexes the derived rows AND the curated
 * `documents {kind: blueprint}` overlay — blessing a derived row in
 * place by signature (a save that fires once, not on the second warm),
 * or holding a pure-composition curated blueprint in memory with no
 * `blueprints` row. Plus the id / signature resolves and `upsert`.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BlueprintCatalogue from '../idea/BlueprintCatalogue';
import { Blueprint } from '../../lib/studio/Blueprint';
import { DocumentApi } from '../../api/document';
import { TemplateApi } from '../../api/template';
import { StuffApi } from '../../api/stuff';
import { StoredDocument } from '../../lib/document/StoredDocument';
import { Idea } from '../../lib/stuff/Idea';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';

// Alpha and Beta share a base + mixin set (collide to one signature);
// Gamma and Delta each have a distinct signature.
class Alpha extends NamedMixin(Idea) {}
class Beta extends NamedMixin(Idea) {}
class Gamma extends VisibleMixin(NamedMixin(Idea)) {}
class Delta extends VisibleMixin(Idea) {}

function makeBlueprint(blueprintId: string, signature: string, name: string): Blueprint {
  const bp = new Blueprint();
  bp.blueprintId = blueprintId;
  bp.signature = signature;
  bp.name = name;
  bp.baseClass = 'Idea';
  bp.mixinNames = signature.split('|')[1]?.split(',').filter(Boolean) ?? [];
  return bp;
}

function curated(data: Record<string, unknown>): StoredDocument {
  const d = new StoredDocument();
  d.path = `/platform/blueprints/${String(data.blueprintId)}`;
  d.kind = 'blueprint';
  d.data = data;
  return d;
}

/** An in-memory `blueprints` collection: `Blueprint.find`/save/delete. */
function stubRows(initial: Blueprint[] = []): { rows: Blueprint[]; saves: number } {
  const state = { rows: [...initial], saves: 0 };
  vi.spyOn(Blueprint, 'find').mockImplementation(async () => state.rows.map((r) => r) as never);
  vi.spyOn(Blueprint.prototype, 'save').mockImplementation(async function (this: Blueprint) {
    state.saves++;
    if (!state.rows.includes(this)) state.rows.push(this);
  });
  vi.spyOn(Blueprint.prototype, 'delete').mockImplementation(async function (this: Blueprint) {
    state.rows = state.rows.filter((r) => r !== this);
  });
  return state;
}

function stubClasses(ctors: Record<string, unknown>): void {
  vi.spyOn(TemplateApi, 'distinctClasses').mockResolvedValue(Object.keys(ctors));
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (p: string) => {
    const ctor = ctors[p];
    if (!ctor) throw new Error(`no stub class at ${p}`);
    return ctor as never;
  });
}

let catalogue: BlueprintCatalogue;

beforeEach(() => {
  catalogue = Object.create(BlueprintCatalogue.prototype) as BlueprintCatalogue;
  vi.spyOn(DocumentApi, 'listOfKind').mockResolvedValue([]);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('BlueprintCatalogue.rebuild — the derived skeleton', () => {
  it('derives one concrete row per distinct backing class, deduped on signature', async () => {
    const state = stubRows();
    stubClasses({ '/x/Alpha': Alpha, '/x/Beta': Beta, '/x/Gamma': Gamma, '/x/Delta': Delta });
    const r = await catalogue.rebuild();
    expect(r.inserted).toBe(3);
    expect(state.rows).toHaveLength(3);
    expect(new Set(state.rows.map((b) => b.signature)).size).toBe(3);
    for (const b of state.rows) {
      expect(b.kind).toBe('concrete');
      expect(b.blessed).toBe(false);
    }
    // Second rebuild: nothing inserted.
    expect((await catalogue.rebuild()).inserted).toBe(0);
  });

  it('skips a drifted id (same blueprintId, new signature) rather than colliding', async () => {
    const stale = makeBlueprint('bp-x-gamma', 'Idea|OldMixin', 'Gamma');
    stale.kind = 'concrete';
    stale.classPath = '/x/Gamma';
    const state = stubRows([stale]);
    stubClasses({ '/x/Gamma': Gamma });
    const r = await catalogue.rebuild();
    expect(r.inserted).toBe(0);
    expect(state.rows).toHaveLength(1);
  });

  it('reaps an unresolvable derived row, never a blessed one, and logs the deleteMany once', async () => {
    const orphan = makeBlueprint('bp-gone', 'Idea|X', 'Gone');
    orphan.kind = 'concrete';
    orphan.classPath = '/x/Gone';
    const blessedOrphan = makeBlueprint('bp-kept', 'Idea|Y', 'Kept');
    blessedOrphan.kind = 'concrete';
    blessedOrphan.classPath = '/x/AlsoGone';
    blessedOrphan.blessed = true;
    const state = stubRows([orphan, blessedOrphan]);
    stubClasses({});
    const r = await catalogue.rebuild();
    expect(r.reaped).toBe(1);
    expect(state.rows).toEqual([blessedOrphan]);
    const lines = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => String(c[0]))
      .filter((l) => l.includes('deleteMany'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('/x/Gone');
  });
});

describe('BlueprintCatalogue.warm — the curated overlay', () => {
  it('indexes derived blueprints by id and signature', async () => {
    stubRows([makeBlueprint('bp-a', 'Thing|BulkableMixin', 'A'), makeBlueprint('bp-b', 'Idea|', 'B')]);
    await catalogue.warm();
    expect(catalogue.getBlueprint('bp-a')?.getName()).toBe('A');
    expect(catalogue.findBySignature('Thing|BulkableMixin')?.getBlueprintId()).toBe('bp-a');
    expect(catalogue.allBlueprints()).toHaveLength(2);
    expect(catalogue.knows('bp-b')).toBe(true);
  });

  it('blesses a derived row in place from a curated document by classPath signature — once', async () => {
    const derived = makeBlueprint('bp-x-gamma', Blueprint.signatureOf(Gamma), 'Gamma');
    derived.kind = 'concrete';
    derived.classPath = '/x/Gamma';
    const state = stubRows([derived]);
    stubClasses({ '/x/Gamma': Gamma });
    vi.spyOn(DocumentApi, 'listOfKind').mockResolvedValue([
      curated({ blueprintId: 'gamma', name: 'The Gamma', kind: 'concrete', baseClass: 'Idea', classPath: '/x/Gamma', parent: 'things', description: 'x' }),
    ]);
    await catalogue.warm();
    expect(state.saves).toBe(1);
    const bp = catalogue.findBySignature(Blueprint.signatureOf(Gamma))!;
    expect(bp).toBe(derived);
    expect(bp.getName()).toBe('The Gamma');
    expect(bp.isBlessed()).toBe(true);
    expect(bp.getParent()).toBe('things');
    // The curated id is not a second entry: the derived row keeps its id.
    expect(catalogue.getBlueprint('gamma')).toBeNull();
    // Second warm: nothing drifted, no save.
    await catalogue.warm();
    expect(state.saves).toBe(1);
  });

  it('a pure-composition curated document resolves by id and signature without a blueprints row', async () => {
    const state = stubRows();
    vi.spyOn(DocumentApi, 'listOfKind').mockResolvedValue([
      curated({ blueprintId: 'lit', name: 'Lit Thing', kind: 'composition', baseClass: 'Thing', mixinNames: ['VisibleMixin', 'NamedMixin'] }),
    ]);
    await catalogue.warm();
    expect(state.rows).toHaveLength(0);
    expect(state.saves).toBe(0);
    const bp = catalogue.getBlueprint('lit')!;
    expect(bp.getSignature()).toBe(Blueprint.signatureFromParts('Thing', ['NamedMixin', 'VisibleMixin']));
    expect(catalogue.findBySignature(bp.getSignature())).toBe(bp);
    expect(bp.isBlessed()).toBe(true);
  });

  it('returns null for unknown id / signature before warm', () => {
    expect(catalogue.getBlueprint('nope')).toBeNull();
    expect(catalogue.findBySignature('nope')).toBeNull();
  });

  it('upsert folds a fresh blueprint into both indexes', async () => {
    stubRows();
    await catalogue.warm();
    const bp = makeBlueprint('bp-new', 'Idea|VisibleMixin', 'New');
    catalogue.upsert(bp);
    expect(catalogue.getBlueprint('bp-new')).toBe(bp);
    expect(catalogue.findBySignature('Idea|VisibleMixin')).toBe(bp);
  });
});

describe('BlueprintCatalogue lifecycle refusals', () => {
  it('refuses eviction and destruction (system singleton)', () => {
    expect(catalogue.canEvict({} as never).ok).toBe(false);
    expect(catalogue.canDestruct().ok).toBe(false);
  });
});
