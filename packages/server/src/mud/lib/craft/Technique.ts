/**
 * Technique — how a drink was worked, and what the working does to it.
 *
 * A vocabulary value-object (the `Light` / `Quantity` shape): the closed
 * set of ways a bar build is worked plus the physical effect of each,
 * read by `CraftingLogic` at the fill (the resolve path derives the
 * technique from the recipe's tool capabilities; the hand path records
 * it from the `stir` / `shake` / `muddle` steps).
 *
 * The effects are the bartender's honest numbers, not flavour text:
 * shaking with ice chills harder and dilutes more than stirring, and
 * aerates (cloudy); a built drink is neither chilled nor diluted by the
 * working itself (the ice in the glass does that over time — see
 * `CraftedDrink.reconcileThermal`).
 */

/** The closed vocabulary of build techniques. */
export type Technique = 'shaken' | 'stirred' | 'built' | 'muddled';

/** What a technique does to the drink at the fill. */
export interface TechniqueEffect {
  /** Kelvin removed from the fill temperature by the working. */
  chillK: number;
  /** Litres of water folded in by the working (dilution). */
  dilutionL: number;
  /** Whether the working folds air in (reads "cloudy"). */
  aerated: boolean;
}

/** The effect table, keyed by technique. */
export const TECHNIQUES: Readonly<Record<Technique, TechniqueEffect>> = {
  shaken: { chillK: 8, dilutionL: 0.02, aerated: true },
  stirred: { chillK: 6, dilutionL: 0.01, aerated: false },
  built: { chillK: 0, dilutionL: 0, aerated: false },
  muddled: { chillK: 0, dilutionL: 0, aerated: false },
};

/** Every technique word, for validation. */
export const TECHNIQUE_NAMES: readonly Technique[] = [
  'shaken',
  'stirred',
  'built',
  'muddled',
];

/**
 * The tool → technique derivation: which capability among a recipe's
 * `toolCapabilities` decides how it is worked. Order matters — a recipe
 * that names both a muddler and a shaker (a mojito is muddled, then
 * built; a whiskey smash is muddled, then shaken) is worked by the
 * *finishing* instrument, so the shaker / mixing glass win over the
 * muddler.
 */
const CAPABILITY_TECHNIQUES: readonly [string, Technique][] = [
  ['shaker', 'shaken'],
  ['mixing-glass', 'stirred'],
  ['muddler', 'muddled'],
];

export class Techniques {
  /** Whether `word` is a technique. */
  static isTechnique(word: string): word is Technique {
    return (TECHNIQUE_NAMES as readonly string[]).includes(word);
  }

  /** The technique a set of tool capabilities implies (`built` when none). */
  static forCapabilities(capabilities: readonly string[]): Technique {
    for (const [cap, technique] of CAPABILITY_TECHNIQUES) {
      if (capabilities.includes(cap)) return technique;
    }
    return 'built';
  }

  /** The effect of a technique (`built` for an unknown word). */
  static effect(technique: string | null | undefined): TechniqueEffect {
    return technique && Techniques.isTechnique(technique)
      ? TECHNIQUES[technique]
      : TECHNIQUES.built;
  }
}
