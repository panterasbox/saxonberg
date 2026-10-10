/**
 * Gunwale — the deck's edge: a shore that MOVES with its craft (maritime
 * D7).
 *
 * ⭐ Nothing is minted when a craft stops in open water. The deck is a
 * shore that goes where the ship goes, and the water it cites is wherever
 * the ship is: `getReachRef()` answers `"<expanse>@<lat>,<lon>"`, quantized
 * to a 0.1° cell, so the same spot depletes and re-entering gains nothing.
 * `fish` reaches it through its shipped `reachable:[class.Shore]` default
 * — a gunwale IS a shore — and the fishing pack never parses the ref; the
 * fishery register learns the `@` grammar instead.
 *
 * It reads the sea, not a river: the sea state at the craft's position,
 * the band's own character, what lives there. You are never IN the water;
 * you are on the deck looking over the side.
 *
 * ⛔ Never `Swimmable`: a deck is not a pool.
 */

import Shore from './Shore';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Positioned } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type StructureCatalogue from '@saxonberg/server/mud/platform/idea/StructureCatalogue';
import WaterExpanse from '../idea/WaterExpanse';
import { FISHERY_REGISTRY_PATH } from '../idea/FisheryRegistry';
import type FisheryRegistry from '../idea/FisheryRegistry';

export default class Gunwale extends Shore {
  /** The Structure this deck belongs to (resolved on the first read). */
  private craftPath: string | null = null;

  /**
   * ⭐ The water under the craft now, as a citation — or `''` before the
   * craft is known or when it is nowhere on an expanse.
   */
  public override getReachRef(): string {
    const craft = this.craft();
    const at = craft?.getExpansePosition() ?? null;
    const expanse = craft?.getExpanse() ?? null;
    if (!at || !expanse) return '';
    return `${expanse}@${at.latDeg.toFixed(1)},${at.lonDeg.toFixed(1)}`;
  }

  /** Re-read whenever the craft has moved into another cell. */
  public override waterRead() {
    const ref = this.getReachRef();
    if (this._memo !== null && this._memo.ref !== ref) void this.refresh(true);
    return super.waterRead();
  }

  protected override async readWater(nowS: number): Promise<void> {
    await this.resolveCraft();
    const ref = this.getReachRef();
    const craft = this.craft();
    const at = craft?.getExpansePosition() ?? null;
    const path = craft?.getExpanse() ?? null;
    const sea = path ? await StuffApi.singleton<Stuff>(path).catch(() => null) : null;
    if (!ref || !at || !(sea instanceof WaterExpanse)) {
      this._memo = { reach: null, standing: null, disciplineKey: null, atS: nowS, lines: [], ref };
      return;
    }
    const room = this.getContainer();
    const lines = [await sea.readAt(at, room)];
    const registry = (await StuffApi.singleton<Stuff>(FISHERY_REGISTRY_PATH)) as unknown as FisheryRegistry;
    const standing = await registry.standingAt(ref, nowS).catch(() => null);
    this._memo = {
      reach: null,
      standing,
      disciplineKey: await this.disciplineKeyNow(),
      atS: nowS,
      lines,
      ref,
    };
  }

  private craft(): (Stuff & Positioned) | null {
    if (this.craftPath === null) return null;
    const c = StuffApi.findByTemplatePath<Stuff>(this.craftPath);
    return c && MixinApi.isPositioned(c) ? c : null;
  }

  private async resolveCraft(): Promise<void> {
    if (this.craftPath !== null) return;
    const room = this.getContainer()?.getTemplatePath();
    if (!room) return;
    const cat = await StuffApi.singleton<StructureCatalogue>(TemplatePaths.structureCatalogue);
    const row = await cat.structureOf(room);
    if (row === null) return;
    this.craftPath = row.path;
    await StuffApi.singleton<Stuff>(row.path);
  }
}

