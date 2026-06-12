/**
 * ActiveCondition — the two-kind condition type system. A condition is
 * a discrete affliction overlaid on a body; the two kinds differ only
 * in where their *behavior* lives, not in storage.
 *
 * - **Kind A — afflictions** (diseases, poisons): identity-bearing
 *   authored content. The instance record holds a `templatePath` +
 *   runtime state; behavior lives on the `Condition` Idea at that path.
 * - **Kind B — trauma** (laceration, fracture, …): a parameterized
 *   value with NO identity. A small *closed* engine vocabulary with
 *   uniform behavior, located by `site`; behavior lives in the static
 *   `TRAUMA_BEHAVIOR` table here.
 *
 * This is a substrate module (the `lib/quantity.ts` precedent — value
 * shapes + static behavior table in one file, no Api, no registry).
 *
 * **This build ships the SHAPES only** — the type system, the table
 * skeleton with a no-op exemplar, zero authored content, and no live
 * progression. Producers/ticks/treatment are deferred. Progression
 * shapes target `ScheduleApi.recurring` (NOT the engagement-bound
 * `ScheduledEmission`).
 */

import type { Vitals } from '../vitals/Vitals';

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
  /** A `body.*` part key (anatomy, Phase 3). */
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
  /** A `VitalSign` key (see lib/vitals/Vitals.ts). */
  sign: string;
  /** Perturbation in the sign's canonical unit. */
  delta: number;
}

/** Stages + cadence for a progressing condition (Layer 5). */
export interface ProgressionSpec {
  /** Targets `ScheduleApi.recurring(intervalMs, fn, opts?)`. */
  intervalMs: number;
  // Stages/cadence detail is content; no live scheduler is built here.
}

/**
 * Per-trauma-type behavior — onset / tick / resolve / describe. The
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
