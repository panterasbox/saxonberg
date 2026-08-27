/**
 * LotGateExit — **the gate off the street into one lot**, and the only way
 * a player reaches ground they bought.
 *
 * The generic sibling of `DormDoor`: a `DeferredDestinationExit` whose
 * destination is faulted in on traversal via
 * {@link LotHolder.provision}, so the street can carry a gate for every
 * sold lot in the subdivision without a single yard being materialized at
 * boot.
 *
 * ## Why the street cannot just author the exit
 *
 * It was authoring one, and that was a defect the unit suite could not
 * see. A lane with `north → /world/…/hinkley-hills/yard` names the
 * **shared source template** — so walking north instantiated the template
 * itself as a place: an unowned yard, on nobody's lot, that every player
 * arrived in and could dig. Worse, it collided with the minted identities
 * (`…/lot-1/yard`) at the singleton guard, because the source path now had
 * a live instance too.
 *
 * The static exit was never expressible: there is no one room behind the
 * gate. A subdivision has N lots, each with its own room at its own
 * identity path, and which one you mean is a function of *which lot*, not
 * of a compass direction. So the street's exits are **installed by the
 * provisioner** as lots sell, one per lot, and re-installed at boot from
 * the title registry — the same shape the dorm corridor uses for units.
 *
 * ## Direction is the lot's leaf
 *
 * `lot-1`, `lot-2` — the lot number, which is what is stencilled on the
 * stake. `north` would collide the moment a second lot sold, and no
 * compass scheme survives an arbitrary plat. It reads as a street address
 * because that is what it is.
 *
 * ## Ungated, deliberately
 *
 * A yard behind a house is not locked from the lane; the house is. Making
 * the gate refuse non-owners would put a property boundary where the
 * fiction has a fence, and trespass is the policing layer's question, not
 * the boundary layer's. The dorm's key gate exists because a bedsit door
 * genuinely is locked. When this subdivision grows houses with interiors,
 * *those* get the lock.
 */

import DeferredDestinationExit from "../lib/boundary/DeferredDestinationExit";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";
import type LotHolder from "./LotHolder";
import { StuffApi } from "../api/stuff";

export default class LotGateExit extends DeferredDestinationExit {
  /**
   * The provisioner that stands this lot's room up — held as a PATH,
   * resolved on read.
   *
   * `LotHolder` composes `SingletonMixin` and is path-addressable, so
   * "which provisioner" is an identity question. Holding the live
   * instance was the A.4 shape: an identity question in an instance
   * representation. The same build answers it correctly twice elsewhere
   * (`PlatBook.holderPath`, `TitleController.holderFor`), so this was
   * the outlier rather than the convention.
   *
   * Low severity in practice — `LotHolder.canEvict` refuses eviction,
   * so only a hot reload or a torn-down test world could strand it —
   * but the point of declaring reference shapes is not having to make
   * that argument per field.
   */
  private holderPath: string;

  /** The lot's parcel extent — the provisioning key and the title key. */
  private lotExtent: string;

  constructor(
    source: Stuff & Container,
    holder: LotHolder,
    lotExtent: string,
    direction: string,
  ) {
    super({
      direction,
      source,
      // The lot's OWN minted identity path, not the shared source
      // template. Unlike the dorm — where many rooms share one template
      // and the eager path can only name the class — a lot's room has a
      // unique path, so the eager answer is exact. It is also what the
      // cartesian grid resolves the destination ZONE from when it decides
      // whether a non-cardinal exit is admissible, and only the minted
      // path lands in the lot's own zone.
      destinationTemplatePath: holder.identityFor(lotExtent),
    });
    this.holderPath = holder.getTemplatePath() ?? '';
    this.lotExtent = lotExtent;
    // The default movement prose is compass-shaped — "You leave to the
    // north" — and a lot leaf makes nonsense of it ("You leave to the
    // lot-1"). A gate is a thing you go THROUGH, so say that. Set after
    // `super` because `DeferredDestinationExit` forwards only identity
    // to the base.
    this.setMessageOut(`{{ mover }} goes through the ${direction} gate.`);
    this.setMessageIn("{{ mover }} comes in from the lane.");
  }

  /** The lot this gate fronts. */
  public getLotExtent(): string {
    return this.lotExtent;
  }

  /** Materialize (or re-materialize) the lot's room. */
  protected override async computeDestination(): Promise<Stuff & Container> {
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
