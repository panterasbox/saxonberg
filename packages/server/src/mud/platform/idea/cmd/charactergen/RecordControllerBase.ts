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
import { EmploymentApi } from '../../../../api/employment';
import { MqlApi } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';
import type { Stuff } from '../../../../lib/stuff/Stuff';

/** What a record read resolved its subject to. */
export type RecordSubject =
  | { kind: 'person'; stuff: Stuff }
  | { kind: 'body'; stuff: Stuff }
  | null;

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
    if (asked.trim() === '') return null;

    const person = MqlApi.resolveMany(asked, {
      commandGiver: context.commandGiver,
      scope: '~reachable',
    }).stuff.find((s) => MixinApi.isPersona(s));
    const body = this.findBody(asked);

    // ⭐ Which the words name better, by the one rule (naming overhaul
    // D-C5): a tie goes to the person in the room; when neither names
    // itself, MQL's loose match still answers.
    type Subject = Exclude<RecordSubject, null>;
    const entries: Array<{ value: Subject; keywords: string[]; title: string }> = [];
    if (person) entries.push({ value: { kind: 'person', stuff: person }, keywords: [person.getPresentation().toLowerCase()], title: person.getPresentation() });
    if (body) entries.push({ value: { kind: 'body', stuff: body }, keywords: [this.labelOf(body).toLowerCase()], title: this.labelOf(body) });
    const answer = GrammarApi.name(asked, entries);
    if (answer.kind === 'one') return answer.one;
    if (answer.kind === 'tie') return answer.tie[0]!;
    if (person) return { kind: 'person', stuff: person };
    if (body) return { kind: 'body', stuff: body };
    return null;
  }

  /**
   * A live organization by label or path — asked of the employment
   * subsystem, which owns the organization population. ⚠ Viewer-blind on
   * purpose: an organization is an `Idea`, not a thing standing in a room,
   * so "reachable" would find none of them — and a body of people is not
   * something a viewer's fog hides.
   */
  protected findBody(asked: string): Stuff | null {
    return EmploymentApi.findOrganization(asked);
  }

  /** What a body of people calls itself. */
  protected labelOf(body: Stuff): string {
    return EmploymentApi.organizationLabel(body);
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
