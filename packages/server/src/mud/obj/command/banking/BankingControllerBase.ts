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
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Bank } from "../../../lib/banking/Bank";
import type { Tab } from "../../../lib/banking/Tab";

export abstract class BankingControllerBase<
  T extends CommandModel = CommandModel,
> extends CommandController<T> {
  /** The affording bank counter, else the first BankMixin host in the room. */
  protected resolveBank(context: CommandContext): (Stuff & Bank) | null {
    const source = context.commandSource as Stuff | undefined;
    if (source && MixinApi.isBank(source)) return source;
    const loc = context.location;
    if (loc && MixinApi.isContainer(loc)) {
      for (const c of ContainmentApi.getContents(loc)) {
        if (MixinApi.isBank(c)) return c as Stuff & Bank;
      }
    }
    return null;
  }

  /** The establishment the actor is in (a TabMixin Location), or null. */
  protected resolveVenue(context: CommandContext): (Stuff & Tab) | null {
    const loc = context.location;
    if (loc && MixinApi.isTab(loc)) return loc as Stuff & Tab;
    return null;
  }

  /** A present bartender (a MakerMixin agent) — the house's representative. */
  protected presentBartender(context: CommandContext): Stuff | null {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return null;
    for (const c of ContainmentApi.getContents(loc)) {
      if (MixinApi.isMaker(c)) return c;
    }
    return null;
  }
}
