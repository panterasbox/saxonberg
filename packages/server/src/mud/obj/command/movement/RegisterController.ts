/**
 * RegisterController — the `register` verb. Records the fast-travel node you
 * are standing at onto your active travel credential, so you can later
 * `teleport` to it. Arrival-capable nodes only: a departure-only node is
 * one-way out — you can never arrive there, so there is nothing to register.
 *
 * A node's network identity is its own singleton template path; that is what
 * `register` writes and what the `teleport` TPA fork checks.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { MixinApi } from "../../../api/mixin";
import { DescribeApi } from "../../../api/describe";
import { findActiveCredential } from "../../../lib/fasttravel/TravelCredential";
import type { FastTravel } from "../../../lib/fasttravel/FastTravel";
import type { Stuff } from "../../../lib/stuff/Stuff";

export default class RegisterController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const room = context.location;
    const node =
      room && MixinApi.isContainer(room)
        ? (room.getContents().find((s) => MixinApi.isFastTravel(s)) as
            | (Stuff & FastTravel)
            | undefined)
        : undefined;
    if (!node) {
      return this.fail(context, "there is no terminal here", "no-terminal");
    }
    if (!node.isArrival()) {
      return this.fail(
        context,
        "this terminal is departures-only — there's nothing to register here",
        "not-arrival",
      );
    }
    const cred = findActiveCredential(giver);
    if (!cred) {
      return this.fail(
        context,
        "you have no Teleport Authority credential",
        "no-credential",
      );
    }
    const ref = (node as unknown as Stuff).getTemplatePath();
    if (!ref) {
      return this.fail(
        context,
        "this terminal has no network identity",
        "no-identity",
      );
    }
    const name = DescribeApi.getDisplayName(node as unknown as Stuff);
    if (cred.isRegistered(ref)) {
      this.tell(context, `\nYou've already registered the ${name}.\n`);
      return;
    }
    cred.register(ref);
    this.tell(context, `\nYour credential records the ${name}.\n`);
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic("system.shell.author")
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = "unspecified",
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: "controller-rejected", reason, detail });
  }
}
