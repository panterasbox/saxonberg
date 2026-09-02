/**
 * check-location-classes — **`FurnishableRoom` is the furnishing
 * archetypes' base, not the default room class.**
 *
 * The vocabulary is LOCATION, and it has two axes:
 *
 *   - the coordinate system — `CartesianLocation` / `SphericalLocation`;
 *   - the instancing — plain (a row describing a KIND of place, minted
 *     many times) versus `Singleton…` (one row IS one place, and a
 *     second `clone()` is refused).
 *
 * `FurnishableRoom` is neither axis: it is the INTERIOR SOMEBODY
 * FURNISHES — a `CartesianLocation` that also carries `Persistable`,
 * `WarrenMember` and `Reserved`, because a tenant's goods land in it and
 * must survive.
 *
 * ⚠ It drifted into being the generic room class, and not through
 * carelessness: for a while it was the ONLY multi-instance location in
 * the game, so anything minted many-times-from-one-row had nowhere else
 * to go. It collected thirteen trade floors and three pieces of minted
 * scaffolding that way — and each of those got a persistence record for
 * free. `PersistableMixin.cleanupOnDestruct` fires with
 * `scope = getTemplatePath()`, so every reap wrote a `holder_snapshots`
 * row, and every landing in a building shared ONE scope: write-only
 * records nothing read back, on a path that reaps constantly.
 *
 * So the roster is ENUMERATED rather than inferred — the
 * `check-boundary-exemptions` discipline. Adding a row is a design
 * decision ("does a player furnish this?"), and it should be a diff a
 * reviewer sees, not a default anybody can fall into.
 *
 * CI-gating. The class-behaviour half (a minted location keeps no
 * record; the singleton opt-in) is unit-tested beside the classes.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { classFileOf, packSources } from "./pack-roots";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "..", "content");

const FURNISHABLE = "/platform/location/FurnishableRoom";
const MINTED = "/platform/location/CartesianLocation";
/** The kernel's own spatial-zone classes — the roots of the walk below. */
const ZONE_ROOTS = [
  "/platform/idea/location/CartesianZone",
  "/platform/idea/location/SphericalZone",
];

/**
 * ⚠⚠ **Which classes are ZONES is DERIVED, never listed.**
 *
 * A pack ships classes of its own — `trade-mining`'s `AuthoredWorking`
 * and `MineRoom` are rooms, and a pack may ship a ZONE just as easily.
 * An enumerated list here would quietly stop seeing them: the orphan
 * check, the unzoned-coords check and the named-door check would all
 * skip them, and each of those exists because a missing zone is a boot
 * error.
 *
 * ⚠ It was a pack zone that first proved this — `MineZone`, which
 * existed only because a pack cannot add a field to a kernel class.
 * `deposit` has since moved onto `SpatialZone` and that class is gone;
 * the derivation stays, because the next pack class is not going to
 * announce itself here either.
 *
 * "A pack must never require a kernel list edit" is the rule, and this is
 * what honouring it looks like in a gate: resolve the class file (the
 * pack's `src/` when the path is under a pack root, else the kernel
 * tree), read what it extends, and walk. Bounded, and the answer is a
 * fact about the code rather than a fact about this file.
 */
/**
 * The kernel's cartesian-room classes. A pack's own room class —
 * `trade-mining`'s `AuthoredWorking` and `MineRoom` — extends one of
 * these, and the same derivation finds them: a check that matched on the
 * NAME `CartesianLocation` skipped every pack room silently, which is
 * how a gate becomes a gate-shaped comment.
 */
const CARTESIAN_ROOTS = [
  "/platform/location/CartesianLocation",
  "/platform/location/SingletonCartesianLocation",
  "/platform/location/PersistentCartesianLocation",
  "/platform/location/FurnishableRoom",
  "/lib/location/CartesianLocation",
];

const ancestryCache = new Map<string, boolean>();

/**
 * Does `classPath` extend — transitively, and THROUGH MIXIN CALLS — any
 * of `roots`?
 *
 * ⚠⚠ The mixin call is the whole difficulty and the reason a naive
 * `extends (\w+)` is useless here: a room class is
 * `class AuthoredWorking extends WorkingMixin(SingletonCartesianLocation)`,
 * and the first identifier after `extends` is the MIXIN. Reading it as
 * the base made every pack room invisible to these checks — a gate that
 * never fires reads exactly like a gate that passes.
 *
 * So every identifier in the extends clause is a candidate, and each is
 * resolved through its own import. `A(B(C))` answers on `C`.
 */
function extendsAny(classPath: string, roots: readonly string[], depth = 0): boolean {
  if (roots.includes(classPath)) return true;
  if (depth > 6) return false;
  const key = roots.join("|") + "  " + classPath;
  const cached = ancestryCache.get(key);
  if (cached !== undefined) return cached;
  ancestryCache.set(key, false); // cycle guard
  let src: string;
  try {
    src = readFileSync(classFileOf(classPath, packSources()), "utf8");
  } catch {
    return false;
  }
  // The LAST `class X extends …` wins: a module that builds a stack into
  // a `const Base` and then exports `class X extends Base` names the
  // composition, and the export is what a row resolves to.
  const clauses = [...src.matchAll(/class\s+\w+\s+extends\s+([^{]+?)\s*\{/g)];
  const clause = clauses[clauses.length - 1]?.[1];
  const consts = [...src.matchAll(/const\s+(\w+)\s*=\s*([^;]+);/g)];
  const candidates: string[] = [];
  const collect = (text: string, seen = new Set<string>()): void => {
    for (const id of text.match(/[A-Za-z_$][\w$]*/g) ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      candidates.push(id);
      // A local `const Base = Mixin(Real)` is one more hop to unwrap.
      const local = consts.find((c) => c[1] === id);
      if (local) collect(local[2]!, seen);
    }
  };
  if (clause) collect(clause);
  for (const name of candidates) {
    const imp = new RegExp(
      `import\\s+(?:type\\s+)?(?:${name}\\b|\\{[^}]*\\b${name}\\b[^}]*\\})[^;]*?from\\s+['"]([^'"]+)['"]`,
    ).exec(src);
    if (!imp) continue;
    const spec = imp[1]!;
    const asMudPath = spec.startsWith("@saxonberg/server/mud/")
      ? "/" + spec.slice("@saxonberg/server/mud/".length)
      : spec.startsWith(".")
        ? classPath.slice(0, classPath.lastIndexOf("/")) + "/" + spec
        : null;
    if (asMudPath === null) continue;
    if (extendsAny(normalizePath(asMudPath), roots, depth + 1)) {
      ancestryCache.set(key, true);
      return true;
    }
  }
  return false;
}

/** A spatial zone — kernel or a pack's own. */
function isZoneClass(classPath: string): boolean {
  return extendsAny(classPath, ZONE_ROOTS);
}

/** A cartesian room — kernel or a pack's own. */
function isCartesianClass(classPath: string): boolean {
  return extendsAny(classPath, CARTESIAN_ROOTS);
}

/** Collapse `a/b/../c` and a trailing `./`. */
function normalizePath(p: string): string {
  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return "/" + out.join("/");
}

/**
 * Every row on the PERMISSIVE `CartesianLocation` — a row that describes
 * a KIND of place, minted many times.
 *
 * ⚠⚠ This roster exists because the name is a **semantic trap across
 * branches**. `/platform/location/CartesianLocation` used to be
 * `/platform/location/Room`, and it carried `SingletonMixin` — one row
 * WAS one place, and a second `clone()` was refused. This build flipped
 * the axis: the mixin SUBTRACTS (a class without it still backs a
 * singleton template through `StuffApi.singleton()`; a class with it can
 * back only singleton templates), so the unmarked name went to the
 * permissive class and authored places moved to
 * `SingletonCartesianLocation`.
 *
 * That means the SAME STRING names opposite things depending on which
 * branch you came from, and a merge that resolves cleanly by text will
 * silently strip the singleton guard off every authored place that
 * arrives on the old meaning. Nothing else would notice: a permissive
 * class serves a singleton row perfectly well right up until something
 * clones it twice.
 *
 * So the minted set is enumerated too. Three rows, and each is a KIND:
 * a venue archetype minted per venue, a corridor minted per floor, a
 * road segment minted as frontage fills. An authored place — a hub, a
 * hollow, a cookhouse — belongs on `SingletonCartesianLocation`.
 */
const MINTED_ROWS = [
  "hinkley-hills/content/world/terminus/hinkley-hills/lots/road-segment.yaml",
  "platform/content/platform/location/venue.yaml",
  "terminus/content/world/terminus/mayfield-row/seznick-house/corridor.yaml",
];

/**
 * Every row on `FurnishableRoom`, and each is a room a PLAYER puts
 * their own goods in: the three shipped archetypes, a bought house's
 * rooms, a let unit's rooms.
 */
const FURNISHED = [
  "generic-objects/content/stuff/location/room/bathroom.yaml",
  "generic-objects/content/stuff/location/room/bedroom.yaml",
  "generic-objects/content/stuff/location/room/living.yaml",
  "hinkley-hills/content/world/terminus/hinkley-hills/lots/hall.yaml",
  "hinkley-hills/content/world/terminus/hinkley-hills/lots/kitchen.yaml",
  "hinkley-hills/content/world/terminus/hinkley-hills/lots/yard.yaml",
  "terminus/content/world/terminus/mayfield-row/seznick-house/location/bedroom.yaml",
  "terminus/content/world/terminus/mayfield-row/seznick-house/location/hall.yaml",
  "terminus/content/world/terminus/mayfield-row/seznick-house/location/main.yaml",
  // ⚠ The KITCHEN archetype, and its pack is misleading: it ships in
  // trade-hearth-cooking but it is one of the four D6 furnishing
  // archetypes — a HOME kitchen, whose whole point is the errand
  // collapse in the home you already live in. Its built-ins are the
  // landlord's and the cook pot is the tenant's. It is not a trade
  // floor, and a sweep by pack name took it for one until
  // `room-archetypes.test.ts` said otherwise.
  "trade-hearth-cooking/content/trade/hearth-cooking/location/kitchen.yaml",
];

export interface Row {
  file: string;
  cls: string;
  /** Does the row author a `coords:` block? */
  coords: boolean;
  /** `[direction, destination]` for every authored exit. */
  exits: Array<[string, string]>;
}

/** Every shipped row's `class:`, keyed by its pack-relative path. */
export function shippedRows(contentDir: string = CONTENT): Row[] {
  const out: Row[] = [];
  if (!existsSync(contentDir)) return out;
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".yaml")) {
        const text = readFileSync(full, "utf8");
        const m = /^class:\s*(\S+)\s*$/m.exec(text);
        if (!m) continue;
        // ⚠ Matched over the WHOLE file rather than a sliced `exits:`
        // block. A block regex has to say where the block ENDS, and JS
        // has no `\Z` — so a lookahead for the next top-level key
        // silently dropped every exit set that was the LAST field in its
        // row. `hush-mouth` parsed as having no exits at all, which is
        // exactly the row whose cross-zone pair this gate exists to
        // check. The shape below (four-space key, `destination:` on the
        // next line) is unambiguous on its own.
        const exits: Array<[string, string]> = [];
        const re = /^ {4}([A-Za-z0-9_-]+):[^\S\n]*\n[^\S\n]+destination:[^\S\n]*(\S+)/gm;
        let hit: RegExpExecArray | null;
        while ((hit = re.exec(text)) !== null) exits.push([hit[1]!, hit[2]!]);
        out.push({
          file: full.slice(contentDir.length + 1),
          cls: m[1]!,
          coords: /^ {2}coords:\s*$/m.test(text),
          exits,
        });
      }
    }
  };
  walk(contentDir);
  return out;
}

/** Rows on `cls` that the `roster` does not list, and vice versa. */
function against(
  rows: readonly Row[],
  cls: string,
  roster: readonly string[],
): { unexpected: string[]; missing: string[] } {
  const on = rows.filter((r) => r.cls === cls).map((r) => r.file);
  const listed = new Set(roster);
  return {
    unexpected: on.filter((f) => !listed.has(f)).sort(),
    missing: roster.filter((f) => !on.includes(f)).sort(),
  };
}

/** Every shipped `.yaml`, pack-relative — the directory census the
 *  orphaned-zone check reads. */
export function allYamlFiles(contentDir: string = CONTENT): string[] {
  const out: string[] = [];
  if (!existsSync(contentDir)) return out;
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".yaml")) out.push(full.slice(contentDir.length + 1));
    }
  };
  walk(contentDir);
  return out;
}

/** The findings: rows on `FurnishableRoom` that are not in the roster. */
export function classify(rows: readonly Row[]): {
  unexpected: string[];
  missing: string[];
} {
  return against(rows, FURNISHABLE, FURNISHED);
}

/**
 * Zone rows that zone NOTHING.
 *
 * ⚠ `ZoneApi.resolveZoneForPath` walks TEMPLATE ancestry, so a zone row
 * zones the sibling directory that shares its name: `lots.yaml` zones
 * `lots/`. Rename or move that directory and the zone is still a
 * perfectly valid row — it just governs an empty path, and every room
 * that used to be inside it silently falls back to the enclosing zone.
 *
 * That is not cosmetic. These boundaries are what make a non-cardinal
 * exit legal (`CartesianLocation.addExit` allows one only ACROSS a zone),
 * so an orphaned zone re-arms a throw on a door that has worked for
 * months — and it re-arms it in the world, not in a suite, because a
 * fixture that omits zone rows skips the rule entirely. It has happened
 * twice: `seznick-house/rooms.yaml` was left behind by the branch-
 * directory sort while its rooms moved to `location/`.
 */
export function orphanedZones(rows: readonly Row[], files: readonly string[]): string[] {
  // Every ANCESTOR directory, not just immediate parents: a zone governs
  // its whole subtree, so `duncan-hall.yaml` is doing its job even when
  // every room underneath sits in `duncan-hall/location/`.
  const dirs = new Set<string>();
  for (const f of files) {
    let d = f.slice(0, f.lastIndexOf("/"));
    while (d.includes("/")) {
      dirs.add(d);
      d = d.slice(0, d.lastIndexOf("/"));
    }
    if (d) dirs.add(d);
  }
  return rows
    .filter((r) => isZoneClass(r.cls))
    .map((r) => r.file.replace(/\.yaml$/, ""))
    .filter((stem) => !dirs.has(stem))
    .sort();
}

/**
 * ⚠⚠ **A cartesian row with `coords:` and no `CartesianZone` over it.**
 *
 * `CartesianLocation.setCoords` calls `zone.addLocation`, so a row that
 * authors coordinates in a directory no spatial zone covers throws at
 * HYDRATE — and if the row is in a pack's `boot:` list, that is a FATAL
 * boot error rather than a warning.
 *
 * It is a merge hazard, not a typo, which is why it is worth a gate:
 * `FurnishableRoom` is deliberately NOT cartesian, so a `coords:` block
 * on one is inert data nobody reads. Move that row to
 * `SingletonCartesianLocation` — as the residences build did for three
 * trade floors — and the dead block becomes LIVE, in a directory that
 * never needed a zone before. Nothing else notices until a boot.
 *
 * Three rows shipped in exactly that state and the metal-chain build
 * found them by booting: `trade-distilling`'s cash-and-carry,
 * `trade-farming`'s packing floor, and (by the sibling rule below) the
 * Seznick House lobby.
 *
 * The fix is usually to DELETE the coords — a standalone floor reached
 * by a cross-zone exit is in no grid, and `{0,0,0}` meant nothing — not
 * to invent a zone for one room.
 */
export function unzonedCoords(rows: readonly Row[]): string[] {
  const zones = new Set(
    rows.filter((r) => isZoneClass(r.cls)).map((r) => stemOf(r.file)),
  );
  return rows
    .filter((r) => isCartesianClass(r.cls) && r.coords)
    .filter((r) => !ancestorsOf(stemOf(r.file)).some((a) => zones.has(a)))
    .map((r) => r.file)
    .sort();
}

/**
 * ⚠⚠ **A NON-CARDINAL exit between two rows in the same zone.**
 *
 * `CartesianLocation.addExit` admits a non-cardinal direction only
 * ACROSS a zone boundary — the rule that guarantees a grid exit has a
 * known inverse. A named door (`out`, `house`, `unit-3`) between two
 * rooms the same zone covers therefore THROWS at hydrate, and again a
 * `boot:` entry turns that into a fatal boot error.
 *
 * The same merge shape produces it: a row moves onto a cartesian class,
 * or a zone row is renamed away from the directory it governed, and a
 * named door that was legal yesterday is not today. The fix is a zone
 * boundary where the authorship of the space genuinely changes (a
 * building's ground floor is not the street), never re-spelling the door
 * as a compass point it does not mean.
 */
export function sameZoneNamedExits(rows: readonly Row[]): string[] {
  // ⚠ Zones keyed by TEMPLATE path, not by the pack-relative file stem —
  // the two differ by the `<pack>/content` prefix, and comparing one
  // against the other made this check answer "no zone anywhere" for
  // every row in the repo. A gate that never fires reads exactly like a
  // gate that passes.
  const zones = new Set(
    rows.filter((r) => isZoneClass(r.cls)).map((r) => templatePathOf(r.file)),
  );
  const byPath = new Map<string, Row>();
  for (const r of rows) byPath.set(templatePathOf(r.file), r);
  const zoneOf = (templatePath: string): string | null =>
    ancestorsOf(templatePath).find((a) => zones.has(a)) ?? null;
  const out: string[] = [];
  for (const r of rows) {
    if (!isCartesianClass(r.cls)) continue;
    const here = zoneOf(templatePathOf(r.file));
    if (here === null) continue;
    for (const [dir, dest] of r.exits) {
      if (CARDINALS.has(dir)) continue;
      const target = byPath.get(dest);
      if (!target || !isCartesianClass(target.cls)) continue;
      if (zoneOf(dest) === here) {
        out.push(`${r.file}  '${dir}' → ${dest}  (both in ${here})`);
      }
    }
  }
  return out.sort();
}

/** The ten canonical cardinals, mirrored from `NavigationApi` (a script does not import the mudlib). */
const CARDINALS = new Set([
  "north", "south", "east", "west",
  "northeast", "northwest", "southeast", "southwest",
  "up", "down",
]);

/** `pack/content/world/x/y.yaml` → `pack/content/world/x/y`. */
function stemOf(file: string): string {
  return file.replace(/\.yaml$/, "");
}

/** `pack/content/world/x/y.yaml` → `/world/x/y` (the template path). */
function templatePathOf(file: string): string {
  const i = file.indexOf("/content/");
  return i < 0 ? "/" + stemOf(file) : stemOf(file.slice(i + "/content".length));
}

/** Every ancestor stem of a path, nearest first. */
function ancestorsOf(path: string): string[] {
  const out: string[] = [];
  let p = path;
  while (p.includes("/")) {
    p = p.slice(0, p.lastIndexOf("/"));
    if (p) out.push(p);
  }
  return out;
}

/** The findings: rows on the permissive `CartesianLocation`. */
export function classifyMinted(rows: readonly Row[]): {
  unexpected: string[];
  missing: string[];
} {
  return against(rows, MINTED, MINTED_ROWS);
}

function main(): void {
  const rows = shippedRows();
  const orphans = orphanedZones(rows, allYamlFiles());
  const unzoned = unzonedCoords(rows);
  const namedSameZone = sameZoneNamedExits(rows);
  const mint = classifyMinted(rows);
  const { unexpected, missing } = classify(rows);
  if (
    unexpected.length === 0 &&
    missing.length === 0 &&
    mint.unexpected.length === 0 &&
    mint.missing.length === 0 &&
    orphans.length === 0 &&
    unzoned.length === 0 &&
    namedSameZone.length === 0
  ) {
    console.log(
      `check-location-classes: ok — ${FURNISHED.length} rows on ` +
        `FurnishableRoom, every one a room somebody furnishes; ` +
        `${MINTED_ROWS.length} on CartesianLocation, every one a KIND; ` +
        `every zone row zones something; every cartesian row's coords ` +
        `and named doors are legal.`,
    );
    return;
  }
  if (unzoned.length > 0) {
    console.error(
      `\ncheck-location-classes: ${unzoned.length} cartesian row(s) author ` +
        `\`coords:\` with NO CartesianZone over them. \`setCoords\` calls ` +
        `\`zone.addLocation\`, so these throw at hydrate — and a row in a ` +
        `pack's \`boot:\` list turns that into a FATAL boot error.\n\n` +
        `  ⚠ Usually the block is dead data that came alive: ` +
        `\`FurnishableRoom\` is deliberately NOT cartesian, so \`coords:\` ` +
        `on one is ignored — and moving the row to ` +
        `SingletonCartesianLocation makes it live. Delete the coords ` +
        `(a standalone floor reached by a cross-zone exit is in no grid) ` +
        `rather than inventing a zone for one room:`,
    );
    for (const f of unzoned) console.error(`  ✗ ${f}`);
  }
  if (namedSameZone.length > 0) {
    console.error(
      `\ncheck-location-classes: ${namedSameZone.length} NON-CARDINAL ` +
        `exit(s) between rows the SAME zone covers. ` +
        `\`CartesianLocation.addExit\` admits a named direction only ` +
        `ACROSS a zone boundary — the rule that guarantees a grid exit ` +
        `has a known inverse — so these throw at hydrate.\n\n` +
        `  ⚠ Add a zone where the authorship of the space genuinely ` +
        `changes (a building's ground floor is not the street). Do NOT ` +
        `re-spell the door as a compass point it does not mean:`,
    );
    for (const f of namedSameZone) console.error(`  ✗ ${f}`);
  }
  if (orphans.length > 0) {
    console.error(
      `\ncheck-location-classes: ${orphans.length} zone row(s) zone NOTHING ` +
        `— no shipped row lives in the sibling directory they name. A zone ` +
        `governs the directory that shares its name, so this one governs an ` +
        `empty path and every room that used to be inside it has fallen ` +
        `back to the enclosing zone. Rename the zone row to match the ` +
        `directory, or delete it:`,
    );
    for (const f of orphans) console.error(`  ✗ ${f}.yaml`);
  }
  if (mint.unexpected.length > 0) {
    console.error(
      `\ncheck-location-classes: ${mint.unexpected.length} row(s) use the ` +
        `PERMISSIVE ${MINTED} without being a minted KIND.\n\n` +
        `  ⚠ If these arrived from a branch where this class was named ` +
        `Room and carried SingletonMixin, they are AUTHORED PLACES and ` +
        `the merge has silently stripped their singleton guard. They ` +
        `want /platform/location/SingletonCartesianLocation. Only a row ` +
        `that describes a KIND of place, minted many times, belongs ` +
        `here — and it goes in the roster in this file:`,
    );
    for (const f of mint.unexpected) console.error(`  ✗ ${f}`);
  }
  if (mint.missing.length > 0) {
    console.error(
      `\ncheck-location-classes: ${mint.missing.length} roster row(s) no ` +
        `longer use ${MINTED}. If that is deliberate, drop them from the ` +
        `roster in this file:`,
    );
    for (const f of mint.missing) console.error(`  ✗ ${f}`);
  }
  if (unexpected.length > 0) {
    console.error(
      `\ncheck-location-classes: ${unexpected.length} row(s) use ` +
        `FurnishableRoom without being furnished by anybody. That class ` +
        `carries a persistence record; a room nobody furnishes wants a ` +
        `plain CartesianLocation (minted) or SingletonCartesianLocation ` +
        `(one row = one place), with durability on its fixtures:`,
    );
    for (const f of unexpected) console.error(`  ✗ ${f}`);
  }
  if (missing.length > 0) {
    console.error(
      `\ncheck-location-classes: ${missing.length} roster row(s) no longer ` +
        `use FurnishableRoom. If that is deliberate, drop them from the ` +
        `roster in this file:`,
    );
    for (const f of missing) console.error(`  ✗ ${f}`);
  }
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith("check-location-classes.ts")) {
  main();
}
