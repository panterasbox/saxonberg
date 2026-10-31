/**
 * Spliceable — ⭐ **a thing you splice** (cordage D9): two ropes laid into
 * one, a cut feeder line made whole at its pole. ONE verb, `splice`, over a
 * protocol the thing implements (the verb-collision ladder's first rung):
 * the lineman's repair and the rigger's long splice are the same act — the
 * strands of two ends worked back into each other — on different things,
 * and the thing decides what it means.
 *
 * ⭐ A **protocol mixin** (the `Pullable` rule): no shared state, but a
 * name — `MixinApi.isSpliceable`, and a view can bind by it. The default
 * refuses; each host overrides `spliceBy`.
 *
 * **IS for:** a rope spliced to another rope, a cut line spliced at its pole.
 * **IS NOT for:** tying (`tie` — a knot comes undone and a splice is cut
 * out), or fitting parts into an assembly (`fit`).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** What a splice did, in the thing's own words. */
export type SpliceOutcome =
  | { ok: true; line: string; peers?: string | null }
  | { ok: false; reason: string; line: string };

/** The protocol: a thing you can splice. */
export interface Spliceable {
  /**
   * Splice this — to `other` (a second rope), or, with `null`, back into
   * itself (a cut line made whole).
   */
  spliceBy(by: Stuff, other: Stuff | null): Promise<SpliceOutcome>;
}

export function SpliceableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SpliceableMixin extends Base implements Spliceable {
    static _mixinName = 'SpliceableMixin';

    /** @hook Override on the host: what splicing it (to `other`) means. */
    public async spliceBy(by: Stuff, other: Stuff | null): Promise<SpliceOutcome> {
      void by;
      void other;
      return { ok: false, reason: 'not-spliceable', line: `You cannot splice ${(this as unknown as Stuff).getPresentation()}.` };
    }
  };
}
