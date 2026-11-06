/**
 * ⭐⭐ `lint:one-word` — **one view, one word** (controllers-are-io D16).
 *
 * A view answering to two words is two vocabularies for one act: the
 * player learns a synonym `help` never teaches, a script works with one
 * word and an alias table with the other, and every collision check has
 * twice the surface. The rule: `verbs:` is a one-element list; a
 * controller is named by the views of ONE verb; the only extra words a
 * player meets are **default player aliases** (`defaultAliases:` on the
 * view, D16), each removable by `alias unset`.
 *
 * Three counts, each a ceiling = this gate's own W0 census, driven to 0
 * at W6:
 *
 *   (a) **multi-word views** — a view whose `verbs:` has more than one
 *       entry (the extra words are listed);
 *   (b) **controllers across verbs** — a controller (view-level
 *       `controller:`, resolved to its absolute path) named by views whose
 *       primary verbs differ;
 *   (c) **bad default aliases** — a `defaultAliases: [{name, description?}]`
 *       name declared twice, or equal to any view's verb or a script
 *       builtin (`lib/script/builtins.ts`). No view declares the key yet
 *       (W1 adds it to the schema), so this is 0 and stays 0.
 */

import { resolve } from "path";
import { pathToFileURL } from "url";
import { CONTENT, commandViews, controllerPathOf, ratchet } from "./pack-roots";
import { SCRIPT_BUILTINS } from "../src/mud/lib/script/builtins";

export const MULTI_WORD_VIEWS_CEILING = 62; // W7: `appoint`/`hire`, `fulfill`/`handoff`, `reclaim`/`unconsign` deleted with the flat views.
export const CONTROLLERS_ACROSS_VERBS_CEILING = 4;
export const BAD_DEFAULT_ALIASES_CEILING = 0;

export interface OneWordReport {
  multiWord: string[];
  /** Extra words on multi-word views (informational). */
  extraWords: number;
  acrossVerbs: string[];
  badAliases: string[];
}

function verbsOf(doc: Record<string, unknown>): string[] {
  return Array.isArray(doc.verbs)
    ? doc.verbs.filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase())
    : [];
}

export function census(contentDir: string = CONTENT): OneWordReport {
  const views = commandViews(contentDir);
  const report: OneWordReport = { multiWord: [], extraWords: 0, acrossVerbs: [], badAliases: [] };

  const byController = new Map<string, Map<string, string>>();
  const allVerbs = new Set<string>();
  for (const v of views) {
    const verbs = verbsOf(v.doc);
    for (const w of verbs) allVerbs.add(w);
    if (verbs.length > 1) {
      report.multiWord.push(`${v.pack}/${v.rel}  [${verbs.join(", ")}]`);
      report.extraWords += verbs.length - 1;
    }
    const ctrl = controllerPathOf(v.rel, v.doc.controller);
    if (ctrl && verbs[0]) {
      const m = byController.get(ctrl) ?? new Map<string, string>();
      m.set(verbs[0], `${v.pack}/${v.rel}`);
      byController.set(ctrl, m);
    }
  }
  for (const [ctrl, m] of byController) {
    if (m.size > 1) report.acrossVerbs.push(`${ctrl}  named by ${[...m.keys()].sort().join(", ")}`);
  }

  const seen = new Map<string, string>();
  for (const v of views) {
    const raw = v.doc.defaultAliases;
    if (!Array.isArray(raw)) continue;
    for (const entry of raw) {
      const name =
        entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string"
          ? (entry as { name: string }).name.trim().toLowerCase()
          : null;
      const where = `${v.pack}/${v.rel}`;
      if (!name) {
        report.badAliases.push(`${where}  a defaultAliases entry with no name`);
        continue;
      }
      const prior = seen.get(name);
      if (prior) report.badAliases.push(`${where}  '${name}' is also declared by ${prior}`);
      else seen.set(name, where);
      if (allVerbs.has(name)) report.badAliases.push(`${where}  '${name}' is a verb`);
      if ((SCRIPT_BUILTINS as readonly string[]).includes(name)) {
        report.badAliases.push(`${where}  '${name}' is a script builtin`);
      }
    }
  }
  return report;
}

function main(): void {
  const r = census();
  const ok = [
    ratchet(
      "check-one-word",
      `views answering to more than one word (${r.extraWords} extra words)`,
      r.multiWord.length,
      MULTI_WORD_VIEWS_CEILING,
      r.multiWord,
      "⭐ One view, one word: delete the synonym, or mint it as a default\n" +
        "  player alias (`defaultAliases: [{name: l}]` on the view) when it is a\n" +
        "  one- or two-character MUD-standard shortcut.",
    ),
    ratchet(
      "check-one-word",
      "controllers named by views of different verbs",
      r.acrossVerbs.length,
      CONTROLLERS_ACROSS_VERBS_CEILING,
      r.acrossVerbs,
      "⭐ A controller is one verb's: split it, one controller per verb.",
    ),
    ratchet(
      "check-one-word",
      "default aliases declared twice or equal to a verb or builtin",
      r.badAliases.length,
      BAD_DEFAULT_ALIASES_CEILING,
      r.badAliases,
      "⚠ A default alias is reached dynamically (the views a giver can reach),\n" +
        "  so a duplicate or a verb-shadowing name must fail here, statically.",
    ),
  ].every(Boolean);
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
