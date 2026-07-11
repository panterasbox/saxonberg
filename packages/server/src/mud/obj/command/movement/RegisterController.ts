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
import { ContainmentApi } from "../../../api/containment";
import type { CredentialWallet } from "../../../lib/credential/CredentialWallet";
import type { Stuff } from "../../../lib/stuff/Stuff";

export default class RegisterController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // `register` is contributed by the terminal in your environment
    // (FastTravelMixin.commandContributions), so the afforded node is the
    // command source — no need to scan room contents by hand.
    const node = MixinApi.isFastTravel(context.commandSource)
      ? context.commandSource
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
    // Clearance is bound to the traveller's IDENTITY (the born-with,
    // aether-hosted wallet), never to a carried, transferable card — so the
    // write targets the actor's own hosted wallet directly (leg-2 isolation),
    // not the general reachable-instrument scan.
    const holder = ContainmentApi.findHostedUpdate(
      giver,
      (s: Stuff): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
    );
    if (!holder) {
      return this.fail(
        context,
        "you have no identity-bound Teleport Authority credential to record onto",
        "no-credential",
      );
    }
    const cred = holder.ensureCredential("travel");
    const ref = node.getTemplatePath();
    if (!ref) {
      return this.fail(
        context,
        "this terminal has no network identity",
        "no-identity",
      );
    }
    const name = node.getPresentation();
    if (cred.isRegistered(ref)) {
      this.tell(context, `\nYou've already registered the ${name}.\n`);
      return;
    }
    cred.register(ref);
    this.tell(context, `\nYour credential records the ${name}.\n`);
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      // A diegetic player action (operating a Teleport Authority terminal),
      // not author tooling — same in-world narration channel as the other
      // movement commands (mount/dismount, sit/stand).
      .topic("world.narration.action")
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
