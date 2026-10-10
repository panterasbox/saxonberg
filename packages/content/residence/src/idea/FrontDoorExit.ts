/**
 * FrontDoorExit — **the generic locked front door** into a holding
 * (residences D16/P6): a `DeferredDestinationExit` hung by the
 * INSTITUTION (a corridor's unit door, a house door off the yard),
 * eager on its face — its destination template is the entry room's
 * REAL row (D17: an accurate class template, describable with zero
 * materialization) — with the holding faulted in on traversal via the
 * institution's `admit(key)` (programme wake → entry room).
 *
 * The key gate is the dorm-door model, generalized: `canTraverse`
 * checks the holding's keyway **synchronously** off the institution's
 * cache (refreshed from the durable parcel keyway) and admits whoever
 * presents a matching key — bearer possession, never identity. An
 * empty keyway admits no one.
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import { type TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import { LockableMixin } from '@saxonberg/server/mud/lib/boundary/Lockable';
import { Lock, type LockType } from '@saxonberg/server/mud/lib/lock/Lock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

export default class FrontDoorExit extends LockableMixin(DeferredDestinationExit) {
  /** The owning institution — held as a PATH (an identity ref; the
   *  singleton is process-lifetime but a torn-down test world isn't). */
  private warrenPath = '';
  /** The holding's parcel extent — the admit key + the keyway key. */
  private holdingKey = '';
  private lockTech: LockType = 'pin-tumbler';

  /**
   * ⭐ What the constructor used to take, as a set-once step. The prose
   * moved to the ROW (`/system/residence/idea/exits/front-door`) — it
   * was two `setMessage*` calls in TypeScript, which is exactly the
   * thing an author could never edit.
   */
  public configureFrontDoor(
    warren: OuterWarren,
    holdingKey: string,
    opts: { lockTech?: LockType } = {},
  ): void {
    this.warrenPath = warren.getTemplatePath() ?? '';
    this.holdingKey = holdingKey;
    this.lockTech = opts.lockTech ?? 'pin-tumbler';
  }

  public getHoldingKey(): string {
    return this.holdingKey;
  }

  private warren(): OuterWarren | null {
    return (
      StuffApi.findByTemplatePath<OuterWarren>(this.warrenPath) ?? null
    );
  }

  /** Materialize (or re-materialize) the holding; land in its entry. */
  protected override async computeDestination(): Promise<Stuff & Container> {
    const warren = this.warren();
    if (!warren) {
      throw new Error(
        `FrontDoorExit: institution '${this.warrenPath}' is not registered`,
      );
    }
    return warren.admit(this.holdingKey);
  }

  /**
   * The key gate: sync keyway off the institution's cache; presents-a-
   * matching-key admits (a master key passes the same way); an empty
   * keyway is locked to everyone.
   */
  /** ⭐ An institution's front door starts BOLTED — as it always was. */
  protected override boltedByDefault(): boolean {
    return true;
  }

  /**
   * ⭐⭐ `LockableMixin`'s policy seam: the keyway is the institution's,
   * not this door's own field, so re-keying a holding re-keys its door.
   */
  public override getLock(): Lock {
    return new Lock(
      this.warren()?.keywayOf(this.holdingKey) ?? '',
      this.lockTech,
    );
  }

  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    // ⭐⭐ The bolt refuses, the key excuses; the bolt is a separate fact
    // now, so a holder can leave their own front door open.
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
