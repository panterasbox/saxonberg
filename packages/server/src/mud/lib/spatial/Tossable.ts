/**
 * Tossable — ⭐ **a thing you throw TO somebody** (underwater review): the
 * end of a line to a swimmer going under. `throw <thing> at <them>` is an
 * attack; `throw <thing> to <them>` is a toss they are meant to catch,
 * and the thing decides what catching it means and how far it carries (a
 * line reaches the water below a quay). One verb, `throw` — `heave` is
 * one of its words, never a verb of its own.
 *
 * ⭐ A **protocol mixin** (the `Pullable` rule): no shared state, but a
 * name — `MixinApi.isTossable`, visible in Studio. The default refuses;
 * each host overrides `tossTo`.
 *
 * **IS for:** a thing meant to be caught — the end of a line; later a
 * ball, a rope, a purse.
 * **IS NOT for:** throwing AT someone (that is `throw … at`, an attack,
 * any tangible thing), or handing over (`give`).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';

/** What a toss did, in the thing's own words. */
export type TossOutcome =
  | { ok: true; self: Mml; peers?: Mml | null }
  | { ok: false; reason: string; line: string };

/** The protocol: a thing you can throw to somebody. */
export interface Tossable {
  /** Throw this to whoever `who` names, within the thing's own reach. */
  tossTo(thrower: Stuff, who: string): Promise<TossOutcome>;
}

export function TossableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TossableMixin extends Base implements Tossable {
    static _mixinName = 'TossableMixin';

    /** @hook Override on the host: what catching it means, and how far it carries. */
    public async tossTo(thrower: Stuff, who: string): Promise<TossOutcome> {
      void thrower;
      void who;
      return { ok: false, reason: 'not-tossable', line: `${(this as unknown as Stuff).getPresentation()} is not a thing anybody catches.` };
    }
  };
}
