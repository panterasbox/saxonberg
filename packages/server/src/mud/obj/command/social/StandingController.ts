/**
 * StandingController — the self-view over a character's influence standing
 * across all three stocks.
 *
 * A single-token, zero-arg, self-only, read-only verb. It reads the three
 * influence stocks — **play** (consumer = `engagement × renown`), **make**
 * (producer = attributed engagement on released content), and **fund**
 * (capital, intake-gated → not yet earnable) — and renders each as a band,
 * with the two inputs to the play band (participation + regard) described
 * qualitatively. It emits **bands**, never raw scalars (register D6:
 * standing is shown qualitatively; the precise number is reserved for the
 * eventual ballot). The three stocks are three dimensions of every member,
 * each earned independently.
 *
 * Keyed on the giver's durable `templatePath` (post the durability re-key) —
 * the same id every faucet banks under, so reads and the projection combine
 * on one key. Falls back to the `stuffId` for an un-templated actor.
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
    // Read under the durable templatePath the faucets re-key storage to
    // (Phase 0) — the live stuffId is re-minted on re-clone. Falls back to
    // the stuffId for an un-templated actor (e.g. a guest), matching the
    // faucet's own fallback so the key always agrees.
    const subjectId = actor.getTemplatePath() ?? actor.stuffId;

    // The three influence stocks — make / fund / play — are three
    // dimensions of every member, each earned and shown independently.
    // Bands throughout, never raw scalars (register D6: standing is shown
    // qualitatively; the precise number is reserved for the eventual ballot).
    const playBand = InfluenceApi.bandOf(subjectId, 'consumer');
    const makeBand = InfluenceApi.bandOf(subjectId, 'producer');
    // Capital (fund) is intake-gated — a defined zero until Twitch capital
    // lands; shown as not-yet-earnable rather than a misleading 'dormant'.

    // The two inputs to the play (consumer) band, described in words so
    // there is no precise number to grind.
    const participation = ConsumerApi.participationOf(subjectId);
    const renown = RenownApi.renownOf(subjectId);
    const presence =
      participation <= 0
        ? 'You have not yet shown up.'
        : 'You show up and take part.';
    const regard =
      renown > 0
        ? 'The Compact regards you well.'
        : renown < 0
          ? 'The Compact regards you poorly.'
          : 'The Compact has yet to form a view of you.';

    const blocks: string[] = [
      Mml.strong('Your standing').toString(),
      Mml.escape(`Play (engagement): ${playBand.name}.`),
      Mml.escape(`${presence} ${regard}`),
      Mml.escape(`Make (creation): ${makeBand.name}.`),
      Mml.escape('Fund (capital): not yet earnable.'),
    ];

    const body = Mml.fromMarkup(blocks.join('\n\n'));
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }
}
