/**
 * BerthExit — ⭐ **the way aboard a ship, named for her** (harbors P4).
 *
 * A ship made fast at a landing puts a way aboard her on it — `go hesper`,
 * `go ostrander` — and takes it away when she casts off. Nothing else
 * reaches her deck from the shore: the way is the ship's, installed by
 * `Ship.comeAlongside` and removed by `Ship.castOff` (the
 * `ReachWarren.removeWay` shape), so a ship that has sailed leaves no
 * door behind her to refuse in words.
 *
 * - **Eager on its face** — its destination template is her entrance row,
 *   describable with nothing loaded; the deck is faulted in when the way is
 *   taken (`computeDestination`).
 * - **Hers by HANDLE** (harbors P3, B1, review 1) — the way names her
 *   identity (minted `<kind row>/<serial>` for a ship of a kind, her row
 *   for an authored ship), never a row path a second smack would share.
 * - **It outlives her sleep** (B1): a ship of a kind asleep at her berth
 *   leaves this way on the landing, and taking it stands her up
 *   (`ExpanseApi.standUpCraft` — cloned under her identity and restored
 *   from her record) and leads onto her deck, which it asks HER for
 *   (`watchRoom`): her rooms are found through her.
 * - **The gangway's lock is HERS** (P9): the bolt and the keyway are the
 *   ship's two facts, read by this way and by her deck's `ashore` alike.
 *   This way refuses a locked gangway to anybody without a key; leaving
 *   never refuses.
 *
 * Replaces `AboardExit`, which stood on a landing whether or not anything
 * was there and worked out which ship (if any) lay alongside.
 */

import DeferredDestinationExit from '../../lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '../../lib/boundary/Exit';
import { LockableMixin } from '../../lib/boundary/Lockable';
import { Lock } from '../../lib/lock/Lock';
import { StuffApi } from '../../api/stuff';
import { ExpanseApi } from '../../api/expanse';
import { ProseApi } from '../../api/prose';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import StructureBase from '../../lib/structure/Structure';

/** What a berth asks of the ship it leads aboard (a Ship answers it). */
export interface Berthed {
  getName(): string;
  getDurableHandle(): string | null;
  getBerth(): string | null;
  isGangwayLocked(): boolean;
  setGangwayLocked(value: boolean): void;
  getGangwayKeyway(): string;
  /** Her deck, standing — where the way aboard leads. */
  watchRoom(): Promise<(Stuff & Container) | null>;
  /** Her deck if it stands now; never stands her up. */
  watchRoomNow(): (Stuff & Container) | null;
}

export default class BerthExit extends LockableMixin(DeferredDestinationExit) {
  /** The ship this way leads aboard — her durable handle (an identity ref). */
  private shipHandle = '';
  /** Her name as she made fast — what the landing reads while she sleeps. */
  private shipName = '';
  /**
   * ⭐ Her gangway as she last said it — the bolt and the keyway — so the
   * way answers `lock`/`unlock` and refuses the right people while she
   * SLEEPS (B2: a sleeping ship is not standing to be asked). She tells it
   * whenever the bolt moves; it is never the authority while she stands.
   */
  private lockedWhenAsleep = false;
  private keywayWhenAsleep = '';

  /** Set by the ship that installs it, and again whenever her gangway changes. */
  public configureBerth(ship: Stuff & Berthed): void {
    this.shipHandle = ship.getDurableHandle() ?? ship.getTemplatePath() ?? '';
    this.shipName = ship.getName();
    this.lockedWhenAsleep = ship.isGangwayLocked();
    this.keywayWhenAsleep = ship.getGangwayKeyway();
  }

  /** The ship's durable handle. */
  public getShipHandle(): string {
    return this.shipHandle;
  }

  /** The ship, if she is standing (never stands her up). */
  public ship(): (Stuff & Berthed) | null {
    if (!this.shipHandle) return null;
    return StuffApi.findByIdentityPath<Stuff & Berthed>(this.shipHandle).find((s) => !s.isDestroyed()) ?? null;
  }

  /** The ship, stood up if she sleeps. */
  private async standing(): Promise<(Stuff & Berthed) | null> {
    const live = this.ship();
    if (live !== null) return live;
    if (!this.shipHandle) return null;
    return (await ExpanseApi.standUpCraft(this.shipHandle)) as unknown as (Stuff & Berthed) | null;
  }

  /**
   * ⭐ The way describes ITSELF (harbors review 3): `look hesper` binds this
   * exit — a candidate in its own right, named for her — and `look` shows
   * what MQL bound. The prose is the kind row's authored `longDescription`
   * with `{{ ship }}` her name (*"A gangway runs up to the Hesper's
   * deck."*), read asleep or awake; with no ship to name, the plain way.
   */
  public override getLongFor(viewer: Stuff): string {
    const ship = this.alongsideName();
    const said = this.getLongDescription();
    if (!said) return super.getLongFor(viewer);
    if (!ship) return this.plainWay();
    return ProseApi.format(said, { ship }).toString();
  }

  /**
   * ⭐ What lies alongside, for the LANDING (paint review): she, while she
   * stands and lies here; `null` when she does not — never `undefined`
   * (*my far side is my path*), because this way's far side is HER, and a
   * ship that sleeps is not standing to be painted from the quay.
   */
  public override alongsideNow(): StructureBase | null {
    const ship = this.ship();
    if (ship === null || !(ship instanceof StructureBase)) return null;
    return ship.getBerth() === this.getSource().getTemplatePath() ? ship : null;
  }

  /** Her name, as the landing's `look` reads it — asleep or awake. */
  public alongsideName(): string {
    return this.ship()?.getName() ?? this.shipName;
  }

  /* ─────────────── the gangway: the ship's lock ─────────────── */

  /**
   * ⭐ Never on a map (river D38 d, harbors review 1): this way comes and
   * goes with the ship — she leaves, and a map that wrote it down would
   * tell its owner of a way that left with her. `route` from aboard plans
   * from where she lies instead.
   */
  public override isMapped(): boolean {
    return false;
  }

  public override isLocked(): boolean {
    return this.ship()?.isGangwayLocked() ?? this.lockedWhenAsleep;
  }

  /**
   * The bolt is hers: thrown on her while she stands; while she sleeps the
   * way takes it at once and she is stood up to keep it (her record is
   * what outlives the process).
   */
  public override setLocked(value: boolean): void {
    if (typeof value !== 'boolean') throw new TypeError(`BerthExit.locked must be a boolean, got ${typeof value}`);
    const live = this.ship();
    if (live !== null) {
      live.setGangwayLocked(value);
      return;
    }
    this.lockedWhenAsleep = value;
    void this.standing()
      .then((ship) => {
        if (ship === null) throw new Error(`'${this.shipHandle}' does not stand`);
        ship.setGangwayLocked(value);
      })
      .catch((err) => console.warn(`BerthExit: her gangway could not be ${value ? 'locked' : 'unlocked'} while she slept:`, err));
  }

  public override lock(): void {
    this.setLocked(true);
  }

  public override unlock(): void {
    this.setLocked(false);
  }

  /** ⭐ The keyway is hers, not this way's (P9). */
  public override getLock(): Lock {
    return new Lock(this.ship()?.getGangwayKeyway() ?? this.keywayWhenAsleep, 'pin-tumbler');
  }

  public override async canTraverse(mover: Stuff & Containable, mode?: string): Promise<TraversalGuard> {
    const ship = await this.standing();
    const here = this.getSource().getTemplatePath();
    if (ship === null || ship.getBerth() !== here) {
      return { ok: false, gate: 'blocked', reason: 'She is not alongside.' };
    }
    if (this.isLocked() && !this.opensFor(mover)) {
      return {
        ok: false,
        gate: 'door',
        reason: this.getLock().keyway ? "Your key doesn't fit her gangway." : 'Her gangway is locked.',
      };
    }
    return super.canTraverse(mover, mode);
  }

  /**
   * ⭐ The far side if it is loaded now (harbors review 2): HER deck, asked
   * of her — never the entrance row's instances, which for a ship of a
   * kind are every smack's deck. A sleeping ship is not stood up to be
   * looked at: `peekDestination` never faults anything in, and the landing
   * already reads her name while she sleeps (*Alongside: …*); taking the
   * way is what stands her up.
   */
  public override peekDestination(): Stuff | null {
    return this.ship()?.watchRoomNow() ?? null;
  }

  /** Her deck, whenever the way is taken (she may have slept and been stood up again). */
  public override async resolveDestination(): Promise<Stuff & Container> {
    return this.computeDestination();
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    const ship = await this.standing();
    if (ship === null) throw new Error(`BerthExit: '${this.shipHandle}' does not stand`);
    const deck = await ship.watchRoom();
    if (deck === null) throw new Error(`BerthExit: '${this.shipHandle}' has no deck`);
    return deck;
  }
}
