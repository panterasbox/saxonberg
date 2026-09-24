/**
 * SteepController — `steep <solute> in <vessel>` / `infuse …` (the
 * general infusion verb, moved to platform in the clinical-medicine
 * review). An engaged `hands` step: the vessel must hold a little of a
 * SOLVENT (v1 = water, i.e. a Material tagged `solvent`); the solute is
 * consumed and the solvent becomes the extract the solute `steepsInto`
 * (payload cleared). A narrowing over a bare `any` arg — the binder
 * cannot ask whether a thing is steepable, so the controller narrows on
 * `MixinApi.isSteepable`. Credits `medicine easy`.
 *
 * ⚠ v1 is water-only: the solvent TYPE does not yet change the extract
 * (water-tea vs alcohol-tincture vs infused oil), and there is no
 * extraction efficiency or heat kinetics — the solute fixes the output.
 * That chemistry is a deferred cooking/infusion build; the substrate
 * (`SteepableMixin`) generalises now.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { Quantity } from "../../../../lib/quantity";
import { StuffApi } from "../../../../api/stuff";
import { BulkableApi } from "../../../../api/bulk";
import { SchedulerApi } from "../../../../api/scheduler";
import { ManualBuildStep } from "../../../../lib/craft/ManualBuildStep";
import type {
  CommandContext,
  CommandModel,
} from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type Material from "../../../../lib/material/Material";

const TOPIC = "act.deed";
const SOLVENT_TAG = "solvent";
const STEEP_MS = 60_000;
const MIN_SOLVENT_L = 0.2;

interface SteepModel extends CommandModel {
  solute?: MqlOneResult;
  vessel?: MqlOneResult;
}

export default class SteepController extends CommandController<SteepModel> {
  async execute(model: SteepModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const solute = model.solute?.stuff as Stuff | undefined;
    const vessel = model.vessel?.stuff as Stuff | undefined;

    if (!solute || !MixinApi.isSteepable(solute) || !solute.getSteepsInto()) {
      return this.fail(
        context,
        "That is not something you can steep.",
        "not-steepable",
      );
    }
    const steepsInto = solute.getSteepsInto();
    if (!vessel || !MixinApi.isBulkable(vessel)) {
      return this.fail(
        context,
        "You need a vessel of solvent to steep in.",
        "no-vessel",
      );
    }
    const slot = BulkableApi.slotFor(vessel, undefined);
    if (
      !slot ||
      slot.isEmpty() ||
      !slot.getMaterial()?.hasTag(SOLVENT_TAG) ||
      slot.getAmount().rawValue() < MIN_SOLVENT_L
    ) {
      return this.fail(
        context,
        "It needs a little water to steep in.",
        "no-solvent",
      );
    }

    const onComplete = (): void => {
      const extract = StuffApi.findByTemplatePath<Material>(steepsInto);
      const litres = slot.getAmount().rawValue();
      if (extract) slot.setMaterial(extract);
      slot.setAmount(Quantity.of(litres, "L"));
      slot.setPayload(null);
      // Narrate BEFORE the solute is destroyed — the message names it.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The water darkens as ${Mml.thing(solute)} gives up its virtue. The infusion is ready.`,
        )
        .send();
      void StuffApi.destruct(solute);
    };

    if (!MixinApi.isEngaged(giver)) {
      onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ["hands"],
      durationMs: STEEP_MS,
      onComplete,
      onAbort: () => {},
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === "started" || result.status === "replaced")) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You set ${Mml.thing(solute)} to steep in ${Mml.thing(vessel)}.`,
        )
        .send();
      return;
    }
    if (result.ok && result.status === "completed-sync") return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your hands are busy just now.`)
      .send();
    context.note({
      kind: "controller-rejected",
      reason: "engagement-conflict",
      detail: "busy",
    });
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: "controller-rejected", reason, detail: line });
  }
}
