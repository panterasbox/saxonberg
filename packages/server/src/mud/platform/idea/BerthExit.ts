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
 * - **Hers by HANDLE** (harbors P3, B1) — the way names her durable handle
 *   (`<kind row>#<serial>` for a ship of a kind, her row for an authored
 *   ship), never a row path a second smack would share.
 * - **It outlives her sleep** (B1): a ship of a kind asleep at her berth
 *   leaves this way on the landing, and taking it stands her up
 *   (`ExpanseApi.standUpCraft` → the spine's resolve-first `standUpKeyed`)
 *   and leads onto her deck.
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
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';

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
}

export default class BerthExit extends LockableMixin(DeferredDestinationExit) {
  /** The ship this way leads aboard — her durable handle (an identity ref). */
  private shipHandle = '';
  /** Her name as she made fast — what the landing reads while she sleeps. */
  private shipName = '';

  /** Set once, by the ship that installs it. */
  public configureBerth(ship: Stuff & Berthed): void {
    this.shipHandle = ship.getDurableHandle() ?? ship.getTemplatePath() ?? '';
    this.shipName = ship.getName();
  }

  /** The ship's durable handle. */
  public getShipHandle(): string {
    return this.shipHandle;
  }

  /** The ship, if she is standing (never stands her up). */
  public ship(): (Stuff & Berthed) | null {
    if (!this.shipHandle) return null;
    return StuffApi.findByDurableHandle<Stuff & Berthed>(this.shipHandle);
  }

  /** The ship, stood up if she sleeps. */
  private async standing(): Promise<(Stuff & Berthed) | null> {
    const live = this.ship();
    if (live !== null) return live;
    if (!this.shipHandle) return null;
    return (await ExpanseApi.standUpCraft(this.shipHandle)) as unknown as (Stuff & Berthed) | null;
  }

  /** Her name, as the landing's `look` reads it — asleep or awake. */
  public alongsideName(): string {
    return this.ship()?.getName() ?? this.shipName;
  }

  /* ─────────────── the gangway: the ship's lock ─────────────── */

  public override isLocked(): boolean {
    return this.ship()?.isGangwayLocked() ?? false;
  }

  public override setLocked(value: boolean): void {
    if (typeof value !== 'boolean') throw new TypeError(`BerthExit.locked must be a boolean, got ${typeof value}`);
    this.ship()?.setGangwayLocked(value);
  }

  public override lock(): void {
    this.setLocked(true);
  }

  public override unlock(): void {
    this.setLocked(false);
  }

  /** ⭐ The keyway is hers, not this way's (P9). */
  public override getLock(): Lock {
    return new Lock(this.ship()?.getGangwayKeyway() ?? '', 'pin-tumbler');
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
