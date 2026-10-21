/**
 * FlowerPot — ⭐ a potter's plant pot (ceramics D17): the kernel's
 * `PlantPot` (a bed with one slot) made by a potter — green until fired, it
 * has a temperature, it wears and it breaks. The farm's own fixture pots
 * stay the kernel class; this is what the pottery sells.
 */

import PlantPot from '@saxonberg/server/mud/platform/thing/PlantPot';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';

const FlowerPotBase = GreenwareMixin(
  WaterActivityMixin(ThermalMixin(DurableMixin(CraftedMixin(PlantPot)))),
);

export default class FlowerPot extends FlowerPotBase {}
