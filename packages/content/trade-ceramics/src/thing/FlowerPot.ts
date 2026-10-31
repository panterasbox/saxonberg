/**
 * FlowerPot — ⭐ a potter's plant pot (ceramics D17): the kernel's
 * `PlantPot` (a bed with one slot) made by a potter — green until fired, it
 * has a temperature, it wears and it breaks. The farm's own fixture pots
 * stay the kernel class; this is what the pottery sells.
 */

import PlantPot from '@saxonberg/server/mud/platform/thing/PlantPot';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { MoistureMixin } from '@saxonberg/server/mud/lib/material/Moisture';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';

/**
 * ⭐ A potter's own pot says how it came out and whose it is — the
 * `GradedReceptacle` mark rule: an import with no maker says nothing. The
 * pot composed `Crafted` and nothing rendered it, so the consigned pot a
 * buyer took home off the stall read no maker at all (drive C, run 39).
 */
const verdictAugmenter: MarkupAugmenter = (text: string, host: Stuff, viewer: Stuff): string => {
  if (!MixinApi.isCrafted(host) || host.getMaker() === '') return text;
  const verdict = host.renderVerdict(viewer);
  return text && text.length > 0 ? `${text}\n\n${verdict}` : verdict;
};

const FlowerPotBase = GreenwareMixin(
  MarkedMixin(MoistureMixin(ThermalMixin(DurableMixin(CraftedMixin(PlantPot))))),
);

export default class FlowerPot extends FlowerPotBase {
  static markupAugmenters: MarkupAugmenter[] = [verdictAugmenter];
}
