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

/** The findings: rows on `FurnishableRoom` that are not in the roster. */
export function classify(rows: readonly Row[]): {
  unexpected: string[];
  missing: string[];
} {
  const on = rows.filter((r) => r.cls === FURNISHABLE).map((r) => r.file);
  const roster = new Set(FURNISHED);
  return {
    unexpected: on.filter((f) => !roster.has(f)).sort(),
    missing: FURNISHED.filter((f) => !on.includes(f)).sort(),
  };
}

function main(): void {
  const { unexpected, missing } = classify(shippedRows());
  if (unexpected.length === 0 && missing.length === 0) {
    console.log(
      `check-location-classes: ok — ${FURNISHED.length} rows on ` +
        `FurnishableRoom, every one a room somebody furnishes.`,
    );
    return;
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
