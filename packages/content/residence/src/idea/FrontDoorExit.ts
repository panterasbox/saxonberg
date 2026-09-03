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
import { Lock, type LockType } from '@saxonberg/server/mud/lib/lock/Lock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

export default class FrontDoorExit extends DeferredDestinationExit {
  /** The owning institution — held as a PATH (an identity ref; the
   *  singleton is process-lifetime but a torn-down test world isn't). */
  private warrenPath: string;
  /** The holding's parcel extent — the admit key + the keyway key. */
  private holdingKey: string;
  private lockTech: LockType;

  constructor(
    source: Stuff & Container,
    warren: OuterWarren,
    holdingKey: string,
    direction: string,
    entryRowPath: string,
    opts: { lockTech?: LockType } = {},
  ) {
    super({
      direction,
      source,
      // The ENTRY ROOM'S ROW — accurate + eager (D17: a real row, so
      // the edge reads honestly before it's been walked).
      destinationTemplatePath: entryRowPath,
    });
    this.warrenPath = warren.getTemplatePath() ?? '';
    this.holdingKey = holdingKey;
    this.lockTech = opts.lockTech ?? 'pin-tumbler';
    this.setMessageOut('{{ mover }} goes in through the door.');
    this.setMessageIn('{{ mover }} comes in from outside.');
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
  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    const keyway = this.warren()?.keywayOf(this.holdingKey) ?? '';
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
