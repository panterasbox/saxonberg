/**
 * Condition — the Kind-A affliction template (disease, poison, toxin,
 * infection). An identity-bearing authored Idea, resolved by
 * `findByTemplatePath` exactly like `Material` / `Species`. An
 * organism's active-condition record holds the `templatePath` plus
 * per-instance runtime state (`stage`, `elapsed`); the behavior lives
 * here on the template.
 *
 * This build ships the **class + field shape**. ZERO authored content
 * (no influenza, no venom) and no live progression — the catalog is a
 * later wave. No registry, no Api: afflictions are templates like
 * Materials.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';
import type { VitalEffect, ProgressionSpec } from './ActiveCondition';

/** What relieves a condition — the treatment seam (shape only v1). */
export interface ResolutionSpec {
  /** A resolution-mechanism token (e.g. `'antitoxin'`, `'rest'`). */
  by: string;
}

/** Disease-spread descriptor — RESERVED, no consumer in this build. */
export interface ContagionSpec {
  vector: string;
}

/** The authored shape of an affliction (mirrors the class fields). */
export interface ConditionTemplate {
  name: string;
  signature: VitalEffect[];
  progression: ProgressionSpec;
  resolution: ResolutionSpec;
  observableSigns: string[];
  contagion?: ContagionSpec;
}

export default class Condition extends SingletonMixin(
  PropertiedMixin(Idea),
) {
  /** Affliction name (e.g. `'influenza'`). */
  protected name: string = '';
  /** How it perturbs vital signs. */
  protected signature: VitalEffect[] = [];
  /** Stages + cadence (Layer 5). */
  protected progression: ProgressionSpec | null = null;
  /** What relieves it (the treatment seam). */
  protected resolution: ResolutionSpec | null = null;
  /** Observable signs for assessment prose (`'flushed'`, `'feverish'`). */
  protected observableSigns: string[] = [];
  /** Optional contagion — reserved, no consumer v1. */
  protected contagion: ContagionSpec | null = null;

  static persistentFields = [
    'name',
    'signature',
    'progression',
    'resolution',
    'observableSigns',
    'contagion',
  ];

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  public getSignature(): readonly VitalEffect[] {
    return this.signature;
  }
  public setSignature(value: VitalEffect[]): void {
    this.signature = value;
  }

  public getProgression(): ProgressionSpec | null {
    return this.progression;
  }
  public setProgression(value: ProgressionSpec | null): void {
    this.progression = value;
  }

  public getResolution(): ResolutionSpec | null {
    return this.resolution;
  }
  public setResolution(value: ResolutionSpec | null): void {
    this.resolution = value;
  }

  public getObservableSigns(): readonly string[] {
    return this.observableSigns;
  }
  public setObservableSigns(value: string[]): void {
    this.observableSigns = value;
  }

  public getContagion(): ContagionSpec | null {
    return this.contagion;
  }
  public setContagion(value: ContagionSpec | null): void {
    this.contagion = value;
  }
}
