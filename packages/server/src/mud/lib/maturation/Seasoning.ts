/**
 * SeasoningMixin — converted wood that DRIES over time, at its species'
 * rate, in the air it stands in (assembly D2, AC 19).
 *
 * The second host of the maturation clock (`MaturationClock`): the same
 * stall-below / happy / damage-above curve, read over a different host. A
 * `MaturingMixin` vessel matures a BATCH in its interior slot; a stack of
 * boards has no slot and no batch — it has a material that gives up water
 * to the air. So this owns one fraction, `seasonedFraction` (0 green → 1
 * seasoned), and reconciles it on read over the air segments it slept
 * through: `BiomeApi.airSegmentsFor`, the evaporative mechanism's read,
 * walked segment by segment because a dry week and a wet one do opposite
 * things and their average does neither.
 *
 * - **The rate** is the species' (`Material.seasoningDays` — oak a year,
 *   pine half that) times how hard THIS air is drying it, against good
 *   drying air: `Evaporation.evaporationFactor` with wood's equilibrium
 *   (it stops drying in air near saturation — a damp shed seasons nothing),
 *   times the clock's temperature curve (nothing below freezing).
 * - ⭐ **Rain sets it back** on a stack in the open (a segment's rain is
 *   0 indoors) — the evaporative precedent, *"rain reverses it"*.
 * - ⭐ **Too hot is damage** — a board dried hard checks and splits. The
 *   worst stretch is kept; grade reads cap at it, the clock's band rule.
 * - **Vacuous** on a material with `seasoningDays 0`: it is neither green
 *   nor seasoned, and every read answers as though the mixin were absent.
 *
 * ⭐ **A merge takes the greener** (`onMerged`): weakest-link doctrine
 * applied to time. A dry stack poured onto a green one loses its lead.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { BiomeApi } from '../../api/biome';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Stuff } from '../stuff/Stuff';
import type Material from '../material/Material';
import { Evaporation } from '../material/Evaporation';
import { Grade } from '../craft/Grade';
import {
  MaturationClock,
  SECONDS_PER_GAME_DAY,
  type ClockProfile,
} from './MaturationClock';
import type { MarkupAugmenter } from '../../api/mml';

/** Relative humidity (%) wood stops drying at — its equilibrium. */
const WOOD_EQUILIBRIUM_RH_PCT = 85;

/** Good drying air: what `seasoningDays` is quoted against. */
const REFERENCE_AIR = new Evaporation(55, 2, 290);

/** Seasoned fraction lost per mm of rain on a stack in the open. Grain. */
const REWET_PER_MM = 0.002;

/** The clock curve seasoning runs on — kernel constants (assembly D2). */
const SEASONING_CURVE: ClockProfile = {
  getStallBelowK: () => 273,
  getHappyK: () => 290,
  // Dried too hot, wood checks: a kiln run carelessly ruins boards.
  getDamageAboveK: () => 330,
  getRatePerDay: () => 1,
  getStallAboveK: () => null,
};

export interface Seasoning {
  /** 0 green → 1 seasoned. Reconciles first. `0` for a non-seasoning material. */
  getSeasonedFraction(): number;
  /** Seasoned enough to work without warping (≥ `wood.seasonedThreshold`). */
  isSeasoned(): boolean;
  /** Would warp if worked now. Always false for a material that does not season. */
  isGreen(): boolean;
  /** Was it quarter-sawn (cut radially — stabler, fewer boards)? */
  isQuarterSawn(): boolean;
  /**
   * Has it CUPPED — a flat-sawn (through-sawn) piece that has dried, its
   * face gone hollow across the width because the rings run across it and
   * wood shrinks more along a ring than through one. Derived, never
   * stored: sawn, not quarter-sawn, and seasoned. A quartered board, a
   * riven one, and a green one have not.
   */
  isCupped(): boolean;
  /** Set the seasoned fraction directly (a mint, a test, a sale of dry stock). */
  setSeasonedFraction(f: number): void;
}

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

function seasoningAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isSeasoning(host)) return text;
  const days = MixinApi.isTangible(host)
    ? (host.getMaterial()?.getSeasoningDays() ?? 0)
    : 0;
  if (days <= 0) return text;
  const f = host.getSeasonedFraction();
  // In words — the no-gauge rule. You read wood by its weight and its
  // ends, not off a number.
  const line =
    f >= 0.95
      ? 'It is well seasoned — light in the hand and dry at the ends.'
      : host.isSeasoned()
        ? 'It is seasoned enough to work.'
        : f >= 0.4
          ? 'It is still drying; worked now, it would move.'
          : f >= 0.15
            ? 'It has begun to dry — lighter than it was, the end grain paling — but it is still green.'
            : 'It is green — heavy, cool, and wet at the end grain.';
  const grain = grainLine(host);
  const both = grain ? `${grain} ${line}` : line;
  return text && text.length > 0 ? `${text}\n\n${both}` : both;
}

/**
 * ⭐ How it was opened, read off the end grain — in words, because it is
 * the trade's whole lesson and a player must be able to SEE it: riven
 * stock does not snap across (the fibres were followed), sawn stock has
 * them cut; a through-sawn board cups as it dries, a quartered one stays
 * flat. `''` for a piece with no stock form.
 */
function grainLine(host: Stuff & Seasoning): string {
  if (!MixinApi.isConstructed(host)) return '';
  switch (host.getConstructionForm()) {
    case 'riven':
      return 'It was split along the grain, and the fibres run unbroken the length of it.';
    case 'hewn':
      return 'It was hewn with an axe — along the grain mostly, torn in places.';
    case 'sawn':
      if (host.isQuarterSawn()) {
        return 'It was sawn on the quarter: the rings run straight through it, edge to edge, and it has stayed flat.';
      }
      return host.isCupped()
        ? 'It was sawn through: the rings arc across its end, and as it dried its face has cupped hollow.'
        : 'It was sawn through: the rings arc across its end, and it will cup as it dries.';
    default:
      return '';
  }
}

export function SeasoningMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SeasoningMixin extends Base implements Seasoning {
    static _mixinName: string = 'SeasoningMixin';

    static markupAugmenters: MarkupAugmenter[] = [seasoningAugmenter];

    static fieldMeta: FieldMeta = {
      seasonedFraction: { persistent: true, runtimeState: true, authorable: true },
      seasonClockStamp: { persistent: true, runtimeState: true },
      seasonWorst: { persistent: true, runtimeState: true },
      // A quarter-sawn board and a through-sawn one do not merge.
      quarterSawn: { persistent: true, runtimeState: true, authorable: true, stackIdentity: true },
    };

    public seasonedFraction = 0;
    public seasonClockStamp = 0;
    public seasonWorst = 1;
    public quarterSawn = false;

    private seasoningDaysOf(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return 0;
      const m = self.getMaterial() as Material | null;
      return m ? m.getSeasoningDays() : 0;
    }

    /** Integrate the fraction over the air since the last read. */
    private reconcileSeasoning(): void {
      const days = this.seasoningDaysOf();
      const nowS = WorldClockApi.getNow().rawValue();
      if (days <= 0 || this.seasonedFraction >= 1) {
        this.seasonClockStamp = nowS;
        return;
      }
      if (this.seasonClockStamp === 0 || nowS <= this.seasonClockStamp) {
        this.seasonClockStamp = nowS;
        return;
      }
      const self = this as unknown as Stuff;
      // The air of whatever this stands in — a yard, a loft, a shed. ⭐ The
      // ENCLOSING scope, not the container: a stack placed `in` a chamber
      // (a drying loft) has `container = the room` and enclosing scope =
      // the chamber, and it is the chamber's air that dries it. Off a
      // placement — or under one that does not enclose (`on` a rack) — the
      // enclosing scope IS the container, so nothing else changes. The
      // walk steps out until something holds things or has air of its own.
      let scope: Stuff | null = MixinApi.isContainable(self)
        ? self.getEnclosingScope()
        : null;
      while (
        scope !== null &&
        !MixinApi.isContainer(scope) &&
        !MixinApi.isAtmospheric(scope)
      ) {
        scope = MixinApi.isContainable(scope) ? scope.getEnclosingScope() : null;
      }
      if (scope === null) {
        this.seasonClockStamp = nowS;
        return;
      }
      const reference = REFERENCE_AIR.evaporationFactor(WOOD_EQUILIBRIUM_RH_PCT);
      let f = this.seasonedFraction;
      let worst = this.seasonWorst;
      let segments: ReturnType<typeof BiomeApi.airSegmentsFor> = [];
      try {
        segments = BiomeApi.airSegmentsFor(scope, this.seasonClockStamp, nowS);
      } catch {
        segments = [];
      }
      for (const seg of segments) {
        if (!(seg.durationS > 0)) continue;
        const segDays = seg.durationS / SECONDS_PER_GAME_DAY;
        const temp = MaturationClock.rateAt(SEASONING_CURVE, seg.air.tempK);
        const drying = reference > 0 ? seg.air.evaporationFactor(WOOD_EQUILIBRIUM_RH_PCT) / reference : 0;
        f = Math.min(1, f + (temp * drying * segDays) / days);
        const sat = MaturationClock.damageSat(SEASONING_CURVE, seg.air.tempK);
        if (sat < worst) worst = sat;
        if (seg.rainMmPerH > 0) {
          const mm = seg.rainMmPerH * (seg.durationS / 3600);
          f = Math.max(0, f - mm * REWET_PER_MM);
        }
      }
      this.seasonedFraction = f;
      this.seasonWorst = worst;
      this.seasonClockStamp = nowS;
    }

    getSeasonedFraction(): number {
      if (this.seasoningDaysOf() <= 0) return 0;
      this.reconcileSeasoning();
      return this.seasonedFraction;
    }

    isSeasoned(): boolean {
      if (this.seasoningDaysOf() <= 0) return false;
      return this.getSeasonedFraction() >= dial(AppSettingKeys.woodSeasonedThreshold, 0.8);
    }

    isGreen(): boolean {
      if (this.seasoningDaysOf() <= 0) return false;
      return !this.isSeasoned();
    }

    isQuarterSawn(): boolean {
      return this.quarterSawn;
    }

    isCupped(): boolean {
      if (this.quarterSawn || !this.isSeasoned()) return false;
      const self = this as unknown as Stuff;
      return MixinApi.isConstructed(self) && self.getConstructionForm() === 'sawn';
    }

    setSeasonedFraction(f: number): void {
      this.seasonedFraction = Math.max(0, Math.min(1, Number(f) || 0));
      this.seasonClockStamp = WorldClockApi.getNow().rawValue();
    }

    /**
     * ⭐ Dried too hot, it checks: the grade reads no better than the worst
     * stretch earned (the clock's band rule) — the board is what it went
     * through. A board that never ran hot is unaffected.
     */
    getGrade(): Grade {
      const base = (Base.prototype as unknown as { getGrade?: () => Grade }).getGrade;
      const g = base ? base.call(this) : Grade.of('fair');
      if (this.seasoningDaysOf() <= 0) return g;
      this.reconcileSeasoning();
      return this.seasonWorst < 1 ? g.min(Grade.of(MaturationClock.bandFor(this.seasonWorst))) : g;
    }

    /**
     * The absorbed lot's seasoned fraction, stashed by {@link canMergeWith}
     * — the merge destructs the absorbed stack BEFORE `onMerged` fires, so
     * that hook cannot read it (the `Ore` precedent). Keyed on stuffId and
     * cleared on use, so a probe that never merges cannot leak.
     */
    private _absorbingSeason: { stuffId: string; fraction: number } | null = null;

    canMergeWith(other: Stuff): boolean {
      const base = (Base.prototype as unknown as { canMergeWith?: (o: Stuff) => boolean })
        .canMergeWith;
      const ok = base ? base.call(this, other) : true;
      this._absorbingSeason =
        ok && MixinApi.isSeasoning(other)
          ? { stuffId: other.stuffId, fraction: other.getSeasonedFraction() }
          : null;
      return ok;
    }

    /** A merge takes the greener — weakest-link, applied to time. */
    onMerged(absorbed: Stuff): void {
      const stashed = this._absorbingSeason;
      this._absorbingSeason = null;
      this.reconcileSeasoning();
      if (stashed !== null && stashed.stuffId === absorbed.stuffId) {
        this.seasonedFraction = Math.min(this.seasonedFraction, stashed.fraction);
      }
      const base = (Base.prototype as unknown as { onMerged?: (a: Stuff) => void }).onMerged;
      if (base) base.call(this, absorbed);
    }
  };
}
