/**
 * Tub — ⭐ a vessel something stands ON (ceramics W8): a `Vat` that offers
 * a placement, so a salt pan set on it drains its bittern into it
 * (`Mould.drainsInto()` reads the vessel a mould stands on). `put pan on
 * tub` is the whole arrangement.
 *
 * ⚠ The trade-sugar pack ships the same shape (`CuringPot`, a sugar cone's
 * pot) — two packs with no common ancestor wanting one substrate is the
 * signal to promote it to the kernel; recorded for the merge, not done in
 * a trade build.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';

export default class Tub extends PlacingMixin(Vat) {}
