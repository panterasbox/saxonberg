/**
 * MortalArc — the durable position of an identity in the death arc.
 *
 * **The distinction this type exists to enforce.** There are two ways to
 * record that a player died, and they behave oppositely:
 *
 *   - `lifecycleState: 'dead'` persisted **on a body** is a dead end. The
 *     snapshot restores a corpse with no path out, and the player is
 *     bricked forever. That was the live defect this build closes; do not
 *     reintroduce it.
 *   - the arc position persisted **on the identity** always has
 *     re-embodiment as an exit. That is this type.
 *
 * It must be durable, too: without it, logging out and back in would mint a
 * fresh living body and death would cost nothing.
 *
 * All fields are plain scalars, so the `Hydrator`'s scalar default carries
 * it with no marshaller (docs/antipatterns.md § *Persistent Fields Default
 * to Scalars*).
 *
 * See [docs/subsystems/mortality.md](../../../../../docs/subsystems/mortality.md).
 */

/** Where an identity stands between death and re-embodiment. */
export interface MortalArc {
  /** Game-time seconds at which the body died. */
  diedAt: number;

  /** The ground-truth cause stamped at the transition. */
  cause: string;

  /**
   * Runtime handle to the corpse, when one is still live.
   *
   * **Never load-bearing.** A corpse decays, can be destroyed, and does not
   * survive a restart — so nothing on the path back may require it. It is
   * carried only so a returning shade can reappear beside its own body when
   * that body happens to still exist.
   */
  corpseStuffId?: string;

  /** Where the body fell — the shade's reappearance fallback. */
  whereTemplatePath?: string;
}

/**
 * Decay stages, in order. A corpse walks them on game-time and never walks
 * back.
 *
 * The stages exist to make **evidence degrade**: forensics is assessment
 * pointed at a body, and the whole tension of it is that the answer key is
 * stamped while the readable signs rot. A fresh body tells you almost
 * everything; a spent one tells you nothing, and the difference is time
 * nobody controls.
 */
export const DECAY_STAGES = ['fresh', 'stale', 'decomposed', 'spent'] as const;

export type DecayStage = (typeof DECAY_STAGES)[number];

export const MORTALITY_DEFAULTS = {
  /** Game-seconds a corpse spends in each decay stage. */
  DECAY_STAGE_SEC: 3600,
  /**
   * How readable the forensic record is at each stage, 1 → 0. Consumed by
   * a future examination surface; the *shape* is what this build ships.
   */
  FORENSIC_READABILITY: {
    fresh: 1,
    stale: 0.6,
    decomposed: 0.25,
    spent: 0,
  } as Record<DecayStage, number>,
} as const;
