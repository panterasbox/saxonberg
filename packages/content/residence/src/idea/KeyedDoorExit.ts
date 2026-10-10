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
import { LockableMixin } from '@saxonberg/server/mud/lib/boundary/Lockable';
import { Lock, type LockType } from '@saxonberg/server/mud/lib/lock/Lock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type HoldingWarren from './HoldingWarren';

type ExitableContainer = Stuff & Container & Exitable;

export default class KeyedDoorExit extends LockableMixin(Exit) {
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

  /**
   * ⭐ A door of a holding starts BOLTED. It has been permanently locked
   * for its whole life; what the lock build adds is the ability to
   * withdraw the bolt, not a new default.
   */
  protected override boltedByDefault(): boolean {
    return true;
  }

  /**
   * ⭐⭐ The policy seam `LockableMixin` leaves open: this door's keyway
   * is NOT its own field — it is a sync read off the owning warren, so
   * the warren stays the one record of a holding's identity and
   * re-keying it re-keys every door at once.
   *
   * ⚠ `programmeRef` is set by `configureKeyedDoor` after the clone, so
   * an unconfigured door yields an empty keyway — which opens for
   * nobody, the right answer rather than a crash.
   */
  public override getLock(): Lock {
    const keyway =
      !this.programmeRef || this.programmeRef.isDestroyed()
        ? ''
        : this.programmeRef.keyway();
    return new Lock(keyway, this.lockTech);
  }

  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    // ⭐⭐ The bolt refuses, the key excuses — and the bolt is now a
    // separate fact, so a resident can `unlock` this door and leave it
    // open for a guest who holds no key. That was unexpressible while
    // the keyway was the only state.
    if (this.isLocked() && !this.opensFor(mover)) {
      return {
        ok: false,
        gate: 'door',
        reason: this.getLock().keyway
          ? "Your key doesn't fit this lock."
          : 'The door is locked.',
      };
    }
    return super.canTraverse(mover, mode);
  }
}
