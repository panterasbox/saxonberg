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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  vi.spyOn(pm, 'find').mockImplementation(async (collection) => {
    if (collection === Collections.Blueprints) return rows.map((r) => ({ ...r }));
    return [];
  });
  vi.spyOn(pm, 'save').mockImplementation(async (collection, doc) => {
    if (collection === Collections.Blueprints) {
      rows.push({ ...(doc as Record<string, unknown>) });
    }
    return `id-${rows.length}`;
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
});
