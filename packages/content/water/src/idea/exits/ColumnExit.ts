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

/** Where a column exit leads: a band, or back up to the surface. */
export type ColumnTarget = ColumnBand | 'surface';

export default class ColumnExit extends DeferredDestinationExit {
  static fieldMeta: FieldMeta = {
    surfacePath: { persistent: true },
    target: { persistent: true },
  };

  /** The surface place this column is under — an identity path. */
  public surfacePath = '';

  /** The band this way leads to. */
  public target: ColumnTarget = 'lit';

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
