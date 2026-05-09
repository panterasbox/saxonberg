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
import { StuffApi } from '../../api/stuff';
import type { BodyPlan } from './BodyPlan';
import type { Clade } from './Clade';
import type { Material } from '../material/Material';
import type { VisionProfile } from '../../api/light';

export class Species extends SingletonMixin(Idea) {
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
   * `null` falls through to LightApi's default. Flat 3-scalar record;
   * default JSON serialization handles it (no marshaller needed).
   */
  protected visionProfile: VisionProfile | null = null;

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
  ];

  public getBinomial(): string { return this.binomial; }
  public setBinomial(value: string): void { this.binomial = value; }

  public getCommonNames(): readonly string[] { return this.commonNames; }
  public setCommonNames(value: string[]): void { this.commonNames = value; }

  public getBodyPlan(): BodyPlan | null {
    if (!this._bodyPlanPath) return null;
    return StuffApi.findByTemplatePath<BodyPlan>(this._bodyPlanPath) ?? null;
  }

  public setBodyPlan(value: BodyPlan | null): void {
    this._bodyPlanPath = value?.getTemplatePath() ?? null;
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
}
