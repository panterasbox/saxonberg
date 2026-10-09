/**
 * SnapController — `snap <sheet>`: part a scribed sheet in two. Refuses an
 * unscribed sheet (nothing to part along). Yields two panes at half the
 * mass each, carrying the same glass (and so the same colour). The snap
 * itself costs nothing — a clean score snaps clean (the loss chance is a
 * dial pinned at 0, a competence-priced failure rung is a follow-on).
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult } from "@saxonberg/server/mud/api/mql";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import Sheet from "../../../thing/Sheet";
import { GLASSWORK_TOPIC } from "../../../thing/Gather";

const PANE_ROW = "/trade/glass/thing/pane";

interface SnapModel extends CommandModel {
  sheet?: MqlOneResult;
}

export default class SnapController extends ManualBuildController<SnapModel> {
  execute(model: SnapModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!sheet || !(sheet instanceof Sheet)) {
      this.declineStep(context, Mml.compose`Snap what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    if (!sheet.isScribed()) {
      this.declineStep(
        context,
        Mml.compose`There is no score line on ${Mml.thing(sheet)} to snap along. Scribe it first.`,
        "unscribed",
      );
      return;
    }
    void this.snap(sheet, giver);
  }

  private async snap(sheet: Sheet, giver: Stuff): Promise<void> {
    const half = sheet.getMass().rawValue() / 2;
    const alloying = sheet.getAlloying().map((e) => ({ ...e }));
    const where = MixinApi.isContainable(sheet)
      ? sheet.getContainer()
      : MixinApi.isContainer(giver)
        ? (giver as unknown as Stuff & Container)
        : null;
    for (let i = 0; i < 2; i += 1) {
      const p = await StuffApi.clone<Sheet>(PANE_ROW);
      p.setMass(Quantity.of(half, "kg"));
      p.setForm("pane");
      if (MixinApi.isAlloyed(p) && alloying.length > 0) p.setAlloying(alloying);
      if (where && MixinApi.isContainer(where) && MixinApi.isContainable(p)) {
        ContainmentApi.move(p as unknown as Stuff & Containable, where as Stuff & Container);
      }
    }
    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(Mml.compose`You tap along the score and ${Mml.thing(sheet)} parts clean into two.`)
      .send();
    await StuffApi.destruct(sheet);
    if (MixinApi.isAdvancing(giver)) {
      void giver.creditDeed({ discipline: "glasswork", difficulty: "easy", outcome: "success" });
    }
  }
}
