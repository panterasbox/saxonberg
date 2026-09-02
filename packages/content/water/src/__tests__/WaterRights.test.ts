/**
 * Water rights (watershed W7) — **one substrate, two doctrines**.
 *
 * A right is a volume per window plus a priority date. Without a volume
 * it cannot be over-subscribed; without a date it cannot be senior.
 *
 * The claims:
 *
 *  - a prior-appropriation right is **recorded, dated and transferable**;
 *  - a riparian right over the same reach is **derived from parcel
 *    ownership with no record at all**, and both answer the **same**
 *    allocation query;
 *  - ⭐ two rights on an over-subscribed reach are served **in seniority
 *    order**, and **the junior is the one that goes short**;
 *  - a quota refusal **exposes no other holder's draw** — a property of
 *    the shape, not of what the caller prints;
 *  - ⭐ **a diversion strands a navigation claim, and curtailing the
 *    junior right restores it.**
 *
 * See docs/subsystems/watershed.md.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WaterRightRegistry, {
  WATER_USES,
  type WaterRight,
} from '../idea/WaterRightRegistry';

const REACH = 'kestrel:confluence';

/**
 * An in-memory document store behind `DocumentApi`, and an in-memory
 * parcel roster behind `ParcelApi.allRecords`.
 *
 * The seam is the two **Api faces** — a pack sees the kernel only
 * through them, so they are the only honest place to intercept.
 */
let docs: Map<string, Record<string, unknown>>;
let parcels: Array<{ extent: string; reach: string; owner: string | null }>;

function installStores(): void {
  docs = new Map();
  parcels = [];
  vi.spyOn(DocumentApi, 'save').mockImplementation(
    async (path: string, _kind: string, data: Record<string, unknown>) => {
      docs.set(path, { ...data });
    },
  );
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const data = docs.get(path);
    return data === undefined
      ? null
      : ({ getData: () => data } as never);
  });
  vi.spyOn(DocumentApi, 'list').mockImplementation(async (prefix: string) => {
    return [...docs.entries()]
      .filter(([p]) => p === prefix || p.startsWith(prefix + '/'))
      .map(([, data]) => ({ getData: () => data }) as never);
  });
  vi.spyOn(ParcelApi, 'allRecords').mockImplementation(async () =>
    parcels.map(
      (p) =>
        ({
          getExtent: () => p.extent,
          getReach: () => p.reach,
          getOwner: () =>
            p.owner === null
              ? null
              : { kind: 'player', templatePath: p.owner },
        }) as never,
    ),
  );
}

const registry = (): WaterRightRegistry =>
  makeStuff(() => new WaterRightRegistry()) as WaterRightRegistry;

function right(over: Partial<WaterRight> = {}): WaterRight {
  return {
    rightId: 'r1',
    reachRef: REACH,
    holderRef: '/platform/agent/Avatar/alice',
    use: 'irrigation',
    rateM3S: 1,
    windowS: 0,
    quotaM3: 0,
    priorityDateS: 1000,
    minimumFlowM3S: 0,
    transferable: true,
    ...over,
  };
}

beforeEach(() => {
  StuffApi.clearAll();
  installStores();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('prior appropriation: recorded, dated, transferable', () => {
  it('a filed right round-trips, keyed under its own reach', async () => {
    const reg = registry();
    const path = await reg.file(right({ rightId: 'ditch-1' }));
    expect(path).toBe('/water/rights/kestrel/confluence/ditch-1');

    const filed = await reg.filedRightsOn(REACH);
    expect(filed).toHaveLength(1);
    expect(filed[0]!.rightId).toBe('ditch-1');
    expect(filed[0]!.priorityDateS).toBe(1000);
  });

  it('⭐ a transfer keeps the PRIORITY DATE — which is why anyone buys one', async () => {
    const reg = registry();
    await reg.file(right({ rightId: 'senior', priorityDateS: 10 }));
    expect(await reg.transfer(REACH, 'senior', '/platform/agent/Avatar/bob')).toBe(true);

    const [after] = await reg.filedRightsOn(REACH);
    expect(after!.holderRef).toBe('/platform/agent/Avatar/bob');
    expect(after!.priorityDateS).toBe(10); // untouched: still senior
  });

  it('a right marked non-transferable refuses to move', async () => {
    const reg = registry();
    await reg.file(right({ rightId: 'stuck', transferable: false }));
    expect(await reg.transfer(REACH, 'stuck', '/x')).toBe(false);
  });

  it('transferring a right that does not exist is false, not a throw', async () => {
    expect(await registry().transfer(REACH, 'ghost', '/x')).toBe(false);
  });
});

describe('⚠ the filing validation refuses, and says why', () => {
  const refuses = async (
    over: Partial<WaterRight>,
    fragment: string,
  ): Promise<void> => {
    await expect(registry().file(right(over))).rejects.toThrow(fragment);
  };

  it('a right with no rate cannot be over-subscribed, so it is refused', () =>
    refuses({ rateM3S: 0 }, 'claims no rate'));

  it('a right with no priority date can never be senior, so it is refused', () =>
    refuses({ priorityDateS: Number.NaN }, 'never be senior'));

  it('a right with no id, no reach or no holder is refused, each by name', async () => {
    await refuses({ rightId: '  ' }, 'it has no id');
    await refuses({ reachRef: '' }, 'it names no reach');
    await refuses({ holderRef: '' }, 'it names no holder');
  });

  it('a use outside the vocabulary is refused, listing the vocabulary', () =>
    refuses({ use: 'swimming' as never }, WATER_USES.join(', ')));

  it('a navigation claim with no minimum flow claims nothing, and is refused', () =>
    refuses(
      { use: 'navigation', minimumFlowM3S: 0, rateM3S: 0 },
      'it is the flow it needs, not a volume it takes',
    ));
});

describe('⭐ riparian: derived from ownership, with NO record', () => {
  it('the bank-holders of a reach share the flow equally, having filed nothing', async () => {
    parcels = [
      { extent: '/world/vale/north', reach: REACH, owner: '/platform/agent/Avatar/alice' },
      { extent: '/world/vale/south', reach: REACH, owner: '/platform/agent/Avatar/bob' },
      // Not on this reach, and unowned land: neither is a bank-holder.
      { extent: '/world/hill', reach: 'kestrel:falls', owner: '/platform/agent/Avatar/carol' },
      { extent: '/world/waste', reach: REACH, owner: null },
    ];
    const derived = await registry().riparianRightsOn(REACH, 6);
    expect(derived).toHaveLength(2);
    expect(derived.map((r) => r.rateM3S)).toEqual([3, 3]);
    expect(derived.every((r) => r.derived === true)).toBe(true);
    // ⭐ No record was written for any of them.
    expect(docs.size).toBe(0);
  });

  it('every riparian right is SIMULTANEOUS — a drought shrinks every glass', async () => {
    parcels = [
      { extent: '/a', reach: REACH, owner: '/p/a' },
      { extent: '/b', reach: REACH, owner: '/p/b' },
      { extent: '/c', reach: REACH, owner: '/p/c' },
    ];
    const wet = await registry().riparianRightsOn(REACH, 9);
    const dry = await registry().riparianRightsOn(REACH, 3);
    expect(wet.map((r) => r.rateM3S)).toEqual([3, 3, 3]);
    // Nobody is senior, so nobody is emptied — the glasses just shrink.
    expect(dry.map((r) => r.rateM3S)).toEqual([1, 1, 1]);
    expect(new Set(wet.map((r) => r.priorityDateS))).toEqual(new Set([0]));
  });

  it('a reach nobody fronts derives nothing', async () => {
    expect(await registry().riparianRightsOn(REACH, 10)).toEqual([]);
  });
});

describe('⭐ allocation: both doctrines, ONE query, seniority order', () => {
  it('two rights on an over-subscribed reach are served in seniority order', async () => {
    const reg = registry();
    await reg.file(right({ rightId: 'junior', priorityDateS: 5000, rateM3S: 3 }));
    await reg.file(right({ rightId: 'senior', priorityDateS: 100, rateM3S: 3 }));

    // Four cubic metres for six cubic metres of claim.
    const result = await reg.allocate(REACH, 4);
    expect(result.allocations.map((a) => a.right.rightId)).toEqual([
      'senior',
      'junior',
    ]);
    // ⭐ The senior gets everything it asked for…
    expect(result.allocations[0]!.servedM3S).toBe(3);
    expect(result.allocations[0]!.shortfallM3S).toBe(0);
    // …and the JUNIOR is the one that goes short. That asymmetry is the
    // whole of prior appropriation, and why a senior right is worth money.
    expect(result.allocations[1]!.servedM3S).toBe(1);
    expect(result.allocations[1]!.shortfallM3S).toBe(2);
    expect(result.remainingM3S).toBe(0);
  });

  it('a dry reach serves the senior nothing rather than serving everyone a little', async () => {
    const reg = registry();
    await reg.file(right({ rightId: 'junior', priorityDateS: 5000, rateM3S: 3 }));
    await reg.file(right({ rightId: 'senior', priorityDateS: 100, rateM3S: 3 }));
    const result = await reg.allocate(REACH, 0);
    expect(result.allocations.every((a) => a.servedM3S === 0)).toBe(true);
  });

  it('riparian and filed rights answer the SAME query', async () => {
    parcels = [{ extent: '/bank', reach: REACH, owner: '/p/riparian' }];
    const reg = registry();
    await reg.file(right({ rightId: 'filed', priorityDateS: 5000, rateM3S: 2 }));

    const result = await reg.allocate(REACH, 5, { riparian: true });
    // The riparian holder is first: the land was there before anybody
    // filed, so its priority date is zero.
    expect(result.allocations[0]!.right.derived).toBe(true);
    expect(result.allocations[1]!.right.rightId).toBe('filed');
    expect(result.allocations).toHaveLength(2);
  });

  it('riparian derivation is OPT-IN — a polity’s doctrine is a choice', async () => {
    parcels = [{ extent: '/bank', reach: REACH, owner: '/p/riparian' }];
    const reg = registry();
    await reg.file(right({ rightId: 'filed', rateM3S: 2 }));
    expect((await reg.allocate(REACH, 5)).allocations).toHaveLength(1);
  });

  it('ties break on the id, so an allocation never reorders between reads', async () => {
    const reg = registry();
    await reg.file(right({ rightId: 'bravo', priorityDateS: 7, rateM3S: 1 }));
    await reg.file(right({ rightId: 'alpha', priorityDateS: 7, rateM3S: 1 }));
    const once = await reg.allocate(REACH, 10);
    const twice = await reg.allocate(REACH, 10);
    expect(once.allocations.map((a) => a.right.rightId)).toEqual([
      'alpha',
      'bravo',
    ]);
    expect(twice.allocations.map((a) => a.right.rightId)).toEqual([
      'alpha',
      'bravo',
    ]);
  });
});

describe('⭐ navigation: a claimant who is not a farmer', () => {
  it('a diversion STRANDS a navigation claim; curtailing the junior restores it', async () => {
    const reg = registry();
    await reg.file(
      right({
        rightId: 'the-river-itself',
        use: 'navigation',
        rateM3S: 0,
        minimumFlowM3S: 5,
        priorityDateS: 1,
      }),
    );
    await reg.file(
      right({ rightId: 'big-ditch', priorityDateS: 9000, rateM3S: 6 }),
    );

    // Ten cubic metres: the ditch takes six, four are left, and four is
    // less than the five the river needs to carry a boat.
    const diverted = await reg.allocate(REACH, 10);
    expect(diverted.remainingM3S).toBe(4);
    expect(diverted.strandedNavigation.map((n) => n.rightId)).toEqual([
      'the-river-itself',
    ]);

    // Curtail the junior right — and the river comes back.
    docs.delete('/water/rights/kestrel/confluence/big-ditch');
    const restored = await reg.allocate(REACH, 10);
    expect(restored.remainingM3S).toBe(10);
    expect(restored.strandedNavigation).toEqual([]);
  });

  it('a navigation claim takes NOTHING — it is a condition, not a draw', async () => {
    const reg = registry();
    await reg.file(
      right({
        rightId: 'nav',
        use: 'navigation',
        rateM3S: 0,
        minimumFlowM3S: 2,
      }),
    );
    const result = await reg.allocate(REACH, 10);
    expect(result.allocations).toEqual([]); // it is served nothing
    expect(result.remainingM3S).toBe(10); // and it takes nothing
    expect(result.strandedNavigation).toEqual([]);
  });
});

describe('⚠ the quota rides the RIGHT, and exposes nobody else', () => {
  it('a per-window quota counts down the holder’s own draw', () => {
    const reg = registry();
    const r = right({ quotaM3: 1000, windowS: 86_400 });
    expect(reg.quotaRemainingM3(r, 0)).toBe(1000);
    expect(reg.quotaRemainingM3(r, 400)).toBe(600);
    // An over-draw floors at zero rather than going negative.
    expect(reg.quotaRemainingM3(r, 5000)).toBe(0);
  });

  it('a rate-only right has no quota at all, and says so with null', () => {
    expect(registry().quotaRemainingM3(right({ quotaM3: 0 }), 10)).toBeNull();
  });

  it('⭐ the check reads ONE record — there is no cross-drawer view to leak', async () => {
    const reg = registry();
    await reg.file(right({ rightId: 'alice', holderRef: '/p/alice', quotaM3: 10 }));
    await reg.file(right({ rightId: 'bob', holderRef: '/p/bob', quotaM3: 10 }));

    // The quota check is pure over the holder's OWN record and a number
    // the caller already had. It cannot see, and therefore cannot leak,
    // anything about the other holder — which is why no leaderboard can
    // ever be built from it. Aggregate, never report.
    const mine = (await reg.filedRightsOn(REACH)).find(
      (r) => r.rightId === 'alice',
    )!;
    expect(reg.quotaRemainingM3(mine, 3)).toBe(7);

    // The proof that it consults no register: hand it a right that is
    // not in the store at all and it still answers, identically. There
    // is nothing for it to look up, so there is nothing for it to leak
    // — and no leaderboard can ever be built from it.
    const unfiled = right({ rightId: 'never-filed', quotaM3: 10 });
    expect(docs.has('/water/rights/kestrel/confluence/never-filed')).toBe(false);
    expect(reg.quotaRemainingM3(unfiled, 3)).toBe(7);
  });
});
