/**
 * FlattenController — `flatten <cylinder> [at <furnace>]`: open a scored
 * cylinder flat into a window pane, softening it at the furnace. The
 * medieval broad-glass finish. A durative step; the cylinder must be
 * scribed and the furnace hot enough to soften the glass.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult, MqlManyResult } from "@saxonberg/server/mud/api/mql";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Burner } from "@saxonberg/server/mud/lib/fire/Burner";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import Sheet from "../../../thing/Sheet";
import { GLASSWORK_TOPIC } from "../../../thing/Gather";

const FLATTEN_MS = 6_000;
const FLATTEN_W = 150;
const PANE_ROW = "/trade/glass/thing/pane";

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

interface FlattenModel extends CommandModel {
  cylinder?: MqlOneResult;
  furnace?: MqlManyResult;
}

function hotFurnace(bound: MqlManyResult | undefined, minK: number): boolean {
  for (const f of bound?.stuff ?? []) {
    if (MixinApi.isBurner(f) && (f as Stuff & Burner).isLit() && (f as Stuff & Burner).getHeldTemperatureK() >= minK) {
      return true;
    }
  }
  return false;
}

export default class FlattenController extends ManualBuildController<FlattenModel> {
  execute(model: FlattenModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const cyl = model.cylinder?.stuff ?? null;
    if (!cyl || !(cyl instanceof Sheet) || cyl.getForm() !== "cylinder") {
      this.declineStep(context, Mml.compose`Flatten what? You need a scored glass cylinder.`, "no-cylinder");
      return;
    }
    if (!cyl.isScribed()) {
      this.declineStep(context, Mml.compose`Scribe the cylinder down its length first, so it can open out.`, "unscribed");
      return;
    }
    const flattenK = dial("glass.cold.flattenK", 900);
    if (!hotFurnace(model.furnace, flattenK)) {
      this.declineStep(
        context,
        Mml.compose`You need a lit furnace hot enough to soften the glass before it will open flat.`,
        "no-furnace",
      );
      return;
    }

    this.engageStep(context, {
      durationMs: FLATTEN_MS,
      effortW: FLATTEN_W,
      beginSelf: Mml.compose`You soften ${Mml.thing(cyl)} at the furnace and open it out flat.`,
      onComplete: () => {
        if (cyl.isDestroyed()) return;
        void this.flatten(cyl, giver);
      },
    });
  }

  private async flatten(cyl: Sheet, giver: Stuff): Promise<void> {
    const mass = cyl.getMass().rawValue();
    const alloying = cyl.getAlloying().map((e) => ({ ...e }));
    const where = MixinApi.isContainable(cyl)
      ? cyl.getContainer()
      : MixinApi.isContainer(giver)
        ? (giver as unknown as Stuff & Container)
        : null;
    const pane = await StuffApi.clone<Sheet>(PANE_ROW);
    pane.setMass(Quantity.of(mass, "kg"));
    pane.setForm("pane");
    if (MixinApi.isAlloyed(pane) && alloying.length > 0) pane.setAlloying(alloying);
    if (where && MixinApi.isContainer(where) && MixinApi.isContainable(pane)) {
      ContainmentApi.move(pane as unknown as Stuff & Containable, where as Stuff & Container);
    }
    await StuffApi.destruct(cyl);
    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(Mml.compose`The cylinder opens out into a flat pane of glass.`)
      .send();
    if (MixinApi.isAdvancing(giver)) {
      void giver.creditDeed({ discipline: "glasswork", difficulty: "standard", outcome: "success" });
    }
  }
}
