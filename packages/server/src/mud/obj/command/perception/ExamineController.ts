/**
 * ExamineController — `examine <target>`: the instantaneous close-inspection
 * variant of `search` (D5). No engagement window, no time cost — it applies
 * a one-shot active-perception bump (`concealment.examineBonus`, smaller than
 * a full search) folding into the same `PerceptionApi.resolveSearch` at the
 * `glance` depth. Peer into a named container for anything half-concealed;
 * you turn up less than a proper `search`, but lose no time. Graded by the
 * examiner's `awareness` competence (warmed via `preloadForSenseGate`).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { Mml } from '../../../api/mml';
import Exit from '../../../lib/boundary/Exit';

const TOPIC = 'world.perception.search';

interface ExamineModel extends CommandModel {
  target?: MqlOneResult;
}

export default class ExamineController extends CommandController<ExamineModel> {
  async execute(model: ExamineModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You don't see any '${
            model.target?.raw ?? ''
          }' to examine.`,
        )
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target?.raw ?? '',
      });
      return;
    }

    // Warm the `awareness` band so the glance reads a live competence snapshot.
    await PerceptionApi.preloadForSenseGate(actor);

    // A quick peer into the target — its contents if it's a container, else
    // there's nothing to open (still a valid, if empty, close look).
    const scope: Stuff[] = MixinApi.isContainer(target)
      ? [...ContainmentApi.getContents(target)]
      : [];

    const found = PerceptionApi.resolveSearch(actor, scope, 'glance');
    const hints = PerceptionApi.hintsFor(actor, scope);

    let body: Mml;
    if (found.length > 0) {
      const list = Mml.list(found.map((f) => this.render(f)));
      body = Mml.compose`Looking closely, you notice: ${list}.`;
    } else {
      body = Mml.compose`You look closely at ${Mml.item(
        target,
      )}, but nothing new stands out.`;
    }
    for (const cand of hints) {
      const tell = MixinApi.isConcealable(cand)
        ? cand.getConcealmentHint()
        : undefined;
      body = Mml.compose`${body}\n${
        tell
          ? Mml.fromMarkup(tell)
          : Mml.compose`Something here almost catches your eye.`
      }`;
    }

    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }

  private render(found: Stuff): Mml {
    if (found instanceof Exit) return Mml.exit(found);
    return Mml.item(found);
  }
}
