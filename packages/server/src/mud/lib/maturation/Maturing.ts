/**
 * MaturingMixin — the durative transform (fermentation D1/D2).
 *
 * A VESSEL capability, never a liquid's: bulk matter has no identity,
 * vessels do (the pot-as-bed precedent). The vat ferments whatever
 * sugar-bearing must its interior holds; which ferment runs, at what
 * rate, into what product is entirely the matched {@link MaturationProfile}
 * row's — the authoring surface (a new drink is rows alone).
 *
 * **The shape is husbandry's, the equation is not** — *growth accretes,
 * fermentation converts*: reconcile lazily on read over elapsed
 * game-time, staged, **no far-past guard and no linkdead freeze** (an
 * owned batch lives the full absence; the mitigation for a long gap is
 * the cellar — a PLACE — never a rule). The driver is temperature +
 * time: each reconcile reads the vessel's own reconciled temperature
 * (`ThermalMixin`'s lazy Newton read — the cold cellar is real because
 * the vat drifts toward its room) and credits the closed window at that
 * temperature. **Windows are segmented at events, not integrated from
 * history**: seal toggles and moves reconcile first (the `Vat`
 * overrides), so each stretch is credited under the conditions it
 * actually ran at.
 *
 * The batch's state is a pure function of its inputs and temperature
 * history — **no resolutional randomness anywhere** (D4). The numbers
 * are derived and discoverable: starting sugar comes off the input
 * material (`nutrientAmounts.sugar`, g/L), ABV = starting sugar ×
 * fraction converted / {@link SUGAR_G_PER_L_PER_ABV_PCT}, gravity =
 * 1 + remaining sugar × {@link GRAVITY_PER_SUGAR_G_PER_L} — so two vats
 * at two temperatures, gravity read over time, recover the profile's
 * authored slopes by experiment.
 *
 * **Oxygen is the trap; the seal is the skill (D3).** While sugar
 * remains, the CO₂ blanket protects an open ferment. Past `finished`,
 * an OPEN vessel converts ethanol → acetic acid over the profile's
 * `turnDays` and the batch `turned`s into `turnedMaterial` (vinegar —
 * the failure path still feeds someone); a SEALED one holds. A
 * `sealedOnly` profile converts only while sealed (bottle/cask
 * conditioning — what sparkling and real ale ARE, P5/P9).
 *
 * **Grade comes from the process (D6).** The worst temperature stretch
 * over the active window is a monotone-min satisfaction
 * (`_worstStretch`, husbandry's `_worstLimiting` second consumer): the
 * hot band past `damageAboveK` writes it down, cold merely stalls. The
 * derived band is written onto the host's `Graded` face on every
 * reconcile, and the maker's mark rides the W0 transfer seam in and
 * out — so the bottle racked from a well-kept batch is `fine`, and
 * attributable.
 *
 * **The batch is detected, not hooked.** The mixin keys the batch to
 * the interior material path and notices a change on reconcile: a new
 * material = a fresh fill = a fresh batch (mark stamped from the
 * carried maker, else the acting author when the fill's context is
 * live); an emptied interior resets to idle; the mixin's own
 * product/turn swaps update the key so they never read as fills. A
 * same-material top-up deliberately continues the batch (blend identity
 * is out of scope, the payload rule).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type Material from '../material/Material';
import type MaturationProfile from './MaturationProfile';
import { MATURATION_LINES } from './MaturationProfile';
import type { Crafted } from '../craft/Crafted';
import { Grade, type GradeBand } from '../craft/Grade';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { ExecutionContextApi } from '../../api/execution-context';
import MaturationProfileRef from './MaturationProfile';
import { BiomeApi } from '../../api/biome';
import { Quantity } from '../quantity';
import { TemplatePaths } from '../paths';

/** The batch phases, in lifecycle order. */
export const FERMENT_PHASES = ['idle', 'active', 'finished', 'turned'] as const;

/** A batch phase — one of {@link FERMENT_PHASES}. */
export type MaturationPhase = (typeof FERMENT_PHASES)[number];

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * Kelvin past `damageAboveK` at which the stretch satisfaction reaches
 * 0 — the width of the damage ramp (inside it, damage is partial).
 */
const DAMAGE_RAMP_K = 15;

/**
 * Grams of sugar per litre consumed per 1% ABV produced (≈16.8 in the
 * real stoichiometry; 17 is the teachable round figure — the mass
 * balance a measuring player can verify).
 */
export const SUGAR_G_PER_L_PER_ABV_PCT = 17;

/**
 * Specific-gravity points per g/L of dissolved sugar (≈0.0004 real:
 * 100 g/L reads ≈1.040). What the hydrometer derives from.
 */
export const GRAVITY_PER_SUGAR_G_PER_L = 0.0004;

/** Ambient assumed for a non-Thermal host (never true of `Vat`). */
const DEFAULT_ROOM_K = 295;

/** Viability a feed restores (a living culture only). */
const FEED_RESTORE = 0.5;
/** Starve-rate multiplier below the band — the cellar slows a culture. */
const CULTURE_COLD_FACTOR = 0.25;
/** Starve-rate multiplier above the damage line — a kitchen shelf. */
const CULTURE_HOT_FACTOR = 3;
/** Pitch kill ceiling when the strain has no culture profile (K). */
const DEFAULT_PITCH_KILL_K = 313;

// ── the cellar CO₂ (P11/D12): a working ferment displaces air ──
/** Air-reserve percentage points a converting batch displaces per day. */
const CO2_AIR_DRAIN_PCT_PER_DAY = 30;
/** Percentage points a ventilated room recovers per day. */
const CO2_AIR_RECOVER_PCT_PER_DAY = 400;
/** Below this air %, the room's atmosphere flips to carbon dioxide. */
const CO2_UNBREATHABLE_AT_PCT = 40;

/**
 * The cellar's CO₂ (P11): a converting batch displaces the room's
 * authored air reserve (the closed-kitchen mechanism, second consumer —
 * a room that authors no `air` reserve is open air and skips all of
 * this); a VENTILATED room (sky-exposed, or any unblocked exit whose
 * door stands open) recovers fast. Below the threshold the room's
 * atmosphere flips to `carbon-dioxide` (unbreathable — respiration's
 * medium crisis does the rest); recovery flips it back. Only ever
 * overlays a default (null) atmosphere and only clears its own — the
 * fire driver's idempotence rules.
 */
function reconcileCellarAir(
  vessel: Stuff,
  days: number,
  producing: boolean,
): void {
  if (!MixinApi.isContainable(vessel)) return;
  const room = vessel.getContainer();
  if (room === null || !MixinApi.isContainer(room)) return;
  if (!MixinApi.isReserved(room) || !room.hasReserve('air')) return;
  const ventilated = roomVentilated(room);
  const deltaPct =
    (ventilated ? CO2_AIR_RECOVER_PCT_PER_DAY : 0) * days -
    (producing ? CO2_AIR_DRAIN_PCT_PER_DAY * days : 0);
  if (deltaPct !== 0) {
    room.adjustReserve('air', Quantity.of(deltaPct, '%'));
  }
  const reserve = room.getReserve('air');
  if (!reserve) return;
  const capacity = reserve.capacity.rawValue();
  if (capacity <= 0) return;
  const pct = (reserve.current.rawValue() / capacity) * 100;
  if (!MixinApi.isAtmospheric(room)) return;
  if (pct <= CO2_UNBREATHABLE_AT_PCT) {
    if (room._atmosphere === null) room.setAtmosphere('carbon-dioxide');
  } else if (room._atmosphere === 'carbon-dioxide') {
    room.setAtmosphere(null);
  }
}

/**
 * Is `room` ventilated — sky-exposed, or any unblocked exit whose door
 * (if any) stands open? The fire driver's ventilation rule, applied at
 * the ferment's own read (the fire tick only runs where fires burn).
 */
function roomVentilated(room: Stuff): boolean {
  if (MixinApi.isContainer(room) && BiomeApi.isSkyExposed(room)) return true;
  if (!MixinApi.isExitable(room)) return false;
  for (const exit of room.getExits().values()) {
    if (exit.isBlocked()) continue;
    const door = exit.getDoor();
    if (door !== null && MixinApi.isSealable(door) && !door.isOpen()) {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * Worst-stretch satisfaction → grade band. The husbandry harvest
 * thresholds, second consumer: a batch never run hot grades
 * `masterful`; the deeper into the damage ramp the worst stretch went,
 * the lower the band.
 */
function bandFor(worst: number): GradeBand {
  if (worst >= 0.95) return 'masterful';
  if (worst >= 0.8) return 'exceptional';
  if (worst >= 0.6) return 'fine';
  if (worst >= 0.35) return 'fair';
  return 'poor';
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Conversion rate (fraction/day) at `tempK` under `profile`. */
function rateAt(profile: MaturationProfile, tempK: number): number {
  const above = profile.getStallAboveK();
  if (above !== null && tempK > above) return 0;
  const stall = profile.getStallBelowK();
  const happy = profile.getHappyK();
  if (tempK <= stall) return 0;
  const full = profile.getRatePerDay();
  if (tempK >= happy || happy <= stall) return full;
  return (full * (tempK - stall)) / (happy - stall);
}

/** Damage satisfaction at `tempK`: 1 at/below the damage line. */
function damageSat(profile: MaturationProfile, tempK: number): number {
  const damage = profile.getDamageAboveK();
  if (tempK <= damage) return 1;
  return clamp01(1 - (tempK - damage) / DAMAGE_RAMP_K);
}

export interface Maturing {
  /** Integrate the batch over elapsed game-time (lazy; reads drive it). */
  reconcileFerment(): void;
  /** The batch phase (reconciles first). */
  getMaturationPhase(): MaturationPhase;
  /** Fraction of the starting sugar converted, 0..1 (reconciles first). */
  getFractionConverted(): number;
  /** The must's starting sugar, g/L — read off the input material at fill. */
  getStartingSugarGPerL(): number;
  /** Unconverted sugar remaining, g/L (reconciles first). */
  getRemainingSugarGPerL(): number;
  /**
   * Specific gravity of the batch — what a hydrometer reads
   * (reconciles first). `1 + remaining sugar × 0.0004`.
   */
  getGravity(): number;
  /** Derived ABV, % — never authored on a batch (reconciles first). */
  getAbvPercent(): number;
  /** The monotone-min worst temperature stretch, 0..1 (reconciles first). */
  getWorstStretch(): number;
  /** The matched profile's key, `''` when none. */
  getMaturationProfileKey(): string;
  /** The matched profile row, or `null`. */
  getMaturationProfile(): MaturationProfile | null;
  /** The strain the batch carries; `''` = sterile (reconciles first). */
  getBatchStrain(): string;
  /** Culture batches: aliveness 0..1 (reconciles first). */
  getViability(): number;
  /** Litres of lees under the rack floor (reconciles first). */
  getLeesVolumeL(): number;
  /** Classify a cross-material pour: pitch, feed, or a plain mismatch. */
  classifyForeignPour(
    material: Material,
    strain: string,
  ): 'pitch' | 'feed' | null;
  /** Apply a classified foreign pour (the transfer seam calls this). */
  applyForeignPour(kind: 'pitch' | 'feed', strain: string, litres: number): void;
}

/**
 * `MarkupAugmenter` for the batch's sensory face (D5 — senses first,
 * instruments for numbers): heard (bubbling = active, still = done),
 * smelled (the sharpening edge of a batch turning; the creaming lees).
 * State-derived prose through the reconcile-on-read getters, so an
 * absent owner's vat reads truthfully — and never a number.
 */
function maturationAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isMaturing(host)) return text;
  const phase = host.getMaturationPhase();
  const profile = host.getMaturationProfile();
  /*
   * ⚠ A host with no resolved profile falls back to microbial, which is
   * the only honest default: it is what every consumer but the two
   * textile ones is, and a wrong-but-plausible cellar line beats
   * inventing a mechanism the row never claimed.
   */
  const lines = MATURATION_LINES[profile?.getMechanism() ?? 'microbial'];
  let line: string | null = null;
  if (phase === 'active') {
    if (profile?.getKind() === 'culture') {
      // ⭐ A culture is alive by definition, so it keeps the biological
      // wording whatever the host's mechanism says — there is no such
      // thing as a photochemical culture.
      const v = host.getViability();
      line =
        v <= 0
          ? 'The sediment lies grey and dead-still.'
          : v < 0.4
            ? 'The culture looks thin and hungry, barely creaming.'
            : 'A pale sediment stirs and creams against the glass.';
    } else if (host.getBatchStrain() === '') {
      line = 'It sits sweet and silent — nothing is working it yet.';
    } else if (host.getFractionConverted() > 0) {
      line = lines.working;
    } else {
      line = lines.starting;
    }
  } else if (phase === 'finished') {
    line = lines.finished;
  } else if (phase === 'turned') {
    line = lines.turned;
  }
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function MaturingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MaturingMixin extends Base implements Maturing {
    static _mixinName = 'MaturingMixin';

    static markupAugmenters: MarkupAugmenter[] = [maturationAugmenter];

    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Bulkable)) {
        throw new Error(
          `${name} composes MaturingMixin without BulkableMixin; ` +
            `the transform rides the vessel's interior bulk slot (D2).`,
        );
      }
    }

    static fieldMeta: FieldMeta = {
      maturationClockStamp: { persistent: true, runtimeState: true },
      maturationPhase: { persistent: true, runtimeState: true },
      maturationProfileKey: { persistent: true, runtimeState: true },
      batchMaterialPath: { persistent: true, runtimeState: true },
      startingSugarGPerL: { persistent: true, runtimeState: true },
      fractionConverted: { persistent: true, runtimeState: true },
      _worstStretch: { persistent: true, runtimeState: true },
      turnedDays: { persistent: true, runtimeState: true },
      batchStrain: { persistent: true, runtimeState: true },
      wildLagDays: { persistent: true, runtimeState: true },
      viability: { persistent: true, runtimeState: true },
      leesVolumeL: { persistent: true, runtimeState: true },
    };

    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public maturationClockStamp = 0;
    /** The batch phase. */
    public maturationPhase: MaturationPhase = 'idle';
    /** The matched profile's key; `''` = none matched. */
    public maturationProfileKey = '';
    /** The interior material path the current batch is keyed to. */
    public batchMaterialPath: string | null = null;
    /** Starting sugar, g/L, read off the input material at fill. */
    public startingSugarGPerL = 0;
    /** Fraction of the starting sugar converted, 0..1. */
    public fractionConverted = 0;
    /** Monotone minimum of the damage satisfaction over the batch. */
    public _worstStretch = 1;
    /** Open game-days accrued past `finished` (the turn clock). */
    public turnedDays = 0;
    /** The strain the batch carries; `''` = sterile / none yet (D14). */
    public batchStrain = '';
    /** Open game-days accrued toward a wild start (the lambic lag). */
    public wildLagDays = 0;
    /** Culture batches: aliveness, 0..1 (starves; feeding restores). */
    public viability = 1;
    /** Litres of lees under the rack floor (set at `finished`). */
    public leesVolumeL = 0;

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _reconcilingFerment = false;

    // ---------- reconcile-on-read (the lazy convert) ----------

    public reconcileFerment(): void {
      if (this._reconcilingFerment) return;
      const nowS = this.maturationNowSeconds();
      if (nowS === null) return;
      this._reconcilingFerment = true;
      try {
        const self = this as unknown as Stuff;
        const bulk = MixinApi.isBulkable(self) ? self : null;
        const currentPath = bulk?.getBulkMaterialPath('interior') ?? null;
        const amount = bulk ? bulk.getBulkAmount('interior').rawValue() : 0;

        // An emptied vessel is an ended batch.
        if (currentPath === null || amount <= 0) {
          if (this.maturationPhase !== 'idle') this.resetBatch();
          this.maturationClockStamp = nowS;
          return;
        }
        // A changed interior material is a fresh fill — a fresh batch.
        // (The mixin's own product/turn swaps update the key first, so
        // they never land here.)
        if (currentPath !== this.batchMaterialPath) {
          this.startBatch(currentPath, nowS);
          return;
        }

        // The lees split (P12) is AMOUNT-triggered, never
        // time-integrated: the rack that drew a finished batch down to
        // the floor converts the residual at the very next read —
        // elapsed or not. The swap re-keys at once, so the same read
        // that ends the wine batch starts the culture batch (strain
        // from the lees material's culture profile; the Crafted mark
        // untouched — the trace back to the harvested batch).
        if (
          (this.maturationPhase === 'finished' ||
            this.maturationPhase === 'turned') &&
          this.leesVolumeL > 0 &&
          amount <= this.leesVolumeL + 1e-9
        ) {
          const leesPath =
            MaturationProfileRef.byKey(this.maturationProfileKey)?.getLeesMaterial() ??
            '';
          if (leesPath !== '') {
            const lees = StuffApi.findByTemplatePath<Material>(leesPath);
            if (lees) {
              const bulkSelf = self as Stuff & {
                setBulkMaterial(a: 'interior', m: Material): void;
              };
              bulkSelf.setBulkMaterial('interior', lees);
              this.startBatch(leesPath, nowS);
              return;
            }
          }
        }

        if (this.maturationClockStamp === 0) {
          this.maturationClockStamp = nowS;
          return;
        }
        const elapsed = nowS - this.maturationClockStamp;
        if (elapsed <= 0) {
          this.maturationClockStamp = nowS;
          return;
        }
        if (this.maturationPhase === 'idle' || this.maturationPhase === 'turned') {
          this.maturationClockStamp = nowS;
          return;
        }
        const profile = MaturationProfileRef.byKey(this.maturationProfileKey);
        if (!profile) {
          this.maturationClockStamp = nowS;
          return;
        }

        const tempK = MixinApi.isThermal(self)
          ? self.getTemperature().rawValue()
          : DEFAULT_ROOM_K;
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const open = MixinApi.isSealable(self) ? self.isOpen() : true;

        if (this.maturationPhase === 'active') {
          if (profile.getKind() === 'culture') {
            this.reconcileCultureWindow(profile, tempK, days);
          } else {
            // Heat hurts the wash whether or not it is converting; cold
            // merely stalls (forgiving, D3).
            const sat = damageSat(profile, tempK);
            if (sat < this._worstStretch) this._worstStretch = sat;
            // Yeast death in the vat: past killK the batch goes sterile
            // again (the stuck ferment) until re-pitched.
            const killK = profile.getKillK();
            if (killK !== null && tempK > killK) {
              this.batchStrain = '';
              this.wildLagDays = 0;
            }
            // Wild acquisition: an OPEN sterile must accrues toward the
            // authored lag; when it lands, wild flora take the batch
            // (the lambic move). A sealed sterile must never starts —
            // D3's second edge: open to catch yeast, open too long past
            // finished to lose the batch.
            if (
              this.batchStrain === '' &&
              profile.getSpontaneousLagDays() > 0 &&
              open
            ) {
              this.wildLagDays += days;
              if (this.wildLagDays >= profile.getSpontaneousLagDays()) {
                this.batchStrain = profile.getWildStrain();
              }
            }
            // The strain gate (lager's rule): a requiring profile
            // converts only on its strain; any other converts on any.
            const required = profile.getRequiresStrain();
            const strainOk =
              required !== ''
                ? this.batchStrain === required
                : this.batchStrain !== '';
            const converting =
              strainOk && (profile.getSealedOnly() ? !open : true);
            if (converting) {
              this.fractionConverted = Math.min(
                1,
                this.fractionConverted + rateAt(profile, tempK) * days,
              );
              reconcileCellarAir(self, days, rateAt(profile, tempK) > 0);
            }
            this.applyBatchGrade();
            if (this.fractionConverted >= 1) {
              this.maturationPhase = 'finished';
              this.leesVolumeL = amount * profile.getLeesFraction();
              this.ensureInteriorMaterial(profile.getProductMaterial());
            }
          }
        } else if (this.maturationPhase === 'finished') {
          // Retry a product swap that couldn't land (material not live).
          this.ensureInteriorMaterial(profile.getProductMaterial());
          const turnedMaterial = profile.getTurnedMaterial();
          if (open && turnedMaterial) {
            this.turnedDays += days;
            if (this.turnedDays >= profile.getTurnDays()) {
              this.maturationPhase = 'turned';
              this.ensureInteriorMaterial(turnedMaterial);
            }
          }
        }
        this.maturationClockStamp = nowS;
      } finally {
        this._reconcilingFerment = false;
      }
    }

    // ---------- reads (each drives the reconcile) ----------

    public getMaturationPhase(): MaturationPhase {
      this.reconcileFerment();
      return this.maturationPhase;
    }

    public getFractionConverted(): number {
      this.reconcileFerment();
      return this.fractionConverted;
    }

    public getStartingSugarGPerL(): number {
      return this.startingSugarGPerL;
    }

    public getRemainingSugarGPerL(): number {
      this.reconcileFerment();
      return this.startingSugarGPerL * (1 - this.fractionConverted);
    }

    public getGravity(): number {
      return 1 + this.getRemainingSugarGPerL() * GRAVITY_PER_SUGAR_G_PER_L;
    }

    public getAbvPercent(): number {
      this.reconcileFerment();
      return (
        (this.startingSugarGPerL * this.fractionConverted) /
        SUGAR_G_PER_L_PER_ABV_PCT
      );
    }

    public getWorstStretch(): number {
      this.reconcileFerment();
      return clamp01(this._worstStretch);
    }

    public getMaturationProfileKey(): string {
      return this.maturationProfileKey;
    }

    public getMaturationProfile(): MaturationProfile | null {
      return MaturationProfileRef.byKey(this.maturationProfileKey);
    }

    // ---------- batch lifecycle (host-internal) ----------

    /**
     * Key a fresh batch to `materialPath`. When the material singleton
     * is not live yet, the key stays null so the next reconcile
     * retries rather than latching a sugarless idle forever.
     */
    private startBatch(materialPath: string, nowS: number): void {
      this.fractionConverted = 0;
      this._worstStretch = 1;
      this.turnedDays = 0;
      this.batchStrain = '';
      this.wildLagDays = 0;
      this.viability = 1;
      this.leesVolumeL = 0;
      this.maturationClockStamp = nowS;
      const material = StuffApi.findByTemplatePath<Material>(materialPath);
      if (!material) {
        this.batchMaterialPath = null;
        this.maturationProfileKey = '';
        this.startingSugarGPerL = 0;
        this.maturationPhase = 'idle';
        return;
      }
      this.batchMaterialPath = materialPath;
      const profile = MaturationProfileRef.forMaterial(material);
      this.maturationProfileKey = profile?.getKey() ?? '';
      this.startingSugarGPerL = material.getNutrientAmounts()['sugar'] ?? 0;
      if (profile !== null && profile.getKind() === 'culture') {
        // A culture batch is alive from the fill (harvested lees): its
        // strain is the profile's, its "conversion" is viability, and
        // the mark carried in by the W0 seam is the TRACE back to the
        // harvested batch — deliberately not re-stamped.
        this.maturationPhase = 'active';
        this.batchStrain = profile.getStrain();
        this.viability = 1;
        return;
      }
      /*
       * ⭐⭐ A batch is active when a PROFILE MATCHED — not when the
       * substrate happens to contain sugar.
       *
       * This read `profile !== null && this.startingSugarGPerL > 0`,
       * and the sugar half was a wine/beer assumption that had quietly
       * become a precondition on the whole mixin. Nothing downstream
       * uses sugar to advance a batch: `fractionConverted` climbs by
       * `rateAt(profile, tempK) * days`, and `startingSugarGPerL` only
       * seeds the gravity and ABV READOUTS, which correctly report
       * nothing for a ferment that makes no alcohol.
       *
       * ⚠⚠ A live drive found it: the textile chain's RETTING PIT is a
       * real slow bacterial ferment (pectin hydrolysis, a fortnight, an
       * over-run failure four days past ready) and models perfectly on
       * this mixin — except that flax straw has no sugar, so the pit sat
       * `idle` forever and the chain could not start. The SHAPE matched;
       * the PRECONDITION did not hold. `culture` batches already had
       * their own sugar-free branch above, which is the same admission
       * made once already for a special case.
       *
       * An unmatched material still idles, and an emptied vessel still
       * resets — the two things the phase actually means.
       */
      this.maturationPhase = profile !== null ? 'active' : 'idle';
      if (this.maturationPhase === 'active' && profile !== null) {
        // Lag 0 = the must self-starts wild at the fill (skin bloom);
        // a lagged (sterile) must waits for a pitch or the wild lag.
        if (profile.getSpontaneousLagDays() === 0) {
          this.batchStrain = profile.getWildStrain();
        }
        this.stampBatchMark(profile, nowS);
      }
    }

    private resetBatch(): void {
      this.maturationPhase = 'idle';
      this.maturationProfileKey = '';
      this.batchMaterialPath = null;
      this.startingSugarGPerL = 0;
      this.fractionConverted = 0;
      this._worstStretch = 1;
      this.turnedDays = 0;
      this.batchStrain = '';
      this.wildLagDays = 0;
      this.viability = 1;
      this.leesVolumeL = 0;
    }

    /**
     * Stamp the batch's mark on a Crafted host: the maker is whatever
     * the W0 transfer seam carried IN with the must (the crusher's
     * mark), else the acting author when the fill's execution context
     * is live — never the wire. The recipe field records the ferment
     * itself; the band is the reconcile's (worst stretch).
     */
    private stampBatchMark(profile: MaturationProfile, nowS: number): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isCrafted(self)) return;
      const crafted = self as Stuff & Crafted;
      if (crafted.getMaker() === '') {
        const author = ExecutionContextApi.getActingAuthor() as {
          getTemplatePath?: () => string | null;
        } | null;
        const path =
          author && typeof author.getTemplatePath === 'function'
            ? author.getTemplatePath()
            : null;
        if (path) crafted.setMaker(path);
      }
      crafted.setRecipe(`ferment:${profile.getKey()}`);
      crafted.setCraftedAt(nowS);
    }

    /** Write the derived band onto the host's Graded face. */
    private applyBatchGrade(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isGraded(self)) return;
      self.setGrade(Grade.of(bandFor(clamp01(this._worstStretch))));
    }

    /**
     * Swap the interior to `path` (product at `finished`, vinegar at
     * `turned`), updating the batch key so the swap never reads as a
     * fresh fill. Idempotent; a not-yet-live material is retried on
     * the next reconcile.
     */
    private ensureInteriorMaterial(path: string): void {
      if (!path) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      if (self.getBulkMaterialPath('interior') === path) {
        this.batchMaterialPath = path;
        return;
      }
      const material = StuffApi.findByTemplatePath<Material>(path);
      if (!material) return;
      self.setBulkMaterial('interior', material);
      this.batchMaterialPath = path;
    }

    // ---------- yeast, wild and kept (D14/P12) ----------

    public getBatchStrain(): string {
      this.reconcileFerment();
      return this.batchStrain;
    }

    public getViability(): number {
      this.reconcileFerment();
      return clamp01(this.viability);
    }

    public getLeesVolumeL(): number {
      this.reconcileFerment();
      return this.leesVolumeL;
    }

    /**
     * The rack floor: past `finished`, the lees stay behind — a pour
     * draws product only down to them (P12's derived split; no second
     * bulk slot). Shadows the Bulkable base read the transfer clamps
     * against (the UnboundedSource precedent).
     */
    public getBulkAvailable(affordance: 'interior' | 'surface'): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return 0;
      const amount = self.getBulkAmount(affordance).rawValue();
      if (affordance !== 'interior') return amount;
      this.reconcileFerment();
      if (
        this.maturationPhase === 'finished' ||
        this.maturationPhase === 'turned'
      ) {
        return Math.max(0, amount - this.leesVolumeL);
      }
      return amount;
    }

    /**
     * Classify a cross-material pour into this vessel (called by the
     * transfer seam BEFORE the material-mismatch decline): a culture
     * batch accepts sugar as FEED; a sterile fermentable batch accepts
     * a strain-bearing pour as PITCH; anything else stays a mismatch.
     */
    public classifyForeignPour(
      material: Material,
      strain: string,
    ): 'pitch' | 'feed' | null {
      this.reconcileFerment();
      const profile = MaturationProfileRef.byKey(this.maturationProfileKey);
      if (!profile) return null;
      if (profile.getKind() === 'culture') {
        const sugary =
          (material.getNutrientAmounts()['sugar'] ?? 0) > 0 ||
          material.getNutrients().includes('sugar');
        return sugary ? 'feed' : null;
      }
      if (
        this.maturationPhase === 'active' &&
        this.batchStrain === '' &&
        strain !== ''
      ) {
        return 'pitch';
      }
      return null;
    }

    /**
     * Apply a classified foreign pour. A PITCH above the strain's kill
     * temperature dies silently — the culture is spent and nothing
     * starts (the hot-pitch death; why wort is cooled). A FEED restores
     * a living culture's viability; a dead culture stays dead.
     */
    public applyForeignPour(
      kind: 'pitch' | 'feed',
      strain: string,
      _litres: number,
    ): void {
      this.reconcileFerment();
      if (kind === 'feed') {
        if (this.viability > 0) {
          this.viability = Math.min(1, this.viability + FEED_RESTORE);
        }
        return;
      }
      if (strain === '') return;
      const self = this as unknown as Stuff;
      const tempK = MixinApi.isThermal(self)
        ? self.getTemperature().rawValue()
        : DEFAULT_ROOM_K;
      if (tempK > this.cultureKillKFor(strain)) return; // hot pitch kills
      if (this.batchStrain === '') {
        this.batchStrain = strain;
        this.wildLagDays = 0;
      }
    }

    /** A culture batch's window: viability, not conversion (D14). */
    private reconcileCultureWindow(
      profile: MaturationProfile,
      tempK: number,
      days: number,
    ): void {
      if (this.viability <= 0) return;
      const killK = profile.getKillK();
      if (killK !== null && tempK > killK) {
        this.viability = 0;
        this.batchStrain = '';
        return;
      }
      const factor =
        tempK <= profile.getStallBelowK()
          ? CULTURE_COLD_FACTOR
          : tempK > profile.getDamageAboveK()
            ? CULTURE_HOT_FACTOR
            : 1;
      this.viability = Math.max(
        0,
        this.viability - (days / profile.getStarveDays()) * factor,
      );
      if (this.viability <= 0) this.batchStrain = '';
    }

    /** The kill ceiling of `strain`'s culture profile (pitch check). */
    private cultureKillKFor(strain: string): number {
      const culture = MaturationProfileRef.all().find(
        (p) => p.getKind() === 'culture' && p.getStrain() === strain,
      );
      return culture?.getKillK() ?? DEFAULT_PITCH_KILL_K;
    }

    /** Game-seconds now, or `null` when no world clock is running. */
    private maturationNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
