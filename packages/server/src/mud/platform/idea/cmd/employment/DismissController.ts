/**
 * DismissController — the `dismiss` verb: take somebody off a house's
 * books.
 *
 * ⭐⭐ **The employer's half of `quit`, and until 2026-10-09 the game had
 * no way to say it.** `organization.dismiss(actor)` has been a sealed
 * method on `OrganizationMixin` the whole time — *"fire `actor` (status
 * → fired; history preserved)"* — and `quit` has always shipped for the
 * worker. What never shipped was a VIEW for the employer's side, so no
 * bar, smithy, ranch or press office could let anybody go.
 *
 * ⚠ It arrived here the long way round, and the route is the lesson. The
 * drilling build needed to pay a roustabout off, found no verb, and
 * shipped a `dismiss` controller **inside the trade pack** — which left
 * every other employer in the realm still unable to fire anyone. *A new
 * systemic capability appearing in a trade build is a symptom; look
 * upstream.* This is the upstream.
 *
 * Authorization is the same declarative gate `appoint` uses:
 * `mustHoldAppointingAuthority` on the `organization` argument, with an
 * absent value meaning *the house I am the proprietor of* — a derivation
 * that can only reach your own house. By the time `execute` runs the
 * giver is authorized and this controller re-derives no authority.
 *
 * ⭐ The wage settlement is not this file's: `fire` flips the record and
 * the shift's own accrual is what the hand is owed. A controller that
 * computed a final figure would be a second source of truth for a number
 * the employment ledger already holds.
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

interface DismissModel extends CommandModel {
  /** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
  target?: MqlOneResult | string;
  /** The house's durable templatePath, or absent for your own. */
  organization?: string;
}

export default class DismissController extends CommandController<DismissModel> {
  async execute(
    model: DismissModel,
    context: CommandContext,
  ): Promise<void> {
    const resolved =
      model.target && typeof model.target === 'object'
        ? (model.target as MqlOneResult)
        : null;
    const hand = resolved?.stuff ?? null;
    if (!hand) {
      return this.fail(context, 'No such person.', 'no-target');
    }

    const asked = (model.organization ?? '').trim();
    const organization =
      asked.length === 0
        ? await this.houseIRun(context)
        : StuffApi.findByTemplatePath(asked);
    if (!organization || !MixinApi.isOrganization(organization)) {
      return this.fail(
        context,
        asked.length === 0
          ? 'You run no house here to take anybody off the books of.'
          : `There is no organization at ${asked}.`,
        asked.length === 0 ? 'no-house-of-your-own' : 'no-such-organization',
      );
    }

    // ⚠ Fails on the SUBJECT rather than silently succeeding: letting go
    // of somebody who never worked for you must not read as a dismissal.
    if (!organization.employs(hand)) {
      return this.fail(
        context,
        `${hand.getPresentation()} is not on those books.`,
        'not-employed-here',
      );
    }

    await organization.dismiss(hand);
    this.tell(
      context,
      `\n${hand.getPresentation()} is off the books, and paid up to now.\n`,
    );
  }

  /**
   * The house an omitted `at` means — see
   * {@link AppointController} for why this is derived by AUTHORITY
   * rather than by proprietorship, and why that makes omitting the
   * argument gated by exactly the check naming it is gated by.
   *
   * Ambiguity refuses and NAMES the houses.
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
