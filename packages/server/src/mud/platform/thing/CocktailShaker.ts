/**
 * CocktailShaker — a bar mixing vessel that buffers a step-by-step build.
 *
 * `ManualBuildMixin(ToolMixin(Good))` — the tool role
 * (its `shaker` / `mixing-glass` capability still satisfies recipe
 * `toolCapabilities`, exactly as the old `Tool` seed did) plus the
 * manual-build buffer that `pour` / `add` bank graded contributions into
 * and `strain` mints from. Backs both the shaker (shaken drinks) and the
 * mixing glass (stirred) — the hospitality trade's station templates;
 * capabilities + condition stay authored in each row's `data:`.
 *
 * The buffer is runtime-only (see {@link ManualBuildMixin}), so this adds
 * no persistent fields over `Tool`.
 */

import Good from "../../lib/stuff/Good";
import { ToolMixin } from "../../lib/craft/Tooled";
import { ManualBuildMixin } from "../../lib/craft/ManualBuild";

const CocktailShakerBase = ManualBuildMixin(ToolMixin(Good));

// The bar's working verbs ride the seeds' `shaker`/`mixing-glass`
// capability entries through the capability table — no statics; the
// class carries only the build-vessel behavior.
export default class CocktailShaker extends CocktailShakerBase {}
