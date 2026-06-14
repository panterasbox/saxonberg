/**
 * Conditions — the two-kind condition type system and the Kind-A
 * `Condition` Idea template. A condition is a discrete affliction
 * overlaid on a body; the two kinds differ only in where their
 * *behavior* lives, not in storage. Both present behind one
 * `ActiveCondition` collection on `VitalsMixin`.
 *
 * - **Kind A — afflictions** (diseases, poisons): identity-bearing
 *   authored content. The instance record holds a `templatePath` +
 *   runtime state; behavior lives on the `Condition` Idea (below),
 *   resolved by `findByTemplatePath` like Materials / Species.
 * - **Kind B — trauma** (laceration, fracture, …): a parameterized
 *   value with NO identity — a small *closed* engine vocabulary with
 *   uniform behavior located by `site`; behavior lives in the static
 *   `TRAUMA_BEHAVIOR` table (below).
 *
 * This build ships the **shapes only** — the type system, the table
 * skeleton with a no-op exemplar, the `Condition` class, and ZERO
 * authored content. No live progression. Progression shapes target
 * `ScheduleApi.recurring` (NOT the engagement-bound `ScheduledEmission`).
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';
import type { Vitals } from './Vitals';
import type { ToxinBehavior } from '../metabolism/Metabolic';

// ---------- the active-condition vocabulary ----------

/** Kind A — affliction instance record; behavior resolves from a template. */
export interface AfflictionRecord {
  kind: 'affliction';
  /** `findByTemplatePath` → the `Condition` Idea. */
  templatePath: string;
  /** Current progression stage. */
  stage: number;
  /** Elapsed time in this affliction (ms). */
  elapsed: number;
}

/** The closed engine trauma vocabulary. Grow additively (puncture, …). */
export type TraumaType =
  | 'laceration'
  | 'fracture'
  | 'contusion'
  | 'avulsion'
  | 'burn';

/** Kind B — trauma value; behavior resolves from `TRAUMA_BEHAVIOR`. */
export interface Trauma {
  kind: 'trauma';
  type: TraumaType;
  /** A `body.*` part key (anatomy). */
  site: string;
  /** Current damage; mutates as it worsens / heals. */
  severity: number;
  /** A laceration not yet dressed (runtime process flag). */
  bleeding?: boolean;
  /** Pressure / bandage applied → bleed arrested (runtime process flag). */
  dressed?: boolean;
  // The runtime ScheduleApi.recurring handle a future tick holds is NOT
  // persisted — re-arm on hydrate.
}

/** Both kinds behind one collection element. */
export type ActiveCondition = AfflictionRecord | Trauma;

/** How a condition perturbs a vital sign (shape only — no consumer v1). */
export interface VitalEffect {
  /** A `VitalSign` key (see Vitals.ts). */
  sign: string;
  /** Perturbation in the sign's canonical unit. */
  delta: number;
}

/** Stages + cadence for a progressing condition. */
export interface ProgressionSpec {
  /** Targets `ScheduleApi.recurring(intervalMs, fn, opts?)`. */
  intervalMs: number;
  // Stages/cadence detail is content; no live scheduler is built here.
}

/**
 * Per-trauma-type behavior — onset / tick / resolve / describe, the
 * strategy table co-located with the value. `tick` is authored against
 * `ScheduleApi.recurring`'s zero-arg callback, NOT `ScheduledEmission`.
 */
export interface TraumaBehavior {
  onset(host: Vitals, t: Trauma): void;
  tick(host: Vitals, t: Trauma): void;
  resolve(host: Vitals, t: Trauma): void;
  describe(t: Trauma): string;
}

const noop = (): void => {};

/** The identity exemplar — no live behavior; describe emits plain prose. */
export const NOOP_BEHAVIOR: TraumaBehavior = {
  onset: noop,
  tick: noop,
  resolve: noop,
  describe: (t: Trauma): string => `${t.type} of ${t.site}`,
};

/**
 * The closed trauma behavior table. v1 ships every `TraumaType` keyed to
 * the no-op exemplar — the shape is the deliverable; per-type behavior
 * (bleed, fracture-disables-slot, …) is a later wave.
 */
export const TRAUMA_BEHAVIOR: Record<TraumaType, TraumaBehavior> = {
  laceration: NOOP_BEHAVIOR,
  fracture: NOOP_BEHAVIOR,
  contusion: NOOP_BEHAVIOR,
  avulsion: NOOP_BEHAVIOR,
  burn: NOOP_BEHAVIOR,
};

// ---------- Kind-A: the Condition Idea template ----------

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

/**
 * The Kind-A affliction template (disease / poison / toxin / infection).
 * An identity-bearing authored Idea resolved by `findByTemplatePath`
 * like Materials / Species. ZERO content ships — the class + field shape
 * only; the catalog is a later wave.
 */
export default class Condition extends SingletonMixin(
  PropertiedMixin(Idea),
) {
  /** Affliction name (e.g. `'influenza'`). */
  protected name: string = '';
  /** How it perturbs vital signs. */
  protected signature: VitalEffect[] = [];
  /** Stages + cadence. */
  protected progression: ProgressionSpec | null = null;
  /** What relieves it (the treatment seam). */
  protected resolution: ResolutionSpec | null = null;
  /** Observable signs for assessment prose (`'flushed'`, `'feverish'`). */
  protected observableSigns: string[] = [];
  /** Optional contagion — reserved, no consumer v1. */
  protected contagion: ContagionSpec | null = null;

  /**
   * Optional toxin behavior — the per-body rate params for a toxin-driven
   * condition (absorption / clearance / potency / severity bands).
   * Authored only on the toxin conditions metabolism drives (alcohol,
   * ptomaine, venom, lead); `null` for every other condition. This is
   * where a toxin's RATES live (the food carries only the dose amount).
   */
  protected toxinBehavior: ToxinBehavior | null = null;

  static persistentFields = [
    'name',
    'signature',
    'progression',
    'resolution',
    'observableSigns',
    'contagion',
    'toxinBehavior',
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

  /** The toxin behavior block (null for non-toxin conditions). */
  public getToxinBehavior(): ToxinBehavior | null {
    return this.toxinBehavior;
  }
  public setToxinBehavior(value: ToxinBehavior | null): void {
    this.toxinBehavior = value;
  }
}
