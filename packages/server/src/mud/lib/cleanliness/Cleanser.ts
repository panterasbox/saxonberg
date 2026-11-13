/**
 * Cleanser — one thing you wash WITH: the vocabulary of what a cleanser
 * does, and the value a `cleanser` document reads into (cleanliness D2;
 * a document since load-on-use W1, served by `CleanserCatalogue` as
 * `MaterialApi.cleansers()`).
 *
 * ⭐ NAMED BY THE MATERIAL (cleanliness B50): a cleansing material's row
 * carries `cleanser: /platform/cleansers/<key>` (the setter loads the
 * document with the material), and the wash asks the thing in hand
 * `material.getCleanser()`. So a bar of soap, a jar of soft soap and a
 * flask of lye are each a cleanser by what they are made of, with no class
 * of their own, and nothing searches the cleanser rows by tag. Two agents are AMBIENT —
 * `sunlight` and `sulfur-fume` are read from the room a thing hangs in,
 * not from a thing you hold (D21).
 *
 * ⭐ What a cleanser does is one word from {@link CLEANSER_ACTIONS} — the
 * MECHANISM — and the damage it does. A pack adds a cleanser ROW; it never
 * adds a mechanism nobody models.
 */

/**
 * ⭐ The chemistry of cleaning, closed: the ten ways a cleanser removes
 * dirt. A dirt row's `answersTo` names these, so an eleventh is a new
 * mechanism in `SoilableMixin.wash`, never content.
 */
export const CLEANSER_ACTIONS = [
  "surfactant",
  "alkali-mild",
  "alkali-strong",
  "acid-mild",
  "acid-strong",
  "solvent",
  "absorbent",
  "abrasive",
  "oxidiser-slow",
  "oxidiser",
] as const;
export type CleanserAction = (typeof CLEANSER_ACTIONS)[number];

/** A non-corrosive damage a cleanser does to a fibre. ⭐ Burning and
 * rotting are NOT authored here — they derive from the agent material's
 * `corrosiveTo` ∩ the fibre's tags, so they can never disagree with it. */
export interface CleanserDamage {
  /** A material tag on the washed thing (`glass`, `protein`). */
  fibreTag: string;
  effect: "felts" | "scratches" | "yellows";
  /** Only at or above this water temperature. */
  aboveK: number | null;
}

/** A cleanser document, as the wash reads it. */
export interface CleanserDescriptor {
  /** The document's leaf (`soap`) — the word a wash outcome names. */
  key: string;
  /** The material tag the cleanser's thing or bulk carries. */
  agent: string;
  action: CleanserAction;
  damages: CleanserDamage[];
  /** Scums in hard water (soap). */
  hardWaterPenalty: boolean;
  /** Softens the wash water (washing soda). */
  softens: boolean;
  /** How much one wash uses — a count off a stack, or litres off a bulk. */
  consumesPerWash: number;
  /** 0..1 — how hard it is on skin (D23). */
  skinHarshness: number;
  /** Read from the room, not held (`sunlight`, `sulfur-fume`). */
  ambient: boolean;
}

/** The non-corrosive damages a row may author (burns/rots are derived). */
export const DAMAGE_EFFECTS: readonly CleanserDamage["effect"][] = ["felts", "scratches", "yellows"];
