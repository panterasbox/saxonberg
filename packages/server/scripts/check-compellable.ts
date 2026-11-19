/**
 * ⭐ `lint:compellable` — **what one body's code may ask another body to do
 * is held where code is reviewed.**
 *
 * A command another body's code asks a body to run is refused unless BOTH
 * keys say it may be asked with consent (call-security pass D8–D12): the
 * view's `compellable: consent` (content any titleholder can save) and the
 * controller class's `static compellable = true` (code, reviewed). Then the
 * body's own player is asked, every time. This gate holds the second key:
 *
 *   (a) every `consent` view (verb or subcommand) names a controller whose
 *       class declares `static compellable = true` — else the view's opt-in
 *       is inert and silently says something it does not do;
 *   (b) every class that declares it is named by some `consent` view — else
 *       the declaration is a key nobody turns;
 *   (c) ⛔ the NEVER-LIST: no declaring controller lives under a category
 *       whose verbs are speech, conferral, membership, money given away, or
 *       a verb that runs or defines other commands —
 *       {@link NEVER_CATEGORIES};
 *   (d) a ratchet on the number of declaring classes ({@link
 *       COMPELLABLE_CEILING}). A rise is a reviewer's question: is the new
 *       verb a purchase at a posted price, or one of the five kinds?
 *
 * ⚠ Limit, by construction: (c) reads where a controller LIVES. A pack verb
 * that speaks, or gives title or money away, from a new category is caught
 * by review at the ratchet (d), not by (c). Giving title away is
 * `title transfer`, a `civics` controller held by (d) — `title buy` is the
 * one class today, the owner's ruling: a purchase at a counter may ask.
 */

import { readFileSync } from "fs";
import { basename, resolve } from "path";
import { pathToFileURL } from "url";
import { commandViews, controllerFiles, controllerPathOf, ratchet, stripComments } from "./pack-roots";

/** The declaring classes, named: `TitleBuyController` (`title buy`). */
export const COMPELLABLE_CEILING = 1;

/** Categories whose verbs are never compellable (D12 (c)). */
export const NEVER_CATEGORIES: ReadonlySet<string> = new Set([
  "social", "governance", "banking", "employment", "work",
  "system", "author", "shell", "stream", "charactergen",
]);

const DECLARES = /\bstatic\s+(?:override\s+)?compellable\s*=\s*true\b/;

export interface CompellableCensus {
  declaring: Array<{ name: string; rel: string; category: string | null }>;
  problems: string[];
}

export function census(): CompellableCensus {
  const declaring: CompellableCensus["declaring"] = [];
  for (const c of controllerFiles()) {
    if (!DECLARES.test(stripComments(readFileSync(c.file, "utf8")))) continue;
    const cat = /\/idea\/cmd\/([^/]+)\//.exec(c.file)?.[1] ?? null;
    declaring.push({ name: basename(c.file, ".ts"), rel: c.rel, category: cat });
  }
  const problems: string[] = [];
  const named = new Set<string>();
  for (const v of commandViews()) {
    const verbMode = v.doc.compellable;
    const subs = (v.doc.subcommands ?? {}) as Record<string, Record<string, unknown>>;
    const check = (where: string, mode: unknown, controller: unknown): void => {
      if (mode !== undefined && mode !== "never" && mode !== "consent") {
        problems.push(`${v.pack}:${v.rel} ${where}: compellable must be never or consent, not ${String(mode)}`);
        return;
      }
      if (mode !== "consent") return;
      const path = controllerPathOf(v.rel, controller);
      const cls = path ? path.slice(path.lastIndexOf("/") + 1) : null;
      if (!cls) {
        problems.push(`${v.pack}:${v.rel} ${where}: compellable: consent with no controller`);
        return;
      }
      named.add(cls);
      if (!declaring.some((d) => d.name === cls)) {
        problems.push(`${v.pack}:${v.rel} ${where}: compellable: consent, but ${cls} does not declare static compellable = true`);
      }
    };
    if (Object.keys(subs).length === 0) check("verb", verbMode, v.doc.controller);
    for (const [name, sub] of Object.entries(subs)) {
      check(`subcommand ${name}`, sub.compellable ?? verbMode, sub.controller ?? v.doc.controller);
    }
  }
  for (const d of declaring) {
    if (!named.has(d.name)) problems.push(`${d.rel}: declares static compellable = true, but no consent view names it`);
    if (d.category && NEVER_CATEGORIES.has(d.category)) {
      problems.push(`${d.rel}: a ${d.category} verb is never compellable (speech, conferral, membership, money given, or a verb that runs others)`);
    }
  }
  return { declaring, problems };
}

function main(): void {
  const { declaring, problems } = census();
  for (const p of problems) console.error(`check-compellable: ✗ ${p}`);
  const ok = ratchet(
    "check-compellable",
    "controllers another body's code may ask a body to run",
    declaring.length,
    COMPELLABLE_CEILING,
    declaring.map((d) => `${d.rel} (${d.category ?? "?"})`),
    "⭐ A rise is a reviewer's question, never a default: is the new verb a\n" +
      "  purchase at a posted price? Speech, conferral, membership, and giving\n" +
      "  title or money away are never compellable, whatever a view says.",
  );
  if (problems.length > 0 || !ok) process.exit(1);
  console.log(`check-compellable: ${declaring.length} compellable controller(s): ${declaring.map((d) => d.name).join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
