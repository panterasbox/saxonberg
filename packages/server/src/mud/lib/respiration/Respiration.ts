/**
 * RespirationMixin — the body's air-exchange driver and the acute crisis
 * when exchange stops (asphyxiation: drowning, vacuum). It is the vitals
 * driver that finally **drives `spo2`** — a live, banded vital sign that
 * already gates consciousness but had no driver, exactly as
 * `coreTemperature` waits on thermal.
 *
 * Unlike the lazy reconcile-on-read drivers (metabolism, thermal),
 * respiration is an **event-triggered scheduled-engagement crisis
 * driver**: benign ambient runs *nothing* (no scheduler, no `spo2`
 * movement, zero reconcile — the idle case is provably zero-cost); a
 * hostile-medium event engages one bounded, cancellable
 * `RespirationDrain` that self-terminates the instant air exchange
 * resumes (cancel + a brief `RespirationRecovery`).
 *
 * **Compose, don't absorb.** Respiration owns only no-oxygen → `spo2`.
 * Cold → thermal; pressure → the deferred shared layer; toxin →
 * metabolism's toxin-burden; opacity → perception. It does NOT read
 * `spo2Throttle` (that is metabolism's read of the now-driven sign).
 *
 * **Plumbing, not anatomy.** It reads channel-state (exchanging or not),
 * never orifices. No modeled lung/throat part; the `respires` opt-out on
 * the body plan opts a body out entirely.
 *
 * Mirrors two merged precedents — `MetabolicMixin` for the death seam,
 * the cascade-spawns-conditions pattern, the `*_DEFAULTS` const-object,
 * the host-intersection cast, the linkdead/far-past presence freeze, and
 * the `*NowSeconds()` world-clock-presence guard; and the activity
 * framework for the bounded crisis drain.
 *
 * Operational reference (graduated at sweep):
 * `docs/subsystems/respiration.md`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import type { Vitals } from '../vitals/Vitals';
import type { Organism } from '../species/Organism';
import type { BreathingSpec } from '../../platform/idea/species/BodyPlan';
import type { Engaged } from '../activity/Engaged';
import type Exit from '../boundary/Exit';
import type { AfflictionRecord } from '../../platform/idea/Condition';
import type { BulkSlot } from '../bulk/Bulkable';
import type { Container } from '../spatial/Container';
import { MixinApi } from '../../api/mixin';
import type Material from '../material/Material';
import { SchedulerApi } from '../../api/scheduler';
import { BiomeApi } from '../../api/biome';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import type { CommandContributions } from '../../api/command';
import type { RespirationCause } from './RespirationDrain';
import { RespirationDrain, RespirationRecovery, RespirationTread } from './RespirationDrain';

/**
 * Every respiration dial as a module const-object (the
 * `METABOLIC_DEFAULTS` precedent). All magnitudes are defensible
 * playtest defaults — the structure is the deliverable, the rates are
 * tuned. Times are GAME-seconds; `*_PER_SEC` are `%`-points per
 * game-second. **Rates are playtest-tuned, not plan decisions.**
 */
export const RESPIRATION_DEFAULTS = {
  /** Game-ms per drain/recovery emission tick (→ `WorldClockApi.every`). */
  EMISSION_INTERVAL_MS: 2000,
  /**
   * `spo2` drain rate per game-second by cause. Vacuum-vs-water tuning
   * (a per-medium split) would live here later; v1 keys by cause.
   */
  DRAIN_PER_SEC_BY_CAUSE: {
    medium: 1.5,
    supply: 1.5,
    channel: 2.0,
  } as Record<RespirationCause, number>,
  /**
   * ⭐ The breath is a STORE (underwater D10): liters of oxygen a body can
   * spend without breathing, per liter of lung — a resting adult's full
   * breath is about ninety seconds of basal burn. Burned at
   * {@link BASAL_O2_L_PER_S} scaled by effort, cold and conditioning.
   */
  USABLE_O2_PER_LUNG_L: 0.075,
  /** Basal oxygen burn of a resting body, liters per game-second. */
  BASAL_O2_L_PER_S: 0.3 / 60,
  /** Default lung volume when a plan does not say, liters (an adult). */
  LUNG_VOLUME_L: 6,
  /** What `exhale` leaves in the lungs: a fraction of a full store. */
  RESIDUAL_FRACTION: 0.2,
  /**
   * What ordinary breathing keeps in the lungs: half a full breath. A
   * body the water takes by surprise has this much; one that took a deep
   * breath first (`inhale`) has all of it.
   */
  TIDAL_FRACTION: 0.5,
  /** How long a deep breath stays taken before it is let go, game-seconds. */
  DEEP_BREATH_SEC: 30,
  /** Seconds of breathing to refill an emptied store. */
  REFILL_SEC: 10,
  /** Repeated `inhale`s within this many seconds are hyperventilating. */
  HYPERVENTILATE_WINDOW_SEC: 10,
  /** How far each hyperventilating breath lowers where the urge starts. */
  HYPERVENTILATE_URGE_STEP: 0.15,
  /** The lowest the urge can be pushed down (it starts there). */
  HYPERVENTILATE_URGE_FLOOR: -0.45,
  /** Water colder than this takes your breath on entry, K. */
  COLD_SHOCK_K: 288,
  /** How long the gasp of cold shock caps the breath, game-seconds. */
  COLD_SHOCK_SEC: 60,
  /** Effort over this many watts doubles the burn (`1 + P/this`). */
  EFFORT_W_PER_DOUBLING: 100,
  /** What staying up costs an adequate swimmer, W (the tread). */
  TREAD_W: 150,
  /** Seconds a spent body keeps its head up before it goes under. */
  DROWNING_RESPONSE_SEC: 60,
  /** Holding something that floats you this hard (N) holds you up. */
  FLOAT_SUPPORT_N: 30,
  /** Unequalized descent that hurts, meters (raised by diving). */
  SQUEEZE_AT_M: 3,
  /**
   * ⭐ The bends (underwater D27): three tissue compartments, Haldane's
   * half-times in game-seconds, and the load (atm of dissolved gas) each
   * can carry back to the surface without bubbling. A fast tissue fills
   * and empties in minutes; a slow one keeps what it took for hours.
   */
  GAS_HALF_TIMES_S: [300, 1200, 3600] as readonly number[],
  GAS_M_VALUES: [1.4, 1.25, 1.12] as readonly number[],
  /** `spo2` recovery rate per game-second on return to breathable air. */
  RECOVER_PER_SEC: 4.0,
  /** Lethal floor: dwell at/below this `spo2` accrues toward death. */
  ANOXIA_FLOOR_PCT: 5,
  /** Dwell at/below the floor before the death seam fires (game-seconds). */
  ANOXIA_LETHAL_SEC: 30,
  /** Far-past guard (reuse metabolism's 4h) — a gap this long = absence. */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,
  /** W2: litres of air a worn tank yields per game-second under supply. */
  TANK_TAP_PER_SEC: 0.5,
  /** Cause-of-death string by cause (the death seam's `causeOfDeath`). */
  DEATH_CAUSE_BY_CAUSE: {
    medium: 'asphyxiation',
    supply: 'asphyxiation',
    channel: 'strangulation',
  } as Record<RespirationCause, string>,
  /**
   * Dying window (game-seconds) once the anoxia cascade turns lethal.
   * Short — the brain does not wait. ⭐ Lengthened by cold water (the
   * dive reflex and a cold brain): see {@link coldWindowFactor}.
   */
  DYING_WINDOW_SEC: 90,
};

/** The urge crossings, and what the body says at each (`self.body`). */
const URGE_CUES: ReadonlyArray<readonly [number, string]> = [
  [0.5, 'You want to breathe.'],
  [0.75, 'Your chest is burning.'],
  [0.9, "You can't hold it much longer."],
];

/** The burn by wind conditioning: an untrained body spends its breath fast. */
const WIND_BURN: Readonly<Record<string, number>> = {
  untrained: 1.2,
  novice: 1.0,
  competent: 0.9,
  proficient: 0.85,
  expert: 0.8,
};

/** The tread by swimming band: an untrained body thrashes; an expert barely moves. */
const SWIM_TECHNIQUE: Readonly<Record<string, number>> = {
  untrained: 3.0,
  novice: 2.0,
  competent: 1.3,
  proficient: 1.0,
  expert: 0.8,
};

/** How far a diver can go down before the squeeze, by diving band (× the base). */
const SQUEEZE_BY_DIVING: Readonly<Record<string, number>> = {
  untrained: 1,
  novice: 2,
  competent: 3,
  proficient: 4,
  expert: Infinity,
};

/** What `inhale` did. */
export type InhaleResult =
  | { ok: true; hyperventilating: boolean }
  | { ok: false; reason: 'nothing-to-breathe'; line: string };

/** Numeric AppSetting read, falling back to the seeded literal (test-safe). */
function respirationDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The inner-mixin surface a respiring body composes over — the host cast
 * idiom (the `MetabolicHost` precedent). The `Engaged` / `Mobile` /
 * `Sensor` / `HasInteractive` surfaces are Character-tier / optional, so
 * they are runtime-narrowed (`MixinApi.isEngaged` / `isMobile` / …) where
 * used, NOT folded into the host type.
 */
type RespirationHost = Stuff & Vitals & Organism;

export interface Respiration {
  /** Game-time (seconds) of the last drain/recovery tick; 0 = unseeded. */
  respirationClockStamp: number;
  setRespirationClockStamp(value: number): void;

  /** The species breathable set (default `['air']`; water-breaters `['water']`). */
  getBreathableMedia(): readonly string[];
  /** ⭐ A held working lets this body breathe `medium` freely (underwater D18); null ends it. */
  setConferredBreathing(medium: string | null): void;
  getConferredBreathing(): string | null;
  /** Whether this body respires at all (the `respires` opt-out). */
  isRespiring(): boolean;
  /** Whether a voluntary/automatic breath-hold is currently active. */
  isHoldingBreath(): boolean;

  /** The central event-driven re-resolve: engage/cancel the crisis drain. */
  reassess(): Promise<void>;
  /** The traverse hook (the `Mobile.onTraversed` shape) — fires `reassess` on every move. */
  onTraversed(via: Exit): void;
  /** The containment-move hook — every move re-checks the medium (fishing D8). */
  onMoved(from: (Stuff & Container) | null, to: (Stuff & Container) | null): void;

  /** Emission body of the drain engagement (delegated from `RespirationDrain`). */
  respirationDrainTick(drain: RespirationDrain): void;
  /** Emission body of the recovery engagement. */
  respirationRecoverTick(recovery: RespirationRecovery): void;
  /** Emission body of the tread engagement (staying up costs). */
  respirationTreadTick(tread: RespirationTread): void;
  /**
   * ⭐ The instinctive drowning response (underwater D12): a body with
   * nothing left to tread with, its head tipping back. It cannot call
   * out; it can still grab what floats within reach.
   */
  isInDrowningResponse(): boolean;
  /** Lying back on the water at no cost (`float`). */
  isFloating(): boolean;
  /** Float on your back — or refuse, in words, when you cannot. */
  float(): Promise<{ ok: true } | { ok: false; reason: string; line: string }>;
  /** Clear the pressure on your ears (`equalize`). */
  equalize(): void;
  /** The unequalized pressure on your ears, meters of descent. */
  getPressureDebtM(): number;
  /** Dissolved gas per tissue compartment, atm (the bends, D27). */
  getGasLoad(): readonly number[];
  /**
   * ⭐ Held up face-up at the surface (underwater D11) — by the water's
   * answer to a disconnected player. Breathing, at no cost, until
   * {@link releaseHold}.
   */
  holdUp(): void;
  releaseHold(): void;
  /** A drowning body has grabbed this one (D28). */
  beClungTo(by: Stuff): void;
  isHeldUp(): boolean;

  /**
   * Take a full breath — fill the store, where there is air to fill it
   * from. Under water there is nothing to breathe (#94): refused.
   * Repeated quickly it is hyperventilating: no more oxygen, and the
   * warning comes later.
   */
  inhale(): Promise<InhaleResult>;
  /** Let the breath out — the store falls to the residual. */
  exhale(): void;
  /** Liters of oxygen the body can still spend without breathing. */
  getO2StoreL(): number;
  /** The urge to breathe, 0 (none) … 1 (you cannot hold it). */
  getBreathUrge(): number;
  /** What a full breath holds, liters of usable oxygen. */
  fullO2StoreL(): number;
  /**
   * The air in the lungs now, liters at the surface — a full breath's
   * worth after `inhale`, the residual after `exhale`. What the water
   * reads for buoyancy.
   */
  getLungAirL(): number;
}

export function RespirationMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class RespirationMixin extends Base implements Respiration {
    static _mixinName = 'RespirationMixin';

    static fieldMeta: FieldMeta = {
      respirationClockStamp: { persistent: true, runtimeState: true },
    };

    /**
     * Contextual affordances — surface `inhale` / `exhale` on the self
     * affordance surface (the `EngagedMixin.commandContributions`
     * precedent) so the water's edge offers them.
     */
    static commandContributions: CommandContributions = {
      self: ['platform/cmd/posture/inhale.yaml', 'platform/cmd/posture/exhale.yaml'],
      peers: [],
      environment: [],
    };

    /**
     * The only persisted field — the drain's elapsed anchor.
     */
    public respirationClockStamp = 0;

    /**
     * ⭐ Runtime-only: the breath (underwater D10). `null` is a full
     * store. Not persisted — a reloaded body has been breathing.
     * TypeScript `private` (not `#`): mixin instance state lives on the
     * proxy target.
     */
    private _o2StoreL: number | null = null;

    /** The medium a held working lets this body breathe, or null (runtime; D18). */
    private _conferredMedium: string | null = null;

    /** The share of need met by the medium now, 0..1 (runtime; D21). */
    private _intake = 0;
    /** When the store was last reconciled (game-seconds). */
    private _storeStampS: number | null = null;
    /** Whether the store was being refilled (exchanging) since the stamp. */
    private _storeFilling = true;
    /** The urge to breathe, 0..1 (it may start below 0 when hyperventilated). */
    private _co2Urge = 0;
    /** Where the next hold's urge starts (hyperventilation lowers it). */
    private _urgeStart = 0;
    /** The last urge crossing spoken (0 = none). */
    private _urgeCued = 0;
    /** The last `inhale`, for hyperventilation. */
    private _lastInhaleS: number | null = null;
    /** Cold shock caps the breath until this time. */
    private _coldShockUntilS: number | null = null;
    /** Whether the body was under water at the last reassess. */
    private _wasUnder = false;
    /** Whether this body blacked out under water (the rescued cough). */
    private _blackedOutUnder = false;
    /**
     * Who is clinging to this body in the drowning response — runtime,
     * by stuffId (D28: the drowning grab). Each one is a body this one
     * holds up as well as its own.
     */
    private _clungBy = new Set<string>();
    /** Held face-up at the surface (a disconnected body, underwater D11). */
    private _heldUp = false;
    /** Floating on your back (`float`) — no tread, until you go under or out. */
    private _floating = false;
    /** When the instinctive drowning response began, game-seconds. */
    private _drowningSinceS: number | null = null;
    /** The unequalized descent on your ears, meters. */
    private _pressureDebtM = 0;
    /** How deep you were at the last reassess, meters. */
    private _lastDepthM = 0;
    /** The squeeze stages suffered since the last equalize (0, 1 squeeze, 2 eardrum). */
    private _squeezeStage = 0;
    /**
     * ⭐ Dissolved gas per tissue compartment, atm (underwater D27) —
     * loaded at the water's pressure while breathing from a worn supply,
     * given back at whatever pressure the body breathes at. Runtime.
     */
    private _gasLoad: number[] = [1, 1, 1];
    /** When the gas load was last reconciled, game-seconds. */
    private _gasStampS: number | null = null;
    /** The pressure the body was breathing at then, atm. */
    private _gasAtAtm = 1;
    /** The last swimming and diving bands read, warmed at reassess. */
    private _swimBand = 'untrained';
    private _diveBand = 'untrained';
    /** How full the lungs are of gas, 0..1 of their volume (tidal by default). */
    private _lungFill: number = RESPIRATION_DEFAULTS.TIDAL_FRACTION;

    /** Runtime debounce for the one-shot blackout cue. */
    private _blackoutCued = false;

    /** Runtime debounce for the one-shot drain-begin cue. */
    private _drainCued = false;

    public setRespirationClockStamp(value: number): void {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new RangeError(
          `RespirationMixin.setRespirationClockStamp: must be a finite ` +
            `number >= 0, got ${String(value)}`,
        );
      }
      this.respirationClockStamp = value;
    }

    /* ──────────────────── species config reads ──────────────────── */

    public getBreathableMedia(): readonly string[] {
      return this.breathingNow().filter((b) => b.intake >= 1).map((b) => b.medium);
    }

    /**
     * ⭐ How this body breathes now (underwater D21): its species' breathing
     * at its life stage, else its plan's — a tadpole on gills, the frog on
     * lungs and its skin.
     */
    private breathingNow(): readonly BreathingSpec[] {
      const self = this as unknown as Stuff;
      const organism = MixinApi.isOrganism(self) ? self : null;
      const species = organism?.getSpecies() ?? null;
      const own: readonly BreathingSpec[] = organism && species
        ? species.breathingFor(organism.getLifeStage())
        : [{ medium: 'air', apparatus: 'lungs', intake: 1 }];
      const conferred = this._conferredMedium;
      if (conferred === null) return own;
      // ⭐ A held working (underwater D18): the medium it confers, freely.
      return [...own.filter((b) => b.medium !== conferred), { medium: conferred, apparatus: 'working', intake: 1 }];
    }

    public setConferredBreathing(medium: string | null): void {
      if (medium === this._conferredMedium) return;
      this._conferredMedium = medium;
      void this.reassess();
    }

    public getConferredBreathing(): string | null {
      return this._conferredMedium;
    }

    /**
     * ⭐ The share of this body's need it takes from `medium` here, now
     * (underwater D21): the apparatus's intake, and for gills in water the
     * water's oxygen against what the species can live on — a trout in
     * foul, oxygen-poor water breathes, and not enough.
     */
    private intakeIn(medium: string): number {
      const spec = this.breathingNow().find((b) => b.medium === medium);
      if (!spec) return 0;
      let intake = spec.intake;
      const self = this as unknown as Stuff;
      if (spec.apparatus === 'gills' && medium === 'water' && MixinApi.isOrganism(self)) {
        const o2 = BiomeApi.mediumFor(self).oxygenMgL;
        const species = self.getSpecies();
        if (typeof o2 === 'number' && species) {
          // The habitat of this body's stage — a tadpole's, not the frog's.
          const habitat = species.getHabitatByStage()[self.getLifeStage() ?? 'adult'] ?? species.getHabitat();
          intake *= species.toleranceIn(habitat, 'oxygenMgL', o2);
        }
      }
      return Math.max(0, Math.min(1, intake));
    }

    public isRespiring(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return true;
      return self.getSpecies()?.getBodyPlan()?.isRespiring() ?? true;
    }

    /* ──────────────────── medium / supply resolution ──────────────────── */

    /**
     * The surrounding-medium tag. ⭐ **Swimming is at the SURFACE** (maritime
     * review, 2026-10-14): a swimmer is between the water it moves through
     * and the air over it, and breathes whichever its body can — a fish
     * stays under and breathes the water, a person keeps their head up and
     * breathes the air. Nothing in the game models being BELOW the surface
     * yet; going under is the underwater build's (the dive face), and that
     * is where drowning while swimming comes back. (Until then the swim
     * medium won outright, and a person swimming across a still pool
     * blacked out in seconds and drowned — found walking the estuary pool.)
     * Then ⭐ **the
     * liquid you are immersed in** — the nearest containing vessel that
     * holds a bulk interior answers with its material's name (a carp in
     * a bowl of water breathes `water`; a man in a vat of ale breathes
     * nothing; a fish in *fouled water* does not breathe either, which is
     * the honest answer); otherwise the atmosphere resolved outward from
     * the body's containment chain.
     *
     * Immersion lives HERE and not in the atmosphere walk because the
     * atmosphere is the air over a place — temperature, pressure and
     * humidity ride that walk — and only respiration asks what a body is
     * immersed in. Put in `syncChainWalk`, a bowl's water would become
     * the room's air temperature.
     */
    private async resolveCurrentMedium(): Promise<{
      medium: string;
      /** True when the medium is a LIQUID the body sits in, not an atmosphere. */
      immersed: boolean;
    }> {
      const self = this as unknown as Stuff;
      if (MixinApi.isMobile(self)) {
        const m = self.getEngagedMode()?.getMedium();
        if (m && this.getBreathableMedia().includes(m)) return { medium: m, immersed: false };
        // Otherwise the surface: the air over the water, resolved below.
      }
      // Not placed in a container → no environment to threaten it. A body
      // is both Containable (it has a container) and a Container (the scope
      // the atmosphere chain walks outward from) — narrow to both.
      if (!MixinApi.isContainable(self) || !self.getContainer()) {
        return { medium: 'air', immersed: false };
      }
      // ⭐ The one medium read (underwater D3): a vessel's liquid, a
      // holder's own air, a water place's water — answered once.
      // ⭐ Swimming is at the SURFACE: a body in the water there breathes
      // the air over it; only a body under the surface is immersed.
      const read = BiomeApi.mediumFor(self);
      if (read.immersed && !read.atSurface) return { medium: read.substance, immersed: true };
      const place = self.getContainer();
      if (read.atSurface && place !== null) {
        return { medium: await BiomeApi.resolveAtmosphereFor(place), immersed: false };
      }
      if (!MixinApi.isContainer(self)) return { medium: 'air', immersed: false };
      return { medium: await BiomeApi.resolveAtmosphereFor(self), immersed: false };
    }

    /**
     * Whether a worn air supply is present and whether it still has air.
     * `'available'` (a tank with air — the drain taps it and pins spo2),
     * `'present-empty'` (a worn tank, but dry → the supply-exhausted
     * crisis), `'none'` (no carried supply → the medium crisis).
     */
    private currentSupply(): 'available' | 'present-empty' | 'none' {
      const slot = this.findWornAirSupply();
      if (!slot) return 'none';
      return slot.available() > 0 ? 'available' : 'present-empty';
    }

    /**
     * The body's worn air supply, if any — a worn `Bulkable` whose
     * interior material is a medium this body breathes (an air tank for
     * an air-breather). Walks the body's occupied slots (worn gear lands
     * in the body-plan slots). Returns the interior `BulkSlot` or `null`.
     */
    private findWornAirSupply(): BulkSlot | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSlotted(self)) return null;
      const media = new Set(this.getBreathableMedia());
      for (const occupants of self.getAllOccupants().values()) {
        for (const occ of occupants) {
          if (!MixinApi.isBulkable(occ)) continue;
          const name = occ.getBulkMaterial('interior')?.getName();
          if (name && media.has(name)) return occ.getBulk('interior');
        }
      }
      return null;
    }

    /**
     * The three-trigger resolver. Exchanging iff the current medium is in
     * this body's breathable set; else a worn air supply may cover it
     * (W2); else not exchanging, with the cause that fits.
     */
    private async assessExchange(): Promise<{
      exchanging: boolean;
      cause: RespirationCause | null;
    }> {
      const { medium, immersed } = await this.resolveCurrentMedium();
      // ⚠ Destructed during the await above (a released fish, mid-drain):
      // the proxy is inert now and every read answers `undefined`.
      const set = this.getBreathableMedia() as readonly string[] | undefined;
      if (!set) return { exchanging: true, cause: null };
      const intake = this.intakeIn(medium);
      // ⭐ A partial intake (a frog's skin, gills in poor water) slows the
      // drain by what it takes in (underwater D21); it does not stop it.
      this._intake = intake >= 1 ? 1 : intake;
      if (intake >= 1) {
        // ⭐⭐ **A breathable medium is not the same as breathable air.**
        // The tag says what the medium IS; the contents say how much of
        // it is left. A room filling with a fire's exhaust reports `air`
        // throughout and suffocates you anyway — which is what actually
        // happens, and is why the tag never needed to change.
        if (immersed) return { exchanging: true, cause: null };
        const self2 = this as unknown as Stuff;
        if (!MixinApi.isContainer(self2)) {
          return { exchanging: true, cause: null };
        }
        const contents = BiomeApi.resolveAtmosphereContentsFor(
          self2 as Stuff & Container,
        );
        if (BiomeApi.hasBreathableShare(contents)) {
          return { exchanging: true, cause: null };
        }
        const supplyHere = this.currentSupply();
        if (supplyHere === 'none') return { exchanging: false, cause: 'medium' };
        return { exchanging: false, cause: 'supply' };
      }

      // Medium not in this body's set. Confirm it is a *known* atmosphere
      // (`breathableOf` throws on unknown) — an unmodeled medium raises no
      // crisis. This is the engine's read of the biome breathable column.
      // ⚠ An IMMERSION is exempt from the exemption: a liquid the body
      // sits in is a liquid whether or not the biome table names it — a
      // man in a vat of ale, a fish in fouled water — and neither
      // breathes it.
      let known = immersed || intake > 0;
      if (!known) {
        try {
          BiomeApi.breathableOf(medium);
          known = true;
        } catch {
          known = false;
        }
      }
      if (!known) return { exchanging: true, cause: null };

      // Known hostile medium for this body. A worn tank (with or without
      // air) makes this a 'supply' situation: the drain runs either way —
      // the tick taps the tank while it has air (pinning spo2), then drops
      // spo2 once it runs dry. No carried tank → the bare 'medium' crisis.
      const supply = this.currentSupply();
      if (supply === 'none') return { exchanging: false, cause: 'medium' };
      return { exchanging: false, cause: 'supply' };
    }

    /* ──────────────────── the central re-resolve ──────────────────── */

    /**
     * Fold the current medium's inhaled contaminant (if any) into the body's
     * metabolism toxin burden — the biome `contaminant` seam's first consumer.
     * No-op for a clean medium or a non-Metabolic body. Bounded: one
     * increment per reassess, cleared over time by the toxin's `Condition`.
     */
    private async applyMediumContaminant(): Promise<void> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isMetabolic(self)) return;
      let contaminant: string | null = null;
      try {
        const { medium, immersed } = await this.resolveCurrentMedium();
        // A liquid is not in the biome's contaminant column.
        if (immersed) return;
        contaminant = BiomeApi.contaminantOf(medium);
      } catch {
        return;
      }
      if (!contaminant) return;
      const perBreath = respirationDial(
        AppSettingKeys.respirationContaminantBurdenPerBreath,
        5,
      );
      self.addToxinBurden(contaminant, perBreath);
    }

    /**
     * ⭐ Fold what the air CARRIES into the body's toxin burden — the
     * contents seam's first consumer, and the honest version of the
     * medium contaminant above.
     *
     * A gas row's `toxicity` is read as *burden per breath at unit
     * fraction*, so a room one-tenth full of smoke poisons at a tenth
     * the rate. ⚠ Deliberately independent of breathability: a
     * perfectly breathable room can be poisoning you, which is the
     * whole carbon-monoxide lesson.
     */
    private applyMediumContents(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isMetabolic(self)) return;
      if (!MixinApi.isContainable(self) || !self.getContainer()) return;
      if (!MixinApi.isContainer(self)) return;
      const contents = BiomeApi.resolveAtmosphereContentsFor(
        self as Stuff & Container,
      );
      if (contents.length === 0) return;
      for (const c of contents) {
        if (!(c.amount > 0)) continue;
        const material = StuffApi.findByTemplatePath<Material>(c.type);
        if (!material) continue;
        for (const toxin of material.getToxicity()) {
          if (!(toxin.amount > 0)) continue;
          self.addToxinBurden(toxin.type, toxin.amount * c.amount);
        }
      }
    }

    public async reassess(): Promise<void> {
      const self = this as unknown as Stuff;
      // ⚠ A body destructed mid-drain (a released fish) still has a tick
      // or a move hook in flight; an inert proxy answers every read with
      // `undefined`, and `undefined.includes` was an unhandled rejection
      // that took the server down (found by the fishing drive).
      if (self.isDestroyed()) return;

      // Constructs never engage; a corpse never drowns again — tear down
      // any active engagement in both cases.
      //
      // "Does this body run living processes?" — `isLivingBody()`, which is
      // neither `!isDead()` (a shade is undead, and must not be able to
      // drown) nor `isAlive()` (an unhydrated body carries the empty
      // default and has always respired).
      const notLiving =
        MixinApi.isOrganism(self) && !self.isLivingBody();
      if (!this.isRespiring() || notLiving) {
        if (MixinApi.isEngaged(self)) {
          SchedulerApi.cancelByType(self, 'respiration-drain');
          SchedulerApi.cancelByType(self, 'respiration-recovery');
        }
        return;
      }

      // A body without an engagement slot (a bare non-Character Creature,
      // Risk #4) resolves the medium but holds no scheduled drain. Past
      // the guard the host is Engaged; it is also this Respiration mixin's
      // host, so the engagement constructors take it directly.
      if (!MixinApi.isEngaged(self)) return;
      const engaged: Stuff & Engaged & Respiration = self as Stuff &
        Engaged &
        Respiration;

      // The drain/recovery occupy the `'body'` slot. We cancel our own
      // sibling (synchronously, below) before starting, so the slot is
      // free for our `start` — respiration is the only `'body'`-slot
      // producer today. When another lands, it must declare itself
      // `replaceableBy` respiration (or this start would no-op on
      // conflict, silently suppressing the crisis).
      const { exchanging, cause } = await this.assessExchange();
      if (self.isDestroyed()) return;
      // ⭐ Into cold water: the gasp (underwater D13). Read on the
      // transition into the water, at the surface or under it.
      const medium = BiomeApi.mediumFor(self);
      const inWater = medium.immersed && medium.tag === 'water';
      const nowS = this.respirationNowSeconds();
      if (inWater && !this._wasUnder && nowS !== null && medium.temperatureK !== null &&
          medium.temperatureK < RESPIRATION_DEFAULTS.COLD_SHOCK_K) {
        this.coldShock(nowS);
      }
      this._wasUnder = inWater;
      if (exchanging && nowS !== null) this.reconcileStore(nowS, true);
      // Inhaled-contaminant fold (the fire driver's first consumer of the
      // biome `contaminant` seam): a body breathing a contaminated medium
      // (smoke → carbon monoxide) takes on the toxin as a metabolism burden,
      // whether or not it can still exchange O₂. An enclosed fire poisons as
      // well as smothers.
      await this.applyMediumContaminant();
      this.applyMediumContents();
      const drain = engaged.getEngagementByType('respiration-drain');
      const recovery = engaged.getEngagementByType('respiration-recovery');

      // ⭐ Down the water: the pressure on your ears (underwater D15).
      this.notePressure(medium);
      // ⭐ The gas the tissues take up at depth, and the bends (D27).
      if (nowS !== null) this.reconcileGas(nowS, medium, cause === 'supply' && this.hasWornAir());
      await this.warmWaterBands();
      if (self.isDestroyed()) return;
      const tread = engaged.getEngagementByType('respiration-tread');
      const treading = exchanging && medium.immersed && medium.atSurface && medium.tag === 'water';
      if (!medium.immersed || !medium.atSurface) {
        this._floating = false;
        this._heldUp = false;
        this._drowningSinceS = null;
      }

      if (exchanging) {
        if (drain) SchedulerApi.cancelByType(engaged, 'respiration-drain');
        if (!treading && tread) SchedulerApi.cancelByType(engaged, 'respiration-tread');
        if (treading && !tread && !recovery) {
          this.seedClock();
          SchedulerApi.start(new RespirationTread(engaged));
          return;
        }
        if (!recovery && !tread) {
          const host = this as unknown as RespirationHost;
          const baseline = host.getVitalBand('spo2').baseline;
          const spo2 = host.getVitalSign('spo2').rawValue();
          if (spo2 < baseline) {
            this.seedClock();
            SchedulerApi.start(new RespirationRecovery(engaged));
          }
        }
        return;
      }

      // Not exchanging.
      if (recovery) SchedulerApi.cancelByType(engaged, 'respiration-recovery');
      if (tread) SchedulerApi.cancelByType(engaged, 'respiration-tread');
      if (!drain) {
        this.armDrain();
        SchedulerApi.start(new RespirationDrain(engaged, cause ?? 'medium'));
      }
    }

    public onTraversed(via: Exit): void {
      const inner = (Base.prototype as {
        onTraversed?: (v: Exit) => void;
      }).onTraversed;
      if (typeof inner === 'function') inner.call(this, via);
      // Fire-and-forget — the move reassess seam (#7, Risk #1).
      void this.reassess().catch(() => {});
    }

    /**
     * ⭐ Every containment move re-checks the medium (fishing D8): a
     * landed fish starts drowning in the hand, stops in the bowl, and a
     * person carried into a flooded cell is not exempt. Chains any inner
     * `onMoved` witness first (the `Thermal` shape).
     */
    public onMoved(
      from: (Stuff & Container) | null,
      to: (Stuff & Container) | null,
    ): void {
      const sup = (Base.prototype as {
        onMoved?: (
          f: (Stuff & Container) | null,
          t: (Stuff & Container) | null,
        ) => void;
      }).onMoved;
      if (typeof sup === 'function') sup.call(this, from, to);
      // Fire-and-forget, and a failed re-check (no biome loaded, a
      // torn-down room) must not surface as an unhandled rejection from
      // inside a containment move.
      void this.reassess().catch(() => {});
    }

    /* ──────────────────── engagement tick bodies ──────────────────── */

    public respirationDrainTick(drain: RespirationDrain): void {
      const self = this as unknown as Stuff;
      const host = this as unknown as RespirationHost;
      const nowS = this.respirationNowSeconds();
      if (nowS === null) return;
      if (this.respirationClockStamp === 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      // Linkdead freeze (the metabolism guard verbatim).
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.respirationClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.respirationClockStamp;
      if (elapsed <= 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      if (elapsed > RESPIRATION_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.respirationClockStamp = nowS;
        return;
      }
      this.respirationClockStamp = nowS;

      // ⭐ Under water the hold IS the store, and it is silent: nobody
      // tells you the air is gone, your chest does (`self.body`). A room
      // that fills with smoke you notice at once.
      const under = drain.cause === 'medium' && this.underWater();
      // ⭐ Come up into the air (found by the drive): a drain tick that
      // lands between the arrival and the reassess is not a crisis — the
      // swimmer at the surface breathes. Reassess and say nothing.
      const surfaced = BiomeApi.mediumFor(self);
      if (drain.cause === 'medium' && surfaced.tag === 'water' && surfaced.immersed && surfaced.atSurface) {
        void this.reassess();
        return;
      }
      if (!this._drainCued && !under) {
        this._drainCued = true;
        this.cueDrainBegin();
      }

      // ⭐⭐ The breath burns first (underwater D10): store ÷ burn, and the
      // urge as a second clock that can lie (hyperventilation).
      if (drain.cause !== 'supply' || !this.hasWornAir()) {
        const store = this.reconcileStore(nowS, false);
        if (store > 0) {
          const burn = this.burnO2LPerS() * (1 - this._intake);
          const spent = Math.min(store, burn * elapsed);
          this._o2StoreL = store - spent;
          this._storeStampS = nowS;
          const full = this.fullO2StoreL();
          if (full > 0) this._co2Urge += spent / full;
          this.speakUrge();
          void this.reassess();
          return;
        }
      }

      // Carried-supply tap (W2): a worn air tank with air left holds spo2
      // steady, depleting at the tap rate. When it runs dry this branch
      // falls through to the spo2 drop — the supply-exhausted crisis.
      if (drain.cause === 'supply') {
        const tank = this.findWornAirSupply();
        if (tank && tank.available() > 0) {
          const tap = RESPIRATION_DEFAULTS.TANK_TAP_PER_SEC * elapsed;
          tank.debit(Math.min(tank.available(), tap));
          void this.reassess();
          return;
        }
      }

      const drainPerSec = RESPIRATION_DEFAULTS.DRAIN_PER_SEC_BY_CAUSE[drain.cause] *
        (drain.cause === 'medium' ? 1 - this._intake : 1);
      const cur = host.getVitalSign('spo2').rawValue();
      const next = Math.max(0, cur - drainPerSec * elapsed);
      host.setVitalSign('spo2', Quantity.of(next, '%'));

      const survivableMin = host.getVitalBand('spo2').survivableMin;
      if (next <= survivableMin && !this._blackoutCued) {
        this._blackoutCued = true;
        this._o2StoreL = 0;
        if (under) this._blackedOutUnder = true;
        this.cueBlackout();
      }

      const died = this.reconcileAnoxiaCascade(elapsed, drain.cause);
      if (died) {
        SchedulerApi.cancel(drain, 'preconditions-changed');
        return;
      }

      // Re-resolve so a resurface / tank-refill ends the crisis even with
      // no traverse event (the in-place trigger, Risk #1).
      void this.reassess();
    }

    public respirationRecoverTick(recovery: RespirationRecovery): void {
      const self = this as unknown as Stuff;
      const host = this as unknown as RespirationHost;
      const nowS = this.respirationNowSeconds();
      if (nowS === null) return;
      if (this.respirationClockStamp === 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.respirationClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.respirationClockStamp;
      if (elapsed <= 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      if (elapsed > RESPIRATION_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.respirationClockStamp = nowS;
        return;
      }
      this.respirationClockStamp = nowS;

      const baseline = host.getVitalBand('spo2').baseline;
      const survivableMin = host.getVitalBand('spo2').survivableMin;
      const cur = host.getVitalSign('spo2').rawValue();
      const next = Math.min(
        baseline,
        cur + RESPIRATION_DEFAULTS.RECOVER_PER_SEC * elapsed,
      );
      host.setVitalSign('spo2', Quantity.of(next, '%'));

      // Clear the asphyxiation affliction once back above the floor.
      const existing = this.findAffliction(TemplatePaths.respirationAsphyxiation);
      if (existing && next > RESPIRATION_DEFAULTS.ANOXIA_FLOOR_PCT) {
        host.relieve(existing);
      }

      // Breathing again fills the store and drops the urge.
      this.reconcileStore(nowS, true);
      this._co2Urge = 0;
      this._urgeCued = 0;

      // Regained consciousness → gasp cue, once.
      if (this._blackoutCued && next > survivableMin) {
        this._blackoutCued = false;
        this.cueRecover();
        // ⭐ Pulled out of the water after blacking out in it: the water
        // is in your lungs, and it will tell you so later (D10).
        if (this._blackedOutUnder) {
          this._blackedOutUnder = false;
          const path = TemplatePaths.respirationAspiration;
          if (!this.findAffliction(path)) {
            host.afflict({ kind: 'affliction', templatePath: path, stage: 0, elapsed: 0 });
          }
        }
      }

      // Re-pin at baseline and self-cancel (benign steady state = nothing).
      if (next >= baseline) {
        SchedulerApi.cancel(recovery, 'preconditions-changed');
        // At the surface of deep water, staying up takes over.
        void this.reassess().catch(() => {});
        return;
      }
      // Recovering at the surface is still treading.
      this.treadBeat(elapsed);
    }

    public respirationTreadTick(tread: RespirationTread): void {
      const self = this as unknown as Stuff;
      const nowS = this.respirationNowSeconds();
      if (nowS === null) return;
      if (this.respirationClockStamp === 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.respirationClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.respirationClockStamp;
      if (elapsed <= 0 || elapsed > RESPIRATION_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.respirationClockStamp = nowS;
        return;
      }
      this.respirationClockStamp = nowS;
      const medium = BiomeApi.mediumFor(self);
      if (!(medium.immersed && medium.atSurface && medium.tag === 'water')) {
        SchedulerApi.cancel(tread, 'preconditions-changed');
        void this.reassess().catch(() => {});
        return;
      }
      this.treadBeat(elapsed);
    }

    /**
     * ⭐⭐ One beat of staying up (underwater D12): swimming is a COST,
     * never a check. Floating on your back is free (if you can); holding
     * something that floats you is free; otherwise the tread is paid in
     * effort — three times what a swimmer pays if you cannot swim — and a
     * body with nothing left goes into the drowning response, and then
     * under.
     */
    protected treadBeat(elapsedS: number): void {
      const self = this as unknown as Stuff;
      const nowS = this.respirationNowSeconds() ?? 0;
      const medium = BiomeApi.mediumFor(self);
      if (!(medium.immersed && medium.atSurface && medium.tag === 'water')) return;
      if (this._floating || this._heldUp) return;
      const lift = this.netBuoyancyN(medium);
      // A small body floats on a small lift (the frog): the threshold
      // scales with the body as its lungs and burn do.
      if (lift >= RESPIRATION_DEFAULTS.FLOAT_SUPPORT_N * this.sizeFactor()) {
        // Held up by something that floats — the drowning stops.
        this._drowningSinceS = null;
        return;
      }
      if (!MixinApi.isExerting(self)) return;
      const technique = SWIM_TECHNIQUE[this._swimBand] ?? SWIM_TECHNIQUE.untrained!;
      const buoyancy = lift > 0 ? 0.5 : 1 + Math.min(3, -lift / 50);
      // ⭐ Every drowning body clinging to you is a body you hold up too.
      const clinging = this.liveClingers();
      const powerW = RESPIRATION_DEFAULTS.TREAD_W * technique * buoyancy * (1 + clinging);
      self.exert({ durationS: elapsedS, powerW });
      if (MixinApi.isAdvancing(self)) {
        void self.creditDeed({ discipline: 'swimming', difficulty: 'easy', outcome: 'success' }).catch(() => {});
      }
      const spent = self.breathBand() === 'spent';
      if (!spent) {
        this._drowningSinceS = null;
        return;
      }
      if (this._drowningSinceS === null) {
        this._drowningSinceS = nowS;
        this.drowningScene();
        this.grabNearest();
        return;
      }
      if (nowS - this._drowningSinceS >= RESPIRATION_DEFAULTS.DROWNING_RESPONSE_SEC) {
        this._drowningSinceS = null;
        const place = MixinApi.isContainable(self) ? self.getContainer() : null;
        if (place !== null && MixinApi.isWaterPlace(place)) void place.takeUnder(self);
      }
    }

    /** The water's lift on this body now, N (positive floats). */
    private netBuoyancyN(medium: { depthM: number; substance: string }): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isLoadBearing(self)) return 0;
      let rho = 1000;
      try {
        rho = BiomeApi.densityOf('water').rawValue() || 1000;
      } catch {
        /* fresh water */
      }
      return self.getNetBuoyancyN(rho, medium.depthM);
    }

    /** What the drowning look like from outside — the victim says nothing. */
    private drowningScene(): void {
      const self = this as unknown as Stuff;
      try {
        MessageApi.scene(self)
          .topic('act.deed')
          .toPeers(Mml.compose`${Mml.actor(self)} is upright in the water, head tipped back, arms pressing down at the surface — not calling, not waving.`)
          .send();
      } catch {
        // decoration
      }
    }

    public holdUp(): void {
      this._heldUp = true;
      this._drowningSinceS = null;
    }

    public releaseHold(): void {
      this._heldUp = false;
    }

    public isHeldUp(): boolean {
      return this._heldUp;
    }

    /**
     * ⭐ The drowning grab (D28): a body in the drowning response climbs
     * whoever else is in the water within reach to get its head up — the
     * rescuer now treads for two, and is the next to be spent. *Reach,
     * throw, don't go* is derived, not taught.
     */
    private grabNearest(): void {
      const self = this as unknown as Stuff;
      const place = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (place === null || !MixinApi.isContainer(place)) return;
      for (const other of place.getContents()) {
        if (other === self || !MixinApi.isRespiration(other)) continue;
        const m = BiomeApi.mediumFor(other);
        if (!(m.immersed && m.atSurface)) continue;
        other.beClungTo(self);
        try {
          MessageApi.scene(self)
            .topic('act.deed')
            .toTarget(other, Mml.compose`${Mml.actor(self)} grabs at you and climbs you, pushing you under to get their own head up.`)
            .send();
        } catch {
          // decoration
        }
        return;
      }
    }

    public beClungTo(by: Stuff): void {
      this._clungBy.add(by.stuffId);
    }

    /** The clingers still here and still drowning. */
    private liveClingers(): number {
      const self = this as unknown as Stuff;
      const place = MixinApi.isContainable(self) ? self.getContainer() : null;
      let n = 0;
      for (const id of [...this._clungBy]) {
        const who = place && MixinApi.isContainer(place)
          ? place.getContents().find((c) => c.stuffId === id) ?? null
          : null;
        if (who === null || !MixinApi.isRespiration(who) || !who.isInDrowningResponse()) {
          this._clungBy.delete(id);
          continue;
        }
        n += 1;
      }
      return n;
    }

    public isInDrowningResponse(): boolean {
      return this._drowningSinceS !== null;
    }

    public isFloating(): boolean {
      return this._floating;
    }

    public async float(): Promise<{ ok: true } | { ok: false; reason: string; line: string }> {
      const self = this as unknown as Stuff;
      const medium = BiomeApi.mediumFor(self);
      if (!(medium.immersed && medium.atSurface && medium.tag === 'water')) {
        return { ok: false, reason: 'not-at-surface', line: 'You would need to be in the water, at the surface.' };
      }
      await this.warmWaterBands();
      if (this._swimBand === 'untrained') {
        return { ok: false, reason: 'cannot-float', line: 'You try to lie back, and the water closes over your face. You come up thrashing.' };
      }
      if (this.netBuoyancyN(medium) < -RESPIRATION_DEFAULTS.FLOAT_SUPPORT_N) {
        return { ok: false, reason: 'too-heavy', line: 'You are too heavy to float; the water will not hold you.' };
      }
      this._floating = true;
      this._drowningSinceS = null;
      return { ok: true };
    }

    public equalize(): void {
      this._pressureDebtM = 0;
      this._squeezeStage = 0;
    }

    public getPressureDebtM(): number {
      return this._pressureDebtM;
    }

    /**
     * ⭐ Going down without clearing your ears (underwater D15): each meter
     * of descent since the last `equalize` is pressure on the eardrum. At
     * the squeeze depth it hurts; at twice it bursts. Coming up eases it;
     * a trained diver can take more.
     */
    private notePressure(medium: { immersed: boolean; atSurface: boolean; depthM: number }): void {
      const depth = medium.immersed && !medium.atSurface ? medium.depthM : 0;
      const delta = depth - this._lastDepthM;
      this._lastDepthM = depth;
      if (delta < 0) {
        this._pressureDebtM = Math.max(0, this._pressureDebtM + delta);
        return;
      }
      if (delta === 0) return;
      this._pressureDebtM += delta;
      const at = RESPIRATION_DEFAULTS.SQUEEZE_AT_M * (SQUEEZE_BY_DIVING[this._diveBand] ?? 1);
      const host = this as unknown as RespirationHost;
      if (this._pressureDebtM >= 2 * at && this._squeezeStage < 2) {
        this._squeezeStage = 2;
        if (!this.findAffliction(TemplatePaths.respirationBurstEardrum)) {
          host.afflict({ kind: 'affliction', templatePath: TemplatePaths.respirationBurstEardrum, stage: 0, elapsed: 0 });
        }
        this.bodyCue('Something gives in your ear with a stab of pain, and the water spins.');
      } else if (this._pressureDebtM >= at && this._squeezeStage < 1) {
        this._squeezeStage = 1;
        if (!this.findAffliction(TemplatePaths.respirationSqueeze)) {
          host.afflict({ kind: 'affliction', templatePath: TemplatePaths.respirationSqueeze, stage: 0, elapsed: 0 });
        }
        this.bodyCue('Your ears ache with the weight of the water.');
      }
    }

    /**
     * ⭐⭐ The bends (underwater D27). Each compartment relaxes toward the
     * pressure the body breathes at — the water's, `1 + depth/10`, while
     * a worn supply feeds it at depth; the surface's otherwise. A free
     * diver's lungful never loads (they take no gas down). Arriving at
     * the surface with any compartment over its limit afflicts the bends,
     * which show some minutes later; going back down below the band whose
     * pressure clears it is the recompression that relieves them.
     */
    private reconcileGas(
      nowS: number,
      medium: { immersed: boolean; atSurface: boolean; depthM: number },
      onSupply: boolean,
    ): void {
      const depth = medium.immersed && !medium.atSurface ? medium.depthM : 0;
      const breathingAt = onSupply ? 1 + depth / 10 : 1;
      if (this._gasStampS !== null && nowS > this._gasStampS) {
        const dt = nowS - this._gasStampS;
        const halves = RESPIRATION_DEFAULTS.GAS_HALF_TIMES_S;
        for (let i = 0; i < halves.length; i++) {
          const k = 1 - Math.pow(2, -dt / halves[i]!);
          this._gasLoad[i] = this._gasLoad[i]! + (this._gasAtAtm - this._gasLoad[i]!) * k;
        }
      }
      const host = this as unknown as RespirationHost;
      const path = TemplatePaths.respirationDecompression;
      const limits = RESPIRATION_DEFAULTS.GAS_M_VALUES;
      // ⭐ The bends are a surface event: over a limit with only the
      // surface's pressure holding the gas in.
      const over = this._gasLoad.some((load, i) => load / breathingAt > limits[i]!);
      const bent = this.findAffliction(path);
      if (over && breathingAt <= 1 && !bent) {
        host.afflict({ kind: 'affliction', templatePath: path, stage: 0, elapsed: 0 });
      } else if (bent && breathingAt > 1 && !over) {
        // Recompression: back under enough pressure, the bubbles go back
        // into solution.
        host.relieve(bent);
      }
      this._gasStampS = nowS;
      this._gasAtAtm = breathingAt;
    }

    /** Dissolved gas per tissue compartment, atm (fast, middle, slow). */
    public getGasLoad(): readonly number[] {
      return [...this._gasLoad];
    }

    /** Warm the swimming and diving bands the hot ticks read. */
    private async warmWaterBands(): Promise<void> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isAdvancing(self)) return;
      try {
        this._swimBand = await self.competenceBandFor('swimming');
        this._diveBand = await self.competenceBandFor('diving');
      } catch {
        /* the floor */
      }
    }

    /* ──────────────────── the death cascade ──────────────────── */

    /**
     * Mirror `MetabolicMixin.reconcileCascade` for the single anoxia
     * affliction: while `spo2` dwells at/below the lethal floor, accrue
     * dwell-time on the `asphyxiation` affliction and fire the death seam
     * when it exceeds the lethal dwell; clear it on recovery above the
     * floor. Returns whether death fired this tick.
     */
    protected reconcileAnoxiaCascade(
      elapsedSec: number,
      cause: RespirationCause,
    ): boolean {
      const host = this as unknown as RespirationHost;
      const path = TemplatePaths.respirationAsphyxiation;
      const spo2 = host.getVitalSign('spo2').rawValue();
      const existing = this.findAffliction(path);

      if (spo2 <= RESPIRATION_DEFAULTS.ANOXIA_FLOOR_PCT) {
        let record = existing;
        if (!record) {
          record = { kind: 'affliction', templatePath: path, stage: 0, elapsed: 0 };
          host.afflict(record);
        }
        record.elapsed += elapsedSec;
        if (record.elapsed >= RESPIRATION_DEFAULTS.ANOXIA_LETHAL_SEC) {
          host.beginDying(
            RESPIRATION_DEFAULTS.DEATH_CAUSE_BY_CAUSE[cause],
            RESPIRATION_DEFAULTS.DYING_WINDOW_SEC * this.coldWindowFactor(),
          );
          return true;
        }
      } else if (existing) {
        host.relieve(existing);
      }
      return false;
    }


    protected findAffliction(path: string): AfflictionRecord | null {
      const host = this as unknown as RespirationHost;
      for (const c of host.getConditions()) {
        if (c.kind === 'affliction' && c.templatePath === path) return c;
      }
      return null;
    }

    /**
     * The breath's clock — game-time over the world's scale, i.e. REAL
     * seconds (below) — or `null` when no world clock runs
     * (pre-boot, or a unit test that hasn't bootstrapped one) — the
     * metabolism presence guard verbatim, so unit tests stay idle.
     */
    protected respirationNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      // ⭐⭐ A held breath runs on REAL seconds (underwater, found by the
      // drive): it is something the player does at the keyboard. On the
      // game clock a full breath at 12× was six real seconds — not time
      // to type one command — and two divers blacked out before they
      // could speak. Every respiration interval (the store, the urge, the
      // drowning response, the rescue window, the tread, the gas) reads
      // this clock, so dividing it once makes them all human-time. The
      // charged shell's standby draw is the precedent (`Charge.standbyDraw`).
      const scale = WorldClockApi.getScale();
      return WorldClockApi.getNow().rawValue() / (Number.isFinite(scale) && scale > 0 ? scale : 1);
    }

    /* ──────────────────── voluntary breath control ──────────────────── */

    public async inhale(): Promise<InhaleResult> {
      const nowS = this.respirationNowSeconds() ?? 0;
      const { exchanging } = await this.assessExchange();
      if (!exchanging) {
        return { ok: false, reason: 'nothing-to-breathe', line: 'There is nothing to breathe here.' };
      }
      // ⭐ Quick breaths in a row are hyperventilating: no more oxygen than
      // one breath holds, and the warning starts later — the shallow-water
      // blackout, learned the way divers learn it.
      const quick = this._lastInhaleS !== null &&
        nowS - this._lastInhaleS <= RESPIRATION_DEFAULTS.HYPERVENTILATE_WINDOW_SEC;
      this._lastInhaleS = nowS;
      this._urgeStart = quick
        ? Math.max(
            RESPIRATION_DEFAULTS.HYPERVENTILATE_URGE_FLOOR,
            this._urgeStart - RESPIRATION_DEFAULTS.HYPERVENTILATE_URGE_STEP,
          )
        : 0;
      this._o2StoreL = this.capByColdShock(this.fullO2StoreL(), nowS);
      this._storeStampS = nowS;
      this._lungFill = 1;
      this._co2Urge = this._urgeStart;
      this._urgeCued = 0;
      return { ok: true, hyperventilating: quick };
    }

    public exhale(): void {
      this._lungFill = RESPIRATION_DEFAULTS.RESIDUAL_FRACTION;
      this._o2StoreL = this.fullO2StoreL() * RESPIRATION_DEFAULTS.RESIDUAL_FRACTION;
      this._storeStampS = this.respirationNowSeconds();
    }

    /** Holding a breath: under water with oxygen still in the store. */
    public isHoldingBreath(): boolean {
      return this.underWater() && this.getO2StoreL() > 0;
    }

    public getO2StoreL(): number {
      const nowS = this.respirationNowSeconds();
      return nowS === null ? (this._o2StoreL ?? this.fullO2StoreL()) : this.reconcileStore(nowS, this._storeFilling);
    }

    public getBreathUrge(): number {
      return Math.max(0, Math.min(1, this._co2Urge));
    }

    public getLungAirL(): number {
      if (this.fullO2StoreL() <= 0) return 0;
      // The gas in the lungs is what you last breathed in or out — a held
      // breath does not shrink as its oxygen is spent (the CO₂ takes its
      // place), so a diver who exhales sinks and one who inhales floats.
      return this.lungVolumeL() * this._lungFill;
    }

    public fullO2StoreL(): number {
      // Gills hold nothing: only a body that breathes air carries a breath.
      if (!this.getBreathableMedia().includes('air')) return 0;
      return this.lungVolumeL() * RESPIRATION_DEFAULTS.USABLE_O2_PER_LUNG_L;
    }

    /* ──────────────────── internals ──────────────────── */

    /** Seed/refresh the clock anchor so the next tick computes Δt cleanly. */
    private seedClock(): void {
      const nowS = this.respirationNowSeconds();
      if (nowS !== null) this.respirationClockStamp = nowS;
    }

    /** Arm a drain: seed the clock, reset cues, set the auto breath-hold. */
    private armDrain(): void {
      const nowS = this.respirationNowSeconds();
      if (nowS === null) return;
      this.respirationClockStamp = nowS;
      this._blackoutCued = false;
      this._drainCued = false;
      // The store as it stands is the hold: whatever you had in your lungs
      // when the water closed over you. A full breath taken first is the
      // free-diver's whole preparation.
      this.reconcileStore(nowS, this._storeFilling);
      this._storeFilling = false;
      this._co2Urge = Math.max(this._co2Urge, this._urgeStart);
    }

    /* ──────────────────── the breath store (underwater D10) ──────────────────── */

    /**
     * The store now: refilled while the body was breathing since the last
     * stamp (over {@link RESPIRATION_DEFAULTS.REFILL_SEC}), and held while
     * it was not. Reconcile-on-read; the drain tick spends it.
     */
    private reconcileStore(nowS: number, filling: boolean): number {
      const full = this.fullO2StoreL();
      // Breathing keeps a tidal breath in the lungs; a deep breath taken
      // in the last half-minute keeps all of it.
      const deep = this._lastInhaleS !== null &&
        nowS - this._lastInhaleS <= RESPIRATION_DEFAULTS.DEEP_BREATH_SEC;
      const target = deep ? full : full * RESPIRATION_DEFAULTS.TIDAL_FRACTION;
      let store = this._o2StoreL ?? target;
      const since = this._storeStampS;
      if (filling && since !== null && nowS > since && store < target) {
        store = Math.min(target, store + (full * (nowS - since)) / RESPIRATION_DEFAULTS.REFILL_SEC);
      }
      if (filling && store > target) store = target;
      // Breathing again, the lungs settle back to an ordinary breath.
      if (filling && since !== null && nowS > since) {
        this._lungFill = deep ? 1 : RESPIRATION_DEFAULTS.TIDAL_FRACTION;
      }
      if (filling) store = this.capByColdShock(store, nowS);
      this._o2StoreL = store;
      this._storeStampS = nowS;
      this._storeFilling = filling;
      return store;
    }

    /** The gasp of cold shock: for a while after, half a breath is all you get. */
    private capByColdShock(store: number, nowS: number): number {
      if (this._coldShockUntilS === null || nowS >= this._coldShockUntilS) return store;
      return Math.min(store, this.fullO2StoreL() / 2);
    }

    /** The body's lungs, liters — its plan's, scaled by its mass. */
    private lungVolumeL(): number {
      const self = this as unknown as Stuff;
      const plan = MixinApi.isOrganism(self) ? self.getSpecies()?.getBodyPlan() : null;
      const base = plan?.getLungVolumeL() ?? RESPIRATION_DEFAULTS.LUNG_VOLUME_L;
      return base * this.sizeFactor();
    }

    /**
     * ⭐ Liters of oxygen burned per second now: basal × effort × cold ×
     * conditioning. A kicking diver burns it two and a half times as fast
     * as a still one; cold water slows it (the dive reflex); a trained
     * wind spends it carefully.
     */
    private burnO2LPerS(): number {
      const self = this as unknown as Stuff;
      let factor = 1;
      if (MixinApi.isExerting(self)) {
        factor *= 1 + self.currentPowerW() / RESPIRATION_DEFAULTS.EFFORT_W_PER_DOUBLING;
        factor *= WIND_BURN[self.conditioningBand('wind')] ?? 1;
      }
      const water = BiomeApi.mediumFor(self);
      if (water.tag === 'water' && water.temperatureK !== null && water.temperatureK < RESPIRATION_DEFAULTS.COLD_SHOCK_K) {
        factor *= 0.8;
      }
      // ⭐ A small body burns as little as its lungs hold (D21): the burn
      // scales with mass as the store does, so a frog's breath lasts as
      // long as its size allows, not a fraction of a man's.
      return RESPIRATION_DEFAULTS.BASAL_O2_L_PER_S * factor * this.sizeFactor();
    }

    /** This body's mass over its plan's base, clamped as the lungs are. */
    private sizeFactor(): number {
      const self = this as unknown as Stuff;
      const plan = MixinApi.isOrganism(self) ? self.getSpecies()?.getBodyPlan() : null;
      const massKg = MixinApi.isTangible(self) ? self.getMass().rawValue() : 0;
      const ref = plan?.getBaseMass() || 70;
      return massKg > 0 && ref > 0 ? Math.min(4, Math.max(0.05, massKg / ref)) : 1;
    }

    /** Under the water now — not at the surface, not in a bell. */
    private underWater(): boolean {
      const read = BiomeApi.mediumFor(this as unknown as Stuff);
      return read.immersed && !read.atSurface && read.tag === 'water';
    }

    /** A worn supply with air still in it. */
    private hasWornAir(): boolean {
      const slot = this.findWornAirSupply();
      return slot !== null && slot.available() > 0;
    }

    /**
     * ⭐ How much longer a drowning brain lasts in cold water: 1 at 288 K,
     * rising to 4 in water near freezing (about six minutes). The
     * cold-water survival lesson, derived from the water's temperature.
     */
    private coldWindowFactor(): number {
      const read = BiomeApi.mediumFor(this as unknown as Stuff);
      if (read.tag !== 'water' || read.temperatureK === null) return 1;
      return Math.max(1, Math.min(4, 1 + (RESPIRATION_DEFAULTS.COLD_SHOCK_K - read.temperatureK) / 8));
    }

    /** The urge, spoken at its crossings — one line each, never a nag. */
    private speakUrge(): void {
      const urge = this.getBreathUrge();
      for (let i = URGE_CUES.length - 1; i >= 0; i--) {
        const [at, line] = URGE_CUES[i]!;
        if (urge >= at && this._urgeCued < i + 1) {
          this._urgeCued = i + 1;
          this.bodyCue(line);
          return;
        }
      }
    }

    /**
     * ⭐ Cold shock (underwater D13): going into water colder than the
     * threshold takes your breath — half the store gone and the urge up,
     * before you have held anything. Once a minute at most.
     */
    private coldShock(nowS: number): void {
      if (this._coldShockUntilS !== null && nowS < this._coldShockUntilS) return;
      this._coldShockUntilS = nowS + RESPIRATION_DEFAULTS.COLD_SHOCK_SEC;
      const store = this.reconcileStore(nowS, this._storeFilling);
      this._o2StoreL = Math.min(store, this.fullO2StoreL() / 2);
      this._co2Urge = Math.max(this._co2Urge, 0.6);
      this._urgeCued = Math.max(this._urgeCued, 1);
      this.bodyCue('The cold takes your breath.');
    }

    /* ──────────────────── player cues (best-effort) ──────────────────── */

    private cue(body: ReturnType<typeof Mml.compose>): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSensor(self)) return;
      // A cue must never throw and abort the crisis engagement — the
      // telegraph is best-effort (no message infra in a unit test, etc.).
      try {
        MessageApi.scene(self).topic('act.deed').toSelf(body).send();
      } catch {
        // swallow — the crisis is authoritative, the cue is decoration.
      }
    }

    /** A line in the body's own voice (`self.body`), best-effort. */
    private bodyCue(text: string): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSensor(self)) return;
      try {
        MessageApi.scene(self).topic('self.body').toSelf(Mml.compose`${text}`).send();
      } catch {
        // swallow — the body is authoritative, the cue is decoration.
      }
    }

    private cueDrainBegin(): void {
      this.cue(Mml.compose`You can't breathe!`);
    }

    private cueBlackout(): void {
      this.cue(Mml.compose`Your vision tunnels and everything goes black.`);
    }

    private cueRecover(): void {
      this.cue(Mml.compose`You gasp, and your vision clears.`);
    }
  };
}
