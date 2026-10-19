/**
 * WaterPlaceMixin — ⭐⭐ **this place IS a water** (underwater-plan D1).
 *
 * Water is a STATE of a place, not a kind of place. A place cites a water
 * and says how deep its floor lies below that water's level:
 *
 * ```yaml
 * water: { of: kestrel:confluence, depthM: 6 }
 * ```
 *
 * and everything else is derived from the water's level now: a tidepool
 * whose floor is half a metre above the mean is dry at low water and deep
 * at high water with no state moved, because nothing about the place
 * changed — the water did.
 *
 * | state | depth now | what it is |
 * |---|---|---|
 * | `dry` | ≤ 0 | ground, wet or not |
 * | `wading` | ≤ the wading depth | you stand in it; it costs nothing |
 * | `swimming` | deeper | whoever the floor does not hold is in the water |
 * | `frozen` | — | the water reads frozen; the floor decides who it bears |
 *
 * ⭐ **Per occupant, not per room.** Who is IN the water is answered by
 * support: the place's floor (the water's surface, or an ice sheet)
 * either holds an occupant up or it does not. A body on the ice and a
 * body in the hole beside it share a room and not a medium —
 * {@link WaterPlace.mediumFor} is how `BiomeApi.mediumFor` asks.
 *
 * The host must also compose `ShoreMixin` (the water as a source to draw
 * from, the memoised read) and `SwimmableMixin` (the swim enablement) —
 * a class rule a test pins, never a runtime guard. The place's own water
 * is registered in `waters` under its own key, so `fill`, `drink`, `wash`
 * and `look water` find it with no `details:` feature: the place IS the
 * feature.
 *
 * Everything the retired `Pool` kind did about support, swimming and
 * sinking lives here, unchanged in behaviour.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Mobile } from '../spatial/Mobile';
import type { Slottable } from '../slot/Slottable';
import type { Floor } from '../ground/Floor';
import type { VetoResult } from '../errors';
import type Exit from '../boundary/Exit';
import type { Shore } from './Shore';
import type { Swimmable } from '../locomotion/Swimmable';
import type { MediumRead } from '../../api/biome';
import type { ColumnBand, WaterColumn } from './WaterColumn';
import { COLUMN_BANDS } from './WaterColumn';
import type { Exitable } from '../boundary/Exitable';
import type { CommandContributions } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { BiomeApi } from '../../api/biome';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { TemplatePaths } from '../paths';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/** The key a place's own water is registered under in `waters`. */
export const WATER_KEY = 'water';

/** The posture-bearing slot a water's floor offers (the surface's `ground:1`). */
const GROUND_SLOT = 'ground:1';

/** The water under the ice when nothing better is known, K. */
const UNDER_ICE_K = 274;

/** Water's density when the medium cannot be read, kg/m³. */
const WATER_DENSITY = 1000;

/** How deep an adult stands in water before it is over their head, m. */
const DEFAULT_WADE_M = 1.5;

/** The thinnest a band of a column may be, m. */
const DEFAULT_MIN_BAND_M = 2;

/** What a swimmer's kick is worth against weight, N. */
const SWIM_THRUST_N = 40;

/** How deep light reaches when the water's read does not say, m. */
const DEFAULT_CLARITY_M = 5;

/** What a place says about its water. */
export interface WaterSpec {
  /** The water cited — a reach ref (`kestrel:confluence`) or a sea's path. */
  of: string;
  /**
   * How far the place's floor lies below the water's level datum, m.
   * Negative is normally dry (a tidepool above the mean).
   */
  depthM: number;
  /**
   * The feature the water is known by here (`mere`), when the place has
   * one — `fill bucket from mere`. Default {@link WATER_KEY}.
   */
  feature?: string;
}

/** What a water place is like, now. */
export type WaterState = 'dry' | 'wading' | 'swimming' | 'frozen';

/**
 * ⭐ A room authored beside one band of this water's column — the intake
 * mouth beside the basin's dark band. *The bespoke case is authored
 * rooms beside the column.*
 */
export interface ColumnNeighbour {
  band: ColumnBand;
  /** The direction from the band to the room. */
  direction: string;
  /** The authored room's template path. */
  destination: string;
  /** The direction back; the inverse of `direction` when omitted. */
  opposite?: string;
}

/** What a surface says about the column under it. */
export interface ColumnSpec {
  neighbours?: ColumnNeighbour[];
}

/** Public shape added by WaterPlaceMixin. */
export interface WaterPlace {
  getWater(): WaterSpec | null;
  setWater(value: WaterSpec | null): void;
  /** The `waters` key this place's own water is registered under. */
  getWaterKey(): string;
  /** The water's level above its datum now, m (0 when not knowable). */
  levelNow(): number;
  /** How deep the water is over this place's floor now, m (≤ 0 = dry). */
  depthNow(): number;
  /** What this water is like now. */
  stateNow(): WaterState;
  /**
   * ⭐ The bands of the column under this water now, surface downward —
   * `[]` where you can stand. Derived from the depth and the water's
   * clarity (underwater D6): a clear five metres is lit to the bed, the
   * Kestrel's six goes dark before it.
   */
  bandsNow(): ColumnBand[];
  /** How far below the surface the middle of `band` lies now, m. */
  bandDepthM(band: ColumnBand): number;
  /** The rooms authored beside this water's column. */
  getColumn(): ColumnSpec;
  setColumn(value: ColumnSpec | null): void;
  /** Give this water its way down when it has a column (load on use). */
  ensureColumnExits(): Promise<void>;
  /**
   * ⭐ A body with nothing left to stay up with goes under (underwater
   * D12): into the first band of the column, silently. `false` when this
   * water has no column (you would be standing).
   */
  takeUnder(body: Stuff): Promise<boolean>;
  /**
   * ⭐ May this body swim up from here (underwater D14)? Weight is the only
   * thing that refuses it — never skill: too heavy to rise, drop
   * something.
   */
  canRise(body: Stuff): VetoResult;
  /** The place at the top of this water — itself, unless it is under one. */
  surfacePlace(): (Stuff & Container) | null;
  /**
   * ⭐ Hold a body face-up at the surface (underwater D11): the
   * disconnected player's water answer. Brought up to the surface place
   * and held there, breathing, until they come back or someone moves
   * them. The dying clock, if it was already running, runs on.
   */
  holdAtSurface(body: Stuff): Promise<boolean>;
  /**
   * ⭐ What `occupant` is in: the water (with its temperature and the
   * surface depth) unless the floor holds it up, else the air above.
   */
  mediumFor(occupant: Stuff): MediumRead;
  /** The water's temperature, K. */
  waterTemperatureK(): number;
  /** Does this thing go down in water — a still, dense, non-acting thing? */
  sinks(thing: Stuff): boolean;
  /** Send a thing down to the bed. `false` when there is nowhere for it to go. */
  sink(thing: Stuff): Promise<boolean>;
  /** At the thaw: everything here that sinks goes down. */
  sinkWhatSinks(): void;
}

type FloorStuff = Stuff & Floor;
type WaterHost = Stuff & Container & Shore & Swimmable & {
  getFloor(): Stuff | null;
};

export function WaterPlaceMixin<TBase extends MixinConstructor<WaterHost>>(Base: TBase) {
  return class WaterPlaceMixin extends Base implements WaterPlace {
    static _mixinName: string = 'WaterPlaceMixin';

    static fieldMeta: FieldMeta = {
      water: { persistent: true, authorable: true },
      column: { persistent: true, authorable: true },
    };

    /**
     * ⭐ What you can do because you are IN a water (underwater D12, D15):
     * float on it, clear your ears in it. The place is the occupant's
     * container, and a container grants inward on `inventory`.
     */
    static commandContributions: CommandContributions = {
      inventory: ['platform/cmd/posture/float.yaml', 'platform/cmd/posture/equalize.yaml'],
    };

    /** The water this place is, and how deep its floor lies in it. */
    public water: WaterSpec | null = null;

    /** What lies beside the column under this water. */
    public column: ColumnSpec = {};

    /** A water is swum every way it opens; a row may narrow it. */
    public axes: string[] = ['*'];

    public getWater(): WaterSpec | null {
      return this.water === null ? null : { ...this.water };
    }

    /**
     * Stamp the water and register it as this place's own cited water, so
     * the draw verbs and the read find it under {@link getWaterKey}.
     */
    public setWater(value: WaterSpec | null): void {
      if (value === null || typeof value.of !== 'string' || value.of.trim() === '') {
        this.water = null;
        return;
      }
      const depthM = Number(value.depthM);
      const feature = typeof value.feature === 'string' && value.feature.trim() !== ''
        ? value.feature.trim()
        : undefined;
      this.water = {
        of: value.of.trim(),
        depthM: Number.isFinite(depthM) ? depthM : 0,
        ...(feature ? { feature } : {}),
      };
      const self = this as unknown as Shore;
      self.setWaters({ ...self.getWaters(), [this.getWaterKey()]: this.water.of });
    }

    public getWaterKey(): string {
      return this.water?.feature ?? WATER_KEY;
    }

    /* ─────────────────────────── the level ─────────────────────────── */

    public levelNow(): number {
      if (this.water === null) return 0;
      const read = (this as unknown as Shore).peekWaterRead(this.getWaterKey());
      const level = read?.levelM;
      return typeof level === 'number' && Number.isFinite(level) ? level : 0;
    }

    public depthNow(): number {
      if (this.water === null) return 0;
      return this.water.depthM + this.levelNow();
    }

    public stateNow(): WaterState {
      const read = this.water === null
        ? null
        : (this as unknown as Shore).peekWaterRead(this.getWaterKey());
      if (read?.frozen === true) return 'frozen';
      // A water nobody cited is simply water, over your head.
      if (this.water === null) return 'swimming';
      const depth = this.depthNow();
      if (depth <= 0) return 'dry';
      if (depth <= wadeDepthM()) return 'wading';
      return 'swimming';
    }

    /* ─────────────────────────── the column ─────────────────────────── */

    public getColumn(): ColumnSpec {
      return { neighbours: [...(this.column.neighbours ?? [])] };
    }

    public setColumn(value: ColumnSpec | null): void {
      const out: ColumnNeighbour[] = [];
      for (const n of value?.neighbours ?? []) {
        if (!n || !COLUMN_BANDS.includes(n.band)) continue;
        if (typeof n.direction !== 'string' || typeof n.destination !== 'string') continue;
        out.push({
          band: n.band,
          direction: n.direction,
          destination: n.destination,
          ...(typeof n.opposite === 'string' ? { opposite: n.opposite } : {}),
        });
      }
      this.column = { neighbours: out };
    }

    public bandsNow(): ColumnBand[] {
      if (this.water === null) return [];
      const d = this.depthNow();
      const wade = wadeDepthM();
      if (d <= wade) return [];
      const minBand = dial(AppSettingKeys.waterColumnMinBandM, DEFAULT_MIN_BAND_M);
      const lit = this.clarityM();
      const out: ColumnBand[] = [];
      if (d > wade + minBand) out.push('lit');
      if (d > lit + minBand) out.push('dark');
      out.push('bed');
      return out;
    }

    public bandDepthM(band: ColumnBand): number {
      const d = Math.max(0, this.depthNow());
      const wade = wadeDepthM();
      const lit = Math.min(this.clarityM(), d);
      if (band === 'bed') return d;
      if (band === 'lit') return wade + Math.max(0, lit - wade) / 2;
      return (lit + d) / 2;
    }

    /** How deep light reaches in this water, m. */
    private clarityM(): number {
      const read = this.water === null
        ? null
        : (this as unknown as Shore).peekWaterRead(this.getWaterKey());
      const c = read?.clarityM;
      return typeof c === 'number' && c > 0 ? c : DEFAULT_CLARITY_M;
    }

    public async ensureColumnExits(): Promise<void> {
      if (this.bandsNow().length === 0) return;
      const self = this as unknown as Stuff & Container & Exitable;
      if (MixinApi.isExitable(self) && self.getExit('down')) return;
      const column = await waterColumn();
      await column?.ensureColumnExits(self);
    }

        public async takeUnder(body: Stuff): Promise<boolean> {
      const first = this.bandsNow()[0];
      if (first === undefined || !MixinApi.isContainable(body)) return false;
      const column = await waterColumn();
      const band = column ? await column.bandOf(this as unknown as Stuff & Container, first) : null;
      if (band === null || body.isDestroyed()) return false;
      const floor = this.waterFloor();
      if (floor !== null && MixinApi.isSlotted(floor) && floor.supports(body)) {
        floor.vacate(GROUND_SLOT, body as unknown as Stuff & Slottable);
      }
      if (MixinApi.isRespiration(body)) body.releaseHold();
      ContainmentApi.move(body, band);
      return true;
    }

    public surfacePlace(): (Stuff & Container) | null {
      return this as unknown as Stuff & Container;
    }

    public async holdAtSurface(body: Stuff): Promise<boolean> {
      const surface = this.surfacePlace();
      if (surface === null || !MixinApi.isContainable(body) || body.isDestroyed()) return false;
      if (body.getContainer() !== surface) ContainmentApi.move(body, surface);
      if (MixinApi.isRespiration(body)) body.holdUp();
      return true;
    }

    public canRise(body: Stuff): VetoResult {
      if (!MixinApi.isLoadBearing(body)) return { ok: true };
      const medium = this.mediumFor(body);
      let rho = WATER_DENSITY;
      try {
        rho = BiomeApi.densityOf('water').rawValue() || WATER_DENSITY;
      } catch {
        /* fresh water */
      }
      const lift = body.getNetBuoyancyN(rho, medium.depthM);
      if (lift + SWIM_THRUST_N < 0) {
        return { ok: false, reason: 'You are too heavy to swim up — drop something.' };
      }
      return { ok: true };
    }

    /* ─────────────────────────── the medium ─────────────────────────── */

    /** The floor, when it speaks the support protocol. */
    private waterFloor(): FloorStuff | null {
      const f = (this as unknown as WaterHost).getFloor();
      return f !== null && MixinApi.isFloor(f) ? (f as FloorStuff) : null;
    }

    public mediumFor(occupant: Stuff): MediumRead {
      const floor = this.waterFloor();
      const air: MediumRead = {
        tag: 'air',
        substance: 'air',
        immersed: false,
        atSurface: false,
        temperatureK: null,
        depthM: 0,
        waterRef: this.water?.of ?? null,
      };
      if (floor !== null && floor.supports(occupant)) return air;
      return {
        tag: 'water',
        substance: 'water',
        immersed: true,
        // The water place itself is the surface: in it, your head is out.
        atSurface: true,
        temperatureK: this.waterTemperatureK(),
        depthM: 0,
        waterRef: this.water?.of ?? null,
      };
    }

    /** The water's temperature: the read's draw, or the under-ice floor. */
    public waterTemperatureK(): number {
      const pick = (this as unknown as Shore).waterFor();
      if (!('key' in pick)) return super.waterTemperatureK();
      const read = (this as unknown as Shore).peekWaterRead(pick.key);
      return read?.draw?.temperatureK ?? read?.underIce?.temperatureK ?? UNDER_ICE_K;
    }

    /* ─────────────────────────── swimming ─────────────────────────── */

    /** Swimmable while the floor has open water to swim in. */
    public canEngageAxis(direction: string): boolean {
      const floor = this.waterFloor();
      if (floor !== null && floor.supportIsSlotted()) {
        if (!(floor.openWaterAreaM2() > 0)) return false;
      } else {
        const pick = (this as unknown as Shore).waterFor();
        if ('key' in pick && (this as unknown as Shore).peekWaterRead(pick.key)?.frozen === true) {
          return false;
        }
      }
      return super.canEngageAxis(direction);
    }

    /**
     * ⭐ Who swims: someone here swims iff they are in the water (the floor
     * is not holding them); someone outside swims in iff there is open
     * water to swim into.
     */
    public canBeEngagedBy(actor: Stuff): boolean {
      const floor = this.waterFloor();
      if (floor !== null && floor.supportIsSlotted()) {
        const here = MixinApi.isContainable(actor) &&
          actor.getContainer() === (this as unknown as Stuff);
        if (here ? floor.supports(actor) : !(floor.openWaterAreaM2() > 0)) return false;
      }
      return super.canBeEngagedBy(actor);
    }

    /* ─────────────────────────── arriving and leaving ─────────────────────────── */

    /**
     * ⭐ Arriving: swum in, you are in the water; walked in, the floor bears
     * you (you hold its ground slot) or it gives way under you.
     */
    public onEntered(mover: Stuff & Mobile & Containable, via: Exit): void {
      (Base.prototype as { onEntered?: (m: unknown, v: unknown) => void }).onEntered?.call(this, mover, via);
      const floor = this.waterFloor();
      if (floor === null || !floor.supportIsSlotted()) return;
      const swum = mover.getEngagedMode()?.getMedium() === 'water';
      if (swum && !floor.bears(floor.supportLoadKgOf(mover))) {
        if (MixinApi.isAttired(mover)) mover.immerse();
        else if (MixinApi.isWet(mover)) mover.wet(1);
        return;
      }
      if (floor.bears(floor.supportLoadKgOf(mover)) && MixinApi.isSlotted(floor) && MixinApi.isSlottable(mover)) {
        if (!floor.supports(mover) && floor.canOccupy(mover as Stuff & Slottable, GROUND_SLOT)) {
          floor.occupy(mover as Stuff & Slottable, GROUND_SLOT);
          return;
        }
        if (floor.supports(mover)) return;
      }
      floor.giveWay(mover);
    }

    /** Leaving: let go of the floor (a room move does not vacate a posture slot). */
    public onExited(mover: Stuff & Mobile & Containable, via: Exit): void {
      (Base.prototype as { onExited?: (m: unknown, v: unknown) => void }).onExited?.call(this, mover, via);
      const floor = this.waterFloor();
      if (floor === null || !MixinApi.isSlotted(floor)) return;
      if (floor.supports(mover)) floor.vacate(GROUND_SLOT, mover as unknown as Stuff & Slottable);
    }

    /** ⭐ A body in the water leaves by swimming. */
    public canExit(mover: Stuff & Mobile & Containable, via: Exit): VetoResult {
      const base = (Base.prototype as { canExit?: (m: unknown, v: unknown) => VetoResult }).canExit;
      if (base) {
        const veto = base.call(this, mover, via);
        if (!veto.ok) return veto;
      }
      const floor = this.waterFloor();
      if (floor === null || !floor.supportIsSlotted()) return { ok: true };
      if (floor.supports(mover)) return { ok: true };
      if (!MixinApi.isMobile(mover) || !MixinApi.isSlottable(mover)) return { ok: true };
      if (mover.getEngagedMode()?.getMedium() === 'water') return { ok: true };
      return { ok: false, reason: 'You are in the water; swim for it.' };
    }

    /* ─────────────────────────── what goes down ─────────────────────────── */

    /**
     * A load change — a thing dropped or taken — reconciles who the floor
     * bears; in open water, what sinks goes down.
     */
    public onContainableAdded(thing: Stuff & Containable): void {
      (Base.prototype as { onContainableAdded?: (t: unknown) => void }).onContainableAdded?.call(this, thing);
      const floor = this.waterFloor();
      floor?.reconcileSupport();
      // Open water (nothing underfoot bears even an empty load): a dense
      // thing goes straight down. On ice it lies on the ice until the
      // thaw. Deferred a tick: never move a thing from inside the hook of
      // its own arrival.
      if (floor !== null && floor.supportIsSlotted() && !floor.bears(0) && this.sinks(thing)) {
        void Promise.resolve().then(() => this.sink(thing));
      }
    }

    public onContainableRemoved(thing: Stuff & Containable): void {
      (Base.prototype as { onContainableRemoved?: (t: unknown) => void }).onContainableRemoved?.call(this, thing);
      this.waterFloor()?.reconcileSupport();
    }

    public sinks(thing: Stuff): boolean {
      if (thing.isAgent?.() || MixinApi.isMobile(thing)) return false;
      if (!MixinApi.isTangible(thing)) return false;
      if (MixinApi.isContainable(thing) && thing.isFixedInPlace?.()) return false;
      const rho = thing.getMaterial()?.getDensity().rawValue() ?? 0;
      // Buoyancy is a READ (the underwater slate § 3): the medium's own density.
      let medium = WATER_DENSITY;
      try {
        medium = BiomeApi.densityOf('water').rawValue() || WATER_DENSITY;
      } catch {
        /* fresh water */
      }
      return rho > medium;
    }

    /**
     * ⭐ Send a thing down to the bed of this water's column (underwater
     * D9). A water you can stand in has no column and keeps it on its own
     * floor: `false`.
     */
    public async sink(thing: Stuff): Promise<boolean> {
      if (thing.isDestroyed() || !MixinApi.isContainable(thing)) return false;
      if (!this.bandsNow().includes('bed')) return false;
      const column = await waterColumn();
      const bed = column ? await column.bandOf(this as unknown as Stuff & Container, 'bed') : null;
      if (bed === null || thing.isDestroyed()) return false;
      try {
        ContainmentApi.move(thing, bed);
        return true;
      } catch {
        return false;
      }
    }

    public sinkWhatSinks(): void {
      const self = this as unknown as Stuff & Container;
      for (const c of [...self.getContents()]) {
        if (this.sinks(c)) void this.sink(c);
      }
    }
  };
}

/** The wading depth dial (`water.column.wadeM`). */
function wadeDepthM(): number {
  return dial(AppSettingKeys.waterColumnWadeM, DEFAULT_WADE_M);
}

/** One positive numeric dial, falling back when unseeded. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = raw == null || raw === '' ? NaN : Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The water pack's column, when it is installed — found by path and
 * narrowed by shape, never imported. Load on use.
 */
async function waterColumn(): Promise<(Stuff & WaterColumn) | null> {
  try {
    const column = await StuffApi.singleton<Stuff>(TemplatePaths.waterColumn);
    return MixinApi.isWaterColumn(column) ? column : null;
  } catch {
    return null;
  }
}

