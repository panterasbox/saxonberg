/**
 * MeasureFigureController — `measure figure [<person>]`, and ⭐ **the
 * fitting is a SCENE.**
 *
 * Being measured is an interaction with another character, and it is
 * *mechanically necessary* because a `cutTo` stamp needs a subject.
 * Neither of the other two trades has a beat like it.
 *
 * ⭐⭐ **It is `figure`, not `customer`, and the axis is the point.**
 * Every other stanza on `measure` names the CHANNEL being read —
 * `light`, `temperature`, `density`, `strike`, `dip`. `customer` named
 * the subject's SOCIAL ROLE instead, which is why it read oddly: it was
 * the only one answering *who* where all its siblings answer *what*.
 * And the role is not even true outside a shop — a quartermaster
 * measuring recruits for livery, a parent measuring a child, or you
 * measuring yourself are all this act, and none of them involves a
 * customer. `figure` is the tailor's own word for exactly the two
 * numbers taken, and it is a channel.
 *
 * ⭐ Which is why the subject **defaults to you**. Taking your own
 * measure needs no shop and raises no consent question at all, so the
 * un-shopped case is the DEFAULT case rather than an embarrassment.
 *
 * ⚠⚠ **What actually gates this is the BOOK, and nothing else.** An
 * earlier header claimed *"the attendant lease IS the consent"* — that
 * the queue-and-be-served relationship was the agreement, and that
 * measuring a non-customer was not offered. **Nothing here ever read a
 * lease.** The gates are, and have only ever been: a subject that is an
 * organism, and a `MeasureBook` in hand or in the room. The claim was
 * prose over an empty check, which is the failure mode where a word
 * that asserts nothing cannot be caught being wrong — so it is deleted
 * rather than softened.
 *
 * ⭐ The honest consent model, when somebody builds it: **the tape is
 * the instrument, and the instrument is what needs the permission.**
 * `measure strike` already needs a surveyor's compass; by eye you would
 * get a rough figure at worse resolution, and with a tape a good one
 * and a reason to have been allowed to touch. That is
 * competence-buys-resolution applied to a body, and it is a slate, not
 * a rename.
 *
 * ⚠ It is a **STANZA** on the shipped `measure` view, not a verb — the
 * `measure strike` / `measure dip` precedent, where a platform view
 * names a pack controller by absolute path. Zero new verbs.
 *
 * ⭐ And it is **free**, on purpose: the loss-leader that gets you into
 * the book and brings you back. Real retail behaviour, and it is what
 * makes the book fill up.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import MeasureBook from '../../../thing/MeasureBook';
import { measurementsOf } from '../tailoring/CutController';

const TOPIC = 'act.deed';

interface MeasureModel extends CommandModel {
  detail?: string;
  subject?: MqlOneResult;
}

export default class MeasureFigureController extends CommandController<MeasureModel> {
  execute(model: MeasureModel, context: CommandContext): void {
    const giver = context.commandGiver;
    /*
     * ⭐ Three cases, and they are genuinely different answers.
     *
     * The view declares `default: "me"`, so a bare `measure figure`
     * normally arrives already bound to the giver. Falling back here as
     * well is not belt-and-braces: it is what keeps taking your own
     * measure working when the arg is simply absent.
     *
     * ⚠ But a bound arg that resolved to NOTHING is a different thing
     * from an absent one — the player named somebody and the name found
     * no one. Collapsing the two would silently measure yourself
     * whenever you mistyped a name, so a raw with no stuff gets the
     * shipped `empty-result` shape instead.
     */
    const named = model.subject;
    if (named && named.stuff === null) {
      const raw = named.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'subject', query: raw });
      return;
    }
    const subject = named?.stuff ?? giver;
    const book = findBook(giver);
    if (!book) {
      this.decline(
        context,
        Mml.compose`There is no book here to write it in. A measurement nobody records is a measurement nobody keeps.`,
        'no-book',
      );
      return;
    }
    const measured = measurementsOf(subject);
    if (!measured) {
      this.decline(
        context,
        Mml.compose`There is nothing there to measure.`,
        'unmeasurable',
      );
      return;
    }

    const before = book.stalenessFor(subject.stuffId, measured.girth);
    book.record({
      subject: subject.stuffId,
      name: subject.getPresentation(),
      bodyPlan: measured.bodyPlan,
      statureM: measured.stature,
      girthIndex: measured.girth,
    });

    /*
     * ⚠ The self case gets its own sentence. `You take <your own name>'s
     * measure` is the kind of line that reads like a bug, and it is now
     * the DEFAULT form of the command, not a curiosity.
     */
    const own = subject === giver;
    const moved = before !== null && before > 0.05;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        own
          ? moved
            ? Mml.compose`You run the tape over yourself and write it in. You have moved since last time — enough that anything cut to the old figures would sit wrong.`
            : Mml.compose`You run the tape over yourself and write it in.`
          : moved
            ? Mml.compose`You take ${Mml.actor(subject)}'s measure and write it in. It has moved since last time — enough that anything cut to the old figures would have sat wrong.`
            : Mml.compose`You take ${Mml.actor(subject)}'s measure and write it in.`,
      )
      .toPeers(
        own
          ? Mml.compose`${Mml.actor(giver)} runs a tape over themselves and writes something down.`
          : Mml.compose`${Mml.actor(giver)} runs a tape over ${Mml.actor(subject)} and writes something down.`,
      )
      .send();
  }

  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/** The book on the counter here — held first, then the room. */
function findBook(giver: Stuff): MeasureBook | null {
  const candidates: Stuff[] = [];
  if (MixinApi.isContainer(giver)) candidates.push(...giver.getContents());
  if (MixinApi.isContainable(giver)) {
    const loc = giver.getContainer();
    if (loc && MixinApi.isContainer(loc)) candidates.push(...loc.getContents());
  }
  for (const c of candidates) if (c instanceof MeasureBook) return c;
  return null;
}
