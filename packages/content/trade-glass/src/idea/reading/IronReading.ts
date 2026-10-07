/**
 * IronReading — `analyze iron <thing>`: how much iron is in a piece of
 * glass stock, and therefore what colour it will come out. The supply
 * side of the sand pit's whole economics (glass build W3/W4).
 *
 * ⭐ Competence resolves DETAIL, never access (the instrumentation
 * doctrine): anybody can look, and an untrained eye reads a band word —
 * *pale and clean*, *a touch of colour in it*, *rusty with it* — while a
 * proficient glassmaker reads the figure itself. The channel is flat over
 * anything `Alloyed` (sand, a melt, a gather, a bottle), which the view's
 * `subjectRequires: [AlloyedMixin]` gates at the binder.
 */

import Reading from "@saxonberg/server/mud/lib/instrument/Reading";
import { READING_TOPIC } from "@saxonberg/server/mud/lib/instrument/Reading";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Tooled } from "@saxonberg/server/mud/lib/craft/Tooled";
import type { CompetenceBandName } from "@saxonberg/server/mud/lib/advancement/CompetenceBand";
import type { CommandContext } from "@saxonberg/server/mud/api/command";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";

const IRON = "/stuff/idea/material/element/iron";
const GLASSWORK = "glasswork";

/** What an untrained eye reads off the iron load, and what it can make. */
function floorBand(fePct: number): string {
  if (fePct >= 0.6) return "rusty with iron — green bottles, and no clearer";
  if (fePct >= 0.2) return "a definite tinge of iron — bottle glass, not clear ware";
  if (fePct >= 0.08) return "a touch of colour in it — pale ware at best";
  return "pale and clean — this will take clear ware";
}

export default class IronReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const actor = this.actorOf(context);
    if (target === null || !MixinApi.isAlloyed(target)) {
      this.decline(
        context,
        Mml.compose`There is nothing there whose makeup you could read.`,
        "not-alloyed",
      );
      return;
    }
    const fe = target.fractionOf(IRON);
    const fePct = fe * 100;
    const trained = band === "proficient" || band === "expert";

    let line = Mml.compose`You look the ${Mml.thing(target)} over: ${Mml.fromMarkup(floorBand(fePct))}.`;
    if (trained) {
      // ⭐ The trained eye reads the FIGURE — the detail competence buys.
      line = Mml.compose`${line} Iron, about ${fePct.toFixed(2)}% by mass.`;
    }
    // On a finished glass good, name the colour it actually reads as.
    const tinted = target as unknown as { colourBand?: () => string };
    if (typeof tinted.colourBand === "function") {
      line = Mml.compose`${line} The glass is ${tinted.colourBand()}.`;
    }

    MessageApi.scene(actor).topic(READING_TOPIC).toSelf(line).send();

    if (MixinApi.isAdvancing(actor)) {
      await actor.creditDeed({
        discipline: GLASSWORK,
        difficulty: "easy",
        outcome: "success",
      });
    }
  }
}
