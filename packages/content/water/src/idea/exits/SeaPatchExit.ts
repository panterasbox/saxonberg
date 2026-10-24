/**
 * SeaPatchExit — ⭐ **a way between a ship stopped at sea and the water
 * beside her, worked out when it is taken** (river D30).
 *
 * Two ways: `side`, from her deck into the water beside her (refused while
 * she is under way — swimmers at sea exist only where a ship has stopped);
 * and `deck`, from the water up onto the deck of a ship still lying here
 * (refused, in words, when she has sailed). The sea's warren decides both;
 * the exit decides nothing.
 *
 * ⭐ Never on a map: a way that is there only while she lies here is not a
 * fact about any place.
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type SeaWarren from '../SeaWarren';

/** Which way a sea patch exit goes. */
export type SeaWay = 'side' | 'deck';

const WARREN_PATH = '/system/water/idea/SeaWarren';

export default class SeaPatchExit extends DeferredDestinationExit {
  static fieldMeta: FieldMeta = {
    way: { persistent: true, authorable: true },
    target: { persistent: true },
  };

  /** Which way. */
  public way: SeaWay = 'side';

  /** For `deck`: the deck's row path. */
  public target = '';

  public configureSea(way: SeaWay, target = ''): void {
    this.way = way;
    this.target = target;
  }

  public getWay(): SeaWay {
    return this.way;
  }

  public getTarget(): string {
    return this.target;
  }

  private warren(): Promise<SeaWarren> {
    return StuffApi.singleton<SeaWarren>(WARREN_PATH);
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    return (await this.warren()).destinationFor(this);
  }

  /** ⭐ Worked out fresh every time: she may have sailed since. */
  public override async resolveDestination(): Promise<Stuff & Container> {
    const dest = await this.computeDestination();
    this._resolved = dest;
    return dest;
  }

  public override async canTraverse(mover: Stuff & Containable, mode?: string): Promise<TraversalGuard> {
    const refusal = await (await this.warren()).refusalFor(this);
    if (refusal !== null) return { ok: false, gate: 'blocked', reason: refusal };
    try {
      await this.resolveDestination();
    } catch (err) {
      return { ok: false, gate: 'blocked', reason: err instanceof Error ? err.message : 'There is no way there now.' };
    }
    return super.canTraverse(mover, mode);
  }

  /** The far side as last worked out; never throws (as a reach way). */
  public override getDestination(): Stuff & Container {
    if (this._resolved !== null && !this._resolved.isDestroyed()) return this._resolved;
    return this.getSource() as unknown as Stuff & Container;
  }

  /** The last place this way was worked out to (runtime). */
  private _resolved: (Stuff & Container) | null = null;

  /** The sea's warren wires both ends; never checked by path. */
  public override wiresItsOwnInverse(): boolean {
    return true;
  }

  /** ⭐ Never on a map. */
  public override isMapped(): boolean {
    return false;
  }

  /** Over the side is into the water; up onto a deck is out of it. */
  public override leadsIntoWater(): boolean {
    return this.way === 'side';
  }
}
