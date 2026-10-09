/**
 * CrackController — `crack [with <pipe>]`: crack the piece off the pipe. A
 * formed, still-workable gather becomes its product (a bottle or a
 * cylinder), carrying the gather's mass minus the moil and its alloying —
 * so the bottle is the colour of its sand. Anything else (unformed, or
 * gone cold) comes off as cullet. The moil — the waste left on the pipe —
 * is minted as cullet beside you. The hot-work watch self-completes once
 * the gather is gone.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlManyResult } from "@saxonberg/server/mud/api/mql";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { WorldClockApi } from "@saxonberg/server/mud/api/worldclock";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { Grade } from "@saxonberg/server/mud/lib/craft/Grade";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import Gather, { GLASSWORK_TOPIC } from "../../../thing/Gather";

const CRACK_MS = 3_000;
const CRACK_W = 120;
const CULLET_ROW = "/stuff/thing/Casting";
const PRODUCT: Record<string, string> = {
  bottle: "/trade/glass/thing/bottle",
  cylinder: "/trade/glass/thing/cylinder",
};

/** The Detailed/Visible label surface, for naming the minted moil. */
interface Labelled {
  setShortDescription(s: string): void;
  setKeywords(k: string[]): void;
}

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

interface CrackModel extends CommandModel {
  pipe?: MqlManyResult;
}

function gatherOn(bound: MqlManyResult | undefined): Gather | null {
  for (const p of bound?.stuff ?? []) {
    if (!MixinApi.isContainer(p)) continue;
    const g = p.getContents().find((c) => c instanceof Gather);
    if (g) return g as Gather;
  }
  return null;
}

export default class CrackController extends ManualBuildController<CrackModel> {
  execute(model: CrackModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const gather = gatherOn(model.pipe);
    if (!gather) {
      this.declineStep(
        context,
        Mml.compose`You have no gather on the pipe to crack off.`,
        "no-gather",
      );
      return;
    }

    this.engageStep(context, {
      durationMs: CRACK_MS,
      effortW: CRACK_W,
      beginSelf: Mml.compose`You wet a line at the neck and crack the piece off the pipe.`,
      onComplete: () => {
        if (gather.isDestroyed()) return;
        const form = gather.getForm();
        const productRow = PRODUCT[form];
        // An unformed or cooled gather is not a piece — it comes off as cullet.
        if (!productRow || !gather.isWorkable()) {
          void gather.loseToCullet(giver, "There was no formed piece to crack off.");
          return;
        }
        void this.crackOff(gather, productRow, giver);
      },
    });
  }

  private async crackOff(
    gather: Gather,
    productRow: string,
    giver: Stuff,
  ): Promise<void> {
    const moilFrac = dial("glass.hotwork.moilFraction", 0.05);
    const massKg = gather.getMass().rawValue();
    const alloying = MixinApi.isAlloyed(gather) ? gather.getAlloying().map((e) => ({ ...e })) : [];
    const where =
      MixinApi.isContainer(giver)
        ? (giver as unknown as Stuff & Container)
        : null;

    const product = await StuffApi.clone<Stuff>(productRow);
    if (MixinApi.isTangible(product)) product.setMass(Quantity.of(massKg * (1 - moilFrac), "kg"));
    if (MixinApi.isAlloyed(product) && alloying.length > 0) product.setAlloying(alloying);
    // ⭐ Stamp the maker — a bottle is Crafted; without this it credits
    // nobody (risk 8).
    if (MixinApi.isCrafted(product)) {
      product.stamp({
        maker: giver.getIdentityPath() ?? "",
        grade: Grade.of("fair"),
        recipe: "glass-blow",
        craftedAt: WorldClockApi.getNow().rawValue(),
      });
    }
    if (where && MixinApi.isContainable(product)) {
      ContainmentApi.move(product as Stuff & Containable, where);
    }

    // The moil — waste glass left on the pipe — as cullet beside you.
    try {
      const moil = await StuffApi.clone<Stuff>(CULLET_ROW);
      if (MixinApi.isTangible(moil)) {
        const mat = gather.getMaterial();
        if (mat) moil.setMaterial(mat);
        moil.setMass(Quantity.of(massKg * moilFrac, "kg"));
      }
      (moil as unknown as Labelled).setShortDescription("scrap of cullet");
      (moil as unknown as Labelled).setKeywords(["cullet", "moil", "glass"]);
      if (MixinApi.isAlloyed(moil) && alloying.length > 0) moil.setAlloying(alloying);
      if (where && MixinApi.isContainable(moil)) ContainmentApi.move(moil as Stuff & Containable, where);
    } catch {
      /* missing cullet row: the moil is simply lost */
    }

    await StuffApi.destruct(gather);
    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(Mml.compose`The piece cracks free: ${Mml.thing(product)} is yours, and a scrap of moil beside it.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} cracks a finished piece of glass off the pipe.`)
      .send();
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: "glasswork", difficulty: "standard", outcome: "success" });
    }
  }
}
