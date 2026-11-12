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
import { BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { EmploymentApi, type Business } from '@saxonberg/server/mud/api/employment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type {
  HydrationSource,
  HydrateOutcome,
} from '@saxonberg/server/mud/lib/persistence/PersistenceSlice';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

/** Why `MarketStalls.let` refused. Each is decided before any money moves. */
export type StallLetRefusal =
  | 'no-identity'
  | 'no-square'
  | 'no-bank'
  | 'square-full'
  | 'cant-afford'
  | 'no-market-account';

/** What `MarketStalls.let` answers: the renter's counter and house, or why not. */
export type StallLetAnswer =
  | {
      ok: true;
      counter: Stock;
      /** A first let (`false` = the stall they already hold, opened). */
      fresh: boolean;
      /** The bank the house banks with (the renter's own custodian). */
      bank: string;
      /** The house's operating account. */
      account: string;
    }
  | { ok: false; reason: StallLetRefusal; rentMinor: number };

/** What `MarketStalls.giveUp` answers. */
export type StallGiveUpAnswer =
  | {
      ok: true;
      /** Where the counter's goods went: the keeper's hands, or the square. */
      goodsTo: 'hands' | 'square';
    }
  | { ok: false; reason: 'no-stall' };

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

  /**
   * ⭐ **Let `renter` a stall on this square** (controller-liquidity W13) —
   * or open the one they already hold. Every refusal first (an identity, a
   * square to stand in, an account whose bank the house will use, a free
   * pitch); the rent, paid once from their account to the market's, only
   * for a pitch with no record of theirs; then the counter — minted keyed
   * to the PITCH and restored if packed away by a restart — and the house,
   * re-minted from the renter every time (nothing in it is its own).
   */
  public async let(renter: Stuff): Promise<StallLetAnswer> {
    const rent = this.rentMinor;
    const refuse = (reason: StallLetRefusal): StallLetAnswer => ({ ok: false, reason, rentMinor: rent });
    const renterKey = renter.getIdentityPath() ?? '';
    if (!renterKey) return refuse('no-identity');
    const square = this.getContainer();
    if (!square || !MixinApi.isContainer(square)) return refuse('no-square');

    // The stall banks where its keeper does.
    const primary = await BankingApi.primaryAccountIdOf(renterKey);
    const bank = primary ? await BankingApi.custodianOf(primary) : null;
    if (!primary || !bank) return refuse('no-bank');

    // Their pitch: the one they hold, else the lowest free one. A full
    // square refuses before any money moves.
    const pitch = await this.allocatePitch(renterKey);
    if (!pitch) return refuse('square-full');

    const ids = this.idsFor(pitch);
    let counter = StuffApi.findByTemplatePath<Stock>(ids.counter) ?? null;
    let fresh = false;
    if (!counter) {
      // A pitch with a record of theirs is a stall packed away by a
      // restart — theirs already, not a new let.
      const held = await PersistableApi.hasRecord(ids.counter, ids.key);
      const due = held ? 0 : rent;
      if (due > 0) {
        // ⚠ Every refusal from here gives the pitch back: the allocation
        // came first so a full square could refuse without charging.
        if (BankingApi.balanceOf(primary).minor < due) {
          await this.releasePitch(renterKey);
          return refuse('cant-afford');
        }
        const market = await EmploymentApi.ensureOperatorAt(this.getTemplatePath() ?? '');
        const marketAccount = market ? await EmploymentApi.operatingAccountOf(market) : null;
        if (!marketAccount) {
          await this.releasePitch(renterKey);
          return refuse('no-market-account');
        }
        await BankingApi.transfer(primary, marketAccount, Money.of(due, BankingApi.compactCurrency()), 'stall rent');
      }
      // identity-keyed-by: own-record — the counter's own
      // `holder_snapshots` record (`restoreOrSeed` just below), plus the
      // house's `operatingLocations` and `counterPath` round-trips,
      // which resolve this exact string.
      counter = await StuffApi.clone<Stock>(MarketStalls.STALL_SEED, undefined, { asIdentityPath: ids.counter });
      const restored = await PersistableApi.restoreOrSeed(counter, ids.key);
      // The counter answers to the renter's house — the closed sign, the
      // attendance point, the operator a customer meets.
      counter.setBusinessPath(ids.house);
      if (!restored) {
        fresh = true;
        const who = renter.getPresentation() ?? 'someone';
        const stem = who.replace(/[^A-Za-z]+/g, ' ').trim().split(' ')[0]?.toLowerCase() ?? '';
        counter.setShortDescription(`${who}'s stall`);
        counter.setKeywords(['stall', 'counter', 'trestle', ...(stem ? [stem] : [])]);
        ContainmentApi.move(counter as unknown as Stuff & Containable, square);
        await PersistableApi.capture(counter, ids.key);
      } else if (!MixinApi.isContainable(counter) || counter.getContainer() !== square) {
        ContainmentApi.move(counter as unknown as Stuff & Containable, square);
      }
    }

    // The house — derived from the renter, re-minted rather than restored.
    let house = StuffApi.findByTemplatePath<Stuff & Business>(ids.house) ?? null;
    if (!house) {
      house = await StuffApi.clone<Stuff & Business>(MarketStalls.STALL_BUSINESS_SEED, undefined, {
        // identity-keyed-by: referenced — the house's operating account
        // keys on this identity (`Business.getAccountPath()`), and
        // employment records reference it as `organizationPath`.
        asIdentityPath: ids.house,
        dataOverlay: {
          name: `${renter.getPresentation() ?? 'a keeper'}'s stall`,
          appointingAuthority: { kind: 'entity', path: renterKey },
          banksAt: bank,
          operatingLocations: [ids.counter],
        },
      });
    }
    if (!house.employs(renter)) await house.appoint(renter, 'keeper');
    // The operator at the counter is the house: the employment memo has to
    // re-see a business minted outside its own standup path.
    await EmploymentApi.ensureOperatorAt(ids.counter);
    const account = await EmploymentApi.operatingAccountOf(house);
    return { ok: true, counter, fresh, bank, account };
  }

  /**
   * ⭐ **Pack `renter`'s stall away** — what is on the counter goes to
   * their hands (custody only; a supplier's crate is still the supplier's),
   * or onto the square when they cannot hold things (C5: the goods used to
   * be destructed with the counter); the pitch's record is DELETED, not
   * captured empty (a pitch that remembers the last keeper's counter hands
   * it to the next renter); the house stays with nothing to operate; the
   * pitch frees last.
   */
  public async giveUp(renter: Stuff): Promise<StallGiveUpAnswer> {
    const renterKey = renter.getIdentityPath() ?? '';
    // ⭐ The BOOK says which pitch is theirs.
    const pitch = this.pitchOf(renterKey);
    if (!pitch) return { ok: false, reason: 'no-stall' };
    const ids = this.idsFor(pitch);
    const counter = StuffApi.findByTemplatePath<Stock>(ids.counter) ?? null;
    if (!counter) return { ok: false, reason: 'no-stall' };

    const square = this.getContainer();
    const hands = MixinApi.isContainer(renter) ? (renter as Stuff & Container) : null;
    const to = hands ?? (square && MixinApi.isContainer(square) ? square : null);
    for (const good of [...counter.getContents()]) {
      counter.removeListing?.(MixinApi.isChattel(good) ? good.getChattelId() : '');
      if (to) {
        if (MixinApi.isCarrying(to)) to.receive(good as unknown as Stuff & Containable);
        else ContainmentApi.move(good as unknown as Stuff & Containable, to);
      }
    }
    // The owner IS the pitch key, so this is one record.
    await PersistableApi.deleteAllFor(ids.key);
    const house = StuffApi.findByTemplatePath<Stuff & Business>(ids.house) ?? null;
    if (house) house.setOperatingLocations([]);
    await StuffApi.destruct(counter as unknown as Stuff);
    // Last, so a throw above leaves the let intact rather than orphaning a
    // standing counter.
    await this.releasePitch(renterKey);
    return { ok: true, goodsTo: hands ? 'hands' : 'square' };
  }

  /** The seed a renter's counter is minted from, and the scope its record is filed under. */
  static readonly STALL_SEED = '/world/terminus/market/thing/stall';
  /** The seed a renter's house is minted from. */
  static readonly STALL_BUSINESS_SEED = '/trade/shopkeeping/idea/business/stall';

  /**
   * The key and the two identities of the stall on `pitch`. The **key** is
   * `<this fixture's row>/<pitch>` — the manager's own durable address as
   * the prefix, exactly as a holding warren keys its rooms `<extent>/<leaf>`.
   * The two **identities** derive from that key with its leading slash
   * stripped, so each nests under its own seed row.
   */
  public idsFor(pitch: string): { key: string; counter: string; house: string } {
    const key = `${this.getTemplatePath() ?? ''}/${pitch}`;
    const leaf = key.replace(/^\/+/, '');
    return {
      key,
      counter: `${MarketStalls.STALL_SEED}/${leaf}`,
      house: `${MarketStalls.STALL_BUSINESS_SEED}/${leaf}`,
    };
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
