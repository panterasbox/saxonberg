/**
 * TravelImplant — a Teleport Authority credential as a cranial implant.
 *
 * The personal half of the credential: composes `TravelCredentialMixin` on a
 * slottable augment (mirrors `AetherImplant`'s composition). The credential
 * capability lives on the implant Stuff itself, so `confers()` is empty — the
 * `findActiveCredential` scan finds it by slot occupancy, not by conferral.
 *
 * Real, composed, and seeded content, but NOT the v1 default loadout: the
 * cranial slot is capacity-1 and already holds the AetherImplant, and v1 body
 * plans have no second implant slot. A default travel implant waits on that
 * (augmentation slot-model; see augmentation-slate open-Q5).
 */

import Thing from "../../../lib/stuff/Thing";
import { SlottableMixin } from "../../../lib/slot/Slottable";
import { TangibleMixin } from "../../../lib/material/Tangible";
import { AugmentMixin } from "../../../lib/augmentation/Augment";
import { TravelCredentialMixin } from "../../../lib/fasttravel/TravelCredential";

const TravelImplantBase = AugmentMixin(
  TravelCredentialMixin(SlottableMixin(TangibleMixin(Thing))),
);

export default class TravelImplant extends TravelImplantBase {
  static readonly TEMPLATE_PATH = "/domain/common/tpa/travel-implant";

  override confers(): readonly string[] {
    return [];
  }
}
