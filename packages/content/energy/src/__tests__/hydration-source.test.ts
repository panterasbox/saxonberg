/**
 * ⭐⭐ **A PACK author's mixin can carry remembered state, captured and
 * hydrated, with no kernel change at all.**
 *
 * That is an acceptance criterion of the hydration build, and it is
 * satisfied by COMPOSITION rather than by a declaration the row makes:
 * the framework is four statics on a mixin's returned class, and the
 * walk that finds them (`MixinApi.getPersistenceContributors`) reads the
 * prototype chain. A pack mixin is found by the same walk as a kernel
 * one, so there is no list to add to, no `Mixins` constant to edit (a
 * pack cannot edit that const — it is kernel source), and nothing to
 * forget.
 *
 * ⭐ **The proof is that this file is the whole change.** Its kernel diff
 * is empty. If the framework needed a kernel edit to admit a pack's
 * source, this test could not exist without one.
 *
 * ⚠ It uses a FIXTURE mixin rather than converting a shipped one, on
 * purpose: no pack mixin has remembered state in a non-`holder_snapshots`
 * source today (a `restoreSlice` grep across every pack's `src/` found zero
 * before this build), so converting one would be inventing a consumer to
 * justify the mechanism. The energy pack is the host because it already
 * ships a `src/lib/`; any pack with a vitest would do.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type {
  CaptureContext,
  HydrateContext,
  HydrationSource,
  HydrateOutcome,
  MixinSlice,
} from '@saxonberg/server/mud/lib/persistence/PersistenceSlice';

/** The pack's own "source" — a store the kernel knows nothing about. */
const packStore = new Map<string, number>();
let reachable = true;

/**
 * A pack-owned mixin that keeps a reading somewhere of its own choosing,
 * declaring BOTH halves of the framework: the record slice (for a host
 * that persists itself) and the source (for one that does not).
 */
function MeteredMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class MeteredMixin extends Base {
    static _mixinName: string = 'PackMeteredMixin';

    static fieldMeta: FieldMeta = {
      meterRead: { persistent: true },
    };

    public meterRead = 0;

    // ── the record half ──
    static captureSlice(host: Stuff, _ctx: CaptureContext): MixinSlice {
      const self = host as unknown as { meterRead: number };
      return { meterRead: self.meterRead } as unknown as MixinSlice;
    }

    static async hydrateSlice(
      host: Stuff,
      slice: MixinSlice,
      _ctx: HydrateContext,
    ): Promise<void> {
      const s = slice as unknown as { meterRead?: number };
      if (typeof s.meterRead !== 'number') return;
      (host as unknown as { meterRead: number }).meterRead = s.meterRead;
    }

    // ── the source half ──
    static hydrationSource: HydrationSource = {
      name: 'pack-meter-store',
      required: false,
    };

    static async hydrateFromSource(host: Stuff): Promise<HydrateOutcome> {
      if (!reachable) {
        return { status: 'unreachable', reason: 'pack store closed' };
      }
      const key = host.getTemplatePath() ?? host.stuffId;
      const read = packStore.get(key);
      if (read === undefined) {
        return { status: 'skipped', reason: 'nothing recorded for this host' };
      }
      (host as unknown as { meterRead: number }).meterRead = read;
      return { status: 'hydrated' };
    }
  };
}

class PackMeter extends MeteredMixin(Idea) {}

beforeEach(() => {
  packStore.clear();
  reachable = true;
  StuffApi.clearAll();
});
afterEach(() => StuffApi.clearAll());

describe("a pack mixin's remembered state", () => {
  it('⭐ is found by the kernel walk, with no kernel edit', () => {
    const mine = MixinApi.getPersistenceContributors(PackMeter).find(
      (c) => c.key === 'PackMeteredMixin',
    );
    expect(mine).toBeDefined();
    expect(mine!.fields).toEqual(['meterRead']);
    expect(mine!.captureSlice).toBeDefined();
    expect(mine!.hydrateSlice).toBeDefined();
    expect(mine!.source).toMatchObject({
      name: 'pack-meter-store',
      required: false,
    });
  });

  it('captures and hydrates through the record half', async () => {
    const live = await StuffApi.create(() => new PackMeter());
    live.meterRead = 41;
    const slice = PackMeter.captureSlice(live as never, {} as never);

    const reborn = await StuffApi.create(() => new PackMeter());
    await PackMeter.hydrateSlice(reborn as never, slice, {} as never);
    expect(reborn.meterRead).toBe(41);
  });

  it('⭐ and is driven at MINT through the source half, with no record', async () => {
    const { Stuff } = await import('@saxonberg/server/mud/lib/stuff/Stuff');
    packStore.set('/system/energy/thing/meter-under-test', 7);
    const host = await StuffApi.create(() => {
      const o = new PackMeter();
      Stuff._stampTemplatePath(o, '/system/energy/thing/meter-under-test');
      return o;
    });
    expect(host.meterRead).toBe(7);
  });

  it('an unreachable optional source is a skip, not a failed mint', async () => {
    reachable = false;
    const host = await StuffApi.create(() => new PackMeter());
    expect(host.isDestroyed()).toBe(false);
    expect(host.meterRead).toBe(0);
  });
});
