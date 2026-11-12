/**
 * ArmController — `arm <kit>`: deploy a carried trap into the current room.
 *
 * The player-trapper's one verb (the `disarm` sibling; `device` category —
 * operating a built mechanism). It clones the kit's `trapTemplate` (a
 * `/stuff/thing/traps/` generic), sets the deployed trap's concealment from the
 * placer's own `stealth` competence via `PerceptionApi.hideLevelFor` (the
 * shared spine with self-hiding), stamps the placer on it
 * (`HazardMixin.placedBy` — so a spring is attributable through the unified
 * accountability ledger), and consumes the kit (one trap per kit, v1).
 *
 * **Anti-grief ships inline** (not a follow-up):
 *   - the **property gate** — free on ground you hold or on government
 *     ground nobody privately holds; refused on another owner's property
 *     and on ungoverned ground (the parcel + civics substrates);
 *   - **crime-marking is inherent** — the deployed trap's `placedBy` makes a
 *     spring on a non-consenting sentient derive `crime` at the harm site
 *     (`HazardMixin.deliverHarm`), no flag needed.
 *
 * ⭐ The kit decides (`TrapKit.armBy(actor)`, controller-liquidity W8):
 * the property gate, the concealment and the deployment are the kit's, so
 * a rewritten `arm` cannot skip the gate. Narration lives here.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import TrapKit, { type ArmRefusal } from '../../../thing/TrapKit';

const TOPIC = 'act.deed';

interface ArmModel extends CommandModel {
  target?: MqlOneResult;
}

export default class ArmController extends CommandController<ArmModel> {
  async execute(model: ArmModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const kit = model.target?.stuff ?? null;

    if (!(kit instanceof TrapKit)) {
      return this.reject(context, Mml.compose`That isn't a trap kit you can arm.`, 'not-a-kit');
    }

    const out = await kit.armBy(giver);
    if (!out.ok) return this.reject(context, ArmController.refusalWords(out), out.reason);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You set ${Mml.thing(out.facts.trap)} and work it into the surroundings.`,
      )
      .send();
  }

  /** ⭐ Every refusal `arm` can say. */
  protected static refusalWords(r: ArmRefusal): Mml {
    switch (r.reason) {
      case 'no-room':
        return Mml.compose`There's nowhere here to set a trap.`;
      case 'not-your-property':
        return Mml.compose`This isn't your ground to rig — someone else holds it.`;
      case 'bad-kit-template':
        return Mml.compose`The kit is broken — it won't arm.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  private reject(context: CommandContext, line: Mml, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
