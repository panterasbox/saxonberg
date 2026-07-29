/**
 * Clause — the first-class unit of work: a shape over an engine-verifiable
 * {@link Condition}. Two shapes span the work model:
 *
 *   - **achieve** — make the condition true once; structurally settleable,
 *     so it can be escrowed and paid per settlement (the gig's shape).
 *   - **maintain** — keep the condition true over an interval;
 *     structurally *unsettleable*, so it is paid by interval — the shipped
 *     time-wage IS the maintain shape's paid-by-interval instance (a
 *     bartender maintains "the bar is tended" across a shift). No
 *     violation-detection engine ships until a consumer (a bouncer-shaped
 *     job) exists — the vocabulary carries the shape, the engine does not
 *     yet police it (named-deferred: a direct witness hook on the relevant
 *     chokepoint, never `EventApi` for a single-consumer seam).
 *
 * A v1 Contract holds exactly one `achieve` clause.
 */

import type { ConditionData } from "./Condition";

/** The clause-shape vocabulary. */
export const CLAUSE_SHAPES = ["achieve", "maintain"] as const;

export type ClauseShape = (typeof CLAUSE_SHAPES)[number];

/** The serializable clause payload a Contract carries. */
export interface ClauseData {
  shape: ClauseShape;
  condition: ConditionData;
}
