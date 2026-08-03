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
 * with the full grid address plus **two** durable ids, so magic is
 * governable *as a class*: anti-magic zones, detect, dispel, and
 * attribution all read this one mark. Rich, not a boolean — the address
 * enables grid-filtered gates ("no ·fire magic here") at no extra cost.
 *
 * **Why two ids.** A single `caster` field was unambiguous only while
 * the person who *specified* an effect and the person who *fired* it
 * were the same object. A wand pulls them apart: the maker specified it
 * at manufacture, the user fired it just now. Dispel and arcane-sight
 * key off the tag; accountability keys off who acted; and *who made
 * this wand* is the item economy's whole quality signal. So the tag
 * carries both, and neither field is a rename of the other — see
 * requirements D2.
 *
 * Both are durable `templatePath`s (the accountability/renown keying
 * precedent), never live refs. Plain scalars → persists free.
 */
export interface MagicProvenance {
  readonly verb: MagicVerb;
  readonly noun: MagicNoun;
  readonly spellId: string;
  /**
   * Who **specified** the working — the caster for a cast, the item's
   * maker for an item discharge. The readable quality signal.
   */
  readonly specifiedBy: string;
  /**
   * Who **fired** it — the caster for a cast, the *user* for an item
   * discharge. What accountability names as the actor.
   */
  readonly firedBy: string;
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

  /**
   * **The hydrate normalizer.** The provenance tag is persisted state —
   * it rides `Trauma.magicOrigin`, `AfflictionRecord.magicOrigin` and
   * `SustainedEffect.magicOrigin` through `holder_snapshots`, so rows
   * written before the D2 split carry a single `caster` field.
   *
   * A legacy row reads as **both** ids: before items existed, the
   * specifier and the firer genuinely were the same object, so that is
   * the honest reading and not a guess. Deliberately **not** a live
   * `caster` alias — keeping one would recreate exactly the ambiguity
   * D2 exists to kill.
   *
   * Returns `undefined` for anything that isn't a recognizable tag, so a
   * corrupt blob drops the mark rather than poisoning a dispel scan.
   */
  public static normalizeProvenance(raw: unknown): MagicProvenance | undefined {
    if (raw == null || typeof raw !== 'object') return undefined;
    const p = raw as Record<string, unknown>;
    if (!MagicGrid.isVerb(p.verb) || !MagicGrid.isNoun(p.noun)) return undefined;
    const spellId = typeof p.spellId === 'string' ? p.spellId : '';
    const legacy = typeof p.caster === 'string' ? p.caster : '';
    const specifiedBy =
      typeof p.specifiedBy === 'string' ? p.specifiedBy : legacy;
    const firedBy = typeof p.firedBy === 'string' ? p.firedBy : legacy;
    return { verb: p.verb, noun: p.noun, spellId, specifiedBy, firedBy };
  }
}
