/**
 * check-graph-walks — the hand-written-graph-walk census, then its
 * ratchet (the `check-object-verbs` pattern: measure, gate today's
 * count as the ceiling, let a later wave drive it down).
 *
 * ⭐ The doctrine this instrument serves: **one traversal, or none.**
 * The routing build (`docs/plans/routing-plan.md` D11) found ten
 * hand-written walks over the location graph, each with its own
 * frontier, its own visited set and its own bound — four of them
 * order-dependent in ways players can perceive. The skeleton is
 * `src/mud/lib/location/Traversal.ts`; every other walk is a copy of
 * machinery that now exists once.
 *
 * ## Check 1 — the census
 *
 * A function body is a walk when it contains ALL THREE:
 *
 *   1. a FRONTIER THAT GROWS — a call to the enclosing function's own
 *      name (recursion), or a loop whose body inserts into a
 *      collection the loop itself consumes (`while (q.length) { …
 *      q.push(…) }`, or the `frontier = next` level-BFS shape);
 *   2. a VISITED SET — one identifier receiving both `.has(` and
 *      `.add(`/`.set(` inside the body;
 *   3. an ADJACENCY READ — `getExits`, `getObviousExits`,
 *      `obviousExitsFor`, `getObviousNeighbours`, `.edges`,
 *      `adjacency.get`, `succ.get`, `destinationsOf`, `neighboursOf`
 *      — read off the AST, never the source text.
 *
 * All three, in one function body, is the shape — any two of them is
 * ordinary code. The detector is deliberately NOT tuned to a target
 * count: a census is measured, not guessed (plan § Risks 9). An
 * out-of-scope hit stays in the residue with its reason in
 * `RESIDUE_REASONS`, which is the visible-diff list.
 *
 * ⚠⚠ **Both sharpenings were paid for by false positives**, and they
 * are the whole difference between a census and a noise generator.
 * The first run over the tree flagged fourteen sites; three were not
 * walks at all:
 *
 *   - `api/mql/scope-walk.ts` and `api/mql/resolver.ts` iterate ONE
 *     room's own doors and exits with a dedupe `Set`. A dedupe set in
 *     a loop over a FIXED list never leaves the room — the frontier
 *     does not grow, so it is not a traversal.
 *   - `platform/idea/api/ParcelLogic.ts` matched `.edges` **inside a
 *     doc comment** (`{'edges.to': 1}`, explaining the index). A
 *     source-text probe reads prose; the AST does not.
 *
 * ## Check 2 — the core's import allowlist (no ceiling, an error)
 *
 * The routing core — `Traversal`, `KnowledgeGraph`, `TravelProfile`,
 * `RoutePlan` — must not be able to REACH the world index. The
 * evidence firewall (`docs/subsystems/location-graph.md`) is a
 * structural property, not a convention honoured by the careful: a
 * per-player map plans over CLAIMS, and a module that cannot import
 * the registry cannot accidentally consult it. The map writer
 * (`Cartographer`) already has this property; this check extends it
 * to the reader.
 *
 * Standalone script (the `check-object-verbs` precedent — ESLint 8
 * legacy config cannot load a local rule without `--rulesdir`).
 */

import { readFileSync } from "fs";
import { relative } from "path";
import ts from "typescript";
import { MUD, SERVER_SRC, packSources, packSrcFiles } from "./pack-roots";

/**
 * ⭐⭐ The ceiling. It may FALL and never RISE.
 *
 * Measured by this script's own first run (W0 of the routing build),
 * then driven down wave by wave as each walk moved onto `Traversal`.
 * The residue is enumerated in `RESIDUE_REASONS` — a site with no
 * reason there is a walk nobody has justified.
 */
export const WALK_CEILING = 2;

/**
 * The one file that is allowed to BE a walk, plus the sites whose
 * residue is a decision rather than an omission. Keyed by the
 * `src`-relative path (kernel) or `<pack>/src`-relative path.
 */
const RESIDUE_REASONS: Record<string, string> = {};

/**
 * ⭐ **`Traversal.ts` needs no allowlist entry, and that is the right
 * answer rather than a lucky one.** The skeleton's own frontier reads
 * `spec.neighbours(node, depth)` — a callback — so it fails evidence 3
 * and the detector never sees it. The skeleton is a *generic* walk;
 * what this gate counts is walks that know about **exits and edges**,
 * and the whole point of the migration is that only the callers know
 * that now. An allowlist would have hidden a real regression: if
 * `Traversal` ever grew a direct `getExits()` call, it SHOULD be
 * counted.
 */

/**
 * ⚠ `platform/idea/api/FireLogic.ts` is NOT in this census, and the
 * requirements' survey was right to exclude it: fire spread walks
 * CONTENTS and ignition sources, never the location graph's edges, so
 * it fails evidence 3 and the detector never sees it. `Traversal` is
 * generic over its node type and a containment `neighbours` is one
 * function away, but that is the combustion build's decision
 * (routing-requirements § Non-goals — containment-graph walks).
 */

/**
 * The adjacency reads that make a growing loop a GRAPH walk. Matched
 * as property NAMES off the AST — `edges` as a property access,
 * everything else as a call — so a doc comment explaining the
 * `{'edges.to': 1}` index is not a graph walk.
 */
const ADJACENCY_CALLS = new Set<string>([
  "getExits",
  "getObviousExits",
  "obviousExitsFor",
  "getObviousNeighbours",
  "destinationsOf",
  "neighboursOf",
]);

/** `<expr>.edges`, `adjacency.get(…)`, `succ.get(…)`. */
const ADJACENCY_PROPS = new Set<string>(["edges"]);
const ADJACENCY_RECEIVERS = new Set<string>(["adjacency", "succ"]);

/** The core modules whose import list is gated by check 2. */
const CORE_MODULES = [
  "mud/lib/location/Traversal.ts",
  "mud/lib/location/KnowledgeGraph.ts",
  "mud/lib/location/TravelProfile.ts",
  "mud/lib/location/RoutePlan.ts",
];

/**
 * What a core module may import. Everything else — `PlaceNode`, the
 * registry, `DocumentApi`, `StuffApi`, anything under `api/` — is an
 * error with no ceiling.
 */
const CORE_IMPORT_ALLOWLIST = [
  "./GraphInvariants",
  "./MapClaim",
  "./TravelProfile",
  "./RoutePlan",
  "./KnowledgeGraph",
  "./Traversal",
];

export interface Walk {
  file: string;
  line: number;
  fn: string;
  frontier: string;
  visited: string;
  adjacency: string;
}

/** The enclosing function's own name, for the recursion test. */
function nameOf(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name && ts.isIdentifier(node.name) ? node.name.text : null;
  }
  if (ts.isFunctionExpression(node)) {
    return node.name ? node.name.text : null;
  }
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    node.parent &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text;
  }
  if (
    ts.isArrowFunction(node) &&
    node.parent &&
    ts.isPropertyDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text;
  }
  return null;
}

/**
 * Evidence 1 — a frontier **that grows**. Either the function calls
 * itself (recursion), or a loop body inserts into a collection the
 * loop itself consumes: directly (`while (q.length) { q.push(…) }`,
 * `for (const n of frontier) { frontier.push(…) }`) or through the
 * level-BFS reassignment (`next.push(…); … frontier = next`).
 *
 * ⭐ This is what separates a traversal from a dedupe: a `for (const
 * door of room.getExitDoors())` with a `seen` Set iterates a FIXED
 * list and never reaches a second room.
 */
function frontierGrowsIn(body: ts.Node, ownName: string | null): string | null {
  // Recursion first — the three modality walks and the gather.
  let recursive = false;
  const lookRecursion = (n: ts.Node): void => {
    if (recursive) return;
    if (isNestedFunction(n, body)) return;
    if (ownName && ts.isCallExpression(n) && callTargetName(n.expression) === ownName) {
      recursive = true;
      return;
    }
    ts.forEachChild(n, lookRecursion);
  };
  ts.forEachChild(body, lookRecursion);
  if (recursive) return `recursion (${ownName})`;

  let found: string | null = null;
  const lookLoops = (n: ts.Node): void => {
    if (found) return;
    if (isNestedFunction(n, body)) return;
    if (isLoop(n)) {
      const grown = growsIn(n);
      if (grown) {
        found = `${ts.SyntaxKind[n.kind].replace(/Statement$/, "").toLowerCase()} over ${grown}`;
        return;
      }
    }
    ts.forEachChild(n, lookLoops);
  };
  ts.forEachChild(body, lookLoops);
  return found;
}

function isLoop(n: ts.Node): n is ts.IterationStatement {
  return (
    ts.isForStatement(n) ||
    ts.isForOfStatement(n) ||
    ts.isForInStatement(n) ||
    ts.isWhileStatement(n) ||
    ts.isDoStatement(n)
  );
}

/**
 * The collection this loop both FEEDS and CONSUMES, or null. A
 * collection fed inside the body counts as consumed when the loop's
 * own header mentions it, or when a name the header mentions is
 * reassigned from it in the body (the `frontier = next` shape).
 */
function growsIn(loop: ts.IterationStatement): string | null {
  const fed = new Set<string>();
  const consumed = new Set<string>();
  const assignedFrom = new Map<string, Set<string>>();

  // What the loop's own header reads.
  const header: ts.Node[] = [];
  if (ts.isForStatement(loop)) {
    for (const part of [loop.initializer, loop.condition, loop.incrementor]) {
      if (part) header.push(part);
    }
  } else if (ts.isForOfStatement(loop) || ts.isForInStatement(loop)) {
    header.push(loop.expression);
  } else if (ts.isWhileStatement(loop) || ts.isDoStatement(loop)) {
    header.push(loop.expression);
  }
  // ⭐ A nested-loop level BFS is ONE frontier: the outer loop counts
  // the levels and the inner one drains the frontier, so the inner
  // loop's header is part of what the outer loop consumes. Without
  // this, `for (let d = 0; d < N; d++) { for (const n of frontier) …;
  // frontier = next; }` reads as two unrelated loops.
  const nestedHeaders = (n: ts.Node): void => {
    if (isLoop(n) && n !== loop) {
      if (ts.isForOfStatement(n) || ts.isForInStatement(n)) header.push(n.expression);
      else if (ts.isWhileStatement(n) || ts.isDoStatement(n)) header.push(n.expression);
      else if (ts.isForStatement(n)) {
        for (const part of [n.initializer, n.condition, n.incrementor]) {
          if (part) header.push(part);
        }
      }
    }
    ts.forEachChild(n, nestedHeaders);
  };
  nestedHeaders(loop.statement);

  for (const h of header) {
    const collect = (n: ts.Node): void => {
      if (ts.isIdentifier(n)) consumed.add(n.text);
      ts.forEachChild(n, collect);
    };
    collect(h);
  }

  const lookBody = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ts.isIdentifier(n.expression.name) &&
      ["push", "unshift", "add", "set", "enqueue"].includes(n.expression.name.text)
    ) {
      fed.add(n.expression.expression.getText());
    }
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(n.left)
    ) {
      const sources = new Set<string>();
      const collect = (m: ts.Node): void => {
        if (ts.isIdentifier(m)) sources.add(m.text);
        ts.forEachChild(m, collect);
      };
      collect(n.right);
      assignedFrom.set(n.left.text, sources);
    }
    ts.forEachChild(n, lookBody);
  };
  lookBody(loop.statement);

  for (const f of fed) if (consumed.has(f)) return f;
  // `next.push(…)` + `frontier = next`, where the header reads `frontier`.
  for (const [target, sources] of assignedFrom) {
    if (!consumed.has(target)) continue;
    for (const s of sources) if (fed.has(s)) return `${target} ← ${s}`;
  }
  return null;
}

function callTargetName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
    return expr.name.text;
  }
  return null;
}

function isNestedFunction(n: ts.Node, body: ts.Node): boolean {
  if (n === body) return false;
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isFunctionExpression(n) ||
    ts.isArrowFunction(n) ||
    ts.isMethodDeclaration(n)
  );
}

/**
 * Evidence 2 — a visited set: one identifier (or one property access)
 * receiving both a membership test and an insert in this body.
 */
function visitedIn(body: ts.Node): string | null {
  const tested = new Set<string>();
  const inserted = new Set<string>();
  const look = (n: ts.Node): void => {
    if (isNestedFunction(n, body)) return;
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ts.isIdentifier(n.expression.name)
    ) {
      const method = n.expression.name.text;
      const receiver = n.expression.expression.getText();
      if (method === "has") tested.add(receiver);
      else if (method === "add" || method === "set") inserted.add(receiver);
    }
    ts.forEachChild(n, look);
  };
  ts.forEachChild(body, look);
  for (const r of tested) if (inserted.has(r)) return r;
  return null;
}

/**
 * Evidence 3 — an adjacency read, off the AST. A call to one of the
 * known neighbour readers, an `.edges` property access, or
 * `adjacency.get` / `succ.get`.
 */
function adjacencyIn(body: ts.Node): string | null {
  let found: string | null = null;
  const look = (n: ts.Node): void => {
    if (found) return;
    if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.name)) {
      const name = n.name.text;
      if (ADJACENCY_PROPS.has(name)) {
        found = `.${name}`;
        return;
      }
      if (
        name === "get" &&
        ADJACENCY_RECEIVERS.has(lastNameOf(n.expression) ?? "")
      ) {
        found = `${lastNameOf(n.expression)}.get`;
        return;
      }
      if (
        ADJACENCY_CALLS.has(name) &&
        n.parent &&
        ts.isCallExpression(n.parent) &&
        n.parent.expression === n
      ) {
        found = `${name}()`;
        return;
      }
    }
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      ADJACENCY_CALLS.has(n.expression.text)
    ) {
      found = `${n.expression.text}()`;
      return;
    }
    ts.forEachChild(n, look);
  };
  ts.forEachChild(body, look);
  return found;
}

/** The trailing identifier of `a.b.c` — `c`. */
function lastNameOf(expr: ts.Node): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
    return expr.name.text;
  }
  return null;
}

export function scanSource(
  file: string,
  source: string,
  label: string
): Walk[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
  const out: Walk[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    ) {
      const body = node.body;
      if (body) {
        const own = nameOf(node);
        const frontier = frontierGrowsIn(body, own);
        const visited = frontier ? visitedIn(body) : null;
        const adjacency = visited ? adjacencyIn(body) : null;
        if (frontier && visited && adjacency) {
          out.push({
            file: label,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            fn: own ?? "<anonymous>",
            frontier,
            visited,
            adjacency,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return out;
}

/** Check 2 — a core module may import only from the allowlist. */
function coreImportViolations(): string[] {
  const out: string[] = [];
  for (const rel of CORE_MODULES) {
    const file = `${SERVER_SRC}/${rel}`;
    let source: string;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue; // not written yet — W2/W6 add them
    }
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
    for (const stmt of sf.statements) {
      if (!ts.isImportDeclaration(stmt)) continue;
      if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
      const spec = stmt.moduleSpecifier.text;
      if (CORE_IMPORT_ALLOWLIST.includes(spec)) continue;
      // A type-only import of a kernel vocabulary is still a reach.
      out.push(
        `  ${rel}:${
          sf.getLineAndCharacterOfPosition(stmt.getStart()).line + 1
        }  imports "${spec}"`
      );
    }
  }
  return out;
}

function kernelFiles(): string[] {
  return packSrcFiles(MUD).filter((f) => !f.includes("/__tests__/"));
}

function main(): void {
  const gate = !process.argv.includes("--advisory");
  const walks: Walk[] = [];

  for (const file of kernelFiles()) {
    walks.push(
      ...scanSource(file, readFileSync(file, "utf8"), relative(SERVER_SRC, file))
    );
  }
  for (const pack of packSources()) {
    for (const file of packSrcFiles(pack.srcDir)) {
      if (file.includes("/__tests__/")) continue;
      walks.push(
        ...scanSource(
          file,
          readFileSync(file, "utf8"),
          `${pack.id}/src/${relative(pack.srcDir, file)}`
        )
      );
    }
  }

  walks.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const w of walks) {
    const reason = RESIDUE_REASONS[w.file];
    console.log(
      `  ${w.file}:${w.line}  ${w.fn}()  ` +
        `[frontier: ${w.frontier} · visited: ${w.visited} · ` +
        `adjacency: ${w.adjacency}]`
    );
    if (reason) console.log(`      residue: ${reason}`);
  }

  const imports = coreImportViolations();
  if (imports.length > 0) {
    console.error(
      "\ncheck-graph-walks: the routing core reached outside its allowlist —"
    );
    for (const line of imports) console.error(line);
  }

  console.log(
    `\ncheck-graph-walks: ${walks.length} hand-written graph walk(s) ` +
      `(ceiling ${WALK_CEILING}); ` +
      `${CORE_MODULES.length} core module(s) gated, ` +
      `${imports.length} import violation(s).`
  );

  let failed = false;
  if (gate && walks.length > WALK_CEILING) {
    console.error(
      `check-graph-walks: ${walks.length} walks exceeds the ceiling of ` +
        `${WALK_CEILING}. One traversal, or none — the skeleton is ` +
        `src/mud/lib/location/Traversal.ts. A walk that genuinely does ` +
        `not belong on it goes in RESIDUE_REASONS with its reason, and ` +
        `the ceiling moves in the same diff.`
    );
    failed = true;
  }
  if (gate && imports.length > 0) {
    console.error(
      "check-graph-walks: the evidence firewall is structural. A core " +
        "module that can import the index can consult it by accident; " +
        "a per-player map plans over CLAIMS."
    );
    failed = true;
  }
  if (failed) process.exit(1);
}

if (process.argv[1] && /check-graph-walks\.ts$/.test(process.argv[1])) {
  main();
}
