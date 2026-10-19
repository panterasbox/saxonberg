/**
 * WetMixin — the cross-cutting **wetness** gauge (weather Wave 2).
 *
 * Any physical object — a cloak, firewood, a body — can be *wet*, tracked
 * as a per-object **stored, decaying saturation** in `[0, 1]`. This is the
 * upgrade the electricity build flagged over its derived `isRainWet`
 * stopgap: a real gauge, source-indifferent (rain, procgen or authored, and
 * immersion feed the same number), banded for the player (`damp` / `wet` /
 * `soaked`) with a real value underneath.
 *
 * **Not `ReservedMixin` reuse.** Not because `Reserve` is biological — it
 * is a **neutral** capacity axis, as `lib/reserve.ts` says outright, and its
 * landscape table already lists non-creature consumers (`fuel` on a
 * campfire, `air` in a Location, `moisture` on a cultivated plant). Wetness
 * skips it because a single unbounded `[0,1]` saturation needs no keyed
 * collection: it borrows only the *decomposed-scalar persistence shape* —
 * two plain scalar fields, no keyed map, no marshaller — so it rides onto a
 * plain `Thing` without the reserve's Record-of-reserves machinery.
 *
 * **Drainage is reconcile-on-read; accrual is pushed.** The gauge dries on
 * read over elapsed game-time, presence-frozen (the metabolism / harm /
 * electricity-sustain idiom — no tick). Accrual can't run in the sync
 * getter because "is it raining here" is an async resolve
 * (`WeatherApi.resolveWeatherFor`), so exposure/immersion *push*
 * `wet(delta)` from their async contexts (the presence-gated weather
 * boundary fan-out; the electricity co-immersion path). "Shelter dries
 * faster" emerges: a sheltered object receives no accrual push, so the
 * reconcile's drain wins. Warmth accelerates the drain via the object's
 * own sync Thermal reading.
 *
 * Storage is sparse: a dry object is two scalar fields at their defaults
 * (`0` saturation, `0` clock stamp), the `AtmosphericMixin` null-slot
 * discipline.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import type { MarkupAugmenter } from '../../api/mml';
import { Evaporation } from '../material/Evaporation';

/** The player-facing wetness band (presentation, never a raw number). */
export type WetnessBand = 'dry' | 'damp' | 'wet' | 'soaked';

/** What `Wet.soakUp` did — the verb words it. */
export type SoakOutcome =
  | { ok: true; movedKg: number; left: WetnessBand; cloth: WetnessBand }
  | { ok: false; reason: 'not-wet' | 'already-dry' | 'cloth-sodden' };

/** Wetness dials with seeded-literal fallbacks (pre-warm / test safe). */
const WET_DEFAULTS = {
  /** A gap longer than this means absence (logout/relog) — drop it. */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,
  SECONDS_PER_HOUR: 3600,
} as const;

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export interface Wet {
  /** Current saturation `[0, 1]` (reconciles the drain on read). */
  getWetness(): number;
  /**
   * ⭐ Game-hours until it is no longer damp, in the air it is in NOW — the
   * closed form of the same rate the reconcile integrates (B56), so the
   * forecast and the drying can never disagree. `0` when already dry;
   * `null` when it will not dry here (saturated air, shut away). The verb
   * words it; the air will change, so it is a forecast.
   */
  dryingHours(): number | null;
  /**
   * How much water this holds when soaked, kg — its material's absorption
   * capacity × its mass. A body overrides it with its skin film; a cloth
   * with its weave (`Cloth.absorbency`).
   */
  waterCapacityKg(): number;
  /**
   * ⭐ Rub `from` with this — a towel, a rag, a shirt in a pinch (B56):
   * water moves out of `from` into this, as much as this has room for.
   * The act `dry <thing> with <cloth>` calls; the outcome is returned for
   * the verb to word.
   */
  soakUp(from: Stuff): SoakOutcome;
  /** Current banded wetness (presentation). */
  getWetnessBand(): WetnessBand;
  /**
   * Push a saturation delta (accrual). Reconciles the elapsed drain first
   * so accrual composes with drying, then clamps into `[0, 1]`. Called by
   * the rain-exposure fan-out and the electricity co-immersion path.
   */
  wet(delta: number): void;
  /** Reconcile the elapsed drain (sync, presence-frozen). */
  reconcileWetness(): void;

  // Public so the applier can reflect into them; in-class code reads them
  // directly. Not the inter-Stuff contract (that's the method surface).
  _saturation: number;
  wetnessClockStamp: number;
}

/** The player-facing phrase for a non-dry band (presence affix, never dry). */
const WETNESS_PHRASE: Record<Exclude<WetnessBand, 'dry'>, string> = {
  damp: 'It is damp.',
  wet: 'It is wet.',
  soaked: 'It is soaked through.',
};

/**
 * Append a wetness band line to a wet host's long description — band only,
 * never a raw number (the banding-is-presentation rule). A dry object says
 * nothing. Reads through the reconcile-on-read getter, so a linkdead / dried
 * object reads truthfully.
 */
function wetnessAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isWet(host)) return text;
  const band = (host as unknown as Wet).getWetnessBand();
  if (band === 'dry') return text;
  const line = WETNESS_PHRASE[band];
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function WetMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class WetMixin extends Base implements Wet {
    static _mixinName = 'WetMixin';

    static fieldMeta: FieldMeta = {
      _saturation: { persistent: true },
      wetnessClockStamp: { persistent: true },
    };

    /** Derived wetness band line appended to the host's long description. */
    static markupAugmenters: MarkupAugmenter[] = [wetnessAugmenter];

    /** Saturation `[0, 1]`; `0` = bone dry (the sparse default). */
    public _saturation = 0;
    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public wetnessClockStamp = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingWet = false;

    // ---------- reads ----------

    public dryingHours(): number | null {
      const s = this.getWetness();
      const dampAt = dial(AppSettingKeys.wetnessBandDampAt, 0.15);
      if (s < dampAt) return 0;
      const rate =
        this.dryRatePerHour() *
        this.airDryingFactor() *
        this.airReach(this.interactiveHolder() !== null);
      if (!(rate > 0)) return null;
      return (s - dampAt) / rate;
    }

    public getWetness(): number {
      if (!this._reconcilingWet) this.reconcileWetness();
      return clamp01(this._saturation);
    }

    public waterCapacityKg(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return 0;
      const massKg = self.getMass().rawValue();
      const mat = self.getMaterial();
      const pct = mat
        ? mat.getWaterAbsorptionCapacity().rawValue()
        : dial(AppSettingKeys.wetnessAbsorptionCapacityDefaultPct, 5);
      return Math.max(0, massKg * pct) / 100;
    }

    public soakUp(from: Stuff): SoakOutcome {
      if (!MixinApi.isWet(from)) return { ok: false, reason: 'not-wet' };
      const fromCap = from.waterCapacityKg();
      const held = from.getWetness() * fromCap;
      if (!(held > 0.001)) return { ok: false, reason: 'already-dry' };
      const cap = this.waterCapacityKg();
      const free = (1 - this.getWetness()) * cap;
      if (!(free > 0.001)) return { ok: false, reason: 'cloth-sodden' };
      // Rubbing never takes the last of it: the film left is the share
      // a dial keeps (`wetness.blotTakes`, 0.9).
      const moved = Math.min(held, free) * clamp01(dial(AppSettingKeys.wetnessBlotTakes, 0.9));
      from.wet(-moved / fromCap);
      this.wet(moved / cap);
      return {
        ok: true,
        movedKg: moved,
        left: from.getWetnessBand(),
        cloth: this.getWetnessBand(),
      };
    }

    public getWetnessBand(): WetnessBand {
      const s = this.getWetness();
      if (s >= dial(AppSettingKeys.wetnessBandSoakedAt, 0.8)) return 'soaked';
      if (s >= dial(AppSettingKeys.wetnessBandWetAt, 0.45)) return 'wet';
      if (s >= dial(AppSettingKeys.wetnessBandDampAt, 0.15)) return 'damp';
      return 'dry';
    }

    // ---------- accrual (pushed) ----------

    public wet(delta: number): void {
      if (!Number.isFinite(delta)) return;
      // Reconcile the elapsed drain first, then add — so a rain push each
      // segment nets accrual against the drying that happened in between.
      if (!this._reconcilingWet) this.reconcileWetness();
      this._saturation = clamp01(this._saturation + delta);
    }

    // ---------- reconcile-on-read (the lazy drain) ----------

    /**
     * Dry over elapsed in-session game-time since the last reconcile.
     * Freezes on absence (linkdead / logout via the far-past guard) — real
     * absence never dries you — and no-ops when too little time has passed
     * or no world clock is running. Warmth (the object's own Thermal
     * temperature above the reference) accelerates the drain.
     */
    public reconcileWetness(): void {
      if (this._reconcilingWet) return;

      const nowS = this.wetnessNowSeconds();
      if (nowS === null) return;

      // First touch: seed the stamp; integrate nothing from epoch.
      if (this.wetnessClockStamp === 0) {
        this.wetnessClockStamp = nowS;
        return;
      }

      // ⭐ The absence rules are a BODY's (cleanliness D11): they apply when
      // this thing is a person or is held by one — worn or carried, up the
      // holder chain — so a logged-out swimmer and the shirt on her stay
      // as they were, together. A shirt on a line, a heap of sawdust, a
      // dropped cloak has no absence to honour: it dries over its whole gap.
      const self = this as unknown as Stuff;
      const body = this.interactiveHolder();

      // Linkdead freeze — the body lingers but its clock is paused.
      if (body !== null && body.isLinkdead()) {
        this.wetnessClockStamp = nowS;
        return;
      }

      const elapsed = nowS - this.wetnessClockStamp;
      if (elapsed <= 0) {
        this.wetnessClockStamp = nowS;
        return;
      }
      // Far-past guard: on a body a gap this long is absence — drop it.
      if (body !== null && elapsed > WET_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.wetnessClockStamp = nowS;
        return;
      }

      // Nothing to dry — cheap out, but still advance the stamp.
      if (this._saturation <= 0) {
        this.wetnessClockStamp = nowS;
        return;
      }

      this._reconcilingWet = true;
      try {
        const hours = elapsed / WET_DEFAULTS.SECONDS_PER_HOUR;
        const rate =
          this.dryRatePerHour() *
          this.airDryingFactor() *
          this.airReach(body !== null);
        this._saturation = clamp01(this._saturation - rate * hours);
        this.wetnessClockStamp = nowS;
      } finally {
        this._reconcilingWet = false;
      }
    }

    /**
     * The material-driven dry rate (saturation lost per game-hour), derived
     * from real evaporation physics rather than a fudge factor. Evaporation
     * removes a roughly fixed water *mass* per hour
     * (`wetness.evaporationRatePct`, in % of dry mass); a material that holds
     * more water at saturation (`Material.waterAbsorptionCapacity`, a real
     * `%` — wool ≈ 33, steel ≈ 0) therefore loses saturation *slower*:
     * `ds/dt = evaporationRate / capacity`. So wet wool lingers and a wet
     * blade sheds at once, emergent from a tabulated number. The capacity is
     * floored so a near-zero (metal / glass) material dries fast but finitely,
     * never instantly; a materialless object reads the neutral default.
     */
    private dryRatePerHour(): number {
      const evapPct = dial(AppSettingKeys.wetnessEvaporationRatePct, 1.25);
      let capacityPct = dial(
        AppSettingKeys.wetnessAbsorptionCapacityDefaultPct,
        5,
      );
      const self = this as unknown as Stuff;
      if (MixinApi.isTangible(self)) {
        const mat = self.getMaterial();
        if (mat) capacityPct = mat.getWaterAbsorptionCapacity().rawValue();
      }
      const CAPACITY_FLOOR_PCT = 0.1;
      const cap =
        capacityPct < CAPACITY_FLOOR_PCT ? CAPACITY_FLOOR_PCT : capacityPct;
      return evapPct / cap;
    }

    /**
     * ⭐⭐ **The air's say in drying — one law** (B56). The air this thing
     * is in (`Atmospheric.getAir`: the room, or the vessel it is shut in)
     * as an {@link Evaporation} — the humidity deficit, the wind, and the
     * heat of the MATTER (its own temperature: by the fire it dries fast)
     * — over still indoor air at the reference humidity, so ordinary
     * indoor drying is the material rate itself. `0` in saturated air and
     * shut away in something that is not air at all (a pack, a chest).
     */
    private airDryingFactor(): number {
      const around = this.airAround();
      if (around === null) return 0;
      const refRh = dial(AppSettingKeys.wetnessReferenceHumidityPct, 50);
      const air = around === 'reference' ? new Evaporation(refRh, 0, 293) : around;
      const self = this as unknown as Stuff;
      let tempK = air.tempK;
      if (MixinApi.isThermal(self)) {
        try {
          tempK = self.getTemperature().rawValue();
        } catch {
          // keep the air's
        }
      }
      const here = new Evaporation(air.humidityPct, air.windMs, tempK).evaporationFactor();
      const ref = new Evaporation(refRh, 0, 293).evaporationFactor();
      return ref > 0 ? here / ref : here;
    }

    /**
     * The air that reaches it: worn or carried, the air its bearer stands
     * in; otherwise its own container's, if that is air (a room, a
     * vessel). `null` shut in something that is not (a chest, a pack);
     * `'reference'` in nothing at all, or a bearer standing nowhere.
     */
    private airAround(): Evaporation | 'reference' | null {
      const self = this as unknown as Stuff;
      let at: Stuff | null = MixinApi.isContainable(self) ? self.getContainer() : null;
      // In nothing at all (being made, a test bench): the reference air.
      if (at === null) return 'reference';
      for (let hops = 0; at && hops < 16; hops++) {
        if (MixinApi.isAtmospheric(at)) return at.getAir();
        if (!at.isAgent()) return null;
        at = MixinApi.isContainable(at) ? at.getContainer() : null;
      }
      return 'reference';
    }

    /**
     * ⭐ How much of a thing the air reaches, against lying on the ground
     * (cleanliness D11): hung on a rack or a line it dries by the support's
     * own `airExposure` over the ground's share; worn, carried, or lying
     * about it dries at the plain rate.
     */
    private airReach(held: boolean): number {
      const self = this as unknown as Stuff;
      if (held || !MixinApi.isContainable(self)) return 1;
      const support = self.getPlacement()?.host ?? null;
      if (support === null) return 1;
      const ground = dial(AppSettingKeys.cureGroundExposure, 0.35);
      const reach = ground > 0 ? support.getAirExposure() / ground : 1;
      return Math.max(1, reach);
    }

    /**
     * The person this thing is, or is held by — walked up the holder chain
     * (a shirt on a body, a flask in a pack on a body). `null` when nobody
     * holds it: on a line, on a floor, in a room.
     */
    private interactiveHolder(): (Stuff & { isLinkdead(): boolean }) | null {
      let cur: Stuff | null = this as unknown as Stuff;
      for (let hops = 0; cur && hops < 16; hops++) {
        if (MixinApi.isHasInteractive(cur)) return cur;
        cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
      }
      return null;
    }

    /** Game-seconds now, or `null` when no world clock (pre-boot / tests). */
    private wetnessNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
