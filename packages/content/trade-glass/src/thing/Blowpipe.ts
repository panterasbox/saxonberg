/**
 * Blowpipe — the glassmaker's iron: a `Tool` that HOLDS one gather
 * (`ContainerMixin`). It affords the hot shop (`gob`/`shape`/`reheat`/
 * `crack`) to whoever holds it — the affordance static lands in W5 with
 * those views. The capability `blowpipe` is authored on the row and is
 * what the `gob`/`shape`/`reheat`/`crack` views bind their `pipe` arg to.
 */

import Tool from "@saxonberg/server/mud/platform/thing/Tool";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";
import type {
  ShapePlan,
  ShapePlanner,
  ShapeRefusal,
  ShapeRequest,
} from "@saxonberg/server/mud/lib/craft/Shapeable";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Gather, { type GatherForm, GLASSWORK_TOPIC } from "./Gather";

/** Working a gather into its form, game-ms — and the effort of it. */
const SHAPE_MS = 10_000;
const SHAPE_W = 250;
/** The two forms a gather is blown into. */
const FORMS: readonly GatherForm[] = ["bottle", "cylinder"];

const HOT_SHOP = [
  "trade/glass/cmd/glass/gob.yaml",
  // ⭐ The platform's `shape` (ceramics D14): the PIPE plans its gather's
  // two forms; a wheel plans a pot.
  "platform/cmd/crafting/shape.yaml",
  "trade/glass/cmd/glass/reheat.yaml",
  "trade/glass/cmd/glass/crack.yaml",
];

export default class Blowpipe extends ContainerMixin(Tool) implements ShapePlanner {
  // ⭐ A verb an object affords is a static on the class — the pipe
  // affords the hot shop to whoever holds it (environment = the carrier).
  static commandContributions: CommandContributions = {
    environment: HOT_SHOP,
  };

  /**
   * ⭐ The pipe plans the shape of the gather on it — a bottle, or a
   * cylinder for a pane (the blow and the jacks in one move). `null` with no
   * gather on it: the shape is not this pipe's business.
   */
  public async shapePlanFor(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal | null> {
    const gather = this.getContents().find((c) => c instanceof Gather) as Gather | undefined;
    if (gather === undefined) return null;
    const form = req.formText.trim().toLowerCase().replace(/^(a|an|the)\s+/, "");
    if (!FORMS.includes(form as GatherForm)) {
      return {
        ok: false,
        reason: "no-form",
        line: Mml.compose`Shape it into what? A bottle, or a cylinder for a pane.`,
      };
    }
    const actor = req.actor;
    if (!gather.isWorkable()) {
      void gather.loseToCullet(actor, "It has already set hard.");
      return { ok: false, reason: "set-hard", line: Mml.compose`It has set hard.` };
    }
    return {
      ok: true,
      durationMs: SHAPE_MS,
      effortW: SHAPE_W,
      beginSelf: Mml.compose`You put the pipe to your lips and your tools to the glass, working it toward a ${Mml.fromMarkup(form)}.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} works a gather of hot glass.`,
      onComplete: () => {
        if (gather.isDestroyed()) return;
        // ⭐ Re-validate at the commit point: if it cooled past working
        // during the step, the piece is lost.
        if (!gather.isWorkable()) {
          void gather.loseToCullet(actor, "It set before you were done.");
          return;
        }
        gather.setForm(form as GatherForm);
        MessageApi.scene(actor)
          .topic(GLASSWORK_TOPIC)
          .toSelf(Mml.compose`The glass takes the form of a ${Mml.fromMarkup(form)}. Crack it off while it holds.`)
          .send();
      },
    };
  }
}
