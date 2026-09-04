/**
 * MaturationProfile — the authored reaction norm of a durative ferment
 * (fermentation D1/P2): everything an author can vary about a ferment
 * lives HERE, on template rows, so a new fermentable (cider, mead,
 * kvass) is rows alone — an input material, a profile, an output
 * material — with zero kernel code (the second-drink test).
 *
 * A profile is matched to a must by the input material's TAGS
 * (`inputCategory`, the recipe-slot `category` convention), and drives
 * `MaturingMixin`'s reconcile: the temperature band
 * (`stallBelowK` / `happyK` / `damageAboveK`), the conversion rate at
 * happy, the product material the batch becomes at `finished`, and the
 * failure product an OPEN finished batch turns into (`turnedMaterial`,
 * vinegar — D3's lesson). `sealedOnly` marks a conditioning profile
 * (bottle/cask conditioning — the second ferment happens SEALED, which
 * is what sparkling and real ale ARE, P5/P9).
 *
 * Reference data, the Material/Species shape: a singleton Idea per row,
 * stood up whole at boot by `MaturationProfileCatalogue.postRegister` (the roster warm that
 * closes the reference-Ideas-inert-at-boot gap), read by SYNC seams.
 * Rows live under any root's `idea/maturation/` subtree — the kernel keeps
 * no list of roots.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { StuffApi } from '../../api/stuff';
import type Material from '../material/Material';
import type { FieldMeta } from '../mixin';
import type { VetoResult } from '../errors';
import type { EvictionContext } from '../stuff/Stuff';

/**
 * How a maturation actually proceeds. ⚠ CLOSED — a mechanism nobody
 * models is not a mechanism, and an open string here would let a row
 * assert chemistry the engine has never heard of.
 *
 * - `microbial` — organisms do it: wine, beer, a wash, flax retting.
 * - `photochemical` — light does it: linen on a bleaching green.
 * - `chemical` — a reagent does it, with nothing alive involved.
 */
export type MaturationMechanism = 'microbial' | 'photochemical' | 'chemical';

/** Every mechanism, for validation and for the totality check. */
export const MATURATION_MECHANISMS: readonly MaturationMechanism[] = [
  'microbial',
  'photochemical',
  'chemical',
];

/** The four things a maturing thing can look like, per mechanism. */
export interface MaturationLines {
  starting: string;
  working: string;
  finished: string;
  turned: string;
}

/**
 * ⚠⚠ Prose per MECHANISM, and the reason is a measured defect.
 *
 * This augmenter was written for a wine cellar and never asked who else
 * composed the mixin. Two of them did, and neither is a cellar: a
 * bleaching green — **an acre of grass with linen pegged out in the
 * sun** — rendered *"It bubbles steadily, a yeasty breath rising off
 * it."* A retting pit, whose entire authored character is that the
 * smell arrives a second before you do, reported when finished that
 * *"the air over it is clean."* Over-retted flax, which smells of rot,
 * announced *"a sharp vinegar edge."*
 *
 * ⭐ Nothing was wrong with sharing the SHAPE — a slow transform under
 * a clock is a good abstraction. What was wrong is that the sentences
 * came with it. Splitting on `mechanism` costs one lookup and stops the
 * substrate speaking for content it knows nothing about.
 */
export const MATURATION_LINES: Record<
  MaturationMechanism,
  MaturationLines
> = {
  microbial: {
    starting: 'A first few beads track up through it.',
    working: 'It bubbles steadily, a yeasty breath rising off it.',
    finished: 'It lies still — the work is done, and the air over it is clean.',
    turned: 'A sharp vinegar edge cuts the air over it.',
  },
  photochemical: {
    // ⚠ No bubbles, no breath, no smell. Light is doing this.
    starting: 'It has barely begun to lift — the colour is still all there.',
    working: 'The colour is drawing out of it a shade at a time, evenly.',
    finished: 'It has come as pale as it is going to come.',
    // Unreachable while no photochemical profile authors a
    // `turnedMaterial` — kept so the record is total rather than
    // relying on a `null` that a later row could quietly falsify.
    turned: 'It has gone past pale into a thin, chalky grey.',
  },
  chemical: {
    starting: 'Nothing shows yet, but it is beginning to take.',
    working: 'It is working steadily, with a faint sharpness in the air.',
    finished: 'It has stopped moving — whatever was going to happen has.',
    turned: 'It has gone too far, and gone wrong with it.',
  },
};

export default class MaturationProfile extends SingletonMixin(Idea) {
  /** The class every profile row names — what the boot warm filters by. */
  static readonly CLASS_PATH = '/platform/idea/maturation/MaturationProfile';


  /**
   * Residency veto — profile reference data resolved by SYNC reads
   * (the ferment reconcile); the only standup is the `MaturationProfileCatalogue.postRegister`
   * roster warm, so a culled profile would stall every batch silently.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'ferment profile singleton; never culled' };
  }

  /** The profile's stable key (e.g. `red-wine`). */
  public key = '';
  /** The material TAG a must carries to match this profile. */
  public inputCategory = '';
  /** Below this (K) conversion stalls — cold is forgiving (D3). */
  public stallBelowK = 283;
  /** At/above this (K) conversion runs at the full authored rate. */
  public happyK = 291;
  /** Above this (K) the batch takes grade damage (the worst stretch). */
  public damageAboveK = 303;
  /** Fraction of the starting sugar converted per game-day at happy. */
  public ratePerDay = 0.12;
  /** Template path of the material the batch becomes at `finished`. */
  public productMaterial = '';
  /**
   * Template path of the failure product an OPEN finished batch turns
   * into (vinegar), or `null` — a profile with no turn authored holds.
   */
  public turnedMaterial: string | null = null;
  /** Open game-days past `finished` before the batch fully turns. */
  public turnDays = 3;
  /**
   * Conditioning profile: converts ONLY while sealed (bottle/cask
   * conditioning — sparkling, real ale). Default false: a primary
   * ferment converts open or closed (the CO₂ blanket protects it).
   */
  public sealedOnly = false;

  // ── yeast, wild and kept (D14/P12) ──

  /**
   * The profile KIND: a `batch` converts its charge; a
   * `culture` is a batch you keep alive — its "conversion" is
   * viability (starves over game-time, restored by feeding, killed
   * above `killK`, slowed by the cellar).
   */
  public kind: 'batch' | 'culture' = 'batch';
  /**
   * ⭐⭐ **What is actually doing the work** — and the reason this field
   * exists is that the substrate outgrew its name.
   *
   * The clock, the temperature bands, the phase machine and the
   * over-run are a SHAPE: *put it somewhere, time and conditions
   * transform it, judge when to stop*. Fermentation is one mechanism
   * with that shape and not the only one, so the shape got reused —
   * correctly — for flax retting and for grass-bleaching linen.
   *
   * ⚠⚠ But retting really IS fermentation (pectinolytic bacteria
   * digesting the pectin that glues bast fibre to the woody core) and
   * **grass-bleaching really is not**: it is photochemistry, UV and
   * oxygen oxidising the residual colour bodies. `textiles.md` argues
   * exactly that when it refuses a glowlight — *"bleaching is
   * photochemistry; a glowlight is illumination"* — while the data
   * modelled it as a ferment. On a platform that teaches, a data model
   * asserting a false mechanism is the defect, not the wording.
   *
   * ⭐ Same move `Dyestuff.chemistry` already makes: one substrate, two
   * chemistries, the DATA says which and the prose reads it. Nothing
   * about the clock branches on this — it steers only what the thing
   * looks like while it works.
   */
  public mechanism: MaturationMechanism = 'microbial';
  /** Culture profiles: the strain this culture IS (what a pitch carries). */
  public strain = '';
  /**
   * Ferment profiles: the strain the batch MUST carry to convert
   * (lager's gate). `''` = any strain converts.
   */
  public requiresStrain = '';
  /** The strain a wild start yields (fruit-skin bloom, the lambic lag). */
  public wildStrain = 'wild';
  /**
   * Game-days an OPEN sterile must waits before wild flora take it
   * (the lambic move). `0` = the must self-starts at fill (fruit skin
   * bloom). A SEALED sterile must never starts — D3's second edge.
   */
  public spontaneousLagDays = 0;
  /**
   * Above this (K) the yeast dies — a hot pitch kills and nothing
   * starts; a batch run this hot goes sterile again (stuck ferment).
   * For a culture profile: viability drops to zero. `null` = no kill
   * modelled.
   */
  public killK: number | null = null;
  /**
   * Above this (K) conversion stops entirely (authored dormancy —
   * lager's warm refusal). Distinct from `damageAboveK`, which
   * degrades the grade while still converting. `null` = none.
   */
  public stallAboveK: number | null = null;
  /**
   * Fraction of the batch volume left behind as lees at `finished` —
   * the rack floor (`pour` draws product down to it), and the culture
   * harvest (what remains IS `leesMaterial`). `0` = no lees.
   */
  public leesFraction = 0;
  /** Template path of the lees material the residual becomes. */
  public leesMaterial = '';
  /**
   * Culture profiles: unfed game-days (in the happy band) for
   * viability to starve 1 → 0. The cellar slows it; heat speeds it.
   */
  public starveDays = 14;
  /**
   * The wash's foreshot character — INERT authored prose in v1 (P10):
   * the seam the deferred cuts rung reads into metabolism's toxin dose
   * (kept foreshots become the poison; pouring off the first draw
   * becomes the skill). Nothing consumes it yet, by design.
   */
  public foreshotCharacter = '';

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    inputCategory: { persistent: true, authorable: true },
    stallBelowK: { persistent: true, authorable: true },
    happyK: { persistent: true, authorable: true },
    damageAboveK: { persistent: true, authorable: true },
    ratePerDay: { persistent: true, authorable: true },
    productMaterial: { persistent: true, authorable: true },
    turnedMaterial: { persistent: true, authorable: true },
    turnDays: { persistent: true, authorable: true },
    sealedOnly: { persistent: true, authorable: true },
    kind: { persistent: true, authorable: true },
    mechanism: { persistent: true, authorable: true },
    strain: { persistent: true, authorable: true },
    requiresStrain: { persistent: true, authorable: true },
    wildStrain: { persistent: true, authorable: true },
    spontaneousLagDays: { persistent: true, authorable: true },
    killK: { persistent: true, authorable: true },
    stallAboveK: { persistent: true, authorable: true },
    leesFraction: { persistent: true, authorable: true },
    leesMaterial: { persistent: true, authorable: true },
    starveDays: { persistent: true, authorable: true },
    foreshotCharacter: { persistent: true, authorable: true },
  };

  // ── the inter-Stuff contract (methods, never fields) ──

  getKey(): string {
    return this.key;
  }
  setKey(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new RangeError('MaturationProfile.setKey: key must be non-empty');
    }
    this.key = value;
  }

  getInputCategory(): string {
    return this.inputCategory;
  }
  setInputCategory(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new RangeError(
        'MaturationProfile.setInputCategory: category must be non-empty',
      );
    }
    this.inputCategory = value;
  }

  getStallBelowK(): number {
    return this.stallBelowK;
  }
  setStallBelowK(value: number): void {
    this.stallBelowK = requireFiniteK('setStallBelowK', value);
  }

  getHappyK(): number {
    return this.happyK;
  }
  setHappyK(value: number): void {
    this.happyK = requireFiniteK('setHappyK', value);
  }

  getDamageAboveK(): number {
    return this.damageAboveK;
  }
  setDamageAboveK(value: number): void {
    this.damageAboveK = requireFiniteK('setDamageAboveK', value);
  }

  getRatePerDay(): number {
    return this.ratePerDay;
  }
  setRatePerDay(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `MaturationProfile.setRatePerDay: rate must be a positive fraction, got ${value}`,
      );
    }
    this.ratePerDay = value;
  }

  getProductMaterial(): string {
    return this.productMaterial;
  }
  setProductMaterial(value: string): void {
    this.productMaterial = value;
  }

  getTurnedMaterial(): string | null {
    return this.turnedMaterial;
  }
  setTurnedMaterial(value: string | null): void {
    this.turnedMaterial = value;
  }

  getTurnDays(): number {
    return this.turnDays;
  }
  setTurnDays(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `MaturationProfile.setTurnDays: days must be positive, got ${value}`,
      );
    }
    this.turnDays = value;
  }

  getSealedOnly(): boolean {
    return this.sealedOnly;
  }
  setSealedOnly(value: boolean): void {
    this.sealedOnly = value;
  }

  getKind(): 'batch' | 'culture' {
    return this.kind;
  }
  setKind(value: string): void {
    if (value !== 'batch' && value !== 'culture') {
      throw new RangeError(
        `MaturationProfile.setKind: expected 'batch' | 'culture', got '${value}'`,
      );
    }
    this.kind = value;
  }

  getMechanism(): MaturationMechanism {
    return this.mechanism;
  }

  /**
   * ⚠ Validated against the closed vocabulary rather than assigned. A
   * typo'd mechanism would otherwise fall through every prose branch to
   * the microbial default and silently assert the wrong chemistry —
   * which is precisely the failure this field was added to end.
   */
  setMechanism(value: string): void {
    if (!MATURATION_MECHANISMS.includes(value as MaturationMechanism)) {
      throw new RangeError(
        `MaturationProfile.setMechanism: expected one of ${MATURATION_MECHANISMS.join(' | ')}, got '${value}'`,
      );
    }
    this.mechanism = value as MaturationMechanism;
  }

  getStrain(): string {
    return this.strain;
  }
  setStrain(value: string): void {
    this.strain = value;
  }

  getRequiresStrain(): string {
    return this.requiresStrain;
  }
  setRequiresStrain(value: string): void {
    this.requiresStrain = value;
  }

  getWildStrain(): string {
    return this.wildStrain;
  }
  setWildStrain(value: string): void {
    this.wildStrain = value;
  }

  getSpontaneousLagDays(): number {
    return this.spontaneousLagDays;
  }
  setSpontaneousLagDays(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `MaturationProfile.setSpontaneousLagDays: days must be >= 0, got ${value}`,
      );
    }
    this.spontaneousLagDays = value;
  }

  getKillK(): number | null {
    return this.killK;
  }
  setKillK(value: number | null): void {
    this.killK = value === null ? null : requireFiniteK('setKillK', value);
  }

  getStallAboveK(): number | null {
    return this.stallAboveK;
  }
  setStallAboveK(value: number | null): void {
    this.stallAboveK =
      value === null ? null : requireFiniteK('setStallAboveK', value);
  }

  getLeesFraction(): number {
    return this.leesFraction;
  }
  setLeesFraction(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError(
        `MaturationProfile.setLeesFraction: expected [0, 1), got ${value}`,
      );
    }
    this.leesFraction = value;
  }

  getLeesMaterial(): string {
    return this.leesMaterial;
  }
  setLeesMaterial(value: string): void {
    this.leesMaterial = value;
  }

  getStarveDays(): number {
    return this.starveDays;
  }

  getForeshotCharacter(): string {
    return this.foreshotCharacter;
  }
  setForeshotCharacter(value: string): void {
    this.foreshotCharacter = value;
  }
  setStarveDays(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `MaturationProfile.setStarveDays: days must be positive, got ${value}`,
      );
    }
    this.starveDays = value;
  }
  // ── the roster queries (statics on the owning class — no Api: a
  // stateless glob over the live population needs no gate, no logic
  // singleton, and no cache to invalidate; `MaturationProfileCatalogue`'s
  // postRegister is what stands the population up at boot) ──

  /** Every live profile, sorted by key — found by the branch segment. */
  static all(): MaturationProfile[] {
    return StuffApi.findByPathGlob<MaturationProfile>('/**/idea/maturation/**')
      .filter((p): p is MaturationProfile => p instanceof MaturationProfile)
      .sort((a, b) => a.getKey().localeCompare(b.getKey()));
  }

  /** The live profile with `key`, or `null`. */
  static byKey(key: string): MaturationProfile | null {
    if (!key) return null;
    return MaturationProfile.all().find((p) => p.getKey() === key) ?? null;
  }

  /**
   * The profile matching `material` — matched by the must's TAGS
   * against each profile's `inputCategory`. Two matching profiles is
   * an AUTHORING error, surfaced as a warning and resolved
   * deterministically (lowest key wins) — never a roll. `null` when
   * nothing matches (the vat stays idle).
   */
  static forMaterial(material: Material): MaturationProfile | null {
    const matches = MaturationProfile.all().filter((p) => {
      const category = p.getInputCategory();
      return category.length > 0 && material.hasTag(category);
    });
    if (matches.length > 1) {
      console.warn(
        `MaturationProfile.forMaterial: material '${material.getTemplatePath()}' matches ` +
          `${matches.length} profiles (${matches.map((p) => p.getKey()).join(', ')}) — ` +
          `authoring error; using '${matches[0]!.getKey()}'`,
      );
    }
    return matches[0] ?? null;
  }
}

function requireFiniteK(site: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `MaturationProfile.${site}: temperature must be a positive Kelvin figure, got ${value}`,
    );
  }
  return value;
}
