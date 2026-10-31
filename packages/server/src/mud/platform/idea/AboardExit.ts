/**
 * AboardExit — the way aboard whatever craft is alongside (maritime D19).
 *
 * Placed on a node's landing room. Its far side is whichever craft is
 * lying at that node NOW — so it is a `DeferredDestinationExit` that
 * recomputes on every traverse, and with nothing alongside it refuses in
 * words (*nothing is alongside*) rather than taking you to a ship that
 * has sailed. The authored destination is only the usual berth-holder.
 *
 * The node is found through the usual berth: the catalogue names the
 * ship whose deck it is, she names her sea, and that sea's own nodes say
 * which one lands here — looked up once, when the gate is first asked
 * (`canTraverse` is async). Never a full-table query. The berth (owned, rented, fought
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
import type ExpanseNode from './ExpanseNode';
import Ship from './Ship';

interface NodeAt {
  expanse: string;
  node: ExpanseNode;
}

/** How near a landing a ship on a river lies to be alongside it, m. */
const ALONGSIDE_M = 60;

export default class AboardExit extends DeferredDestinationExit {
  private node: NodeAt | null = null;
  /** ⭐ The ship whose berth this is, when she works a river (D18). */
  private riverShip: string | null = null;
  /** The lookup ran (a landing with no node is answered once, not per traverse). */
  private warmed = false;

  /** Find the node whose landing this room is. */
  private async warm(): Promise<void> {
    if (this.node !== null || this.warmed) return;
    this.warmed = true;
    const here = this.getSource().getTemplatePath();
    // ⭐ Scoped, never a full-table query (maritime review, 2026-10-13):
    // the authored destination is the usual berth (a ship's deck); the
    // structure catalogue says whose deck, the ship names her sea, and the
    // sea's OWN nodes say which one lands here.
    const berth = this.getDestinationTemplatePath();
    if (!here || !berth) return;
    try {
      // The ship lying at the berth — attached to it in the location
      // graph's record (from the ship's own `extent`), following the exit's
      // authored destination, never a catalogue of every structure.
      const ship = await NavigationApi.structureAt(berth);
      if (ship && MixinApi.isPositioned(ship) && ship.getLine() !== null) {
        this.riverShip = ship.getTemplatePath();
        if (MixinApi.isVoyaging(ship)) await ship.liveFrame();
        return;
      }
      const sea = ship && MixinApi.isPositioned(ship) ? ship.getExpanse() : null;
      const e = sea ? await StuffApi.singleton<Stuff>(sea) : null;
      if (!(e instanceof Expanse)) return;
      for (const n of await e.nodes()) {
        if (n.getDestination() !== here || n.getExpansePosition() === null) continue;
        this.node = { expanse: sea!, node: n };
        await e.bands();
        return;
      }
    } catch {
      /* nothing alongside, then — and the next traverse does not ask again */
    }
  }

  /** ⭐ The ship alongside NOW — what a landing reads (never the authored berth: a ship that has sailed lands nowhere). */
  public override alongsideNow(): Ship | null {
    return this.alongside();
  }

  public override async lyingAlongside(): Promise<Ship | null> {
    await this.warm();
    return this.alongside();
  }

  /** The craft lying at this exit's node now, if any. */
  private alongside(): Ship | null {
    if (this.riverShip !== null) return this.alongsideOnRiver(this.riverShip);
    if (this.node === null) return null;
    const e = StuffApi.findByTemplatePath<Stuff>(this.node.expanse);
    if (!(e instanceof Expanse)) return null;
    for (const c of e.craft()) {
      // Only a SHIP has a deck to step onto; a boat is boarded by `enter`,
      // as any vessel is.
      if (!(c instanceof Ship) || c.getEntrance() === null) continue;
      const at = c.getExpansePosition();
      if (!at || c.getCourse() !== null) continue;
      // ⭐ Alongside = inside the node's radius, the same test as arriving.
      if (this.node.node.isAt(at)) return c;
    }
    return null;
  }

  /** A river ship is alongside when she lies, not under way, within a rope's throw of this landing. */
  private alongsideOnRiver(path: string): Ship | null {
    const ship = StuffApi.findByTemplatePath<Stuff>(path);
    if (!(ship instanceof Ship) || ship.getCourse() !== null || ship.getEntrance() === null) return null;
    const line = ship.getLine();
    const pos = ship.getLinePosition();
    const frame = line ? StuffApi.findByTemplatePath<Stuff>(line) : null;
    if (!frame || !pos || !MixinApi.isLineFrame(frame)) return null;
    return frame.landingNear(pos, ALONGSIDE_M) === this.getSource().getTemplatePath() ? ship : null;
  }

  /** ⭐ The far side is read HERE, at the moment of asking (the lookup is cached after the first). */
  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    await this.warm();
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
    await this.warm();
    const craft = this.alongside();
    const entrance = craft?.getEntrance();
    if (!entrance) throw new Error('AboardExit: nothing is alongside');
    return StuffApi.singleton<Stuff & Container>(entrance);
  }
}
