/**
 * FrontDoorExit — **the way in to a holding** (residences D16/P6): a
 * `DeferredDestinationExit` hung by the INSTITUTION (a corridor's unit
 * door, a house door off the yard), eager on its face — its destination
 * template is the entry room's REAL row (D17: an accurate class template,
 * describable with zero materialization) — with the holding faulted in on
 * traversal via the institution's `admit(key)` (programme wake → entry
 * room).
 *
 * ⭐ The LOCK is not this exit's any more (boundary build, D6): the
 * institution hangs ONE door in the way (`CirculationWarren.hangEntryDoor`)
 * — this exit is its outside, the entry room's way out its inside — keyed
 * to the holding and free from inside. `Exit.canTraverse` reads that door;
 * a key-holder passes, anybody else meets *the door is locked*.
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { CirculationWarren } from '@saxonberg/server/mud/lib/location/CirculationWarren';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';

export default class FrontDoorExit extends DeferredDestinationExit {
  private warrenPath = '';
  private holdingKey = '';

  public configureFrontDoor(warren: CirculationWarren, holdingKey: string): void {
    this.warrenPath = warren.getTemplatePath() ?? '';
    this.holdingKey = holdingKey;
  }

  public getHoldingKey(): string {
    return this.holdingKey;
  }

  private warren(): CirculationWarren | null {
    return (
      StuffApi.findByTemplatePath<CirculationWarren>(this.warrenPath) ?? null
    );
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    const warren = this.warren();
    if (!warren) {
      throw new Error(
        `FrontDoorExit: institution '${this.warrenPath}' is not registered`,
      );
    }
    return warren.admit(this.holdingKey);
  }
}
