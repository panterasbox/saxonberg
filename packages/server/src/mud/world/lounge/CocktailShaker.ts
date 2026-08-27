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

const CocktailShakerBase = ManualBuildMixin(ToolMixin(DetailedMixin(Thing)));

// The bar's working verbs ride the seeds' `shaker`/`mixing-glass`
// capability entries through the capability table — no statics; the
// class carries only the build-vessel behavior.
export default class CocktailShaker extends CocktailShakerBase {}
