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
import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';

/** The mixin's marker, and the string `MixinApi.isActive` narrows on. */
export const VEHICULAR_MIXIN = 'VehicularMixin';

/** The command view every vehicle contributes. */
const JOURNEY_VIEW = 'system/transport/cmd/movement/journey.yaml';

/** What a vehicle affords, whatever it is made of. */
export interface Vehicular {
  canEvict(context: EvictionContext): VetoResult;
}

export function VehicularMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class VehicularMixin extends Base implements Vehicular {
    static _mixinName = VEHICULAR_MIXIN;

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
