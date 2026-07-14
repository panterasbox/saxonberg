/**
 * CombatFlags — the session-scoped tactical-state set for one combatant
 * (value-object).
 *
 * A small mutable set of the transient conditions a fight imposes:
 * `disarmed` (weapon knocked from grip), `prone` (put on the ground),
 * `grappled` (locked up), `inspired` (a morale lift). These live on the
 * **session**, never in the vitals condition collection — they evaporate
 * the instant the fight ends and never touch the `Creature`. Only
 * *outcomes* (trauma via `inflict`, attribution, `ActSignature`s,
 * standing) persist.
 *
 * Bands-not-numbers doesn't apply here (these are booleans, not a
 * gauge); the method surface is the collections-mixin flag-set shape
 * (add / remove / has / list).
 */

export const COMBAT_FLAGS = [
  "disarmed",
  "prone",
  "grappled",
  "inspired",
] as const;
export type CombatFlag = (typeof COMBAT_FLAGS)[number];

export class CombatFlags {
  private readonly flags = new Set<CombatFlag>();

  has(flag: CombatFlag): boolean {
    return this.flags.has(flag);
  }

  add(flag: CombatFlag): void {
    this.flags.add(flag);
  }

  remove(flag: CombatFlag): void {
    this.flags.delete(flag);
  }

  /** Snapshot of the set flags, in the canonical vocabulary order. */
  list(): CombatFlag[] {
    return COMBAT_FLAGS.filter((f) => this.flags.has(f));
  }

  get size(): number {
    return this.flags.size;
  }
}
