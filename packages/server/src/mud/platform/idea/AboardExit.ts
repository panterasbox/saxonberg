/**
 * AboardExit — the way aboard whatever craft is alongside (maritime D19).
 *
 * Placed on a node's landing room. Its far side is whichever craft is
 * lying at that node NOW — so it is a `DeferredDestinationExit` that
 * recomputes on every traverse, and with nothing alongside it refuses in
 * words (*nothing is alongside*) rather than taking you to a ship that
 * has sailed. The authored destination is only the usual berth-holder.
 *
 * The node is found through the usual berth: the berth names the ship
 * whose deck it is, she names her sea, and that sea's own nodes say which
 * one lands here. Derived on EVERY ask from what is standing (paint
 * review) — a landing reads it synchronously, and a traverse stands up
 * what it reads first; nothing is cached, so a miss is never permanent.
 * Never a full-table query. The berth (owned, rented, fought
 * over) is not modelled.
 */

import { NavigationApi } from '../../api/navigation';
import DeferredDestinationExit from '../../lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '../../lib/boundary/Exit';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import { Expanse } from '../../lib/expanse/Expanse';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import Ship from './Ship';

/** How near a landing a ship on a river lies to be alongside it, m. */
const ALONGSIDE_M = 60;

export default class AboardExit extends DeferredDestinationExit {
  /**
   * Stand up what the derivation reads, following the authored refs (load
   * on use, never a search): the ship at the berth, her river's line or her
   * sea's nodes. Nothing is cached here — a miss is asked again next time.
   */
  private async standUp(): Promise<void> {
    const berth = this.getDestinationTemplatePath();
    if (!berth) return;
    try {
      const ship = await NavigationApi.structureAt(berth);
      if (!(ship instanceof Ship)) return;
      if (ship.getLine() !== null) {
        await ship.liveFrame();
        return;
      }
      const sea = ship.getExpanse();
      const e = sea ? await StuffApi.singleton<Stuff>(sea) : null;
      if (e instanceof Expanse) await e.nodes();
    } catch {
      /* nothing alongside, then — and the next ask tries again */
    }
  }

  /**
   * ⭐ The ship alongside NOW, or `null` when nothing is (paint review):
   * never the authored berth — a ship that has sailed lands nowhere. An
   * `AboardExit`'s far side is whatever lies alongside, so it never answers
   * `undefined` (that is an ordinary exit's: *my far side is my path*).
   */
  public override alongsideNow(): Ship | null {
    return this.alongside();
  }

  /**
   * The craft lying at this landing now — derived from where she IS, over
   * what is standing: on a river, lying (not under way) within a rope's
   * throw of this landing; at sea, lying inside the radius of the node of
   * her sea that lands here. Nothing loaded yet answers `null`, never a
   * guess.
   */
  private alongside(): Ship | null {
    const here = this.getSource().getTemplatePath();
    const berth = this.getDestinationTemplatePath();
    if (!here || !berth) return null;
    const usual = NavigationApi.structureAtNow(berth);
    if (!(usual instanceof Ship)) return null;
    if (usual.getLine() !== null) return this.alongsideOnRiver(usual, here);
    const sea = usual.getExpanse();
    const e = sea ? StuffApi.findByTemplatePath<Stuff>(sea) : null;
    if (!(e instanceof Expanse)) return null;
    const node = e.peekNodes().find((n) => n.getDestination() === here && n.getExpansePosition() !== null);
    if (node === undefined) return null;
    // Any ship of her sea — the usual berth-holder or another.
    for (const c of new Set<Stuff>([usual, ...e.craft()])) {
      // Only a SHIP has a deck to step onto; a boat is boarded by `enter`.
      if (!(c instanceof Ship) || c.getEntrance() === null || c.getCourse() !== null) continue;
      const at = c.getExpansePosition();
      // ⭐ Alongside = inside the node's radius, the same test as arriving.
      if (at && node.isAt(at)) return c;
    }
    return null;
  }

  /** A river ship is alongside when she lies, not under way, within a rope's throw of this landing. */
  private alongsideOnRiver(ship: Ship, here: string): Ship | null {
    if (ship.getCourse() !== null || ship.getEntrance() === null) return null;
    const line = ship.getLine();
    const pos = ship.getLinePosition();
    const frame = line ? StuffApi.findByTemplatePath<Stuff>(line) : null;
    if (!frame || !pos || !MixinApi.isLineFrame(frame)) return null;
    return frame.landingNear(pos, ALONGSIDE_M) === here ? ship : null;
  }

  /** ⭐ The far side is read HERE, at the moment of asking (the lookup is cached after the first). */
  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    await this.standUp();
    if (this.alongside() === null) {
      return { ok: false, gate: 'blocked', reason: 'Nothing is alongside.' };
    }
    return super.canTraverse(mover, mode);
  }

  /** Recompute every time — the far side is whatever lies alongside now. */
  public override async resolveDestination(): Promise<Stuff & Container> {
    return this.computeDestination();
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    await this.standUp();
    const craft = this.alongside();
    const entrance = craft?.getEntrance();
    if (!entrance) throw new Error('AboardExit: nothing is alongside');
    return StuffApi.singleton<Stuff & Container>(entrance);
  }
}
