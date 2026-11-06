/**
 * JobFulfillController — `job fulfill [id]`: the capture
 * beat of the two-beat turn-in, performed **at the destination**. The
 * engine verifies the delivery right now (strict possession included) and
 * seals a `fulfilled` record into the gig's event chain — proof-of-
 * delivery that survives later state drift; the payout still happens at
 * the board (`job complete`).
 *
 * ⭐ A `job` subcommand since controllers-are-io W7 (it was a standalone
 * verb afforded by the wallet so it could travel with the courier):
 * `job` itself is now afforded to every character (`Persona`), so the
 * subcommand travels too, and it binds no board — the drop is wherever
 * you are standing. Diegetically the implant still logs the delivery.
 */

import type { CommandContext, CommandModel } from "../../../../api/command";
import { JobControllerBase, TOPIC } from './JobControllerBase';
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { ContractApi } from "../../../../api/contract";


interface FulfillModel extends CommandModel {
  /** A gig id (or unique prefix); bare = the single active claim. */
  id?: string;
}

export default class JobFulfillController extends JobControllerBase<FulfillModel> {
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

}
