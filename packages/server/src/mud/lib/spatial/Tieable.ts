/**
 * Tieable — ⭐ **a thing whose end you make fast to something** (cordage
 * D8): a rope round a post or round a person, the free end of a line made
 * fast to a load on the bed, an air bag lashed to an anchor. ONE verb,
 * `tie` (`lash` is one of its words), over a protocol the thing
 * implements — the verb-collision ladder's first rung: tying a rope to a
 * post and lashing a bag to an anchor are the same act on different
 * things, and the thing decides what it means.
 *
 * ⭐ A **protocol mixin** (the `Pullable` rule): no shared state, but a
 * name — `MixinApi.isTieable`, visible in Studio. The default refuses;
 * each host overrides `tieTo` and `untieBy`.
 *
 * **IS for:** a thing with an end that is made fast — a rope, a line's
 * end, a lifting bag.
 * **IS NOT for:** fastening parts into an assembly (`fit` — a knot is a
 * joint row, but tying a rope to a post builds nothing), or binding a
 * person (`prison-slate`).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** What a tie did, in the thing's own words. */
export type TieOutcome =
  | { ok: true; line: string; peers?: string | null }
  | { ok: false; reason: string; line: string };

/** The protocol: a thing whose end is made fast to something. */
export interface Tieable {
  /**
   * Make this fast to `load` — a person, a fixture, a thing on the bed.
   * `knot` is the knot the tier named (a joint row's label or key), or
   * `null` for the thing's own default.
   */
  tieTo(by: Stuff, load: Stuff, knot: string | null): Promise<TieOutcome>;
  /** Cast this off whatever it is made fast to. */
  untieBy(by: Stuff): Promise<TieOutcome>;
}

export function TieableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TieableMixin extends Base implements Tieable {
    static _mixinName = 'TieableMixin';

    /** @hook Override on the host: what making it fast to `load` means. */
    public async tieTo(by: Stuff, load: Stuff, knot: string | null): Promise<TieOutcome> {
      void by;
      void load;
      void knot;
      return { ok: false, reason: 'not-tieable', line: `${(this as unknown as Stuff).getPresentation()} has no end to tie.` };
    }

    /** @hook Override on the host: what casting it off means. */
    public async untieBy(by: Stuff): Promise<TieOutcome> {
      void by;
      return { ok: false, reason: 'not-tied', line: `${(this as unknown as Stuff).getPresentation()} is not tied to anything.` };
    }
  };
}
