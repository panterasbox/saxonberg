/**
 * Tieable — ⭐ **a thing whose end you make fast to something** (cordage
 * D8): a rope round a post or round a person, the free end of a line made
 * fast to a load on the bed, an air bag lashed to an anchor. ONE verb,
 * `tie`, over a protocol the thing
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

/**
 * Why a tie (or an untie, or a belay) was refused — the note's reason, and
 * the census of `TieController.refusalWords`. ⭐ A closed union (the ActPlan
 * rule): a host with a new way to refuse adds its reason here, and the
 * compiler finds the controller that must word it.
 */
export type TieReason =
  | 'not-tieable'
  | 'not-tied'
  | 'self'
  | 'out-of-reach'
  | 'not-holding'
  | 'already-tied'
  | 'no-hands'
  | 'no-such-knot'
  | 'not-a-load'
  | 'no-line'
  | 'not-in-water'
  | 'no-surface'
  | 'no-pressure'
  | 'end-taken'
  | 'sprinkler-taken'
  | 'not-a-coupling'
  | 'not-hers'
  | 'not-a-fixture'
  | 'same-room'
  | 'end-out'
  | 'not-tied-on'
  | 'cannot'
  | 'busy'
  /** ⭐ An animal wears nothing to tie a lead to (size and carrying D18). */
  | 'no-halter'
  /** No free hand for the lead's end (D18). */
  | 'hands-full';

/**
 * ⭐ A refused tie: the reason and the facts its words need — no sentence
 * (controller-liquidity D8: `line:` leaves every refusal; the words are
 * `TieController`'s, and an alternate controller words them its own way).
 */
export interface TieRefusal {
  ok: false;
  reason: TieReason;
  facts: {
    /** The thing being tied (the rope, the end, the bag, the hose). */
    gear: Stuff;
    /** What it was to be tied to — or the person on its end, for a belay. */
    load?: Stuff;
    /** What it is already fast to, or the structure it is not aboard. */
    on?: Stuff;
    /** The knot asked for, as asked. */
    knot?: string;
  };
}

/**
 * What a tie did. ⚠ The DONE limb still carries the thing's own sentence
 * (`line`, `peers`) — refusals were moved to facts by controller-liquidity W4
 * and the done words wait for the pack lanes (the Tieable row in the plan's
 * Appendix B).
 */
export type TieOutcome =
  | { ok: true; line: string; peers?: string | null }
  | TieRefusal;

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
      void knot;
      return { ok: false, reason: 'not-tieable', facts: { gear: this as unknown as Stuff, load } };
    }

    /** @hook Override on the host: what casting it off means. */
    public async untieBy(by: Stuff): Promise<TieOutcome> {
      void by;
      return { ok: false, reason: 'not-tied', facts: { gear: this as unknown as Stuff } };
    }
  };
}
