/**
 * GroundKind — the closed vocabulary for *what am I standing on*, plus the
 * tables that decide it. **Data only, and deliberately so:** the two
 * readers are `FloorMixin.getGroundKind()` at runtime and
 * `scripts/check-ground.ts` walking YAML at build time, and the way to
 * stop them drifting is to hold the decisions here and let each side keep
 * only its own five-line matcher.
 *
 * ⭐⭐ **The kind is DERIVED, never authored.** There is no `kind:` field on
 * a floor row and there must never be one — the whole point is that two
 * rooms paved in the same stone read the same without anybody having
 * chosen anything, and that an author who invents a material gets an
 * honest answer with no list edit. What *is* authored is the material, the
 * `worked` flag and (optionally) `onGrade`; the kind falls out of those.
 *
 * ## Why a material cannot carry the answer
 *
 * `wool.yaml` states the doctrine the materials tree is built on — *"a
 * material must not assert a CONSTRUCTION"* — so nothing in a material
 * separates living rock from set paving, or bare earth from a rammed
 * floor. That is why the fold takes the floor's own `worked` flag as a
 * third input beside the material class and `onGrade`, and the surface
 * puddle as a fourth for the one kind that reads it (`mire`).
 *
 * ## Why the TAGS stay open and only the RECOGNISED SET is closed
 *
 * `Material.tags` is an open `string[]` (the doc comment at
 * `Material.ts:1113` claiming otherwise is about the corrosion channel's
 * own reading, not the vocabulary). Closing it would break lens 2 — a pack
 * inventing a material would need a kernel list edit. So the *class* of a
 * material is read through {@link GROUND_TAG_CLASSES}, and a tag set that
 * matches nothing in it is `contrived`, which is the honest answer for the
 * rubbery pink of Limbo Lane rather than an error.
 */

/**
 * What the ground under your feet is, as one word. Ten, closed.
 *
 * `set-paving` · `beaten-floor` · `boards` are the wire spellings of the
 * requirements' *paving* · *beaten* · *board*.
 */
export const GROUND_KINDS = [
  /** Living rock, on grade and undressed — a cave floor, a scoured shelf. */
  'rock',
  /** Stone or gravel laid and dressed by somebody — a street, a forge. */
  'set-paving',
  /** Mineral, not on grade — a flagged upper storey, a stone deck. */
  'slab',
  /** Bare earth, dry. */
  'earth',
  /** Earth with standing water in it — peat in the rain, a churned yard. */
  'mire',
  /** Earth worked flat — a rammed cottage floor, a graded dirt road. */
  'beaten-floor',
  /** Granular and unbound — sand, loose gravel, spoil. */
  'loose',
  /** Timber. */
  'boards',
  /** Metal. */
  'plate',
  /**
   * Something the fold has no word for. ⭐ Not an error and not a gap: a
   * material nobody anticipated lands here and everything downstream
   * still works, which is what keeps the list from needing to grow.
   */
  'contrived',
] as const;

export type GroundKind = (typeof GROUND_KINDS)[number];


/**
 * The five classes of matter the fold distinguishes underfoot. A material
 * whose tags match none of them folds to `contrived`.
 */
export type GroundMaterialClass =
  | 'mineral'
  | 'earth'
  | 'granular'
  | 'timber'
  | 'metal';

/**
 * Material tag → the class the fold reads it as. The **recognised set**;
 * `Material.tags` itself stays open, which is what lets a pack invent a
 * material with no kernel list edit.
 */
export const GROUND_TAG_CLASSES: Readonly<Record<string, GroundMaterialClass>> =
  {
    rock: 'mineral',
    mineral: 'mineral',
    ceramic: 'mineral',
    glass: 'mineral',
    earth: 'earth',
    granular: 'granular',
    wood: 'timber',
    metal: 'metal',
    alloy: 'metal',
  };

/**
 * Which class wins when one material carries tags from several.
 *
 * ⭐ `granular` beats `earth` deliberately: sand is earth in spirit, and
 * the word a person wants for sand is *loose*, not *bare earth*. The D5
 * table says exactly this — its earth row reads *"`earth` tag; **not
 * granular**"*.
 */
export const GROUND_CLASS_PRECEDENCE: readonly GroundMaterialClass[] = [
  'metal',
  'timber',
  'granular',
  'earth',
  'mineral',
];

/**
 * One row of the fold. An omitted condition means *don't care*; the first
 * rule whose every stated condition holds decides the kind.
 */
export interface GroundFoldRule {
  readonly materialClass: GroundMaterialClass;
  readonly onGrade?: boolean;
  readonly worked?: boolean;
  readonly standingWater?: boolean;
  readonly kind: GroundKind;
}

/**
 * ⭐⭐ **The fold, as data** — the plan's D5 table transcribed, read in
 * order, first match wins, `contrived` when nothing matches.
 *
 * It is a TABLE rather than a function for one reason: two things have to
 * agree about what a floor resolves to — `FloorMixin.getGroundKind()` at
 * runtime, and `scripts/check-ground.ts` walking YAML at build time — and
 * a fold written twice is a fold that drifts. The matcher is a handful of
 * lines on each side; every decision is here, once.
 *
 * ⚠ `standingWater` is read for exactly one kind (`mire`). Everything else
 * ignores it, which is why a dry heath and a wet one are one floor
 * answering differently rather than two floors.
 */
export const GROUND_KIND_FOLD: readonly GroundFoldRule[] = [
  // Mineral — rock · mineral · ceramic · glass.
  { materialClass: 'mineral', onGrade: true, worked: false, kind: 'rock' },
  { materialClass: 'mineral', onGrade: true, worked: true, kind: 'set-paving' },
  { materialClass: 'mineral', onGrade: false, kind: 'slab' },

  // Earth. Worked first: a rammed floor is beaten whether it is wet or dry.
  { materialClass: 'earth', worked: true, kind: 'beaten-floor' },
  { materialClass: 'earth', worked: false, standingWater: true, kind: 'mire' },
  { materialClass: 'earth', worked: false, standingWater: false, kind: 'earth' },

  // Granular — sand, gravel, spoil. Bound and dressed, it is paving.
  { materialClass: 'granular', worked: false, kind: 'loose' },
  { materialClass: 'granular', worked: true, kind: 'set-paving' },

  // Timber and metal answer the same on grade or off it.
  { materialClass: 'timber', kind: 'boards' },
  { materialClass: 'metal', kind: 'plate' },
];

/**
 * How each kind reads in the one sentence `look floor` appends — *"It is
 * granite, set as paving."*, *"It is peat, waterlogged to mire."*
 *
 * The phrase names the **construction**, because the material half of the
 * sentence is the material's own word.
 */
export const GROUND_KIND_PHRASES: Readonly<Record<GroundKind, string>> = {
  rock: 'living rock',
  'set-paving': 'set as paving',
  slab: 'laid in slabs',
  earth: 'bare earth',
  mire: 'waterlogged to mire',
  'beaten-floor': 'beaten flat',
  loose: 'loose underfoot',
  boards: 'laid as boards',
  plate: 'plated over',
  contrived: 'of no material anything underfoot has a word for',
};
