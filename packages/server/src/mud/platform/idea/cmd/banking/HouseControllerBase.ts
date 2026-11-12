/**
 * HouseControllerBase — what the `house` subcommands share
 * (controllers-are-io W7, D9: *a transaction with an institution's book is
 * a subcommand of its noun*). The roster and the operating account are the
 * house's books, so `appoint`, `dismiss` and `draw` moved under `house`
 * beside `book` / `pnl` / `payroll` / `roster`; each subcommand has its
 * own controller (`HouseAppointController`, `HouseDismissController`,
 * `HouseDrawController`, and the reads `HouseBookController`,
 * `HousePnlController`, `HousePayrollController`, `HouseRosterController`
 * — controller-liquidity W7a). trade-shopkeeping's `house par` / `price` /
 * `stock` ride this base too.
 *
 * ⚠ **Gated on the SEAT, never the wizard axis.** The code-trust axis is
 * TypeScript and nothing else; venue authority comes from a position held
 * or the proprietorship (`resolveHouse`). A thief holding the house tablet
 * gets `house stock` (the sheet is what the screen shows) but `wallet use
 * house` and a house-stamped `buy` refuse them — money authority is only
 * ever the wallet's, and the wallet's is the position's.
 *
 * Holds the one derivation appoint and dismiss both need — *the house an
 * omitted `at` means* — the house the reads keep (`houseKept`), and the
 * shell-result words they speak.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { MixinApi } from "../../../../api/mixin";
import { EmploymentApi } from "../../../../api/employment";
import type { Business, OrganizationStuff } from "../../../../api/employment";
import type { Stuff } from "../../../../lib/stuff/Stuff";

const TOPIC = "shell.result";

export abstract class HouseControllerBase<
  T extends CommandModel = CommandModel,
> extends BankingControllerBase<T> {
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
  protected async houseIRun(
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

  /** The house the giver keeps, or a `not-staff` rejection. */
  protected async houseKept(context: CommandContext): Promise<(Stuff & Business) | null> {
    const house = await this.resolveHouse(context);
    if (!house) {
      MessageApi.scene(context.commandGiver)
        .topic("act.deed")
        .toSelf(Mml.compose`You don't keep any house here.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "not-staff", detail: "house" });
    }
    return house;
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
