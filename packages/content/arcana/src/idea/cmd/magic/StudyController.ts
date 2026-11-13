/**
 * StudyController — `study <book>`.
 *
 * Takes a working on board from a spellbook, or sharpens one already
 * held. The whole result lands at the {@link StudyActivity}'s
 * *completion*; an interrupted study learns nothing (the `CastActivity`
 * contract).
 *
 * ⭐ **The book plans the study** (`Spellbook.studyPlanFor`,
 * controller-liquidity W13): the comprehension floor, the defective copy,
 * the savings curve and the claim at completion are the book's rules now.
 * This controller runs the plan as a `StudyActivity` and tells it.
 *
 * Three decisions the plan carries, each load-bearing:
 *
 * - **The claim is minted, the deed never is** (D13). Reading writes a
 *   chronicle claim and NO Transcript entry, so competence is untouched.
 *   Knowing a spell you cannot cast is the ordinary outcome.
 * - **Below the comprehension floor you get a DEFECTIVE copy, not a
 *   refusal** (D14). It costs far more on every cast, and the holder
 *   does not know. Recoverable by re-studying once competent.
 * - **Duration follows the savings curve** (D16): nearly-sharp refreshes
 *   fast, badly decayed takes far longer — which is what rewards regular
 *   light maintenance over cramming. Book **quality** scales that speed
 *   and NOTHING else; it has no say in how fast the copy then fades.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StudyActivity } from '@saxonberg/server/mud/lib/magic/StudyActivity';
import Spellbook from '../../../thing/Spellbook';

const TOPIC = 'act.deed';

interface StudyModel extends CommandModel {
  target: MqlOneResult;
}

export default class StudyController extends CommandController<StudyModel> {
  async execute(model: StudyModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const book = model.target?.stuff ?? null;

    if (!book) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' to study.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }

    const plan = book instanceof Spellbook ? await book.studyPlanFor(actor) : null;
    if (plan === null || !plan.ok) {
      const reason = plan?.reason ?? 'teaches-nothing';
      const said =
        reason === 'unknown-spell'
          ? Mml.compose`The pages set out a working the world no longer answers to.`
          : reason === 'no-mind'
            ? Mml.compose`You have no mind to hold a working in.`
            : Mml.compose`There is no working set out in ${Mml.thing(book)} to take on board.`;
      MessageApi.scene(actor).topic(TOPIC).toSelf(said).send();
      context.note(
        reason === 'no-mind'
          ? { kind: 'mixin-missing', mixin: 'MemorizedMixin' }
          : { kind: 'controller-rejected', reason, detail: reason },
      );
      return;
    }
    if (!MixinApi.isEngaged(actor)) {
      MessageApi.scene(actor).topic(TOPIC).toSelf(Mml.compose`You have no mind to hold a working in.`).send();
      context.note({ kind: 'mixin-missing', mixin: 'EngagedMixin' });
      return;
    }

    const { spellName, defective } = plan.facts;
    const activity = new StudyActivity({
      actor,
      spellPath: plan.facts.spellPath,
      durationMs: plan.durationMs,
      effortW: plan.effortW,
      onComplete: (): void => {
        void plan.onComplete();
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(
            defective
              ? // Deliberately confident prose: the reader does NOT know the
                // copy is bad (D14). The efficiency will tell them, on every
                // cast, which is the legible signal.
                Mml.compose`You close the book with ${spellName} fixed in your head.`
              : Mml.compose`${spellName} settles into place, clear and whole.`,
          )
          .send();
      },
      onAbort: (): void => {
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(Mml.compose`You lose the thread and the page with it.`)
          .send();
      },
    });

    const started = SchedulerApi.start(activity);
    if (!started.ok) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You are too busy to sit and read.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'engaged',
        detail: 'hands or attention already committed',
      });
      return;
    }

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You open ${Mml.thing(book)} and begin to read.`)
      .toPeers(Mml.compose`${Mml.actor(actor)} settles down with a book.`)
      .send();
  }
}
