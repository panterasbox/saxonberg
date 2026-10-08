/**
 * GobController — `gob [from <melt>] [with <pipe>]`: gather hot glass on
 * the blowpipe. (Glassmakers call the quantity a gob and the act a
 * gather; the verb is `gob` because `gather` is the egg verb and `dip`
 * is the chandler's.) Mints a `Gather` into the pipe at the melt's heat
 * and composition, and starts the hot-work watch — from this moment the
 * glass is cooling and the window is open.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlManyResult, MqlOneResult } from "@saxonberg/server/mud/api/mql";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { SchedulerApi } from "@saxonberg/server/mud/api/scheduler";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import type { Engaged } from "@saxonberg/server/mud/lib/activity/Engaged";
import Gather, { GLASSWORK_TOPIC } from "../../../thing/Gather";
import Melt from "../../../thing/Melt";
import { HotWorkWatch } from "../../../lib/HotWork";

const GATHER_ROW = "/trade/glass/thing/gather";

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

interface GobModel extends CommandModel {
  melt?: MqlOneResult;
  pipe?: MqlManyResult;
}

/** The first bound blowpipe that is not already holding a gather. */
function emptyPipe(bound: MqlManyResult | undefined): (Stuff & Container) | null {
  for (const p of bound?.stuff ?? []) {
    if (!MixinApi.isContainer(p)) continue;
    const holdsGather = p.getContents().some((c) => c instanceof Gather);
    if (!holdsGather) return p as Stuff & Container;
  }
  return null;
}

export default class GobController extends ManualBuildController<GobModel> {
  async execute(model: GobModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const melt = model.melt?.stuff ?? null;

    if (!melt || !(melt instanceof Melt)) {
      this.declineStep(
        context,
        Mml.compose`Gather from what? You need a pot of molten glass.`,
        "no-melt",
      );
      return;
    }
    if (!melt.isFluid()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(melt)} has stiffened — there is no gathering from it cold. Work the bellows and fire it again.`,
        "melt-cold",
      );
      return;
    }
    const pipe = emptyPipe(model.pipe);
    if (!pipe) {
      this.declineStep(
        context,
        Mml.compose`You need an empty blowpipe in hand — the one you have is already carrying a gather.`,
        "no-pipe",
      );
      return;
    }
    if (!MixinApi.isEngaged(giver)) {
      this.declineStep(
        context,
        Mml.compose`You cannot give this your attention just now.`,
        "cannot-engage",
      );
      return;
    }

    const gatherKg = dial("glass.hotwork.gatherKg", 0.4);
    const alloying = melt.takeGather(gatherKg);
    const meltK = melt.getTemperature().rawValue();

    const gather = await StuffApi.clone<Gather>(GATHER_ROW);
    gather.setMass(Quantity.of(gatherKg, "kg"));
    gather.setStampedTemperatureK(meltK);
    gather.setForm("gather");
    if (MixinApi.isAlloyed(gather) && alloying.length > 0) gather.setAlloying(alloying);
    ContainmentApi.move(gather as unknown as Stuff & Containable, pipe);

    const watch = new HotWorkWatch({
      actor: giver as unknown as Stuff & Engaged,
      pipe: pipe as unknown as Stuff,
      gather,
    });
    SchedulerApi.start(watch);

    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(Mml.compose`You lower the pipe into ${Mml.thing(melt)} and turn up a glowing gather. Work it while it is hot.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} gathers a blob of hot glass on a blowpipe.`)
      .send();
  }
}
