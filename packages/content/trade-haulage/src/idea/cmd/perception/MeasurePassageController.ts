/**
 * `measure passage` — ⭐ **will my rig make that turn?**
 *
 * The information half of teamstering, and it is built to the geology
 * error-bar ladder exactly: **the answer is the same, the CONFIDENCE
 * is not.** A novice is told the turn is "about a rig's width, maybe";
 * a competent teamster is told it is a rig and a hand's breadth. Same
 * gap, same wagon, same road — and the competent one knew before they
 * committed.
 *
 * ⚠⚠ It changes nothing about the outcome. If the rig fits it fits at
 * every band; if it does not, it does not. A conferral that made the
 * wagon fit would be the odometer failure — the same act done better —
 * and that is the one thing the standing rule forbids.
 *
 * ⚠ Per the instrumentation doctrine this is a **stanza on the shipped
 * `measure` view**, not a new verb. The controller is the trade's; the
 * verb is the platform's; an install without this pack gets a legible
 * `controller-error` rather than a crash.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** The discipline key both readouts read. */
export const TEAMSTERING = 'teamstering';

const TOPIC = 'sense.measure';

/**
 * How sure the reading is, by band — the geology error bar, in words
 * rather than degrees because a gap is not a bearing.
 *
 * ⚠ The **numbers are the same at every band**; only the hedging
 * changes. That is the whole contract.
 */
const CONFIDENCE: Record<CompetenceBandName, string> = {
  untrained: 'though you would not like to promise',
  novice: 'near enough, you think',
  competent: 'and you would take money on it',
  proficient: 'to within a hand',
  expert: 'to within a hand, and you can see which wheel binds first',
};

export default class MeasurePassageController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const here = context.location;
    if (!here || !MixinApi.isExitable(here)) {
      return this.fail(context, 'There is no way out of here to judge.');
    }
    const band = await bandOf(giver);

    // The FACT: which ways out admit wheels at all. Identical at every
    // band — a wheel gate is a wheel gate.
    const ways: string[] = [];
    for (const [direction, exit] of here.getExits().entries()) {
      const wheels = exit.isWheelPassable();
      ways.push(
        `  ${direction}: ${wheels ? 'a rig goes through' : 'no rig goes through'}`,
      );
    }
    if (ways.length === 0) {
      return this.fail(context, 'There is no way out of here to judge.');
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.text(
          `\nYou look over the ways out — ${CONFIDENCE[band]}.\n` +
            `${ways.join('\n')}\n`,
        ),
      )
      .send();
  }

  private fail(context: CommandContext, detail: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason: 'no-passage', detail });
  }
}

/**
 * The reader's teamstering band. ⚠ The Competence SCALAR never crosses
 * the Api boundary: a conferral is a band × catalogue lookup, and no
 * teamstering number is ever shown or stored.
 */
export async function bandOf(giver: Stuff): Promise<CompetenceBandName> {
  return MixinApi.isAdvancing(giver)
    ? await giver.competenceBandFor(TEAMSTERING)
    : CompetenceBand.FLOOR;
}
