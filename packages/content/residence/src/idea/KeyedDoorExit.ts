/**
 * KeyedDoorExit — a live-ref exit between two rooms of ONE holding,
 * locked to the holding's keyway (residences D16/P10): the intra-
 * holding half of the dorm-door model. Traversal admits whoever
 * **presents a matching key** (a carried physical `Key` or an implant
 * keychain entry — `CredentialApi.presentsKey`, the sync
 * reachable-wallet scan) and blocks everyone else; an empty keyway (an
 * unprovisioned / re-keyed holding) opens for no one. The keyway is a
 * sync read off the owning {@link HoldingWarren}'s cache.
 *
 * A plain `Exit` (not deferred): both rooms are live when the
 * programme wires its floorplan — the deferral seam is the
 * institution-side `FrontDoorExit`, not this edge.
 */

import Exit, { type TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import { Lock, type LockType } from '@saxonberg/server/mud/lib/lock/Lock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type HoldingWarren from './HoldingWarren';

type ExitableContainer = Stuff & Container & Exitable;

export default class KeyedDoorExit extends Exit {
  private programmeRef: HoldingWarren | null = null;
  private lockTech: LockType = 'pin-tumbler';

  /** ⭐ What the constructor used to take, as a set-once step. */
  public configureKeyedDoor(
    programme: HoldingWarren,
    opts: { lockTech?: LockType } = {},
  ): void {
    this.programmeRef = programme;
    this.lockTech = opts.lockTech ?? 'pin-tumbler';
  }

  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    // ⚠ `programmeRef` is set by `configureKeyedDoor` after the clone,
    // so an unconfigured door is a door nobody can open — which is the
    // right answer, not a crash.
    const keyway =
      !this.programmeRef || this.programmeRef.isDestroyed()
        ? ''
        : this.programmeRef.keyway();
    if (!keyway) {
      return { ok: false, gate: 'door', reason: 'The door is locked.' };
    }
    const lock = new Lock(keyway, this.lockTech);
    if (!lock.opensFor(mover)) {
      return {
        ok: false,
        gate: 'door',
        reason: "Your key doesn't fit this lock.",
      };
    }
    return super.canTraverse(mover, mode);
  }
}
