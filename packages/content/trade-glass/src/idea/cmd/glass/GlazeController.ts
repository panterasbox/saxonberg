/**
 * GlazeController — `glaze <pane> in <window>`: set a blown pane in a
 * window. The pane sets itself (`Sheet.glazeInto`): the window takes its
 * derived transmittance — a green pane colours the room green — and the
 * pane is consumed. A window already glazed refuses (C14).
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult } from "@saxonberg/server/mud/api/mql";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Window from "@saxonberg/server/mud/platform/thing/Window";
import Sheet, { type GlazeRefusal } from "../../../thing/Sheet";
import { GLASSWORK_TOPIC } from "../../../thing/Gather";

interface GlazeModel extends CommandModel {
  pane?: MqlOneResult;
  window?: MqlOneResult;
}

export default class GlazeController extends ManualBuildController<GlazeModel> {
  execute(model: GlazeModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const pane = model.pane?.stuff ?? null;
    const window = model.window?.stuff ?? null;
    if (!(pane instanceof Sheet)) {
      this.declineStep(context, GlazeController.refusalWords({ ok: false, reason: "not-a-pane" }), "no-pane");
      return;
    }
    if (!(window instanceof Window)) {
      this.declineStep(context, Mml.compose`Glaze it into what? You need a window to set the pane in.`, "no-window");
      return;
    }
    // ⚠ Named BEFORE the pane is consumed — a destroyed thing has no name.
    const self = Mml.compose`You set ${Mml.thing(pane)} into ${Mml.thing(window)}. The light coming through it changes.`;
    const out = pane.glazeInto(window, giver);
    if (!out.ok) {
      this.declineStep(context, GlazeController.refusalWords(out), out.reason === "not-a-pane" ? "no-pane" : out.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(self)
      .toPeers(Mml.compose`${Mml.actor(giver)} glazes a pane into a window.`)
      .send();
  }

  protected static refusalWords(r: GlazeRefusal): ReturnType<typeof Mml.compose> {
    switch (r.reason) {
      case "not-a-pane":
        return Mml.compose`Glaze with what? You need a flat glass pane.`;
      case "already-glazed":
        return Mml.compose`That window is glazed already. There is no room in it for another pane.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}
