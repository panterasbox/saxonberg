/**
 * ⭐⭐ **A contributor may name a source that is not the host's record,
 * and the CLONE PIPELINE drives it — record or no record.**
 *
 * That last clause is the original defect this build exists to fix. The
 * slice half of the persistence framework (`hydrateSlice`) is driven by
 * `PersistableLogic.restoreState`, and only when the record carries that
 * layer's slice. So a host with no record was never driven at all: every
 * `Cast` is a singleton, its regard had been written through on every
 * change since the belief store shipped, and nothing ever read it back —
 * an NPC's opinion of you reset on every restart while the rows piled up
 * in Mongo, unread. No test could see it, because every test that drove
 * the hook drove it on a fixture.
 *
 * One fixture contributor per declaration, because the two declared
 * properties are the whole contract:
 *
 *   - `required` — an unreachable source is a recorded skip (`false`) or
 *     a refused mint (`true`). Every test run and all of early boot are
 *     the `false` case, which is exactly why it must be said out loud.
 *   - `eager` — read at mint, before `onCreate` begins, or faulted on
 *     first read via `StuffApi.ensureHydrated`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { Idea } from '../Idea';
import { Stuff } from '../Stuff';
import type { MixinConstructor } from '../../mixin';
import type {
  HydrationSource,
  HydrateOutcome,
} from '../../persistence/PersistenceSlice';

/** What the "source" holds, per host path. Reset per test. */
const store = new Map<string, string[]>();
/** Every source call, in order — so "was it driven at all" is observable. */
let calls: string[] = [];
/** Flipped to simulate a closed Mongo. */
let reachable = true;

/**
 * A mixin with a declared source and NO record of its own: no persistent
 * fields, no `captureSlice`. ⭐ That shape is deliberate — the walk used
 * to push a contributor only when it had fields or a capture hook, so a
 * source-only layer would have been dropped silently.
 */
function SourcedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
  opts: HydrationSource,
) {
  return class SourcedMixin extends Base {
    static _mixinName: string = `Sourced:${opts.name}`;
    static hydrationSource: HydrationSource = opts;

    static async hydrateFromSource(host: Stuff): Promise<HydrateOutcome> {
      calls.push(`${opts.name}:${host.getTemplatePath() ?? 'anon'}`);
      if (!reachable) {
        return { status: 'unreachable', reason: 'store closed' };
      }
      const rows = store.get(opts.name) ?? [];
      (host as unknown as { loaded: string[] }).loaded = [...rows];
      return { status: 'hydrated' };
    }

    public loaded: string[] = [];
  };
}

const EAGER_OPTIONAL: HydrationSource = {
  name: 'eager-optional',
  required: false,
  eager: true,
};
const EAGER_REQUIRED: HydrationSource = {
  name: 'eager-required',
  required: true,
  eager: true,
};
const LAZY: HydrationSource = { name: 'lazy', required: false, eager: false };

class EagerOptionalHost extends SourcedMixin(Idea, EAGER_OPTIONAL) {}
class EagerRequiredHost extends SourcedMixin(Idea, EAGER_REQUIRED) {}
class LazyHost extends SourcedMixin(Idea, LAZY) {}

/** Observes the ORDER invariant: the source runs before the hook. */
class OrderHost extends SourcedMixin(Idea, EAGER_OPTIONAL) {
  public sawAtOnCreate: string[] = [];
  override async onCreate(): Promise<void> {
    this.sawAtOnCreate = [...this.loaded];
  }
}

beforeEach(() => {
  store.clear();
  calls = [];
  reachable = true;
  StuffApi.clearAll();
});

afterEach(() => StuffApi.clearAll());

describe('the walk finds a source-only contributor', () => {
  it('⭐ a layer with no fields and no captureSlice is STILL a contributor', () => {
    const cs = MixinApi.getPersistenceContributors(EagerOptionalHost);
    const mine = cs.find((c) => c.key === 'Sourced:eager-optional');
    expect(mine).toBeDefined();
    expect(mine!.fields).toEqual([]);
    expect(mine!.captureSlice).toBeUndefined();
    expect(mine!.source).toMatchObject(EAGER_OPTIONAL);
  });
});

describe('eager', () => {
  it('runs at mint, with NO record anywhere', async () => {
    store.set('eager-optional', ['one', 'two']);
    const h = await StuffApi.create(() => new EagerOptionalHost());
    expect(calls).toEqual(['eager-optional:anon']);
    expect(h.loaded).toEqual(['one', 'two']);
  });

  it('⭐ completes BEFORE onCreate begins', async () => {
    // The invariant that lets a hook stop reading collections itself.
    store.set('eager-optional', ['remembered']);
    const h = await StuffApi.create(() => new OrderHost());
    expect(h.sawAtOnCreate).toEqual(['remembered']);
  });
});

describe('required', () => {
  it('optional + unreachable is a recorded skip — the mint succeeds', async () => {
    reachable = false;
    const h = await StuffApi.create(() => new EagerOptionalHost());
    expect(h.isDestroyed()).toBe(false);
    expect(StuffApi.findById(h.stuffId)).toBe(h);
    expect(h.loaded).toEqual([]);
  });

  it('⚠ required + unreachable FAILS the clone and unregisters', async () => {
    reachable = false;
    let id: string | null = null;
    await expect(
      StuffApi.create(() => {
        const o = new EagerRequiredHost();
        id = o.stuffId;
        return o;
      }),
    ).rejects.toThrow(/required and unreachable/);
    // Not merely "it threw" — the half-built object must not linger.
    expect(StuffApi.findById(id!)).toBeUndefined();
  });

  it('required + reachable mints normally', async () => {
    store.set('eager-required', ['x']);
    const h = await StuffApi.create(() => new EagerRequiredHost());
    expect(h.loaded).toEqual(['x']);
  });
});

describe('lazy', () => {
  it('is NOT run at mint', async () => {
    store.set('lazy', ['later']);
    const h = await StuffApi.create(() => new LazyHost());
    expect(calls).toEqual([]);
    expect(h.loaded).toEqual([]);
  });

  it('ensureHydrated runs it, once', async () => {
    store.set('lazy', ['later']);
    const h = await StuffApi.create(() => new LazyHost());
    await StuffApi.ensureHydrated(h);
    expect(h.loaded).toEqual(['later']);
    expect(calls).toHaveLength(1);
    await StuffApi.ensureHydrated(h);
    expect(calls).toHaveLength(1); // ⬅ once, not once per call
  });

  it('two concurrent faults share ONE pass', async () => {
    store.set('lazy', ['later']);
    const h = await StuffApi.create(() => new LazyHost());
    await Promise.all([
      StuffApi.ensureHydrated(h),
      StuffApi.ensureHydrated(h),
    ]);
    expect(calls).toHaveLength(1);
  });

  it('ensureHydrated on a host with nothing pending is a no-op', async () => {
    const h = await StuffApi.create(() => new EagerOptionalHost());
    calls = [];
    await StuffApi.ensureHydrated(h);
    expect(calls).toEqual([]);
  });
});

describe('a create()d object with no sources', () => {
  it('runs none, and nothing is recorded against it', async () => {
    class Plain extends Idea {}
    const h = await StuffApi.create(() => new Plain());
    expect(calls).toEqual([]);
    await StuffApi.ensureHydrated(h);
    expect(calls).toEqual([]);
  });
});
