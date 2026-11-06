/**
 * ⭐ `lint:subcommand-words` — **a subcommand word and a flat verb of the
 * same word are two acts, or one.**
 *
 * D9 scopes a subcommand word by its noun (`wiki read`, `fight close`), so
 * a subcommand sharing a word with a flat verb is not a collision. It is
 * still a teaching cost — `fight draw` and `draw` do different things —
 * and this gate counts it so the population is visible and cannot grow
 * unnoticed. Two lines:
 *
 *   1. **Different-act pairs (informational ratchet).** A subcommand word
 *      W of view V that is also a flat verb (any view's `verbs:` entry)
 *      whose controller is DIFFERENT from the subcommand's (its own
 *      `controller:`, else V's), both resolved to absolute paths — the
 *      controller identity is what excludes a same-act route (`fight
 *      defend` → `DefendController`, the one the census found). Ceiling =
 *      this gate's census; may fall, never rise.
 *   2. **⛔ A subcommand word equal to a script builtin (HARD).** `set`,
 *      `if`, `each`, … (`lib/script/builtins.ts` `SCRIPT_BUILTINS`). Today:
 *      the five `set` subcommands (`reserve`/`equip`/`alias`/`settings`/
 *      `var set`). ⚠ A noun-scoped `set` is reachable (the line starts with
 *      the noun), so this is not `lint:verb-collisions`' shadowing — it is
 *      the one place a builtin's word means something else; ceiling = the
 *      census, never rising.
 */

import { resolve } from "path";
import { pathToFileURL } from "url";
import { CONTENT, commandViews, controllerPathOf, ratchet } from "./pack-roots";
import { SCRIPT_BUILTINS } from "../src/mud/lib/script/builtins";

export const DIFFERENT_ACT_PAIRS_CEILING = 44; // W8: −2, the flat `transfer` is gone (`bank transfer`, `party transfer`). // W7: `fight defend` routes to DefendController.
export const BUILTIN_SUBCOMMANDS_CEILING = 6;

export interface SubcommandReport {
  differentAct: string[];
  builtin: string[];
}

export function census(contentDir: string = CONTENT): SubcommandReport {
  const views = commandViews(contentDir);
  const flat = new Map<string, Set<string>>();
  for (const v of views) {
    const ctrl = controllerPathOf(v.rel, v.doc.controller) ?? `<no controller: ${v.pack}/${v.rel}>`;
    for (const w of Array.isArray(v.doc.verbs) ? v.doc.verbs : []) {
      if (typeof w !== "string") continue;
      const word = w.trim().toLowerCase();
      flat.set(word, (flat.get(word) ?? new Set()).add(ctrl));
    }
  }
  const report: SubcommandReport = { differentAct: [], builtin: [] };
  for (const v of views) {
    const subs = v.doc.subcommands;
    if (!subs || typeof subs !== "object") continue;
    const noun = Array.isArray(v.doc.verbs) ? String(v.doc.verbs[0]) : "?";
    const parent = controllerPathOf(v.rel, v.doc.controller);
    for (const [word, spec] of Object.entries(subs as Record<string, unknown>)) {
      const w = word.trim().toLowerCase();
      const own = controllerPathOf(v.rel, (spec as { controller?: unknown } | null)?.controller);
      const ctrl = own ?? parent;
      for (const other of flat.get(w) ?? []) {
        if (other !== ctrl) report.differentAct.push(`${noun} ${w}  (${ctrl ?? "?"}) vs flat ${w} (${other})`);
      }
      if ((SCRIPT_BUILTINS as readonly string[]).includes(w)) {
        report.builtin.push(`${v.pack}/${v.rel}  ${noun} ${w}`);
      }
    }
  }
  return report;
}

function main(): void {
  const r = census();
  const ok1 = ratchet(
    "check-subcommand-words",
    "subcommand words that are also a flat verb with a different controller",
    r.differentAct.length,
    DIFFERENT_ACT_PAIRS_CEILING,
    r.differentAct,
    "⭐ D9 scopes a subcommand word by its noun, so this is not a collision —\n" +
      "  but a new pair teaches one word two acts. Pick a different word, or\n" +
      "  route the subcommand to the flat verb's controller if it IS the same act.",
  );
  const ok2 = ratchet(
    "check-subcommand-words",
    "subcommand words equal to a script builtin",
    r.builtin.length,
    BUILTIN_SUBCOMMANDS_CEILING,
    r.builtin,
    "⛔ A script builtin's word (`set`, `if`, `each`, …) means the interpreter's\n" +
      "  act everywhere else; a new subcommand may not take it.",
  );
  if (!ok1 || !ok2) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
