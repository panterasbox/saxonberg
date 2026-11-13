/**
 * PartyControllerBase — what every `party` subcommand shares
 * (controllers-are-io W7, D9: one controller per subcommand over a base per
 * noun). The player's whole party surface: `form` / `invite` / `enlist` /
 * `accept` / `leave` / `kick` / `disband` / `transfer` / `side` / `adopt` /
 * `assign` / `muster` / `standdown` / `list` / `show` (bare `party` shows).
 *
 * Each controller is a thin translator: it narrows the giver to a party
 * member ({@link PartyControllerBase.memberOf}), resolves any target, and
 * forwards to the member's own party methods / the gated `PartyApi`. All
 * the party invariants (one-active-party, captain-only mutations,
 * succession, durable-vs-ad-hoc lifetime) live in `PartyLogic`, never here.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { PlayerApi } from "../../../../api/player";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { PartyMember } from '../../../../lib/party/PartyMember';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';

const TOPIC = "shell.result";

export interface PartyModel extends CommandModel {
  subcommand?: string;
  name?: string;
  target?: MqlOneResult;
  durable?: boolean;
}

export abstract class PartyControllerBase extends CommandController<PartyModel> {
  /** The giver as a party member, or null after refusing (it cannot join one). */
  protected memberOf(context: CommandContext): (Stuff & PartyMember) | null {
    const giver = context.commandGiver as Stuff & CommandGiver & PartyMember;
    if (!MixinApi.isPartyMember(giver)) {
      this.fail(context, "You can't join a party.", "not-a-party-member");
      return null;
    }
    return giver;
  }

  /**
   * A durable member ref, the one the party keys its roster on
   * (`PartyMember.partyMemberId`): an Avatar's playerId, else the PERSON
   * (`getIdentityPath()` — never the lineage every clone of a row shares,
   * controller-liquidity D11).
   */
  protected refOf(stuff: Stuff): string {
    if (MixinApi.isPartyMember(stuff)) return stuff.partyMemberId();
    if (PlayerApi.isAvatarStuff(stuff)) return stuff.getPlayerId() ?? "";
    return stuff.getIdentityPath() ?? "";
  }

  protected reasonText(reason: string): string {
    switch (reason) {
      case "already-in-a-party":
        return "You're already in a party — leave it first.";
      case "not-in-a-party":
        return "You're not in a party.";
      case "not-the-captain":
        return "Only the party's captain can do that.";
      case "target-already-in-a-party":
        return "They're already in a party.";
      case "no-invite":
        return "You have no pending party invite.";
      case "no-such-crew":
        return "You have no durable crew by that name.";
      case "not-a-member":
        return "They're not in your party.";
      case "unknown-formation":
        return "No such formation. Try: default, focus-fire, vanguard, master-apprentice.";
      case "no-formation":
        return "Adopt a formation first (`party adopt <name>`).";
      case "unknown-role":
        return "Your formation has no such role.";
      default:
        return "That party command can't be completed.";
    }
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    this.send(context, Mml.fromMarkup(Mml.escape(detail)));
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }
}
