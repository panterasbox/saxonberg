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
 * `/world/terminus/market/thing/stall`, keyed to the PITCH it stands on,
 * so the verb reaches a player through the square's fixture and a
 * player's own counter affords only what any counter does (`buy`,
 * `consign`, `reclaim`).
 *
 * ⭐⭐ **The fixture is the stall's MANAGER, and it keeps the book of
 * lets.** A key is relative to the thing that manages it — a holding
 * warren keys its rooms `<extent>/<leaf>` off its own durable address —
 * and the square is what manages pitches. So a counter is keyed
 * `<this fixture's row>/<pitch>`, and **who rents it** lives where it
 * belongs: on the house's `appointingAuthority`, not in the counter's
 * name.
 *
 * ⚠ It was keyed on the RENTER before (`…/stall/<their key>`), which
 * read as *the stall of whoever that is* and made the renter's identity
 * the counter's substance. Two consequences, both bad: a square could
 * let out unbounded stalls because nothing counted pitches, and the
 * uniqueness invariant that should have caught a double-let could not
 * fire on it at all (the scan's needle was the host's own identity —
 * see persistence.md).
 *
 * ⚠⚠ **The fixture establishes its OWN record, and has to.** It is
 * cloned fresh from the square's `props:` on every boot, and a
 * `props:` fixture on a non-`Persistable` `Street` is established by
 * nobody: `Stock.onCreate` never restores, and `capturesAtShutdown()`
 * answers false while the persistence key is null, so such a fixture
 * neither captures nor restores. Left that way the book would come up
 * EMPTY after a restart, the next renter would be allocated pitch 1,
 * and `hasRecord` would hand them the first keeper's counter — the
 * exact clobber the invariant exists to stop, arriving through a
 * different door.
 *
 * ⭐ So the fixture declares a **hydration source**, not an `onCreate`.
 * The clone pipeline runs every source between the content step and the
 * hook precisely so that *"nothing has to read a collection from inside
 * a lifecycle hook"* — which is what a restore-my-own-record in
 * `onCreate` would be. `lint:on-create`'s refusal said the same thing
 * from the other side: state the world remembered belongs on a source.
 */

import Stock from '@saxonberg/content-trade-shopkeeping/src/thing/Stock';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type {
  HydrationSource,
  HydrateOutcome,
} from '@saxonberg/server/mud/lib/persistence/PersistenceSlice';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

export default class MarketStalls extends Stock {
  static fieldMeta: FieldMeta = {
    rentMinor: { persistent: true, authorable: true },
    // ⚠ Authored, NOT persistent. How many pitches the square has is
    // CONTENT — the row is its source of truth. Persisting it would
    // mean a captured 12 overwriting an author's edit to 20 at the next
    // boot, which is the `props:`-edit-never-reaches-a-booted-world
    // failure wearing a different hat.
    pitches: { authorable: true },
    // Not authorable: the book is runtime state, not content. An author
    // says how many pitches the square has; who is on them is play.
    lets: { persistent: true },
  };

  /**
   * What the world remembered about this square: the book of lets.
   *
   * `required: false` — an unreachable store is a recorded skip, not a
   * refusal to exist. Early boot and every test run are that case (no
   * Mongo), and a market square that cannot read its book should still
   * stand; it simply has no lets yet, which is also what a fresh square
   * looks like.
   */
  static hydrationSource: HydrationSource = {
    name: 'holder_snapshots',
    required: false,
  };

  /**
   * Restore the fixture's own `(scope, key)` record.
   *
   * Keyless on purpose — one fixture per row, so the owner derives from
   * the scope, which is the degenerate singleton case of the spine's
   * `(scope, key)` pair. A missing record is a clean no-op (an unrented
   * square has nothing to remember).
   *
   * ⭐ Side effect worth naming: this also restores whatever was
   * CONSIGNED on the square's own stall, which nothing restored before
   * — the fixture was established by nobody, so the market's produce
   * vanished at every boot. That is a fix, not a regression, and it is
   * the reason the record is the whole host's rather than the book's
   * alone.
   */
  static async hydrateFromSource(host: Stuff): Promise<HydrateOutcome> {
    try {
      await PersistableApi.materialize(host);
      return { status: 'hydrated' };
    } catch (err) {
      // ⚠ Never throw from here: a throw unregisters the half-built
      // object, so a store hiccup would take the market square out of
      // the world rather than leaving it bookless.
      return { status: 'unreachable', reason: String(err) };
    }
  }

  /** What a stall on this square costs to rent, in minor units (0 = free). */
  public rentMinor = 0;

  /** How many pitches this square has to let. */
  public pitches = 0;

  /**
   * The book of lets: pitch number (as a string key) → the renter's
   * identity path. Persistent, because a pitch outlives the session
   * that took it.
   */
  public lets: Record<string, string> = {};

  public getRentMinor(): number {
    return this.rentMinor;
  }

  public setRentMinor(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`MarketStalls.rentMinor: ${String(value)} is not a rent`);
    }
    this.rentMinor = Math.floor(value);
  }

  public getPitches(): number {
    return this.pitches;
  }

  public setPitches(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `MarketStalls.pitches: ${String(value)} is not a pitch count`,
      );
    }
    this.pitches = Math.floor(value);
  }

  /** The pitch this renter holds, or null. */
  public pitchOf(renterKey: string): string | null {
    if (!renterKey) return null;
    for (const [pitch, holder] of Object.entries(this.lets)) {
      if (holder === renterKey) return pitch;
    }
    return null;
  }

  /** Who holds this pitch, or null. */
  public holderOfPitch(pitch: string): string | null {
    return this.lets[pitch] ?? null;
  }

  /**
   * Take the lowest free pitch for `renterKey`, or `null` when the
   * square is full. Idempotent: a renter who already holds one gets
   * that one back rather than a second.
   *
   * ⭐ Lowest-free rather than next-up, so a given-up pitch is re-let
   * before the square grows — the square reads as a place with a fixed
   * number of spots, which is what it is.
   */
  public async allocatePitch(renterKey: string): Promise<string | null> {
    if (!renterKey) return null;
    const held = this.pitchOf(renterKey);
    if (held) return held;
    for (let n = 1; n <= this.pitches; n++) {
      const pitch = String(n);
      if (!this.lets[pitch]) {
        this.lets[pitch] = renterKey;
        await this.captureBook();
        return pitch;
      }
    }
    return null;
  }

  /** Give up whatever pitch this renter holds. Returns it, or null. */
  public async releasePitch(renterKey: string): Promise<string | null> {
    const held = this.pitchOf(renterKey);
    if (!held) return null;
    delete this.lets[held];
    await this.captureBook();
    return held;
  }

  /** Write the book down. Every mutator above calls it. */
  private async captureBook(): Promise<void> {
    await PersistableApi.capture(this as unknown as Stuff);
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
