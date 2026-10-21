/**
 * ColumnExit — ⭐ **a way up or down the water** (underwater D7).
 *
 * The column is budded on first traversal, so its ways are
 * `DeferredDestinationExit`s: the exit is in the room (`look` lists
 * `down`), and the band behind it is faulted in by the `ColumnWarren`
 * only when somebody goes. Every column exit names the surface it is
 * under and the band it leads to (`surface` for the way back up out of
 * the column).
 *
 * The one gate of its own: ⭐ **under ice, the only way up is the hole.**
 * A way up into a surface whose floor is ice with no open water in it is
 * a ceiling, refused in words.
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { ColumnBand } from '@saxonberg/server/mud/lib/location/WaterColumn';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import Band from '../../location/Band';

/** Where a column exit leads: a band, or back up to the surface. */
export type ColumnTarget = ColumnBand | 'surface';

export default class ColumnExit extends DeferredDestinationExit {
  static fieldMeta: FieldMeta = {
    surfacePath: { persistent: true },
    target: { persistent: true },
  };

  /** The surface place this column is under — an identity path. */
  public surfacePath = '';

  /** The band this way leads to — when it was last taken (see `targetNow`). */
  public target: ColumnTarget = 'lit';

  /** The band it led to when last resolved (runtime). */
  private _now: (Stuff & Container) | null = null;

  /** Name the column and the band (the `installExit` configure step). */
  public configureColumn(surfacePath: string, target: ColumnTarget): void {
    this.surfacePath = surfacePath;
    this.target = target;
  }

  public getTarget(): ColumnTarget {
    return this.target;
  }

  private surface(): (Stuff & Container) | null {
    const s = this.surfacePath ? StuffApi.findByTemplatePath<Stuff>(this.surfacePath) : null;
    return s && !s.isDestroyed() && MixinApi.isContainer(s) ? s : null;
  }

  /**
   * ⭐ Where this way leads NOW (found by the drive, run 32). A column's
   * bands are derived — the tide raises the water, a fresh read of its
   * clarity moves where the dark begins — so a way fixed when its band was
   * budded can skip a band that exists now (a bed budded before the
   * river's read landed went straight up to the lit band). Up is the band
   * above this one in the column as it is; down the band below; the
   * surface's down the first band.
   */
  private targetNow(): ColumnTarget {
    const surface = this.surface();
    if (surface === null || !MixinApi.isWaterPlace(surface)) return this.target;
    const bands = surface.bandsNow();
    const from = this.getSource() as unknown as Stuff;
    if (from === (surface as unknown as Stuff)) return bands[0] ?? this.target;
    if (!(from instanceof Band)) return this.target;
    const i = bands.indexOf(from.getBand());
    if (i < 0) return this.target;
    if (this.getDirection() === 'up') return i === 0 ? 'surface' : bands[i - 1]!;
    return bands[i + 1] ?? this.target;
  }

  /** Resolve where this way leads now — never a stale band from the bud. */
  public override async resolveDestination(): Promise<Stuff & Container> {
    this.target = this.targetNow();
    this._now = await this.computeDestination();
    return this._now;
  }

  public override getDestination(): Stuff & Container {
    if (this._now !== null && !this._now.isDestroyed()) return this._now;
    return super.getDestination();
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    const surface = this.surface() ?? (await StuffApi.singleton<Stuff & Container>(this.surfacePath));
    if (this.target === 'surface') return surface;
    const column = await StuffApi.singleton<Stuff>(TemplatePaths.waterColumn);
    const band = MixinApi.isWaterColumn(column) ? await column.bandOf(surface, this.target) : null;
    if (band === null) {
      throw new Error(`ColumnExit: ${this.surfacePath} has no ${this.target} band now`);
    }
    return band;
  }

  /**
   * ⭐ The column wires both ends as it buds; the far side is computed per
   * column from a SHARED band row, so a by-path topology check would find
   * another water's band and block this way (found by the drive, run 32).
   */
  public override wiresItsOwnInverse(): boolean {
    return true;
  }

  /**
   * ⭐ The swim between two depths takes time (underwater review): the
   * meters over this body's own vertical speed, in real seconds, breath
   * burning the whole way. Every verb that takes this way waits it out.
   */
  public override async crossingRealS(mover: Stuff): Promise<number> {
    if (!MixinApi.isRespiration(mover)) return 0;
    const dest = await this.resolveDestination();
    const fromM = BiomeApi.mediumFor(mover).depthM;
    const toM = MixinApi.isWaterPlace(dest) ? dest.mediumFor(mover).depthM : fromM;
    return mover.verticalSwimSeconds(Math.abs(toM - fromM), toM < fromM);
  }

  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    // The water's own facts first — they hold whatever stroke you use.
    const surface = this.surface();
    if (this.target === 'surface') {
      // ⭐ Under ice the only way up is the hole.
      const floor = surface !== null && MixinApi.isAdornable(surface) ? surface.getFloor() : null;
      if (floor !== null && MixinApi.isFloor(floor) && floor.supportIsSlotted() &&
          !(floor.openWaterAreaM2() > 0)) {
        return {
          ok: false,
          gate: 'blocked',
          reason: 'The ice is a ceiling over you; the only way up is the hole.',
        };
      }
    }
    // ⭐ Weight is the only thing that refuses the way up — never skill.
    if (this.getDirection() === 'up' && MixinApi.isContainable(mover)) {
      const here = mover.getContainer();
      if (here !== null && MixinApi.isWaterPlace(here)) {
        const rise = here.canRise(mover);
        if (!rise.ok) return { ok: false, gate: 'blocked', reason: rise.reason };
      }
    }
    if (this.target !== 'surface' && surface !== null && MixinApi.isWaterPlace(surface) &&
        !surface.bandsNow().includes(this.target)) {
      // The water may have gone down since the way was made (the tide).
      return { ok: false, gate: 'blocked', reason: 'There is no deeper water that way now.' };
    }
    return super.canTraverse(mover, mode);
  }
}
