/**
 * GridPoweredMixin — ⭐⭐ **this thing works only while its premises' meter is
 * live.**
 *
 * A consuming device that draws grid power and does not care how the grid is
 * laid out: a residential lamp now, the cold-chain fridge later. It resolves
 * its premises' meter ONCE at `postRegister` — the covering parcel's power band
 * and feeder node (`ParcelApi.powerOf`) — and thereafter answers `isPowered()`
 * synchronously: the band is connected, and the feeder node is energized right
 * now (`GridCatalogue.energizedAtSync`). A cut upstream, a dead source, or an
 * off-grid premises all read as unpowered the same second.
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

    /** Resolved once at postRegister; transient — re-resolved every boot. */
    private _powerBand: PowerBand = 'off-grid';
    private _powerNodeRef: string | null = null;
    private _gridCatalogue: GridCatalogue | null = null;

    public async postRegister(context?: unknown): Promise<void> {
      const sup = (Base.prototype as { postRegister?: (c?: unknown) => Promise<void> })
        .postRegister;
      if (typeof sup === 'function') await sup.call(this, context);
      try {
        const roomPath = this.resolveRoomPath();
        if (roomPath !== null) {
          const power = ParcelApi.powerOf(roomPath);
          this._powerBand = power.band;
          this._powerNodeRef = power.feeder !== '' ? power.feeder : null;
        }
        // Cache the catalogue ref only — do NOT warm the compile here.
        //
        // ⚠⚠ Warming in postRegister (even fire-and-forget) can run the compile
        // DURING boot, before the feeder streets' exits are hydrated — it stands
        // them up mid-install via `StuffApi.singleton`, reads no exits yet, and
        // caches a grid where "a line leaves the road" and the whole tree is
        // dark. The compile must run POST-install: it does, lazily, on the first
        // real read (the dusk settle, or `analyze grid`), by which time every
        // street is installed. `isPowered()` (sync) kicks the compile itself and
        // answers `false` until it lands — the one-tick cold start.
        this._gridCatalogue = (await StuffApi.singleton(
          GRID_CATALOGUE_PATH,
        )) as unknown as GridCatalogue;
      } catch {
        // A premises we cannot resolve reads as off-grid — fail closed.
        this._powerBand = 'off-grid';
        this._powerNodeRef = null;
      }
    }

    public isPowered(): boolean {
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
      return this._powerNodeRef;
    }

    public powerBandOf(): PowerBand {
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
