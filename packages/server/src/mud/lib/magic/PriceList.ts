/**
 * PriceList — the arcane price list as code, and the source of an item's
 * rarity.
 *
 * ## Rarity DERIVES; there is no authored rarity table
 *
 * That negative is the requirement (AC 32). An item's rarity is a
 * function of **what it does**, read off the grid cell through the price
 * list — *spawn weight is the inverse of the stored labour in the item*.
 * A wand of a cheap working is common because it was cheap to make; a
 * wand of an expensive one is rare because it was not.
 *
 * An authored table would let the two drift: something could be
 * expensive to make and common to find, which is a market nobody can
 * reason about and a lie about what magic costs. Deriving it means the
 * economy and the physics cannot disagree.
 *
 * **A multi-effect item takes its rarity from its most expensive cell**
 * (D21) — the honest reading, since making it required clearing the
 * hardest bar, not the average one.
 *
 * ## It doubles as the authoring check for content rule 1
 *
 * `arcane-science.md`'s first content rule is that costs are energy
 * committed in kJ and must be **derivable from the price list**. Having
 * the list in code means an author can be told what their cell costs
 * rather than guessing, and a reviewer can check it.
 *
 * Pure and clock-free — no Stuff, no I/O.
 */

import type { MagicNoun, MagicVerb } from './Grid';

/**
 * **Stored labour by verb**, as a multiplier on the noun's base. The
 * ordering is the arcane science's, not a game-balance guess:
 *
 * - **`perceive`** is cheapest — reading a system costs almost nothing;
 *   you are not moving anything.
 * - **`destroy`** is cheap — unmaking an ordered state is downhill.
 * - **`create`** is dear — you are paying for the order.
 * - **`control`** is dearer still — sustained direction against a
 *   system's own tendency, which is work every moment it lasts.
 * - **`transform`** is prohibitive, and that is the *point*: material
 *   transformation is priced out by ~10⁶ (chemical bonds in eV against
 *   nuclear binding in MeV). It seeds the tree and has no v1 spell.
 */
const VERB_LABOUR: Record<MagicVerb, number> = {
  perceive: 0.5,
  destroy: 1,
  create: 2,
  control: 3,
  transform: 1000,
};

/**
 * **Stored labour by noun** — how expensive the *system being addressed*
 * is to move, in rough proportion to the energy densities involved.
 * `arcana` is the reflexive noun (magic acting on magic) and sits low
 * because it addresses a binding rather than matter.
 */
const NOUN_LABOUR: Record<MagicNoun, number> = {
  arcana: 1,
  sense: 1.5,
  light: 1.5,
  air: 2,
  water: 2,
  fire: 3,
  plant: 3,
  earth: 4,
  body: 4,
  mind: 5,
  beast: 5,
  lightning: 6,
  storm: 12,
};

/** One grid cell. Structurally the `ArcaneAddress` shape. */
interface Cell {
  readonly verb: MagicVerb;
  readonly noun: MagicNoun;
}

export class PriceList {
  /**
   * **The stored labour in one cell** — the abstract cost of getting a
   * working of this kind made at all. Higher is dearer.
   */
  public static labourFor(verb: MagicVerb, noun: MagicNoun): number {
    return (VERB_LABOUR[verb] ?? 1) * (NOUN_LABOUR[noun] ?? 1);
  }

  /**
   * The labour in a whole footprint — **the most expensive cell**, never
   * the sum or the average (D21). Making a two-effect item required
   * clearing the harder bar; the easier one came along for the ride.
   *
   * An empty footprint costs the neutral 1: a thing that does nothing
   * arcane is priced as an ordinary object rather than as free.
   */
  public static labourForFootprint(cells: readonly Cell[]): number {
    if (cells.length === 0) return 1;
    return Math.max(...cells.map((c) => PriceList.labourFor(c.verb, c.noun)));
  }

  /**
   * **Spawn weight — the inverse of stored labour.** The whole of
   * "rarity derives": a cheap working is common, a dear one is rare, and
   * no author gets a knob that could contradict it.
   *
   * Never zero, so nothing becomes strictly unfindable — the tail of the
   * distribution is thin, not empty.
   */
  public static spawnWeightFor(cells: readonly Cell[]): number {
    return 1 / PriceList.labourForFootprint(cells);
  }

  /**
   * A legible band for the same quantity — for prose and for author
   * tooling. Bands, never numbers, on any player-facing surface.
   */
  public static rarityBandFor(cells: readonly Cell[]): string {
    const labour = PriceList.labourForFootprint(cells);
    if (labour <= 2) return 'common';
    if (labour <= 6) return 'uncommon';
    if (labour <= 15) return 'rare';
    return 'fabled';
  }
}
