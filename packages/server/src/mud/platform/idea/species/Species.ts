/**
 * Species — taxonomic leaf carrying biological capability.
 *
 * Body plan (anatomy) lives on `BodyPlan`; capability (lifespan,
 * circadian band, vision profile, sex-determination system,
 * reproductive mode) lives on `Species`. Two species sharing a body
 * plan still differ on perception/lifecycle/breeding behavior — that's
 * the load-bearing reason capability isn't on the body plan.
 *
 * **Cross-references** (LOCKED — see implementation plan):
 *   - `_bodyPlanPath` → BodyPlan singleton
 *   - `_parentCladePath` → immediate parent Clade (kingdom or sub-clade)
 *   - `_defaultMaterialPath` → bulk Material for a default member
 *
 * Each persists as a path string; the getter resolves on each call via
 * `StuffApi.findByTemplatePath`. No instance caching, no marshaller —
 * HMR-safe by construction.
 *
 * Singleton-by-templatePath: every `/stuff/idea/species/.../<species>`
 * template resolves to one instance via `StuffApi.singleton(path)`.
 */

import { Idea } from '../../../lib/stuff/Idea';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import { PropertiedMixin } from '../../../lib/stuff/Propertied';
import { VisibleMixin } from '../../../lib/description/Visible';
import { StuffApi } from '../../../api/stuff';
import type BodyPlan from './BodyPlan';
import type Clade from './Clade';
import type Material from '../../../lib/material/Material';
import type { VisionProfile } from '../../../lib/perception/Light';
import type { FacultyProfile } from '../../../lib/magic/Faculty';
import { Faculty } from '../../../lib/magic/Faculty';
import type { NaturalAttackSpec } from '../../../lib/combat/NaturalAttack';
import { NaturalAttack } from '../../../lib/combat/NaturalAttack';
import { NameBank } from '../../../lib/species/NameBank';
import type { FieldMeta } from '../../../lib/mixin';

/** A suggested character name (given + optional surname). */
export interface SuggestedName {
  name: string;
  surname?: string;
}

function pick<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick a given name, preferring one that shares the real name's first
 * letter (the phonetic-riff bias). Falls back to any bank name, then to
 * the real name itself, then a neutral default. Module-level (not a
 * `#`-private method) because Species instances dispatch through the
 * call-security proxy, where `this.#x` throws.
 */
function pickGiven(pool: readonly string[], realName?: string): string {
  if (pool.length === 0) return realName?.trim() || 'Newcomer';
  const initial = realName?.trim()?.[0]?.toLowerCase();
  if (initial) {
    const sameInitial = pool.filter((n) => n[0]?.toLowerCase() === initial);
    if (sameInitial.length > 0) return pick(sameInitial)!;
  }
  return pick(pool)!;
}

/**
 * Per-species smell capability descriptor.
 *
 * v1 ships a single coarse `acuity` scalar — there's no propagation
 * walk yet (smell stays contact-only this build), so the field's
 * shape is the deliverable; no math consumes the value. When the
 * `PerceptionChannel` substrate lands (Wave 2+ per the senses
 * slate) and smell gains a propagation walk, this extracts to a
 * `lib/perception/Smell.ts` value-object module following the
 * `Light.ts` precedent (Quantity-based fields, parallel to
 * `VisionProfile`).
 *
 * Acuity values:
 *   - `'keen'`   — dog-class. Picks up faint trails.
 *   - `'normal'` — human-class baseline.
 *   - `'dull'`   — covid-recovery / hyposmic.
 *   - `'none'`   — anosmic / smell-less (a rock, a sea cucumber).
 */
export interface OlfactoryProfile {
  acuity: 'keen' | 'normal' | 'dull' | 'none';
}

const OLFACTORY_ACUITY_VALUES = ['keen', 'normal', 'dull', 'none'] as const;

/**
 * One vital sign's healthy baseline + survivable band, per species
 * (Vitals substrate). Values are plain numbers in the sign's
 * canonical unit (K / bpm / mmHg / % / L). Leaving the band is what
 * eventually flips the lifecycle state (a future driver consumes it).
 * Shaped to admit a later age-curve without reshaping.
 */
export interface VitalBand {
  baseline: number;
  survivableMin: number;
  survivableMax: number;
  // reserved: a per-sign age curve — still an empty seam. The
  // WHOLE-ORGANISM age curve is {@link AgeCurveSpec} below; this one
  // would be "how does a lamb's resting heart rate differ from a ewe's",
  // which nothing asks yet.
}

/**
 * ⭐⭐ **The maturation curve — how long this species takes to become
 * itself** (farmstead D23).
 *
 * `Organism.age` and `lifecycleState` have been persistent fields with
 * **no driver** since the race build: `setAge` had zero non-test callers
 * and the age curve was a comment. This is the shape that driver walks.
 *
 * ## ⚠ Compress the absolute scale; preserve the inter-species RATIOS
 *
 * A game year is 30 real days, so a true cattle generation interval —
 * two and a half years — is a **two-to-three real month** investment.
 * The term that makes animal breeding interesting is the term that would
 * make it unplayable. So the numbers here are compressed, and what is
 * held exactly is the *proportion between species*: what teaches
 * `R = h²·S / L` is that **sheep improve faster than cattle because
 * their generation interval is shorter**, and that survives compression
 * intact.
 *
 * Every figure is per-species authored and none is hardcoded anywhere.
 */
export interface AgeCurveSpec {
  /** Game-days from birth to weaning — off the mother, on solid feed. */
  weanedAt: number;
  /** Game-days to breeding age. ⭐ The generation interval's numerator. */
  matureAt: number;
  /** Game-days at which the animal is past its best. */
  agedAt: number;
  /** Game-days at which it is at the end of its life. */
  senescentAt: number;
}

/**
 * ⭐⭐ **One tap — a renewable product, and how it FAILS** (farmstead
 * D25, D93).
 *
 * Three renewable products, three genuine consequences, and no invented
 * punishments. The behaviour is the whole spec:
 *
 * | | behaviour | neglect |
 * |---|---|---|
 * | **milk** | `expire` — taken twice a **game** day | she **dries off** for that lactation. ⚠ A large **slope**, not a cliff: the next lactation is unaffected |
 * | **eggs** | `accrue` — collect whenever | they **spoil** in the nest past what a clutch will hold |
 * | **wool** | `continuous` — grows, harvested once | a worse fleece, and a hot sheep |
 *
 * ⭐ **Accrual for the on-ramp, expiry for the committed** (D93). The
 * forgiving end of the roster accrues and expiry is what you take on
 * when you commit — which is why hens are the on-ramp and a dairy cow is
 * a tyrant, and why that is a choice a player makes honestly rather than
 * a gate.
 *
 * ⚠⚠ **A tap fills from the PRODUCTION SLICE of the energy budget** and
 * mints nothing. Copy `Stock`'s reset *sweep*; never its `par`
 * semantics, which is a faucet shape and would make matter from nothing.
 */
export interface TapSpec {
  /** What comes out — the key the verbs and the register speak. */
  key: string;
  /** The row a take mints. */
  yieldRow: string;
  /** Units per GAME day at full production (D89 — never "daily"). */
  perGameDay: number;
  /** How it behaves when nobody comes. */
  behaviour: 'accrue' | 'expire' | 'continuous';
  /**
   * Game-days after which an untaken `expire` tap gives up for the
   * season, or an `accrue` tap starts losing what is standing.
   */
  windowDays: number;
}

/**
 * ⭐ **Breeding: a photoperiod SEASON, not a date** (D26, D11).
 *
 * Ewes are short-day breeders and lamb in late winter; cattle are
 * near-aseasonal; horses are long-day. **Lambing in spring is a
 * consequence of the calendar rather than a flavour decision anybody
 * authors** — the window is stated in daylength, and the calendar
 * decides when that happens.
 */
export interface BreedingSpec {
  /**
   * The daylength band, as a fraction of the rotation, in which this
   * species will conceive. A short-day breeder authors a LOW band; a
   * near-aseasonal one authors `[0, 1]` and is never out of season.
   */
  daylightFrom: number;
  daylightTo: number;
  /** Gestation, in game days. */
  gestationDays: number;
  /** Young per birth. */
  litter: number;
}

/** The life stages the curve resolves into, young to old. */
export const LIFE_STAGES = ['newborn', 'juvenile', 'adult', 'aged'] as const;

export type LifeStage = (typeof LIFE_STAGES)[number];

/**
 * Per-species vital baselines + survivable bands. Keyed by the
 * `VitalSign` field names as literal keys deliberately — so `Species`
 * needs no import from `lib/vitals` (`VitalsMixin` maps its `VitalSign`
 * union onto these keys internally). Flat nested record → default
 * JSON serialization, no marshaller (same as `visionProfile`).
 */
export interface VitalProfile {
  coreTemperature: VitalBand; // K
  heartRate: VitalBand; // bpm
  respiratoryRate: VitalBand; // bpm
  bloodPressureSystolic: VitalBand; // mmHg
  bloodPressureDiastolic: VitalBand; // mmHg
  spo2: VitalBand; // %
  bloodVolume: VitalBand; // L
}

export default class Species extends SingletonMixin(
  PropertiedMixin(VisibleMixin(Idea)),
) {
  /** Latin binomial nomenclature (e.g. `'Homo sapiens'`). */
  protected binomial: string = '';

  /** Vernacular synonyms (e.g. `['human', 'man']`). */
  protected commonNames: string[] = [];

  /** Path to the BodyPlan singleton. */
  public _bodyPlanPath: string | null = null;

  /** Path to the parent Clade singleton (kingdom or sub-clade). */
  public _parentCladePath: string | null = null;

  /**
   * Path to the default bulk Material for a member of this species.
   * v1 sufficient: a Tangible Stuff cloned from a species template can
   * stamp itself with this Material at clone-time. (Tissue / per-Detail
   * authoring is deferred.)
   */
  public _defaultMaterialPath: string | null = null;

  /**
   * Lifecycle states this species recognizes. Animalia: typically
   * `['alive', 'dead', 'undead']`. Constructa:
   * `['powered', 'unpowered', 'destroyed']`. Plantae: `['alive', 'dead']`.
   * Drives `OrganismMixin.setLifecycleState`'s validity (when validation
   * lands; v1 accepts any string per slate).
   */
  protected lifecycleStates: string[] = [];

  /**
   * `'xy'`, `'zw'`, `'environmental'`, `'haplodiploid'`,
   * `'hermaphroditic-simultaneous'`, `'hermaphroditic-sequential'`,
   * `'dioecious'`, `'monoecious'`, `'none'`. `SexedMixin` (Item 7)
   * looks up the valid sex set from this field.
   */
  protected sexDeterminationSystem: string = '';

  /**
   * `'sexual'`, `'parthenogenetic'`, `'asexual'`,
   * `'hermaphroditic-self'`, `'manufactured'`, `'spawned'`, `'none'`.
   * v1 has no consumer; the field is authored for completeness so
   * future breeding/genetics work has data to draw on.
   */
  protected reproductiveMode: string = '';

  /** Lifespan band (years). v1 is descriptive only. */
  protected lifespanMin: number = 0;
  protected lifespanMax: number = 0;

  /**
   * The maturation curve (D23), or `null` for a species nobody has
   * timed. ⚠ `null` is the ordinary case and means *this species does
   * not age in this game*, which is not the same as *it ages instantly*
   * — the driver reads it and does nothing.
   */
  protected ageCurve: AgeCurveSpec | null = null;

  /** What this species produces while you keep it (D25). Empty = nothing. */
  protected production: TapSpec[] = [];

  /** When and how it breeds (D26), or `null` for a species that does not. */
  protected breeding: BreedingSpec | null = null;

  /**
   * `'diurnal'`, `'nocturnal'`, `'crepuscular'`, `'cathemeral'`,
   * `'aperiodic'`. v1 has no consumer (sleep / circadian deferred).
   */
  protected circadianBand: string = '';

  /**
   * Optional dietary tag (`'carnivore'`, `'herbivore'`, `'omnivore'`,
   * `'photosynthesis'`). v1 has no consumer (DietApi deferred).
   */
  protected diet: string | null = null;

  /**
   * Per-species vision capability for the perception subsystem.
   * `null` falls through to VisionModality's default. Flat 3-scalar record;
   * default JSON serialization handles it (no marshaller needed).
   */
  protected visionProfile: VisionProfile | null = null;

  /**
   * Per-species smell capability — minimal `acuity` scalar.
   * `null` for species with no notable smell (a rock, a vacuum-borne
   * construct). v1 has no consumer of the value beyond shape; future
   * smell-propagation work draws on it.
   */
  protected olfactoryProfile: OlfactoryProfile | null = null;

  /**
   * Per-species vital baselines + survivable bands (Vitals substrate).
   * `null` falls back to the engine universe-default biological
   * profile. Flat nested record; default JSON serialization handles it
   * (no marshaller, like `visionProfile`).
   */
  protected vitalProfile: VitalProfile | null = null;

  /**
   * Per-species casting-faculty profile (the magic substrate): three
   * banded attributes — `depth` (pool capacity), `serenity` (recovery
   * rate), `composure` (the mental-axis resist substrate, read live
   * against current reserve). `null` = the species has no casting
   * faculty (composure then reads the neutral default band). Flat
   * 3-band record; default JSON serialization handles it (the
   * `visionProfile` precedent). A casting species pairs this with
   * `innateMixins: ['CasterMixin']`. See docs/subsystems/magic.md.
   */
  protected facultyProfile: FacultyProfile | null = null;

  /**
   * References to one or more `NameBank` Documents by key (e.g.
   * `['common']`, `['orcish', 'common']`). The name suggester resolves
   * these and unions the pools. NOT the name data itself — that lives
   * in the `name_banks` collection. See {@link NameBank}.
   */
  protected nameBankKeys: string[] = [];

  /**
   * Gated mixins this species **intrinsically confers** (activates) —
   * the *innate* leg of conferral, the mirror of `AugmentMixin.confers()`.
   * `getActiveMixins` / `collectAugmentConferralNames` union these names
   * with the actor's slot-augment conferrals, so a gated mixin is active
   * when composed AND (an augment confers it OR the species confers it).
   * A born-attuned species declares `['AetherMixin']`, giving attunement
   * with no implant — the same innate⊕acquired union the sensorium does
   * for bodyplan senses and `defaultModeFor` does for locomotion.
   *
   * **Scope**: this *activates a gated mixin already composed on the
   * shared `Creature`/`Avatar` class* — it cannot compose a new mixin
   * onto an instance (the compose-everything-gated vs. per-species-
   * subclass question is deferred; nothing needs it yet).
   *
   * Home is `Species`, not `BodyPlan` — a capability divergence among
   * species sharing a body plan.
   */
  protected innateMixins: string[] = [];

  /**
   * Whether members of this species are **sentient** — self-aware moral
   * persons whose killing is a lawful act with consequences, as opposed
   * to a beast whose culling is not. Distinct from `isAnimate` (a rock is
   * inanimate; a wolf is animate-but-not-sentient; a person is both).
   *
   * The load-bearing consumer is combat's three-case severity keying:
   * a non-sentient target is finished by the winning blow (the cull, no
   * consent/blame), a sentient target is only *defeated* by it (the
   * separate, interruptible two-stage coup + the attributed blame). See
   * `SpeciesApi.isSentient` and the combat subsystem doc.
   *
   * Defaults false — a species is a beast unless it declares otherwise.
   */
  protected sentient: boolean = false;

  /**
   * The species' **natural attacks** — its innate combat vocabulary
   * (bite / claw / tail…), each a `NaturalAttackSpec`
   * `{key, channel, reach?, massKg?, lengthM?}`. Multiple attacks rotate
   * deterministically by session beat in the combat engine; optional
   * hints ride the weapon-profile curves, hint-less attacks derive their
   * strike profile from `BodyPlan.baseMass` (neutral below
   * `combat.natural.largeBodyMassKg`, ogre-reach at/above — see
   * {@link NaturalAttack.deriveProfile}). Empty = the engine falls back
   * to the legacy single-attack `CombatantMixin.naturalAttackChannel`.
   * See docs/subsystems/combat-hooks.md § the species vocabulary and
   * docs/subsystems/race.md.
   */
  protected naturalAttacks: NaturalAttackSpec[] = [];

  /**
   * Gambit keys this species affords **bodily** (existing gambit kinds
   * only — a tailed species affords `sweep` without a hafted weapon).
   * Read by combat's eligibility gate, where a listed key short-circuits
   * only the two *equipment* gates (`affordedByForm` /
   * `affordedByShield`); the instrument gate still stands (satisfied by
   * a natural attack), and unknown keys are inert. See
   * docs/subsystems/combat-hooks.md § the species vocabulary.
   */
  protected affordedGambits: string[] = [];

  /**
   * ⭐ **Natural history is open; the combat profile is level 1.**
   *
   * The split is what a field guide would print versus what you learn
   * by meeting the thing. Diet, lifespan, circadian band, vision and
   * scent, how it reproduces, whether it is sentient — a naturalist
   * publishes all of that, and it is the education vertical's material.
   * What it *hits you with* and *how hard it is to put down* is the
   * other kind of knowledge.
   *
   * Level 1, so it is **collapsed, not forbidden**: a player who wants
   * to read up before a fight can, in one click, and a player who
   * would rather find out stays unspoiled by default.
   *
   * `spoilerName: 0` throughout — that a species HAS natural attacks
   * is not the secret, and a page of blank rows would tell a reader
   * nothing about what there is to learn.
   */
  static fieldMeta: FieldMeta = {
    // ── What a field guide prints ──
    binomial: { persistent: true },
    commonNames: { persistent: true },
    _bodyPlanPath: { persistent: true },
    _parentCladePath: { persistent: true },
    _defaultMaterialPath: { persistent: true },
    lifecycleStates: { persistent: true },
    sexDeterminationSystem: { persistent: true },
    reproductiveMode: { persistent: true },
    lifespanMin: { persistent: true },
    lifespanMax: { persistent: true },
    ageCurve: { persistent: true, authorable: true },
    production: { persistent: true, authorable: true },
    breeding: { persistent: true, authorable: true },
    circadianBand: { persistent: true },
    diet: { persistent: true },
    visionProfile: { persistent: true },
    olfactoryProfile: { persistent: true },
    nameBankKeys: { persistent: true },
    sentient: { persistent: true },

    // ── What you learn by meeting it ──
    vitalProfile: { persistent: true, spoiler: 1, spoilerName: 0 },
    facultyProfile: { persistent: true, spoiler: 1, spoilerName: 0 },
    innateMixins: { persistent: true, spoiler: 1, spoilerName: 0 },
    naturalAttacks: {
      persistent: true,
      authorable: true,
      spoiler: 1,
      spoilerName: 0,
    },
    affordedGambits: {
      persistent: true,
      authorable: true,
      spoiler: 1,
      spoilerName: 0,
    },
  };
  // `shortDescription` / `longDescription` (the species' generic
  // appearance) come from VisibleMixin's own persistentFields. The
  // bespoke `defaultDescription` field was subsumed into
  // `longDescription` — Species now speaks the standard Visible
  // description interface instead of a one-off accessor.

  public getBinomial(): string { return this.binomial; }
  public setBinomial(value: string): void { this.binomial = value; }

  public getCommonNames(): readonly string[] { return this.commonNames; }
  public setCommonNames(value: string[]): void { this.commonNames = value; }

  public isSentient(): boolean { return this.sentient; }
  public setSentient(value: boolean): void { this.sentient = value; }

  public getBodyPlan(): BodyPlan | null {
    if (!this._bodyPlanPath) return null;
    return StuffApi.findByTemplatePath<BodyPlan>(this._bodyPlanPath) ?? null;
  }

  public setBodyPlan(value: BodyPlan | null): void {
    this._bodyPlanPath = value?.getTemplatePath() ?? null;
  }

  /**
   * The body-plan template path, without resolving the BodyPlan
   * instance. Useful for callers that key off the path directly
   * (e.g. `Wearable.fitsSlot` looking up `slotClaims[bodyPlanPath]`)
   * — saves the path-resolution round-trip when the BodyPlan
   * Stuff itself isn't needed.
   */
  public getBodyPlanPath(): string | null {
    return this._bodyPlanPath;
  }

  public getParentClade(): Clade | null {
    if (!this._parentCladePath) return null;
    return StuffApi.findByTemplatePath<Clade>(this._parentCladePath) ?? null;
  }

  public setParentClade(value: Clade | null): void {
    this._parentCladePath = value?.getTemplatePath() ?? null;
  }

  public getDefaultMaterial(): Material | null {
    if (!this._defaultMaterialPath) return null;
    return (
      StuffApi.findByTemplatePath<Material>(this._defaultMaterialPath) ?? null
    );
  }

  /** Material template path (no resolution) — mirrors `getBodyPlanPath`. */
  public getDefaultMaterialPath(): string | null {
    return this._defaultMaterialPath;
  }

  public setDefaultMaterial(value: Material | null): void {
    this._defaultMaterialPath = value?.getTemplatePath() ?? null;
  }

  public getLifecycleStates(): readonly string[] { return this.lifecycleStates; }
  public setLifecycleStates(value: string[]): void {
    this.lifecycleStates = value;
  }

  public getSexDeterminationSystem(): string {
    return this.sexDeterminationSystem;
  }
  public setSexDeterminationSystem(value: string): void {
    this.sexDeterminationSystem = value;
  }

  public getReproductiveMode(): string { return this.reproductiveMode; }
  public setReproductiveMode(value: string): void {
    this.reproductiveMode = value;
  }

  public getProduction(): readonly TapSpec[] { return this.production; }
  public setProduction(value: TapSpec[]): void {
    this.production = Array.isArray(value) ? value : [];
  }

  public getBreeding(): BreedingSpec | null { return this.breeding; }
  public setBreeding(value: BreedingSpec | null): void {
    this.breeding = value ?? null;
  }

  /**
   * ⭐ Is `daylightFraction` inside this species' breeding window?
   *
   * ⚠ A band, not a date, and it wraps: a short-day breeder's window is
   * `[0, 0.42]` and a long-day breeder's is `[0.55, 1]`, so the test is
   * a plain interval — but a species authoring `from > to` means a
   * window that crosses the solstice, and that is a real shape too.
   */
  public breedsAtDaylight(daylightFraction: number): boolean {
    const b = this.breeding;
    if (!b) return false;
    const { daylightFrom: from, daylightTo: to } = b;
    return from <= to
      ? daylightFraction >= from && daylightFraction <= to
      : daylightFraction >= from || daylightFraction <= to;
  }

  public getAgeCurve(): AgeCurveSpec | null { return this.ageCurve; }
  public setAgeCurve(value: AgeCurveSpec | null): void {
    this.ageCurve = value ?? null;
  }

  /**
   * The life stage an animal of `ageDays` has reached — ⭐ derived, and
   * `null` for a species with no curve, which reads as *unmodelled* and
   * never as *newborn*.
   */
  public lifeStageAt(ageDays: number): LifeStage | null {
    const curve = this.ageCurve;
    if (!curve) return null;
    if (ageDays < curve.weanedAt) return 'newborn';
    if (ageDays < curve.matureAt) return 'juvenile';
    if (ageDays < curve.agedAt) return 'adult';
    return 'aged';
  }

  public getLifespanMin(): number { return this.lifespanMin; }
  public setLifespanMin(value: number): void { this.lifespanMin = value; }

  public getLifespanMax(): number { return this.lifespanMax; }
  public setLifespanMax(value: number): void { this.lifespanMax = value; }

  public getCircadianBand(): string { return this.circadianBand; }
  public setCircadianBand(value: string): void { this.circadianBand = value; }

  public getDiet(): string | null { return this.diet; }
  public setDiet(value: string | null): void { this.diet = value; }

  public getVisionProfile(): VisionProfile | null { return this.visionProfile; }
  public setVisionProfile(value: VisionProfile | null): void {
    this.visionProfile = value;
  }

  public getOlfactoryProfile(): OlfactoryProfile | null {
    return this.olfactoryProfile;
  }
  public setOlfactoryProfile(value: OlfactoryProfile | null): void {
    if (value !== null) {
      if (typeof value !== 'object') {
        throw new TypeError(
          'Species.setOlfactoryProfile: must be null or a profile object',
        );
      }
      if (
        !(OLFACTORY_ACUITY_VALUES as readonly string[]).includes(value.acuity)
      ) {
        throw new TypeError(
          `Species.setOlfactoryProfile: acuity must be one of ` +
            `${OLFACTORY_ACUITY_VALUES.join(', ')}, got '${String(value.acuity)}'`,
        );
      }
    }
    this.olfactoryProfile = value;
  }

  public getVitalProfile(): VitalProfile | null {
    return this.vitalProfile;
  }
  public setVitalProfile(value: VitalProfile | null): void {
    if (value !== null) {
      if (typeof value !== 'object') {
        throw new TypeError(
          'Species.setVitalProfile: must be null or a profile object',
        );
      }
      for (const [sign, band] of Object.entries(value)) {
        if (
          !band ||
          typeof band !== 'object' ||
          typeof (band as VitalBand).baseline !== 'number' ||
          typeof (band as VitalBand).survivableMin !== 'number' ||
          typeof (band as VitalBand).survivableMax !== 'number'
        ) {
          throw new TypeError(
            `Species.setVitalProfile: band '${sign}' must have numeric ` +
              `baseline / survivableMin / survivableMax`,
          );
        }
      }
    }
    this.vitalProfile = value;
  }

  public getFacultyProfile(): FacultyProfile | null {
    return this.facultyProfile;
  }
  public setFacultyProfile(value: FacultyProfile | null): void {
    // Per-field invariant: Faculty.validateProfile throws on bad bands.
    this.facultyProfile = Faculty.validateProfile(value);
  }

  public getNameBankKeys(): readonly string[] { return this.nameBankKeys; }
  public setNameBankKeys(value: string[]): void {
    if (!Array.isArray(value)) {
      throw new TypeError('Species.setNameBankKeys: must be a string array');
    }
    this.nameBankKeys = value;
  }

  public getInnateMixins(): readonly string[] { return this.innateMixins; }
  public setInnateMixins(value: string[]): void {
    if (!Array.isArray(value)) {
      throw new TypeError('Species.setInnateMixins: must be a string array');
    }
    // Per-field invariant: dedup + drop empties (authored data may
    // carry duplicates or stray whitespace-only entries).
    const cleaned = value
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
    this.innateMixins = [...new Set(cleaned)];
  }

  public getNaturalAttacks(): readonly NaturalAttackSpec[] {
    return this.naturalAttacks;
  }
  public setNaturalAttacks(value: NaturalAttackSpec[]): void {
    // Per-field invariant: NaturalAttack.validateSpecs throws on a
    // malformed list (the Faculty.validateProfile precedent).
    this.naturalAttacks = NaturalAttack.validateSpecs(value);
  }

  public getAffordedGambits(): readonly string[] {
    return this.affordedGambits;
  }
  public setAffordedGambits(value: string[]): void {
    if (!Array.isArray(value)) {
      throw new TypeError('Species.setAffordedGambits: must be a string array');
    }
    // Per-field invariant: dedup + drop empties (unknown keys are inert
    // by design — no gambit-roster coupling here).
    const cleaned = value
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
    this.affordedGambits = [...new Set(cleaned)];
  }

  /**
   * Suggest a fantasy name for a new member of this species. Resolves
   * the species' `nameBankKeys` → the referenced {@link NameBank}
   * pools, then phonetically *riffs* on the player's real given name
   * (when provided) by preferring a bank given-name sharing its first
   * letter — so the suggestion feels personally theirs while reading as
   * the species. Surname is drawn from the bank pool. Always returns a
   * given name when the bank is non-empty, so intake is never blocked.
   *
   * `realName` is the player's real (Google) given name; pass undefined
   * for additional characters (draws straight from the bank).
   */
  public async suggestName(realName?: string): Promise<SuggestedName> {
    const pools = await NameBank.resolve(this.nameBankKeys);
    const given = pickGiven(pools.given, realName);
    const surname = pick(pools.surname);
    const out: SuggestedName = { name: given };
    if (surname) out.surname = surname;
    return out;
  }

  /**
   * Re-roll a fresh suggestion with no real-name bias (the player asked
   * for another option, or it's an additional character).
   */
  public async rerollName(): Promise<SuggestedName> {
    const pools = await NameBank.resolve(this.nameBankKeys);
    const given = pickGiven(pools.given, undefined);
    const surname = pick(pools.surname);
    const out: SuggestedName = { name: given };
    if (surname) out.surname = surname;
    return out;
  }

  /**
   * R2.4 cleanup on the held side of `Clade.species`.
   *
   * Species is a concrete leaf class, not a mixin (no
   * `_mixinName`), so the framework `cleanupOnDestruct` dispatch
   * — which walks `MixinApi.queryMixins` — wouldn't discover a
   * static here. Use the `onDestruct` witness instead, chaining
   * `super.onDestruct()` so SingletonMixin / PropertiedMixin
   * layers further up the chain still run.
   *
   * TODO: production wire-up is pending. `Clade.addSpecies` is
   * called only by tests today; once Species template hydration
   * registers itself with its parent Clade, this handler is
   * automatically correct. Until then it's a no-op for
   * production but exercised by the OPEN-4 regression test.
   */
  public override onDestruct(): void {
    const clade = this.getParentClade();
    if (clade) {
      clade.removeSpecies(this);
    }
    super.onDestruct();
  }
}
