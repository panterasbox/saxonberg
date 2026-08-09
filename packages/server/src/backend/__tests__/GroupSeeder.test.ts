/**
 * GroupSeeder — seeds authored managed-group memberships from the real
 * `mud/config/groups.yaml`. Create-or-ensure / idempotent; members added
 * in-world survive. PersistenceManager is stubbed with a small stateful store
 * (no Mongo), so `find` sees prior `save`s — the shape idempotency needs.
 *
 * The security intent under test: the `duncan-hall` landlord group's staff
 * (Katie) is conferred by this authored data — not self-enrolled — so a later
 * `isDormsAgent` membership check has an owner-granted ledger to read.
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GroupSeeder } from '../GroupSeeder';
import { PersistenceManager } from '../PersistenceManager';

interface Row extends Record<string, unknown> {
  _id?: string;
}

/** A minimal stateful in-memory PM: save (insert/update) + find (equality,
 *  array-contains). Enough for the seeder's create-or-ensure loop. */
function stubStatefulPM() {
  const store = new Map<string, Row[]>();
  let idCounter = 0;
  const col = (c: string): Row[] => {
    let arr = store.get(c);
    if (!arr) store.set(c, (arr = []));
    return arr;
  };
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'save').mockImplementation(async (c: string, doc: unknown) => {
    const d = doc as Row;
    const arr = col(c);
    if (d._id) {
      const i = arr.findIndex((r) => r._id === d._id);
      if (i >= 0) arr[i] = { ...d };
      else arr.push({ ...d });
      return d._id;
    }
    const id = String(++idCounter);
    arr.push({ ...d, _id: id });
    return id;
  });
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, q: Record<string, unknown>) => {
      const arr = col(c);
      const keys = Object.keys(q ?? {});
      if (keys.length === 0) return arr.slice();
      return arr.filter((r) =>
        keys.every((k) => {
          const stored = r[k];
          if (Array.isArray(stored)) return stored.includes(q[k]);
          return stored === q[k];
        }),
      );
    },
  );
  return { groups: () => col('groups') };
}

describe('GroupSeeder', () => {
  let pm: ReturnType<typeof stubStatefulPM>;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubStatefulPM();
  });
  afterEach(() => vi.restoreAllMocks());

  it('confers the duncan-hall staff membership from authored config data', async () => {
    const changed = await GroupSeeder.run();
    expect(changed).toBeGreaterThanOrEqual(1);

    const groups = pm.groups();
    const dorms = groups.find((g) => g.name === 'duncan-hall');
    expect(dorms, 'duncan-hall group seeded').toBeTruthy();
    // Owner is the platform (system), and Katie's templatePath is a member —
    // conferred by the owner's authored data, the key isDormsAgent checks.
    expect(dorms!.owner).toBe('system');
    expect(dorms!.memberIds).toContain(
      '/domain/eternal/duncan-hall/npc/katie',
    );
  });

  it('is idempotent — a second run adds nothing and reports no change', async () => {
    await GroupSeeder.run();
    const before = JSON.stringify(pm.groups());
    const changed = await GroupSeeder.run();
    expect(changed).toBe(0);
    expect(JSON.stringify(pm.groups())).toBe(before);
  });
});
