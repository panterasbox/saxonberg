/**
 * Loaf — bread you can hold, and the far end of the whole chain.
 *
 * `StalingMixin(NutritionLabelMixin(Provision))`. Three things it is, in
 * order of how surprising they are:
 *
 *  1. a **`Provision`** — so it spoils, carries a maker's mark and a
 *     grade, has a temperature, and (since the grain chain) carries a
 *     doneness dose and a **composition**;
 *  2. a **`NutritionLabel`** host — the second composer beside `Dish`,
 *     because a loaf is the first tangible food whose label is not just
 *     its material: it is made of what the miller decided to keep;
 *  3. a **`Stales`** host — ⭐ the one thing on this list that is not
 *     spoilage and must never be confused with it.
 *
 * ## ⭐⭐ The appearance is WORDS for a continuous number
 *
 * `white loaf` / `brown loaf` / `wholemeal loaf` are phrases derived
 * from the bran share in the loaf's composition. They are presentation
 * and nothing else: **no recipe, no price, no grade and no mechanism
 * anywhere reads them.** A loaf at 0.61 extraction and one at 0.62 may
 * both read "white" and are still different objects that feed you
 * differently — which is the right way round. Banding is presentation;
 * the mechanism stays continuous.
 */

import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import { NutritionLabelMixin } from '@saxonberg/server/mud/lib/metabolism/NutritionLabel';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StalingMixin } from '../lib/Staling';

/** The bran materials a loaf's composition may name. */
const BRAN_PATHS = ['/stuff/idea/material/food/bran'];

/**
 * The share of this loaf's composition that is bran, `[0, 1]`. `0` for a
 * loaf that knows nothing about what it is made of — which reads as
 * plain bread rather than as white bread, and that distinction is
 * deliberate: not knowing is not the same as being pale.
 */
export function branShareOf(host: Stuff): number {
  if (!MixinApi.isComposed(host)) return 0;
  const parts = host.getComposition();
  let bran = 0;
  let total = 0;
  for (const p of parts) {
    total += p.servings;
    if (BRAN_PATHS.includes(p.materialPath)) bran += p.servings;
  }
  return total > 0 ? bran / total : 0;
}

/**
 * ⭐ Words for a continuous number. Nothing mechanical reads this; it is
 * how a loaf LOOKS, and two loaves that read the same may still be
 * different matter.
 */
function crumbPhrase(share: number): string | null {
  if (share <= 0) return null;
  if (share < 0.06) return 'The crumb is fine and very white.';
  if (share < 0.15) return 'The crumb is pale, with a faint fleck to it.';
  if (share < 0.24) return 'The crumb is brown and speckled through.';
  return 'The crumb is dark and coarse, the bran plain in it.';
}

function crumbAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (host.isDestroyed()) return text;
  const line = crumbPhrase(branShareOf(host));
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export default class Loaf extends StalingMixin(NutritionLabelMixin(Provision)) {
  static markupAugmenters: MarkupAugmenter[] = [crumbAugmenter];
}
