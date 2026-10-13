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

import DeferredDestinationExit from '../../lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '../../lib/boundary/Exit';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import { Expanse } from '../../lib/expanse/Expanse';
import type { GeoPosition } from '../../lib/expanse/GeoPosition';
import { TemplatePaths } from '../../lib/paths';
import type StructureCatalogue from './StructureCatalogue';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import Structure from './Structure';

interface NodeAt {
  expanse: string;
  at: GeoPosition;
}

export default class AboardExit extends DeferredDestinationExit {
  private node: NodeAt | null = null;
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
      const cat = await StuffApi.singleton<StructureCatalogue>(TemplatePaths.structureCatalogue);
      const sea = (await cat.structureOf(berth))?.expanse ?? null;
      const e = sea ? await StuffApi.singleton<Stuff>(sea) : null;
      if (!(e instanceof Expanse)) return;
      for (const n of await e.nodes()) {
        const at = n.getExpansePosition();
        if (n.getDestination() !== here || at === null) continue;
        this.node = { expanse: sea!, at };
        await e.bands();
        return;
      }
    } catch {
      /* nothing alongside, then — and the next traverse does not ask again */
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
      if (!(c instanceof Structure) || c.getEntrance() === null || c.getDeckHeightM() === null) continue;
      const at = c.getExpansePosition();
      if (!at || c.getCourse() !== null) continue;
      if (at.distanceNm(this.node.at) <= within) return c;
    }
    return null;
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
