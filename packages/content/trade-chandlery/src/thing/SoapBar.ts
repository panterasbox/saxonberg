/**
 * SoapBar — a bar of hard soap, cut from the frame and CURING on a rack
 * (cleanliness D24).
 *
 * ⭐ It cures the way a board seasons: water leaving a solid into the air
 * it stands in, over its material's `seasoningDays` (hard soap, four
 * weeks) — `SeasoningMixin`, read over the same water model as every drying solid. A bar cut short is HARSH on
 * skin and cloth; a cured one is mild. `look` tells you which before you
 * wash with it. Doctrine-legal (§ 3a): the clock started at an act, it is
 * a legible physical process, and it only ever improves the bar.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { SeasoningMixin } from '@saxonberg/server/mud/lib/maturation/Seasoning';
import { MoistureMixin } from '@saxonberg/server/mud/lib/material/Moisture';

export default class SoapBar extends SeasoningMixin(MoistureMixin(Good)) {
  public override seasonPhrase(fraction: number): string {
    return fraction >= 0.95
      ? 'It is well cured — hard, pale and mild.'
      : this.isSeasoned()
        ? 'It has cured enough to use kindly.'
        : fraction >= 0.15
          ? 'It is still curing — soft at the edges, and harsh.'
          : 'It is green soap, still sweating — it would take the skin off you.';
  }
}
