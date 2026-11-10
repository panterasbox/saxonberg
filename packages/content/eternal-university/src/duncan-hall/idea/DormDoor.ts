/**
 * DormDoor — the lazy entry passage from a floor corridor into one unit's
 * `DormRoom`. A runtime clone (one per provisioned unit on its floor),
 * created by `DormWarren.ensureUnitDoor`, its `unitKey` set at creation.
 *
 * Implemented as a `DeferredDestinationExit` — eager on its face (its
 * destination template is `DORMROOM_TEMPLATE`, so `look`/a map describe it
 * without conjuring the room), with the room faulted in on traversal via
 * `computeDestination` → `DormWarren.admit(unitKey)` (cached by the base). The
 * door in the way is NOT this exit's (boundary build, D6): the warren hangs
 * ONE door (`thing/dorm-door`, `CirculationWarren.hangEntryDoor`) whose
 * sides are this edge and the room's `out` — bolted, keyed to the unit's
 * parcel keyway (re-stamped when the warren's keyway cache rebuilds, so a
 * move-out re-key makes the old key dead metal), free from inside. A key
 * that fits passes without unlocking (`Exit.canTraverse`); a student can
 * `unlock` their door and leave it open for a friend; `open`/`close`/`lock`
 * act on the one door from either side.
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import DormWarren from './DormWarren';

export default class DormDoor extends DeferredDestinationExit {
  private unitKey = '';

  public configureUnit(unitKey: string): void {
    this.unitKey = unitKey;
  }

  public getUnitKey(): string {
    return this.unitKey;
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    const warren = await StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
    return warren.admit(this.unitKey);
  }
}
