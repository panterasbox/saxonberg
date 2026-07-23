/**
 * Grid — the magic verb × noun grammar vocabulary.
 *
 * A spell is a **two-word address** — `create·fire`, `control·mind` —
 * naming *which operation, on which real system*. The grid is a
 * skill/classification **lens, never an effect-builder**: what a spell
 * *does* is its `Effect[]` (real Api calls); the grid only governs who
 * can cast it and how well (each axis is an advancement `Discipline`,
 * keys `magic-<verb>` / `magic-<noun>`). See
 * `docs/slates/deferred-rpg/capability-magic-slate.md` Part IV § 3.
 *
 * The verbs are carved by two questions so the set is complete: *does it
 * exist yet?* (no → create) and *does its essence change?* (yes →
 * transform; no → control); perceive is the read-only one. Each noun
 * actuates ONE real subsystem; a noun with no subsystem is a
 * **frontier**, not a hole — lightning and storm graduated when the
 * electricity and weather substrates shipped; time and spirit remain.
 *
 * The `Channel` value-object precedent: closed vocabulary tuples + types
 * + a thin static holder. Magnitude-free — pure shape.
 */

/** The five operations. `transform` seeds the tree but has no v1 spell (no backing Api — polymorph's own build). */
export const MAGIC_VERBS = [
  'create',
  'destroy',
  'control',
  'transform',
  'perceive',
] as const;

/** A grid verb — one of {@link MAGIC_VERBS}. */
export type MagicVerb = (typeof MAGIC_VERBS)[number];

/**
 * The active nouns — each actuates one shipped subsystem (fire → thermal
 * /combustion, lightning → electricity, storm → weather, mind →
 * conditions, sense → belief, arcana → the machinery of magic itself…).
 * `storm` has a Discipline leaf but no v1 spell (a weather-pin write Api
 * doesn't exist yet — the governing invariant holds it back).
 */
export const MAGIC_NOUNS = [
  'fire',
  'water',
  'air',
  'earth',
  'light',
  'plant',
  'beast',
  'body',
  'mind',
  'sense',
  'arcana',
  'lightning',
  'storm',
] as const;

/** A grid noun — one of {@link MAGIC_NOUNS}. */
export type MagicNoun = (typeof MAGIC_NOUNS)[number];

/** Frontier nouns — legible gaps awaiting their prerequisite substrate. */
export const FRONTIER_NOUNS = ['time', 'spirit'] as const;

/**
 * The pervasive provenance tag — everything magic produces is stamped
 * with the full grid address plus the caster, so magic is governable
 * *as a class*: anti-magic zones, detect, dispel, and attribution all
 * read this one mark. Rich, not a boolean — the address enables
 * grid-filtered gates ("no ·fire magic here") at no extra cost.
 * `caster` is the durable templatePath (the accountability/renown
 * keying precedent), never a live ref.
 */
export interface MagicProvenance {
  readonly verb: MagicVerb;
  readonly noun: MagicNoun;
  readonly spellId: string;
  /** The caster's templatePath (durable id). */
  readonly caster: string;
}

/** Thin static holder — predicates + key derivation (the `Channels` shape). */
export class MagicGrid {
  /** Is `v` a grid verb? */
  public static isVerb(v: unknown): v is MagicVerb {
    return (
      typeof v === 'string' && (MAGIC_VERBS as readonly string[]).includes(v)
    );
  }

  /** Is `n` an active grid noun? */
  public static isNoun(n: unknown): n is MagicNoun {
    return (
      typeof n === 'string' && (MAGIC_NOUNS as readonly string[]).includes(n)
    );
  }

  /** The advancement Discipline key for a verb (`magic-create`). */
  public static verbDisciplineKey(verb: MagicVerb): string {
    return `magic-${verb}`;
  }

  /** The advancement Discipline key for a noun (`magic-fire`). */
  public static nounDisciplineKey(noun: MagicNoun): string {
    return `magic-${noun}`;
  }

  /** The two-word cell address (`create·fire`) — display/logging form. */
  public static cellKey(verb: MagicVerb, noun: MagicNoun): string {
    return `${verb}·${noun}`;
  }
}
