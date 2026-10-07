/**
 * GlazeController — `glaze <pane> in <window>`: set a blown pane in a
 * window. Copies the pane's own derived transmittance onto the window
 * (`setGlazing`) and consumes the pane — so a green pane makes the window
 * colour the room green, the first window a row has ever lit through. A
 * standard act.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult } from "@saxonberg/server/mud/api/mql";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Window from "@saxonberg/server/mud/platform/thing/Window";
import Sheet from "../../../thing/Sheet";
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
    if (!pane || !(pane instanceof Sheet) || pane.getForm() !== "pane") {
      this.declineStep(context, Mml.compose`Glaze with what? You need a flat glass pane.`, "no-pane");
      return;
    }
    if (!window || !(window instanceof Window)) {
      this.declineStep(context, Mml.compose`Glaze it into what? You need a window to set the pane in.`, "no-window");
      return;
    }
    // ⭐ The pane's colour becomes the window's glazing — derived from the
    // glass's iron, so the window colours the room by what it is made of.
    window.setGlazing(pane.lightTransmittance());
    // ⚠ Narrate BEFORE consuming the pane — a destroyed thing has no name
    // to render.
    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(Mml.compose`You set ${Mml.thing(pane)} into ${Mml.thing(window)}. The light coming through it changes.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} glazes a pane into a window.`)
      .send();
    void StuffApi.destruct(pane);
    if (MixinApi.isAdvancing(giver)) {
      void giver.creditDeed({ discipline: "glasswork", difficulty: "standard", outcome: "success" });
    }
  }
}
