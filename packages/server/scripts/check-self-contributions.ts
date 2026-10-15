/**
 * check-self-contributions — ⭐⭐ **a `self` verb on something that is never
 * asked for its `self` verbs is a verb nobody can say.**
 *
 * `static commandContributions` has four buckets and each has a direction
 * (command-routing.md § the buckets): `environment` flows OUT from a held
 * thing to its holders, `inventory` IN from a container to its occupants,
 * `peers` sideways to room siblings — and `self` is **the receiver's own
 * verbs**. The command layer reads `self` off exactly three kinds of host:
 *
 *   1. a **command giver** (`CommandGiverMixin`) — a person's own verbs;
 *   2. a **shadow** (`lib/stuff/Shadow`) — lent to the host it rides;
 *   3. a **hosted update** (`AetherHostedMixin`) — an aether app's verbs,
 *      granted to the implant's host.
 *
 * On anything else `self` is **dead**: declared, type-checked, asserted
 * by a unit test that reads the declaration — and never read by the
 * dispatcher, so the player is told *"I don't understand"*.
 *
 * ⚠⚠ Why a gate (2026-10-15): it cost the assembly build four verbs in one
 * day, every one of them green in its tests, found only by a browser walk
 * — `AssembledMixin` (a pick in your hands could not be repaired), `Blank`
 * (carve), `Bole` (rive and the cross-cut worked only because a billet
 * heap lay in the room), `Billet`. The wire drive always had the thing on
 * the floor or an anvil near, which is `peers`. A declaration-level test
 * cannot see it; this reads who RECEIVES.
 *
 * The rules:
 *
 * - a **class** whose own `self` list is non-empty is live iff it, or a
 *   class extending it, is a receiver (1–3);
 * - a **mixin** whose `self` list is non-empty is live iff some receiver
 *   class composes it — directly, or through another mixin that composes
 *   it (a factory's own `extends` chain is followed).
 *
 * ⭐ Census-then-ratchet: the dead population is gated at {@link CEILING};
 * it may fall, never rise. The fix for each is the bucket that matches who
 * should hear the verb — the holder (`environment`), the bystander
 * (`peers`), the occupant (`inventory`).
 */

import { existsSync, readFileSync } from "fs";
import {
  MUD,
  CONTENT,
  packSources,
  packSrcFiles,
  classPathOfFile,
  composesMixin,
  extendsAny,
  type PackSource,
} from "./pack-roots";
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Dead `self` declarations at the census (2026-10-15) — the ceiling. It
 * may fall, never rise; ⚠ a rise wants the fix, not a bump. The nine:
 *
 * - **seven redundant** — the same verbs also ride a live bucket on the
 *   same class, so nothing is lost, and the `self` copy only misleads:
 *   `ImprovableMixin`, `SwardMixin`, `Field`, `StandMixin`, mining
 *   `WorkingMixin`, quarrying `OpenWorkingMixin` (all `inventory` — a
 *   location's occupants), `Block` (`peers`). Delete the `self` line.
 * - **two that are the verb's ONLY route** — the kernel `Spade` (`dig`)
 *   and farming's `Spade` (`dig`, `plot`): a spade in your hands affords
 *   nothing, so `plot` is sayable nowhere and `dig` only where a quarry
 *   face affords it. These want `environment` (the holder).
 */
export const CEILING = 9;

/** One non-empty `self` list, and whose it is. */
export interface SelfDeclaration {
  file: string;
  /** The class or mixin-factory class name the static sits on. */
  owner: string;
  /** True when the static is on a mixin factory's returned class. */
  mixin: boolean;
  /** The view keys (or spread expressions) the list names. */
  verbs: string[];
}

/** The bracket-matched text from `open` (an index of `[` or `{`). */
function matched(source: string, open: number): string {
  const pairs: Record<string, string> = { "[": "]", "{": "}", "(": ")" };
  const stack: string[] = [];
  for (let i = open; i < source.length; i++) {
    const c = source[i]!;
    if (c === "'" || c === '"' || c === "`") {
      const q = c;
      i++;
      while (i < source.length && source[i] !== q) {
        if (source[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      i = source.indexOf("*/", i + 2);
      if (i < 0) return source.slice(open);
      i++;
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]!);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

/** Strip `//` and block comments, for asking whether a list is empty. */
function uncommented(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Every non-empty `self` list in one source file. Pure over the text, so
 * the test hands it fixtures.
 */
export function selfDeclarationsIn(file: string, raw: string): SelfDeclaration[] {
  // ⚠ Comments masked to spaces (offsets kept): a doc comment that SHOWS
  // `static commandContributions = { self, … }` is not a declaration, and
  // the word "class" in prose is not the owner.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (c) => " ".repeat(c.length));
  const out: SelfDeclaration[] = [];
  const re = /static\s+commandContributions\s*(?::[^=]+)?=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const brace = source.indexOf("{", m.index + m[0].length - 1);
    if (brace < 0) continue;
    const body = matched(source, brace);
    const selfAt = /\bself\s*:\s*\[/.exec(body);
    if (!selfAt) continue;
    const list = matched(body, selfAt.index + selfAt[0].length - 1);
    const inner = uncommented(list.slice(1, -1)).trim();
    if (inner.length === 0) continue;
    const verbs = [
      ...[...inner.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]!),
      ...[...inner.matchAll(/\.\.\.\s*([^,\]]+)/g)].map((x) => `...${x[1]!.trim()}`),
    ];
    // The class the static sits on: the nearest `class X` before it.
    const before = source.slice(0, m.index);
    const classes = [...before.matchAll(/(return\s+)?class\s+(\w+)/g)];
    const last = classes[classes.length - 1];
    const owner = last?.[2] ?? "(anonymous)";
    const mixin = !!last?.[1] || new RegExp(`function\\s+${owner}\\s*[<(]`).test(source);
    out.push({ file, owner, mixin, verbs });
  }
  return out;
}

/** The mixin factories a factory's own returned class composes. */
export function mixinsComposedBy(source: string, factory: string): string[] {
  const at = new RegExp(`function\\s+${factory}\\s*[<(]`).exec(source);
  if (!at) return [];
  const ret = /return\s+class\s+\w+\s+extends\s+/.exec(source.slice(at.index));
  if (!ret) return [];
  const start = at.index + ret.index + ret[0].length;
  const expr = source.slice(start, source.indexOf("{", start));
  return [...expr.matchAll(/\b(\w+Mixin)\s*\(/g)].map((x) => x[1]!);
}

/** The receivers of `self` — see the header. */
export interface ReceiverQuestions {
  /** Is this class a giver, a shadow, or a hosted update? */
  isReceiver(classPath: string): boolean;
  /** Does this class compose this mixin (directly)? */
  composes(classPath: string, mixin: string): boolean;
  /** Does this class extend that one? */
  extends(classPath: string, base: string): boolean;
}

/**
 * The dead declarations, given the world's classes and the questions.
 * Pure over its inputs (the test hands it fixtures).
 */
export function deadSelfDeclarations(
  decls: readonly SelfDeclaration[],
  classes: ReadonlyMap<string, string>, // class path → file
  mixinGraph: ReadonlyMap<string, readonly string[]>, // factory → factories it composes
  q: ReceiverQuestions,
  classPathOf: (file: string) => string | null,
): SelfDeclaration[] {
  // Every factory that (transitively) brings mixin M in.
  const carriers = (m: string): Set<string> => {
    const out = new Set<string>([m]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const [f, composed] of mixinGraph) {
        if (out.has(f)) continue;
        if (composed.some((c) => out.has(c))) {
          out.add(f);
          grew = true;
        }
      }
    }
    return out;
  };
  const receivers = [...classes.keys()].filter((c) => q.isReceiver(c));
  return decls.filter((d) => {
    if (d.mixin) {
      const via = carriers(d.owner);
      return !receivers.some((r) => [...via].some((m) => q.composes(r, m)));
    }
    const cp = classPathOf(d.file);
    if (cp === null) return false; // not a class this reader can place
    if (q.isReceiver(cp)) return false;
    return !receivers.some((r) => r !== cp && q.extends(r, cp));
  });
}

/** Every `.ts` under a directory, `__tests__` excluded. */
function tsFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      const full = join(d, e);
      if (statSync(full).isDirectory()) {
        if (e === "__tests__" || e === "node_modules") continue;
        walk(full);
      } else if (e.endsWith(".ts") && !e.endsWith(".d.ts")) out.push(full);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

function main(): void {
  const sources: PackSource[] = packSources(CONTENT);
  const files = [...tsFiles(MUD), ...sources.flatMap((p) => packSrcFiles(p.srcDir))];
  const decls: SelfDeclaration[] = [];
  const classes = new Map<string, string>();
  const graph = new Map<string, string[]>();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    decls.push(...selfDeclarationsIn(file, source));
    for (const f of source.matchAll(/export\s+function\s+(\w+Mixin)\s*[<(]/g)) {
      graph.set(f[1]!, mixinsComposedBy(source, f[1]!));
    }
    if (/\bclass\s+\w+/.test(source)) {
      const cp = classPathOfFile(file, sources);
      if (cp) classes.set(cp, file);
    }
  }
  const cache = new Map<string, boolean>();
  const q: ReceiverQuestions = {
    isReceiver: (c) =>
      composesMixin(c, "CommandGiverMixin", sources, cache) ||
      composesMixin(c, "AetherHostedMixin", sources, cache) ||
      extendsAny(c, ["/lib/stuff/Shadow"], 0, sources),
    composes: (c, m) => composesMixin(c, m, sources, cache),
    extends: (c, base) => extendsAny(c, [base], 0, sources),
  };
  const dead = deadSelfDeclarations(decls, classes, graph, q, (f) => classPathOfFile(f, sources));
  const where = (f: string): string => relative(join(MUD, "..", "..", ".."), f);
  if (process.argv.includes("--list") || dead.length > CEILING) {
    for (const d of dead) {
      console.error(`  ⚠ ${where(d.file)} — ${d.owner}${d.mixin ? " (mixin)" : ""}: self [${d.verbs.join(", ")}]`);
    }
  }
  if (dead.length > CEILING) {
    console.error(
      `\n✖ check-self-contributions: ${dead.length} dead \`self\` declaration(s), ceiling ${CEILING}. ` +
        `\`self\` is read only off a command giver, a shadow or a hosted update — ` +
        `move the verbs to the bucket whose receiver should hear them ` +
        `(environment: the holder · peers: the bystander · inventory: the occupant).`,
    );
    process.exitCode = 1;
    return;
  }
  console.info(
    `check-self-contributions: ok — ${decls.length} non-empty \`self\` list(s), ` +
      `${dead.length} dead (ceiling ${CEILING}).`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("check-self-contributions.ts")) {
  main();
}
