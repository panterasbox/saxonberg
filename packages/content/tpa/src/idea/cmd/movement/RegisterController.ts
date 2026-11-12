/**
 * RegisterController — the `register` verb. Records the fast-travel node you
 * are standing at onto your active travel credential, so you can later
 * `teleport` to it. Arrival-capable nodes only: a departure-only node is
 * one-way out — you can never arrive there, so there is nothing to register.
 *
 * A node's network identity is its own singleton template path; that is what
 * `register` writes and what the `teleport` TPA fork checks.
 */

import { CommandController } from "@saxonberg/server/mud/lib/command/CommandController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { FAST_TRAVEL_MIXIN, type FastTravel, type RegisterRefusal } from "../../../lib/FastTravel";

export default class RegisterController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // `register` is contributed by the terminal in your environment
    // (FastTravelMixin.commandContributions), so the afforded node is the
    // command source — no need to scan room contents by hand.
    const source = context.commandSource;
    const node =
      source && MixinApi.isActive(source, FAST_TRAVEL_MIXIN)
        ? (source as Stuff & FastTravel)
        : undefined;
    if (!node) {
      return this.fail(context, "there is no terminal here", "no-terminal");
    }
    const out = node.registerFor(giver);
    if (!out.ok) return this.fail(context, RegisterController.refusalText(out), out.reason);
    const name = node.getPresentation();
    this.tell(
      context,
      out.facts.already ? `\nYou've already registered the ${name}.\n` : `\nYour credential records the ${name}.\n`,
    );
  }

  /** ⭐ Every refusal a node's registration can give. */
  protected static refusalText(r: RegisterRefusal): string {
    switch (r.reason) {
      case "not-arrival":
        return "this terminal is departures-only — there's nothing to register here";
      case "no-credential":
        return "you have no identity-bound Teleport Authority credential to record onto";
      case "no-identity":
        return "this terminal has no network identity";
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      // A diegetic player action (operating a Teleport Authority terminal),
      // not author tooling — same in-world narration channel as the other
      // movement commands (mount/dismount, sit/stand).
      .topic("act.deed")
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
