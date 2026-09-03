/**
 * TravelNode — **the shape a travel network answers**, declared in the
 * kernel so the kernel's `teleport` verb never imports a pack.
 *
 * ## Why this exists at all
 *
 * ⭐⭐ **You must not need the Teleport Authority to teleport.** Moving
 * yourself around inside an extent you hold is *authorial authority* —
 * the same authority that lets you edit the place — and casting a
 * working that relocates you is *magic*. Neither is a transit network's
 * business, and neither may stop working because a content pack is
 * absent. The TPA reform got this wrong first time round: the whole
 * `teleport` verb moved into the `tpa` pack, taking both with it, so on
 * a platform-only boot a privileged person had no way to move at all.
 *
 * So the verb is the kernel's and the NETWORK is a pack's. The kernel
 * owns what is true without any network — free movement inside your own
 * extent, and the anchored spell — and hands the ride and the board to
 * whatever is standing here, **over this shape**.
 *
 * ## The pattern
 *
 * Exactly `SupplyReporting`'s (see
 * [watershed.md](../../../../../docs/subsystems/watershed.md)): plain
 * data in, plain data out, so the kernel never has to name a pack's
 * class. `AnalyzeWaterController` is a kernel verb reading the water
 * pack's works this way; this is the same seam for travel.
 *
 * Optional by construction — a thing either answers the question or it
 * is not a travel node, and {@link asTravelNode} checks rather than the
 * type system.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Sensor } from '../message/Sensor';

/** What the traveller asked for. */
export interface TravelRideSpec {
  /** The stop they named — matched node-locally, never through MQL. */
  readonly keyword: string;
  /**
   * The traveller supplies the energy for this ride (`--channel`).
   * Meaningless to a network that does not run on anything; a node that
   * ignores it is answering honestly.
   */
  readonly channel?: boolean;
  /** Explicitly put the energy on the node's own meter (`--meter`). */
  readonly meter?: boolean;
}

/**
 * What happened. `ok: false` with no `refusal` means the node declined
 * silently, which no shipped node does — a refusal is always worth
 * words.
 */
export interface TravelRideOutcome {
  readonly ok: boolean;
  /** Player-facing prose. The verb renders it; the node writes it. */
  readonly refusal?: string;
  /** Envelope note reason, for the dispatch response. */
  readonly reason?: string;
}

/**
 * A stop on some travel network. The two things a front door needs: the
 * timetable, and the ride.
 */
export interface TravelNode {
  /**
   * The departures board as this VIEWER sees it — a timetable is
   * public, so a front door may render it before any clearance read.
   */
  renderDepartures(viewer: Stuff & Sensor): Promise<string>;
  /** Take `traveller` to the stop they named. */
  ride(traveller: Stuff, spec: TravelRideSpec): Promise<TravelRideOutcome>;
}

/** Thin static holder — the shape's one operation. */
export class TravelNodes {
  private constructor() {}

  /**
   * Narrow a candidate to a travel node **by shape**, or `null`.
   *
   * Structural on purpose, twice over: a pack cannot add to the
   * kernel's `Mixins` registry, and the kernel must not name a pack's
   * mixin. Both methods are checked, so a thing that merely happens to
   * have a `ride` is not mistaken for a stop.
   */
  public static of(o: Stuff | null | undefined): (Stuff & TravelNode) | null {
    if (!o) return null;
    const c = o as unknown as Partial<TravelNode>;
    return typeof c.ride === 'function' &&
      typeof c.renderDepartures === 'function'
      ? (o as Stuff & TravelNode)
      : null;
  }
}
