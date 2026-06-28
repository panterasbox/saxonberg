/**
 * `tree-dialogue` brain — the **branching-tree responder** (npc-dialogue
 * Wave 1). The first brain reached through the `open` responder seam
 * rather than a wired trigger: its spec carries `trigger: engage`, which
 * wires nothing (no timer, no witness) — the brain exists only to be
 * invoked by the `talk` controller, which resolves this module by path
 * and calls `open`.
 *
 * config: a {@link DialogueTree} — the authored tree (nodes, choices,
 * guards, effects). The brain validates it, selects the guard-chosen
 * entry, and hands a live {@link DialogueConversation} the rest (the
 * NPC speaks first, the driver gets a private choice wheel, the tree
 * advances). All conversation state lives on that engagement, not here —
 * the brain stays stateless per the category contract.
 *
 * See docs/subsystems/npc-dialogue.md.
 */

import type { EngagementSlot } from "../activity/Engaged";
import type {
  BrainStatics,
  DialogueOpenArgs,
  DialogueOpenResult,
} from "./brain";
import { MixinApi } from "../../api/mixin";
import { SchedulerApi } from "../../api/scheduler";
import { DialogueTreeSchema, type DialogueTree } from "../npc/tree";
import {
  DialogueConversation,
  DialoguePartnerHold,
  DIALOGUE_CONVERSATION_TYPE,
} from "../npc/DialogueConversation";

export const brain = class {
  static label = "tree-dialogue";
  static claims: readonly EngagementSlot[] = ["voice", "attention"];

  /**
   * Never fires: the `engage` trigger wires no timer or witness, so this
   * brain is reached only via {@link open}. Present to satisfy the brain
   * contract — `act` stays required for every other brain.
   */
  static act(): void {
    // intentional no-op
  }

  static async open(args: DialogueOpenArgs): Promise<DialogueOpenResult> {
    const { player, npc, config, interactive } = args;
    if (!interactive) return { ok: false, reason: "no-viewer" };

    // Defense-in-depth over the save-gate: a malformed tree is no tree.
    if (DialogueTreeSchema.validate(config).length > 0) {
      return { ok: false, reason: "no-tree" };
    }
    if (!MixinApi.isEngaged(npc) || !MixinApi.isEngaged(player)) {
      return { ok: false, reason: "no-tree" };
    }

    // 1:1 — a second driver on a busy NPC is declined.
    if (npc.getEngagementByType(DIALOGUE_CONVERSATION_TYPE)) {
      return { ok: false, reason: "busy" };
    }

    const tree = config as unknown as DialogueTree;
    const conversation = new DialogueConversation(
      npc,
      player,
      interactive,
      tree,
    );
    if (!(await conversation.resolveEntry())) {
      return { ok: false, reason: "no-tree" };
    }

    const started = SchedulerApi.start(conversation);
    if (!started.ok) return { ok: false, reason: "busy" };

    // Companion hold on the player (both sides occupied). If the player
    // is already engaged, decline gracefully and release the NPC side.
    const partner = new DialoguePartnerHold(player, conversation);
    conversation.setPartner(partner);
    const partnerStarted = SchedulerApi.start(partner);
    if (!partnerStarted.ok) {
      SchedulerApi.cancel(conversation, "cancelled");
      return { ok: false, reason: "busy" };
    }

    conversation.launch();
    return { ok: true };
  }
} satisfies BrainStatics;
