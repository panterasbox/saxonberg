/**
 * LotGateExit — **the gate off the street into one lot**: a
 * `DeferredDestinationExit` whose destination is faulted in on
 * traversal via {@link PlatWarren.provision}, so a road can carry a
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
import type PlatWarren from "./PlatWarren";

export default class LotGateExit extends DeferredDestinationExit {
  /** The provisioner — held as a PATH (an identity ref), resolved on read. */
  private holderPath = "";

  /** The lot's parcel extent — the provisioning key and the title key. */
  private lotExtent = "";

  /**
   * ⭐ What the constructor used to take. The arrival line moved to the
   * ROW; the departure line still names the DIRECTION, which is a fact
   * about this edge rather than about gates, so it stays here.
   */
  public configureGate(
    holder: PlatWarren,
    lotExtent: string,
    direction: string,
  ): void {
    this.holderPath = holder.getTemplatePath() ?? "";
    this.lotExtent = lotExtent;
    this.setMessageOut(`{{ mover }} goes through the ${direction} gate.`);
  }

  /** The lot this gate fronts. */
  public getLotExtent(): string {
    return this.lotExtent;
  }

  /** Materialize (or re-materialize) the lot's house; land in its entry. */
  protected override async computeDestination(): Promise<Stuff & Container> {
    const { StuffApi } = await import("@saxonberg/server/mud/api/stuff");
    const holder = StuffApi.findByTemplatePath<PlatWarren>(this.holderPath);
    if (!holder) {
      throw new Error(
        `LotGateExit: PlatWarren '${this.holderPath}' is not registered.`,
      );
    }
    const { room } = await holder.provision(this.lotExtent);
    return room as Stuff & Container;
  }
}
