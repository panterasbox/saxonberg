/**
 * check-template-scans — ⭐⭐ **the ratchet on finding content by search.**
 *
 * The rule (the scan sweep, 2026-10-14): content is reached by following
 * an AUTHORED reference from what is already loaded — a room's `props:`,
 * the location graph's attachments, a holder's constituents — never by
 * searching the template table for rows that answer a question. A search
 * is what a reference pointing the wrong way forces: *which business
 * operates this room?* is a scan of every business; the graph's record of
 * each house's `operatingLocations`, read reversed, is a lookup.
 *
 * So every call that enumerates the table —
 * `Template.findByClass` · `findByPathInfix` · `findWhereDataHas` ·
 * `findDescendants` · `findByPathGlob` — in the kernel's `src/` and every
 * pack's `src/` (tests excluded, `Template.ts` itself excluded) must be on
 * {@link ALLOWLIST} with its reason, and the ceiling is the list's total.
 * Exact reads (`findByPath`, `findByPaths`) are not searches.
 *
 * The sanctioned homes are short: the location graph (the one index the
 * world keeps of its own shape), author tooling (a scan is a tool's job),
 * the installer, a typed-word dictionary's own lazy warm, a water system
 * compiling its own index of its courses, a structure's own members, and
 * the residency spawn sweep the unobserved economy keeps
 * (→ `docs/slates/builds/unobserved-economy-slate.md`).
 *
 * A file whose count FALLS below its allowance is stale and fails too —
 * lower the entry, the ratchet only moves down.
 *
 * Usage:
 *   tsx scripts/check-template-scans.ts            # CI gate
 *   tsx scripts/check-template-scans.ts --report   # every site
 */

import { readFileSync } from "fs";
import { relative, resolve } from "path";
import { MUD, packSources, packSrcFiles } from "./pack-roots";

/** The table-enumerating reads. */
export const SCAN =
  /Template\.(findByClass|findByPathInfix|findWhereDataHas|findDescendants|findByPathGlob)\s*(?:<[^>]*>)?\(/g;

export interface AllowEntry {
  /** Repo-relative file. */
  file: string;
  /** How many scan sites the file may hold. */
  count: number;
  /** Why a search is right here. */
  reason: string;
}

const LAZY_DICT =
  "a typed-word / keyed dictionary's own warm — built once on first use, never booted";
const TOOL = "author tooling — a scan is a tool's job";

/**
 * ⭐ Every sanctioned search, with its reason.
 */
export const ALLOWLIST: AllowEntry[] = [
  // ── the sanctioned index ──
  { file: "packages/server/src/mud/platform/idea/LocationGraphRegistry.ts", count: 1, reason: "the location graph — the one index the world keeps of its own shape" },
  // ── author tooling ──
  { file: "packages/server/src/mud/platform/idea/cmd/shell/LsController.ts", count: 2, reason: TOOL },
  { file: "packages/server/src/mud/platform/idea/cmd/shell/RmController.ts", count: 1, reason: TOOL },
  { file: "packages/server/src/mud/platform/idea/cmd/shell/GrepController.ts", count: 1, reason: TOOL },
  { file: "packages/server/src/mud/platform/idea/api/CmsLogic.ts", count: 1, reason: TOOL },
  { file: "packages/server/src/mud/platform/idea/api/SandboxLogic.ts", count: 1, reason: TOOL },
  { file: "packages/server/src/mud/lib/wiki/components/composition.ts", count: 1, reason: "the wiki composition page — " + TOOL },
  // ── the installer ──
  { file: "packages/server/src/mud/platform/idea/api/TemplateLogic.ts", count: 2, reason: "the template installer — reconciling the table is its job" },
  { file: "packages/server/src/backend/BootstrapManager.ts", count: 1, reason: "the boot sequencer expanding a prefix entry — boot itself, which lint:boot-entries holds" },
  // ── lazy dictionaries ──
  { file: "packages/server/src/mud/platform/idea/ReadingCatalogue.ts", count: 1, reason: LAZY_DICT },
  { file: "packages/server/src/mud/platform/idea/PlacementCatalogue.ts", count: 1, reason: LAZY_DICT },
  { file: "packages/server/src/mud/platform/idea/SpellCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/OperationCatalogue.ts", count: 1, reason: LAZY_DICT },
  { file: "packages/server/src/mud/platform/idea/JointCatalogue.ts", count: 1, reason: LAZY_DICT },
  { file: "packages/server/src/mud/platform/idea/DisciplineCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/HelpCatalogue.ts", count: 1, reason: LAZY_DICT },
  { file: "packages/server/src/mud/platform/idea/TopicCatalogue.ts", count: 2, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/CorpoCatalogue.ts", count: 2, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/GovernmentCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/AddressRegistry.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/FabricCatalogue.ts", count: 1, reason: LAZY_DICT },
  { file: "packages/server/src/mud/platform/idea/FractionScheduleCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/MaturationProfileCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/content/trade-dyeing/src/idea/DyestuffCatalogue.ts", count: 1, reason: LAZY_DICT },
  { file: "packages/server/src/mud/platform/idea/MaterialCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/BiomeCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  { file: "packages/server/src/mud/platform/idea/ConditionCatalogue.ts", count: 1, reason: "a dictionary's own warm — booted under the scan sweep's reader rule (read synchronously; no async seam before the read)" },
  // ── systems compiling their own index ──
  { file: "packages/content/water/src/idea/WatercourseCatalogue.ts", count: 2, reason: "the water system compiling its own keyed index of its courses (and the localities draining to them) — once, lazily, never booted" },
  { file: "packages/content/transport/src/idea/LaneCatalogue.ts", count: 2, reason: "the transport system compiling its own index of its lanes and service routes, under its own namespace — once, lazily" },
  { file: "packages/content/energy/src/idea/GridCatalogue.ts", count: 1, reason: "the energy system compiling its own feeder reachability, under its own namespace — once, lazily" },
  { file: "packages/server/src/mud/platform/idea/ShipWarren.ts", count: 1, reason: "an authored ship's warren adopting her own members — the rows under her own extent, which she owns (moved from Ship.ts with liveMembers, harbors B1)" },
  { file: "packages/server/src/mud/lib/expanse/Expanse.ts", count: 1, reason: "a sea compiling its own nodes and bands — the rows under its own extent, which it owns (Expanse.compile)" },
  // ── the wrong-way references the sweep flips ──
  { file: "packages/content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts", count: 1, reason: "an attribute match with no reference (a material → the trade's own product row), inside the trade's own namespace — the requirements' lazy-index case" },
  // ── the unobserved economy ──
  { file: "packages/server/src/mud/platform/idea/api/ResidencyLogic.ts", count: 1, reason: "the residency spawn sweep's censusKey read — the unobserved economy's faucet, kept by the scan sweep (→ unobserved-economy-slate)" },
];

/** ⚠ A fact about the past: the census the day the gate landed. */
export const CENSUS_AT_LANDING = 43;

/** ⭐ The ceiling — the allowlist's total. It may fall, never rise. */
export const TEMPLATE_SCAN_CEILING = ALLOWLIST.reduce((n, e) => n + e.count, 0);

export interface ScanSite {
  file: string;
  line: number;
  method: string;
}

/** Strip comments so prose that NAMES a scan is not counted as one. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Every scan site in `files`, by repo-relative path. */
export function sitesIn(files: string[], repoRoot: string): ScanSite[] {
  const out: ScanSite[] = [];
  for (const f of files) {
    if (!f.endsWith(".ts") || f.includes("__tests__")) continue;
    if (f.endsWith("/lib/stuff/Template.ts")) continue;
    const src = stripComments(readFileSync(f, "utf8"));
    if (!src.includes("Template.")) continue;
    for (const m of src.matchAll(SCAN)) {
      const line = src.slice(0, m.index ?? 0).split("\n").length;
      out.push({ file: relative(repoRoot, f), line, method: m[1]! });
    }
  }
  return out;
}

export function census(repoRoot: string): ScanSite[] {
  const files: string[] = [...packSrcFiles(resolve(MUD, ".."))];
  for (const s of packSources()) files.push(...packSrcFiles(s.srcDir));
  return sitesIn(files, repoRoot);
}

export function check(sites: ScanSite[], allow: AllowEntry[] = ALLOWLIST): string[] {
  const problems: string[] = [];
  const byFile = new Map<string, ScanSite[]>();
  for (const s of sites) byFile.set(s.file, [...(byFile.get(s.file) ?? []), s]);
  const allowed = new Map(allow.map((e) => [e.file, e]));
  for (const [file, list] of byFile) {
    const entry = allowed.get(file);
    if (!entry) {
      problems.push(
        `${file}:${list[0]!.line}  Template.${list[0]!.method}() searches the ` +
          `template table. Content is reached by following an authored ` +
          `reference — the place loads what the location graph attaches to ` +
          `it, a holder its constituents, a row what it names. A search is legitimate only in ` +
          `a sanctioned home; add one to ALLOWLIST with its reason only if ` +
          `this is one.`,
      );
    } else if (list.length > entry.count) {
      problems.push(
        `${file}  ${list.length} scan sites, allowed ${entry.count} — a new ` +
          `search in a file that already had one is still a new search`,
      );
    }
  }
  for (const e of allow) {
    const n = byFile.get(e.file)?.length ?? 0;
    if (n < e.count) {
      problems.push(
        `${e.file}  allowed ${e.count}, holds ${n} — lower the ALLOWLIST entry ` +
          `(or drop it); the ratchet only moves down`,
      );
    }
  }
  return problems;
}

function main(): void {
  const repoRoot = resolve(MUD, "../../../..");
  const sites = census(repoRoot);
  if (process.argv.includes("--report")) {
    for (const s of sites) console.log(`${s.file}:${s.line}  ${s.method}`);
    return;
  }
  const problems = check(sites);
  if (TEMPLATE_SCAN_CEILING > CENSUS_AT_LANDING) {
    problems.push(
      `the allowlist totals ${TEMPLATE_SCAN_CEILING}, above the landing ` +
        `census ${CENSUS_AT_LANDING} — a ceiling rise wants a CALLER AUDIT ` +
        `(docs/lint-family.md § ratchet lesson 4)`,
    );
  }
  if (problems.length > 0) {
    console.error(`\n[check-template-scans — ERROR] ${problems.length} finding(s):\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(
    `check-template-scans: ${sites.length}/${TEMPLATE_SCAN_CEILING} template-table ` +
      `searches, every one in a sanctioned home.`,
  );
}

if (process.argv[1] && /check-template-scans\.ts$/.test(process.argv[1])) main();
