/**
 * NutritionLabelMixin — a consumable's inspectable nutrition label.
 *
 * The education-by-reference surface: a `Material` carries the real
 * nutrient amounts + toxin doses as DATA; this mixin is the *packaging*
 * that renders them. Composed (opt-in) onto a consumable Stuff that
 * should show its label — a ration, a labelled bottle. It contributes a
 * `markupAugmenter` that appends the profile to the host's long
 * description, so the label shows wherever the long description renders
 * (`look`, the inspection pane, …) via the same augmenter seam the bulk
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
 * Render the nutrition label lines for an edible Material, or `null`
 * when there's nothing to show. Pure data + display.
 */
function renderNutritionLabel(material: Material): string | null {
  if (material.getEdibility() !== true) return null;
  const lines: string[] = [];
  const amounts = material.getNutrientAmounts();
  const nutrientKeys = Object.keys(amounts);
  if (nutrientKeys.length > 0) {
    lines.push(
      "Nutrition: " +
        nutrientKeys.map((k) => `${k} ${amounts[k]}mg`).join(", "),
    );
  }
  const toxicity = material.getToxicity();
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
  if (!MixinApi.isTangible(host)) return text;
  const material = host.getMaterial();
  if (!material) return text;
  const label = renderNutritionLabel(material);
  return label ? `${text}\n${label}` : text;
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
