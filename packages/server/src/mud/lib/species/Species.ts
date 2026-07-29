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
 * Singleton-by-templatePath: every `/lib/species/.../<species>`
 * template resolves to one instance via `StuffApi.singleton(path)`.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';
import { VisibleMixin } from '../description/Visible';
import { StuffApi } from '../../api/stuff';
import type BodyPlan from './BodyPlan';
import type Clade from './Clade';
import type Material from '../material/Material';
import type { VisionProfile } from '../perception/Light';
import type { FacultyProfile } from '../magic/Faculty';
import { Faculty } from '../magic/Faculty';
import type { NaturalAttackSpec } from '../combat/NaturalAttack';
import { NaturalAttack } from '../combat/NaturalAttack';
import { NameBank } from './NameBank';

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
  // reserved: ageCurve?: AgeCurveSpec — declared-but-empty seam.
}

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
   *
   * @authorable
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
   *
   * @authorable
   */
  protected affordedGambits: string[] = [];

  static persistentFields = [
    'binomial',
    'commonNames',
    '_bodyPlanPath',
    '_parentCladePath',
    '_defaultMaterialPath',
    'lifecycleStates',
    'sexDeterminationSystem',
    'reproductiveMode',
    'lifespanMin',
    'lifespanMax',
    'circadianBand',
    'diet',
    'visionProfile',
    'olfactoryProfile',
    'vitalProfile',
    'facultyProfile',
    'nameBankKeys',
    'innateMixins',
    'sentient',
    'naturalAttacks',
    'affordedGambits',
  ];
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
