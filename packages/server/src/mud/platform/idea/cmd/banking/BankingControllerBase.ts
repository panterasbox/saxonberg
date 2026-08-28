/**
 * BankingControllerBase — shared resolution helpers for the banking verbs.
 *
 * The dispatch-on-subcommand controllers (`bank` / `wallet` / `tab` /
 * `reserve` / `house`) and the flat `pay` verb all extend this. Resolving
 * the present bank / venue / bartender is the "agent performs, venue owns
 * the state" pattern (the `Menu`/crafting precedent).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MqlApi } from "../../../../api/mql";
import { MixinApi } from "../../../../api/mixin";
import { StuffApi } from "../../../../api/stuff";
import { EmploymentApi } from "../../../../api/employment";
import type { Business } from "../../../../api/employment";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export abstract class BankingControllerBase<
  T extends CommandModel = CommandModel,
> extends CommandController<T> {
  /**
   * MQL enumeration of the room's occupants (the `peers` seed) — the shared
   * candidate pool the capability filters below run over, in place of a
   * hand-rolled containment scan.
   */
  private peers(context: CommandContext): Stuff[] {
    return MqlApi.resolveMany("peers", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    }).stuff;
  }

  /** The affording bank counter, else the BankMixin host present in the room. */
  protected resolveBank(context: CommandContext): (Stuff & Bank) | null {
    const source = context.commandSource as Stuff | undefined;
    if (source && MixinApi.isBank(source)) return source;
    // MQL enumerates; `isBank` is the interim capability filter (a future
    // MQL type/mixin predicate subsumes it).
    return (
      this.peers(context).find((s): s is Stuff & Bank =>
        MixinApi.isBank(s),
      ) ?? null
    );
  }

  /**
   * The presentation of the Business whose account key is `ownerKey`, or
   * null when the key names no live business (a player's own key).
   */
  static businessNamed(ownerKey: string): string | null {
    const live = StuffApi.findByTemplatePath(ownerKey);
    return live && MixinApi.isBusiness(live) ? live.getPresentation() : null;
  }

  /**
   * ⭐ The house the giver acts for: the Business operating **here** when
   * the giver holds a position there or proprietors it, else the single
   * one they buy for, else null. Authority is the seat's — a position
   * held or the proprietorship — never the wizard axis and never a carried
   * screen.
   */
  protected async resolveHouse(
    context: CommandContext,
  ): Promise<(Stuff & Business) | null> {
    const giver = context.commandGiver;
    const herePath = context.location?.getTemplatePath() ?? "";
    const here = herePath ? EmploymentApi.businessAt(herePath) : null;
    if (
      here &&
      (EmploymentApi.holdsPosition(giver, here) ||
        (await EmploymentApi.isProprietorOf(giver, here)))
    ) {
      return here;
    }
    const mine = await EmploymentApi.buysFor(giver);
    return mine[0] ?? null;
  }

  /** A present bartender (an active MakerMixin agent) — the house's rep. */
  protected presentBartender(context: CommandContext): Stuff | null {
    return this.peers(context).find((s) => MixinApi.isMaker(s)) ?? null;
  }
}
