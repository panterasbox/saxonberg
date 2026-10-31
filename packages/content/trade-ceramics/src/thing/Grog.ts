/**
 * Grog — ⭐ fired clay ground back to grit at the millstone (ceramics S7),
 * to open the next batch of clay. The wasters of one firing temper the
 * clay of the next.
 *
 * A quarried `Lump` in every way a consumer reads it (it pools by row, it
 * has a temperature, its MATERIAL is what the temper pit asks for), and
 * one thing a lump is not: MADE. The grinder is its maker, so it carries
 * `Crafted` — the craft mint requires it, and grinding sherds threw
 * *"output '/trade/ceramics/thing/grog' does not compose CraftedMixin"*
 * with the row on `Lump` (ceramics drive C, run 36).
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';

export default class Grog extends ThermalMixin(StackableMixin(CraftedMixin(Good))) {}
