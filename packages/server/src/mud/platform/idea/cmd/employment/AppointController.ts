/**
 * AppointController — the `appoint` verb: fill a position on an
 * organization's chart.
 *
 * Without it **no position can ever be filled by a human**, which is the
 * same defect as the broken `office assign` — and every downstream
 * consumer of the chart (a press office that can publish, a registry with
 * a seated Magistrate) depends on a filled position.
 *
 * Authorization is declarative and lands **before** this controller runs:
 * `mustHoldAppointingAuthority` on the `organization` argument. A field
 * validator rather than a verb-level one because the authority belongs to
 * the organization the argument names, and `CommandContext` carries the
 * giver but not the bound model. By the time `execute` runs the giver is
 * already authorized — the controller re-derives no authority.
 *
 * ⭐ Holding an organization's appointing authority is the power to
 * **fill** a position, never to exercise one.
 *
 * Goes through the Api layer only: `EmploymentApi.hire`. Controllers
 * return `void`; the outcome rides the dispatch-response envelope.
 *
 * ⭐⭐ **`hire` is this verb too** (2026-10-09), and the reason is worth
 * keeping. The drilling build needed to take on an NPC standing at a
 * rig; this verb's target was `scope: "online"`, so it could not reach
 * one, and the trade shipped `hire`/`dismiss` controllers of its own.
 * That is a second word for an act this controller already performed —
 * and the ladder's first rung is **unify behind an interface**, the same
 * reason `grind` rides `mill` and `melt` rides `dip`. The target scope
 * widened, the position and the organization became optional, `hire`
 * became an alias, and the trade now ships no employment verbs at all.
 *
 * ⚠ The capability was never missing: `organization.appoint()` and
 * `organization.dismiss()` have both been on `OrganizationMixin` the
 * whole time. What was missing was a VIEW for the second one and a
 * reachable scope on the first — so a trade build wrote two controllers
 * to reach methods the kernel already exposed.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { MixinApi } from '../../../../api/mixin';
import { EmploymentApi } from '../../../../api/employment';
import type { OrganizationStuff } from '../../../../api/employment';

const TOPIC = 'shell.result';

interface AppointModel extends CommandModel {
  /** The resolved appointee (MQL `scope: online`). */
  target?: MqlOneResult | string;
  /** The position key being filled. */
  position?: string;
  /** The organization's durable templatePath. */
  organization?: string;
}

export default class AppointController extends CommandController<AppointModel> {
  async execute(
    model: AppointModel,
    context: CommandContext,
  ): Promise<void> {
    const resolved =
      model.target && typeof model.target === 'object'
        ? (model.target as MqlOneResult)
        : null;
    const appointee = resolved?.stuff ?? null;
    if (!appointee) {
      return this.fail(context, 'No such person.', 'no-target');
    }
    if (!MixinApi.isEmployed(appointee)) {
      return this.fail(
        context,
        `${appointee.getPresentation()} can't hold a position.`,
        'not-employable',
      );
    }

    // The organization resolved and the authority held — both already
    // proved by `mustHoldAppointingAuthority`. Re-resolving here is a
    // lookup, not a second gate.
    const asked = (model.organization ?? '').trim();
    // ⭐ Absent means *the house I run*. `businessOfProprietor` can only
    // return an organization the giver is the proprietor of, which is
    // why the authority validator lets an absent value through — see its
    // header. A NAMED organization took the field validator's gate
    // before this controller ran, exactly as before.
    const organization =
      asked.length === 0
        ? await this.houseIRun(context)
        : StuffApi.findByTemplatePath(asked);
    if (!organization || !MixinApi.isOrganization(organization)) {
      return this.fail(
        context,
        asked.length === 0
          ? 'You run no house here to put anybody on the books of.'
          : `There is no organization at ${asked}.`,
        asked.length === 0 ? 'no-house-of-your-own' : 'no-such-organization',
      );
    }
    const organizationPath = organization.getOrganizationPath() ?? asked;

    // ⚠ Absent position means *the one position this house has*. A house
    // with several refuses and NAMES them: which job somebody was just
    // given is not a thing to guess on their behalf.
    let positionKey = (model.position ?? '').trim();
    if (positionKey.length === 0) {
      const keys = organization.getPositions().map((p) => p.key);
      if (keys.length !== 1) {
        return this.fail(
          context,
          keys.length === 0
            ? `${organizationPath} has no positions authored.`
            : `Say which job: ${keys.join(', ')}.`,
          keys.length === 0 ? 'no-positions' : 'which-position',
        );
      }
      positionKey = keys[0] ?? '';
    }
    const position = organization.getPosition(positionKey);
    if (!position) {
      const known = organization
        .getPositions()
        .map((p) => p.key)
        .join(', ');
      return this.fail(
        context,
        known
          ? `No such position: ${positionKey || '(none)'} (try ${known}).`
          : `${organizationPath} has no positions authored.`,
        'unknown-position',
      );
    }

    const record = await organization.appoint(appointee, positionKey);
    if (!record) {
      return this.fail(
        context,
        'That appointment could not be recorded.',
        'hire-failed',
      );
    }

    this.tell(
      context,
      `\n${appointee.getPresentation()} is now ${position.label} ` +
        `at ${organizationPath}.\n`,
    );
  }

  /**
   * ⭐⭐ **The house an omitted `at` means: the one operating here whose
   * appointing authority I hold.**
   *
   * ⚠ Derived by AUTHORITY, not by proprietorship, and that is what
   * makes leaving the argument off safe. `mustHoldAppointingAuthority`
   * cannot see a bound model, so it passes an absent value — and this
   * asks `holdsAuthority` itself, the same predicate the validator would
   * have applied to a named house. So the omitted form is gated by
   * exactly the check the named form is gated by, and there is no path
   * here to a house whose authority the giver lacks.
   *
   * ⚠ Authority rather than `businessOfProprietor` for a second reason:
   * an authority may be an OFFICE. A press office's appointee is filled
   * by whoever holds the seat, who is not anybody's proprietor — and a
   * proprietor-keyed derivation would have worked at a rig and silently
   * failed at every chart in the Compact.
   *
   * Ambiguity refuses and NAMES the houses: picking one on somebody's
   * behalf is picking whose payroll changes.
   */
  private async houseIRun(
    context: CommandContext,
  ): Promise<OrganizationStuff | null> {
    const giver = context.commandGiver;
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const mine: OrganizationStuff[] = [];
    for (const house of EmploymentApi.operatorsAt(here)) {
      if (!MixinApi.isOrganization(house)) continue;
      if (await EmploymentApi.holdsAuthority(giver, house.getAppointingAuthority()))
        mine.push(house as unknown as OrganizationStuff);
    }
    if (mine.length === 1) return mine[0] ?? null;
    if (mine.length > 1) {
      this.fail(
        context,
        `Say which house: ${mine
          .map((h) => h.getOrganizationPath() ?? '?')
          .join(', ')}.`,
        'which-house',
      );
      return null;
    }
    // Nothing here — your own stall may simply be somewhere else.
    return EmploymentApi.businessOfProprietor(giver) as OrganizationStuff | null;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
