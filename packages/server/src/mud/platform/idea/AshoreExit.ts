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
 * The craft is the Structure whose entrance this room is, looked up
 * (once, then cached) when the async gate is asked — by the room's
 * durable handle (harbors P3), so a keyed deck of a ship KIND is answered
 * by its warren, never by a row every ship of the kind shares.
 *
 * ⭐ A ship made fast at a landing (harbors P4) is ashore THERE: the berth
 * she records is read first, and the shipped reads (the landing within a
 * rope's throw on a river, the node's landing at sea) only after. Her
 * gangway's lock is read by this way as by the way aboard (P9) — `lock
 * ashore` bolts it from the deck — but leaving never refuses: this way's
 * gate never reads the bolt.
 */

import { NavigationApi } from '../../api/navigation';
import DeferredDestinationExit from '../../lib/boundary/DeferredDestinationExit';
import { LockableMixin } from '../../lib/boundary/Lockable';
import { Lock } from '../../lib/lock/Lock';
import Ship from './Ship';
import type { TraversalGuard } from '../../lib/boundary/Exit';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import { Expanse } from '../../lib/expanse/Expanse';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';

/** How near a landing a ship on a river lies to be alongside it, m. */
const ALONGSIDE_M = 60;

export default class AshoreExit extends LockableMixin(DeferredDestinationExit) {
  /** The craft's durable handle (her row for an authored ship). */
  private craftPath: string | null = null;
  /** The lookup ran (a deck with no craft is answered once, not per traverse). */
  private warmed = false;

  private async warm(): Promise<void> {
    if (this.craftPath !== null || this.warmed) return;
    this.warmed = true;
    const source = this.getSource();
    const here = source.getDurableHandle() ?? source.getTemplatePath();
    if (!here) return;
    try {
      // The ship this deck belongs to — her warren's answer for a keyed
      // room; else attached to the deck in the location graph's record,
      // from the ship's own `extent`.
      const craft = await NavigationApi.structureAt(here);
      if (craft === null) return;
      this.craftPath = craft.getDurableHandle() ?? craft.getTemplatePath();
      if (MixinApi.isVoyaging(craft)) {
        // Her frame, loaded: the sea's nodes (a landing's way ashore), or a river.
        const f = await craft.liveFrame();
        if (f instanceof Expanse) await f.nodes();
      }
    } catch {
      /* nothing to step onto, then */
    }
  }

  /** The ship, standing, when she has a gangway (a Ship). */
  private berthed(): Ship | null {
    if (this.craftPath === null) return null;
    const craft = StuffApi.findByDurableHandle<Stuff>(this.craftPath);
    return craft instanceof Ship ? craft : null;
  }

  public override isLocked(): boolean {
    return this.berthed()?.isGangwayLocked() ?? false;
  }

  public override setLocked(value: boolean): void {
    if (typeof value !== 'boolean') throw new TypeError(`AshoreExit.locked must be a boolean, got ${typeof value}`);
    this.berthed()?.setGangwayLocked(value);
  }

  public override lock(): void {
    this.setLocked(true);
  }

  public override unlock(): void {
    this.setLocked(false);
  }

  public override getLock(): Lock {
    return new Lock(this.berthed()?.getGangwayKeyway() ?? '', 'pin-tumbler');
  }

  /** The landing behind the node the craft lies at now, or `null`. */
  private landing(): string | null {
    if (this.craftPath === null) return null;
    const craft = StuffApi.findByDurableHandle<Stuff>(this.craftPath);
    if (!craft || !MixinApi.isVoyaging(craft) || craft.getCourse() !== null) return null;
    // ⭐ Made fast at a landing: ashore is THERE (harbors P4).
    const berth = this.berthed()?.getBerth() ?? null;
    if (berth !== null) return berth;
    // ⭐ On a river (D18): the landing she lies within hailing of a rope's
    // throw of, by the river's own list of what stands on its banks.
    const line = MixinApi.isPositioned(craft) ? craft.getLine() : null;
    if (line !== null && MixinApi.isPositioned(craft)) {
      const frame = StuffApi.findByTemplatePath<Stuff>(line);
      const pos = craft.getLinePosition();
      return frame && pos && MixinApi.isLineFrame(frame) ? frame.landingNear(pos, ALONGSIDE_M) : null;
    }
    const at = craft.getExpansePosition();
    const path = craft.getExpanse();
    const e = path ? StuffApi.findByTemplatePath<Stuff>(path) : null;
    if (!at || !(e instanceof Expanse)) return null;
    for (const n of e.peekNodes()) {
      const dest = n.getDestination();
      if (dest && n.isAt(at)) return dest;
    }
    return null;
  }

  /** ⭐ The far side is read HERE, at the moment of asking (the lookup is cached after the first). */
  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    await this.warm();
    if (this.landing() === null) {
      return { ok: false, gate: 'blocked', reason: 'There is nothing to step onto.' };
    }
    return super.canTraverse(mover, mode);
  }

  public override async resolveDestination(): Promise<Stuff & Container> {
    return this.computeDestination();
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    await this.warm();
    const dest = this.landing();
    if (dest === null) throw new Error('AshoreExit: there is nothing to step onto');
    return StuffApi.singleton<Stuff & Container>(dest);
  }
}
