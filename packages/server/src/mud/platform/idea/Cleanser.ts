/**
 * Cleanser — one thing you wash WITH, as a leaf Idea row (cleanliness D2).
 *
 * The `Joint` shape: authored under any pack root
 * (`<root>/idea/Cleanser/<key>.yaml`), read by `CleanserCatalogue` from
 * `template.data`, never cloned. A cleanser is found by the **material
 * tag** its agent carries (`soap`, `lye`, `acid`, `sawdust`…), so a bar of
 * soap, a jar of soft soap and a flask of lye are each a cleanser by what
 * they are made of, with no class of their own. Two agents are AMBIENT —
 * `sunlight` and `sulfur-fume` are read from the room a thing hangs in,
 * not from a thing you hold (D21).
 *
 * ⭐ What a cleanser does is one word from {@link CLEANSER_ACTIONS} — the
 * MECHANISM — and the damage it does. A pack adds a cleanser ROW; it never
 * adds a mechanism nobody models.
 */

import { Idea } from "../../lib/stuff/Idea";
import type { FieldMeta } from "../../lib/mixin";

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

/** The runtime descriptor the catalogue caches. */
export interface CleanserDescriptor {
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

export default class Cleanser extends Idea {
  /** The class every Cleanser row names — what the catalogue warms by. */
  static readonly CLASS_PATH = "/platform/idea/Cleanser";

  public key: string = "";
  public agent: string = "";
  public action: CleanserAction = "surfactant";
  public damages: CleanserDamage[] = [];
  public hardWaterPenalty: boolean = false;
  public softens: boolean = false;
  public consumesPerWash: number = 0;
  public skinHarshness: number = 0;
  public ambient: boolean = false;

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    agent: { persistent: true },
    action: { persistent: true },
    damages: { persistent: true },
    hardWaterPenalty: { persistent: true },
    softens: { persistent: true },
    consumesPerWash: { persistent: true },
    skinHarshness: { persistent: true },
    ambient: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
}
