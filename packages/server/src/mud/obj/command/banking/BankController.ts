/**
 * BankController — shared base for the branch verbs (open / deposit /
 * withdraw / transfer / balance). Resolves the present bank (the affording
 * `BankMixin` counter, else the first one in the room) — the "agent performs,
 * venue owns the state" resolution the `Menu`/crafting precedent uses.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Bank } from "../../../lib/banking/Bank";

export abstract class BankController<
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
}
