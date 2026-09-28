/**
 * check-ground — ⭐⭐ **what is every room in the game standing on, and can
 * the list of rooms whose prose lies about it only get shorter?**
 *
 * ## Why
 *
 * The ground build gave every Location a floor and made that floor say what
 * it is made of. Two things then need watching, and neither is a test:
 *
 *   1. **The picture.** 184 Locations resolve their ground four different
 *      ways (an authored floor row, three words on the room, the ground
 *      beneath, the room-kind default). Nobody can hold that in their head,
 *      and a wrong answer is invisible from inside any one room.
 *   2. **The debt.** 69 rooms describe their ground in prose; **64 of them
 *      claim something nothing backs** — *boards*, *dust*, *grass*, *mud*,
 *      *underfoot*. That is the 1.0 content pass's work, not this build's.
 *      What this build owes is that the number **can only fall.**
 *
 * ## The two lists
 *
 * **List 1** (`--report`) is DERIVED: every Location row, how its ground is
 * decided, and the material when one is knowable statically.
 *
 * ⚠ Rung 3 — *the ground beneath* — cannot be resolved here, and saying so
 * is the honest reading rather than a gap: it needs a zone-citation walk and
 * a seed derived from the covering Locality's address, both runtime facts.
 * An on-grade default row is therefore reported as `default:on-grade`,
 * meaning *a `GroundSource` answers this at runtime, or the outdoor dial
 * does*. The drive is what reads those out loud.
 *
 * **List 2** is HAND-CURATED, because the alternative is worse. The claim
 * heuristic (`--seed`) greps prose for ground words, and prose is prose:
 * *"dust on the shelves"* is not a claim about the floor and *"the boards
 * creak"* is. `check-descriptor-banks.ts` already wrote down why a
 * prose-matching gate must not gate — *"a regex over authored English is a
 * guess, and a guess that fails a build is worse than no gate"* — so the
 * heuristic prints for curation and **never decides**. The curated list is
 * {@link UNBACKED_GROUND_CLAIMS} and its length is the ceiling.
 *
 * ## The clauses
 *
 *   (a) `UNBACKED_GROUND_CLAIMS.length <= UNBACKED_GROUND_CLAIMS_CEILING` —
 *       it may fall and may never rise.
 *   (b) every listed path resolves to a real Location row. A stale path is a
 *       row that moved or died, and a list full of ghosts measures nothing.
 *   (c) ⭐ a listed row that NOW authors a floor is **stale and fails** —
 *       remove the line and lower the ceiling. This is the clause that makes
 *       the meter move: paying the debt is what deletes the entry, and the
 *       gate refuses to let the credit go unrecorded.
 *   (d) ⚠⚠ every row whose `class:` composes `FloorMixin` carries **both**
 *       `ground` and `floor` in its own `keywords:`. This is not tidiness.
 *       The MQL scope walk pools a thing's own `getKeywords()`, and
 *       `pushDetails` gives a detail the pool `[<its id>]` and never its
 *       authored keyword list — so a floor's `details.floor.keywords:
 *       [ground]` is dead text, and a row that forgets the words up top is
 *       a floor `sit` cannot find. `FloorMixin` unions both onto the class
 *       so the failure is impossible; this clause makes every row read
 *       honestly on its own as well.
 *   (f) ⚠⚠ a `FloorMixin` row must NOT author a detail named `floor` or
 *       `ground`. **Found by the drive, not by review:** `look floor`
 *       resolved to the floor's own DETAIL, and a detail's description
 *       renders without the host's `markupAugmenters`, so the derived
 *       sentence naming the material never appeared — in the one place an
 *       author would look for it. The detail was a workaround for a floor
 *       not being addressable by its own name, and the keyword union
 *       retired the need for it. A detail naming a real sub-feature (the
 *       crossing's worn track, the yard's gutter) is the opposite case.
 *   (e) every Location class that overrides `postRegister` also chains
 *       `super.postRegister`. ⭐ The mixin's default is a NON-chaining
 *       no-op, so an override that forgets the call silently leaves its
 *       rooms with no floor and nothing else goes wrong. The kernel's
 *       roster test covers the kernel's classes; a pack's cannot be
 *       imported by a kernel test, so they are covered here.
 *
 * ## Usage
 *
 *   pnpm lint:ground              # the gate (clauses a–e)
 *   pnpm lint:ground --report     # list 1: every Location and its ground
 *   pnpm lint:ground --seed       # the claim heuristic, for curating list 2
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import {
  classPathOfFile,
  composesMixin,
  packSources,
  packSrcFiles,
  type PackSource,
  effectiveDoc,
  inheritanceIndex,
  type InheritanceIndex,
} from "./pack-roots";
import {
  GROUND_CLASS_PRECEDENCE,
  GROUND_KIND_FOLD,
  GROUND_TAG_CLASSES,
  type GroundKind,
  type GroundMaterialClass,
} from "../src/mud/lib/ground/GroundKind";

// ⚠ Template inheritance: a CHILD row states no `class:`, so selecting on
// the raw field skips it SILENTLY — which reads exactly like a pass. Every
// row this gate parses goes through `effectiveDoc` first.
let _inheritIdx: InheritanceIndex | null = null;
function inheritIdx(): InheritanceIndex {
  return (_inheritIdx ??= inheritanceIndex());
}


const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "..");
const MUD = join(SERVER, "src", "mud");
const CONTENT = join(SERVER, "..", "content");
const REPO = join(SERVER, "..", "..");

/**
 * ⚠⚠ **Rooms whose prose claims a ground nothing backs.** Hand-curated; see
 * the header for why a regex may not decide this.
 *
 * Each of these describes its floor in words — *boards*, *earth*, *grass*,
 * *dust underfoot* — and resolves its ground from a default rather than from
 * anything the author wrote. None of them is broken: every one has a floor
 * and every one can be sat on. What they lack is **agreement between the
 * prose and the ground**, and closing that is a content pass, not a
 * mechanism.
 *
 * ⭐ To pay one down: give the room a `floor: { material, worked }` (three
 * words) or an authored floor row if its ground has a feature worth looking
 * at, delete its line here, and lower the ceiling by one. Clause (c) fails
 * if you do the first without the last two, which is the point.
 *
 * ## The inclusion test, stated so the list can be argued with
 *
 * ⭐ **The room's prose names a floor MATERIAL or CONSTRUCTION, and the room
 * authors neither.** That is the test, and it is chosen because it is the one
 * that makes an entry actionable: paying it down is three words
 * (`floor: { material, worked }`) or a floor row when the ground has a
 * feature worth looking at.
 *
 * The `--seed` heuristic proposed **66**; this list is **28**. What the
 * curation removed, and why each is not a debt:
 *
 *   - **Idiom and simile.** *"rooms let by the floor"* (a storey), *"when
 *     they're not on the floor"*, *"a ledger the size of a paving slab"*.
 *   - **A trade FLOOR is a room, not a ground.** Six goods-yards rows are
 *     *named* `…/location/floor` and their prose describes the space — *"a
 *     hangar of a floor"*, *"a cool cellar under a trapdoor"*. Two of the six
 *     do name a material (tiled, wet stone) and those two ARE listed.
 *   - **Other things made of boards.** Bulletin boards in the Duncan Hall
 *     lobby; the boards over the Ferrow cage-bottom shaft; a chalked price
 *     board in the assay shed.
 *   - **Dust, sawdust and smells.** *"Dust has settled on the platform"*,
 *     *"smells of sawdust and spilled spirit"*. A state, not a surface.
 *   - **A detail's own floor.** The towpath's goods shed has *"a plank floor
 *     at cart-bed height"* — that is the shed's, and the shed is a detail.
 *   - ⭐ **Rooms whose ground the build now ANSWERS.** The mine's workings
 *     (`adit`, `fall`, `winze-head`, `hush/gallery`) say *"the floor"* with no
 *     material and resolve their host rock through rung 3 — slate near the
 *     surface, granite deep. That is not a debt; it is the mechanism working.
 *     The bench field likewise reads its own authored `GroundCharacter`.
 *   - ⚠ **Coverings.** Six rooms describe a **rug**, a **carpet** or
 *     **matting**. A covering is not what the floor IS — it is a layer above
 *     one, and *"the carpet is the specific grey of somewhere nobody
 *     lingers"* is honest prose about a thing this build does not model. They
 *     are a `Covering` seam (field-substrate slate), not a ground claim, and
 *     listing them here would make the meter measure two different debts.
 *
 * ⚠ `seznick-house/main` claims **boards** and, in the same sentence, light
 * coming through the gaps in them. One floor per Location; a second surface
 * is a detail. The content pass decides.
 */
export const UNBACKED_GROUND_CLAIMS: readonly string[] = [
  // ── the commons ──
  '/stuff/location/room/bathroom',                    // "a small TILED room"
  '/trade/distilling/location/warehouse',             // "the CONCRETE stained in rings"

  // ── the newbie wilds: the delve is four rooms of named stone ──
  '/world/newbie-wilds/delve/vestibule',              // "its floor laid in flat SLABS"
  '/world/newbie-wilds/delve/corridor-1',             // "flat FLAGS laid edge to edge"
  '/world/newbie-wilds/delve/corridor-2',             // ⭐ "a lid of BOARDS dressed to look like more stone" — a false floor, and the one row here whose prose is a TRAP
  '/world/newbie-wilds/delve/pit-below',              // "its floor gritty with old SPOIL"

  // ── the practicum ──
  '/world/practicum/casting-yard',                    // "a FLAGSTONE practice yard"

  // ── the roads out of Terminus ──
  '/world/terminus/delight-road/drove',               // "ground back to EARTH by generations of hooves"
  '/world/terminus/delight-road/ford',                // "SET STONES, laid flat and level"
  '/world/terminus/valley-road/towpath',              // "a made path of rammed GRAVEL"
  '/world/terminus/estuary/estuary-mouth',            // "a mile of saltings and MUD"

  // ── the working city ──
  '/world/terminus/market/bakery',                    // "the floor is STONE and the stone is damp"
  '/world/terminus/goods-yards/bottling/location/floor',  // "a bright TILED floor"
  '/world/terminus/goods-yards/brewing/location/floor',   // "a wet STONE floor"
  '/world/terminus/wharfside/dyehouse/location/floor',    // "the floor is STAINED past explaining"

  // ── Mayfield Row: the let rooms, and the one that claims TWO floors ──
  '/world/terminus/mayfield-row/seznick-house/lobby',            // "diamond floor TILE"
  '/world/terminus/mayfield-row/seznick-house/location/hall',    // "bare BOARDS"
  '/world/terminus/mayfield-row/seznick-house/location/main',    // ⚠ BOARDS *and* light through gaps in them — see the docblock
  '/world/terminus/necropolis/ground',                // "each one a shallow trough cut into the FLOOR"

  // ── the farms and the barn ──
  '/world/terminus/eternal/campus-farm/location/yard', // "a square of trodden MUD"
  '/world/terminus/hearts-delight/location/barn',      // ⭐ "a threshing floor of BEATEN EARTH worn hollow in the middle"

  // ── Hinkley Hills: the lots nobody has built on ──
  '/world/terminus/hinkley-hills/location/arrival',   // "a CONCRETE apron at the end of the line"
  '/world/terminus/hinkley-hills/lots/hall',          // "a worn runner on the BOARDS"
  '/world/terminus/hinkley-hills/lots/road-segment',  // "the made road gives out here into graded DIRT"

  // ── Rejection: the yards above the mine ──
  '/world/terminus/rejection/location/fuel-yard',     // "a wide flat of beaten EARTH"
  '/world/terminus/rejection/location/pithead-yard',  // "a flat of trodden MUD and grey SPOIL"
  '/world/terminus/rejection/hanging-wood/ride',      // "bare EARTH in the middle"
  '/world/terminus/rejection/hanging-wood/treeline',  // "worn to bare EARTH by everything that has come down it"
];

/**
 * ⚠ Today's count, and it is a RATCHET: it may fall and may never rise.
 *
 * The heuristic's raw figure was 66 candidates; curation against the test in
 * {@link UNBACKED_GROUND_CLAIMS}'s docblock brought it to **28**. The ceiling
 * IS the list's length, so the two can never disagree — the only way to lower
 * it is to delete an entry, and clause (c) refuses to let an entry be paid
 * without being deleted.
 */
export const UNBACKED_GROUND_CLAIMS_CEILING = UNBACKED_GROUND_CLAIMS.length;

/** The words a description uses when it is talking about the floor. */
const CLAIM_WORDS = [
  "floor", "floorboards", "boards", "planks", "earth", "dirt", "soil",
  "grass", "turf", "sward", "mud", "mire", "underfoot", "flagstone",
  "flagstones", "flags", "cobble", "cobbles", "cobbled", "paving", "paved",
  "gravel", "sand", "concrete", "tile", "tiles", "tiled", "carpet", "rug",
  "rugs", "matting", "straw", "sawdust", "dust", "stone floor", "setts",
];

interface Row {
  /** Template path (`/world/terminus/…`). */
  path: string;
  /** Repo-relative file. */
  file: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
}

/** How a Location's ground is decided. */
type Resolution =
  | "authored-row"        // an `adornments:` entry naming a Floor row
  | "authored-spec"       // a `floor:` spec on the room
  | "none"                // `noDefaultFloor: true`
  | "default:on-grade"    // the default floor, rung 3 or the outdoor dial
  | "default:indoor";     // the default floor, the indoor dial

interface Reading {
  row: Row;
  resolution: Resolution;
  /** The material path when it is knowable statically, else null. */
  material: string | null;
  /** The kind when the material is knowable, else null. */
  kind: GroundKind | null;
  /** Ground words the description uses. */
  claims: string[];
}

// ---------------------------------------------------------------------------
// the content walk
// ---------------------------------------------------------------------------

function* walkYaml(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    if (e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yield* walkYaml(full);
    else if (e.endsWith(".yaml")) yield full;
  }
}

/** Every content row every pack ships, keyed by template path. */
function contentRows(): Map<string, Row> {
  const out = new Map<string, Row>();
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT).sort()) {
    const contentRoot = join(CONTENT, pack, "content");
    if (!existsSync(contentRoot)) continue;
    for (const file of walkYaml(contentRoot)) {
      let doc: unknown;
      try {
        doc = parseYaml(readFileSync(file, "utf8"));
      } catch {
        continue;
      }
      if (!doc || typeof doc !== "object") continue;
      const d = effectiveDoc(file, doc as Record<string, unknown>, inheritIdx());
      if (typeof d.class !== "string") continue;
      const rel = relative(contentRoot, file).replace(/\.yaml$/, "");
      out.set("/" + rel.split(/[\\/]/).join("/"), {
        path: "/" + rel.split(/[\\/]/).join("/"),
        file: relative(REPO, file),
        class: d.class,
        hydratorClass:
          typeof d.hydratorClass === "string" ? d.hydratorClass : undefined,
        data: (d.data as Record<string, unknown>) ?? {},
      });
    }
  }
  return out;
}

/** The tag list of a Material row, by template path. */
function materialTags(
  path: string,
  rows: Map<string, Row>,
): readonly string[] | null {
  const row = rows.get(path);
  if (!row) return null;
  const tags = row.data.tags;
  return Array.isArray(tags) ? (tags as string[]) : [];
}

function classifyTags(tags: readonly string[]): GroundMaterialClass | null {
  const found = new Set<GroundMaterialClass>();
  for (const t of tags) {
    const c = GROUND_TAG_CLASSES[String(t).toLowerCase()];
    if (c) found.add(c);
  }
  for (const c of GROUND_CLASS_PRECEDENCE) if (found.has(c)) return c;
  return null;
}

/** The fold, over the shared table — see `GroundKind.ts` on why it is data. */
function fold(input: {
  materialClass: GroundMaterialClass | null;
  onGrade: boolean;
  worked: boolean;
  standingWater: boolean;
}): GroundKind {
  if (input.materialClass === null) return "contrived";
  for (const r of GROUND_KIND_FOLD) {
    if (r.materialClass !== input.materialClass) continue;
    if (r.onGrade !== undefined && r.onGrade !== input.onGrade) continue;
    if (r.worked !== undefined && r.worked !== input.worked) continue;
    if (
      r.standingWater !== undefined &&
      r.standingWater !== input.standingWater
    ) {
      continue;
    }
    return r.kind;
  }
  return "contrived";
}

// ---------------------------------------------------------------------------
// classification
// ---------------------------------------------------------------------------

const locationCache = new Map<string, boolean>();
const floorCache = new Map<string, boolean>();

function isLocationRow(row: Row, sources: readonly PackSource[]): boolean {
  // `Location` is a class, not a mixin, but `composesMixin` matches an
  // identifier anywhere in the `extends` chain — and `\bLocation\b` does not
  // match inside `CartesianLocation`, so a subclass is found by recursion
  // through its imports rather than by accident.
  return composesMixin(row.class, "Location", sources, locationCache);
}

function isFloorRow(row: Row, sources: readonly PackSource[]): boolean {
  return composesMixin(row.class, "FloorMixin", sources, floorCache);
}

/** Ground words the row's own prose uses. */
function claimsOf(row: Row): string[] {
  const prose = [row.data.longDescription, row.data.shortDescription]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();
  const details = row.data.details;
  const detailProse =
    details && typeof details === "object"
      ? Object.values(details as Record<string, { description?: string }>)
          .map((d) => d?.description ?? "")
          .join(" ")
          .toLowerCase()
      : "";
  const all = `${prose} ${detailProse}`;
  return CLAIM_WORDS.filter((w) => new RegExp(`\\b${w}\\b`).test(all));
}

/** Does the row's `adornments:` name something that composes `FloorMixin`? */
function authoredFloorRow(
  row: Row,
  rows: Map<string, Row>,
  sources: readonly PackSource[],
): Row | null {
  const adornments = row.data.adornments;
  if (!Array.isArray(adornments)) return null;
  for (const a of adornments) {
    const path =
      typeof a === "string"
        ? a
        : ((a as { template?: string })?.template ?? null);
    if (!path) continue;
    const target = rows.get(path);
    if (target && isFloorRow(target, sources)) return target;
  }
  return null;
}

function read(
  row: Row,
  rows: Map<string, Row>,
  sources: readonly PackSource[],
): Reading {
  const claims = claimsOf(row);
  if (row.data.noDefaultFloor === true) {
    return { row, resolution: "none", material: null, kind: null, claims };
  }

  const floorRow = authoredFloorRow(row, rows, sources);
  if (floorRow) {
    const material =
      typeof floorRow.data._materialPath === "string"
        ? floorRow.data._materialPath
        : null;
    return {
      row,
      resolution: "authored-row",
      material,
      kind: material
        ? fold({
            materialClass: classifyTags(materialTags(material, rows) ?? []),
            onGrade: (floorRow.data.onGrade as boolean) ?? onGradeGuess(row),
            worked: (floorRow.data.worked as boolean) ?? false,
            standingWater: false,
          })
        : null,
      claims,
    };
  }

  const spec = row.data.floor;
  if (spec && typeof spec === "object") {
    const s = spec as Record<string, unknown>;
    const material = typeof s.material === "string" ? s.material : null;
    return {
      row,
      resolution: "authored-spec",
      material,
      kind: material
        ? fold({
            materialClass: classifyTags(materialTags(material, rows) ?? []),
            onGrade: (s.onGrade as boolean) ?? onGradeGuess(row),
            worked: (s.worked as boolean) ?? false,
            standingWater: false,
          })
        : null,
      claims,
    };
  }

  return {
    row,
    resolution: onGradeGuess(row) ? "default:on-grade" : "default:indoor",
    material: null,
    kind: null,
    claims,
  };
}

/**
 * The static half of D8's derivation: an outdoor biome, or coordinates below
 * datum.
 *
 * ⚠ Only the static half. The live rule walks outward to the nearest
 * Atmospheric ancestor with a biome, so a room that inherits its biome from
 * a zone reads `false` here and `true` at runtime. That is why list 1's
 * `default:*` entries are a READING and not a verdict.
 */
function onGradeGuess(row: Row): boolean {
  const biome = row.data._biomePath;
  if (typeof biome === "string" && /\boutdoor\b/.test(biome)) return true;
  const coords = row.data.coords;
  if (coords && typeof coords === "object") {
    const z = (coords as { z?: number }).z;
    if (typeof z === "number" && z < 0) return true;
  }
  const arr = row.data.coordinates;
  if (Array.isArray(arr) && typeof arr[2] === "number" && arr[2] < 0) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// clause (e) — a Location override that forgets to chain
// ---------------------------------------------------------------------------

/**
 * Every Location class in every pack `src/` (and the kernel's world tree)
 * that overrides `postRegister` without calling `super.postRegister`.
 *
 * ⭐ The failure it prevents: `PostRegistrationMixin`'s default is a
 * NON-chaining no-op, so `Location.postRegister` — which is what gives the
 * room its floor — is simply skipped, and nothing else goes wrong. Six of
 * the family's overrides had no `super` call before the ground build.
 */
function unchainedPostRegister(sources: readonly PackSource[]): string[] {
  const out: string[] = [];
  const files: string[] = [];
  for (const s of sources) files.push(...packSrcFiles(s.srcDir));
  files.push(...packSrcFiles(MUD));
  const cache = new Map<string, boolean>();
  for (const file of files) {
    if (!file.endsWith(".ts") || file.includes("__tests__")) continue;
    const src = readFileSync(file, "utf8");
    if (!/\bpostRegister\s*\(/.test(src)) continue;
    // Only a body, not a call or a reference.
    if (!/\bpostRegister\s*\([^)]*\)\s*:\s*Promise<[^>]*>\s*\{/.test(src)) {
      continue;
    }
    if (/super\.postRegister\b/.test(src)) continue;
    // ⚠ Is the class actually on the Location path? Grepping the FILE for the
    // word `Location` is not the same question and answered yes for
    // `CommandGiver`, `CardRegistry` and `Screen`, none of which is a room —
    // they mention it in prose or in an unrelated type. The class walk is the
    // honest test: a registry's hook has no `Location` base to chain to and is
    // not this clause's business.
    const classPath = classPathOfFile(file, sources);
    if (!classPath) continue;
    if (!composesMixin(classPath, "Location", sources, cache)) continue;
    out.push(
      `${relative(REPO, file)}: overrides postRegister without ` +
        `super.postRegister — the mixin's default does NOT chain, so this ` +
        `class's rooms get no floor`,
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// modes
// ---------------------------------------------------------------------------

function readings(): { readings: Reading[]; rows: Map<string, Row> } {
  const rows = contentRows();
  const sources = packSources();
  const out: Reading[] = [];
  for (const row of rows.values()) {
    if (!isLocationRow(row, sources)) continue;
    out.push(read(row, rows, sources));
  }
  out.sort((a, b) => a.row.path.localeCompare(b.row.path));
  return { readings: out, rows };
}

function report(): void {
  const { readings: rs } = readings();
  const byResolution = new Map<Resolution, number>();
  console.log(`\nlint:ground — list 1: what every Location stands on\n`);
  for (const r of rs) {
    byResolution.set(r.resolution, (byResolution.get(r.resolution) ?? 0) + 1);
    const bits = [r.resolution.padEnd(17)];
    bits.push((r.material ?? "—").padEnd(42));
    bits.push((r.kind ?? "—").padEnd(13));
    if (r.claims.length) bits.push(`claims: ${r.claims.join(" ")}`);
    console.log(`  ${r.row.path}\n      ${bits.join(" ")}`);
  }
  console.log(`\n  ${rs.length} Location row(s):`);
  for (const [k, n] of [...byResolution].sort()) console.log(`    ${k}  ${n}`);
  const claiming = rs.filter((r) => r.claims.length).length;
  console.log(
    `\n  ${claiming} make a ground claim in prose; ` +
      `${UNBACKED_GROUND_CLAIMS.length} are listed as unbacked ` +
      `(ceiling ${UNBACKED_GROUND_CLAIMS_CEILING}).\n`,
  );
}

/**
 * The claim heuristic, for curating list 2. ⚠ It NEVER gates — see the
 * header and `check-descriptor-banks.ts` on why a regex over authored
 * English may not fail a build.
 */
function seed(): void {
  const { readings: rs } = readings();
  const candidates = rs.filter(
    (r) =>
      r.claims.length > 0 &&
      (r.resolution === "default:on-grade" || r.resolution === "default:indoor"),
  );
  console.log(
    `\nlint:ground --seed — ${candidates.length} candidate(s) for list 2 ` +
      `(prose claims a ground, nothing authored backs it).\n` +
      `⚠ A HEURISTIC. Curate it: "dust on the shelves" is not a claim ` +
      `about the floor and "the boards creak" is.\n`,
  );
  for (const r of candidates) {
    console.log(`  '${r.row.path}', // ${r.claims.join(" ")}`);
  }
  console.log();
}

function lint(): void {
  const { readings: rs, rows } = readings();
  const sources = packSources();
  const byPath = new Map(rs.map((r) => [r.row.path, r]));
  const failures: string[] = [];

  // (a) the ratchet
  if (UNBACKED_GROUND_CLAIMS.length > UNBACKED_GROUND_CLAIMS_CEILING) {
    failures.push(
      `UNBACKED_GROUND_CLAIMS has ${UNBACKED_GROUND_CLAIMS.length} ` +
        `entries, over the ceiling of ${UNBACKED_GROUND_CLAIMS_CEILING}. ` +
        `The list may fall and may never rise.`,
    );
  }

  for (const path of UNBACKED_GROUND_CLAIMS) {
    const reading = byPath.get(path);
    // (b) every listed path is a real Location row
    if (!reading) {
      failures.push(
        `'${path}' is listed as an unbacked ground claim but is not a ` +
          `Location row (moved? deleted?). A list of ghosts measures nothing.`,
      );
      continue;
    }
    // (c) a listed row that now authors a floor is STALE
    if (
      reading.resolution === "authored-row" ||
      reading.resolution === "authored-spec" ||
      reading.resolution === "none"
    ) {
      failures.push(
        `'${path}' now resolves its ground as '${reading.resolution}' — ` +
          `the debt is PAID. Delete its line from ` +
          `UNBACKED_GROUND_CLAIMS and lower the ceiling by one.`,
      );
    }
  }

  // (d) every floor row says `ground` and `floor` out loud
  for (const row of rows.values()) {
    if (!isFloorRow(row, sources)) continue;
    const kw = Array.isArray(row.data.keywords)
      ? (row.data.keywords as unknown[]).map((k) => String(k).toLowerCase())
      : [];
    const missing = ["ground", "floor"].filter((w) => !kw.includes(w));
    if (missing.length) {
      failures.push(
        `${row.file}: a Floor row missing ${missing
          .map((m) => `'${m}'`)
          .join(" and ")} from its own keywords. ⚠ The MQL scope walk pools ` +
          `getKeywords() and NEVER a detail's authored keyword list, so ` +
          `'details.floor.keywords' cannot stand in: a floor that does not ` +
          `say these words up top is a floor 'sit' cannot find.`,
      );
    }
  }

  // (f) ⚠⚠ a Floor row must not author a detail that IS the floor
  for (const row of rows.values()) {
    if (!isFloorRow(row, sources)) continue;
    const details = row.data.details;
    if (!details || typeof details !== "object") continue;
    for (const id of Object.keys(details as Record<string, unknown>)) {
      if (id !== "floor" && id !== "ground") continue;
      failures.push(
        `${row.file}: a Floor row authoring a detail named '${id}'. ⚠⚠ ` +
          `\`look ${id}\` binds the DETAIL rather than the floor, and a ` +
          `detail's description renders WITHOUT the host's ` +
          `markupAugmenters — so the derived sentence naming the material ` +
          `is invisible. Delete the detail: the object answers to both ` +
          `words by construction. (A detail naming a real sub-feature — a ` +
          `worn track, a gutter — is the opposite case and is fine.)`,
      );
    }
  }

  // (e) a Location override that forgets to chain
  failures.push(...unchainedPostRegister(sources));

  if (failures.length) {
    console.error(`\n✖ lint:ground — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  const floors = [...rows.values()].filter((r) => isFloorRow(r, sources));
  console.log(
    `check-ground: ${rs.length} Location row(s) resolve a ground; ` +
      `${floors.length} Floor row(s) all say 'ground' and 'floor'; ` +
      `${UNBACKED_GROUND_CLAIMS.length}/${UNBACKED_GROUND_CLAIMS_CEILING} ` +
      `unbacked claim(s) outstanding; every Location postRegister chains.`,
  );
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  if (mode === "--report") return report();
  if (mode === "--seed") return seed();
  lint();
}

if (process.argv[1] && /check-ground\.ts$/.test(process.argv[1])) main();
