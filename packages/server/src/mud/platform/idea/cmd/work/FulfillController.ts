/**
 * FulfillController — the standalone `fulfill`/`handoff` verb: the capture
 * beat of the two-beat turn-in, performed **at the destination**. The
 * engine verifies the delivery right now (strict possession included) and
 * seals a `fulfilled` record into the gig's event chain — proof-of-
 * delivery that survives later state drift; the payout still happens at
 * the board (`job complete`).
 *
 * Deliberately a standalone verb, not a `job` subcommand: affordance is
 * per-verb, and this one must travel with the courier — afforded from
 * `self` by the born-with `CredentialWalletUpdate` (diegetically, the
 * implant logs the delivery — the narrowest seed of the future
 * trusted-recording instrument). Resolves no board.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { ContractApi } from "../../../../api/contract";

const TOPIC = "act.deed";

interface FulfillModel extends CommandModel {
  /** A gig id (or unique prefix); bare = the single active claim. */
  id?: string;
}

export default class FulfillController extends CommandController<FulfillModel> {
  async execute(model: FulfillModel, context: CommandContext): Promise<void> {
    const raw = (model.id ?? "").trim();
    let id = raw;
    const mine = await ContractApi.activeClaims();
    if (raw) {
      const matches = mine.filter((g) => g.contractId.startsWith(raw));
      if (matches.length === 1) id = matches[0]?.contractId ?? raw;
      // No match among held claims: pass the raw id through (an open
      // bounty is fulfillable without a claim) — the Api speaks to it.
    } else {
      if (mine.length === 0) {
        return this.fail(
          context,
          "You hold no claim — name the gig to fulfill.",
          "no-claim",
        );
      }
      if (mine.length > 1) {
        return this.fail(
          context,
          "You hold several claims — name the gig to fulfill.",
          "ambiguous-claim",
        );
      }
      id = mine[0]?.contractId ?? "";
    }

    const result = await ContractApi.fulfill(id);
    if (!result.ok) {
      return this.fail(
        context,
        `Nothing to log: ${result.reason}.`,
        "contract-refused",
      );
    }
    // The handoff Scene — the signature at the door.
    const giver = context.commandGiver;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`Your implant sweeps the drop, verifies the delivery, and seals the record. Redeem it at the board with \`job complete\`.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} checks a delivery off against an implant record.`,
      )
      .send();
  }

  private fail(context: CommandContext, message: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${message}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: message });
  }
}
