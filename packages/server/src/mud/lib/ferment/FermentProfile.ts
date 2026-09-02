/**
 * FermentProfile — the authored reaction norm of a durative ferment
 * (fermentation D1/P2): everything an author can vary about a ferment
 * lives HERE, on template rows, so a new fermentable (cider, mead,
 * kvass) is rows alone — an input material, a profile, an output
 * material — with zero kernel code (the second-drink test).
 *
 * A profile is matched to a must by the input material's TAGS
 * (`inputCategory`, the recipe-slot `category` convention), and drives
 * `FermentingMixin`'s reconcile: the temperature band
 * (`stallBelowK` / `happyK` / `damageAboveK`), the conversion rate at
 * happy, the product material the batch becomes at `finished`, and the
 * failure product an OPEN finished batch turns into (`turnedMaterial`,
 * vinegar — D3's lesson). `sealedOnly` marks a conditioning profile
 * (bottle/cask conditioning — the second ferment happens SEALED, which
 * is what sparkling and real ale ARE, P5/P9).
 *
 * Reference data, the Material/Species shape: a singleton Idea per row,
 * stood up whole at boot by `FermentApi.boot` (the roster warm that
 * closes the reference-Ideas-inert-at-boot gap), read by SYNC seams.
 * Rows live under any root's `idea/ferment/` subtree — the kernel keeps
 * no list of roots.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import type { FieldMeta } from '../mixin';
import type { VetoResult } from '../errors';
import type { EvictionContext } from '../stuff/Stuff';

export default class FermentProfile extends SingletonMixin(Idea) {
  /** The class every profile row names — what the boot warm filters by. */
  static readonly CLASS_PATH = '/platform/idea/ferment/FermentProfile';

  /**
   * Residency veto — profile reference data resolved by SYNC reads
   * (the ferment reconcile); the only standup is the `FermentApi.boot`
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
   * The profile KIND: an ordinary `ferment` converts sugar; a
   * `culture` is a batch you keep alive — its "conversion" is
   * viability (starves over game-time, restored by feeding, killed
   * above `killK`, slowed by the cellar).
   */
  public kind: 'ferment' | 'culture' = 'ferment';
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
      throw new RangeError('FermentProfile.setKey: key must be non-empty');
    }
    this.key = value;
  }

  getInputCategory(): string {
    return this.inputCategory;
  }
  setInputCategory(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new RangeError(
        'FermentProfile.setInputCategory: category must be non-empty',
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
        `FermentProfile.setRatePerDay: rate must be a positive fraction, got ${value}`,
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
        `FermentProfile.setTurnDays: days must be positive, got ${value}`,
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

  getKind(): 'ferment' | 'culture' {
    return this.kind;
  }
  setKind(value: string): void {
    if (value !== 'ferment' && value !== 'culture') {
      throw new RangeError(
        `FermentProfile.setKind: expected 'ferment' | 'culture', got '${value}'`,
      );
    }
    this.kind = value;
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
        `FermentProfile.setSpontaneousLagDays: days must be >= 0, got ${value}`,
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
        `FermentProfile.setLeesFraction: expected [0, 1), got ${value}`,
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
        `FermentProfile.setStarveDays: days must be positive, got ${value}`,
      );
    }
    this.starveDays = value;
  }
}

function requireFiniteK(site: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `FermentProfile.${site}: temperature must be a positive Kelvin figure, got ${value}`,
    );
  }
  return value;
}
