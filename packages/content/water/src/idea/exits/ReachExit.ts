/**
 * ReachExit — ⭐ **a way out of moving water, worked out when you take
 * it** (river D7).
 *
 * The water around you on a river moves, so none of its ways can be fixed
 * when the room is made: `left` and `right` are whatever bank is beside
 * you when you get there; `downstream` and `upstream` are the water a
 * stroke away; a branch at a junction is the other river; a quay or a bar
 * is there only while it is within hail. Every reach exit asks the river's
 * warren — where it leads, how long the swim takes, and whether the water
 * lets you — at the moment you take it. The exit itself decides nothing.
 *
 * ⭐ Never on a map (river D38 d): a way that comes and goes with the water
 * is not a fact about any place.
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type ReachWarren from '../ReachWarren';

/** Which way a reach exit goes. */
export type ReachWay =
  | 'left' | 'right' | 'upstream' | 'downstream' | 'branch' | 'place' | 'down' | 'enter' | 'patch'
  /** Along a bank on foot (D25). */
  | 'walk-up' | 'walk-down';

const WARREN_PATH = '/system/water/idea/ReachWarren';

export default class ReachExit extends DeferredDestinationExit {
  static fieldMeta: FieldMeta = {
    way: { persistent: true },
    target: { persistent: true },
  };

  /** Which way. */
  public way: ReachWay = 'downstream';

  /** A branch's course key, or a place's template path. */
  public target = '';

  /** Name the way (the `installExit` configure step). */
  public configureReach(way: ReachWay, target = ''): void {
    this.way = way;
    this.target = target;
  }

  /**
   * A bank's way to ONE patch passing within hail: its far side is that
   * patch, known now (so the throw, the haul and the eye find it), and the
   * river unwires it when the patch drifts out of hail.
   */
  public pinTo(dest: Stuff & Container): void {
    this._resolved = dest;
  }

  public getWay(): ReachWay {
    return this.way;
  }

  public getTarget(): string {
    return this.target;
  }

  private warren(): Promise<ReachWarren> {
    return StuffApi.singleton<ReachWarren>(WARREN_PATH);
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    return (await this.warren()).destinationFor(this);
  }

  /** ⭐ Worked out fresh every time: the water has moved since. */
  public override async resolveDestination(): Promise<Stuff & Container> {
    const dest = await this.computeDestination();
    this._resolved = dest;
    return dest;
  }

  /**
   * The far side as last worked out. ⚠ Never throws: a crossing refused
   * before it was worked out (a wall of roots) is still asked in its
   * `finally` where it led — and the honest answer is "nowhere yet", the
   * water you are in.
   */
  public override getDestination(): Stuff & Container {
    if (this._resolved !== null && !this._resolved.isDestroyed()) return this._resolved;
    return this.getSource() as unknown as Stuff & Container;
  }

  /** The last place this way was worked out to (runtime). */
  private _resolved: (Stuff & Container) | null = null;

  /** The swim takes as long as the water says, in real seconds. */
  public override async crossingRealS(mover: Stuff): Promise<number> {
    return (await this.warren()).crossingSecondsFor(this, mover);
  }

  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    const refusal = await (await this.warren()).refusalFor(this, mover);
    if (refusal !== null) return { ok: false, gate: 'blocked', reason: refusal };
    // ⭐ Worked out HERE, where the crossing asks (at its start and again at
    // arrival), so whatever reads the far side synchronously afterwards
    // reads the water as it is now.
    try {
      await this.resolveDestination();
    } catch (err) {
      return { ok: false, gate: 'blocked', reason: (err as Error).message };
    }
    return super.canTraverse(mover, mode);
  }

  /** The water wires both ends as it moves; never checked by path. */
  public override wiresItsOwnInverse(): boolean {
    return true;
  }

  /** A way that comes and goes with the water is never written down. */
  public override isMapped(): boolean {
    return false;
  }

  /** ⭐ A bank's way in (and a branch, a stroke): into the river, wherever it is now. */
  public override leadsIntoWater(): boolean {
    return this.way !== 'place' && this.way !== 'walk-up' && this.way !== 'walk-down';
  }

  /** A pinned way says where it goes; the others go into the river. */
  public override hasSpatialDestination(): boolean {
    return this.way === 'patch' || this.way === 'place';
  }
}
