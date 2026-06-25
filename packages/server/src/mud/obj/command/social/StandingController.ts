/**
 * StandingController — the self-view over a character's consumer-influence
 * standing.
 *
 * A single-token, zero-arg, self-only, read-only verb. It reads the three
 * inputs that make up `engagement × renown` — participation (the quantity
 * faucet), renown (the quality faucet), and the resulting consumer
 * influence band — and renders them as a fixed readout. It emits the
 * **band**, never the raw scalar (register D6: standing is shown
 * qualitatively; the precise number is reserved for the eventual ballot).
 *
 * Keyed on the giver's `stuffId`, the same durable id renown and
 * participation both record under, so the projection combines on one key.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { ConsumerApi } from '../../../api/consumer';
import { RenownApi } from '../../../api/renown';
import { InfluenceApi } from '../../../api/influence';

/** Identity-family self readout — reuse, don't invent a topic. */
const TOPIC = 'world.identity';

export default class StandingController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const subjectId = actor.stuffId;

    const participation = ConsumerApi.participationOf(subjectId);
    const renown = RenownApi.renownOf(subjectId);
    const band = InfluenceApi.bandOf(subjectId, 'consumer');

    // Qualitative throughout — band for the headline; the two faucets
    // described in words, not raw scalars beyond a coarse presence/regard
    // read, so there is no precise number to grind (register D6).
    const presence =
      participation <= 0
        ? 'You have not yet shown up.'
        : 'You show up and take part.';
    const regard =
      renown > 0
        ? 'The cooperative regards you well.'
        : renown < 0
          ? 'The cooperative regards you poorly.'
          : 'The cooperative has yet to form a view of you.';

    const blocks: string[] = [
      Mml.strong('Your standing').toString(),
      Mml.escape(`Influence: ${band.name}.`),
      Mml.escape(presence),
      Mml.escape(regard),
    ];

    const body = Mml.fromMarkup(blocks.join('\n\n'));
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }
}
