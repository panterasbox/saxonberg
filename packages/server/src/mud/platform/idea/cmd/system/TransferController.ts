/**
 * TransferController — the `transfer <parcel> to <player>` verb (the
 * `system` category). Moves a parcel title to another player under
 * **bilateral consent** (the receiver must accept, because a title carries
 * liability).
 *
 * Flow: resolve the parcel by path (longest-prefix covering) → gate to the
 * current owner via `AccessApi.canMutateZone` (refuse a non-owner giver) →
 * resolve the receiver (an online Avatar) → ask the receiver to accept via
 * `PromptApi.confirm` on their Interactive (decline/timeout → abort) → on
 * accept, `ParcelApi.transfer(extent, {kind:'player', …})`, which appends a
 * `transfer` chain-of-title event (from = current owner, actor from
 * context) before updating the current-state row — never a destructive
 * overwrite. Title-only; `sell` (payment-coupled) is deferred.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { AccessApi } from "../../../../api/access";
import { ParcelApi } from "../../../../api/parcel";
import { PlayerApi } from "../../../../api/player";
import { PromptApi } from "../../../../api/prompt";
import { MixinApi } from "../../../../api/mixin";
import { StuffApi } from "../../../../api/stuff";
import { Zone } from "../../../../lib/zone/Zone";
import type { Stuff } from "../../../../lib/stuff/Stuff";

const TOPIC = "shell.result";

interface TransferModel extends CommandModel {
  parcel?: string;
  recipient?: MqlOneResult | string;
  /** Group-recipient widening (sandbox build): a managed-group NAME. */
  group?: string;
}

export default class TransferController extends CommandController<TransferModel> {
  async execute(model: TransferModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;

    const parcelPath = (model.parcel ?? "").trim();
    if (!parcelPath) {
      return this.fail(
        context,
        "Name the parcel to transfer (by its path).",
        "no-parcel",
      );
    }
    const parcel = await ParcelApi.coveringParcelOf(parcelPath);
    if (!parcel) {
      return this.fail(
        context,
        `No parcel covers ${parcelPath}.`,
        "no-parcel",
      );
    }

    const parcelZone = await this.resolveZone(parcel.getZonePath());
    if (!parcelZone || !(await AccessApi.canMutateZone(giver, parcelZone))) {
      return this.fail(
        context,
        `You don't own ${parcel.getExtent()}.`,
        "not-owner",
      );
    }

    // GROUP recipient (sandbox build, the ONE widening): a group has no
    // avatar to say yes — the governor's act IS the acceptance, and the
    // chain-of-title entry records it. The membership-vs-consent
    // asymmetry is deliberate: pushing a title onto a PERSON needs
    // their yes; granting one to a GROUP is a governance act the giver
    // already holds the authority for (the canMutateZone gate above).
    if (model.group) {
      const groupName = model.group.trim();
      if (!groupName) {
        return this.fail(context, "Transfer to which group?", "no-receiver");
      }
      const owner = { kind: "group" as const, name: groupName };
      const ref = await ParcelApi.resolveOwnerRef(owner);
      if (!ref) {
        return this.fail(
          context,
          `No managed group named '${groupName}'.`,
          "no-receiver",
        );
      }
      await ParcelApi.transfer(parcel.getExtent(), { ...owner, ref });
      this.send(
        context,
        Mml.compose`\nTransferred the title to ${parcel.getExtent()} to the ${groupName} group.\n`,
      );
      return;
    }

    const resolved =
      model.recipient && typeof model.recipient === "object"
        ? (model.recipient as MqlOneResult)
        : null;
    const receiver = resolved?.stuff ?? null;
    if (!receiver || !PlayerApi.isAvatarStuff(receiver)) {
      return this.fail(context, "Transfer a title to whom?", "no-receiver");
    }
    if (receiver === giver) {
      return this.fail(
        context,
        "You already hold that title.",
        "self-transfer",
      );
    }
    const receiverPath = receiver.getTemplatePath();
    if (!receiverPath) {
      return this.fail(
        context,
        "That player has no durable identity to hold a title.",
        "no-identity",
      );
    }

    // Bilateral consent — the receiver must accept on their own Interactive.
    const interactive = MixinApi.isHasInteractive(receiver)
      ? [...receiver.getInteractives()][0]
      : undefined;
    if (!interactive) {
      return this.fail(
        context,
        `${receiver.getPresentation()} must be online to accept a title.`,
        "receiver-offline",
      );
    }

    const accepted = await interactive.promptConfirm(
      `Accept title to ${parcel.getExtent()}? It carries liability.`,
      "no",
    );
    if (!accepted) {
      return this.fail(
        context,
        `${receiver.getPresentation()} declined the title to ${parcel.getExtent()}.`,
        "declined",
      );
    }

    await ParcelApi.transfer(parcel.getExtent(), {
      kind: "player",
      templatePath: receiverPath,
    });
    this.send(
      context,
      Mml.compose`\nTransferred the title to ${parcel.getExtent()} to ${receiver.getPresentation()}.\n`,
    );
  }

  /** Resolve a zone Stuff from its templatePath, or null. */
  private async resolveZone(path: string): Promise<Zone | null> {
    if (!path) return null;
    try {
      const z = await StuffApi.singleton<Stuff>(path);
      return z instanceof Zone ? z : null;
    } catch {
      return null;
    }
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: "controller-rejected", reason, detail });
  }
}
