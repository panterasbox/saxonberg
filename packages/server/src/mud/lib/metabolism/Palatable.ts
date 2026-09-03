/**
 * PalatableMixin — ⭐ **what a thing tastes like, derived, and read
 * through the taster's own competence.**
 *
 * Filtered to the `taste` channel, so it lands on `taste <dish>` and
 * nowhere else. What it says depends on the TASTER: the same bowl reads
 * differently to a novice cook and to an expert one, because a palate is
 * something you build and this is the one place the game shows you that
 * you have one.
 *
 *   - **untrained / novice** — the dominant basic tastes and nothing
 *     else. "It tastes sweet and umami." That is honestly all most
 *     people get.
 *   - **competent** — the ingredients, by name. You can pick out what is
 *     in it.
 *   - **proficient / expert** — and the maker's grade: the quality of the
 *     stock and the working, which is what a maker tastes for.
 *
 * ⭐ **Nothing authors what a dish tastes like.** The reading is derived
 * from the blend's own composition (`BulkPayload.parts` / `.tastes`,
 * written by the craft), so changing what goes in changes the reading
 * with nothing else edited. A per-dish flavour string is the retired
 * per-dish-material anti-pattern wearing a different hat.
 *
 * ⭐⭐ **The discipline is the one that MADE it** (`BulkPayload.discipline`,
 * recorded from the recipe), not a word the kernel knows. A cocktail
 * reads through the bartender's craft and a stew through the cook's; a
 * blend nobody's recipe made records none, and reads at the floor —
 * honest, because an off-spec lump of food teaches you nothing about its
 * making.
 *
 * ⚠ **Where it composes: `ServingVessel`, and nowhere else.** It took two
 * wrong hosts to get there, and both were defended with a true sentence.
 *
 *   1. `BulkableMixin` — which put a taste-palate augmenter on `Floor`
 *      (puddles), `GardenBed`, `PlantPot`, `AirTank` and `WateringCan`,
 *      made it re-derive "…but only a food vessel with contents" in four
 *      guard lines, and dragged `lib/advancement` into the bulk
 *      substrate. **Firing on hosts you then guard your way back out of
 *      is the tell.**
 *   2. `CraftVessel` — "a vessel somebody made something in". True, and
 *      still too wide: that class is also the wort bucket, the must
 *      bucket, the tallow crock, the **wash bucket** and the cutlery, so
 *      a table knife and a bucket of dirty water read as things you
 *      taste. **A second tell, quieter: the list in THIS comment named
 *      "dishes, platters, the cook pot, the bar's glasses, the syrup and
 *      oil bottles" — already narrower than where the mixin actually
 *      composed, and still wrong at both ends.** When the doc block has
 *      to enumerate a subset of its own hosts, the subset is the class.
 *
 * `ServingVessel` is that class: a vessel a made portion reaches a person
 * in. What a trade WORKS in stays on `CraftVessel`.
 *
 * ⚠⚠ Nothing here is a gate. Every band tastes the food; the better
 * palate simply reads more off it. That is the difference between a
 * skill you have and a door you are allowed through.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { MarkupAugmenter } from "../../api/mml";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import type { BlendPart } from "../bulk/Bulkable";
import type Material from "../material/Material";
import {
  COMPETENCE_BANDS,
  type CompetenceBandName,
} from "../advancement/CompetenceBand";

/** The sense channel a palate answers on. */
const TASTE_CHANNEL = "taste";

/**
 * The ingredients' display names, resolved from the composition.
 *
 * ⭐ The composition carries Material PATHS, not names — a name is not a
 * handle, and every derived reading below needs a handle. Resolving here
 * is the price, and it is the right price: the alternative was the blend
 * carrying a pre-computed answer for every subsystem that might ask.
 */
function ingredientsOf(
  composition: readonly BlendPart[] | undefined,
): Material[] {
  if (!composition || composition.length === 0) return [];
  const out: Material[] = [];
  for (const part of composition) {
    const material = StuffApi.findByTemplatePath<Material>(part.materialPath);
    if (material) out.push(material);
  }
  return out;
}

/** The ingredients' display names, in the order they went in. */
function ingredientNames(ingredients: readonly Material[]): string[] {
  const out: string[] = [];
  for (const m of ingredients) {
    const name = m.getName();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * ⭐ **The blend's basic tastes, DERIVED — the union of what went in.**
 *
 * This was a `tastes` array on the payload, written by the craft at the
 * blend step and read back here. That is the same fact recorded twice,
 * and this file's own doc block already said why it was wrong: *"nothing
 * authors what a dish tastes like."* A cached derivation is an authored
 * flavour string wearing a different hat — it can go stale, and nothing
 * would ever say so.
 *
 * Falls back to the blend Material's own tastes for a payload that
 * records no composition (a hand-filled vessel, a puddle), which is what
 * the cached field did too.
 */
function tastesOf(
  ingredients: readonly Material[],
  blend: Material | null,
): string[] {
  if (ingredients.length === 0) return [...(blend?.getTastes() ?? [])];
  const out: string[] = [];
  for (const m of ingredients) {
    for (const taste of m.getTastes()) if (!out.includes(taste)) out.push(taste);
  }
  return out;
}

/**
 * Render the palate lines for a host's contents, or `null` when there is
 * nothing to taste. Pure over its inputs — the augmenter below is the
 * only thing that knows about hosts.
 */
function renderPalate(
  tastes: readonly string[],
  parts: readonly string[],
  gradeBand: string | null,
  band: CompetenceBandName,
): string | null {
  const lines: string[] = [];
  if (tastes.length > 0) lines.push(`It tastes ${joinWords(tastes)}.`);
  const rank = COMPETENCE_BANDS.indexOf(band);
  if (rank >= COMPETENCE_BANDS.indexOf("competent") && parts.length > 0) {
    lines.push(`You pick out ${joinWords(parts)}.`);
  }
  if (rank >= COMPETENCE_BANDS.indexOf("proficient") && gradeBand) {
    lines.push(`The making of it reads ${gradeBand}.`);
  }
  return lines.length > 0 ? lines.join(" ") : null;
}

/**
 * The taster's competence in ONE discipline, read from the SYNC digest
 * cache. A cold cache, a taster with no transcript, or a blend that
 * records no discipline all read `untrained` — the floor, which is what
 * an unexercised palate is.
 */
function bandFor(viewer: Stuff, discipline: string): CompetenceBandName {
  if (!discipline) return "untrained";
  if (!MixinApi.isAdvancing(viewer)) return "untrained";
  const digest = viewer.competenceDigestCached();
  if (!digest) return "untrained";
  return digest.find((d) => d.discipline === discipline)?.band ?? "untrained";
}

/** `a, b and c` — the ordinary English list, for a derived phrase. */
function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** Append the palate reading to a host's long description, taste-only. */
function palateAugmenter(
  text: string,
  host: Stuff,
  viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  // Taste-channel only. A `look` must not read a dish's palate out.
  if (!opts?.filter || !opts.filter.includes(TASTE_CHANNEL)) return text;
  if (!MixinApi.isBulkable(host) || !host.hasInteriorBulk()) return text;
  if (host.isBulkEmpty("interior")) return text;

  const payload = host.getBulkPayload("interior");
  const material = host.getBulkMaterial("interior");
  const ingredients = ingredientsOf(payload?.composition);
  const line = renderPalate(
    tastesOf(ingredients, material),
    ingredientNames(ingredients),
    MixinApi.isGraded(host) ? host.getGradeBand() : null,
    bandFor(viewer, payload?.discipline ?? ""),
  );
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function PalatableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class PalatableMixin extends Base {
    static _mixinName = "PalatableMixin";
    static markupAugmenters: MarkupAugmenter[] = [palateAugmenter];
  };
}
