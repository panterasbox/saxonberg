/**
 * Cleanser — one thing you wash WITH, as a leaf Idea row (cleanliness D2).
 *
 * ⭐ NAMED BY THE MATERIAL (cleanliness B50): a cleansing material's row
 * carries `cleanser: /platform/idea/Cleanser/<key>` (`identity:constituent`
 * — the row loads with the material), and the wash asks the thing in hand
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

  /**
   * ⭐ This row as the wash reads it — validated, never thrown (a malformed
   * row is NAMED and answers `null`). Read straight off the row a cleanser
   * MATERIAL names (`Material.getCleanser`, cleanliness B50) — no
   * catalogue, no search.
   */
  public descriptor(): CleanserDescriptor | null {
    const why = (r: string): null => {
      console.warn(`Cleanser '${this.getTemplatePath() ?? this.key}': ${r}`);
      return null;
    };
    if (!this.key) return why("no key");
    if (!this.agent) return why("no agent");
    if (!(CLEANSER_ACTIONS as readonly string[]).includes(String(this.action))) {
      return why(`action '${String(this.action)}' is not one of ${CLEANSER_ACTIONS.join("|")}`);
    }
    const damages: CleanserDamage[] = [];
    for (const r of Array.isArray(this.damages) ? this.damages : []) {
      if (!r || typeof r.fibreTag !== "string" || !r.fibreTag) return why("a damage names no fibreTag");
      if (!(DAMAGE_EFFECTS as readonly string[]).includes(r.effect)) {
        return why(`damage effect '${String(r.effect)}' is not one of ${DAMAGE_EFFECTS.join("|")}`);
      }
      damages.push({ fibreTag: r.fibreTag, effect: r.effect, aboveK: typeof r.aboveK === "number" ? r.aboveK : null });
    }
    const num = (v: unknown, fallback: number): number =>
      typeof v === "number" && Number.isFinite(v) ? v : fallback;
    return {
      key: this.key,
      agent: this.agent,
      action: this.action,
      damages,
      hardWaterPenalty: this.hardWaterPenalty === true,
      softens: this.softens === true,
      consumesPerWash: Math.max(0, num(this.consumesPerWash, 0)),
      skinHarshness: Math.max(0, Math.min(1, num(this.skinHarshness, 0))),
      ambient: this.ambient === true,
    };
  }
}

/** The non-corrosive damages a row may author (burns/rots are derived). */
const DAMAGE_EFFECTS: readonly CleanserDamage["effect"][] = ["felts", "scratches", "yellows"];
