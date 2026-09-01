/**
 * DormDoor — the lazy entry passage from a floor corridor into one unit's
 * `DormRoom`. A runtime clone (one per provisioned unit on its floor),
 * created by `DormWarren.ensureUnitDoor`, its `unitKey` set at creation.
 *
 * Implemented as a `DeferredDestinationExit` — eager on its face (its
 * destination template is `DORMROOM_TEMPLATE`, so `look`/a map describe it
 * without conjuring the room), with the room faulted in on traversal via
 * `computeDestination` → `DormWarren.admit(unitKey)` (cached by the base). The
 * load-bearing behavior is "**the door
 * opens for whoever holds the key**": it is locked with the unit's `keyway`
 * (a `pin-tumbler` `Lock`), and `canTraverse` admits any mover who presents a
 * matching key — a carried physical `Key` or an implant-keychain entry, found
 * by `CredentialApi.presentsKey` (a **synchronous** reachable-wallet scan, run before
 * `resolveDestination`). The keyway is read off the warren's sync
 * `keywayOf(unitKey)` cache (refreshed from the durable parcel keyway); an
 * unkeyed unit (empty keyway) is locked to everyone. Access is bearer
 * (transferable — lend your key); the lease is the authority that *issues*
 * the key at provisioning, and move-out **re-keys** so the old key is dead
 * metal.
 *
 * (v1: the door stays an `Exit` with a lock, not a `SealableMixin(Boundary)`
 * fixture; the physical `open <door>` / manual `lock`/`unlock` verbs +
 * auto-close-behind are deferred. A follower can't tail a holder through —
 * traversal is gated per-mover, so a keyless mover is blocked even if they
 * follow.)
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import { type TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { CredentialApi } from '@saxonberg/server/mud/api/credential';
import { Lock } from '@saxonberg/server/mud/lib/lock/Lock';
import DormWarren from './DormWarren';

export default class DormDoor extends DeferredDestinationExit {
  /** The unit parcel extent this door fronts (the D1 key + lease key). */
  private unitKey: string;

  constructor(source: Stuff & Container, unitKey: string, direction: string) {
    super({
      direction,
      source,
      // The destination's class template (accurate + eager); the specific
      // unit's room is faulted in via `computeDestination`.
      destinationTemplatePath: DormWarren.DORMROOM_TEMPLATE,
    });
    this.unitKey = unitKey;
  }

  public getUnitKey(): string {
    return this.unitKey;
  }

  /** Materialize (or re-materialize) the unit's room. */
  protected override async computeDestination(): Promise<Stuff & Container> {
    const warren = await DormWarren.resolve();
    return warren.admit(this.unitKey);
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
    if (!CredentialApi.presentsKey(mover, lock)) {
      return { ok: false, gate: 'door', reason: "Your key doesn't fit this lock." };
    }
    return super.canTraverse(mover, mode);
  }
}
