/**
 * AetherImplant — Wave 1 implantable Stuff template.
 *
 * The default cybernetic implant every Avatar bootstrap-installs.
 * Taps the aether so the bearer can send and receive dms (and
 * future emote/chat) over the implant network. Composes:
 *   - SlottableMixin → can be placed in a Slotted host's slot.
 *   - TangibleMixin → small physical object with mass + material.
 *   - AugmentMixin → confers `AetherMixin` when installed.
 *
 * Hardened (per the augmentation slate's Wave 1 framing): no power
 * state, no fuel, no failure modes, no removal procedure in v1. A
 * future medical-procedure subsystem unlocks install/remove; for
 * now `Avatar.postRegister` (via `installDefaultLoadout`) bootstraps
 * the implant into the cranial slot idempotently.
 *
 * Diegetically: a small, brass-and-silicon device the size of a
 * coin, hardened against impact and most field damage; the
 * universal default that lets Avatars send dms to one another.
 */

import Thing from '../stuff/Thing';
import { SlottableMixin } from '../slot/Slottable';
import { TangibleMixin } from '../material/Tangible';
import { AugmentMixin } from './Augment';
import { TemplatePaths } from '../paths';

const AetherImplantBase = AugmentMixin(SlottableMixin(TangibleMixin(Thing)));

export default class AetherImplant extends AetherImplantBase {
  static readonly TEMPLATE_PATH = TemplatePaths.aetherImplant;

  override confers(): readonly string[] {
    return ['AetherMixin'];
  }
}
