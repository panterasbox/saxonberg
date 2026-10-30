/**
 * SaltPan — ⭐⭐ **the pan the sun works, and the shape the salt sets in**
 * (ceramics S17, W8).
 *
 * Two kernel substrates, and the pan is exactly both: a `Mould` (the crop
 * sets in the pan's own shape and is KEPT there — `castTemplate` — and the
 * spent liquor runs off into the vessel it stands on, `drainsInto()`) and
 * a maturing vessel (the `brine` evaporative profile takes the water away
 * at the air's rate, and rain puts it back). The kernel's `Mould` composes
 * no maturation and the `Vat` keeps no cast, so the pan is the one place
 * the two meet — a class of the trade that owns salt pans.
 *
 * ⭐ Nothing here but composition. The crystallizing is the phase engine's
 * (`ThermalMixin` — the crystallize arm); the concentration is the
 * evaporative window's; which of the two the liquor is waiting on is read
 * off this pan's batch phase. A second saltern is this row again.
 */

import Mould from '@saxonberg/server/mud/platform/thing/Mould';
import { MaturingMixin } from '@saxonberg/server/mud/lib/maturation/Maturing';
import { VesselKindMixin } from '@saxonberg/server/mud/lib/bulk/VesselKind';

export default class SaltPan extends VesselKindMixin(MaturingMixin(Mould)) {}
