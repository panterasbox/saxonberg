/**
 * ⭐⭐ `lint:verb-collisions` — **two command views may not claim the same
 * verb.**
 *
 * ## The failure this exists for, which shipped
 *
 * The consequence build added `platform/cmd/work/watch.yaml` for standing
 * a guard's post. `platform/cmd/stream/watch.yaml` had claimed `watch`
 * since the streaming build — *put a livestream in the cockpit embed* —
 * and the new view **shadowed it outright**. Because the guard verb was
 * afforded by the born-with credential wallet, it did so for every
 * character alive:
 *
 * ```
 * help watch              → "WATCH: Stand a guard's post"
 * watch twitch.tv/shroud  → declined: no-watch-claim
 * watch off               → "You are not on watch."
 * ```
 *
 * ⚠⚠ **Nothing failed.** Not a test, not a lint, not the boot. A shipped
 * feature simply became unreachable by its own name, and the only way it
 * surfaced was somebody asking what the new verb was for.
 *
 * ⭐ The census-then-ratchet shape (`docs/lint-family.md`). The census
 * found **nine collisions already shipped**, so the gate is an
 * ALLOWLIST rather than a zero: each pre-existing pair is named with a
 * reason, and anything not on the list fails. The list is a to-do, not
 * an amnesty — ⚠ and it has NOT been diagnosed. The census measured
 * which verbs are claimed twice; which of those actually shadow (and in
 * which direction) was a question each row owed an answer to.
 *
 * ⚠ Aliases count. `verbs: [job, jobs]` claims both, and a second view
 * claiming `jobs` would shadow just as silently as one claiming `job`.
 *
 * ⭐⭐ **Disjoint shapes pass (controllers-are-io D17).** Two views of one
 * word whose shapes no command line can bind both (`disjointShapes`) are
 * not a collision: the dispatcher's per-view bind proves which one a line
 * means. A non-disjoint pair fails. (`KNOWN_COLLISIONS` shrank to nothing
 * when `pour` became one act, and went with its last row.)
 */

import { readFileSync } from "fs";
import YAML from "yaml";
import { CONTENT, commandViewFiles, controllerPathOf } from "./pack-roots";
import { SCRIPT_BUILTINS } from "../src/mud/lib/script/builtins";

interface Claim {
  verb: string;
  file: string;
  /** The view's top-level positional args — its SHAPE, for D17's disjointness. */
  args?: PositionalShape[];
  /** A view with subcommands has one shape per subcommand. */
  hasSubcommands?: boolean;
  /** `fallthrough: true` — the subcommand view also binds its own args. */
  fallthrough?: boolean;
  /** The view's controller, resolved absolute — `null` when it names none. */
  controller?: string | null;
}

/** The parts of a positional arg D17's disjointness reads. */
export interface PositionalShape {
  required?: boolean;
  greedy?: boolean;
  multiple?: boolean;
  prepositions?: string[];
  prepositionRequired?: boolean;
  /** A closed word list — a typed word outside it does not bind. */
  values?: string[];
}

/**
 * The words a line binding this view can START with, or `null` when any
 * word may: a required first positional with `values:` starts with one of
 * them; a view whose every positional is `prepositionRequired` starts with
 * one of their prepositions (or is empty, when none is required); a view
 * with no positionals binds only the empty line (a leftover word is a
 * shape error). `empty` — whether the empty line binds it.
 */
function firstWords(c: Claim): { words: Set<string>; empty: boolean } | null {
  // A subcommand view's lines start with its words — not read here.
  if (c.hasSubcommands) return null;
  const args = c.args ?? [];
  const lower = (xs: string[] | undefined): string[] => (xs ?? []).map((w) => w.toLowerCase());
  if (args.length === 0) return { words: new Set(), empty: true };
  const first = args[0]!;
  if (isRequired(first) && first.prepositionRequired !== true && Array.isArray(first.values) && first.values.length > 0) {
    return { words: new Set(lower(first.values)), empty: false };
  }
  if (args.every((a) => a.prepositionRequired === true)) {
    return { words: new Set(args.flatMap((a) => lower(a.prepositions))), empty: !args.some(isRequired) };
  }
  return null;
}

/** Whether a positional binds REQUIRED — `CommandDefinition`'s own rule. */
function isRequired(a: PositionalShape): boolean {
  return a.required === true || (a.greedy === true && a.required !== false);
}

/**
 * ⭐⭐ D17 — two views of one word are **disjoint** when no command line can
 * bind both: their required positional counts differ, or at some positional
 * index both declare `prepositionRequired: true` with non-intersecting
 * `prepositions:` (the slot binds only when its own preposition is present,
 * so the two shapes demand different words at the same place).
 *
 * ⚠ The count arm compares the RANGE of positionals each view can bind
 * (`[required, total]`, unbounded when an arg is greedy or multiple), not
 * the bare required count — the literal reading passed `pour`'s two views
 * (one required + an optional `into`, against two required), which
 * `pour gin into glass` binds both of.
 *
 * `throw X` · `throw X to Y` · `throw X at Y` is the case it was written
 * for: one word, three views, provably three shapes — so no shadowing to
 * adjudicate.
 *
 * ⭐ A view of subcommands with NO fallthrough beside a shape view
 * (controller-liquidity W7a): the dispatcher tries the subcommand view
 * first wherever its host listed it, and hands on any word it does not
 * know, so its words are its own by precedence. The two are disjoint when
 * the shape view cannot bind the EMPTY line too (it requires a positional)
 * — otherwise bare `<verb>` would be claimed by both. Any other view with
 * subcommands (a fallthrough, or two subcommand views) is never proved
 * disjoint.
 */
export function disjointShapes(a: Claim, b: Claim): boolean {
  // ⭐ Two shapes of ONE act (controller-liquidity W7, build): both views
  // name the same controller, so whichever binds a line, the act is the
  // same and neither is unreachable by its own name — the harm this gate
  // exists for (`draught <setting> [at <fire>]` · `draught <fire> <setting>`).
  if (a.controller && a.controller === b.controller) return true;
  // ⭐ A view with no positionals binds only the empty line; a fallthrough
  // view whose own args require a word cannot (its subcommand lines are
  // words too) — bare `press` reads, `press <headline>` posts.
  const onlyEmpty = (c: Claim): boolean => c.hasSubcommands !== true && (c.args ?? []).length === 0;
  const neverEmpty = (c: Claim): boolean =>
    c.hasSubcommands === true && c.fallthrough === true && (c.args ?? []).some(isRequired);
  if ((onlyEmpty(a) && neverEmpty(b)) || (onlyEmpty(b) && neverEmpty(a))) return true;
  // ⭐ The first word (controller-liquidity W7, build): when both views'
  // lines must start from closed word sets that do not meet, and the empty
  // line cannot bind both, no line binds both (`draught at <fire>` reads,
  // `draught <setting>` sets).
  const fa = firstWords(a);
  const fb = firstWords(b);
  if (fa && fb && !(fa.empty && fb.empty) && ![...fa.words].some((w) => fb.words.has(w))) return true;
  const subsOnly = (c: Claim): boolean => c.hasSubcommands === true && c.fallthrough !== true;
  if (a.hasSubcommands !== true && subsOnly(b)) return disjointShapes(b, a);
  if (subsOnly(a) && b.hasSubcommands !== true) {
    return (b.args ?? []).filter(isRequired).length > 0;
  }
  if (a.hasSubcommands || b.hasSubcommands) return false;
  const aa = a.args ?? [];
  const bb = b.args ?? [];
  // ⚠ "Required counts differ" read as the RANGE each view can bind, not
  // the bare required count: an optional slot makes `pour gin into glass`
  // bind a one-required view and a two-required view alike, so differing
  // required counts prove nothing when the ranges overlap.
  const range = (xs: PositionalShape[]): [number, number] => [
    xs.filter(isRequired).length,
    xs.some((x) => x.greedy === true || x.multiple === true)
      ? Infinity
      : xs.length,
  ];
  const [aMin, aMax] = range(aa);
  const [bMin, bMax] = range(bb);
  if (aMax < bMin || bMax < aMin) return true;
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
    const x = aa[i]!;
    const y = bb[i]!;
    if (x.prepositionRequired !== true || y.prepositionRequired !== true) continue;
    const xs = new Set((x.prepositions ?? []).map((p) => p.toLowerCase()));
    if (!(y.prepositions ?? []).some((p) => xs.has(p.toLowerCase()))) return true;
  }
  return false;
}

export function claimsIn(files: string[]): Claim[] {
  const out: Claim[] = [];
  for (const file of files) {
    type ViewDoc = { verbs?: unknown; args?: unknown; subcommands?: unknown; fallthrough?: unknown };
    let doc: ViewDoc | null = null;
    try {
      doc = YAML.parse(readFileSync(file, "utf-8")) as ViewDoc | null;
    } catch {
      continue;
    }
    const verbs = doc?.verbs;
    if (!Array.isArray(verbs)) continue;
    const args = Array.isArray(doc?.args) ? (doc!.args as PositionalShape[]) : [];
    const hasSubcommands = !!doc?.subcommands && typeof doc.subcommands === "object";
    const fallthrough = doc?.fallthrough === true;
    const rel = file.split("/content/").slice(2).join("/content/") || file;
    const controller = controllerPathOf(rel, (doc as { controller?: unknown } | null)?.controller);
    for (const v of verbs) {
      if (typeof v === "string" && v.trim()) {
        out.push({ verb: v.trim().toLowerCase(), file, args, hasSubcommands, fallthrough, controller });
      }
    }
  }
  return out;
}

/**
 * ⭐ The scripting interpreter's builtins are claims too — on EVERY line.
 * `set x y` binds a shell variable and the interpreter takes any line
 * that starts with `set` before command dispatch ever sees a verb, so a
 * view claiming one of these is unreachable by its own name and nothing
 * fails. The fishing build shipped `set <trap>`, typed it, and got
 * silence — this is the gate that would have said so.
 */
const BUILTIN_CLAIMS: Claim[] = SCRIPT_BUILTINS.map((verb) => ({
  verb,
  file: `<lib/script/builtins.ts: the '${verb}' builtin>`,
}));

/**
 * Verbs claimed by more than one view, with the files that claim them —
 * ⭐ minus the words whose views are pairwise DISJOINT (D17): a builtin
 * claim is never disjoint (it takes the line before dispatch).
 */
export function collisionsIn(claims: Claim[]): Map<string, string[]> {
  const byVerb = new Map<string, Claim[]>();
  for (const c of [...BUILTIN_CLAIMS, ...claims]) {
    const list = byVerb.get(c.verb) ?? [];
    if (!list.some((x) => x.file === c.file)) list.push(c);
    byVerb.set(c.verb, list);
  }
  const bad = new Map<string, string[]>();
  for (const [verb, list] of byVerb) {
    if (list.length < 2) continue;
    const builtin = list.some((c) => BUILTIN_CLAIMS.includes(c));
    const disjoint =
      !builtin && list.every((a, i) => list.every((b, j) => j <= i || disjointShapes(a, b)));
    if (!disjoint) bad.set(verb, list.map((c) => c.file));
  }
  return bad;
}

/**
 * Every command view across every shipped pack — ⚠ **every** pack, not
 * just the capability ones. A content-only pack (a locality) ships
 * domain-local verbs and can collide exactly as hard. (The walk is
 * `pack-roots.commandViewFiles`, shared with the view gates.)
 */
export function allViews(contentDir: string = CONTENT): string[] {
  return commandViewFiles(contentDir);
}

function main(): void {
  const files = allViews();
  const collisions = collisionsIn(claimsIn(files));
  if (collisions.size === 0) {
    console.info(`check-verb-collisions: ok — ${files.length} command view(s), no collision.`);
    return;
  }
  for (const [verb, claimed] of collisions) {
    console.error(`  ⚠ NEW: '${verb}' is claimed by ${claimed.length} views:`);
    for (const f of claimed) console.error(`      ${f.replace(CONTENT, "…")}`);
  }
  console.error(
    "\n⚠⚠ Two views claiming one verb do not merge — one SHADOWS the\n" +
      "  other, silently, and the loser becomes unreachable by its own\n" +
      "  name. The consequence build did this to the livestream `watch`\n" +
      "  for every character alive, and nothing failed.\n\n" +
      "  The fix is one view with subcommands, a different verb, or shapes\n" +
      "  no line can bind both (`prepositionRequired`, D17). There is no\n" +
      "  list to add a line to: `pour` was the last, and it is one act now.",
  );
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-verb-collisions.ts")) {
  main();
}
