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

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import type { MarkupAugmenter } from '../../api/mml';

/** The player-facing wetness band (presentation, never a raw number). */
export type WetnessBand = 'dry' | 'damp' | 'wet' | 'soaked';

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

  // Public so the Hydrator can reflect into them; in-class code reads them
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

    static persistentFields = ['_saturation', 'wetnessClockStamp'];

    /** Derived wetness band line appended to the host's long description. */
    static markupAugmenters: MarkupAugmenter[] = [wetnessAugmenter];

    /** Saturation `[0, 1]`; `0` = bone dry (the sparse default). */
    public _saturation = 0;
    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public wetnessClockStamp = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingWet = false;

    // ---------- reads ----------

    public getWetness(): number {
      if (!this._reconcilingWet) this.reconcileWetness();
      return clamp01(this._saturation);
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

      // Linkdead freeze — the body lingers but its clock is paused.
      const self = this as unknown as Stuff;
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.wetnessClockStamp = nowS;
        return;
      }

      const elapsed = nowS - this.wetnessClockStamp;
      if (elapsed <= 0) {
        this.wetnessClockStamp = nowS;
        return;
      }
      // Far-past guard: a gap this long is absence — drop it.
      if (elapsed > WET_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
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
        const rate = this.dryRatePerHour() * this.warmthMultiplier();
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
     * Drying accelerant from the object's own temperature (sync): warmer
     * than the reference dries faster; at or below it, neutral. Reads the
     * cached Thermal ambient — no async, no I/O.
     */
    private warmthMultiplier(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isThermal(self)) return 1;
      try {
        const tempK = self.getTemperature().rawValue();
        const refK = dial(AppSettingKeys.wetnessWarmthReferenceK, 295);
        const factor = dial(AppSettingKeys.wetnessWarmthFactor, 0.03);
        const excess = tempK - refK;
        return excess > 0 ? 1 + excess * factor : 1;
      } catch {
        return 1;
      }
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
