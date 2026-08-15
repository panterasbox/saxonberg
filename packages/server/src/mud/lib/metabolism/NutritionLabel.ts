/**
 * NutritionLabelMixin — a consumable's inspectable nutrition label.
 *
 * The education-by-reference surface: a `Material` carries the real
 * nutrient amounts + toxin doses as DATA; this mixin is the *packaging*
 * that renders them. Composed (opt-in) onto a consumable Stuff that
 * should show its label — a ration, a labelled bottle. It contributes a
 * `markupAugmenter` that appends the profile to the host's long
 * description, so the label shows wherever the long description renders
 * (`look`, the inspection card, …) via the same augmenter seam the bulk
 * substrate and detail-keys use — NOT a `look`-controller special case.
 *
 * What this is NOT:
 * - NOT on every Visible Stuff — only things that actually carry a
 *   nutrition label (you read packaging, not a bare apple's soul).
 * - NOT body-state. It reads the consumable's `Material` data; it never
 *   touches a reader's reserves or any per-viewer state (viewer-blind).
 * - NOT the digestion model. That's `MetabolicMixin` on the eater; this
 *   is descriptive data on the food.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { MarkupAugmenter } from "../../api/mml";
import { MixinApi } from "../../api/mixin";
import type Material from "../material/Material";

/**
 * Render the nutrition label lines from the given face (a Material's
 * fields or a blend payload's — one renderer), or `null` when there's
 * nothing to show. Pure data + display.
 */
function renderNutritionLines(
  edible: boolean,
  amounts: Record<string, number>,
  toxicity: readonly { type: string; amount: number }[],
): string | null {
  if (!edible) return null;
  const lines: string[] = [];
  const nutrientKeys = Object.keys(amounts);
  if (nutrientKeys.length > 0) {
    lines.push(
      "Nutrition: " +
        nutrientKeys.map((k) => `${k} ${amounts[k]}mg`).join(", "),
    );
  }
  if (toxicity.length > 0) {
    lines.push(
      "Contains: " + toxicity.map((t) => `${t.type} ${t.amount}mg`).join(", "),
    );
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * `MarkupAugmenter` for the nutrition label — appends the label to the
 * host's long description. Narrows the host to Tangible (it reads the
 * bulk Material); a host with no edible material contributes nothing.
 */
function nutritionLabelAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  const face = labelFaceOf(host);
  if (!face) return text;
  const label = renderNutritionLines(
    face.edible,
    face.nutrientAmounts,
    face.toxicity,
  );
  return label ? `${text}\n${label}` : text;
}

/** The label's inputs, whichever face supplies them. */
interface LabelFace {
  edible: boolean;
  nutrientAmounts: Record<string, number>;
  toxicity: readonly { type: string; amount: number }[];
}

/**
 * What a host's label describes: a served vessel labels what it *holds*
 * — the bulk slot's **blend payload** when present (the derived meal),
 * else the held Material (the labelled bottle) — falling back to the
 * host's own Tangible material (the bare ration).
 */
function labelFaceOf(host: Stuff): LabelFace | null {
  if (MixinApi.isBulkable(host)) {
    const aff = host.hasInteriorBulk() ? 'interior' : 'surface';
    const payload = host.getBulkPayload(aff);
    if (payload && payload.edible) {
      return {
        edible: true,
        nutrientAmounts: payload.nutrientAmounts,
        toxicity: payload.toxicity,
      };
    }
    const held = host.getBulkMaterial(aff);
    if (held && held.getEdibility() === true) return faceOfMaterial(held);
  }
  const own = MixinApi.isTangible(host) ? host.getMaterial() : null;
  return own ? faceOfMaterial(own) : null;
}

function faceOfMaterial(material: Material): LabelFace {
  return {
    edible: material.getEdibility() === true,
    nutrientAmounts: material.getNutrientAmounts(),
    toxicity: material.getToxicity(),
  };
}

/** Marker surface — the mixin adds no methods, only the augmenter. */
export type NutritionLabel = object;

export function NutritionLabelMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class NutritionLabelMixin extends Base {
    static _mixinName = "NutritionLabelMixin";
    static markupAugmenters: MarkupAugmenter[] = [nutritionLabelAugmenter];
  };
}
