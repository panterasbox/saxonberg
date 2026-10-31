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
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';

/** What a berth asks of the ship it leads aboard (a Ship answers it). */
export interface Berthed {
  getName(): string;
  getEntrance(): string | null;
  getBerth(): string | null;
  isGangwayLocked(): boolean;
  setGangwayLocked(value: boolean): void;
  getGangwayKeyway(): string;
}

export default class BerthExit extends LockableMixin(DeferredDestinationExit) {
  /** The ship this way leads aboard — her row path (an identity ref). */
  private shipPath = '';

  /** Set once, by the ship that installs it. */
  public configureBerth(ship: Stuff): void {
    this.shipPath = ship.getTemplatePath() ?? '';
  }

  /** The ship's row path. */
  public getShipPath(): string {
    return this.shipPath;
  }

  /** The ship, if she is standing. */
  public ship(): (Stuff & Berthed) | null {
    if (!this.shipPath) return null;
    const s = StuffApi.findByTemplatePath<Stuff & Berthed>(this.shipPath);
    return s && !s.isDestroyed() ? s : null;
  }

  /** Her name, as the landing's `look` reads it. */
  public alongsideName(): string {
    return this.ship()?.getName() ?? '';
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
    const ship = this.ship();
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

  /** Her deck, whenever the way is taken (she may have been reaped and stood up again). */
  public override async resolveDestination(): Promise<Stuff & Container> {
    return this.computeDestination();
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    const ship = this.ship() ?? (await StuffApi.singleton<Stuff & Berthed>(this.shipPath));
    const entrance = ship.getEntrance();
    if (!entrance) throw new Error(`BerthExit: '${this.shipPath}' has no entrance`);
    return StuffApi.singleton<Stuff & Container>(entrance);
  }
}
