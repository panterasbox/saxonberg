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
 * class. `SupplyReporting` is the same seam for water: anything that
 * carries water anywhere answers `analyze water <target>` without the
 * asker importing it — and that controller now lives in the water pack
 * for the same reason `analyze soil`'s lives in `trade-farming`, which
 * makes the shape the ONLY thing crossing between packs.
 *
 * ⭐ A **protocol mixin** since controllers-are-io D8a
 * ({@link TravelNodeMixin}, `_mixinKind = 'protocol'`): a node COMPOSES it
 * and the verb asks `MixinApi.isTravelNode` — it used to probe `ride` and
 * `renderDepartures` by `typeof`. The kernel still names no pack's class.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Sensor } from '../message/Sensor';
import type { MixinConstructor } from '../mixin';

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
 * ⭐ A stop this network ADVERTISES — the machine-readable half of a
 * departures board.
 *
 * `renderDepartures` is prose for a player; this is the same facts for
 * anything that needs to reason about them. The first consumer is a
 * player's map: reading a public timetable is knowledge of places you
 * have not been, and it lands on the map marked `publication` and
 * distinguishable from somewhere you walked.
 */
export interface PublishedStop {
  /** The stop's own node — the thing that would take you there. */
  readonly nodePath: string;
  /** The room you would arrive in. The place a map records. */
  readonly arrivalRoomPath: string;
  /** What the board calls it. */
  readonly label: string;
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
  /**
   * ⭐ What this network advertises, as data. **Optional**, and a node
   * without it advertises nothing — which is an honest answer rather
   * than a gap: a network that publishes no timetable has not told
   * anybody anything, and a map should not claim it did.
   */
  publishedStops?(): Promise<PublishedStop[]>;
}

/**
 * ⭐ **`TravelNodeMixin` — the travel-network protocol, as a mixin.**
 *
 * IS: a stop on some travel network — it shows its board to whoever stands
 * at it and takes them where they named. IS NOT: the kernel's own ways to
 * move (free movement in an extent you hold, the anchored spell), which
 * need no network at all and are not nodes.
 *
 * ⚠ The defaults REFUSE: a node that composes this and answers nothing has
 * no board and goes nowhere, in words.
 */
export function TravelNodeMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TravelNodeMixin extends Base implements TravelNode {
    static _mixinName: string = 'TravelNodeMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The departures board; the default: no board. */
    public async renderDepartures(_viewer: Stuff & Sensor): Promise<string> {
      return 'There is no departures board here.';
    }

    /** @hook Take a traveller to a stop; the default goes nowhere. */
    public async ride(_traveller: Stuff, _spec: TravelRideSpec): Promise<TravelRideOutcome> {
      return { ok: false, refusal: 'This goes nowhere.', reason: 'not-a-travel-node' };
    }
  };
}
