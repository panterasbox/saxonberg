/**
 * check-location-graph — ⭐⭐ **is the world's shape sound, before
 * anybody boots it?**
 *
 * The five things `location-graph-slate` says must be true of the graph,
 * checked over the ROWS ON DISK. That ordering is the point: the worst
 * failure in this family is a **dangling exit, which is a boot crash**
 * (`Exitable._applyExitSpec` → `StuffApi.singleton` →
 * *Template not found*), and an author who learns about it from a boot
 * crash learns it at the worst possible moment, from a stack trace that
 * names the framework rather than their row. A file-level gate tells
 * them the row and the direction before any process starts.
 *
 * ⭐ **The rules live in `lib/location/GraphInvariants.ts`, not here.**
 * `NavigationLogic.checkGraph` runs the same instance over the projected
 * nodes at runtime, so a CMS save answers in the same request. Two
 * copies would drift, and a gate and a runtime check disagreeing about
 * what a dangling exit is reads as neither of them being wrong.
 *
 * ⚠⚠ **A place is derived, never listed.** A row is a place iff its
 * effective class extends a Location root AND composes `SingletonMixin`
 * — *one row IS one place*. Every other location row is a **KIND**,
 * minted many times through a warren or a programme, and is not a node.
 * The derivation walks the class file through mixin calls
 * (`pack-roots.extendsAny`), so a pack's own room class is found; an
 * enumerated list here would silently stop seeing them, which is how a
 * gate becomes a gate-shaped comment.
 *
 * ⚠ And **place rows are NOT all under a `/location/` segment** —
 * `/world/terminus/counting-houses/banking-hall`,
 * `/world/terminus/general-store/shop-floor` and
 * `/world/terminus/mayfield-row/seznick-house/corridor` predate the path
 * pattern. Enumerating by path infix would skip them. By class, always.
 *
 * ⭐ **Census-then-ratchet for the three question rules.** A one-way
 * passage is legitimate content and an author must be able to ship one,
 * so plain asymmetry, a one-sided cross-zone edge and an unreachable
 * room are COUNTED against ceilings that may fall and never rise. The
 * three error rules have no ceiling: they are not questions.
 *
 * CI-gating; self-enrols, because `lint:family` derives its roster from
 * `package.json`.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { resolve } from "path";
import YAML from "yaml";
import {
  CONTENT,
  SERVER_SRC,
  classFileOf,
  composesMixin,
  effectiveRow,
  extendsAny,
  inheritanceIndex,
  packSources,
  type InheritanceIndex,
  type TemplateRow,
} from "./pack-roots";
import {
  GRAPH_RULES,
  GraphInvariants,
  type GraphEdge,
  type GraphFinding,
  type GraphNode,
  type GraphRule,
} from "../src/mud/lib/location/GraphInvariants";

const EXIT_ON_FINDINGS = true; // CI-gating

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The kernel's location roots. A pack's own room class extends one of
 * these and the walk finds it; the two `lib/` spellings are both live
 * (the abstract base and its concrete twin share a name).
 */
const LOCATION_ROOTS = [
  "/lib/stuff/Location",
  "/platform/location/CartesianLocation",
  "/platform/location/SingletonCartesianLocation",
  "/platform/location/FurnishableRoom",
  "/lib/location/CartesianLocation",
  "/lib/location/SphericalLocation",
  "/platform/location/SphericalLocation",
  "/platform/location/SingletonSphericalLocation",
];

/** The kernel's spatial-zone roots — derived onward, never listed. */
const ZONE_ROOTS = [
  "/platform/idea/location/CartesianZone",
  "/platform/idea/location/SphericalZone",
];

/**
 * ⚠ Today's counts, as ceilings — **measured, not guessed**. They may
 * FALL and never rise. A ceiling set above the real number is a hole in
 * the ratchet, which is this family's documented failure mode (*gates
 * ship broken and silently pass*), so these are exactly what the first
 * run reported on 2026-10-05.
 *
 * ⚠⚠ **`unreachable-from-entrance` has false positives BY
 * CONSTRUCTION, and that is why it is a census rather than an error.**
 * This gate reads rows, and **code-installed exits are not in rows** —
 * a warren's hub exits, a `DormDoor`, a `FloorStairExit` are all wired
 * in TypeScript. So a zone reached only through a code-installed door
 * reads as having no entrance. Eleven of the thirteen are that: trade
 * venue interiors and locality cellars. The rule still earns its place,
 * because the count may not GROW — a genuinely orphaned new room shows
 * up as a rise — and because the two real findings in the first run
 * (`/world/terminus/market/offstage`, and the `destination-is-a-kind`
 * pair) were both news.
 */
export const CEILINGS: Readonly<Record<GraphRule, number | null>> = {
  "dangling-destination": null, // an error: no ceiling, ever
  "bidirectional-both-sides": null,
  "published-into-unpublished": null,
  "cross-zone-one-sided": 1,
  "unreachable-from-entrance": 13,
  "asymmetric-edge": 4,
  "destination-is-a-kind": 2,
};

/** Is this row's effective class a place-or-kind location at all? */
function isLocationClass(classPath: string): boolean {
  return extendsAny(classPath, LOCATION_ROOTS);
}

/** Is this row's effective class a spatial zone? */
function isZoneClass(classPath: string): boolean {
  return extendsAny(classPath, ZONE_ROOTS);
}

/** One place per row: the `SingletonMixin` test. */
function isSingletonClass(classPath: string): boolean {
  return composesMixin(classPath, "SingletonMixin", packSources());
}

/** `[dir, edge]` for every authored exit on a row's effective data. */
function edgesOf(data: Record<string, unknown>): GraphEdge[] {
  const raw = data.exits;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: GraphEdge[] = [];
  for (const [dir, spec] of Object.entries(raw as Record<string, unknown>)) {
    if (!spec || typeof spec !== "object") continue;
    const s = spec as Record<string, unknown>;
    const dest = typeof s.destination === "string" ? s.destination : null;
    out.push({
      dir,
      to: dest,
      toPath: dest,
      ...(s.bidirectional === true ? { bidirectional: true } : {}),
      ...(s.oneWay === true ? { oneWay: true } : {}),
    });
  }
  return out;
}

/** The nearest ancestor path of `path` that is a zone row. */
function zoneOf(path: string, zoneRows: ReadonlySet<string>): string | null {
  const segs = path.split("/").filter(Boolean);
  for (let i = segs.length; i > 0; i--) {
    const candidate = "/" + segs.slice(0, i).join("/");
    if (zoneRows.has(candidate)) return candidate;
  }
  return null;
}

/**
 * `published` per extent, from every pack's `requires.title[]`. Absent
 * means published: `lint:untitled` already forbids shipping an untitled
 * path, and a claim that says nothing about publication is live content.
 */
function publishedByExtent(): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const pack of packSources()) {
    const manifest = join(pack.srcDir, "..", "pack.yaml");
    if (!existsSync(manifest)) continue;
    let raw: unknown;
    try {
      raw = YAML.parse(readFileSync(manifest, "utf8"));
    } catch {
      continue;
    }
    const claims = (raw as { requires?: { title?: unknown } })?.requires?.title;
    if (!Array.isArray(claims)) continue;
    for (const claim of claims) {
      if (!claim || typeof claim !== "object") continue;
      const c = claim as { extent?: unknown; published?: unknown };
      if (typeof c.extent !== "string") continue;
      out.set(c.extent, c.published !== false);
    }
  }
  return out;
}

/** The longest claimed extent covering `path`, and its published flag. */
function publishedAt(path: string, claims: ReadonlyMap<string, boolean>): boolean {
  let best: string | null = null;
  for (const extent of claims.keys()) {
    if (path === extent || path.startsWith(extent + "/")) {
      if (best === null || extent.length > best.length) best = extent;
    }
  }
  return best === null ? true : (claims.get(best) ?? true);
}

/**
 * Every travel stop's arrival room — read as DATA, by field name
 * (`seatIn`), because the kernel names no pack class. A stop is an
 * entrance to its zone: you can arrive there without walking in.
 */
function travelSeats(rows: ReadonlyMap<string, TemplateRow>): Set<string> {
  const out = new Set<string>();
  for (const row of rows.values()) {
    const data = (row.raw.data ?? {}) as Record<string, unknown>;
    if (typeof data.seatIn === "string" && Array.isArray(data.routes)) {
      out.add(data.seatIn);
    }
  }
  return out;
}

/**
 * ⭐ Every expanse node's landing — read as DATA, by field name, the
 * `seatIn` way (maritime): a node row carrying `kind: place | passage`
 * and a `destination` names the room behind a point on a sea, and you
 * arrive in that room by setting a course and going `ashore`, which is a
 * code-resolved edge no row can show. So the landing is an entrance to
 * its zone exactly as a travel stop is.
 */
function seaLandings(rows: ReadonlyMap<string, TemplateRow>): Set<string> {
  const out = new Set<string>();
  for (const row of rows.values()) {
    const data = (row.raw.data ?? {}) as Record<string, unknown>;
    if ((data.kind === "place" || data.kind === "passage") && typeof data.destination === "string") {
      out.add(data.destination);
    }
  }
  return out;
}

/** The default start location, which is an entrance wherever it lies. */
function defaultStart(): string | null {
  const file = join(SERVER_SRC, "mud", "lib", "config", "AppSettings.ts");
  if (!existsSync(file)) return null;
  const m = /defaultStartLocation[^=]*=\s*['"]([^'"]+)['"]/.exec(
    readFileSync(file, "utf8"),
  );
  return m?.[1] ?? null;
}

export interface GraphScan {
  nodes: GraphNode[];
  kinds: Set<string>;
  findings: GraphFinding[];
}

/** Build the graph from the rows on disk and run the invariants. */
export function scanLocationGraph(idx: InheritanceIndex = inheritanceIndex()): GraphScan {
  // ⚠⚠ `idx.rules` is not decoration. Without it `effectiveRow` merges
  // EVERY field with `replace`, so a child row replaces its parent's
  // lists rather than substituting by entry. Measured when this was
  // fixed: zero rows read differently today, because `exits` declares
  // `inherit: 'never'` and no place row inherits one — but the next
  // row that does would have been read wrong, silently. The helper's
  // own header warns about this exact failure and three of its four
  // callers already passed the rules; this was the fourth.
  const rows = idx.rows;
  const claims = publishedByExtent();
  const seats = travelSeats(rows);
  const landings = seaLandings(rows);
  const start = defaultStart();

  const zoneRows = new Set<string>();
  const places: Array<{ row: TemplateRow; data: Record<string, unknown> }> = [];
  const kinds = new Set<string>();

  for (const row of rows.values()) {
    const eff = effectiveRow(row.path, rows, idx.rules);
    if (!eff.class) continue;
    if (isZoneClass(eff.class)) {
      zoneRows.add(row.path);
      continue;
    }
    if (!isLocationClass(eff.class)) continue;
    if (isSingletonClass(eff.class)) places.push({ row, data: eff.data });
    else kinds.add(row.path);
  }

  const nodes: GraphNode[] = places.map(({ row, data }) => {
    const edges = edgesOf(data);
    const zone = zoneOf(row.path, zoneRows);
    return {
      identity: row.path,
      template: row.path,
      zone,
      address: typeof data._address === "string" ? data._address : null,
      published: publishedAt(row.path, claims),
      entrance: seats.has(row.path) || landings.has(row.path) || row.path === start,
      edges,
    };
  });

  // A node is also an entrance when a cross-zone edge leads INTO it:
  // somebody can walk in from the next zone over.
  const byIdentity = new Map(nodes.map((n) => [n.identity, n]));
  for (const node of nodes) {
    for (const edge of node.edges) {
      const far = edge.to ? byIdentity.get(edge.to) : undefined;
      if (!far || !far.zone || far.zone === node.zone) continue;
      far.entrance = true;
    }
  }

  const findings = new GraphInvariants(nodes, kinds).findings();
  return { nodes, kinds, findings };
}

/**
 * ⭐⭐ **A way that CLOSES must say so on its kind row.**
 *
 * The `location_graph` projection is a projection of authored content,
 * so it cannot know whether the ford at Kestrel is flooded right now —
 * and should not. What it CAN carry is that the way is *the kind that
 * closes*, which is what a route plan owes the person reading it. The
 * flag is `conditional: true` on the exit-kind row, and this is the
 * check that an author cannot forget it.
 *
 * ⚠⚠ **Phrased BY SHAPE, deliberately, and not as "extends
 * `FordExit`".** A kind row whose class overrides `applyTraversal`
 * *and* names `blocked` is a way that closes itself at the traverse,
 * whatever it is called. This is a KERNEL gate and `FordExit` is the
 * transport pack's class; a kernel gate enumerating a pack's classes
 * is the coupling this repo refuses everywhere else, and the lane
 * compile already demonstrated the alternative by asking for the
 * refresh protocol by shape. ⭐ A tidal causeway is then caught with
 * no kernel edit at all.
 *
 * ⚠ The honest residue: a conditional class that closes by some means
 * other than `blocked` plans with no caveat until this shape test is
 * widened. That is a content rule with a gate, which is the shape this
 * repo accepts for authored facts.
 */
function conditionalKindFindings(idx: InheritanceIndex): string[] {
  const sources = packSources();
  const out: string[] = [];
  // ⚠ Memoised BY CLASS PATH: 1,500-odd rows name a couple of hundred
  // distinct classes, so a read per ROW would be an order of magnitude
  // of wasted I/O. Measured: this rule costs ~6s on a gate that
  // already took ~45s (44.8s → 51.3s), which is the whole reason it
  // reads rows rather than standing a world up.
  const closes = new Map<string, boolean>();
  const closesItself = (classPath: string): boolean => {
    const memo = closes.get(classPath);
    if (memo !== undefined) return memo;
    let verdict = false;
    try {
      const source = readFileSync(classFileOf(classPath, sources), "utf8");
      verdict =
        /\bapplyTraversal\s*\(/.test(source) && /\bblocked\b/.test(source);
    } catch {
      verdict = false;
    }
    closes.set(classPath, verdict);
    return verdict;
  };
  for (const row of idx.rows.values()) {
    const eff = effectiveRow(row.path, idx.rows, idx.rules);
    if (!eff.class) continue;
    if (!closesItself(eff.class)) continue;
    if (eff.data.conditional === true) continue;
    out.push(
      `${row.path} — class ${eff.class} closes itself at the traverse ` +
        `(it overrides \`applyTraversal\` and names \`blocked\`), so the ` +
        `row must declare \`conditional: true\`. Without it the index ` +
        `carries no caveat and a route plan over this way says nothing ` +
        `about the fact that it is not always there.`,
    );
  }
  return out;
}

function main(): void {
  const report = process.argv.includes("--report");
  // ⚠ ONE index for the whole run — building it walks every authored
  // YAML in the repo, so the second build this rule would otherwise
  // need is pure waste.
  const idx = inheritanceIndex();
  const { nodes, findings } = scanLocationGraph(idx);
  const counts = new Map<GraphRule, number>();
  for (const f of findings) counts.set(f.rule, (counts.get(f.rule) ?? 0) + 1);

  console.log(
    `check-location-graph: ${nodes.length} place(s), ` +
      `${nodes.reduce((n, x) => n + x.edges.length, 0)} edge(s)`,
  );

  let failed = false;
  for (const rule of GRAPH_RULES) {
    const n = counts.get(rule) ?? 0;
    const ceiling = CEILINGS[rule];
    const over = ceiling === null ? n > 0 : n > ceiling;
    const label = ceiling === null ? "error" : `ceiling ${ceiling}`;
    console.log(`  ${over ? "✖" : "ok"} ${rule.padEnd(32)} ${n} (${label})`);
    if (over) failed = true;
  }

  const show = findings.filter((f) => {
    const ceiling = CEILINGS[f.rule];
    return report || ceiling === null || (counts.get(f.rule) ?? 0) > ceiling;
  });
  if (show.length > 0) {
    console.error("");
    for (const f of show) {
      console.error(
        `  ${f.severity === "error" ? "✖" : "·"} ${f.path}` +
          `${f.dir ? ` [${f.dir}]` : ""} — ${f.detail}`,
      );
    }
  }

  const conditionals = conditionalKindFindings(idx);
  console.log(
    `  ${conditionals.length > 0 ? "✖" : "ok"} ` +
      `${"conditional-kind-undeclared".padEnd(32)} ` +
      `${conditionals.length} (error)`,
  );
  if (conditionals.length > 0) {
    failed = true;
    console.error("");
    for (const c of conditionals) console.error(`  ✖ ${c}`);
  }

  if (failed) {
    console.error(
      `\nA dangling destination is a BOOT CRASH an author cannot see\n` +
        `coming (\`Exitable._applyExitSpec\` → \`StuffApi.singleton\` →\n` +
        `"Template not found"). The question rules are ratchets: they may\n` +
        `fall, never rise. See docs/subsystems/location-graph.md.`,
    );
    process.exit(EXIT_ON_FINDINGS ? 1 : 0);
  }
  console.log(`\ncheck-location-graph: the world's shape is sound ✔`);
  process.exit(0);
}

// Run only when invoked as a script — the unit test imports the pure
// scan (the check-person-keys precedent).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
