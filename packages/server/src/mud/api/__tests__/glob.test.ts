/**
 * GlobbableApi tests — split / merge / canMerge / formatName /
 * applyQuantity plus the merge-on-arrival ripple integration with
 * `ContainmentApi.move`.
 *
 * `split` calls `StuffApi.clone(source.getTemplatePath())`. In tests
 * we stub `StuffApi.clone` with `vi.spyOn` so the test doesn't need
 * the Persistence-layer domain collection set up — the unit under
 * test is the split orchestrator, not clone itself.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GlobbableApi } from '../glob';
import { GlobbableLogic } from '../../platform/idea/api/GlobbableLogic';
import { SecurityError } from '../../lib/security/errors';
import { ContainmentApi } from '../containment';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { NamedMixin } from '../../lib/description/Named';
import { Idea } from '../../lib/stuff/Idea';
import { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Shadow } from '../../lib/stuff/Shadow';
import { Shadowing } from '../../lib/security/decorators';
import { GlobbableMixin } from '../../lib/stuff/Globbable';
import { ExecutionContextApi } from '../execution-context';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../lib/mixin';

// Test class — Globbable + Containable + Named so we can stuff
// instances into containers and pull display names through
// formatName.
class Coin extends GlobbableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'Coin';
  static fieldMeta: FieldMeta = {
    quantity: { persistent: true },
    name: { persistent: true },
    tarnished: { persistent: true, globIdentity: true },
    denomination: { persistent: true, globIdentity: true },
  };

  public tarnished: boolean = false;
  public denomination: 'gold' | 'silver' | 'copper' = 'copper';
}

class PlainItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'PlainItem';
}

class TestContainer extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestContainer';
}

const COIN_PATH = '/obj/item/Coin';

function makeCoinAt(path: string, qty: number, denom: Coin['denomination'] = 'copper'): Coin {
  const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.setName('coin');
    coin.denomination = denom;
    return coin;
  }, path);
  c.setQuantity(qty);
  return c;
}

function asApiCaller<T>(fn: () => T): T {
  return ExecutionContextApi.run(null, StuffApi, 'test-harness', undefined, fn);
}

async function asApiCallerAsync<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.run(null, StuffApi, 'test-harness', undefined, fn);
}

/**
 * Install a stub for `StuffApi.clone(path)` that returns a fresh
 * Coin stamped at `path` and registered. This bypasses the full
 * template-resolution flow; the split path is exercised
 * orchestration-side.
 */
function stubCoinClone() {
  return vi
    .spyOn(StuffApi, 'clone')
    .mockImplementation(async (path: string) => {
      const c = makeStuffAtPath(() => {
        const coin = new Coin();
        coin.setName('coin');
        return coin;
      }, path);
      return c as unknown as Stuff;
    }) as ReturnType<typeof vi.spyOn>;
}

describe('GlobbableApi.canMerge', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('true for two same-template same-identity stacks', () => {
    const a = makeCoinAt(COIN_PATH, 3, 'gold');
    const b = makeCoinAt(COIN_PATH, 5, 'gold');
    expect(GlobbableApi.canMerge(a, b)).toBe(true);
    expect(GlobbableApi.canMerge(b, a)).toBe(true);
  });

  it('false when one side is non-Globbable', () => {
    const a = makeCoinAt(COIN_PATH, 3);
    const p = makeStuff(() => new PlainItem());
    expect(GlobbableApi.canMerge(a, p)).toBe(false);
  });

  it('false against self', () => {
    const a = makeCoinAt(COIN_PATH, 3);
    expect(GlobbableApi.canMerge(a, a)).toBe(false);
  });

  it('false when identity fields differ', () => {
    const a = makeCoinAt(COIN_PATH, 3, 'gold');
    const b = makeCoinAt(COIN_PATH, 5, 'silver');
    expect(GlobbableApi.canMerge(a, b)).toBe(false);
  });
});

describe('GlobbableApi.split', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('produces a new sibling with the right quantity and copies identity fields', async () => {
    stubCoinClone();
    const source = makeCoinAt(COIN_PATH, 10, 'gold');
    source.tarnished = true;
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(source, env);

    const splitoff = await asApiCallerAsync(() =>
      GlobbableApi.split(source, 3)
    );
    expect(splitoff).not.toBe(source);
    expect(splitoff.getQuantity()).toBe(3);
    expect(source.getQuantity()).toBe(7);
    expect((splitoff as Coin).getContainer()).toBe(env);
    expect((splitoff as Coin).tarnished).toBe(true);
    expect((splitoff as Coin).denomination).toBe('gold');
  });

  it('returns source unchanged for whole-stack split (short circuit)', async () => {
    const cloneSpy = stubCoinClone();
    const source = makeCoinAt(COIN_PATH, 5);
    const result = await asApiCallerAsync(() =>
      GlobbableApi.split(source, 5)
    );
    expect(result).toBe(source);
    expect(source.getQuantity()).toBe(5);
    expect(cloneSpy).not.toHaveBeenCalled();
  });

  it('rejects over-quantity split', async () => {
    stubCoinClone();
    const source = makeCoinAt(COIN_PATH, 5);
    await expect(
      asApiCallerAsync(() => GlobbableApi.split(source, 6))
    ).rejects.toThrow(/exceeds source quantity/);
  });

  it('rejects non-positive n', async () => {
    stubCoinClone();
    const source = makeCoinAt(COIN_PATH, 5);
    await expect(
      asApiCallerAsync(() => GlobbableApi.split(source, 0))
    ).rejects.toThrow(/positive integer/);
  });

  it('rejects when canSplit vetoes (shadow present)', async () => {
    stubCoinClone();
    class TagShadow extends Shadow {
      @Shadowing('getQuantity')
      passthrough(): number {
        return this.callDown<number>();
      }
    }
    const source = makeCoinAt(COIN_PATH, 10);
    const sh = makeStuff(() => new TagShadow());
    ShadowApi.attach(source, sh);
    await expect(
      asApiCallerAsync(() => GlobbableApi.split(source, 3))
    ).rejects.toThrow(/canSplit\(3\) vetoed/);
  });

  it('places splitoff via placeDirect — no arrival witnesses fire', async () => {
    stubCoinClone();
    let addedCount = 0;
    let movedCount = 0;
    class WitnessContainer extends ContainerMixin(ContainableMixin(Idea)) {
      onContainableAdded(_item: Stuff): void {
        addedCount++;
      }
    }
    const source = makeCoinAt(COIN_PATH, 10);
    const env = makeStuff(() => new WitnessContainer());
    ContainmentApi.move(source, env);
    addedCount = 0; // discount the source's arrival.

    // Patch onMoved on Coin's prototype to count split-time moves.
    const origOnMoved =
      (Coin.prototype as unknown as { onMoved?: () => void }).onMoved;
    (Coin.prototype as unknown as { onMoved?: () => void }).onMoved =
      function () {
        movedCount++;
      };
    try {
      await asApiCallerAsync(() => GlobbableApi.split(source, 3));
    } finally {
      if (origOnMoved) {
        (Coin.prototype as unknown as { onMoved?: () => void }).onMoved =
          origOnMoved;
      } else {
        delete (Coin.prototype as unknown as { onMoved?: () => void }).onMoved;
      }
    }
    expect(addedCount).toBe(0);
    expect(movedCount).toBe(0);
  });

  it('fires onSplit on the source', async () => {
    stubCoinClone();
    let splitoffSeen: Stuff | null = null;
    const origOnSplit = (Coin.prototype as unknown as { onSplit: (s: Stuff) => void }).onSplit;
    (Coin.prototype as unknown as { onSplit: (s: Stuff) => void }).onSplit =
      function (s: Stuff) {
        splitoffSeen = s;
      };
    try {
      const source = makeCoinAt(COIN_PATH, 10);
      const env = makeStuff(() => new TestContainer());
      ContainmentApi.move(source, env);
      const splitoff = await asApiCallerAsync(() =>
        GlobbableApi.split(source, 4)
      );
      expect(splitoffSeen).toBe(splitoff);
    } finally {
      (Coin.prototype as unknown as { onSplit: (s: Stuff) => void }).onSplit =
        origOnSplit;
    }
  });
});

describe('GlobbableApi.merge', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('folds absorbed into survivor and destructs absorbed', () => {
    const survivor = makeCoinAt(COIN_PATH, 10, 'gold');
    const absorbed = makeCoinAt(COIN_PATH, 5, 'gold');
    asApiCaller(() => GlobbableApi.merge(survivor, absorbed));
    expect(survivor.getQuantity()).toBe(15);
    expect(absorbed.isDestroyed()).toBe(true);
  });

  it('rejects non-mergeable peers (identity-field mismatch)', () => {
    const survivor = makeCoinAt(COIN_PATH, 10, 'gold');
    const absorbed = makeCoinAt(COIN_PATH, 5, 'silver');
    expect(() =>
      asApiCaller(() => GlobbableApi.merge(survivor, absorbed))
    ).toThrow(/canMergeWith\(absorbed\) returned false/);
    expect(survivor.getQuantity()).toBe(10);
    expect(absorbed.getQuantity()).toBe(5);
    expect(absorbed.isDestroyed()).toBe(false);
  });

  it('fires onMerged on survivor', () => {
    let absorbedSeen: Stuff | null = null;
    const orig = (Coin.prototype as unknown as { onMerged: (s: Stuff) => void }).onMerged;
    (Coin.prototype as unknown as { onMerged: (s: Stuff) => void }).onMerged =
      function (s: Stuff) {
        absorbedSeen = s;
      };
    try {
      const survivor = makeCoinAt(COIN_PATH, 10, 'gold');
      const absorbed = makeCoinAt(COIN_PATH, 5, 'gold');
      asApiCaller(() => GlobbableApi.merge(survivor, absorbed));
      expect(absorbedSeen).toBe(absorbed);
    } finally {
      (Coin.prototype as unknown as { onMerged: (s: Stuff) => void }).onMerged =
        orig;
    }
  });
});

describe('ContainmentApi.move — merge-on-arrival ripple', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('absorbs an arriving glob into a mergeable sibling already in the destination', () => {
    const resident = makeCoinAt(COIN_PATH, 10, 'gold');
    const arrival = makeCoinAt(COIN_PATH, 5, 'gold');
    const dest = makeStuff(() => new TestContainer());
    ContainmentApi.move(resident, dest);

    ContainmentApi.move(arrival, dest);

    // Resident absorbed the arrival.
    expect(resident.getQuantity()).toBe(15);
    expect(arrival.isDestroyed()).toBe(true);
    expect(dest.getContents()).toHaveLength(1);
  });

  it('no merge when no mergeable sibling is present', () => {
    const arrival = makeCoinAt(COIN_PATH, 5, 'gold');
    const dest = makeStuff(() => new TestContainer());
    ContainmentApi.move(arrival, dest);
    expect(arrival.getQuantity()).toBe(5);
    expect(arrival.isDestroyed()).toBe(false);
    expect(dest.getContents()).toHaveLength(1);
  });

  it('no merge for non-globbable arrivals (regression: existing behavior)', () => {
    const plain = makeStuff(() => {
      const p = new PlainItem();
      p.setName('rock');
      return p;
    });
    const dest = makeStuff(() => new TestContainer());
    expect(() => ContainmentApi.move(plain, dest)).not.toThrow();
    expect(dest.getContents()).toHaveLength(1);
  });

  it('no merge when sibling has different identity fields', () => {
    const resident = makeCoinAt(COIN_PATH, 10, 'gold');
    const arrival = makeCoinAt(COIN_PATH, 5, 'silver');
    const dest = makeStuff(() => new TestContainer());
    ContainmentApi.move(resident, dest);

    ContainmentApi.move(arrival, dest);

    expect(resident.getQuantity()).toBe(10);
    expect(arrival.getQuantity()).toBe(5);
    expect(arrival.isDestroyed()).toBe(false);
    expect(dest.getContents()).toHaveLength(2);
  });

  it('fires onContainableAdded for the arrival before merging', () => {
    const observed: string[] = [];
    class ObservingContainer extends ContainerMixin(ContainableMixin(Idea)) {
      onContainableAdded(item: Stuff): void {
        observed.push(`added:${(item as Coin).getQuantity()}`);
      }
    }
    const resident = makeCoinAt(COIN_PATH, 10, 'gold');
    const arrival = makeCoinAt(COIN_PATH, 5, 'gold');
    const dest = makeStuff(() => new ObservingContainer());
    ContainmentApi.move(resident, dest);
    observed.length = 0;
    ContainmentApi.move(arrival, dest);

    // The witness saw the arrival as a 5-stack (before merge), not
    // as a phantom 15-stack.
    expect(observed).toEqual(['added:5']);
  });
});

describe('GlobbableApi.applyQuantity', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('empty candidate list → declined + empty-result note', async () => {
    const result = await GlobbableApi.applyQuantity(
      [],
      { value: { kind: 'count', n: 3 }, mode: 'lenient' },
      async () => ({ ok: true, payload: null }),
      { field: "test" }
    );
    expect(result.ok).toBe(false);
    expect(result.applied).toBe(0);
    expect(result.status).toBe('declined');
    expect(result.notes).toEqual([
      { kind: 'empty-result', field: 'test', query: '' },
    ]);
  });

  it('strict pre-check fails → declined + quantity-clamped-rejected', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 5);
    const calls: number[] = [];
    const result = await GlobbableApi.applyQuantity(
      [a],
      { value: { kind: 'count', n: 10 }, mode: 'strict' },
      async (_op, n) => {
        calls.push(n);
        return { ok: true, payload: null };
      },
      { field: 'test' }
    );
    expect(result.ok).toBe(false);
    expect(result.applied).toBe(0);
    expect(result.status).toBe('declined');
    expect(result.notes).toContainEqual({
      kind: 'quantity-clamped-rejected',
      field: 'test',
      requested: 10,
      available: 5,
    });
    expect(calls).toEqual([]);
  });

  it('strict pre-check passes → ok, no notes', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 10);
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [a],
        { value: { kind: 'count', n: 3 }, mode: 'strict' },
        async () => ({ ok: true, payload: 'acted' }),
        { field: "test" }
      )
    );
    expect(result.ok).toBe(true);
    expect(result.applied).toBe(3);
    expect(result.status).toBeUndefined();
    expect(result.notes).toEqual([]);
    expect(result.payloads).toEqual(['acted']);
  });

  it('lenient overflow → partial + quantity-clamped note', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 4);
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [a],
        { value: { kind: 'count', n: 10 }, mode: 'lenient' },
        async () => ({ ok: true, payload: null }),
        { field: "test" }
      )
    );
    expect(result.ok).toBe(true);
    expect(result.applied).toBe(4);
    expect(result.status).toBe('partial');
    expect(result.notes).toContainEqual({
      kind: 'quantity-clamped',
      field: 'test',
      requested: 10,
      applied: 4,
    });
  });

  it('multi-match distribution across globs (apples + oranges shape)', async () => {
    stubCoinClone();
    const apples = makeCoinAt(COIN_PATH, 2, 'gold');
    const oranges = makeCoinAt(COIN_PATH, 2, 'silver');
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(apples, env);
    ContainmentApi.move(oranges, env);
    const actions: number[] = [];
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [apples, oranges],
        { value: { kind: 'count', n: 3 }, mode: 'lenient' },
        async (_op, n) => {
          actions.push(n);
          return { ok: true, payload: n };
        },
        { field: 'test' }
      )
    );
    expect(result.applied).toBe(3);
    // First candidate fully consumed (2), second contributes the
    // remainder (1).
    expect(actions).toEqual([2, 1]);
    expect(result.payloads).toEqual([2, 1]);
    expect(result.status).toBeUndefined();
  });

  it('mixed glob + non-glob counts non-glob as 1 unit', async () => {
    stubCoinClone();
    const stack = makeCoinAt(COIN_PATH, 5, 'gold');
    const singleton = makeStuff(() => {
      const p = new PlainItem();
      p.setName('stone');
      return p;
    });
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(stack, env);
    ContainmentApi.move(singleton, env);
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [singleton, stack],
        { value: { kind: 'count', n: 3 }, mode: 'lenient' },
        async (op, n) => ({ ok: true, payload: { op, n } }),
        { field: 'test' }
      )
    );
    // Singleton contributes 1, stack contributes the remaining 2.
    expect(result.applied).toBe(3);
    expect(result.payloads).toHaveLength(2);
  });

  it('all-kind acts on every candidate at full contribution', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 3, 'gold');
    const b = makeCoinAt(COIN_PATH, 4, 'silver');
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    ContainmentApi.move(b, env);
    const ns: number[] = [];
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [a, b],
        { value: { kind: 'all' }, mode: 'lenient' },
        async (_op, n) => {
          ns.push(n);
          return { ok: true, payload: null };
        },
        { field: 'test' }
      )
    );
    expect(result.applied).toBe(7);
    expect(ns).toEqual([3, 4]);
    expect(result.status).toBeUndefined();
  });

  it('action ok:false on a split candidate triggers reglob; walk continues', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 10, 'gold');
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [a],
        { value: { kind: 'count', n: 3 }, mode: 'lenient' },
        async () => ({ ok: false, reason: 'cursed' }),
        { field: "test" }
      )
    );
    expect(result.applied).toBe(0);
    expect(result.status).toBe('declined');
    expect(a.getQuantity()).toBe(10); // reglob restored
    expect(result.notes).toContainEqual(
      expect.objectContaining({
        kind: 'target-declined',
        target: expect.objectContaining({ stuffId: a.stuffId }),
        reason: 'cursed',
      }),
    );
  });

  it('action ok:false on some + supply OK → partial + targetDeclined only', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 5, 'gold');
    const b = makeCoinAt(COIN_PATH, 5, 'silver');
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    ContainmentApi.move(b, env);
    // First candidate declines, second succeeds.
    let calls = 0;
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [a, b],
        { value: { kind: 'count', n: 4 }, mode: 'lenient' },
        async (_op, _n) => {
          calls++;
          return calls === 1
            ? { ok: false, reason: 'cursed' }
            : { ok: true, payload: null };
        },
        { field: 'test' }
      )
    );
    expect(result.applied).toBe(4);
    expect(result.status).toBe('partial');
    expect(result.notes.some((n) => n.kind === 'target-declined')).toBe(true);
    expect(
      result.notes.some((n) => n.kind === 'quantity-clamped')
    ).toBe(false);
  });

  it('action ok:false on some + supply short → partial + both note kinds', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 3, 'gold');
    const b = makeCoinAt(COIN_PATH, 3, 'silver');
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    ContainmentApi.move(b, env);
    let calls = 0;
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [a, b],
        { value: { kind: 'count', n: 10 }, mode: 'lenient' },
        async (_op, _n) => {
          calls++;
          return calls === 1
            ? { ok: false, reason: 'cursed' }
            : { ok: true, payload: null };
        },
        { field: 'test' }
      )
    );
    expect(result.applied).toBe(3);
    expect(result.status).toBe('partial');
    expect(result.notes.some((n) => n.kind === 'target-declined')).toBe(true);
    expect(result.notes.some((n) => n.kind === 'quantity-clamped')).toBe(true);
  });

  it('action ok:false on every target → declined + only target-declined notes', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 3, 'gold');
    const b = makeCoinAt(COIN_PATH, 3, 'silver');
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    ContainmentApi.move(b, env);
    const result = await asApiCallerAsync(() =>
      GlobbableApi.applyQuantity(
        [a, b],
        { value: { kind: 'count', n: 4 }, mode: 'lenient' },
        async () => ({ ok: false, reason: 'cursed' }),
        { field: "test" }
      )
    );
    expect(result.applied).toBe(0);
    expect(result.status).toBe('declined');
    const declines = result.notes.filter((n) => n.kind === 'target-declined');
    expect(declines).toHaveLength(2);
    expect(result.notes.some((n) => n.kind === 'quantity-clamped')).toBe(false);
  });

  it('throws propagate from the action callback', async () => {
    stubCoinClone();
    const a = makeCoinAt(COIN_PATH, 5, 'gold');
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(a, env);
    await expect(
      asApiCallerAsync(() =>
        GlobbableApi.applyQuantity(
          [a],
          { value: { kind: 'count', n: 3 }, mode: 'lenient' },
          async () => {
            throw new Error('boom');
          },
          { field: 'test' }
        )
      )
    ).rejects.toThrow(/boom/);
  });

  it('passes query through to empty-result note', async () => {
    const result = await GlobbableApi.applyQuantity(
      [],
      { value: { kind: 'count', n: 1 }, mode: 'lenient' },
      async () => ({ ok: true, payload: null }),
      { field: 'test', query: 'turnips' }
    );
    expect(result.notes[0]).toEqual({
      kind: 'empty-result',
      field: 'test',
      query: 'turnips',
    });
  });
});

describe('GlobbableLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /platform/idea/api/glob once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton. canMerge over
    // two non-globbable Ideas returns false without side effects.
    const a = makeStuff(() => new Idea());
    const b = makeStuff(() => new Idea());
    GlobbableApi.canMerge(a, b);
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/glob');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-GlobbableApi caller', () => {
    const a = makeStuff(() => new Idea());
    const b = makeStuff(() => new Idea());
    GlobbableApi.canMerge(a, b);
    const logic = StuffApi.findByTemplatePath<GlobbableLogic>('/platform/idea/api/glob');
    expect(logic).toBeDefined();
    // The test module is neither `mud/api/glob#GlobbableApi` (FromModule)
    // nor the singleton itself (SelfOnly), so the gate denies the call.
    expect(() => logic!.canMerge(a, b)).toThrow(SecurityError);
  });
});
