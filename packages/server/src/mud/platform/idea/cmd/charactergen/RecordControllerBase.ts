/**
 * RecordControllerBase — the shared subject resolution behind the two
 * record reads (`chronicle` and `competence`).
 *
 * Both verbs ask the same question — *whose record?* — and both can be
 * answered by two different kinds of thing: a **person** standing in
 * reach, or a **body of people** that is an `Idea` and stands nowhere.
 * The `BankingControllerBase` precedent: a shared abstract controller,
 * not a free helper module.
 *
 * ## ⚠⚠ The rule, and why it is not "whatever MQL returns first"
 *
 * The live drive found both failure directions in one run:
 *
 *   - `competence dave` answered **"Dave's Bar"** — the Business Idea,
 *     whose `name` also contains "dave" — and reported that a bar knows
 *     nothing about bartending;
 *   - `chronicle the watch` answered **"a watchful sentry"**, because
 *     MQL matches a prefix and *watch* is a prefix of *watchful*. The
 *     watch that the sentry answers to was unreachable behind the sentry.
 *
 * ⭐ **So a subject must be addressed by a word it actually calls
 * itself.** A person by a word of their presentation; a body of people by
 * a word of its label. Both halves are "what the thing says its name is",
 * which is the honest symmetry — and it settles both cases without a
 * special rule for either: *watch* is a whole word of "the Watch of the
 * Last Counted Mile" and only a prefix inside "a watchful sentry", while
 * *dave* is a whole word of "Dave" and only a fragment of "Dave's".
 *
 * A tie goes to the person, because someone standing in front of you is
 * the likelier subject. And when NEITHER matches on a whole word, MQL's
 * loose match still answers, so `competence sentr` keeps working.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { MqlApi } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';

/** What a record read resolved its subject to. */
export type RecordSubject =
  | { kind: 'person'; stuff: Stuff }
  | { kind: 'body'; stuff: Stuff }
  | null;

/** The words a phrase is made of, lowercased and punctuation-stripped. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Drop a leading article — "the watch" and "watch" name one thing. */
function needleOf(asked: string): string {
  return asked.trim().toLowerCase().replace(/^(the|a|an)\s+/, '');
}

/** Whether `needle` is a WHOLE word of `text` (not merely a prefix). */
function namesItself(text: string, needle: string): boolean {
  const parts = words(needle);
  if (parts.length === 0) return false;
  const pool = words(text);
  return parts.every((p) => pool.includes(p));
}

export abstract class RecordControllerBase<
  M extends CommandModel,
> extends CommandController<M> {
  /**
   * The subject of a record read, or `null` when nothing answers to the
   * phrase. See the class doc for the precedence rule.
   */
  protected resolveSubject(
    asked: string,
    context: CommandContext,
  ): RecordSubject {
    const needle = needleOf(asked);
    if (!needle) return null;

    const person = MqlApi.resolveMany(asked, {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff.find((s) => MixinApi.isPersona(s));
    const body = this.findBody(needle);

    const personNames =
      person !== undefined && namesItself(person.getPresentation(), needle);
    const bodyNames = body !== null && namesItself(this.labelOf(body), needle);

    // A whole-word match wins; a tie goes to the person in the room.
    if (personNames) return { kind: 'person', stuff: person };
    if (bodyNames) return { kind: 'body', stuff: body };
    // Neither names itself exactly — MQL's loose match still answers, so
    // a half-typed keyword keeps working.
    if (person) return { kind: 'person', stuff: person };
    if (body) return { kind: 'body', stuff: body };
    return null;
  }

  /**
   * A live organization by label or path. ⚠ System-scoped on purpose: an
   * organization is an `Idea`, not a thing standing in a room, so
   * "reachable" would find none of them — and a body of people is not
   * something a viewer's fog hides.
   */
  protected findBody(needle: string): Stuff | null {
    const candidates = MqlApi.resolveMany('world:[mixin.OrganizationMixin]', {
      commandGiver: null,
      scope: 'world',
    }).stuff;
    let loose: Stuff | null = null;
    for (const org of candidates) {
      const label = needleOf(this.labelOf(org));
      const path = (org.getTemplatePath() ?? '').toLowerCase();
      if (namesItself(label, needle)) return org;
      if (loose === null && (label.includes(needle) || path.endsWith(`/${needle}`))) {
        loose = org;
      }
    }
    return loose;
  }

  /** What a body of people calls itself. */
  protected labelOf(body: Stuff): string {
    return MixinApi.isPublisher(body)
      ? body.getLabel()
      : body.getPresentation();
  }

  protected fail(
    context: CommandContext,
    message: string,
    reason: string,
    topic: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(topic)
      .toSelf(Mml.compose`${message}`)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: message });
  }
}
