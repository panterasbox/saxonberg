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
import { BlendLabel } from './BlendLabel';
import { MaterialApi } from '../../api/material';

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
        nutrientKeys.map((k) => `${k} ${mg(amounts[k] ?? 0)}mg`).join(", "),
    );
  }
  if (toxicity.length > 0) {
    lines.push(
      "Contains: " + toxicity.map((t) => `${t.type} ${mg(t.amount)}mg`).join(", "),
    );
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * A label figure without float noise. Since ceramics re-plan R1 a part's
 * servings derive from a mass fraction (`0.025 × 0.8 kg / 0.1 kg`), and
 * the arithmetic leaves `86000.00000000001` where the authored figure was
 * `86000` — twelve significant figures is every digit a row can mean.
 */
function mg(amount: number): number {
  return Number(amount.toPrecision(12));
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
    // ⭐ One derivation, both cases. `BlendLabel` reads the makeup when
    // there is one and falls back to the held Material when there is not,
    // so the two arms this used to have — "the blend's own figures" and
    // "the bare material's" — are the same call.
    const payload = host.getBulkPayload(aff);
    const held = host.getBulkMaterial(aff);
    if (MaterialApi.blendEdibility(payload, held)) {
      // ⭐ The label is for what the vessel HOLDS: its parts' servings are
      // their fractions of this mass (ceramics re-plan R1-D1).
      const hostKg = held
        ? (host.getBulkAmount(aff).rawValue() * held.getDensity().rawValue()) / 1000
        : 0;
      return {
        edible: true,
        nutrientAmounts: BlendLabel.amountsOf(payload, held, hostKg),
        toxicity: MaterialApi.blendToxicity(payload, held, hostKg),
      };
    }
  }
  const own = MixinApi.isTangible(host) ? host.getMaterial() : null;
  if (!own) return null;
  // ⭐ A discrete food that knows what it is MADE OF reads its label off
  // those parts, exactly as a blend does — the tangible half of
  // `BlendLabel.amountsOf`, over the piece's own mass. Without this a
  // wholemeal loaf and a white one are both "bread" and feed you
  // identically. An empty makeup falls straight through to the material's
  // own figures.
  if (MixinApi.isComposition(host) && MixinApi.isTangible(host)) {
    const makeup = host.getMakeup();
    if (makeup.length > 0) {
      return {
        edible: own.getEdibility() === true,
        nutrientAmounts: BlendLabel.amountsOf(
          { makeup: [...makeup] },
          own,
          host.getMass().rawValue(),
        ),
        toxicity: own.getToxicity(),
      };
    }
  }
  return faceOfMaterial(own);
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
