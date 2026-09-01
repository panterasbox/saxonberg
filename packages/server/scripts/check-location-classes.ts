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

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "..", "content");

const FURNISHABLE = "/platform/location/FurnishableRoom";
const MINTED = "/platform/location/CartesianLocation";
const ZONES = [
  "/platform/idea/location/CartesianZone",
  "/platform/idea/location/SphericalZone",
];

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
        const m = /^class:\s*(\S+)\s*$/m.exec(readFileSync(full, "utf8"));
        if (m) out.push({ file: full.slice(contentDir.length + 1), cls: m[1]! });
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
    .filter((r) => ZONES.includes(r.cls))
    .map((r) => r.file.replace(/\.yaml$/, ""))
    .filter((stem) => !dirs.has(stem))
    .sort();
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
  const mint = classifyMinted(rows);
  const { unexpected, missing } = classify(rows);
  if (
    unexpected.length === 0 &&
    missing.length === 0 &&
    mint.unexpected.length === 0 &&
    mint.missing.length === 0 &&
    orphans.length === 0
  ) {
    console.log(
      `check-location-classes: ok — ${FURNISHED.length} rows on ` +
        `FurnishableRoom, every one a room somebody furnishes; ` +
        `${MINTED_ROWS.length} on CartesianLocation, every one a KIND; ` +
        `every zone row zones something.`,
    );
    return;
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
