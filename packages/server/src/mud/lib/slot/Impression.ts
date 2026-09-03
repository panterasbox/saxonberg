/**
 * Impression — the phrasing vocabulary behind the dressed-impression
 * line, plus its seeded selector.
 *
 * ## What the line is
 *
 * A **gestalt** of how somebody is dressed, appended to a wearer's long
 * description. The inspection card already *enumerates* the worn stack
 * (the `worn` projection); prose that enumerated it again would just be
 * a worse card. So this summarizes **in aggregate** — a quality read, an
 * upkeep read, later a fit and a colour read — and it **names no
 * individual garment**, ever.
 *
 * ## Why a fold over facets, and why absent facts are the normal case
 *
 * The facts arrive across the build: grade and condition exist today,
 * fit arrives with the cut-to stamp, colour with dyeing. The line is
 * therefore written as a fold over **whatever resolves** — each facet
 * contributes a clause or nothing — which is what lets it ship before
 * the chain that eventually feeds it.
 *
 * ## ⚠ Selection is SEEDED, not drawn
 *
 * `docs/uncertainty.md`: a roll may decide what the world IS, never what
 * an action DID, and a seeded read is not a draw. The phrasing is a pure
 * hash of `(host, factsDigest, viewer)`, so:
 *
 *   - the same outfit always reads the same way to the same viewer —
 *     **correct and desirable**: an unchanged person should not
 *     re-describe themselves differently every glance;
 *   - variety across *people* comes from different hosts hashing
 *     differently;
 *   - a changed outfit changes the digest and re-rolls honestly.
 *
 * So there is **no recent-set, no FIFO cap, and no session state** — and
 * in particular no `Property.of('impression.recent')`, which would be a
 * literal-keyed prop and therefore not the prop rule's sanctioned case.
 *
 * ## Why the bank lives here and not in `descriptor-banks`
 *
 * `descriptor-banks` is a **closed two-axis shape** for the appearance
 * of an *unidentified item* — `primary` × `secondary` word lists plus an
 * `unidentifiedLong` paragraph — and the pack installer reads exactly
 * those keys. A `(facet, band)` map installed there would have its keys
 * silently discarded by `descriptorBankStrategy.rowOf`, and
 * `check-descriptor-banks` would fail the file for carrying no
 * `unidentifiedLong`. These phrasings are an augmenter's vocabulary, so
 * they live where `Wet`'s `WETNESS_PHRASE` lives: beside the augmenter,
 * as a module constant.
 */

/** The facets the impression line folds over. */
export type ImpressionFacet = 'quality' | 'upkeep' | 'brand';

/**
 * One resolved facet reading. `band` is a facet-local word (never an
 * index — the banding-is-presentation rule), `token` an optional
 * substitution for phrasings carrying a `{brand}` slot.
 */
export interface ImpressionClause {
  facet: ImpressionFacet;
  band: string;
  token?: string;
}

/**
 * The phrasings, keyed `(facet, band)`, five deep each.
 *
 * ⚠ Every fragment is a **standalone lowercase clause** with no leading
 * conjunction and no trailing punctuation, so the renderer can put any
 * of them first or second. And none of them may name a garment — the
 * whole point of the line — which the augmenter's test asserts against
 * every worn item's `primaryKeyword`.
 */
const PHRASINGS: Readonly<
  Record<ImpressionFacet, Readonly<Record<string, readonly string[]>>>
> = {
  quality: {
    poor: [
      'dressed in rags',
      'wearing whatever came to hand',
      'turned out badly',
      'dressed poorly',
      'got up in shabby stuff',
    ],
    fair: [
      'dressed plainly',
      'turned out plainly',
      'wearing ordinary stuff',
      'dressed without fuss',
      'plainly got up',
    ],
    fine: [
      'turned out well',
      'dressed well',
      'well got up',
      'wearing good stuff',
      'dressed with care',
    ],
    exceptional: [
      'expensively turned out',
      'dressed expensively',
      'wearing costly stuff',
      'turned out at some expense',
      'dressed at obvious cost',
    ],
    masterful: [
      'magnificently turned out',
      'dressed magnificently',
      'wearing the very best',
      'turned out beyond ordinary means',
      'dressed as few can afford',
    ],
  },
  upkeep: {
    soaked: [
      'soaked through',
      'wet to the skin',
      'dripping',
      'sodden',
      'wringing wet',
    ],
    damp: [
      'damp',
      'damp about the shoulders',
      'not quite dry',
      'clammy with damp',
      'damp all through',
    ],
    ragged: [
      'coming apart at every seam',
      'worn to pieces',
      'in tatters',
      'past mending',
      'falling apart',
    ],
    worn: [
      'showing its wear',
      'gone thin at the edges',
      'well used',
      'past its best',
      'wearing out',
    ],
  },
  brand: {
    dominant: [
      'all of it {mark}',
      '{mark} throughout',
      '{mark}, head to foot',
      'every piece of it {mark}',
      '{mark} by the look of it',
    ],
  },
};

/**
 * The vocabulary + its seeded selector. A value-object surface: no
 * instance state, no registry, nothing to warm.
 */
export class Impression {
  /**
   * FNV-1a over the seed parts. Cheap, stable across processes, and
   * — unlike `Math.random` — a *read* rather than a draw.
   */
  public static seedOf(parts: readonly string[]): number {
    let hash = 0x811c9dc5;
    for (const part of parts) {
      for (let i = 0; i < part.length; i++) {
        hash ^= part.charCodeAt(i);
        // 32-bit FNV prime multiply, kept in uint32 the shift-add way.
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      // Separator so ('ab','c') and ('a','bc') differ.
      hash ^= 0x2f;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  /**
   * The phrasing for one clause, or `null` when the facet has no bank
   * for that band (an unmodelled band contributes nothing rather than
   * throwing — the fold's totality rule).
   */
  public static phrasingFor(
    clause: ImpressionClause,
    seed: number,
  ): string | null {
    const bank = PHRASINGS[clause.facet]?.[clause.band];
    if (!bank || bank.length === 0) return null;
    const pick = bank[seed % bank.length];
    if (pick === undefined) return null;
    return clause.token ? pick.replace('{mark}', clause.token) : pick;
  }

  /**
   * Render up to two clauses as one sentence. The second clause is
   * joined with *but* when it is an upkeep complaint and *and*
   * otherwise, which is the whole of the line's grammar.
   */
  public static render(
    clauses: readonly ImpressionClause[],
    seed: number,
  ): string | null {
    const rendered: string[] = [];
    let contrast = false;
    for (const clause of clauses) {
      if (rendered.length >= 2) break;
      const phrase = Impression.phrasingFor(clause, seed + rendered.length);
      if (!phrase) continue;
      if (rendered.length > 0 && clause.facet === 'upkeep') contrast = true;
      rendered.push(phrase);
    }
    const first = rendered[0];
    if (first === undefined) return null;
    const head = first.charAt(0).toUpperCase() + first.slice(1);
    const second = rendered[1];
    if (second === undefined) return `${head}.`;
    return `${head}, ${contrast ? 'but' : 'and'} ${second}.`;
  }
}
