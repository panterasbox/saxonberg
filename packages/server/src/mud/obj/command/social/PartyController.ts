/**
 * PartyController — the `party` verb (subcommand dispatch), the player's
 * whole party surface: `form` / `invite` / `accept` / `leave` / `kick` /
 * `disband` / `transfer` / `side` / `muster` / `standdown` / `list` /
 * `show`. Mirrors `GroupController`'s subcommand shape.
 *
 * The controller is a thin translator: it narrows the giver to an Avatar,
 * resolves any target, and forwards to the gated `PartyApi`. All the
 * party invariants (one-active-party, captain-only mutations, succession,
 * durable-vs-ad-hoc lifetime) live in `PartyLogic`, never here.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { PlayerApi } from "../../../api/player";
import { PartyApi } from "../../../api/party";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";

const TOPIC = "system.shell.party";

interface PartyModel extends CommandModel {
  subcommand?: string;
  name?: string;
  target?: MqlOneResult;
  durable?: boolean;
}

/** A durable member ref: an Avatar's playerId, else a templatePath. */
function refOf(stuff: Stuff): string {
  if (PlayerApi.isAvatarStuff(stuff)) return stuff.getPlayerId() ?? "";
  return stuff.getTemplatePath() ?? "";
}

export default class PartyController extends CommandController<PartyModel> {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isPartyMember(giver)) {
      return this.fail(context, "You can't join a party.", "not-a-party-member");
    }
    const sub = model.subcommand ?? "show";
    switch (sub) {
      case "form":
        return this.executeForm(giver, model, context);
      case "invite":
        return this.executeInvite(giver, model, context);
      case "enlist":
        return this.executeEnlist(giver, model, context);
      case "accept":
        return this.executeAccept(giver, context);
      case "leave":
        return this.executeLeave(giver, context);
      case "kick":
        return this.executeKick(giver, model, context);
      case "disband":
        return this.executeDisband(giver, context);
      case "transfer":
        return this.executeTransfer(giver, model, context);
      case "side":
        return this.executeSide(giver, model, context);
      case "muster":
        return this.executeMuster(giver, model, context);
      case "standdown":
        return this.executeStandDown(giver, context);
      case "list":
        return this.executeList(giver, context);
      case "show":
        return this.executeShow(giver, context);
      default:
        return this.fail(context, `Unknown party command '${sub}'.`, "unknown-subcommand");
    }
  }

  private async executeForm(
    giver: Stuff,
    model: PartyModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? "").trim();
    if (!name) return this.fail(context, "Name your party.", "name-required");
    const res = await PartyApi.form(giver, name, model.durable === true);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    const kind = res.party.isDurable() ? "durable crew" : "party";
    this.send(context, Mml.compose`You form the ${kind} ${Mml.escape(name)}.`);
  }

  private async executeInvite(
    giver: Stuff,
    model: PartyModel,
    context: CommandContext,
  ): Promise<void> {
    const target = model.target?.stuff;
    if (!target) {
      return this.fail(context, "Invite whom?", "empty-result");
    }
    const res = await PartyApi.invite(giver, target);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You invite ${Mml.name(target)} to your party.`,
    );
  }

  private async executeEnlist(
    giver: Stuff,
    model: PartyModel,
    context: CommandContext,
  ): Promise<void> {
    const target = model.target?.stuff;
    if (!target) return this.fail(context, "Enlist whom?", "empty-result");
    const res = await PartyApi.enlist(giver, target);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You take ${Mml.name(target)} into your party.`,
    );
  }

  private async executeAccept(
    giver: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const res = await PartyApi.accept(giver);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You join ${Mml.escape(res.party.getName())}.`,
    );
  }

  private async executeLeave(
    giver: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const res = await PartyApi.leave(giver);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(context, Mml.fromMarkup("You leave your party."));
  }

  private async executeKick(
    giver: Stuff,
    model: PartyModel,
    context: CommandContext,
  ): Promise<void> {
    const target = model.target?.stuff;
    if (!target) return this.fail(context, "Remove whom?", "empty-result");
    const res = await PartyApi.kick(giver, refOf(target));
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You remove ${Mml.name(target)} from the party.`,
    );
  }

  private async executeDisband(
    giver: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const res = await PartyApi.disband(giver);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(context, Mml.fromMarkup("You disband the party."));
  }

  private async executeTransfer(
    giver: Stuff,
    model: PartyModel,
    context: CommandContext,
  ): Promise<void> {
    const target = model.target?.stuff;
    if (!target) return this.fail(context, "Hand leadership to whom?", "empty-result");
    const res = await PartyApi.transfer(giver, refOf(target));
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You hand the party to ${Mml.name(target)}.`,
    );
  }

  private async executeSide(
    giver: Stuff,
    model: PartyModel,
    context: CommandContext,
  ): Promise<void> {
    const side = (model.name ?? "").trim();
    if (!side) return this.fail(context, "Name the side.", "name-required");
    const res = await PartyApi.setSide(giver, side);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(context, Mml.compose`Your party stands with ${Mml.escape(side)}.`);
  }

  private async executeMuster(
    giver: Stuff,
    model: PartyModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? "").trim();
    if (!name) return this.fail(context, "Muster which crew?", "name-required");
    const res = await PartyApi.muster(giver, name);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You muster ${Mml.escape(res.party.getName())}.`,
    );
  }

  private async executeStandDown(
    giver: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const res = await PartyApi.standDown(giver);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(context, Mml.fromMarkup("You stand your party down."));
  }

  private executeList(giver: Stuff, context: CommandContext): void {
    const parties = PartyApi.partiesOf(refOf(giver)).filter((p) =>
      p.isDurable(),
    );
    if (parties.length === 0) {
      return this.send(context, Mml.fromMarkup("You belong to no durable crews."));
    }
    const lines = parties
      .map((p) => `  ${p.getName()} (${p.size()})`)
      .join("\n");
    this.send(context, Mml.fromMarkup(`Your crews:\n${Mml.escape(lines)}`));
  }

  private executeShow(giver: Stuff, context: CommandContext): void {
    const party = PartyApi.activePartyOf(giver);
    if (!party) {
      return this.send(context, Mml.fromMarkup("You are not in a party."));
    }
    const captain = party.isCaptain(refOf(giver)) ? " (you lead)" : "";
    this.send(
      context,
      Mml.fromMarkup(
        Mml.escape(
          `${party.getName()} — ${party.size()} member(s)${captain}.`,
        ),
      ),
    );
  }

  private reasonText(reason: string): string {
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
      default:
        return "That party command can't be completed.";
    }
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    this.send(context, Mml.fromMarkup(Mml.escape(detail)));
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }
}
