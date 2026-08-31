/**
 * LotGateExit — **the gate off the street into one lot**: a
 * `DeferredDestinationExit` whose destination is faulted in on
 * traversal via {@link LotHolder.provision}, so a road can carry a
 * gate for every sold lot without a single yard materialized at boot.
 *
 * Eager on its face with the programme's ENTRY ROW (residences D17 —
 * the yard's real row, accurate class template, resolvable zone
 * ancestry), never a minted path. Direction is the lot's leaf
 * (`lot-7` — what is stencilled on the stake). UNGATED, deliberately:
 * the fence is fiction; the HOUSE door is the lock (the programme's
 * locked edge).
 */

import DeferredDestinationExit from "@saxonberg/server/mud/lib/boundary/DeferredDestinationExit";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type LotHolder from "./LotHolder";

export default class LotGateExit extends DeferredDestinationExit {
  /** The provisioner — held as a PATH (an identity ref), resolved on read. */
  private holderPath: string;

  /** The lot's parcel extent — the provisioning key and the title key. */
  private lotExtent: string;

  constructor(
    source: Stuff & Container,
    holder: LotHolder,
    lotExtent: string,
    direction: string,
    entryRowPath: string,
  ) {
    super({
      direction,
      source,
      // The ENTRY ROOM'S ROW — a real row (D17), so the edge reads
      // honestly (and the cartesian boundary rule reads a real zone
      // ancestry) before it's ever been walked.
      destinationTemplatePath: entryRowPath,
    });
    this.holderPath = holder.getTemplatePath() ?? "";
    this.lotExtent = lotExtent;
    this.setMessageOut(`{{ mover }} goes through the ${direction} gate.`);
    this.setMessageIn("{{ mover }} comes in from the lane.");
  }

  /** The lot this gate fronts. */
  public getLotExtent(): string {
    return this.lotExtent;
  }

  /** Materialize (or re-materialize) the lot's house; land in its entry. */
  protected override async computeDestination(): Promise<Stuff & Container> {
    const { StuffApi } = await import("@saxonberg/server/mud/api/stuff");
    const holder = StuffApi.findByTemplatePath<LotHolder>(this.holderPath);
    if (!holder) {
      throw new Error(
        `LotGateExit: LotHolder '${this.holderPath}' is not registered.`,
      );
    }
    const { room } = await holder.provision(this.lotExtent);
    return room as Stuff & Container;
  }
}
