/**
 * RearingMixin — ⭐⭐ a rearing of silkworms, carried by the TRAY it is on.
 *
 * The worm is below the resolution anything in this game acts at: you do
 * not pick one up, name one or feed one. What a keeper deals with is a
 * tray of them — how old they are, whether they are eating, whether they
 * are asleep for a moult, whether they have started to wander looking for
 * somewhere to spin. So the population is the tray's state, exactly as a
 * colony of bees is the hive's (apiculture's `ColonyMixin` is the shape:
 * population-as-body, reconcile-on-read, no far-past guard), and nothing
 * here mints a "rearing" object.
 *
 * ## ⭐ The clock is warmth, not days
 *
 * A worm ages by **degree-days**: each game day adds how far the tray
 * stood above the base temperature, so a warm loft rears a crop in a
 * month and a cold kitchen in two. The tray is `Thermal`, so the clock
 * integrates the tray's own temperature trajectory — a tray carried from
 * a cold yard into a warm room speeds up from the moment it arrives, and
 * a tray left unlooked-at for a week is brought current at the next read
 * with every hour it spent cold counted as cold.
 *
 * ⭐ **Feeding limits the clock, softly.** Leaf is contents: `put leaf in
 * tray`. Each window the worms want a share of leaf that depends on their
 * age (the fifth age eats three quarters of everything a worm ever eats),
 * take it from the leaf on the tray, freshest-weighted, and age at
 * `0.5 + 0.5 × satisfaction` of the warm rate. ⚠ **Hunger never kills.**
 * An underfed tray is slower and spins lighter cocoons; that is the whole
 * of the penalty, because a rule that killed a hobbyist's tray for a
 * missed evening would turn a craft into a chore.
 *
 * ## ⭐⭐ The disease no sense reports
 *
 * `pebrineLoad` is SEEDED on the egg lot (the provenance lesson: a
 * grainer's clean eggs and a cheap lot off a spotted tray look the same)
 * and nothing reads it out — not `look`, not `handle`, not the wiki. It
 * shows itself the way it did to the growers of 1850: a heavily infected
 * tray eats poorly, is peppered with dark specks by its fourth age, and
 * dies at the start of its fifth. A light load spins fewer cocoons and
 * passes itself on through the moths' eggs. Uncertainty provenance:
 * generative (what the lot IS), never a draw at the act.
 *
 * ## The end of a rearing
 *
 * At the end of the fifth age the worms wander; a mounting brush on the
 * tray gives them somewhere to climb (without one they spin a day late, on
 * the tray floor, and lighter). Three game days later the tray holds three
 * stacks of cocoons sorted by heft — the selection the breeder's equation
 * needs — and a sack of frass, and the rearing is over.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { TrajectorySample } from '@saxonberg/server/mud/lib/Trajectory';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';

export const REARING_MIXIN = 'RearingMixin';

/** The Discipline this trade credits. */
export const SERICULTURE = 'sericulture';

const SECONDS_PER_GAME_DAY = 86_400;
const SUB_STEPS = 8;

/**
 * Where a rearing is. `empty` and `collapsed` hold no live worms; the rest
 * are a living tray in order.
 */
export type RearingState =
  | 'empty'
  | 'eggs'
  | 'feeding'
  | 'wandering'
  | 'spinning'
  | 'collapsed';

const LIVE: ReadonlySet<RearingState> = new Set(['eggs', 'feeding', 'wandering', 'spinning']);

/** The three heft stacks a rearing ends in. */
export type HeftBand = 'heavy' | 'middling' | 'light';

/** What a cocoon stack is told when the tray mints it. */
export interface CocoonSeed {
  strainPath: string;
  heftBand: HeftBand;
  count: number;
  meanShellMg: number;
  /** The tray's phenotype mean — the mean the kept stack is compared to. */
  lotMeanMg: number;
  /** The lot's genetic mean — what the next lot's mean moves from. */
  lotGeneticMg: number;
  pebrineLoad: number;
  spunAt: number;
  maker: string;
}

/** The narrow surface a tray asks of an egg lot it is adopting. */
export interface EggLotLike {
  getStrainPath(): string;
  getEggCount(): number;
  getMeanShellMg(): number;
  getPebrineLoad(): number;
}

/** The narrow surface the tray asks of a cocoon stack it has minted. */
export interface CocoonSeedable {
  seedFromTray(seed: CocoonSeed): void;
}

/** The public face of a rearing. */
export interface Rearing {
  getRearingState(): RearingState;
  /** Which age the worms are in, 1–5, or 0 when there are none feeding. */
  currentAge(): number;
  isMoulting(): boolean;
  isHungry(): boolean;
  isSpeckled(): boolean;
  hasLiveRearing(): boolean;
  /** Take an egg lot's facts onto the tray — the adoption. */
  seedFromLot(lot: EggLotLike, keeper: string): void;
  /** Bring the rearing current. Every read calls it. */
  reconcileRearing(): void;
  /** The tray in words — never a number. */
  rearingLine(): string;
  /** Leaf on the tray (anything whose material is silkworm fodder). */
  leafOnTray(): Stuff[];
  /** Is there something on the tray for wandering worms to climb? */
  hasMounting(): boolean;
}

// ---------- the dials ----------

/** Below this the worms do not develop at all (10 °C). */
const BASE_K = 283;
/** Degree-days from laying (or from a wintered lot's waking) to hatch. */
const HATCH_DD = 150;
/**
 * ⭐ The end of each age, in degree-days since hatch — about 23 days at
 * 25 °C in all, the fifth age the longest by far.
 */
const AGE_END_DD = [52, 97, 157, 232, 352] as const;
/** The last tenth of ages I–IV is a moult: asleep, eating nothing. */
const MOULT_SHARE = 0.1;
/** Leaf one worm eats over its whole life, kg. */
const LEAF_KG_PER_WORM = 0.025;
/** ⭐ The share of that leaf each age eats — the fifth eats three quarters. */
const AGE_LEAF_SHARE = [0.01, 0.03, 0.06, 0.15, 0.75] as const;
/** The share of hatched worms that live to spin. */
const SURVIVAL = 0.85;
/** Days the worms spin for, once they have somewhere to climb. */
const SPIN_DAYS = 3;
/** Days wandering worms search for a brush before spinning anyway. */
const WANDER_GRACE_DAYS = 1;
/** Without a brush the cocoons are flimsier. */
const NO_BRUSH_FACTOR = 0.8;
/** Pébrine: specks are visible from age IV at or above this load. */
const SPECK_LOAD = 0.4;
/** Pébrine: a tray at or above this load dies at the start of age V. */
const COLLAPSE_LOAD = 0.6;
/** The freshness band's worth as fodder. */
const FRESHNESS_WORTH: Record<string, number> = {
  fresh: 1,
  tainted: 0.6,
  spoiled: 0.2,
  rotten: 0,
};
/** The share of a rearing's cocoons in the heavy and the light stacks. */
const TAIL_SHARE = 0.2;
/** Where each tail stack sits, in standard deviations from the mean. */
const TAIL_SD = 1.4;

const COCOONS_ROW = '/trade/sericulture/thing/cocoons';
const FRASS_ROW = '/trade/sericulture/thing/frass';

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

function nowGameSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth'] as const;

type RearingBase = Stuff & {
  getContents(): readonly Stuff[];
  temperatureTrajectory(fromS: number, toS: number): {
    samples(n: number): TrajectorySample[];
  };
};

export function RearingMixin<TBase extends MixinConstructor<RearingBase>>(Base: TBase) {
  return class RearingMixin extends Base implements Rearing {
    static _mixinName: string = REARING_MIXIN;

    static _mixinRefusal = '{} has no worms on it';

    static fieldMeta: FieldMeta = {
      rearingState: { persistent: true, authorable: true },
      _strainPath: { persistent: true, authorable: true, ref: 'identity:constituent' },
      eggCount: { persistent: true, authorable: true },
      lotGeneticMg: { persistent: true, authorable: true },
      pebrineLoad: { persistent: true, authorable: true, spoiler: 1 },
      degreeDays: { persistent: true, authorable: true },
      rearingStamp: { persistent: true },
      lastFeedSat: { persistent: true },
      fifthAgeSat: { persistent: true, authorable: true },
      fifthAgeDD: { persistent: true },
      wanderStartS: { persistent: true },
      spinStartS: { persistent: true, authorable: true },
      spunWithoutBrush: { persistent: true },
      keeperPath: { persistent: true },
    };

    public rearingState: RearingState = 'empty';
    /** The strain the worms are — a constituent ref, loaded with the tray. */
    public _strainPath = '';
    public eggCount = 0;
    /** The lot's GENETIC mean shell weight (mg) — selection's starting point. */
    public lotGeneticMg = 0;
    /** ⚠ Seeded on the lot, carried here; NO sense reports it. */
    public pebrineLoad = 0;
    /** Degree-days since the lot was laid (eggs) or hatched (worms). */
    public degreeDays = 0;
    /** Game-seconds of the last reconcile; `0` = never. */
    public rearingStamp = 0;
    /** How well the last window's demand was met, 0–1. */
    public lastFeedSat = 1;
    /** The fifth age's mean satisfaction — it sets the cocoon's weight. */
    public fifthAgeSat = 1;
    /** Degree-days of the fifth age integrated so far (the mean's weight). */
    public fifthAgeDD = 0;
    public wanderStartS = 0;
    public spinStartS = 0;
    public spunWithoutBrush = false;
    /** Who has been keeping this tray — the cocoons' maker. */
    public keeperPath = '';

    private _reconcilingRearing = false;
    private _minting = false;

    /** The container + thermal face the rearing reads through. */
    private trayHost(): RearingBase {
      return this as unknown as RearingBase;
    }

    // ---------- reads ----------

    public getRearingState(): RearingState {
      this.reconcileRearing();
      return this.rearingState;
    }

    public hasLiveRearing(): boolean {
      return LIVE.has(this.getRearingState());
    }

    public currentAge(): number {
      const state = this.getRearingState();
      if (state !== 'feeding') return state === 'wandering' || state === 'spinning' ? 5 : 0;
      return ageAt(this.degreeDays);
    }

    public isMoulting(): boolean {
      return this.getRearingState() === 'feeding' && inMoult(this.degreeDays);
    }

    public isHungry(): boolean {
      return this.getRearingState() === 'feeding' && !inMoult(this.degreeDays) && this.lastFeedSat < 0.5;
    }

    public isSpeckled(): boolean {
      const state = this.getRearingState();
      if (state === 'collapsed') return this.pebrineLoad >= dial('sericulture.pebrine.speckLoad', SPECK_LOAD);
      if (!LIVE.has(state) || state === 'eggs') return false;
      return (
        this.currentAge() >= 4 && this.pebrineLoad >= dial('sericulture.pebrine.speckLoad', SPECK_LOAD)
      );
    }

    public leafOnTray(): Stuff[] {
      return this.trayHost().getContents().filter((s) => materialHasTag(s, 'silkworm-fodder'));
    }

    public hasMounting(): boolean {
      return this.trayHost().getContents().some((s) => materialHasTag(s, 'mounting'));
    }

    /**
     * ⭐ The tray in words. Every state a keeper could act on has a
     * sentence, and none of them is a number.
     */
    public rearingLine(): string {
      const state = this.getRearingState();
      const specks = this.isSpeckled() ? ' Some of them are peppered with small dark specks.' : '';
      switch (state) {
        case 'empty':
          return this.trayHost().getContents().some((s) => s.getTemplatePath() === COCOONS_ROW)
            ? 'The worms are done; there are cocoons on it.'
            : 'There is nothing living on it.';
        case 'eggs':
          return 'A scatter of eggs, waiting for warmth.';
        case 'collapsed':
          return `A tray of dead worms, limp and discoloured.${specks}`;
        case 'wandering':
          return `The worms have stopped eating and are wandering, heads up, looking for somewhere to spin.${specks}`;
        case 'spinning':
          return this.spunWithoutBrush
            ? 'The worms have given up looking and are spinning where they lie.'
            : 'The worms are climbing the brush and spinning, each in a haze of its own thread.';
        case 'feeding': {
          const age = this.currentAge();
          if (this.isMoulting()) {
            return `A tray of worms in their ${ORDINAL[age]} age, asleep for the moult, heads raised and still.${specks}`;
          }
          if (this.isHungry()) {
            return `A tray of worms in their ${ORDINAL[age]} age, restless, heads raised, searching the bare tray.${specks}`;
          }
          if (age === 5) {
            return `A tray of fat worms in their fifth age, eating; the sound of them is like rain on leaves.${specks}`;
          }
          return `A tray of worms in their ${ORDINAL[age]} age, eating.${specks}`;
        }
      }
    }

    // ---------- the adoption ----------

    /**
     * ⭐ Take a lot onto the tray. The lot is consumed by the caller (the
     * tray's container hook) — the eggs are the tray's now.
     */
    public seedFromLot(lot: EggLotLike, keeper: string): void {
      this._strainPath = lot.getStrainPath();
      this.eggCount = Math.max(0, Math.floor(lot.getEggCount()));
      this.lotGeneticMg = lot.getMeanShellMg();
      this.pebrineLoad = clamp01(lot.getPebrineLoad());
      this.degreeDays = 0;
      this.lastFeedSat = 1;
      this.fifthAgeSat = 1;
      this.fifthAgeDD = 0;
      this.wanderStartS = 0;
      this.spinStartS = 0;
      this.spunWithoutBrush = false;
      this.keeperPath = keeper;
      this.rearingState = 'eggs';
      this.rearingStamp = nowGameSeconds() ?? 0;
    }

    /** Somebody tended the tray — the cocoons will be theirs. */
    public noteKeeper(keeper: string): void {
      if (keeper) this.keeperPath = keeper;
    }

    // ---------- the clock ----------

    public reconcileRearing(): void {
      if (this._reconcilingRearing) return;
      const nowS = nowGameSeconds();
      if (nowS === null) return;
      if (!LIVE.has(this.rearingState)) {
        this.rearingStamp = nowS;
        return;
      }
      if (this.rearingStamp === 0) {
        this.rearingStamp = nowS;
        return;
      }
      const fromS = this.rearingStamp;
      if (!(nowS > fromS)) return;
      this._reconcilingRearing = true;
      try {
        this.rearingStamp = nowS;
        const samples = this.trayHost().temperatureTrajectory(fromS, nowS).samples(SUB_STEPS);
        this.advance(samples, fromS, nowS);
      } finally {
        this._reconcilingRearing = false;
      }
    }

    /**
     * One window. ⚠ Feeding is settled ONCE per window, against the demand
     * the window would have had at full feed — so a long unobserved gap is
     * one meal, honestly averaged, rather than a sub-step loop that eats
     * leaf it has no way of knowing was fresh at the time.
     */
    private advance(samples: TrajectorySample[], fromS: number, nowS: number): void {
      const base = dial('sericulture.baseK', BASE_K);
      let fullDD = 0;
      for (const s of samples) {
        fullDD += Math.max(0, s.value - base) * (s.durationS / SECONDS_PER_GAME_DAY);
      }

      if (this.rearingState === 'eggs') {
        this.degreeDays += fullDD;
        if (this.degreeDays >= dial('sericulture.hatchDD', HATCH_DD)) {
          this.rearingState = 'feeding';
          this.degreeDays = 0;
          this.lastFeedSat = 1;
        }
        return;
      }

      if (this.rearingState === 'feeding') {
        const sat = this.eat(fullDD);
        this.lastFeedSat = sat;
        const before = this.degreeDays;
        const gained = fullDD * (0.5 + 0.5 * sat);
        const after = before + gained;
        // The fifth age's satisfaction, weighted by its degree-days.
        const vStart = AGE_END_DD[3];
        const inV = Math.max(0, Math.min(after, AGE_END_DD[4]) - Math.max(before, vStart));
        if (inV > 0) {
          this.fifthAgeSat =
            (this.fifthAgeSat * this.fifthAgeDD + sat * inV) / (this.fifthAgeDD + inV);
          this.fifthAgeDD += inV;
        }
        // ⭐ Pébrine takes a heavy tray at the threshold of the fifth age.
        if (
          before < vStart &&
          after >= vStart &&
          this.pebrineLoad >= dial('sericulture.pebrine.collapseAt', COLLAPSE_LOAD)
        ) {
          this.degreeDays = vStart;
          this.rearingState = 'collapsed';
          return;
        }
        this.degreeDays = after;
        if (after >= AGE_END_DD[4]) {
          this.rearingState = 'wandering';
          // When, inside the window, the fifth age ended.
          const share = gained > 0 ? (AGE_END_DD[4] - before) / gained : 1;
          this.wanderStartS = fromS + Math.max(0, Math.min(1, share)) * (nowS - fromS);
        } else {
          return;
        }
      }

      if (this.rearingState === 'wandering') {
        if (this.hasMounting()) {
          this.rearingState = 'spinning';
          this.spinStartS = Math.max(this.wanderStartS, fromS);
          this.spunWithoutBrush = false;
        } else {
          const grace = dial('sericulture.wanderGraceDays', WANDER_GRACE_DAYS) * SECONDS_PER_GAME_DAY;
          if (nowS - this.wanderStartS >= grace) {
            this.rearingState = 'spinning';
            this.spinStartS = this.wanderStartS + grace;
            this.spunWithoutBrush = true;
          }
        }
      }

      if (this.rearingState === 'spinning') {
        const spin = dial('sericulture.spinDays', SPIN_DAYS) * SECONDS_PER_GAME_DAY;
        if (nowS - this.spinStartS >= spin) this.finishSpinning(this.spinStartS + spin);
      }
    }

    /**
     * Eat one window's worth. Returns the satisfaction, 0–1. Leaf is taken
     * oldest first, each item weighted by its freshness band, and an item
     * eaten to nothing is gone.
     */
    private eat(fullDD: number): number {
      const demand = this.demandKg(this.degreeDays, fullDD);
      if (!(demand > 0)) return this.lastFeedSat >= 0.5 ? 1 : this.lastFeedSat;
      let need = demand;
      for (const leaf of this.leafOnTray()) {
        if (need <= 0) break;
        const worth = leafWorth(leaf);
        if (worth <= 0) continue;
        const kg = massKg(leaf);
        if (kg <= 0) continue;
        const value = kg * worth;
        if (value <= need) {
          need -= value;
          void StuffApi.destruct(leaf);
        } else {
          const left = kg - need / worth;
          need = 0;
          if (MixinApi.isTangible(leaf)) leaf.setMass(Quantity.of(left, 'kg'));
        }
      }
      return clamp01((demand - need) / demand);
    }

    /**
     * ⭐ Leaf wanted between `dd` and `dd + span` degree-days at full feed:
     * per age, its share of a worm's lifetime leaf over its length, nothing
     * during a moult, times the worms. A heavily infected tray eats poorly.
     */
    private demandKg(dd: number, span: number): number {
      if (!(span > 0)) return 0;
      const perWorm = dial('sericulture.leafKgPerWorm', LEAF_KG_PER_WORM);
      let kg = 0;
      let start = 0;
      for (let age = 0; age < 5; age++) {
        const end = AGE_END_DD[age]!;
        const length = end - start;
        const eatEnd = age < 4 ? end - length * MOULT_SHARE : end;
        const lo = Math.max(dd, start);
        const hi = Math.min(dd + span, eatEnd);
        if (hi > lo) {
          kg += (perWorm * AGE_LEAF_SHARE[age]! * (hi - lo)) / (eatEnd - start);
        }
        start = end;
      }
      return kg * this.liveWorms() * (1 - 0.5 * this.pebrineLoad);
    }

    private liveWorms(): number {
      return this.eggCount * dial('sericulture.survival', SURVIVAL);
    }

    // ---------- the spin ----------

    /**
     * ⭐⭐ The rearing ends in three heft stacks and a sack of frass, minted
     * through the ONE clone path. Generative, never a draw: the stacks'
     * means sit where a normal spread puts the top and bottom fifths.
     */
    private finishSpinning(spunAt: number): void {
      if (this._minting) return;
      const strainPath = this._strainPath;
      const strain = strainPath ? StuffApi.findByTemplatePath(strainPath) : null;
      const sd = (strain as unknown as { getSdShellMg?(): number } | null)?.getSdShellMg?.() ?? 40;
      const total = Math.max(0, Math.round(this.liveWorms() * (1 - this.pebrineLoad)));
      const phenotype =
        this.lotGeneticMg *
        (0.6 + 0.4 * clamp01(this.fifthAgeSat)) *
        (this.spunWithoutBrush ? NO_BRUSH_FACTOR : 1);
      const tail = Math.round(total * TAIL_SHARE);
      const stacks: Array<{ band: HeftBand; count: number; mean: number }> = [
        { band: 'heavy', count: tail, mean: phenotype + TAIL_SD * sd },
        { band: 'middling', count: total - 2 * tail, mean: phenotype },
        { band: 'light', count: tail, mean: Math.max(1, phenotype - TAIL_SD * sd) },
      ];
      const seedBase = {
        strainPath,
        lotMeanMg: phenotype,
        lotGeneticMg: this.lotGeneticMg,
        pebrineLoad: this.pebrineLoad,
        spunAt,
        maker: this.keeperPath,
      };
      // The rearing is over the moment they have spun; the stacks follow.
      // ⚠ `_minting` is set only once everything that can throw has run —
      // set first, one throw wedged the tray for good (found by the drive).
      this.rearingState = 'empty';
      this.degreeDays = 0;
      this._minting = true;
      void this.mintSpin(stacks, seedBase)
        .catch((err) => console.warn(`RearingMixin: the spin did not land: ${String(err)}`))
        .finally(() => {
          this._minting = false;
        });
    }

    private async mintSpin(
      stacks: Array<{ band: HeftBand; count: number; mean: number }>,
      seedBase: Omit<CocoonSeed, 'heftBand' | 'count' | 'meanShellMg'>,
    ): Promise<void> {
      const self = this as unknown as Stuff & Container;
      for (const s of stacks) {
        if (s.count < 1) continue;
        let made: Stuff | null = null;
        // ⚠ No `madeFrom`: the tray is a house fixture, not a titled input,
        // and recording provenance against it threw for a chattel stack —
        // silently, so a crop was frass and nothing else (found by the
        // drive). Arrival in the tray titles the stack, as for any good.
        try {
          made = await StuffApi.clone<Stuff>(COCOONS_ROW);
        } catch (err) {
          console.warn(`RearingMixin: could not mint a cocoon stack: ${String(err)}`);
          made = null;
        }
        if (!made) continue;
        (made as unknown as CocoonSeedable).seedFromTray({
          ...seedBase,
          heftBand: s.band,
          count: s.count,
          meanShellMg: s.mean,
        });
        if (MixinApi.isContainable(made)) {
          ContainmentApi.move(made as Stuff & Containable, self);
        }
      }
      try {
        const frass = await StuffApi.clone<Stuff>(FRASS_ROW);
        if (MixinApi.isContainable(frass)) ContainmentApi.move(frass as Stuff & Containable, self);
      } catch {
        // A rearing with no frass is untidy and harmless.
      }
    }
  };
}

// ---------- module-private ----------

/** Which age (1–5) a degree-day count since hatch falls in. */
function ageAt(dd: number): number {
  for (let i = 0; i < AGE_END_DD.length; i++) {
    if (dd < AGE_END_DD[i]!) return i + 1;
  }
  return 5;
}

/** In the last tenth of ages I–IV, the worms sleep and shed. */
function inMoult(dd: number): boolean {
  const age = ageAt(dd);
  if (age >= 5) return false;
  const start = age === 1 ? 0 : AGE_END_DD[age - 2]!;
  const end = AGE_END_DD[age - 1]!;
  return dd >= end - (end - start) * MOULT_SHARE;
}

function materialHasTag(s: Stuff, tag: string): boolean {
  return MixinApi.isTangible(s) && s.getMaterial()?.hasTag(tag) === true;
}

function leafWorth(leaf: Stuff): number {
  const band = MixinApi.isFresh(leaf) ? leaf.getFreshnessBand() : 'fresh';
  return FRESHNESS_WORTH[band] ?? 0;
}

function massKg(s: Stuff): number {
  if (!MixinApi.isTangible(s)) return 0;
  return s.getMass()?.rawValue() ?? 0;
}

function clamp01(x: number): number {
  return !Number.isFinite(x) ? 0 : x < 0 ? 0 : x > 1 ? 1 : x;
}
