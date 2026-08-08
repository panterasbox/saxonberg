/**
 * TalkController — the deliberate opener for tree-bearing NPCs.
 *
 * `talk to <npc>` (alias `converse`) engages a conversational character:
 * the controller narrows the target to a `Behaved` host, finds its
 * dialogue (`engage`-triggered) spec, resolves the brain by path (the
 * same `resolveExportSync` seam `BehavedMixin` uses), and calls the
 * brain's `open` responder seam. It does **not** walk the tree itself —
 * it hands off and returns. The NPC leads (its root beat is spoken by
 * the conversation), so the opener emits **no player line**; a silent or
 * busy target is declined gracefully.
 *
 * See docs/subsystems/npc-dialogue.md.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { StuffApi } from "../../../api/stuff";
import { Mml } from "../../../api/mml";
import type { MqlOneResult } from "../../../api/mql";
import type { BrainStatics } from "../../../lib/behavior/brain";
import { BRAIN_EXPORT } from "../../../lib/behavior/brain";

/** Diegetic world-action topic for the private decline lines. */
const TOPIC = "act.deed";

interface TalkModel extends CommandModel {
  /** Positional: who to talk to. */
  target?: MqlOneResult;
}

export default class TalkController extends CommandController<TalkModel> {
  async execute(model: TalkModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;

    if (!target) {
      return this.decline(context, "Talk to whom?", "no-target");
    }

    // Only a Behaved host can carry a dialogue tree. Players / scenery
    // decline gracefully ("nothing to say").
    if (!MixinApi.isBehaved(target)) {
      return this.decline(
        context,
        Mml.compose`${Mml.name(target)} has nothing to say.`,
        "not-conversational",
        target.stuffId,
      );
    }

    // Find a dialogue spec whose brain exposes the `open` responder seam.
    let descriptor: BrainStatics | null = null;
    let config: Record<string, unknown> = {};
    for (const spec of target.getBehaviors()) {
      if (spec.trigger !== "engage") continue;
      const resolved = StuffApi.resolveExportSync(
        spec.brain,
        BRAIN_EXPORT,
      ) as BrainStatics | null;
      if (resolved?.open) {
        descriptor = resolved;
        config = spec.config ?? {};
        break;
      }
    }
    if (!descriptor?.open) {
      return this.decline(
        context,
        Mml.compose`${Mml.name(target)} has nothing to say.`,
        "not-conversational",
        target.stuffId,
      );
    }

    const result = await descriptor.open({
      player: giver,
      npc: target,
      config,
      interactive: context.interactive,
    });

    if (result.ok) return; // The NPC leads — no player line on open.

    switch (result.reason) {
      case "busy":
        return this.decline(
          context,
          Mml.compose`${Mml.name(target)} is busy with someone else.`,
          "busy",
          target.stuffId,
        );
      case "no-viewer":
        return this.decline(
          context,
          "You can't hold a conversation right now.",
          "no-viewer",
        );
      case "no-tree":
      default:
        return this.decline(
          context,
          Mml.compose`${Mml.name(target)} has nothing to say.`,
          "not-conversational",
          target.stuffId,
        );
    }
  }

  private decline(
    context: CommandContext,
    body: string | Mml,
    reason: string,
    detail?: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(body)
      .send();
    context.note({ kind: "controller-rejected", reason, detail });
  }
}
