/**
 * AetherImplant — Wave 1 implantable Stuff template.
 *
 * The default cybernetic implant every un-attuned Avatar bootstrap-
 * installs. Taps the aether so the bearer becomes **attuned** — able to
 * perceive aether transmissions and to *host* capability updates (comms,
 * the travel credential), which `Avatar.installDefaultLoadout` injects.
 * Composes:
 *   - SlottableMixin → can be placed in a Slotted host's slot.
 *   - TangibleMixin → small physical object with mass + material.
 *   - AugmentMixin → confers `AetherMixin` (attunement) when installed.
 *
 * The implant is purely the attunement conferrer now — it no longer
 * carries any credential directly (those live in the hosted
 * `CredentialWalletUpdate`).
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

import Thing from '../lib/stuff/Thing';
import { SlottableMixin } from '../lib/slot/Slottable';
import { TangibleMixin } from '../lib/material/Tangible';
import { AugmentMixin } from '../lib/augmentation/Augment';
import { TemplatePaths } from '../lib/paths';

// The baseline implant confers attunement only — credentials are no
// longer carried here. They live in the hosted `CredentialWalletUpdate`
// that `Avatar.installDefaultLoadout` injects into the host alongside
// the comms + forums updates. One conferrer, hosted updates carry the rest.
const AetherImplantBase = AugmentMixin(
  SlottableMixin(TangibleMixin(Thing)),
);

export default class AetherImplant extends AetherImplantBase {
  static readonly TEMPLATE_PATH = TemplatePaths.aetherImplant;

  override confers(): readonly string[] {
    return ['AetherMixin'];
  }
}
