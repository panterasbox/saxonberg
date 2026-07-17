/**
 * ConcealableMixin — the *presence-concealment* axis of a perceivable.
 *
 * Composing this mixin declares that a Stuff carries a single authored
 * {@link ConcealmentLevel} — "how hard is it to notice this is here?".
 * Every loose perceivable (a `Thing`, a `Creature`/`Character`, an `Exit`)
 * composes it so a designer can hide a cache, a secret door, or a lurking
 * creature, all through one representation. It defaults to `'obvious'`
 * (fully present in every viewer's world), so an un-authored thing is
 * inert — backcompat by construction.
 *
 * **The value is presence, not identity.** A concealment level answers
 * *whether* a thing resolves for a viewer at all; belief/recognition owns
 * *who* a resolved thing is. The detection gate (`PerceptionApi`, a later
 * phase) reads this field against a viewer's effective perception; this
 * mixin is the dumb carrier.
 *
 * **Carrier shape.** The durable field is the band *word*
 * (`concealment: ConcealmentLevel`, stable + human-readable in seeds),
 * validated on set. The inter-Stuff contract is the method surface
 * `getConcealment()` / `setConcealment()` / `isConcealed()` — other Stuff
 * read the band, never the raw field.
 */

import type { MixinConstructor } from '../mixin';
import type { ConcealmentLevel } from './ConcealmentLevel';
import { ConcealmentLevels } from './ConcealmentLevel';

export interface Concealable {
  /** The concealment band (`'obvious'` when not concealed). */
  getConcealment(): ConcealmentLevel;
  /** Set the concealment band; throws on an unknown band word. */
  setConcealment(level: ConcealmentLevel): void;
  /** True iff the band is anything other than `'obvious'`. */
  isConcealed(): boolean;
}

export function ConcealableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ConcealableMixin extends Base implements Concealable {
    static _mixinName = 'ConcealableMixin';
    static persistentFields = ['concealment'];

    /**
     * The concealment band; `'obvious'` (the default) = not concealed.
     * Authored on seeds that want a hidden thing (`concealment: hidden`).
     *
     * @authorable
     */
    public concealment: ConcealmentLevel = 'obvious';

    getConcealment(): ConcealmentLevel {
      return this.concealment;
    }

    setConcealment(level: ConcealmentLevel): void {
      if (!ConcealmentLevels.isLevel(level)) {
        throw new RangeError(
          `ConcealableMixin.setConcealment: unknown concealment level '${level}'`,
        );
      }
      this.concealment = level;
    }

    isConcealed(): boolean {
      return ConcealmentLevels.isConcealed(this.concealment);
    }
  };
}
