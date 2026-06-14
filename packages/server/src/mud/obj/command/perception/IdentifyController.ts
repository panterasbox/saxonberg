/**
 * IdentifyController — the thin type-axis trigger (`read scroll of
 * identify`, surfaced as the scroll-carried `identify <item>` verb).
 *
 * On success, writes the actor's `IDENTIFICATION`-realm belief record
 * for the target's type (keyed by `templatePath`); the item thereafter
 * renders by its known type to that viewer and stays unidentified to
 * everyone else. Binary — unidentified ↔ identified, no partial levels.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { RecognitionApi } from '../../../api/recognition';
import { IDENTIFICATION } from '../../../lib/belief/BeliefStore';
import type { MqlOneResult } from '../../../api/mql';
import { Mml } from '../../../api/mml';

interface IdentifyModel extends CommandModel {
  target?: MqlOneResult;
}

const TOPIC = 'world.perception.sense.look';

export default class IdentifyController extends CommandController<IdentifyModel> {
  execute(model: IdentifyModel, context: CommandContext): void {
    const actor = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target) {
      context.note({ kind: 'controller-rejected', reason: 'no-target', detail: '' });
      return;
    }

    if (!MixinApi.isIdentifiable(target)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`There's nothing hidden to learn about ${Mml.name(target)}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-identifiable',
        detail: target.stuffId,
      });
      return;
    }

    const signature = target.getTemplatePath();
    if (!MixinApi.isBeliefStore(actor) || !signature) {
      context.note({
        kind: 'controller-rejected',
        reason: 'cannot-record',
        detail: target.stuffId,
      });
      return;
    }

    actor.know(IDENTIFICATION, signature, { typeKnown: true });

    // Re-render so the confirmation shows the now-known type.
    const revealed = RecognitionApi.describe(actor, target);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`The scroll's letters crawl, and you know it: ${revealed}.`)
      .send();
  }
}
