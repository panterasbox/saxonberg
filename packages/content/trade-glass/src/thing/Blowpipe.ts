/**
 * Blowpipe — the glassmaker's iron: a `Tool` that HOLDS one gather
 * (`ContainerMixin`). It affords the hot shop (`dip`/`gob`, `shape`/`reheat`/
 * `crack`) to whoever holds it — the affordance static lands in W5 with
 * those views. The capability `blowpipe` is authored on the row and is
 * what the `gob`/`shape`/`reheat`/`crack` views bind their `pipe` arg to.
 */

import Tool from "@saxonberg/server/mud/platform/thing/Tool";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";
import type { ShapeRequest } from "@saxonberg/server/mud/lib/craft/Shapeable";
import type { ActPlan, ActRefusal } from "@saxonberg/server/mud/lib/craft/ActPlan";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { FormingMixin } from "@saxonberg/server/mud/lib/craft/Forming";
import type { FormClass } from "@saxonberg/server/mud/lib/craft/FormSpec";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Gather, { GLASSWORK_TOPIC, GLASSWORK_TYPE } from "./Gather";

/** Working a gather into its form, game-ms — and the effort of it. */
const SHAPE_MS = 10_000;
const SHAPE_W = 250;

const HOT_SHOP = [
  // ⭐ The gather is the platform's `dip` (its `gob` alias): the MELT plans it
  // (`DipBathMixin`); the pipe affords the word so a bare `gob` is heard.
  "platform/cmd/crafting/dip.yaml",
  // ⭐ The platform's `shape` (ceramics D14) is the pipe's by what it is:
  // it FORMS (`FormingMixin` affords the verb) — it plans its gather's forms
  // (its row's `forms:` — `Form` rows, as a wheel's are); a wheel plans a pot.
  "trade/glass/cmd/glass/reheat.yaml",
  "trade/glass/cmd/glass/crack.yaml",
];

export default class Blowpipe extends FormingMixin(ContainerMixin(Tool)) {
  // ⭐ A verb an object affords is a static on the class — the pipe
  // affords the hot shop to whoever holds it (environment = the carrier).
  static commandContributions: CommandContributions = {
    environment: HOT_SHOP,
  };

  /** A pipe blows vessels — closed (a bottle) and open (a pane's cylinder). */
  protected override formClasses(): readonly FormClass[] {
    return ["closed", "open"];
  }

  protected override formingDiscipline(): string {
    return GLASSWORK_TYPE;
  }

  /** The mass a pipe works is the gather ON it — nothing else. */
  protected override formingMass(_req: ShapeRequest): Gather | null {
    return (this.getContents().find((c: Stuff) => c instanceof Gather) as Gather | undefined) ?? null;
  }

  /**
   * ⭐ The pipe plans the shape of the gather on it — any form its row lists
   * (a bottle, a cylinder for a pane), the blow and the jacks in one move.
   * `null` with no gather on it: the shape is not this pipe's business.
   */
  public override async shapePlanFor(req: ShapeRequest): Promise<ActPlan | ActRefusal | null> {
    const target = await this.resolveForming(req);
    if (target === null || !("mass" in target)) return target;
    const gather = target.mass;
    if (!(gather instanceof Gather)) return null;
    const form = target.form.describe();
    const key = target.form.word?.key ?? form;
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
        gather.takeForm(key, target.product, target.hand.grade);
        MessageApi.scene(actor)
          .topic(GLASSWORK_TOPIC)
          .toSelf(Mml.compose`The glass takes the form of a ${Mml.fromMarkup(form)}. Crack it off while it holds.`)
          .send();
      },
    };
  }
}
