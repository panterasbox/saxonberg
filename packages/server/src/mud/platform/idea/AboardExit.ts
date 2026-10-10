/**
 * AboardExit — the way aboard whatever craft is alongside (maritime D19).
 *
 * Placed on a node's landing room. Its far side is whichever craft is
 * lying at that node NOW — so it is a `DeferredDestinationExit` that
 * recomputes on every traverse, and with nothing alongside it refuses in
 * words (*nothing is alongside*) rather than taking you to a ship that
 * has sailed. The authored destination is only the usual berth-holder.
 *
 * The node is found by the landing it names (an `ExpanseNode` row whose
 * `destination` is this room), looked up in `prepareTraversal`, so the
 * traverse gate stays synchronous. The berth (owned, rented, fought
 * over) is not modelled.
 */

import DeferredDestinationExit from '../../lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '../../lib/boundary/Exit';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import { Template } from '../../lib/stuff/Template';
import { Expanse } from '../../lib/expanse/Expanse';
import { GeoPosition, type GeoPositionRecord } from '../../lib/expanse/GeoPosition';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import Structure from './Structure';

interface NodeAt {
  expanse: string;
  at: GeoPosition;
}

export default class AboardExit extends DeferredDestinationExit {
  private node: NodeAt | null = null;

  /** The lookup the sync gate answers from (cached after the first). */
  public override async prepareTraversal(): Promise<void> {
    await this.warm();
  }

  /** Find the node whose landing this room is. */
  private async warm(): Promise<void> {
    if (this.node !== null) return;
    const here = this.getSource().getTemplatePath();
    if (!here) return;
    for (const tpl of await Template.findWhereDataHas('destination')) {
      const d = (tpl.data ?? {}) as Record<string, unknown>;
      if (d.destination !== here || (d.kind !== 'place' && d.kind !== 'passage')) continue;
      const pos = d.expansePosition as GeoPositionRecord | undefined;
      if (!pos) continue;
      this.node = {
        expanse: tpl.path.slice(0, tpl.path.lastIndexOf('/')),
        at: new GeoPosition(pos),
      };
      try {
        const e = await StuffApi.singleton<Stuff>(this.node.expanse);
        if (e instanceof Expanse) await e.bands();
      } catch {
        /* nothing alongside, then */
      }
      return;
    }
  }

  /** The craft lying at this exit's node now, if any. */
  private alongside(): Structure | null {
    if (this.node === null) return null;
    const e = StuffApi.findByTemplatePath<Stuff>(this.node.expanse);
    if (!(e instanceof Expanse)) return null;
    const within = Number(AppApi.setting('expanse.arrivalNm')) || 1;
    for (const c of e.craft()) {
      // Only a Structure has a deck to step onto; a boat is boarded by
      // `enter`, as any vessel is.
      if (!(c instanceof Structure) || c.getEntrance() === null) continue;
      const at = c.getExpansePosition();
      if (!at || c.getCourse() !== null) continue;
      if (at.distanceNm(this.node.at) <= within) return c;
    }
    return null;
  }

  public override canTraverse(mover: Stuff & Containable, mode?: string): TraversalGuard {
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
    const craft = this.alongside();
    const entrance = craft?.getEntrance();
    if (!entrance) throw new Error('AboardExit: nothing is alongside');
    return StuffApi.singleton<Stuff & Container>(entrance);
  }
}
