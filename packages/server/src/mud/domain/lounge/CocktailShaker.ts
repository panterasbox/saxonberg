/**
 * CocktailShaker — a bar mixing vessel that buffers a step-by-step build.
 *
 * `ManualBuildMixin(ToolMixin(DetailedMixin(Thing)))` — the tool role
 * (its `shaker` / `mixing-glass` capability still satisfies recipe
 * `toolCapabilities`, exactly as the old `ToolItem` seed did) plus the
 * manual-build buffer that `pour` / `add` bank graded contributions into
 * and `strain` mints from. Backs both the shaker (shaken drinks) and the
 * mixing glass (stirred); capabilities + condition stay authored in each
 * seed's `data:`.
 *
 * The buffer is runtime-only (see {@link ManualBuildMixin}), so this adds
 * no persistent fields over `ToolItem`.
 */

import Thing from "../../lib/stuff/Thing";
import { DetailedMixin } from "../../lib/description/Detailed";
import { ToolMixin } from "../../lib/craft/Tooled";
import { ManualBuildMixin } from "../../lib/craft/ManualBuild";
import type { CommandContributions } from "../../api/command";

const CocktailShakerBase = ManualBuildMixin(ToolMixin(DetailedMixin(Thing)));

export default class CocktailShaker extends CocktailShakerBase {
  /**
   * The bar's working surface rides the vessel, not the menu: wherever a
   * shaker (or mixing glass) is reachable, the build verbs light up —
   * the step path (`pour`/`stir`/`strain`/`garnish`) and the atomic
   * maker verbs (`serve`/`mix`).
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: [
      "crafting/pour.yaml",
      "crafting/stir.yaml",
      "crafting/strain.yaml",
      "crafting/garnish.yaml",
      "crafting/serve.yaml",
      "crafting/mix.yaml",
    ],
    inventory: [
      "crafting/pour.yaml",
      "crafting/stir.yaml",
      "crafting/strain.yaml",
      "crafting/garnish.yaml",
      "crafting/serve.yaml",
      "crafting/mix.yaml",
    ],
    peers: [],
  };
}
