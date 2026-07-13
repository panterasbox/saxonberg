/**
 * DormDoor — the lazy entry passage from a floor corridor into one unit's
 * `DormRoom`. A runtime clone (one per provisioned unit on its floor),
 * created by `DormWarren.ensureUnitDoor`, its `unitKey` set at creation.
 *
 * Implemented as an `Exit` subclass. The load-bearing behavior is "**the door
 * knows its tenant**": it opens for exactly the unit's active leaseholder and
 * blocks everyone else — no verb, no unlock step, you just go home and it
 * lets you in. The lease check is a **synchronous** decision in `canTraverse`
 * (the real move path checks it before `resolveDestination`), read off the
 * warren's sync `leaseholderOf(unitKey)` cache (refreshed from the durable
 * grants whenever provisioning changes). Its destination materializes lazily:
 * `resolveDestination()` → `DormWarren.admit(unitKey)`, cached as a
 * within-session live ref.
 *
 * (v1: the door stays a lease-gated `Exit`, not a `SealableMixin(Boundary)`
 * fixture; the physical `open <door>` verb + auto-close-behind tightening are
 * deferred. A follower can't tail a holder through — traversal is gated
 * per-mover, so a non-tenant is blocked even if they follow.)
 */

import Exit, { type TraversalGuard } from '../../../lib/boundary/Exit';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import DormWarren from './DormWarren';

export default class DormDoor extends Exit {
  /** The unit parcel extent this door fronts (the D1 key + lease key). */
  private unitKey: string;

  /** Cached live room (Pattern B live ref); re-resolved after a reap. */
  private live: (Stuff & Container) | null = null;

  constructor(source: Stuff & Container, unitKey: string, direction: string) {
    super({
      direction,
      source,
      destinationPath: DormWarren.WARREN_PATH, // placeholder; resolved below
    });
    this.unitKey = unitKey;
  }

  public getUnitKey(): string {
    return this.unitKey;
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

  /**
   * The tenant gate: the door opens for exactly its unit's active
   * leaseholder (a sync lookup off the warren's leaseholder cache) and blocks
   * everyone else. No lease → no one passes (an unprovisioned/expired unit).
   */
  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    const holder = DormWarren.peek()?.leaseholderOf(this.unitKey) ?? null;
    if (!holder || mover.getTemplatePath() !== holder) {
      return { ok: false, gate: 'door', reason: "This isn't your room." };
    }
    return super.canTraverse(mover, mode);
  }
}
