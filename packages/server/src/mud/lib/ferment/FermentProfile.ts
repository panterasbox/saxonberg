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
}

function requireFiniteK(site: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `FermentProfile.${site}: temperature must be a positive Kelvin figure, got ${value}`,
    );
  }
  return value;
}
