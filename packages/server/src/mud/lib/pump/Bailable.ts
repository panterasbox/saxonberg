/**
 * BailableMixin — ⭐ **a thing you bail, a bucketful at a time** (harbors
 * P21, B5).
 *
 * `bail` is ONE act — fill a bucket, lift it, tip it — and before this
 * build it was a trade's verb for a single target (the driller's bailer
 * down a bore). A boat taking water is bailed the same way, so the verb
 * moved to the platform (`platform/cmd/device/bail.yaml`) behind this
 * protocol, and each thing that can be bailed says what one spell of it
 * is: the ladder's first rung, *unify behind an interface*.
 *
 * - A **boat** (transport): her bilge, over the side, by hand or with a
 *   bailer — what keeps a holed boat up.
 * - A **wellhead** (drilling): the bailer down the hole on the derrick's
 *   rope — what clears a bore, and what brings up the answer.
 *
 * Two phases, because the act takes game time (the `Pumpable` shape):
 * {@link Bailable.planBail} answers a plan or a refusal with no side
 * effects; {@link Bailable.completeBail} lands the spell, once, at
 * completion, and tells the bailer what came of it. The controller knows
 * nothing about bores or bilges.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Mml } from '../../api/mml';

/** What the bailer brought along: what to tip it into, and what to bail with. */
export interface BailRequest {
  /** A vessel to tip the bucketful into, or `null` (over the side, into the trough). */
  vessel: Stuff | null;
  /** The tool in hand — a bailer, a bucket — or `null` (bare hands). */
  tool: Stuff | null;
}

/** One spell of bailing, planned. No side effects. */
export interface BailPlan {
  kind: 'plan';
  /** Game-ms the spell occupies the hands. */
  durationMs: number;
  /** Endurance a fresh body spends on it, percentage points (`EngagedActController`). */
  cost: number;
  beginSelf: Mml;
  beginPeers?: Mml | null;
  /** The host's own bookkeeping, handed back at completion. */
  token: unknown;
}

/** Why not, in the thing's own words, with a reason a note can carry. */
export interface BailRefusal {
  kind: 'refusal';
  reason: string;
  line: Mml;
}

export interface Bailable {
  /** One spell, planned — or the thing's refusal. */
  planBail(by: Stuff, req: BailRequest): Promise<BailPlan | BailRefusal>;
  /** The spell, landed; the thing tells `by` what came of it. */
  completeBail(by: Stuff, req: BailRequest, token: unknown): Promise<void>;
}

export function BailableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class BailableMixin extends Base implements Bailable {
    static _mixinName: string = 'BailableMixin';

    /**
     * @hook Override: what one spell of bailing this is. The default is
     *   the honest answer for a composer that has not said — there is
     *   nothing to bail.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async planBail(_by: Stuff, _req: BailRequest): Promise<BailPlan | BailRefusal> {
      return { kind: 'refusal', reason: 'nothing-to-bail', line: Mml.compose`There is nothing to bail out of that.` };
    }

    /** @hook Override: land the spell. Default: nothing happens. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async completeBail(_by: Stuff, _req: BailRequest, _token: unknown): Promise<void> {
      return;
    }
  };
}
