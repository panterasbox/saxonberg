/**
 * Material — bulk substance singleton.
 *
 * A `Material` describes the physical properties of a substance independent
 * of any particular object made from it. Two Stuff instances composed of
 * the same Material (the iron in a sword, the iron in a chain) reach the
 * same singleton via `Tangible.getMaterial()` and observe identical
 * physics. Per-object variation lives elsewhere — the bulk Material is
 * shared.
 *
 * Tangible Stuff carries a default bulk Material plus optional per-Detail
 * overrides (the wood haft vs the iron head of an axe). Edibility tags
 * (`edibility`, `nutrients`, `toxicity`) are authored here today; the
 * `DietApi` consumer is deferred.
 *
 * Singleton-by-templatePath: every `/material/<x>` template resolves to
 * the same instance via `StuffApi.singleton(path)` /
 * `findByTemplatePath`. Cross-references on other Stuff store the path
 * string and re-resolve on each call (HMR-safe — no cached instance).
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';

export class Material extends SingletonMixin(Idea) {
  /** Display name (e.g. `'iron'`, `'oak'`, `'fruit-flesh'`). */
  protected name: string = '';

  /** kg/m^3. */
  protected density: number = 0;

  /** Mohs-scale-ish hardness (0–10). */
  protected hardness: number = 0;

  /** 0–1, how easily this material ignites. */
  protected flammability: number = 0;

  /** 0–1, how much this material blocks light passing through. */
  protected opacity: number = 0;

  /** W/(m·K). Heat conduction rate. */
  protected thermalConductivity: number = 0;

  /** S/m. Electrical conduction rate. */
  protected electricalConductivity: number = 0;

  /** 0–1. How strongly this material responds to magnetism. */
  protected magneticSusceptibility: number = 0;

  /** Whether this material can be eaten. v1 has no consumer. */
  protected edibility: boolean = false;

  /**
   * Tagged nutrient categories (`'protein'`, `'water'`, `'sugar'`).
   * v1 has no consumer (DietApi is deferred).
   */
  protected nutrients: string[] = [];

  /**
   * Tagged toxicity categories (`'iron-poisoning'`, `'lead'`,
   * `'oxalates'`). v1 has no consumer.
   */
  protected toxicity: string[] = [];

  /**
   * Damage-type → resistance scalar (0 = no resistance, 1 = full
   * absorption). Decomposes onto a flat string-keyed scalar map; default
   * hydration handles serialization.
   */
  protected damageResistance: Record<string, number> = {};

  static persistentFields = [
    'name',
    'density',
    'hardness',
    'flammability',
    'opacity',
    'thermalConductivity',
    'electricalConductivity',
    'magneticSusceptibility',
    'edibility',
    'nutrients',
    'toxicity',
    'damageResistance',
  ];

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  public getDensity(): number { return this.density; }
  public setDensity(value: number): void { this.density = value; }

  public getHardness(): number { return this.hardness; }
  public setHardness(value: number): void { this.hardness = value; }

  public getFlammability(): number { return this.flammability; }
  public setFlammability(value: number): void { this.flammability = value; }

  public getOpacity(): number { return this.opacity; }
  public setOpacity(value: number): void { this.opacity = value; }

  public getThermalConductivity(): number { return this.thermalConductivity; }
  public setThermalConductivity(value: number): void {
    this.thermalConductivity = value;
  }

  public getElectricalConductivity(): number {
    return this.electricalConductivity;
  }
  public setElectricalConductivity(value: number): void {
    this.electricalConductivity = value;
  }

  public getMagneticSusceptibility(): number {
    return this.magneticSusceptibility;
  }
  public setMagneticSusceptibility(value: number): void {
    this.magneticSusceptibility = value;
  }

  public getEdibility(): boolean { return this.edibility; }
  public setEdibility(value: boolean): void { this.edibility = value; }

  public getNutrients(): readonly string[] { return this.nutrients; }
  public setNutrients(value: string[]): void { this.nutrients = value; }

  public getToxicity(): readonly string[] { return this.toxicity; }
  public setToxicity(value: string[]): void { this.toxicity = value; }

  public getDamageResistance(): Readonly<Record<string, number>> {
    return this.damageResistance;
  }
  public setDamageResistance(value: Record<string, number>): void {
    this.damageResistance = value;
  }
}
