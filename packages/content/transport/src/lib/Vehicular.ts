/**
 * VehicularMixin — ⭐⭐ **the thing that can make a journey**, and the one
 * place that says so.
 *
 * A wagon, a barge and a coach are three unrelated compositions — one is
 * `Haulable` and deliberately not `Mobile`, one is a `Drivable` vessel
 * that steers itself, one is a sealed carriage — and yet all three are
 * the same thing to a traveller: something you take somewhere. That
 * shared identity had no home, so it was being spelled out three times
 * and reconstructed a fourth:
 *
 * | was | where |
 * |---|---|
 * | the `journey` affordance | copied verbatim onto all three classes |
 * | the residency veto | on `Barge` and `Coach` — ⚠ and **missing from `HaulageRig`**, so a parked wagon was cullable and a parked barge was not |
 * | *"what counts as a vehicle"* | re-derived caller-side in `JourneyController` as `isHaulable ‖ (isDrivable ∧ isMobile)` |
 *
 * ⭐ That last row is the tell. A guard that re-narrows the host set is
 * a mixin trying to exist: the controller was inferring a category the
 * type system could have carried, which means a fourth kind of vehicle
 * would have had to be remembered in a boolean in a different file.
 *
 * ## ⚠ Why this is the PACK's mixin and never the kernel's
 *
 * The kernel must not know that `journey` exists — a verb lives with the
 * pack whose content affords it, and *"content commands are afforded by
 * content, never by a core mixin"*. That rule is about the KERNEL not
 * knowing content verbs, and it is untouched here: this mixin is the
 * transport pack's own substrate under its own root, exactly as
 * `arcana`'s `ManaPowered`, `trade-mining`'s `Working` and `tpa`'s
 * `FastTravel` are theirs. The affordance is collected because
 * `collectBucketDefs` reads `commandContributions` *"off the class and
 * every mixin in its chain"*.
 *
 * ⭐ And a realm shipping a fourth kind of cart still writes **no pack
 * code**: a row naming an existing class gets everything. A new vehicle
 * CLASS now composes this instead of copying two statics and forgetting
 * one of them.
 *
 * ## Narrowing
 *
 * `MixinApi.isActive(thing, VEHICULAR_MIXIN)`. ⚠ Not `hasMixin`: that
 * takes `MixinName`, a closed union off the kernel's `Mixins` registry,
 * and **a pack must never need a kernel list edit**. The marker-string
 * form is the shipped pack pattern.
 */

import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { EvictionContext, Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** The mixin's marker, and the string `MixinApi.isActive` narrows on. */
export const VEHICULAR_MIXIN = 'VehicularMixin';

/** The command view every vehicle contributes. */
const JOURNEY_VIEW = 'system/transport/cmd/movement/journey.yaml';

/** What a vehicle affords, whatever it is made of. */
export interface Vehicular {
  canEvict(context: EvictionContext): VetoResult;
  /**
   * ⭐⭐ How this vehicle travels: `wheeled`, `sailed`, … See
   * {@link VehicularMixin.getTravelMode} for why it lives here.
   */
  getTravelMode(): string;
  setTravelMode(value: string): void;
}

export function VehicularMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class VehicularMixin extends Base implements Vehicular {
    static _mixinName = VEHICULAR_MIXIN;

    /**
     * ⚠ NO spread of `Base.fieldMeta`. `MixinApi.getAllFieldMeta`
     * collects these up the prototype chain, own-property only, with a
     * PROPERTY-level merge — so a mixin declares only its own fields
     * and the base's keep working. Spreading the base in would copy a
     * snapshot of it into this class, which is how a declaration goes
     * stale without anybody editing it.
     */
    static fieldMeta: FieldMeta = {
      // ⚠⚠ NO underscore, and the gate is why. `lint:instanceable`'s
      // orphan-key check compares a row's `data:` keys against the
      // declared `fieldMeta` keys literally, so `_travelMode` would
      // make every row authoring `travelMode:` read as a key no field
      // declares — a key the applier "discards silently" — and the
      // honest fix is the NAME, not a ceiling rise. `Exit.media` and
      // `Exit.wheelPassable` are the precedent: an ordinary authorable
      // persistent field carries no prefix. The `_` convention is for
      // a sealed-mutation surface, which this is not.
      travelMode: { persistent: true, authorable: true },
    };

    /**
     * ⭐⭐ **How this vehicle travels, declared on the vehicle.**
     *
     * Until this build the LANE knew and the vehicle did not: a
     * Journey took its mode from `lane.mode`, which meant `journey to
     * <stop> via estuary` with a wagon hitched made the wagon **sail**
     * — and it died at the first leg, because a road exit does not
     * admit the water medium. A fact about a wagon was being read off
     * the road it happened to be told to take.
     *
     * ⚠ A vehicle that declares no mode REFUSES rather than guessing.
     * Defaulting to `wheeled` would make a barge a cart on the first
     * row somebody forgot, and the failure would be a drowned hauler
     * three legs later rather than a refusal at the verb.
     */
    protected travelMode: string = '';

    public getTravelMode(): string {
      return this.travelMode;
    }

    public setTravelMode(value: string): void {
      this.travelMode = typeof value === 'string' ? value.trim() : '';
    }

    /**
     * ⭐ `peers` AND `environment`: the vehicle grants `journey` to
     * whoever is standing beside it, and to anyone riding in it. Both,
     * because a passenger is inside the thing and a driver is next to
     * it, and neither should have to guess which.
     */
    static commandContributions: CommandContributions = {
      peers: [JOURNEY_VIEW],
      environment: [JOURNEY_VIEW],
    };

    /**
     * ⚠ **Residency veto.** A vehicle standing on a road or tied up on a
     * reach is *not* cold clutter — it is somebody's capital, parked
     * exactly where they left it. The self-eviction sweep would
     * otherwise cull an idle one and the owner would come back to
     * nothing, with no error anywhere. The shipped `Exit` precedent,
     * applied to the other kind of object that legitimately sits still
     * for a long time.
     *
     * ⚠⚠ It lived on `Barge` and `Coach` and **not** on `HaulageRig`,
     * which is exactly the bug a copied static invites: a parked wagon
     * was cullable and a parked barge was not, for no reason anybody
     * chose. Composing the category fixes it by construction.
     */
    public canEvict(_context: EvictionContext): VetoResult {
      return { ok: false, reason: 'a parked vehicle is capital, not clutter' };
    }
  }
  return VehicularMixin;
}
