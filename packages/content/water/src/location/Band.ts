/**
 * Band — ⭐⭐ **one depth of the water under a deep water** (underwater
 * D5–D9, D22).
 *
 * A water deeper than you can stand in has a column under it, budded by
 * the `ColumnWarren` on first traversal: the **lit** band where the
 * surface's light still reaches, the **dark** band below it, and the
 * **bed**. Which of them exist is derived from the water's depth and
 * clarity (`WaterPlace.bandsNow()`), so a clear five meters is lit to the
 * bed and the Kestrel's six goes dark before it.
 *
 * A band is a water place like its surface, and it authors nothing of
 * its own water: it is stamped at bud with the surface it lies under and
 * which band it is, and every read — the water, how deep, how cold, how
 * much light — is the surface's.
 *
 *  - **What you are in.** Under the surface: water, at the band's depth,
 *    never at the surface — even standing on the bed.
 *  - **What you stand on.** The lit and dark bands author the non-bearing
 *    `open-water` floor, so `sit` refuses in physics words; the bed is
 *    ground (its row authors no floor, and z < 0 puts it on grade).
 *  - **What goes down.** A thing that sinks goes to the bed; one that
 *    floats goes up to the surface; a neutral body stays.
 *  - **What you see.** The surface's light through the band's depth of
 *    water.
 *  - **What it reads like.** The row's one authored description, then
 *    what is TRUE of this water here: how far you can see in it (its
 *    clarity) and how far the surface is above you. Two columns read
 *    differently because their waters differ, never by a draw (underwater
 *    review: the prose bank that picked a line by hash and hour is gone).
 *    A water that needs its own words gets an authored room.
 */

import Location from '@saxonberg/server/mud/platform/location/Location';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { ShoreMixin } from '@saxonberg/server/mud/lib/location/Shore';
import { SwimmableMixin } from '@saxonberg/server/mud/lib/locomotion/Swimmable';
import { WaterPlaceMixin, type WaterPlace, type WaterState } from '@saxonberg/server/mud/lib/location/WaterPlace';
import type { ColumnBand } from '@saxonberg/server/mud/lib/location/WaterColumn';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { MediumRead } from '@saxonberg/server/mud/api/biome';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Shore } from '@saxonberg/server/mud/lib/location/Shore';
import type { WaterColumn } from '@saxonberg/server/mud/lib/location/WaterColumn';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

type SurfaceStuff = Stuff & Container & WaterPlace & Shore;

const BandBase = WaterPlaceMixin(
  SwimmableMixin(ShoreMixin(PersistableMixin(WarrenMemberMixin(Location)))),
);

export default class Band extends BandBase {
  static fieldMeta: FieldMeta = {
    // Stamped at bud — or authored, for a room beside a column (the
    // intake's mouth beside the basin's dark band).
    surface: { persistent: true, authorable: true },
    band: { persistent: true, authorable: true },
  };

  /** The surface place this band lies under — an identity path. */
  public surface = '';

  /** Which band of the column this is. */
  public band: ColumnBand = 'lit';

  /**
   * Stamp the band at bud: which surface, which band, and the surface's
   * water as its own, so the draw verbs and the read find it here.
   */
  public attachTo(surface: SurfaceStuff, band: ColumnBand): void {
    this.surface = surface.getIdentityPath() ?? surface.getTemplatePath() ?? '';
    this.band = band;
    const water = surface.getWater();
    if (water !== null) this.setWater({ ...water });
  }

  public getSurfacePath(): string {
    return this.surface;
  }

  public getBand(): ColumnBand {
    return this.band;
  }

  /** The live surface, when it is loaded. */
  public getSurface(): SurfaceStuff | null {
    if (this.surface === '') return null;
    const s = StuffApi.findByTemplatePath<Stuff>(this.surface);
    return s && !s.isDestroyed() && MixinApi.isWaterPlace(s)
      ? (s as SurfaceStuff)
      : null;
  }

  /** How far below the surface this band lies now, m. */
  public getDepthM(): number {
    return this.getSurface()?.bandDepthM(this.band) ?? 0;
  }

  /* ─────────────────────────── the water ─────────────────────────── */

  /** Under the surface you are always in the water — standing on the bed too. */
  public mediumFor(_occupant: Stuff): MediumRead {
    return {
      tag: 'water',
      substance: 'water',
      immersed: true,
      atSurface: false,
      temperatureK: this.waterTemperatureK(),
      depthM: this.getDepthM(),
      waterRef: this.getWater()?.of ?? null,
      visibilityM: this.seeingM(),
      oxygenMgL: this.getSurface()?.oxygenNowMgL() ?? null,
    };
  }

  /** How far you see through this water, m — its clarity. */
  private seeingM(): number | null {
    const surface = this.getSurface();
    const c = surface?.peekWaterRead(surface.getWaterKey())?.clarityM;
    return typeof c === 'number' && c > 0 ? c : null;
  }

  /** The surface's water temperature. */
  public waterTemperatureK(): number {
    return this.getSurface()?.waterTemperatureK() ?? super.waterTemperatureK();
  }

  /** A band is under the water whatever the surface is doing. */
  public stateNow(): WaterState {
    return 'swimming';
  }

  /** A band has no column of its own: it IS one. */
  public bandsNow(): ColumnBand[] {
    return [];
  }

  /** The water's level is the surface's. */
  public levelNow(): number {
    return this.getSurface()?.levelNow() ?? 0;
  }

  /** The place at the top of this water: the surface it lies under. */
  public surfacePlace(): (Stuff & Container) | null {
    return this.getSurface();
  }

  /* ─────────────────────────── what moves ─────────────────────────── */

  /** What sinks goes to the bed; on the bed it is already there. */
  public async sink(thing: Stuff): Promise<boolean> {
    if (this.band === 'bed') return false;
    const surface = this.getSurface();
    if (surface === null || thing.isDestroyed() || !MixinApi.isContainable(thing)) return false;
    const column = await columnOf();
    const bed = column ? await column.bandOf(surface, 'bed') : null;
    if (bed === null || thing.isDestroyed()) return false;
    ContainmentApi.move(thing, bed);
    return true;
  }

  /**
   * ⭐ A thing arriving in a band goes where its density takes it: down
   * to the bed, or up to the surface (D9). A neutral thing, and anything
   * that acts for itself, stays.
   */
  public onContainableAdded(thing: Stuff & Containable): void {
    super.onContainableAdded(thing);
    if (this.band === 'bed' || this.sinks(thing) || !this.floats(thing)) return;
    void Promise.resolve().then(() => this.floatUp(thing));
  }

  /** Lighter than the water, and nothing holding it down. */
  private floats(thing: Stuff): boolean {
    if (thing.isAgent?.() || MixinApi.isMobile(thing)) return false;
    if (!MixinApi.isTangible(thing)) return false;
    if (MixinApi.isContainable(thing) && thing.isFixedInPlace?.()) return false;
    const rho = thing.getMaterial()?.getDensity().rawValue() ?? 0;
    if (!(rho > 0)) return false;
    let water = 1000;
    try {
      water = BiomeApi.densityOf('water').rawValue() || 1000;
    } catch {
      /* fresh water */
    }
    return rho < water;
  }

  private floatUp(thing: Stuff & Containable): void {
    const surface = this.getSurface();
    if (surface === null || thing.isDestroyed()) return;
    if (thing.getContainer() !== (this as unknown as Stuff)) return;
    ContainmentApi.move(thing, surface);
  }

  /* ─────────────────────────── light and words ─────────────────────────── */

  /**
   * ⭐ The surface's light, through this band's depth of water (D29 seam
   * 9): the light falling on the surface NOW — the sky's, by the sun or
   * the moon and the cloud, or the place's own — times what is left at
   * this depth. The depth at which 1 % is left is the water's clarity, so
   * the lit band keeps a share, the dark band almost none, and a night
   * dive is black without a light you brought.
   */
  public getAmbientFlux(): Quantity<'lumen'> {
    const surface = this.getSurface();
    if (surface === null || !MixinApi.isAmbientLit(surface)) return Quantity.of(0, 'lumen');
    const above = surface.isSkyLit()
      ? surface.skyNoonFlux() *
        CelestialApi.skyFactorNow() *
        surface.getWeatherDimFactor() *
        surface.skyLightFraction()
      : surface.getAmbientFlux().rawValue();
    const read = surface.peekWaterRead(surface.getWaterKey());
    const clarity = typeof read?.clarityM === 'number' && read.clarityM > 0 ? read.clarityM : 5;
    const share = Math.pow(0.01, this.getDepthM() / clarity);
    return Quantity.of(above * share, 'lumen');
  }

  /** Under water there is no sky of its own: what light there is comes down. */
  public isSkyLit(): boolean {
    return false;
  }

  /**
   * ⭐ Red goes first in water: what reaches you is green-blue, and bluer
   * the deeper you are — so blood reads black at depth. Carried as the
   * color temperature of the light that is left.
   */
  public getAmbientColorTemperature(): Quantity<'K'> | null {
    const depth = this.getDepthM();
    return Quantity.of(Math.min(20000, 6500 + 1500 * depth), 'K');
  }

  /** The row's words, then what this water is like here: how far you see, how far up the air is. */
  public getLongDescription(): string {
    const base = super.getLongDescription();
    const surface = this.getSurface();
    const read = surface === null ? null : surface.peekWaterRead(surface.getWaterKey());
    const lines = [base];
    const clarity = read?.clarityM;
    if (typeof clarity === 'number' && clarity > 0) {
      lines.push(
        clarity < 2
          ? 'The water is thick and brown with silt; you can see barely an arm\'s length into it.'
          : clarity < 6
            ? 'The water is cloudy green, and anything a few strokes off fades into it.'
            : 'The water is clear, and you can see a long way through it.',
      );
    }
    const depth = this.getDepthM();
    lines.push(
      depth < 3 ? 'The surface is close above you.'
        : depth < 8 ? 'The surface is well above you.'
          : 'The surface is a long way above you.',
    );
    return lines.join(' ');
  }
}

/** The water pack's column singleton, when it is up. */
async function columnOf(): Promise<(Stuff & WaterColumn) | null> {
  const c = await StuffApi.singleton<Stuff>(TemplatePaths.waterColumn);
  return MixinApi.isWaterColumn(c) ? c : null;
}
