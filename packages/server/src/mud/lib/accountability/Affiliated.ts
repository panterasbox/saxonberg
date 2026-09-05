/**
 * AffiliatedMixin — **who answers for you.**
 *
 * The harm ledger already names two persons (`killer` and `victim`). What
 * it lacked is their two *parties*. This mixin is the read that supplies
 * them: the standing institution that fields a character, whether or not
 * anybody gave an order on the day.
 *
 * ⚠ **It is NOT `directedBy`, and folding them together would be a lie
 * the governance design is careful never to tell by accident:**
 *
 *   | | |
 *   |---|---|
 *   | `directedBy` | **episodic** — a captain's recorded directive began *this act* |
 *   | the institution | **standing** — this person is fielded by X, order or no order |
 *
 * A guard acting for the watch was not *directed* by the watch on this
 * occasion. Conflating them would make every institutional act read as a
 * command.
 *
 * ⭐ **Two attributions or one — same field, different arity.** A `Cast`
 * member carries both, and both are real: Odile's bad ruling is Odile's
 * act *and* the Registry's failure, which is how offices work. A sentient
 * `Extra` has no identity of its own, so its institutional attribution is
 * the only one it has. A wolf has neither, and answers to nobody forever.
 *
 * ## The chain
 *
 * The shape this codebase uses everywhere (`LocomotionApi.defaultModeFor`,
 * the biome outward walk, the address longest-prefix):
 *
 *   1. an authored `institution:` — explicit wins;
 *   2. else **the employer** — the first still-active `Employment`'s
 *      `organizationPath`. ⭐ The plan expected to have to *write* this
 *      reverse lookup (`organization → people` shipped; `person →
 *      organization` did not). It is already there:
 *      `EmployedMixin.getActiveEmployment()`. Tier 2 is free.
 *   3. else `null`.
 *
 * ⚠⚠ **Resolved from the DECLARED affiliation, never the current
 * location.** A guard who walks into a tavern does not become the
 * tavern's. There is no containment read anywhere in this file, and that
 * is the one way to get this obviously wrong.
 *
 * ## ⚠ Why the parcel tier is not here (D10)
 *
 * The plan's third tier was `ParcelApi.ownerOf(<declared home>)`. It is
 * deferred, for three reasons that compound:
 *
 *   - **It is async.** Combat appends its rows in the *synchronous*
 *     prefix of the beat, deliberately — the coup choreography reads the
 *     ledger in the same turn as the killing blow. An await there would
 *     be a real behaviour change to buy a tier with no consumer.
 *   - **It has no consumer.** Tier 3's only input is
 *     `Character.getDomicileAddress()`, authored on exactly ONE row in
 *     the shipped world (Odile) — who is employed, so tier 2 answers her
 *     first.
 *   - **Two of the three owner kinds would be wrong anyway.** A parcel's
 *     owner may be a wizard `group` or a `player`; neither is an
 *     institution in the fiction, and attributing the watch's losses to
 *     the `lounge` wizard group is worse than attributing them to
 *     nobody.
 *
 * ⭐ The honest answer for someone with no employer and no authored
 * institution is *nobody fields you* — and `lint:identity` turns that
 * into a build error for a sentient `Extra`, so an **author** is told
 * rather than the engine guessing from ground title.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';

/** Public method surface (methods only — `institution` is Hydrator-facing). */
export interface Affiliated {
  /** The authored override, or `null`. */
  getInstitution(): string | null;
  /** Set the authored override (an identity path-string). */
  setInstitution(value: string | null): void;
  /**
   * The party that fields this character — authored, else employer, else
   * `null`. Synchronous by construction; see the class doc.
   */
  institutionPath(): string | null;
}

export function AffiliatedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AffiliatedMixin extends Base implements Affiliated {
    static _mixinName = 'AffiliatedMixin';

    /**
     * The authored institution — an **identity path-string**, not a live
     * ref. It has to survive a reclone, and holding a live `Business`
     * would keep that business resident for as long as any of its people
     * are standing; see `ref-shapes.md`.
     */
    static fieldMeta: FieldMeta = {
      institution: { ref: 'identity', persistent: true, authorable: true },
    };

    public institution: string | null = null;

    public getInstitution(): string | null {
      return this.institution;
    }

    public setInstitution(value: string | null): void {
      if (value !== null && typeof value !== 'string') {
        throw new TypeError(
          'AffiliatedMixin.institution must be a path string or null',
        );
      }
      const trimmed = value?.trim() ?? '';
      this.institution = trimmed.length > 0 ? trimmed : null;
    }

    public institutionPath(): string | null {
      // 1 — explicit wins.
      if (this.institution) return this.institution;
      // 2 — the employer. `getActiveEmployment` is the person→organization
      // direction, and it is already shipped.
      const self = this as unknown as Stuff;
      if (MixinApi.isEmployed(self)) {
        const employment = self.getActiveEmployment();
        const path = employment?.organizationPath;
        if (path) return path;
      }
      // 3 — nobody fields you, and the world should say so out loud.
      return null;
    }
  };
}
