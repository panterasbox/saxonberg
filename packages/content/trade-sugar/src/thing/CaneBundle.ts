/**
 * CaneBundle — a bundle of cut cane, and ⭐ **what cane is planted from**
 * (cover build D15). Cane sets no seed worth sowing; a field is planted
 * by laying cut lengths of stalk in the furrow, each joint sprouting. So
 * the bundle a cutter carries to the mill is the same thing a planter
 * lays in a fresh-ploughed piece — `sow cane` takes it, no new act.
 *
 * ⚠ Not `Crop` alone (a sack of wheat is not planted, it is milled), and
 * not `Seed` (a bundle is crushed at the mill like any crop). A crop
 * that is ALSO plantable is the composition, and nothing else in the
 * game is one.
 */

import Crop from '@saxonberg/server/mud/platform/thing/Crop';
import { PlantableMixin } from '@saxonberg/server/mud/lib/husbandry/Plantable';

export default class CaneBundle extends PlantableMixin(Crop) {}
