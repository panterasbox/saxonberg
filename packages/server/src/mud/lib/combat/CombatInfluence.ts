/**
 * CombatInfluence — the closed state-instruction vocabulary for a live
 * combat session (value-object / vocabulary).
 *
 * The one vocabulary spoken by BOTH influence surfaces: the external
 * `CombatApi.influence` bridge (magic, scripts — "Effect iff gated Api"
 * made real for combat state) and the hook-side
 * `CombatHookContext.influence` consequence (a concussive maul staggers
 * on hit). Every instruction routes through the **existing
 * poise/opening economy** — deterministic, bands-not-numbers at the
 * surface; influence never sets `down` (only an exchange exploiting the
 * contest does).
 *
 * Determinism contract: application is **synchronous and
 * deterministic**; magnitudes come from the `combat.influence.*`
 * AppSettings dials, never from this module (shape in code, magnitude
 * in dials).
 */

/** The closed instruction-kind vocabulary. */
export const INFLUENCE_KINDS = ["stagger", "expose", "steady"] as const;
export type InfluenceKind = (typeof INFLUENCE_KINDS)[number];

/**
 * One state instruction into a live session:
 *
 *   - `stagger` — erode the target's poise (banded `light`/`heavy`
 *     magnitudes; focus-fire-scaled like exchange erosion; a crossing
 *     into `broken` arms the normal opening);
 *   - `expose` — arm the exploitable opening window without moving the
 *     gauge (ownerless — any attacker cashes it);
 *   - `steady` — restore poise (endurance-capped like any recovery, and
 *     suppressed under focus-fire exactly like the defend-pin).
 */
export type CombatInfluence =
  | { kind: "stagger"; intensity: "light" | "heavy" }
  | { kind: "expose" }
  | { kind: "steady" };

/**
 * The result of applying an instruction. `ok: false` reasons:
 * `'not-in-combat'` (the target has no active session), `'downed'`
 * (the target is down), `'suppressed'` (a `steady` under focus-fire).
 */
export interface InfluenceResult {
  ok: boolean;
  reason?: string;
}
