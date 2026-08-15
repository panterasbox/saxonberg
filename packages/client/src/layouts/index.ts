/**
 * The layouts barrel.
 *
 * ⚠⚠ **`LAYOUT_REGISTRY` is gone.** The client swapped its whole frame
 * off the single server-authoritative `cockpit.layout` key, which the S3
 * cockpit build shipped as *"a compatibility projection, and it is meant
 * to die"* — a flattening of two real axes (`cockpit.mode` and the
 * arrangement within it) into five peer names. `livestream-viewer` and
 * `streamer` were the tell: never two activities, always two
 * arrangements of one, which no single-axis registry can say.
 *
 * The frame now resolves through {@link resolveMode} in `./modes`.
 * `cockpit.layout` survives on the wire and is read in exactly one
 * place — as the migration cue for a player who has no `cockpit.mode`
 * yet, which is what the server's own `getCockpitMode()` does with it.
 *
 * `noLayoutKey.test.ts` keeps it from coming back.
 */

export { MODE_REGISTRY, resolveMode } from "./modes";
export type { ArrangementDef, ResolvedMode } from "./modes";
export type { LayoutProps, LayoutDef } from "./types";
