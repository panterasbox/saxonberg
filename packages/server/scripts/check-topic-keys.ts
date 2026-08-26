/**
 * check-topic-keys — the topic-vocabulary totality gate.
 *
 * ⚠ **Why this exists.** `TopicCatalogue` resolves in three tiers, and
 * the third *derives* a descriptor for any key it has never heard of.
 * That makes every typo, every rename and every never-authored topic
 * fail **silently** into a plausible-looking descriptor. Measured before
 * this script existed: 89 topics were seeded, and **23 topics that
 * players actually received had no authored descriptor at all**. Nobody
 * noticed, because the derived default reads like a real one.
 *
 * So this is the same shape as the `MeasureChannel` totality test —
 * a scan that asserts the emitted vocabulary and the authored
 * vocabulary are the same set.
 *
 * ⭐ **The vocabulary is open; the roots are closed.** Content packs may
 * add topics (they install `domain` rows exactly as core seeds do), so
 * this gate cannot enumerate every legal key. What it *can* enumerate is
 * the seven roots — and a pack-minted root would break subtree-mute
 * integrity, which is the entire reason topics form a tree rather than a
 * flat tag set. Hence rule 2 below. This already had a live violation
 * when the gate was written: `residence.*`, minted by Duncan Hall's
 * domain-local commands.
 *
 * ## Rules
 *
 *   1. ERROR — an emitted key with no authored descriptor.
 *   2. ERROR — a key whose root is not one of {@link TOPIC_ROOTS}.
 *   3. ERROR — a `.topic(…)` argument that cannot be resolved to a
 *      literal. A hole in the gate must be *visible* as a hole; a
 *      silently-skipped emitter is how the 23 stayed hidden.
 *   4. WARN  — a seeded key nothing emits (roots excluded). This is the
 *      direction that produced ~50 dead seeds. It cannot be an error —
 *      packs and subtree parents legitimately have no core emitter — but
 *      it must not be silent either.
 *
 * ## Resolving the argument
 *
 * `.topic(x)` is written five ways in this tree, and all five are
 * statically resolvable — which is why rule 3 can be an error rather
 * than an exemption list:
 *
 *   | Shape | Example |
 *   |---|---|
 *   | literal | `.topic('speech.vocal')` |
 *   | module const | `.topic(COMBAT_EXCHANGE_TOPIC)` |
 *   | class field | `.topic(this.sceneTopic)` — 4 concrete initializers |
 *   | local const | `.topic(topic)` after `const topic = a ? 'x' : 'y'` |
 *   | forwarded opt | `.topic(opts.topic)` — callers supply `topic: '…'` |
 *
 * The resolver is name-based rather than type-directed: it collects
 * every string literal in the tree that is *assigned to* a
 * topic-shaped name, then resolves each call argument by name against
 * that table. Constant resolution mirrors `check-gate-strings`'
 * `*_MODULE_ID` handling.
 *
 * Usage:
 *   tsx scripts/check-topic-keys.ts --report   # the inventory
 *   tsx scripts/check-topic-keys.ts --lint     # CI gate
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import { TOPIC_ROOTS } from "@saxonberg/types";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");
const MUD_ROOT = join(SERVER_SRC, "mud");
// The topic descriptors are the platform pack's content (content-packs wave 3).
const TOPIC_SEEDS = join(MUD_ROOT, "..", "..", "..", "content", "platform", "content", "obj", "Topic");
const CLIENT_SRC = join(here, "..", "..", "client", "src");

/** Exported for the unit tests — the same white-box seam
 *  `check-combat-dynamics` uses. Scripts sit outside the `api/` +
 *  `lib/` export-discipline scopes, so no disable is needed. */

/** A dotted key: lowercase segments, at least one dot. */
const KEY_SHAPE = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;

/** `.topic(<arg>)` — argument captured raw, resolved below. */
const TOPIC_CALL = /\.topic\(\s*([^),]+?)\s*\)/g;

/**
 * Any assignment whose left-hand side is topic-shaped. Covers module
 * consts (`const TOPIC = 'x'`, `FEED_TOPIC = 'x'`), class fields
 * (`protected readonly sceneTopic = 'x'`), default parameters
 * (`topic: string = 'x'`) and object properties (`topic: 'x'`).
 * The right-hand side may be a ternary, so every literal on it counts.
 */
const TOPIC_ASSIGN = /\b(\w+)\s*(?::\s*[^=;,)]+)?(?:=|:)\s*([^;]+)/g;

/** A topic-shaped name, in any case convention (`TOPIC`, `sceneTopic`). */
const TOPIC_NAME = /topic/i;

/**
 * Object-property form, scanned separately.
 *
 * {@link TOPIC_ASSIGN}'s right-hand side runs to the `;`, so a nested
 * property in a single-line literal (`const opts = { topic: 'x' };`)
 * gets swallowed by the enclosing assignment and never matches on its
 * own. That is the supply side of every forwarded `opts.topic`, so
 * missing it would mean missing a real emitter.
 */
const TOPIC_PROP = /\b(\w+)\s*:\s*['"`]([^'"`]+)['"`]/g;

const STRING_LITERAL = /['"`]([^'"`]+)['"`]/g;

interface Finding {
  file: string;
  detail: string;
}

/**
 * Drop comments before scanning — a doc comment that *mentions*
 * `.topic(world.perception.vision)` is prose, not an emitter.
 *
 * Deliberately conservative: block comments, and whole lines that open
 * with `//` or a doc-comment `*`. It does NOT strip trailing `//` from
 * a code line, because doing that risks truncating a line that really
 * does emit — and a *missed* emitter is the failure this whole script
 * exists to prevent, while a spurious one merely gets reported.
 */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

function walk(dir: string, out: string[], exts: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      walk(p, out, exts);
    } else if (
      exts.some((e) => entry.endsWith(e)) &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".d.ts")
    ) {
      out.push(p);
    }
  }
}

/**
 * Build `name → keys` for the topic-shaped assignments in ONE file.
 *
 * ⚠ **Scoping is the whole point.** An earlier revision resolved names
 * against a single tree-wide table, and `Mobile.ts`'s `.topic(topic)`
 * silently matched an unrelated file's `topic` default — resolving to a
 * plausible wrong key instead of reporting a miss. The gate passed
 * while two emitters kept firing retired topics. A name-based resolver
 * MUST prefer the local declaration, or it manufactures exactly the
 * quiet wrongness it exists to catch.
 */
export function buildNameTable(files: string[]): Map<string, Set<string>> {
  const table = new Map<string, Set<string>>();
  for (const file of files) {
    const source = stripComments(readFileSync(file, "utf8"));
    for (const m of source.matchAll(TOPIC_ASSIGN)) {
      const name = m[1];
      const rhs = m[2];
      if (name === undefined || rhs === undefined) continue;
      if (!TOPIC_NAME.test(name)) continue;
      for (const lit of rhs.matchAll(STRING_LITERAL)) {
        const value = lit[1];
        if (value === undefined || !KEY_SHAPE.test(value)) continue;
        add(table, name, value);
      }
    }
    for (const m of source.matchAll(TOPIC_PROP)) {
      const name = m[1];
      const value = m[2];
      if (name === undefined || value === undefined) continue;
      if (!TOPIC_NAME.test(name) || !KEY_SHAPE.test(value)) continue;
      add(table, name, value);
    }
  }
  return table;
}

function add(
  table: Map<string, Set<string>>,
  name: string,
  value: string
): void {
  let set = table.get(name);
  if (set === undefined) {
    set = new Set();
    table.set(name, set);
  }
  set.add(value);
}

/**
 * Resolve one `.topic(...)` argument to the keys it can carry.
 *
 * Local declarations win; the tree-wide table is the fallback for
 * imported constants and for abstract class fields whose concrete
 * initializers live in sibling subclasses.
 */
export function resolveArgument(
  raw: string,
  local: Map<string, Set<string>>,
  global: Map<string, Set<string>>
): Set<string> | null {
  const literal = raw.match(/^['"`]([^'"`]+)['"`]$/);
  if (literal?.[1] !== undefined) return new Set([literal[1]]);

  // `this.sceneTopic`, `opts.topic`, `foo.bar.topic` — resolve on the
  // trailing member, which is the topic-shaped name.
  const identifier = raw.split(".").pop()?.trim() ?? "";
  if (!/^\w+$/.test(identifier)) return null;
  return local.get(identifier) ?? global.get(identifier) ?? null;
}

function seededKeys(): Set<string> {
  const out = new Set<string>();
  for (const entry of readdirSync(TOPIC_SEEDS)) {
    if (!entry.endsWith(".yaml")) continue;
    out.add(entry.slice(0, -".yaml".length));
  }
  return out;
}

function rootOf(key: string): string {
  return key.split(".")[0] ?? key;
}

function main(): void {
  const mode = process.argv.includes("--lint") ? "lint" : "report";

  const serverFiles: string[] = [];
  walk(MUD_ROOT, serverFiles, [".ts"]);
  const globalNames = buildNameTable(serverFiles);

  const emitted = new Map<string, string[]>(); // key -> files
  const unresolved: Finding[] = [];

  for (const file of serverFiles) {
    const source = stripComments(readFileSync(file, "utf8"));
    const localNames = buildNameTable([file]);
    for (const m of source.matchAll(TOPIC_CALL)) {
      const raw = m[1];
      if (raw === undefined) continue;
      const keys = resolveArgument(raw, localNames, globalNames);
      if (keys === null || keys.size === 0) {
        unresolved.push({
          file: relative(SERVER_SRC, file),
          detail: `.topic(${raw})`,
        });
        continue;
      }
      for (const key of keys) {
        const list = emitted.get(key) ?? [];
        list.push(relative(SERVER_SRC, file));
        emitted.set(key, list);
      }
    }
  }

  const seeded = seededKeys();
  const rootSet = new Set<string>(TOPIC_ROOTS);

  const undescribed = [...emitted.keys()].filter((k) => !seeded.has(k)).sort();
  const badRoot = [...emitted.keys()]
    .filter((k) => !rootSet.has(rootOf(k)))
    .sort();
  const unemitted = [...seeded]
    .filter((k) => !emitted.has(k) && k.includes("."))
    .sort();

  if (mode === "report") {
    const byRoot = new Map<string, string[]>();
    for (const key of [...emitted.keys()].sort()) {
      const r = rootOf(key);
      byRoot.set(r, [...(byRoot.get(r) ?? []), key]);
    }
    console.log(`emitted: ${emitted.size}   seeded: ${seeded.size}\n`);
    for (const [root, keys] of [...byRoot].sort()) {
      const flag = rootSet.has(root) ? " " : "!";
      console.log(`${flag} ${root}  (${keys.length})`);
      for (const key of keys) {
        console.log(`${seeded.has(key) ? "   " : " ? "}  ${key}`);
      }
    }
    console.log(`\n? = emitted but never seeded (${undescribed.length})`);
    console.log(`! = root outside TOPIC_ROOTS`);
    if (unresolved.length > 0) {
      console.log(`\nunresolvable (${unresolved.length}):`);
      for (const u of unresolved) console.log(`  ${u.file}  ${u.detail}`);
    }
    // Client-side hardcoded keys, so the rewire wave can find them.
    const clientFiles: string[] = [];
    walk(CLIENT_SRC, clientFiles, [".ts", ".tsx"]);
    const clientKeys = new Set<string>();
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      for (const lit of source.matchAll(STRING_LITERAL)) {
        const v = lit[1];
        if (v !== undefined && KEY_SHAPE.test(v) && emitted.has(v)) {
          clientKeys.add(v);
        }
      }
    }
    console.log(`\nclient references (${clientKeys.size}):`);
    for (const k of [...clientKeys].sort()) console.log(`  ${k}`);
    return;
  }

  let failed = false;
  const fail = (label: string, items: string[]): void => {
    if (items.length === 0) return;
    failed = true;
    console.error(`\n${label} (${items.length}):`);
    for (const i of items) console.error(`  ${i}`);
  };

  fail("emitted but never authored", undescribed);
  fail(
    "root outside TOPIC_ROOTS — content may add leaves, never roots",
    badRoot
  );
  fail(
    "unresolvable .topic() argument — a hole in the gate",
    unresolved.map((u) => `${u.file}  ${u.detail}`)
  );

  if (unemitted.length > 0) {
    console.warn(`\nWARN — seeded but nothing emits (${unemitted.length}):`);
    for (const k of unemitted) console.warn(`  ${k}`);
  }

  if (failed) {
    console.error("\ncheck-topic-keys: FAILED");
    process.exit(1);
  }
  console.log(
    `check-topic-keys: ok — ${emitted.size} emitted, all authored, ` +
      `all under ${TOPIC_ROOTS.length} roots`
  );
}

if (process.argv[1]?.includes("check-topic-keys")) {
  main();
}
