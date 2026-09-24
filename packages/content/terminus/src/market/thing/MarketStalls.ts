/**
 * MarketStalls — the produce stalls of the market square, and the thing
 * that lets a player RENT ONE (economic bootstrap D15).
 *
 * The fixture is a `Stock` like the cash-and-carry's counter (a
 * brokerage: nothing cloned to par, everything on it consigned) with one
 * fact of its own — `rentMinor`, what a stall on the square costs — and
 * one affordance: **`stall`** goes to whoever stands in the square. A
 * verb affordance is a static on a class, never a field on a row, which
 * is why this is a class in the pack and not a `commandContributions:`
 * key on `stalls.yaml` (Walter's precedent).
 *
 * A rented stall is NOT this class: it is a plain `Stock` minted from
 * `/world/terminus/market/thing/stall` with the renter's identity, so the
 * verb reaches a player through the square's fixture and a player's own
 * counter affords only what any counter does (`buy`, `consign`, `reclaim`).
 */

import Stock from '@saxonberg/content-trade-shopkeeping/src/thing/Stock';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class MarketStalls extends Stock {
  static fieldMeta: FieldMeta = {
    rentMinor: { persistent: true, authorable: true },
  };

  /** What a stall on this square costs to rent, in minor units (0 = free). */
  public rentMinor = 0;

  public getRentMinor(): number {
    return this.rentMinor;
  }

  public setRentMinor(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`MarketStalls.rentMinor: ${String(value)} is not a rent`);
    }
    this.rentMinor = Math.floor(value);
  }

  // The square's own verb, plus everything a counter affords. `peers`:
  // the fixture stands in the square with you, so the verb goes SIDEWAYS
  // to whoever shares the room (Walter's bucket; `environment` grants
  // OUTWARD to the container chain, which is the room, not the people).
  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      ...(Stock.commandContributions.peers ?? []),
      'world/terminus/market/cmd/stall.yaml',
    ],
    environment: [...(Stock.commandContributions.environment ?? [])],
  };
}
