/**
 * Bagasse — the crushed cane fibre off the mill, and the boiling house's
 * fuel (sugar D17). Wet off the rollers it will not catch; a day spread on
 * the ground and it burns. Turf's twin: a `Firewood` that knows how wet it
 * is (no dependency on the quarrying pack).
 */

import Firewood from '@saxonberg/server/mud/platform/thing/Firewood';
import { MoistureMixin } from '@saxonberg/server/mud/lib/material/Moisture';

export default class Bagasse extends MoistureMixin(Firewood) {}
