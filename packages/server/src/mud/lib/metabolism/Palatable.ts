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
 * ⚠ **Where it composes, and why not on `BulkableMixin`.** It lives on
 * `CraftVessel`: everything somebody *made something in* — dishes,
 * platters, the cook pot, the bar's glasses, the syrup and oil bottles.
 * It sat on `BulkableMixin` for one build, which put a taste-palate
 * augmenter on `Floor` (puddles), `GardenBed`, `PlantPot`, `AirTank` and
 * `WateringCan`, made it re-derive "…but only a food vessel with
 * contents" in four guard lines, and dragged `lib/advancement` into the
 * bulk substrate to do it. Firing on hosts you then have to guard your
 * way back out of is the tell that a mixin is on the wrong host.
 *
 * ⚠⚠ Nothing here is a gate. Every band tastes the food; the better
 * palate simply reads more off it. That is the difference between a
 * skill you have and a door you are allowed through.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { MarkupAugmenter } from "../../api/mml";
import { MixinApi } from "../../api/mixin";
import {
  COMPETENCE_BANDS,
  type CompetenceBandName,
} from "../advancement/CompetenceBand";

/** The sense channel a palate answers on. */
const TASTE_CHANNEL = "taste";

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
  const line = renderPalate(
    payload?.tastes ?? material?.getTastes() ?? [],
    payload?.parts ?? [],
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
