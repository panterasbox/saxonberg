/**
 * Halter — ⭐ **what a lead is made fast to** (size and carrying D18, W6).
 *
 * A strap harness on an animal's head (a halter) or a band round its neck
 * (a dog's collar): a worn garment that is also `Tieable`, so the rope's
 * `tie rope to mule` finds it (the first Tieable in `Attired.wornStack()` — worn,
 * off the hands) and makes its fixed end fast round it, the free
 * end coming to the tier's hand. The rope does the tying; the halter
 * keeps the protocol's default refusal for being tied itself to anything
 * (`tie halter to post` is not a thing a halter does — tie the rope).
 *
 * ⭐ Its row offers `placements: [from]`: the lead hangs from it, so the
 * rope in the animal's keeping is placed, not loose (the flip's
 * destination veto asks exactly that).
 *
 * Why a class and not a `Garment` row: a garment is not `Tieable`, and
 * making every garment Tieable would make any blanket or saddle a halter.
 * A halter is the one garment a lead is tied to.
 */

import Garment from '@saxonberg/server/mud/platform/thing/equipment/Garment';
import { TieableMixin } from '@saxonberg/server/mud/lib/spatial/Tieable';

export default class Halter extends TieableMixin(Garment) {}
