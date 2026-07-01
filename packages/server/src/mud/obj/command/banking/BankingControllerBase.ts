/**
 * BankingControllerBase — shared resolution helpers for the banking verbs.
 *
 * The dispatch-on-subcommand controllers (`bank` / `wallet` / `tab` /
 * `reserve` / `house`) and the flat `pay` verb all extend this. Resolving
 * the present bank / venue / bartender is the "agent performs, venue owns
 * the state" pattern (the `Menu`/crafting precedent).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MqlApi } from "../../../api/mql";
import { MixinApi } from "../../../api/mixin";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Bank } from "../../../lib/banking/Bank";
import type { Tab } from "../../../lib/banking/Tab";

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

  /** The establishment the actor is in (a TabMixin Location), or null. */
  protected resolveVenue(context: CommandContext): (Stuff & Tab) | null {
    const loc = context.location;
    if (loc && MixinApi.isTab(loc)) return loc as Stuff & Tab;
    return null;
  }

  /** A present bartender (an active MakerMixin agent) — the house's rep. */
  protected presentBartender(context: CommandContext): Stuff | null {
    return this.peers(context).find((s) => MixinApi.isMaker(s)) ?? null;
  }
}
