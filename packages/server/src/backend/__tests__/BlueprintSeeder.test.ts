/**
 * BlueprintSeeder — the derived-skeleton + curated-overlay populate pass.
 *
 * PersistenceManager is stubbed with a hand-built in-memory `blueprints`
 * store (the `Document.test` / `RecipeSeeder` pattern); the distinct backing
 * `class` scan is a fake `getCollection(Domain).distinct`, and
 * `StuffApi.loadClassByPath` maps stub class paths to real mixin
 * compositions so the signatures are computed for real. No Mongo.
 *
 * The overlay is skipped (a nonexistent `seedPath`) so these tests isolate
 * the derive layer's three properties: skeleton coverage, signature dedup,
 * and idempotency.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BlueprintSeeder } from '../BlueprintSeeder';
import { PersistenceManager, Collections } from '../PersistenceManager';
import { StuffApi } from '../../mud/api/stuff';
import { Idea } from '../../mud/lib/stuff/Idea';
import { NamedMixin } from '../../mud/lib/description/Named';
import { VisibleMixin } from '../../mud/lib/description/Visible';

// Three real compositions. Alpha and Beta share a base + mixin set (collide
// to one signature); Gamma and Delta each have a distinct signature.
class Alpha extends NamedMixin(Idea) {}
class Beta extends NamedMixin(Idea) {}
class Gamma extends VisibleMixin(NamedMixin(Idea)) {}
class Delta extends VisibleMixin(Idea) {}

const NO_OVERLAY = { seedPath: '/nonexistent/blueprints.yaml' };

/** An in-memory `blueprints` collection behind the PM stub. */
function stubStore(classPaths: string[], ctors: Record<string, unknown>) {
  const rows: Record<string, unknown>[] = [];
  const pm = PersistenceManager.get();
  let seq = 0;

  vi.spyOn(pm, 'find').mockImplementation(async (collection) => {
    if (collection === Collections.Blueprints) return rows.map((r) => ({ ...r }));
    return [];
  });
  // Faithful to real Mongo identity: a save with an `_id` updates that row
  // in place; a save without one is an INSERT that models the unique
  // `blueprintId` index — throwing E11000 on a duplicate id (the live boot
  // crash). So a curated blueprint whose signature drifted must be
  // reconciled by _id, not re-inserted.
  vi.spyOn(pm, 'save').mockImplementation(async (collection, doc) => {
    if (collection !== Collections.Blueprints) return `id-${++seq}`;
    const d = doc as Record<string, unknown>;
    if (d._id) {
      const idx = rows.findIndex((r) => r._id === d._id);
      if (idx >= 0) {
        rows[idx] = { ...d };
        return String(d._id);
      }
    }
    if (rows.some((r) => r.blueprintId === d.blueprintId)) {
      throw new Error(
        'E11000 duplicate key error collection: blueprints ' +
          `index: blueprintId_1 dup key: { blueprintId: "${String(d.blueprintId)}" }`
      );
    }
    const _id = `oid-${++seq}`;
    rows.push({ ...d, _id });
    return _id;
  });
  vi.spyOn(pm, 'getCollection').mockReturnValue({
    distinct: async () => classPaths,
  } as never);
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (p) => {
    const ctor = ctors[p];
    if (!ctor) throw new Error(`no stub class at ${p}`);
    return ctor;
  });

  return { rows };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlueprintSeeder — skeleton coverage', () => {
  it('derives one structural entry per distinct backing class', async () => {
    const { rows } = stubStore(['/x/Alpha', '/x/Gamma', '/x/Delta'], {
      '/x/Alpha': Alpha,
      '/x/Gamma': Gamma,
      '/x/Delta': Delta,
    });

    const inserted = await BlueprintSeeder.run(NO_OVERLAY);

    expect(inserted).toBe(3);
    expect(rows).toHaveLength(3);
    const signatures = rows.map((r) => r.signature);
    expect(new Set(signatures).size).toBe(3);
    // Every derived row is a concrete kind pointing at its class path.
    for (const r of rows) {
      expect(r.kind).toBe('concrete');
      expect(typeof r.classPath).toBe('string');
      expect(r.blessed).toBe(false);
    }
  });
});

describe('BlueprintSeeder — signature dedup', () => {
  it('collides two class paths with the same base+mixins to one blueprint', async () => {
    const { rows } = stubStore(['/x/Alpha', '/x/Beta', '/x/Gamma'], {
      '/x/Alpha': Alpha,
      '/x/Beta': Beta,
      '/x/Gamma': Gamma,
    });

    const inserted = await BlueprintSeeder.run(NO_OVERLAY);

    // Alpha + Beta share signature 'Idea|NamedMixin' → one blueprint; Gamma
    // has its own → two total, not three.
    expect(inserted).toBe(2);
    expect(rows).toHaveLength(2);
    const namedRows = rows.filter((r) => r.signature === 'Idea|NamedMixin');
    expect(namedRows).toHaveLength(1);
  });
});

describe('BlueprintSeeder — idempotency', () => {
  it('inserts nothing on a second run', async () => {
    stubStore(['/x/Alpha', '/x/Gamma'], {
      '/x/Alpha': Alpha,
      '/x/Gamma': Gamma,
    });

    const first = await BlueprintSeeder.run(NO_OVERLAY);
    expect(first).toBe(2);

    const second = await BlueprintSeeder.run(NO_OVERLAY);
    expect(second).toBe(0);
  });

  it('does not collide on blueprintId when a class signature drifts', async () => {
    // A class's structure can change between deploys (e.g. Avatar gaining a
    // mixin). Its derived `blueprintId` is stable (from the class path) but
    // its signature is new — so signature-dedup alone would try to insert a
    // second row under the same unique `blueprintId` (the E11000 boot crash
    // caught live). The id-dedup must skip it.
    const ctors: Record<string, unknown> = { '/x/Foo': Alpha };
    const { rows } = stubStore(['/x/Foo'], ctors);

    expect(await BlueprintSeeder.run(NO_OVERLAY)).toBe(1);
    expect(rows).toHaveLength(1);

    // The class at /x/Foo gained a mixin: same blueprintId, new signature.
    ctors['/x/Foo'] = Gamma;
    expect(await BlueprintSeeder.run(NO_OVERLAY)).toBe(0);
    expect(rows).toHaveLength(1); // no duplicate-id row inserted
  });
});

describe('BlueprintSeeder — curated overlay drift', () => {
  it('reconciles a curated blueprint in place when its signature drifts (no E11000)', async () => {
    // The exact live boot crash: a curated blueprint (e.g. "flask") whose
    // backing class gained a mixin on a base it composes (ConcealableMixin
    // onto Thing) has a stable blueprintId but a NEW signature. The overlay
    // found no signature match and tried to INSERT a second row under the
    // same unique blueprintId → E11000 → fatal boot. It must reconcile the
    // existing row in place instead. Unit tests missed this because a fresh
    // (empty) DB never has the drifted row to collide with.
    const seedFile = join(tmpdir(), `bp-overlay-drift-${Date.now()}.yaml`);
    writeFileSync(
      seedFile,
      'blueprints:\n' +
        '  - blueprintId: foo\n' +
        '    name: Foo\n' +
        '    kind: concrete\n' +
        '    baseClass: Idea\n' +
        '    classPath: /x/Foo\n'
    );
    try {
      const ctors: Record<string, unknown> = { '/x/Foo': Alpha };
      const { rows } = stubStore([], ctors);

      // First seed: the curated foo lands once.
      await BlueprintSeeder.run({ seedPath: seedFile });
      const foosAfterFirst = rows.filter((r) => r.blueprintId === 'foo');
      expect(foosAfterFirst).toHaveLength(1);
      const firstSig = foosAfterFirst[0]!.signature;

      // The backing class drifts (gains VisibleMixin) → new signature, same
      // id. Re-seed must NOT throw and must NOT insert a duplicate.
      ctors['/x/Foo'] = Gamma;
      await expect(
        BlueprintSeeder.run({ seedPath: seedFile })
      ).resolves.not.toThrow();

      const foos = rows.filter((r) => r.blueprintId === 'foo');
      expect(foos).toHaveLength(1); // reconciled in place, not duplicated
      expect(foos[0]!.signature).not.toBe(firstSig); // re-pointed to the new sig
    } finally {
      rmSync(seedFile, { force: true });
    }
  });
});
