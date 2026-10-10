/**
 * AshoreExit — the way off a craft onto whatever it is lying at (maritime
 * D19).
 *
 * Placed on a craft's entrance room (the deck). Its far side is the
 * content behind the node the craft is at NOW — so it recomputes on every
 * traverse, and between nodes (or at a node with nothing behind it) it
 * refuses in words: *there is nothing to step onto.* You leave a craft
 * only at a node; between nodes you move only between craft.
 *
 * The craft is the Structure whose entrance this room is, looked up in
 * `prepareTraversal`, so the traverse gate stays synchronous.
 */

import DeferredDestinationExit from '../../lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '../../lib/boundary/Exit';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import { Expanse } from '../../lib/expanse/Expanse';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { TemplatePaths } from '../../lib/paths';
import type StructureCatalogue from './StructureCatalogue';

export default class AshoreExit extends DeferredDestinationExit {
  private craftPath: string | null = null;

  /** The lookup the sync gate answers from (cached after the first). */
  public override async prepareTraversal(): Promise<void> {
    await this.warm();
  }

  private async warm(): Promise<void> {
    if (this.craftPath !== null) return;
    const here = this.getSource().getTemplatePath();
    if (!here) return;
    try {
      const cat = await StuffApi.singleton<StructureCatalogue>(TemplatePaths.structureCatalogue);
      const row = await cat.structureOf(here);
      if (row === null) return;
      this.craftPath = row.path;
      const craft = await StuffApi.singleton<Stuff>(row.path);
      if (MixinApi.isVoyaging(craft)) {
        const e = await craft.liveExpanse();
        if (e) await e.nodes();
      }
    } catch {
      /* nothing to step onto, then */
    }
  }

  /** The landing behind the node the craft lies at now, or `null`. */
  private landing(): string | null {
    if (this.craftPath === null) return null;
    const craft = StuffApi.findByTemplatePath<Stuff>(this.craftPath);
    if (!craft || !MixinApi.isVoyaging(craft) || craft.getCourse() !== null) return null;
    const at = craft.getExpansePosition();
    const path = craft.getExpanse();
    const e = path ? StuffApi.findByTemplatePath<Stuff>(path) : null;
    if (!at || !(e instanceof Expanse)) return null;
    const within = Number(AppApi.setting('expanse.arrivalNm')) || 1;
    for (const n of e.peekNodes()) {
      const p = n.getExpansePosition();
      const dest = n.getDestination();
      if (p && dest && p.distanceNm(at) <= within) return dest;
    }
    return null;
  }

  public override canTraverse(mover: Stuff & Containable, mode?: string): TraversalGuard {
    if (this.landing() === null) {
      return { ok: false, gate: 'blocked', reason: 'There is nothing to step onto.' };
    }
    return super.canTraverse(mover, mode);
  }

  public override async resolveDestination(): Promise<Stuff & Container> {
    return this.computeDestination();
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    const dest = this.landing();
    if (dest === null) throw new Error('AshoreExit: there is nothing to step onto');
    return StuffApi.singleton<Stuff & Container>(dest);
  }
}
