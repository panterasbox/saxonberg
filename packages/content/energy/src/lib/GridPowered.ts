/**
 * GridPoweredMixin — ⭐⭐ **this thing works only while its premises' meter is
 * live.**
 *
 * A consuming device that draws grid power and does not care how the grid is
 * laid out: a residential lamp now, the cold-chain fridge later. It resolves
 * its premises' meter LAZILY on the first read — the covering parcel's power
 * band and feeder node (`ParcelApi.powerOf`) — and thereafter answers
 * `isPowered()` synchronously: the band is connected, and the feeder node is
 * energized right now (`GridCatalogue.energizedAtSync`). A cut upstream, a dead
 * source, or an off-grid premises all read as unpowered the same second.
 *
 * ⚠⚠ **The meter is resolved on first READ, never at `onCreate`.** At boot,
 * a light's containment and the parcel registry's feeder citation are not both
 * settled when its `onCreate` runs, so resolving there cached `off-grid` /
 * `null` and the lamp stayed dark forever while `analyze grid` (which reads the
 * parcel FRESH) reported the same premises live. Found by the live browser
 * drive. Reads happen post-boot, when both are settled, so lazy is correct; the
 * authored feeder citation never changes at runtime, so caching it after the
 * first read is safe — only energization (the cut) is read live each call.
 *
 * ## ⚠ Composed only by things that DRAW
 *
 * On `ElectricLight` (and the later fridge), never on `Thing` / `LightSource` /
 * `Switchable` / `BurnerMixin` — any of those would claim the hearth, the
 * lantern and the glowcap draw from a wire. Composing this IS the claim "I run
 * off the grid", so nothing needs a guard to re-narrow the host set (the
 * base-class-narrowing house style).
 *
 * ## Where it lives
 *
 * `/system/energy/lib/` — a pack's own substrate, inherited and never instanced.
 * A third pack wanting grid-powered devices without depending on energy is the
 * signal to promote it (a review question, not a lint).
 *
 * See [docs/subsystems/energy.md].
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { PowerBand } from '@saxonberg/server/mud/lib/parcel/PowerBand';
import GridCatalogue, { GRID_CATALOGUE_PATH } from '../idea/GridCatalogue';

/** The mixin marker — a pack cannot add to the kernel `Mixins` registry. */
export const GRID_POWERED_MIXIN = 'GridPoweredMixin';

/** Watts a band draws, from the dial the pack seeds — a consumer's ceiling. */
function bandWatts(band: PowerBand): number {
  const key =
    band === 'industrial'
      ? AppSettingKeys.energyBandIndustrialW
      : band === 'commercial'
        ? AppSettingKeys.energyBandCommercialW
        : AppSettingKeys.energyBandDomesticW;
  try {
    const raw = Number(AppApi.setting(key));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

/** Public shape provided by GridPoweredMixin. */
export interface GridPowered {
  /** Is this thing's premises' meter live right now? */
  isPowered(): boolean;
  /** The band's ceiling in watts while powered, else 0 — the `analyze power` duck. */
  availablePowerW(): number;
  /** The feeder node metering this thing, or `null` (off-grid / no line). */
  powerNodeRef(): string | null;
  /** The declared band of the covering premises. */
  powerBandOf(): PowerBand;
}

export function GridPoweredMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class GridPoweredMixin extends Base implements GridPowered {
    static _mixinName: string = GRID_POWERED_MIXIN;
    static _mixinRefusal =
      'This is not something that draws grid power.';

    static fieldMeta: FieldMeta = {};

    /** Resolved lazily on first read; transient — re-resolved every boot. */
    private _resolved = false;
    private _powerBand: PowerBand = 'off-grid';
    private _powerNodeRef: string | null = null;
    private _gridCatalogue: GridCatalogue | null = null;

    /**
     * Resolve the meter the first time it is asked for — NOT at onCreate
     * (too early; see the header). Sync: `resolveRoomPath` walks containment,
     * `ParcelApi.powerOf` reads the registry, both synchronous. Kicks the grid
     * compile fire-and-forget (post-boot, so no boot-time deadlock) so the
     * first `energizedAtSync` has a grid to read; the authored band/feeder are
     * cached, energization is not.
     */
    private ensureResolved(): void {
      if (this._resolved) return;
      this._resolved = true;
      try {
        const roomPath = this.resolveRoomPath();
        if (roomPath !== null) {
          const power = ParcelApi.powerOf(roomPath);
          this._powerBand = power.band;
          this._powerNodeRef = power.feeder !== '' ? power.feeder : null;
        }
        const cat = StuffApi.findByTemplatePath(
          GRID_CATALOGUE_PATH,
        ) as GridCatalogue | null;
        this._gridCatalogue = cat;
        void cat?.ensureCompiled?.();
      } catch {
        // A premises we cannot resolve reads as off-grid — fail closed. Allow a
        // retry next read (the registry may simply not be ready yet).
        this._powerBand = 'off-grid';
        this._powerNodeRef = null;
        this._resolved = false;
      }
    }

    public isPowered(): boolean {
      this.ensureResolved();
      if (this._powerBand === 'off-grid' || this._powerNodeRef === null) {
        return false;
      }
      const cat = this._gridCatalogue;
      return cat !== null && cat.energizedAtSync(this._powerNodeRef);
    }

    public availablePowerW(): number {
      return this.isPowered() ? bandWatts(this._powerBand) : 0;
    }

    public powerNodeRef(): string | null {
      this.ensureResolved();
      return this._powerNodeRef;
    }

    public powerBandOf(): PowerBand {
      this.ensureResolved();
      return this._powerBand;
    }

    /**
     * The template path of the room the meter is resolved against — the
     * outermost container in the chain. A `Location` is a `Container` that is
     * not itself `Containable`, so walking out while the cursor is Containable
     * lands on the room (a light propped in a room, a light in a fixture in a
     * room, both).
     */
    private resolveRoomPath(): string | null {
      const self = this as unknown as Stuff;
      let cursor: Stuff = self;
      const seen = new Set<string>();
      while (MixinApi.isContainable(cursor)) {
        const next = cursor.getContainer() as Stuff | null;
        if (next === null || seen.has(next.stuffId)) break;
        seen.add(next.stuffId);
        cursor = next;
      }
      return cursor !== self ? cursor.getTemplatePath() : null;
    }
  };
}
