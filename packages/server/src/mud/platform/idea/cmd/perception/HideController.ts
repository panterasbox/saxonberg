/**
 * HideController — `hide`: the actor-side of concealment.
 *
 * Resolves the hider's `stealth` competence band (awaited once, at command
 * time — never at the sync perceive gate), derives a concealment level from
 * competence × cover × darkness × stillness via
 * `PerceptionApi.hideLevelFor`, and snapshots it into the actor's
 * `HidingMixin.hiddenLevel` (`enterHide`). From then on the shipped
 * detection engine resolves the hider per-observer for free — a hidden
 * actor is a `Concealable` like any other.
 *
 * Narration lives here (the object/controller layer), not on the gated Api.
 * Honest fog: the success line is self-only — a hider doesn't announce
 * themselves to the room; observers who still perceive them learn it from
 * their own next look, and those who don't never see the attempt.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { PerceptionApi } from '../../../../api/perception';
import { AdvancementApi } from '../../../../api/advancement';
import { CompetenceBand } from '../../../../lib/advancement/CompetenceBand';
import { Mml } from '../../../../api/mml';

const TOPIC = 'sense.survey';

/** The Discipline that grades a hide (the opposed sibling of awareness). */
const STEALTH_DISCIPLINE = 'stealth';

export default class HideController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor: Stuff = context.commandGiver;

    if (!MixinApi.isHiding(actor)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't hide.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'cannot-hide',
        detail: 'no-hiding-capability',
      });
      return;
    }

    // Snapshot the stealth band once, at command time (the sync gate reads
    // only the stored level). Warm the light/anatomy read the derivation
    // shares with the detection gate.
    await PerceptionApi.preloadForSenseGate(actor);
    const band = await AdvancementApi.bandFor(actor, STEALTH_DISCIPLINE).catch(
      () => CompetenceBand.FLOOR,
    );
    const level = PerceptionApi.hideLevelFor(actor, band);

    if (level === 'obvious') {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`There's nowhere to hide here — you'd be seen at once.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-cover',
        detail: 'hide-would-fail',
      });
      return;
    }

    actor.enterHide(level);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You slip out of sight, still and watchful.`)
      .send();
  }
}
