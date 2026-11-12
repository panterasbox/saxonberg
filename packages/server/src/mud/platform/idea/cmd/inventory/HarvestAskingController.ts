/**
 * HarvestAskingController — ⭐⭐ the third limb's exemplar (controller-liquidity
 * D8): **the same harvest, but it asks.** Where `HarvestController` refuses a
 * divided field named without a part — *"Which field? Name one: the top end
 * or the lane end."* — this one puts the fields in front of the player as a
 * prompt and cuts the one they pick. Everything else (the crop, its grade,
 * the swath, the duration) is exactly what the shipped controller makes,
 * because neither of them decides any of it.
 *
 * It could not be written before W4: the GROUND wrote the sentence and chose
 * to refuse, so a controller could only change the words, never make the
 * act ask. Now the ground answers the parts as a choice, and asking is one
 * overridden method. A wizard re-points the `harvest` view's `controller:`
 * here (the drive's step 2).
 *
 * ⚠ With nobody to ask — a script, a brain — `chooseAmong` notes
 * `needs-input` and this falls back to the shipped refusal with the list
 * (script-interaction's fail-closed rule).
 */

import type { CommandContext } from '../../../../api/command';
import type { HarvestChoices } from '../../../../lib/husbandry/Growing';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import HarvestController, { type HarvestModel } from './HarvestController';

export default class HarvestAskingController extends HarvestController {
  protected override async choose(
    context: CommandContext,
    c: HarvestChoices,
    model: HarvestModel,
  ): Promise<Stuff | null> {
    if (c.reason !== 'part-unnamed') return super.choose(context, c, model);
    const pick = await this.chooseAmong(context, c.choices, `which ${c.facts.noun}`);
    return pick ?? super.choose(context, c, model);
  }
}
