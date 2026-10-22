/**
 * WaterPlaceMixin — ⭐⭐ **this place IS a water** (underwater D1).
 *
 * Water is a STATE of a place, not a kind of place. A place cites a water
 * and says how deep its floor lies below that water's level:
 *
 * ```yaml
 * water: { of: kestrel:confluence, depthM: 6 }
 * ```
 *
 * and everything else is derived from the water's level now: a tidepool
 * whose floor is half a meter above the mean is dry at low water and deep
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
 * sinking lives here, unchanged in behavior.
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
import { NavigationApi } from '../../api/navigation';
import { ContainmentApi } from '../../api/containment';
import { BulkableApi } from '../../api/bulk';
import { WorldClockApi } from '../../api/worldclock';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { WaterRead } from './WaterSource';
import { CombatApi } from '../../api/combat';
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

/** About how thick one dark band is, m — an atmosphere of water. */
const DEFAULT_DARK_BAND_M = 10;

/** The most dark bands a column has; past it they thicken. */
const DEFAULT_MAX_DARK_BANDS = 5;

/** What a swimmer's kick is worth against weight, N. */
const SWIM_THRUST_N = 40;

/** How deep light reaches when the water's read does not say, m. */
const DEFAULT_CLARITY_M = 5;

/** What a place says about its water. */
/**
 * ⭐ What the tide does here (underwater D25): a strandline names the
 * waters whose floating drift the high water leaves on it.
 */
export interface TideSpec {
  /** Places whose floating things the flood carries here (authored forward refs). */
  collectsFrom?: string[];
}

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
  /**
   * ⭐ A basin's rim, m above its floor (underwater D25): when the water
   * falls below it the basin keeps this much of its own — cut off, a
   * tidepool at low water, its oxygen going as the hours pass.
   */
  rimM?: number;
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
  neighbors?: ColumnNeighbour[];
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
   * clarity (underwater D6): a clear five meters is lit to the bed, the
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
   * ⭐ The way down the water from here for `actor` — or why there is
   * none, in words (underwater review: the place decides; `descend`,
   * `dive` and `swim down` render). Off the ice at a hole, you let go of
   * what holds you up first.
   */
  wayDown(actor: Stuff): Promise<{ exit: Exit } | { reason: string; line: string }>;
  /** The way up the water from here, or why there is none. */
  wayUp(): { exit: Exit } | { reason: string; line: string };
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
  /** Whether a body here has its head in the air (river D16). */
  headOutAt(occupant: Stuff): boolean;
  /**
   * ⭐ Hold a body face-up at the surface (underwater D11): the
   * disconnected player's water answer. Brought up to the surface place
   * and held there, breathing, until they come back or someone moves
   * them. The dying clock, if it was already running, runs on.
   */
  holdAtSurface(body: Stuff): Promise<boolean>;
  /** The current carries a body that is not holding out of this water (river D11). */
  sweep(body: Stuff): Promise<boolean>;
  /**
   * ⭐ What `occupant` is in: the water (with its temperature and the
   * surface depth) unless the floor holds it up, else the air above.
   */
  mediumFor(occupant: Stuff): MediumRead;
  /** The current where `occupant` is, m/s (river D10). */
  currentFor(occupant: Stuff): number;
  /** How broken the water is where `occupant` is, 0–1 (river D10). */
  roughnessFor(occupant: Stuff): number;
  /** The water's temperature, K. */
  waterTemperatureK(): number;
  /** Does this thing go down in water — a still, dense, non-acting thing? */
  sinks(thing: Stuff): boolean;
  /** Send a thing down to the bed. `false` when there is nowhere for it to go. */
  sink(thing: Stuff): Promise<boolean>;
  /** At the thaw: everything here that sinks goes down. */
  sinkWhatSinks(): void;
  /** ⭐ Below its rim: a basin the water has left, keeping its own (D25). */
  isCutOff(): boolean;
  /**
   * ⭐ The dissolved oxygen here now, mg/L (underwater D21): the water's,
   * falling by the hour while the basin is cut off.
   */
  oxygenNowMgL(): number | null;
  getTide(): TideSpec | null;
  setTide(value: TideSpec | null): void;
  /** Game-second `thing` came into this water, if it is known (runtime). */
  arrivedAtS(thing: Stuff): number | null;
  /**
   * ⭐ Bring the place up to the water now (underwater D11, D25): the
   * flood's drift onto a strandline, and a disconnected body the water
   * has come up to held face-up at the surface — with a word to whoever
   * is here. Run on entry and whenever a fresh read of the water lands.
   */
  reconcileOccupants(): Promise<void>;
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
      tide: { persistent: true, authorable: true },
    };

    /**
     * ⭐ What you can do because you are IN a water (underwater D19): go
     * down and up its column. The place is the occupant's container, and a
     * container grants inward on `inventory`. ⛔ Not the shore's: beside a
     * water, `swim` is the way in, and a dry bank has no up or down. Floating
     * is `lie` on the water, and the ears clear on their own (underwater
     * review: a verb is for a choice, never for upkeep).
     */
    static commandContributions: CommandContributions = {
      inventory: [
        'platform/cmd/movement/descend.yaml',
        'platform/cmd/movement/ascend.yaml',
      ],
    };

    /** The water this place is, and how deep its floor lies in it. */
    public water: WaterSpec | null = null;

    /** What lies beside the column under this water. */
    public column: ColumnSpec = {};

    /** What the tide leaves here (a strandline), or null. */
    public tide: TideSpec | null = null;

    /** When the ebb left this basin cut off, game-seconds (runtime). */
    private _cutOffSinceS: number | null = null;

    /** stuffId → game-second it came into this water (runtime; lost on restart). */
    private _arrivals = new Map<string, number>();

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
        ...(Number(value.rimM) > 0 ? { rimM: Number(value.rimM) } : {}),
      };
      const self = this as unknown as Shore;
      self.setWaters({ ...self.getWaters(), [this.getWaterKey()]: this.water.of });
    }

    public getTide(): TideSpec | null {
      return this.tide === null ? null : { ...this.tide };
    }

    public setTide(value: TideSpec | null): void {
      const from = Array.isArray(value?.collectsFrom)
        ? value!.collectsFrom.filter((p): p is string => typeof p === 'string' && p !== '')
        : [];
      this.tide = from.length > 0 ? { collectsFrom: from } : null;
    }

    public arrivedAtS(thing: Stuff): number | null {
      return this._arrivals.get(thing.stuffId) ?? null;
    }

    /** ⭐ A fresh read landed: the water may have come up or gone down. */
    public async onWaterRead(key: string, read: WaterRead): Promise<void> {
      await (Base.prototype as { onWaterRead?: (k: string, r: WaterRead) => Promise<void> }).onWaterRead?.call(this, key, read);
      if (key === this.getWaterKey()) await this.reconcileOccupants();
    }

    public async reconcileOccupants(): Promise<void> {
      const self = this as unknown as Stuff & Container;
      if (self.isDestroyed()) return;
      const read = (this as unknown as Shore).peekWaterRead(this.getWaterKey());
      // The flood's drift: what floated in a collecting water since before
      // the last high water now lies here.
      const from = this.tide?.collectsFrom ?? [];
      if (from.length > 0 && read?.tide !== undefined) {
        const lastHighS = read.tide.nextHighS - HALF_LUNAR_DAY_S;
        for (const path of from) {
          const there = StuffApi.findByTemplatePath<Stuff>(path);
          if (!there || there === self || !MixinApi.isContainer(there) || !MixinApi.isWaterPlace(there)) continue;
          for (const thing of [...there.getContents()]) {
            if (thing.isAgent?.() || !MixinApi.isTangible(thing) || !MixinApi.isContainable(thing)) continue;
            if (thing.isFixedInPlace?.() || there.sinks(thing)) continue;
            const at = there.arrivedAtS(thing);
            if (at === null || at > lastHighS) continue;
            try {
              ContainmentApi.move(thing, self);
            } catch {
              /* it stays where it was */
            }
          }
        }
      }
      // The water has come up to a disconnected body: hold it at the surface.
      if (this.stateNow() !== 'swimming') return;
      const held: Stuff[] = [];
      for (const c of [...self.getContents()]) {
        if (!MixinApi.isHasInteractive(c) || !c.isLinkdead()) continue;
        if (MixinApi.isRespiration(c) && c.isHeldUp()) continue;
        if (await this.holdAtSurface(c)) held.push(c);
      }
      if (held.length > 0) {
        try {
          MessageApi.scene(held[0]!)
            .topic('sense.surroundings')
            .toPeers(Mml.compose`The water is coming in. It lifts ${Mml.actor(held[0]!)} and holds them face-up at the surface.`)
            .send();
        } catch {
          /* decoration */
        }
      }
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
      const open = this.water.depthM + this.levelNow();
      // A basin keeps what its rim holds when the water goes down.
      return Math.max(open, this.water.rimM ?? Number.NEGATIVE_INFINITY);
    }

    public isCutOff(): boolean {
      const rim = this.water?.rimM;
      return rim !== undefined && this.water!.depthM + this.levelNow() < rim;
    }

    public oxygenNowMgL(): number | null {
      if (this.water === null) return null;
      const read = (this as unknown as Shore).peekWaterRead(this.getWaterKey());
      const open = read?.oxygenMgL;
      if (typeof open !== 'number') return null;
      let nowS = 0;
      try {
        nowS = WorldClockApi.getNow().rawValue();
      } catch {
        return open;
      }
      if (!this.isCutOff()) {
        this._cutOffSinceS = null;
        return open;
      }
      // ⭐ Cut off since the ebb left it (load on use: first seen cut off).
      this._cutOffSinceS ??= nowS;
      const hours = Math.max(0, (nowS - this._cutOffSinceS) / 3600);
      const warm = Math.pow(2, (this.waterTemperatureK() - 288) / 10);
      return Math.max(0, open - hours * warm * dial('water.tidepool.o2DecayPerHour', 1));
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
      return { neighbors: [...(this.column.neighbors ?? [])] };
    }

    public setColumn(value: ColumnSpec | null): void {
      const out: ColumnNeighbour[] = [];
      for (const n of value?.neighbors ?? []) {
        if (!n || !(COLUMN_BANDS.includes(n.band) || /^dark-[2-9]\d*$/.test(n.band))) continue;
        if (typeof n.direction !== 'string' || typeof n.destination !== 'string') continue;
        out.push({
          band: n.band,
          direction: n.direction,
          destination: n.destination,
          ...(typeof n.opposite === 'string' ? { opposite: n.opposite } : {}),
        });
      }
      this.column = { neighbors: out };
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
      if (d > lit + minBand) {
        out.push('dark');
        const n = this.darkBandCount(d, lit);
        for (let i = 2; i <= n; i++) out.push(`dark-${i}`);
      }
      out.push('bed');
      return out;
    }

    public bandDepthM(band: ColumnBand): number {
      const d = Math.max(0, this.depthNow());
      const wade = wadeDepthM();
      const lit = Math.min(this.clarityM(), d);
      if (band === 'bed') return d;
      if (band === 'lit') return wade + Math.max(0, lit - wade) / 2;
      // ⭐ The dark between the light's end and the bed, cut into equal
      // bands; this one's middle.
      const n = this.darkBandCount(d, lit);
      const i = band === 'dark' ? 1 : Math.min(n, Math.max(1, Number(band.slice('dark-'.length)) || 1));
      return lit + ((d - lit) / n) * (i - 0.5);
    }

    /**
     * ⭐ How many dark bands a water has (underwater review): about one
     * per `water.column.darkBandM` (an atmosphere, 10 m), never more than
     * `water.column.maxDarkBands` — past the cap the bands thicken.
     */
    private darkBandCount(d: number, lit: number): number {
      const step = dial(AppSettingKeys.waterColumnDarkBandM, DEFAULT_DARK_BAND_M);
      const max = Math.max(1, Math.floor(dial(AppSettingKeys.waterColumnMaxDarkBands, DEFAULT_MAX_DARK_BANDS)));
      return Math.min(max, Math.max(1, Math.round((d - lit) / step)));
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

        public async wayDown(actor: Stuff): Promise<{ exit: Exit } | { reason: string; line: string }> {
      const floor = this.waterFloor();
      if (floor !== null && floor.supportIsSlotted() && floor.supports(actor)) {
        if (!(floor.openWaterAreaM2() > 0)) {
          return { reason: 'no-open-water', line: 'There is no open water here to go down into.' };
        }
        floor.giveWay(actor, true);
      }
      await this.ensureColumnExits();
      const exit = (this as unknown as Stuff & Exitable).getExit('down');
      return exit ? { exit } : { reason: 'no-deeper', line: 'The water is no deeper here.' };
    }

    public wayUp(): { exit: Exit } | { reason: string; line: string } {
      // ⭐ At the top of the water there is no further up (found by the
      // drive): the basin's own `up` is the quay WALL. Out of the water is
      // `climb`, by something you can climb.
      if (this.surfacePlace() === (this as unknown as Stuff)) {
        return { reason: 'at-surface', line: 'You are already at the surface.' };
      }
      const exit = (this as unknown as Stuff & Exitable).getExit('up');
      return exit ? { exit } : { reason: 'at-surface', line: 'You are already at the surface.' };
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

    /**
     * ⭐ Whether a body in this water has its head in the air (river D16).
     * @hook Override on a water something can close over: a river patch
     *   carried under a frozen pool answers `false`, and the breath model
     *   does the rest. Default: `true` — the water place is the surface.
     */
    public headOutAt(occupant: Stuff): boolean {
      void occupant;
      return true;
    }

    /**
     * ⭐ The current takes a body that is not holding against it (river
     * D11): carry it out of this water, downstream.
     * @hook Override on a water with somewhere to sweep you to — a river's
     *   places hand the body to the line at their downstream end. Default:
     *   `false`, a pool has nowhere to sweep you.
     */
    public async sweep(body: Stuff): Promise<boolean> {
      void body;
      return false;
    }

    public async holdAtSurface(body: Stuff): Promise<boolean> {
      const surface = this.surfacePlace();
      if (surface === null || !MixinApi.isContainable(body) || body.isDestroyed()) return false;
      if (body.getContainer() !== surface) ContainmentApi.move(body, surface);
      if (MixinApi.isRespiration(body)) body.holdUp();
      return true;
    }

    public canRise(body: Stuff): VetoResult {
      // ⭐ Held under (D28): a body somebody has grappled goes nowhere —
      // holding a person down is the breath model, not a damage roll.
      const held = CombatApi.sessionFor(body)?.getStates()
        .find((st) => st.combatant === body)?.flags.has('grappled') ?? false;
      if (held) return { ok: false, reason: 'You are held; you cannot get up to the air.' };
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
        // The water place itself is the surface: in it, your head is out —
        // unless something is over the water (a river's ice, D16).
        atSurface: this.headOutAt(occupant),
        temperatureK: this.waterTemperatureK(),
        depthM: 0,
        waterRef: this.water?.of ?? null,
        oxygenMgL: this.oxygenNowMgL(),
        currentMps: this.currentFor(occupant),
        roughness: this.roughnessFor(occupant),
      };
    }

    /**
     * ⭐ The current where `occupant` is in this water, m/s (river D10) —
     * + running downstream. Nothing else in the kernel reads a river.
     * @hook Override on a water that moves: a river place answers from its
     *   line or its author's override. Default: the read's current, which
     *   a still water and a sea pool report as nothing — 0.
     */
    public currentFor(occupant: Stuff): number {
      void occupant;
      const pick = (this as unknown as Shore).waterFor();
      if (!('key' in pick)) return 0;
      const read = (this as unknown as Shore).peekWaterRead(pick.key);
      if (read?.tide && !read.currentMps) return read.tide.streamMps;
      return 0;
    }

    /**
     * ⭐ How broken the water is where `occupant` is, 0–1 (river D10).
     * @hook Override on a water that has white water. Default: 0.
     */
    public roughnessFor(occupant: Stuff): number {
      void occupant;
      return 0;
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
      } else if (this.stateNow() === 'frozen' || this.citedWaterFrozen()) {
        // No floor that holds anyone (or none at all, mid-water): the
        // water's own state says whether it can be swum — a band's state
        // is 'swimming' (under the ice is still water), a pool's is its
        // read.
        return false;
      }
      return super.canEngageAxis(direction);
    }

    /**
     * The one water this place cites (its shore pick) reads frozen — asked
     * only AT the surface: under the ice, a band of the same water is
     * still water to swim in.
     */
    private citedWaterFrozen(): boolean {
      if (this.surfacePlace() !== (this as unknown as Stuff)) return false;
      const pick = (this as unknown as Shore).waterFor();
      return 'key' in pick && (this as unknown as Shore).peekWaterRead(pick.key)?.frozen === true;
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
      void this.reconcileOccupants();
      // ⭐ Over a ship's side (river D30): she keeps who went into the water
      // off her, and her `course` waits for them. By shape — a `Ship`'s
      // `noteOverboard` — so the water does not import the ship.
      const fromPath = via?.getSource?.()?.getTemplatePath?.() ?? '';
      const ship = fromPath ? NavigationApi.structureAtNow(fromPath) : null;
      (ship as unknown as { noteOverboard?(who: Stuff): void } | null)?.noteOverboard?.(mover);
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
      // ⭐ Or out by something you can climb (underwater 8b, found by the
      // drive): the quay steps. The climb mode's own gate is what asks
      // whether there is anything here to climb — the wall beside them
      // refuses, the steps do not.
      if (mover.getEngagedMode()?.getName() === 'climb') return { ok: true };
      return { ok: false, reason: 'You are in the water; swim for it.' };
    }

    /* ─────────────────────────── what goes down ─────────────────────────── */

    /**
     * A load change — a thing dropped or taken — reconciles who the floor
     * bears; in open water, what sinks goes down.
     */
    public onContainableAdded(thing: Stuff & Containable): void {
      (Base.prototype as { onContainableAdded?: (t: unknown) => void }).onContainableAdded?.call(this, thing);
      // ⭐ The way down exists the moment anybody is in the water — walked
      // in, swum in, or restored here after a restart (the browser walk:
      // `swim down` found no `down`, and a diver restored at the surface
      // saw only `up`, until somebody had used `descend`). Load on use —
      // the use is being here.
      if (thing.isAgent?.()) void this.ensureColumnExits().catch(() => {});
      const floor = this.waterFloor();
      floor?.reconcileSupport();
      try {
        this._arrivals.set(thing.stuffId, WorldClockApi.getNow().rawValue());
      } catch {
        /* no clock (a unit world): arrival unknown */
      }
      // ⭐ Into the water (underwater D29 seams 1, 2, 4): whatever arrives
      // in it, and everything it carries, is wet through; whatever was
      // burning is out; an open empty vessel fills with the water.
      if (BiomeApi.mediumFor(thing).immersed) void this.immerseArrival(thing);
      // Open water (nothing underfoot bears even an empty load — or, in
      // mid-water, nothing underfoot at all): a dense thing goes straight
      // down. On ice it lies on the ice until the thaw. Deferred a tick:
      // never move a thing from inside the hook of its own arrival.
      const unborne = floor === null || (floor.supportIsSlotted() && !floor.bears(0));
      if (unborne && this.sinks(thing)) {
        void Promise.resolve().then(() => this.sink(thing));
      }
    }

    /** Wet, douse and fill what has gone into the water, and what it carries. */
    private async immerseArrival(thing: Stuff): Promise<void> {
      const seen = new Set<string>();
      const walk = async (s: Stuff, depth: number): Promise<void> => {
        if (depth > 8 || seen.has(s.stuffId) || s.isDestroyed()) return;
        seen.add(s.stuffId);
        if (MixinApi.isBurner(s) || MixinApi.isCombustible(s)) s.douse();
        if (MixinApi.isAttired(s)) s.immerse();
        else if (MixinApi.isWet(s)) s.wet(1);
        if (MixinApi.isBulkable(s) && depth > 0) await this.fillOpenVessel(s);
        // ⭐ An air pocket (a bell) keeps the water out of what it holds.
        const ownAir = MixinApi.isAtmospheric(s) ? s.getInlineAtmosphere() : null;
        if (MixinApi.isContainer(s) && (ownAir === null || ownAir === 'water')) {
          for (const c of [...s.getContents()]) await walk(c, depth + 1);
        }
      };
      // The arriving thing itself fills too when it is a loose vessel.
      if (MixinApi.isBulkable(thing)) await this.fillOpenVessel(thing);
      await walk(thing, 0);
    }

    /** An open, empty vessel takes the water it is in. */
    private async fillOpenVessel(vessel: Stuff): Promise<void> {
      try {
        if (MixinApi.isSealable(vessel) && !vessel.isOpen()) return;
        const to = BulkableApi.slotFor(vessel);
        if (to === null || !to.isEmpty()) return;
        const from = BulkableApi.slotFor(this as unknown as Stuff);
        await from?.settle();
        if (from === null || from.isEmpty()) return;
        const remaining = to.remaining();
        BulkableApi.transfer(from, to, Number.isFinite(remaining)
          ? { kind: 'measure', litres: remaining, mode: 'lenient' }
          : { kind: 'all' });
      } catch {
        // A vessel that will not take water simply stays dry.
      }
    }

    public onContainableRemoved(thing: Stuff & Containable): void {
      (Base.prototype as { onContainableRemoved?: (t: unknown) => void }).onContainableRemoved?.call(this, thing);
      this._arrivals.delete(thing.stuffId);
      this.waterFloor()?.reconcileSupport();
    }

    public sinks(thing: Stuff): boolean {
      if (thing.isAgent?.() || MixinApi.isMobile(thing)) return false;
      // ⭐ A body full of the gas of its own decay floats (river D27).
      if ((thing as unknown as { buoyantNow?(): boolean }).buoyantNow?.() === true) return false;
      if (!MixinApi.isTangible(thing)) return false;
      if (MixinApi.isContainable(thing) && thing.isFixedInPlace?.()) return false;
      // ⭐ Held up by something in the same water (an air bag lashed to
      // it — the run-34 drive: the anchor came up and went straight back
      // down). The buoy says so; the place cannot know a pack's thing.
      const here = MixinApi.isContainable(thing) ? thing.getContainer() : null;
      if (here !== null && MixinApi.isContainer(here) &&
          here.getContents().some((c) => (c as Stuff) !== thing && MixinApi.isBuoy(c) && c.buoys(thing))) {
        return false;
      }
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

/** Half a lunar day, game-seconds: high water to high water (a 30-day month). */
const HALF_LUNAR_DAY_S = (86_400 * 30) / 29 / 2;

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

