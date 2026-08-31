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
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { MixinApi } from '../../../../api/mixin';
import { EmploymentApi } from '../../../../api/employment';

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
    const organizationPath = (model.organization ?? '').trim();
    const organization = StuffApi.findByTemplatePath(organizationPath);
    if (!organization || !MixinApi.isOrganization(organization)) {
      return this.fail(
        context,
        `There is no organization at ${organizationPath}.`,
        'no-such-organization',
      );
    }

    const positionKey = (model.position ?? '').trim();
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

    const record = await EmploymentApi.hire(organization, appointee, positionKey);
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
