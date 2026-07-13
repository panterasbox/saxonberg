/**
 * DormDoor — the lazy entry passage from a floor corridor into one unit's
 * `DormRoom`. A runtime clone (one per provisioned unit on its floor),
 * created by `DormWarren.ensureUnitDoor`, its `unitKey` set at creation.
 *
 * Implemented as an `Exit` subclass. The load-bearing behavior is "**the door
 * opens for whoever holds the key**": it is locked with the unit's `keyway`
 * (a `pin-tumbler` `Lock`), and `canTraverse` admits any mover who presents a
 * matching key — a carried physical `Key` or an implant-keychain entry, found
 * by `KeyApi.presents` (a **synchronous** reachable-wallet scan, run before
 * `resolveDestination`). The keyway is read off the warren's sync
 * `keywayOf(unitKey)` cache (refreshed from the durable parcel keyway); an
 * unkeyed unit (empty keyway) is locked to everyone. Access is bearer
 * (transferable — lend your key); the lease is the authority that *issues*
 * the key at provisioning, and move-out **re-keys** so the old key is dead
 * metal. Its destination materializes lazily: `resolveDestination()` →
 * `DormWarren.admit(unitKey)`, cached as a within-session live ref.
 *
 * (v1: the door stays an `Exit` with a lock, not a `SealableMixin(Boundary)`
 * fixture; the physical `open <door>` / manual `lock`/`unlock` verbs +
 * auto-close-behind are deferred. A follower can't tail a holder through —
 * traversal is gated per-mover, so a keyless mover is blocked even if they
 * follow.)
 */

import Exit, { type TraversalGuard } from '../../../lib/boundary/Exit';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import { KeyApi } from '../../../api/key';
import { Lock } from '../../../lib/lock/Lock';
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
   * The key gate: the door opens for whoever presents a KEY matching its lock
   * (bearer possession — a physical key or an implant-keychain entry, found by
   * the sync reachable-wallet scan), and blocks everyone else. The lock's
   * keyway is a sync lookup off the warren's keyway cache; an empty keyway is
   * an unprovisioned/re-keyed unit no key opens. A master key (a super's ring)
   * passes via the same check.
   */
  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    const keyway = DormWarren.peek()?.keywayOf(this.unitKey) ?? '';
    if (!keyway) {
      return { ok: false, gate: 'door', reason: 'The door is locked.' };
    }
    const lock = new Lock(keyway, DormWarren.DORM_LOCK_TECH);
    if (!KeyApi.presents(mover, lock)) {
      return { ok: false, gate: 'door', reason: "Your key doesn't fit this lock." };
    }
    return super.canTraverse(mover, mode);
  }
}
