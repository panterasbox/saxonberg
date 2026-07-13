/**
 * DormDoor — the lease-gated, lazy entry passage from a floor corridor into
 * one unit's `DormRoom`. A runtime clone (one per provisioned unit on its
 * floor), created by `DormWarren.ensureUnitDoor`, its `unitKey` set at
 * creation.
 *
 * Implemented as an `Exit` subclass (not a Boundary fixture) — the load-
 * bearing behavior is "hold the lease → can pass; don't → can't": the door
 * starts **locked** (`canTraverse` blocks), `unlock(actor)` lease-gates via
 * `ParcelApi.hasUseGrant(unitKey, actor)` (actor from `ExecutionContextApi`),
 * and once unlocked it stays open (a follower could tail in — acceptable
 * v1). Its destination materializes lazily: `resolveDestination()` →
 * `DormWarren.admit(unitKey)`, cached as a within-session live ref.
 *
 * (DEVIATION from dorm-plan DECISION E: v1 folds the lockable `Door`
 * (`SealableMixin(Boundary)`) into this Exit's own gate rather than a
 * separate Boundary fixture surfaced by anchors; the `open <door>` verb
 * surface + auto-close-behind tightening are Phase 7 polish.)
 */

import Exit, { type TraversalGuard } from '../../../lib/boundary/Exit';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import { ParcelApi } from '../../../api/parcel';
import { ExecutionContextApi } from '../../../api/execution-context';
import DormWarren from './DormWarren';

export default class DormDoor extends Exit {
  /** The unit parcel extent this door fronts (the D1 key + lease key). */
  private unitKey: string;

  /** Locked until a leaseholder unlocks; stays open thereafter (v1). */
  private _open = false;

  /** Cached live room (Pattern B live ref); re-resolved after a reap. */
  private live: (Stuff & Container) | null = null;

  constructor(source: Stuff & Container, unitKey: string, direction: string) {
    super({
      direction,
      source,
      destinationPath: DormWarren.WARREN_PATH, // placeholder; overridden below
    });
    this.unitKey = unitKey;
  }

  public getUnitKey(): string {
    return this.unitKey;
  }

  public isOpen(): boolean {
    return this._open;
  }

  /**
   * Lease-gate: open the door for the acting principal (from execution
   * context) iff they hold an active lease on this unit. Throws otherwise —
   * can't open, can't pass. Once open it stays open.
   */
  public async unlock(): Promise<void> {
    const actor = ExecutionContextApi.getActingAuthor() as Stuff | null;
    const holder = actor?.getTemplatePath() ?? '';
    if (!holder || !(await ParcelApi.hasUseGrant(this.unitKey, holder))) {
      throw new Error("You don't hold this dorm's lease.");
    }
    this._open = true;
  }

  /** Materialize (or re-materialize) the unit's room and return it. */
  public override async resolveDestination(): Promise<Stuff & Container> {
    if (this.live && !this.live.isDestroyed()) return this.live;
    const warren = await DormWarren.resolve();
    const room = await warren.admit(this.unitKey);
    this.live = room;
    return room;
  }

  public override getDestination(): Stuff & Container {
    if (this.live && !this.live.isDestroyed()) return this.live;
    throw new Error(
      'DormDoor: destination not materialized; await resolveDestination()',
    );
  }

  /** A locked door blocks traversal (the "no lease, no pass" gate). */
  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    if (!this._open) {
      return { ok: false, gate: 'door', reason: 'The door is locked.' };
    }
    return super.canTraverse(mover, mode);
  }
}
