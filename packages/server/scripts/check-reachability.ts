/**
 * ⭐⭐⭐ `lint:reachability` — **a verb nothing confers, a row nothing
 * reaches.**
 *
 * ## The failure this exists for, which shipped
 *
 * The carcass-chain build shipped `trade-chandlery` with a `dip` verb, a
 * view, a controller, a recipe and a shop that sells the wax — and
 * **nothing anywhere conferred the verb.** The pack's row named the
 * kernel's `CraftVessel`, and a kernel class cannot know a pack's view
 * exists, so a player standing in the chandlery with a wick in hand got
 * *"I don't understand"*. The drive had been **passing** it: its
 * checkpoint asserted only that the refusal was not `no-recipe` and not
 * `not-learned`, and an unknown verb is neither.
 *
 * That is not a one-off. `docs/subsystems/command-routing.md:378-381`:
 *
 * > There is ONE record of verb affordances… `static
 * > commandContributions` on a class and every mixin in its chain.
 * > Nothing else.
 *
 * Dispatch is `getAffordances().filter(a => a.command.hasVerb(verb))`
 * (`:82`), so a view no static names is **dead YAML**, and the same
 * closed-and-silent shape runs through the content corpus: a row no
 * mechanism reaches is a thing an author wrote that no player can ever
 * meet. The census found **fourteen dead views** and dozens of
 * unreachable rows on one afternoon.
 *
 * ⭐ The doctrine this serves is `command-routing.md:418-420` — *"afford
 * statically, decline diegetically… a verb that is simply absent teaches
 * nothing."*
 *
 * ## ⚠⚠ What this gate is NOT
 *
 * `command-routing.md:1763-1765` says of the **runtime affordance
 * resolver** — the probe behind the radial menu —
 *
 * > Not a gate, and it must never become one.
 *
 * That is about the resolver, and it still holds. **This gate never runs
 * the resolver.** It reads class statics off disk and YAML off disk; it
 * boots nothing, instantiates nothing, and resolves no affordance for
 * any target. Nor does it carry a table of which verbs suit which
 * targets — `:1756-1759` refused that twice, and nothing here needs it:
 * the question is only *does ANY static name this view*, never *should
 * this target offer this verb*.
 *
 * ## The three arms
 *
 * One script, three arms, two corpora, **and no allowlist anywhere.**
 * The disposition for a view or a row is a field ON that view or row
 * (see *The carrier* below), so there is no list in this file for a
 * build to append itself to.
 *
 * - **Arm A — affordance.** Every command view is named by a
 *   `commandContributions` static somewhere, or declares `unreachable:`.
 *   A **zero invariant**: a new view costs its author one static or one
 *   key, and the figure does not scale with content.
 * - **Arm G — grammar.** TWO shapes, two ratchets, one arm — both are
 *   the binder cutting a phrase a player typed into pieces:
 *   - the **phrase shape**: a `string` positional followed by an
 *     optional `object` carrying a `default`, in which the binder gives
 *     word two of a two-word name to the trailing slot and discards
 *     that slot's default (`CommandLogic.bindPositionals`). `buy dog
 *     loaf` bound `thing = "dog"` and then refused in the name of a
 *     counter the player never mentioned.
 *   - the **article shape**: an `object`/`objects` arg that declares
 *     `prepositions:` and is NOT greedy.
 *     `docs/subsystems/command-spec.md:507-515` already calls this
 *     *"THE ARTICLE DEFECT — every object arg a player may put an
 *     article in front of needs this, INCLUDING plural and
 *     prepositional ones"*, and 45 shipped views carry `greedy` for
 *     exactly that reason. The other hundred-odd do not, so `buy torch
 *     from the counter`, `bake at the brick oven` and `mill wheat at
 *     the quern` were all shape errors — each of them a form the
 *     view's OWN help text promises.
 *
 *   Both are **ratchets**: a verb's phrase shape is a per-view
 *   authoring decision, not content volume, and a new prepositional
 *   object arg should be born greedy — so neither ceiling ever needs
 *   to rise.
 * - **Arm R — rows.** Every `thing`-branch row is reachable by one of
 *   five mechanisms, or declares `unreachable:`. A **zero invariant**
 *   for the same reason as arm A.
 *
 * ⭐ Why not a bare count anywhere: `docs/lint-family.md:1403-1411` — a
 * ratchet over a figure that **scales with content size** refuses an
 * author for doing the right thing. Arms A and R are zero invariants
 * over *declarations*, which is the only shape that rule permits; arm G
 * ratchets a figure that falls as views are fixed and never rises with
 * content.
 *
 * ⚠ The collision question is `lint:verb-collisions`' and stays there.
 * Two gates, two links. And this gate is **not** named "affordance
 * honesty": `check-arg-kinds.ts` already calls itself that, and it
 * guards the *arg gate* link, which is a different one of the five.
 *
 * ## The carrier: `unreachable:`, a top-level YAML key
 *
 * A sibling of `class:`/`extends:`/`data:` on a row, and of
 * `verbs:`/`controller:` on a view. Closed vocabulary:
 *
 * - `exemplar` — a substrate exemplar a subsystem doc cites and tests
 *   build; not meant to stand in the world.
 * - `parent` — a base row that exists to be `extends:`-ed, which nothing
 *   extends yet. (A parent WITH a reachable child is detected, so this
 *   value is only for the not-yet case. Views never use it.)
 * - `awaiting:<slate-basename>` — held for a named slate, whose file
 *   must exist under `docs/slates/**`. A stranded reason is a finding:
 *   `wand-of-firebolt-cursed` sat at `regionTarget: 0` *"until
 *   generation odds land"* long after they landed.
 *
 * Verified end to end before it was chosen: `PackLogic` reads only
 * `class`/`extends`/`data` off a row file and writes
 * `{path, class?, extends?, data, sourcePack}`, hashing
 * `{class, extends, data}` — so the key never reaches Mongo, never
 * changes a row's hash and never reaches the runtime. ⚠ A `data:`-level
 * carrier was rejected on a stronger reason than the obvious one: the
 * `TemplateApplier` iterates the host's DECLARED fields and lights a
 * `reportUnapplied` diagnostic for anything left over, so
 * `data.unreachable` would raise an author-visible diagnostic on **every
 * clone** of the row.
 *
 * ⚠ The honest objection — *a key only a script reads* — is accepted.
 * It is an authoring declaration the same way a `# comment` was, except
 * greppable, vocabulary-checked and gated.
 *
 * ## How arm A knows (D4): statics on disk, not a booted walk
 *
 * The record the doctrine names is a class static, so the gate reads the
 * record itself: the TypeScript scanner over every non-test `.ts` in the
 * kernel's `src/mud` and every pack's `src/`, collecting every string
 * literal that ends `.yaml` and contains `/cmd/`. A view is conferred
 * iff its **pack-relative** path (`platform/cmd/movement/walk.yaml`,
 * `world/terminus/university-avenue/cmd/wind.yaml`,
 * `trade/chandlery/cmd/chandlery/dip.yaml`) is in that set.
 *
 * Comments are not literals, so a docstring quoting a view path confers
 * nothing — which is the point: `Watch.ts` argued in prose that it
 * should contribute none, and prose is not the record.
 *
 * ⚠ **The file-wide literal scan is deliberate, not laziness.**
 * `terminus/src/market/thing/MarketStalls.ts` builds its list by
 * spreading `Stock.commandContributions.peers`, whose entries are
 * literals in `lib/retail/Stock.ts` — a scan confined to the initializer
 * would read that as unconferred. The cost is that a view path appearing
 * as a literal anywhere in a file counts; the benefit is that no
 * legitimate indirection reads as a hole.
 *
 * **Residual risk, stated plainly:** a view path assembled at runtime
 * (concatenation, a template literal, a call) would be *undercounted* —
 * reported as unconferred when it is in fact reachable. That fails LOUD,
 * so the first such entry is a finding a human adjudicates, never a
 * hole. The gate additionally REPORTS every `commandContributions`
 * initializer whose array elements are not string literals, identifiers
 * or spreads, so the shape cannot arrive unnoticed.
 *
 * ## How arm R knows (D5)
 *
 * Corpus: every row whose template path carries `thing` as a segment.
 * Agents, ideas and locations are out of this arm — they have their own
 * gates (`lint:locations`, `lint:identity`, the census's clause (d), the
 * catalogues) and a row arm that tried to cover all four branches would
 * be four gates wearing one name.
 *
 * A row is reachable when any of these holds; `--list` prints WHICH:
 *
 * 1. **faucet-named** — some field in some content YAML names it, and
 *    that field MINTS or PLACES. The faucet list is enumerated below
 *    with a reason each, as is the CITATION list — fields that name a
 *    row without bringing it into the world (`source`, `mainsRef`, a
 *    brain's `shelf`). ⭐ A field in NEITHER list whose value is a
 *    `thing` path is **reported as a finding**: the only way to add a
 *    faucet is to name it. That rule is `check-template-census`'s own
 *    hard lesson — `populates: → props:/cast:` cost it 322 of 462 refs
 *    while still reporting green.
 * 2. **self-placed** — the row declares `container:` or `seatIn:`.
 * 3. **census-drawn** — the row declares `censusKey:`, its effective
 *    class composes `CirculatingMixin`, and the target is positive:
 *    its own `regionTarget > 0`, or a zone's `stocks:` map names its key
 *    with a count > 0 (a zone's declared count overrides the item's
 *    baseline — `ResidencyLogic`).
 * 4. **parent** — some row `extends:` it, and that child is reachable.
 * 5. **code-named** — a string literal in non-test kernel or pack `src/`
 *    equals the row's path, or equals a **directory prefix** of it.
 *    `platform/agent/Gus.ts` holds `const ROOT =
 *    '/world/terminus/university-avenue/thing'` and places six rows by
 *    concatenation; a full-path scan misses every one. `--list` labels a
 *    prefix hit `prefix`, because it is the weaker evidence.
 * 6. **declared** — the `unreachable:` key.
 *
 * ⚠ A `__tests__` file never counts and a `.md` never counts. A test
 * that manufactures what the world lacks is how three locomotion mixins
 * stayed invisible; a doc mentioning a row is not reachability.
 *
 * ## It was seen to fail before it was trusted
 *
 * `docs/lint-family.md:71-78`. `scripts/__tests__/check-reachability.test.ts`
 * runs all three arms over `scripts/__fixtures__/reachability/`, a
 * synthetic pack tree holding one of every violation class, and asserts
 * the POSITIVE for each — that the arm FINDS it.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";
import YAML from "yaml";
import ts from "typescript";
import {
  CONTENT,
  MUD,
  SERVER_SRC,
  composesMixin,
  effectiveRow,
  inheritanceIndex,
  packSources,
  packSrcFiles,
  walkYamlFiles,
  type PackSource,
} from "./pack-roots";

// ──────────────────────────────────────────────────────────────────────
// The carrier
// ──────────────────────────────────────────────────────────────────────

const SLATES = join(SERVER_SRC, "..", "..", "..", "docs", "slates");

/** `unreachable:`'s closed vocabulary. `awaiting:` takes a slate name. */
function checkDisposition(
  value: unknown,
  where: string,
  kind: "view" | "row",
  findings: Finding[],
  slateDir: string = SLATES,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    findings.push({
      arm: "carrier",
      where,
      detail: `unreachable: must be a string — one of 'exemplar', ${
        kind === "row" ? "'parent', " : ""
      }'awaiting:<slate>'.`,
    });
    return null;
  }
  const v = value.trim();
  if (v === "exemplar") return v;
  if (v === "parent") {
    if (kind === "view") {
      findings.push({
        arm: "carrier",
        where,
        detail: "unreachable: parent is for ROWS — a view has no children.",
      });
      return null;
    }
    return v;
  }
  if (v.startsWith("awaiting:")) {
    const slate = v.slice("awaiting:".length).trim();
    if (slate === "") {
      findings.push({
        arm: "carrier",
        where,
        detail: "unreachable: awaiting: names no slate.",
      });
      return null;
    }
    if (!slateFileExists(slate, slateDir)) {
      findings.push({
        arm: "carrier",
        where,
        detail:
          `unreachable: awaiting:${slate} — no docs/slates/**/${slate}.md. ` +
          `A reason held against a slate that does not exist is a STRANDED ` +
          `reason: 'wand-of-firebolt-cursed' waited at regionTarget: 0 ` +
          `"until generation odds land" long after they had landed.`,
      });
      return null;
    }
    return v;
  }
  findings.push({
    arm: "carrier",
    where,
    detail:
      `unreachable: '${v}' is outside the vocabulary — 'exemplar', ` +
      `${kind === "row" ? "'parent', " : ""}'awaiting:<slate>'.`,
  });
  return null;
}

function slateFileExists(basename: string, slateDir: string): boolean {
  if (!existsSync(slateDir)) return false;
  const want = `${basename}.md`;
  const walk = (dir: string): boolean => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) {
        if (walk(p)) return true;
      } else if (e === want) return true;
    }
    return false;
  };
  return walk(slateDir);
}

// ──────────────────────────────────────────────────────────────────────
// Findings
// ──────────────────────────────────────────────────────────────────────

export interface Finding {
  arm: "A" | "G" | "R" | "field" | "carrier" | "scan";
  where: string;
  detail: string;
}

// ──────────────────────────────────────────────────────────────────────
// Arm A — the affordance census
// ──────────────────────────────────────────────────────────────────────

/** Every `cmd/**\/*.yaml` that is a command VIEW (not a controller row). */
export function commandViewFiles(contentDir: string = CONTENT): string[] {
  if (!existsSync(contentDir)) return [];
  const out: string[] = [];
  for (const pack of readdirSync(contentDir).sort()) {
    const root = join(contentDir, pack, "content");
    if (!existsSync(root)) continue;
    for (const file of walkYamlFiles(root)) {
      // ⚠ The shipped path rule, same as `check-verb-collisions`: a `cmd`
      // dir holds views UNLESS its parent is `idea` (`<root>/idea/cmd/**`
      // is controllers, whose rows carry `class:` and no `verbs:`).
      const parts = file.split(sep);
      const cmdAt = parts.lastIndexOf("cmd");
      if (cmdAt < 1 || parts[cmdAt - 1] === "idea") continue;
      out.push(file);
    }
  }
  return out;
}

/** The key a `commandContributions` entry uses: the path under `content/`. */
export function viewKey(file: string, contentDir: string = CONTENT): string {
  const parts = relative(contentDir, file).split(sep);
  // <pack>/content/<the key>
  return parts.slice(2).join("/");
}

/**
 * Every string literal in every non-test source file of the kernel and
 * every pack, plus a report of any non-literal `commandContributions`
 * element.
 */
export function scanSourceLiterals(
  sources: readonly PackSource[],
  findings: Finding[],
  mudDir: string = MUD,
): Set<string> {
  const literals = new Set<string>();
  const files: string[] = [];
  if (existsSync(mudDir)) files.push(...packSrcFiles(mudDir));
  for (const s of sources) if (existsSync(s.srcDir)) files.push(...packSrcFiles(s.srcDir));

  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        literals.add(node.text);
      }
      // ⭐ Report, never skip: an initializer this scan cannot read as
      // literals is the one shape that could hide a conferral.
      if (
        ts.isPropertyDeclaration(node) &&
        node.name.getText(sf) === "commandContributions" &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        for (const prop of node.initializer.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          // ⭐ An identifier or a property access is the SHIPPED shape —
          // `environment: CLIMB` over a same-file `const CLIMB = [...]`, or
          // `peers: Stock.commandContributions.peers`. The file-wide literal
          // scan sees the const's own entries, so these are readable.
          if (
            ts.isIdentifier(prop.initializer) ||
            ts.isPropertyAccessExpression(prop.initializer)
          ) {
            continue;
          }
          if (!ts.isArrayLiteralExpression(prop.initializer)) {
            findings.push({
              arm: "scan",
              where: `${relative(SERVER_SRC, file)}`,
              detail:
                `static commandContributions.${prop.name.getText(sf)} is neither ` +
                `an array literal nor an identifier/property access resolving to ` +
                `one, so arm A cannot read what it confers. Name the views in a ` +
                `literal array (or a same-file const of one).`,
            });
            continue;
          }
          for (const el of prop.initializer.elements) {
            const ok =
              ts.isStringLiteral(el) ||
              ts.isNoSubstitutionTemplateLiteral(el) ||
              ts.isIdentifier(el) ||
              ts.isSpreadElement(el) ||
              ts.isPropertyAccessExpression(el);
            if (!ok) {
              findings.push({
                arm: "scan",
                where: `${relative(SERVER_SRC, file)}`,
                detail:
                  `static commandContributions.${prop.name.getText(sf)} holds a ` +
                  `computed element (${ts.SyntaxKind[el.kind]}). Arm A reads ` +
                  `literals; a computed view path is invisible to it.`,
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return literals;
}

// ──────────────────────────────────────────────────────────────────────
// Arm G — the phrase-shape census
// ──────────────────────────────────────────────────────────────────────

interface ArgSpec {
  name?: unknown;
  type?: unknown;
  required?: unknown;
  greedy?: unknown;
  default?: unknown;
  prepositions?: unknown;
}

/**
 * The shape: a non-greedy `string` positional with a LATER optional
 * `object` positional carrying a `default:`.
 *
 * `bindPositionals` gives a non-greedy arg exactly one token, and it
 * consumes that token BEFORE `default:` is considered — so `buy dog loaf`
 * binds `thing = "dog"`, hands `loaf` to the trailing slot, and throws
 * the slot's MQL default away. The player is then refused in the name of
 * a counter they never mentioned.
 */
export function phraseShapeOf(doc: {
  args?: unknown;
}): { string: string; object: string } | null {
  const args = doc.args;
  if (!Array.isArray(args)) return null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as ArgSpec;
    if (!a || typeof a !== "object") continue;
    if (a.type !== "string" || a.greedy === true) continue;
    for (let j = i + 1; j < args.length; j++) {
      const b = args[j] as ArgSpec;
      if (!b || typeof b !== "object") continue;
      if (b.type === "object" && b.required === false && b.default !== undefined) {
        return { string: String(a.name ?? i), object: String(b.name ?? j) };
      }
    }
  }
  return null;
}

/**
 * The article shape: an object-ish arg that declares `prepositions:` and
 * is not greedy, so it takes exactly one token and an article or an
 * ordinary noun phrase after the preposition is *"too many arguments"*.
 *
 * Reads subcommand arg lists as well as the flat ones — a subcommanded
 * verb's args are just as bindable and were being missed.
 */
export function articleShapesOf(doc: {
  args?: unknown;
  subcommands?: unknown;
}): string[] {
  const out: string[] = [];
  const scan = (args: unknown, label: string): void => {
    if (!Array.isArray(args)) return;
    for (const a of args as ArgSpec[]) {
      if (!a || typeof a !== "object") continue;
      if (a.type !== "object" && a.type !== "objects") continue;
      if (!Array.isArray(a.prepositions) || a.prepositions.length === 0) continue;
      if (a.greedy === true) continue;
      out.push(label ? `${label}.${String(a.name)}` : String(a.name));
    }
  };
  scan(doc.args, "");
  if (doc.subcommands && typeof doc.subcommands === "object") {
    for (const [sub, spec] of Object.entries(doc.subcommands as Record<string, unknown>)) {
      scan((spec as { args?: unknown } | null)?.args, sub);
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Arm R — the row census
// ──────────────────────────────────────────────────────────────────────

/**
 * ⭐ FAUCETS — a field whose value is brought INTO the world: cloned,
 * placed, minted, worn, stocked. A row named by one of these is
 * reachable.
 *
 * Classified from a census of every field in every content YAML whose
 * value is a `thing` path (54 fields), not from memory.
 */
const FAUCETS: Record<string, string> = {
  props: "born-with placement — the row is cloned into the place",
  template: "the `{template, as}` entry form of props/cast, and floor/residue entries",
  cast: "born-with agents; kept here so an agent-shaped thing row still counts",
  itemTemplatePath: "a counter's stockLines — the shop clones it to par",
  outputTemplate: "a recipe mints it",
  outputResidue: "a recipe's residue, minted beside the output",
  cut: "a species' butcheryYield — dressing out clones it",
  default: "an archetype fitting's fallback — materialized when the need is unmet",
  costume: "the garments an authored person has on",
  seedTemplatePath: "what a crop drops; cloned at harvest",
  growsIntoPath: "what a seed becomes; cloned at germination",
  harvestTemplatePath: "what a plant yields; cloned at harvest",
  seedPath: "a stand's seed — cloned at a felling",
  wins: "what winning a band mints",
  vessel: "the sack a grind fills",
  residueVessel: "the sack a grind bolts out into",
  productVessel: "the scalar fallback of the same",
  tollBinPath: "the bin a mill's toll goes into",
  toolRows: "a tool rack CLONES a declared row it cannot find beside it",
  oreRow: "a working's ore — `hew` clones a lump of it",
  locus: "a spell effect mints its locus",
  yieldRow: "a tap mints it",
  bornWithCell: "a mana gate ships with the cell",
  door: "an exit's door — cloned with the exit",
  adornments: "cloned onto the host",
  trapTemplate: "a hazard mints it",
  castTemplate: "what a frozen pool becomes",
  barkPath: "a felled standard's bark",
  charcoalTemplate: "what a char mints",
  brandsTemplate: "the brands a char leaves",
  ashTemplate: "the ash a char leaves",
  materializesOnto: "an archetype's vehicle — materialized on provisioning",
};

/**
 * CITATIONS — a field that NAMES a row without bringing it into the
 * world. Being cited is not reachability.
 *
 * ⭐ The case that forced the split: `Feeder/terminus-main.yaml` names
 * `/world/terminus/wharfside/thing/aqueduct-house` as its `source:`. The
 * feeder reads the house's `isGenerating()` live — but nothing anywhere
 * PLACES the house, so the grid cites a building that is not standing.
 * *Named by a field* is not enough; the field must mint.
 */
const CITATIONS: Record<string, string> = {
  onto: "a props entry's target — the target is placed by its OWN entry",
  on: "a placement target, as `onto`",
  to: "an exit or travel destination",
  extends: "row inheritance — mechanism 4 reads it from the CHILD's side",
  class: "a class path, not a row",
  classPath: "a class path, not a row",
  operatingLocations: "a business lists where it trades; it clones nothing",
  exemplar: "a par line's example good — it arrives by purchase, not by minting",
  mainsRef: "the line a device is wired to",
  source: "a feeder's generator — read live, never placed (the case that forced this list)",
  supply: "a locality's supply point",
  shelf: "a brain's config — the fixture is propped by its room",
  stock: "as `shelf`",
  counter: "as `shelf`",
  board: "as `shelf`",
  boards: "as `shelf`",
  bench: "as `shelf`",
  rack: "as `shelf`",
  bin: "as `shelf`",
  window: "as `shelf`",
  shore: "as `shelf` — the fisher's reach",
  floor: "a brain's room, or a location's own floor citation",
  room: "a brain's room / a floorplan's location row (not a thing)",
  holdPath: "the warehouse a depot counter books into",
  projectileTemplate: "what a launcher ACCEPTS — matched against what you carry",
  _vaultPaths: "a donation bank's vaults, filtered live to live Containers",
  value: "a setting's value",
  container: "self-placement — mechanism 2 reads it from the ROW's own side",
  seatIn: "self-seating — mechanism 2, likewise",
};

/** Is this a `thing`-branch template path? */
export function isThingPath(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.startsWith("/") &&
    v.split("/").includes("thing")
  );
}

interface FaucetHit {
  field: string;
  file: string;
}

/**
 * Walk every content YAML (rows AND documents — a recipe's
 * `outputTemplate` is a top-level key, not under `data:`) and collect
 * every `thing` path by the field that names it.
 */
export function collectFaucets(
  findings: Finding[],
  contentDir: string = CONTENT,
  serverSrc: string = SERVER_SRC,
): { named: Map<string, FaucetHit>; stocks: Map<string, number> } {
  const named = new Map<string, FaucetHit>();
  const stocks = new Map<string, number>();
  const unknown = new Map<string, { file: string; example: string }>();

  const files: string[] = [];
  const seeds = join(serverSrc, "mud", "seeds");
  if (existsSync(seeds)) files.push(...walkYamlFiles(seeds));
  if (existsSync(contentDir)) {
    for (const pack of readdirSync(contentDir).sort()) {
      const root = join(contentDir, pack, "content");
      if (existsSync(root)) files.push(...walkYamlFiles(root));
    }
  }

  for (const file of files) {
    let doc: unknown;
    try {
      doc = YAML.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const visit = (node: unknown, leaf: string): void => {
      if (Array.isArray(node)) {
        for (const x of node) visit(x, leaf);
        return;
      }
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          // A zone's `stocks:` is a key→count MAP, not a path field.
          if (k === "stocks" && v && typeof v === "object" && !Array.isArray(v)) {
            for (const [key, n] of Object.entries(v as Record<string, unknown>)) {
              if (typeof n === "number") {
                stocks.set(key, Math.max(stocks.get(key) ?? 0, n));
              }
            }
            continue;
          }
          visit(v, k);
        }
        return;
      }
      if (!isThingPath(node)) return;
      if (FAUCETS[leaf] !== undefined) {
        if (!named.has(node)) named.set(node, { field: leaf, file });
        return;
      }
      if (CITATIONS[leaf] !== undefined) return;
      if (!unknown.has(leaf)) unknown.set(leaf, { file, example: node });
    };
    visit(doc, "(root)");
  }

  for (const [field, { file, example }] of [...unknown].sort()) {
    findings.push({
      arm: "field",
      where: relative(contentDir, file),
      detail:
        `'${field}:' holds a thing-row path (${example}) and is in neither ` +
        `FAUCETS nor CITATIONS. Classify it: does the field bring the row ` +
        `INTO the world (a faucet) or only name it (a citation)? ⚠ If this ` +
        `is a RENAME of a field already listed, arm R has just gone blind ` +
        `on every row that field reached — which is exactly how ` +
        `populates: → props:/cast: cost check-template-census 322 of its ` +
        `462 refs while still reporting green.`,
    });
  }
  return { named, stocks };
}


/**
 * ⭐⭐⭐ The NAMING check — **a good you cannot say the name of is a good you
 * cannot buy.**
 *
 * A counter prints its stock as `shortDescription (price)`, and
 * `Stock.resolveBuy` → `Perceptible.hasKeyword` is an exact `includes`
 * against the row's `keywords`. So a good whose printed name is a PHRASE
 * and whose keywords hold no matching phrase answers *"the shelf is bare
 * of X"* — about a thing standing right there, to a player who typed the
 * name off the shelf.
 *
 * ⚠⚠ **This only became visible when `buy.thing` went greedy**, and that
 * is the honest history. Before, the binder cut `buy drop spindle` to
 * `thing = "drop"` and the player got a misleading refusal about a
 * counter. After, the phrase arrives whole — and meets a keyword list
 * with only `drop-spindle` in it. One misleading refusal replaced
 * another, and the second is worse because it asserts something false
 * about the world.
 *
 * ⭐ Thirty-four of the store's goods DO carry the spaced form (the dog
 * loaf's `"dog loaf"`, the seed packets' `"orange seed"`, the cell's
 * `"mana cell"`) — those are the ones the requirements named and they
 * work. The rest print a phrase and answer to single words.
 *
 * Scope is deliberately narrow: only rows on a counter's `stockLines`,
 * because only those have a printed name a player reads and types. A prop
 * nobody buys can be called what it likes.
 */
export function unnameableGoodsIn(
  rows: ReadonlyMap<string, TemplateRow>,
  idx: InheritanceIndex,
): Array<{ path: string; name: string }> {
  const stocked = new Set<string>();
  for (const row of rows.values()) {
    const data = (row.raw.data ?? {}) as Record<string, unknown>;
    const lines = data.stockLines;
    if (!Array.isArray(lines)) continue;
    for (const line of lines as Array<Record<string, unknown>>) {
      const path = line?.itemTemplatePath;
      if (typeof path === "string") stocked.add(path);
    }
  }

  const out: Array<{ path: string; name: string }> = [];
  for (const path of [...stocked].sort()) {
    const eff = effectiveRow(path, idx.rows, idx.rules);
    if (eff.error) continue;
    const name = String(eff.data.shortDescription ?? "").trim();
    if (!name || !name.includes(" ")) continue;
    const kws = (Array.isArray(eff.data.keywords) ? eff.data.keywords : [])
      .map((k) => String(k).toLowerCase());
    const lower = name.toLowerCase();
    const lastTwo = lower.split(/\s+/).slice(-2).join(" ");
    if (kws.includes(lower) || kws.includes(lastTwo)) continue;
    out.push({ path, name });
  }
  return out;
}

/** The reachability verdict for one row. */
export interface RowVerdict {
  path: string;
  file: string;
  how: string | null;
  detail: string;
}

// ──────────────────────────────────────────────────────────────────────
// The run
// ──────────────────────────────────────────────────────────────────────

/**
 * ⭐ Arm G's ratchet. May fall, never rise. A rise wants a per-view
 * audit — is each new one really a free-text tail, or is it a two-word
 * name the binder will cut in half? — never a bumped number
 * (`docs/lint-family.md` ratchet lesson 4).
 */
export const PHRASE_SHAPE_CEILING = 6;

/**
 * ⭐ Arm G's second ratchet — the article shape. Opened at the figure
 * measured after this build's four views were fixed, so it is already
 * four below what master carried. Every one of these is a form a player
 * may reasonably type with an article in it; `command-spec.md:507-515`
 * says they all want `greedy: true`, and the only reason this is a
 * ceiling rather than a zero is that fixing a hundred views' grammar in
 * one commit is a blast radius nobody should take on the way past.
 *
 * ⚠ Lower it, never raise it. A NEW prepositional object arg declaring
 * no `greedy` is an author about to ship `at the brick oven` as a shape
 * error, which is the defect, not a style.
 */
export const ARTICLE_SHAPE_CEILING = 106;

/**
 * ⭐ The naming ratchet — stocked goods whose printed name is a phrase
 * they do not answer to. Opened at the figure after this build fixed the
 * two it put on a shelf itself — 71 across EVERY counter in the realm,
 * not just the general store's.
 *
 * ⚠ Lower it, never raise it. A NEW stock line whose good is called one
 * thing and answers to another is a player being told the shelf is bare
 * of something they can see, and a shop lying about its own stock is
 * worse than a verb nobody can say: the verb teaches you it is not there,
 * and this teaches you something false.
 */
export const UNNAMEABLE_GOOD_CEILING = 71;

/**
 * ⭐⭐ **Arm A is a ZERO INVARIANT.** There is no ceiling: every command
 * view in the game is named by a `commandContributions` static, or
 * carries `unreachable:` saying why not. The sweep opened at 15 and W2
 * drove it to 0, so the constant that held the burn-down is gone — a
 * single unconferred, undeclared view fails this gate now.
 *
 * ⭐ That it CAN be zero is the whole argument for the carrier. A
 * ceiling over a population nobody can finish is a figure that drifts
 * up; a zero over a declaration costs an author one line and cannot.
 */
export const UNCONFERRED_CEILING = 0;

/**
 * ⭐⭐ **Arm R is a ZERO INVARIANT**, like arm A. Every `thing`-branch row
 * in the game is reached by one of the five mechanisms or carries
 * `unreachable:` saying why not. The sweep opened at 45 and W3 drove it
 * to 0.
 *
 * ⭐ What the burn-down actually looked like, because the shape is the
 * argument for the gate: of the 45, **nineteen went on a shop shelf**
 * (the rule: if a player would plausibly own one it is stock), **eight
 * were placed where the world already described them**, **five were
 * declared `exemplar`** (they exist so a doc can point at them), **six
 * were parked against `magic-items-slate`** (distribution is its
 * question, and a shopkeeper's par would answer it by accident),
 * **three were resolved by `extends:` or `container:`**, and **exactly
 * ONE was deleted.** ⚠ The plan listed five for deletion and four of
 * those turned out to be wrong on inspection — each row's own header
 * said where it belonged, and a gate that produces deletions is a gate
 * being read carelessly.
 */
export const UNDECLARED_ROW_CEILING = 0;

export interface Report {
  findings: Finding[];
  views: Array<{ key: string; conferred: boolean; disposition: string | null }>;
  rows: RowVerdict[];
  phrase: Array<{ key: string; string: string; object: string }>;
  article: Array<{ key: string; arg: string }>;
  unnameable: Array<{ path: string; name: string }>;
}

export function run(
  contentDir: string = CONTENT,
  serverSrc: string = SERVER_SRC,
  mudDir: string = MUD,
  slateDir: string = SLATES,
): Report {
  const findings: Finding[] = [];
  const sources = packSources(contentDir);
  const literals = scanSourceLiterals(sources, findings, mudDir);

  // ── Arm A + Arm G ────────────────────────────────────────────────
  const views: Report["views"] = [];
  const phrase: Report["phrase"] = [];
  const article: Report["article"] = [];
  for (const file of commandViewFiles(contentDir)) {
    const key = viewKey(file, contentDir);
    let doc: Record<string, unknown> | null = null;
    try {
      doc = YAML.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch {
      findings.push({ arm: "A", where: key, detail: "unparseable view YAML." });
      continue;
    }
    if (!doc || typeof doc !== "object") continue;
    const disposition = checkDisposition(
      doc.unreachable,
      key,
      "view",
      findings,
      slateDir,
    );
    const conferred = literals.has(key);
    views.push({ key, conferred, disposition });
    if (!conferred && disposition === null) {
      findings.push({
        arm: "A",
        where: key,
        detail:
          `no commandContributions static names this view, so its verb(s) ` +
          `${JSON.stringify(doc.verbs ?? [])} are UNKNOWN to every player. ` +
          `Confer it (a static on the class or mixin whose instance should ` +
          `make the verb sayable — platform/thing/Ladder.ts is the two-line ` +
          `exemplar), or declare 'unreachable: awaiting:<slate>' with the ` +
          `reason where the next person will look.`,
      });
    }
    if (conferred && disposition !== null) {
      findings.push({
        arm: "A",
        where: key,
        detail:
          `declares unreachable: '${disposition}' AND is conferred by a ` +
          `static. One of the two is wrong — a held verb that something ` +
          `confers is reachable, and the declaration is now a lie.`,
      });
    }
    const shape = phraseShapeOf(doc);
    if (shape) phrase.push({ key, ...shape });
    for (const arg of articleShapesOf(doc)) article.push({ key, arg });
  }

  // ── Arm R ────────────────────────────────────────────────────────
  const { named, stocks } = collectFaucets(findings, contentDir, serverSrc);
  const idx = inheritanceIndex(serverSrc, contentDir);
  const mixinCache = new Map<string, boolean>();

  // Children by parent, for mechanism 4.
  const childrenOf = new Map<string, string[]>();
  for (const [path, row] of idx.rows) {
    const parent = row.raw.extends;
    if (typeof parent === "string") {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), path]);
    }
  }

  // Literals that could name a row, and the directory prefixes among them.
  const pathLiterals = new Set<string>();
  for (const l of literals) if (l.startsWith("/")) pathLiterals.add(l);
  const prefixLiterals = [...pathLiterals].filter(
    (l) => l.split("/").length >= 4 && !l.endsWith(".yaml"),
  );

  const corpus = [...idx.rows.values()].filter((r) => isThingPath(r.path));
  const verdicts = new Map<string, RowVerdict>();

  const verdictFor = (path: string, seen: Set<string>): RowVerdict => {
    const cached = verdicts.get(path);
    if (cached) return cached;
    const row = idx.rows.get(path);
    const file = row ? relative(contentDir, row.file) : "(no row)";
    if (!row) return { path, file, how: null, detail: "no such row" };
    if (seen.has(path)) return { path, file, how: null, detail: "cycle" };
    seen.add(path);

    const raw = row.raw;
    const data = (raw.data ?? {}) as Record<string, unknown>;
    /** Why a declared mechanism did not in fact reach it. */
    let inert: string | null = null;
    const decide = (): RowVerdict => {
      // 6 — declared.
      const disposition = checkDisposition(raw.unreachable, path, "row", findings, slateDir);
      if (disposition !== null) {
        return { path, file, how: "declared", detail: disposition };
      }
      // 1 — faucet-named.
      const hit = named.get(path);
      if (hit) {
        return {
          path,
          file,
          how: "faucet",
          detail: `${hit.field}: in ${relative(contentDir, hit.file)}`,
        };
      }
      // 2 — self-placed.
      for (const f of ["container", "seatIn"] as const) {
        if (typeof data[f] === "string") {
          return { path, file, how: "self-placed", detail: `${f}: ${data[f] as string}` };
        }
      }
      // 3 — census-drawn.
      const key = data.censusKey;
      if (typeof key === "string" && key !== "") {
        const eff = effectiveRow(path, idx.rows, idx.rules);
        const cls = eff.class;
        const circulating =
          cls !== null && composesMixin(cls, "CirculatingMixin", sources, mixinCache);
        const own = typeof data.regionTarget === "number" ? data.regionTarget : 0;
        const zoned = stocks.get(key) ?? 0;
        // ⚠ An inert or zeroed key is NOT a separate finding — it is this
        // row's reason for being unreached, carried on the verdict. Pushed
        // as its own finding it would be counted twice: once by arm R's
        // ceiling and once beside it, and the burn-down would never add up.
        if (!circulating) {
          inert =
            `declares censusKey '${key}' but its class ${cls ?? "(none)"} does ` +
            `not compose CirculatingMixin, so the spawn table never considers ` +
            `it — the key is inert`;
        } else if (own <= 0 && zoned <= 0) {
          inert =
            `declares censusKey '${key}' with regionTarget ${own} and no zone ` +
            `stocks: override, so the target is zero and it is never drawn. A ` +
            `row parked at zero "until the odds land" is how ` +
            `wand-of-firebolt-cursed outlived its own reason`;
        } else {
          return {
            path,
            file,
            how: "census",
            detail: `censusKey ${key}, target ${Math.max(own, zoned)}${
              zoned > own ? " (zone override)" : ""
            }`,
          };
        }
      }
      // 4 — parent of a reachable child.
      for (const child of childrenOf.get(path) ?? []) {
        const v = verdictFor(child, seen);
        if (v.how !== null) {
          return { path, file, how: "parent", detail: `${child} (${v.how})` };
        }
      }
      // 5 — code-named.
      if (pathLiterals.has(path)) {
        return { path, file, how: "code", detail: "a source literal names it" };
      }
      for (const p of prefixLiterals) {
        if (path.startsWith(p + "/")) {
          return { path, file, how: "prefix", detail: `a source literal holds '${p}'` };
        }
      }
      return { path, file, how: null, detail: inert ?? "nothing reaches it" };
    };
    const out = decide();
    verdicts.set(path, out);
    return out;
  };

  const rows = corpus
    .map((r) => verdictFor(r.path, new Set()))
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const v of rows) {
    if (v.how !== null) continue;
    findings.push({
      arm: "R",
      where: v.path,
      detail:
        `${v.detail === "nothing reaches it" ? "no faucet names it, it places itself nowhere, no census draws it, nothing extends it and no source literal names it" : v.detail} ` +
        `— so no player can ever meet it. Place it (a 'props:' entry, a ` +
        `counter's stockLines, a recipe output), or declare 'unreachable: ` +
        `exemplar' / 'unreachable: awaiting:<slate>' in the row file.`,
    });
  }

  const unnameable = unnameableGoodsIn(idx.rows, idx);
  return { findings, views, rows, phrase, article, unnameable };
}

// ──────────────────────────────────────────────────────────────────────
// main
// ──────────────────────────────────────────────────────────────────────

function main(): void {
  const wantList = process.argv.includes("--list");
  const report = run();

  if (wantList) {
    console.info("── arm A — command views ─────────────────────────────");
    for (const v of report.views.slice().sort((a, b) => a.key.localeCompare(b.key))) {
      const how = v.conferred
        ? "conferred"
        : v.disposition !== null
          ? `declared ${v.disposition}`
          : "⚠ NOTHING CONFERS IT";
      console.info(`  ${how.padEnd(34)} ${v.key}`);
    }
    console.info("\n── arm G — phrase-shape views ────────────────────────");
    for (const p of report.phrase.slice().sort((a, b) => a.key.localeCompare(b.key))) {
      console.info(`  ${p.string} then ${p.object} (optional, defaulted)  ${p.key}`);
    }
    console.info("\n── arm G — article-shape args ────────────────────────");
    for (const a of report.article
      .slice()
      .sort((x, y) => (x.key + x.arg).localeCompare(y.key + y.arg))) {
      console.info(`  ${a.arg.padEnd(24)} ${a.key}`);
    }
    console.info("\n── stocked goods that cannot be named ────────────────");
    for (const g of report.unnameable) {
      console.info(`  ${JSON.stringify(g.name).padEnd(28)} ${g.path}`);
    }
    console.info("\n── arm R — thing rows ────────────────────────────────");
    for (const r of report.rows) {
      const how = r.how === null ? "⚠ UNREACHED" : r.how;
      console.info(`  ${how.padEnd(12)} ${r.path}  —  ${r.detail}`);
    }
    console.info("");
  }

  const unconferred = report.views.filter(
    (v) => !v.conferred && v.disposition === null,
  ).length;
  const undeclared = report.rows.filter((r) => r.how === null).length;
  const phrase = report.phrase.length;
  const article = report.article.length;
  const unnameable = report.unnameable.length;

  const over: string[] = [];
  if (unconferred > UNCONFERRED_CEILING) {
    over.push(
      `arm A: ${unconferred} unconferred view(s), ceiling ${UNCONFERRED_CEILING}`,
    );
  }
  if (undeclared > UNDECLARED_ROW_CEILING) {
    over.push(
      `arm R: ${undeclared} unreached row(s), ceiling ${UNDECLARED_ROW_CEILING}`,
    );
  }
  if (phrase > PHRASE_SHAPE_CEILING) {
    over.push(`arm G: ${phrase} phrase-shape view(s), ceiling ${PHRASE_SHAPE_CEILING}`);
  }
  if (unnameable > UNNAMEABLE_GOOD_CEILING) {
    over.push(
      `naming: ${unnameable} stocked good(s) print a multi-word name they ` +
        `do not answer to, so \`buy <that name>\` says the shelf is bare ` +
        `of a thing standing right there. Ceiling ${UNNAMEABLE_GOOD_CEILING}`,
    );
  }
  if (article > ARTICLE_SHAPE_CEILING) {
    over.push(
      `arm G: ${article} article-shape arg(s) — a prepositional object arg ` +
        `that is not greedy takes ONE token, so 'at the brick oven' is a ` +
        `shape error. Ceiling ${ARTICLE_SHAPE_CEILING}`,
    );
  }
  // ⭐ The ratchet's other direction: a ceiling that is now slack is a
  // ceiling nobody lowered, and it stops meaning anything.
  const slack: string[] = [];
  if (unconferred < UNCONFERRED_CEILING) {
    slack.push(`arm A is at ${unconferred} — lower UNCONFERRED_CEILING to it`);
  }
  if (undeclared < UNDECLARED_ROW_CEILING) {
    slack.push(`arm R is at ${undeclared} — lower UNDECLARED_ROW_CEILING to it`);
  }
  if (phrase < PHRASE_SHAPE_CEILING) {
    slack.push(`arm G is at ${phrase} — lower PHRASE_SHAPE_CEILING to it`);
  }
  if (unnameable < UNNAMEABLE_GOOD_CEILING) {
    slack.push(
      `naming is at ${unnameable} — lower UNNAMEABLE_GOOD_CEILING to it`,
    );
  }
  if (article < ARTICLE_SHAPE_CEILING) {
    slack.push(`arm G is at ${article} article shape(s) — lower ARTICLE_SHAPE_CEILING to it`);
  }

  // Findings that are NOT the per-item census lines (those are counted by
  // the ceilings) — the carrier, the scan, and the unclassified fields.
  const hard = report.findings.filter((f) => f.arm === "carrier" || f.arm === "scan");
  // ⭐ Gate-integrity findings — an unclassified path field means arm R
  // has gone blind on whatever that field reaches, which no ceiling can
  // express. Always hard, never counted against a ratchet.
  const censusR = report.findings.filter((f) => f.arm === "field");

  if (over.length === 0 && hard.length === 0 && censusR.length === 0 && slack.length === 0) {
    console.info(
      `check-reachability: ok — ${report.views.length} view(s) ` +
        `(${unconferred} unconferred, ceiling ${UNCONFERRED_CEILING}); ` +
        `${report.rows.length} thing row(s) (${undeclared} unreached, ceiling ` +
        `${UNDECLARED_ROW_CEILING}); ${phrase} phrase-shape view(s), ceiling ` +
        `${PHRASE_SHAPE_CEILING}; ${article} article-shape arg(s), ceiling ` +
        `${ARTICLE_SHAPE_CEILING}; ${unnameable} unnameable good(s), ceiling ` +
        `${UNNAMEABLE_GOOD_CEILING}.`,
    );
    return;
  }

  for (const f of [...hard, ...censusR]) {
    console.error(`  ⚠ [${f.arm}] ${f.where}\n      ${f.detail}`);
  }
  for (const line of over) console.error(`  ⛔ ${line}`);
  for (const line of slack) console.error(`  ⭐ ${line}`);
  if (over.length > 0 || hard.length > 0 || censusR.length > 0) {
    console.error(
      "\n⚠⚠ Each of these fails CLOSED and SILENT. A view no static names\n" +
        "  is dead YAML and its verb is simply unknown; a row nothing\n" +
        "  reaches is content no player can meet. The chandlery shipped a\n" +
        "  whole trade that way, and its own drive passed.\n\n" +
        "  Run with --list to see every view's conferrer and every row's\n" +
        "  mechanism.",
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-reachability.ts")) {
  main();
}
