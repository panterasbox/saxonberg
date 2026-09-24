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

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import MeasureBook from '../../thing/MeasureBook';
import { measurementsOf } from '../cmd/tailoring/CutController';

const TOPIC = 'act.deed';

interface MeasureModel extends CommandModel {
  detail?: string;
  subject?: MqlOneResult;
  /** The book — bound by the view (`[class.MeasureBook]`), never hunted for. */
  book?: MqlOneResult;
}

export default class FigureReading extends Reading {
  protected override async measure(
    context: CommandContext,
    bound: Stuff | null,
    instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    // ⚠⚠ The mistyped-name case, preserved deliberately. The channel's
    // scope is `[subject]` and NOT `[subject, self]`, because falling
    // through to `self` when a name resolved to nobody would silently
    // measure YOU every time you mistyped somebody — which is exactly
    // the collapse the comment below has always warned about. An empty
    // `param` is a bare `measure figure` and means yourself; a non-empty
    // one that bound nothing is a name that found no one.
    const model = {
      subject: bound ? { stuff: bound, raw: param } : param === '' ? undefined : { stuff: null, raw: param },
      book: { stuff: instrument },
    } as unknown as MeasureModel;
    const giver = this.actorOf(context);
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
    const person = named?.stuff ?? giver;
    const bookStuff = model.book?.stuff ?? null;
    const book = bookStuff instanceof MeasureBook ? bookStuff : null;
    if (!book) {
      this.decline(
        context,
        Mml.compose`There is no book here to write it in. A measurement nobody records is a measurement nobody keeps.`,
        'no-book',
      );
      return;
    }
    const measured = measurementsOf(person);
    if (!measured) {
      this.decline(
        context,
        Mml.compose`There is nothing there to measure.`,
        'unmeasurable',
      );
      return;
    }

    const before = book.stalenessFor(person.stuffId, measured.girth);
    book.record({
      subject: person.stuffId,
      name: person.getPresentation(),
      bodyPlan: measured.bodyPlan,
      statureM: measured.stature,
      girthIndex: measured.girth,
    });

    /*
     * ⚠ The self case gets its own sentence. `You take <your own name>'s
     * measure` is the kind of line that reads like a bug, and it is now
     * the DEFAULT form of the command, not a curiosity.
     */
    const own = person === giver;
    const moved = before !== null && before > 0.05;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        own
          ? moved
            ? Mml.compose`You run the tape over yourself and write it in. You have moved since last time — enough that anything cut to the old figures would sit wrong.`
            : Mml.compose`You run the tape over yourself and write it in.`
          : moved
            ? Mml.compose`You take ${Mml.actor(person)}'s measure and write it in. It has moved since last time — enough that anything cut to the old figures would have sat wrong.`
            : Mml.compose`You take ${Mml.actor(person)}'s measure and write it in.`,
      )
      .toPeers(
        own
          ? Mml.compose`${Mml.actor(giver)} runs a tape over themselves and writes something down.`
          : Mml.compose`${Mml.actor(giver)} runs a tape over ${Mml.actor(person)} and writes something down.`,
      )
      .send();
  }

}
