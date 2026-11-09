/**
 * ⭐ `lint:greedy-object` — **an object's name is quoted, never swallowed.**
 *
 * A `greedy: true` positional takes every token up to the next declared
 * preposition (or the end of the line). On a `type: string` prose arg that
 * is the point — `say hello there`, a forum body, a `def`. On a
 * `type: object | objects` arg it is resolution hiding in the grammar: the
 * binder guesses where a NAME ends, `the` binds as a name, and a second
 * object can never follow without a preposition to stop at
 * (controller-liquidity D3). Quoting already works (`buy "dog loaf"`), so
 * the greedy object slot is retired view by view.
 *
 * **What it counts** (every command view, `pack-roots.commandViews()`):
 * each arg — at the view's top level and in every subcommand stanza,
 * nested or not — with `greedy: true` and `type: object` or `objects`.
 * Prose (`type: string`) greedy args are not counted; they stay.
 *
 * ⭐ Census, then ratchet: opened at 133 (controller-liquidity W0,
 * 2026-11-09, on the merge with master — 107 object + 26 objects across
 * 93 views). It may fall, never rise; W5 drives it to zero and the schema
 * then refuses the key outright.
 */

import { resolve } from "path";
import { pathToFileURL } from "url";
import { commandViews, ratchet } from "./pack-roots";

export const GREEDY_OBJECT_CEILING = 133;

/** The greedy object args of one parsed view, as `<arg>` / `<sub> <arg>` labels. */
export function greedyObjectArgs(doc: Record<string, unknown>): string[] {
  const out: string[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (Array.isArray(n.args)) {
      for (const a of n.args as Array<Record<string, unknown> | null>) {
        if (a && a.greedy === true && (a.type === "object" || a.type === "objects")) {
          out.push(`${prefix}${String(a.name ?? "?")}`);
        }
      }
    }
    const subs = n.subcommands;
    const each: Array<[string, unknown]> = Array.isArray(subs)
      ? subs.map((s) => [String((s as Record<string, unknown>)?.name ?? "?"), s])
      : subs && typeof subs === "object"
        ? Object.entries(subs as Record<string, unknown>)
        : [];
    for (const [name, s] of each) walk(s, `${prefix}${name} `);
  };
  walk(doc, "");
  return out;
}

export function census(): string[] {
  const out: string[] = [];
  for (const v of commandViews()) {
    for (const arg of greedyObjectArgs(v.doc)) out.push(`${v.pack}/${v.rel}  ${arg}`);
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-greedy-object",
    "greedy object args",
    findings.length,
    GREEDY_OBJECT_CEILING,
    findings,
    "⭐ An object slot binds ONE token; a name with a space in it is quoted\n" +
      '  (`buy "dog loaf"`). Drop `greedy: true` from the object arg — greedy\n' +
      "  is for prose (`type: string`) only.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
