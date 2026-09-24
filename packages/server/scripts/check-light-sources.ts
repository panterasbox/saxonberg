/**
 * check-light-sources — ⭐⭐ **where does the light in this room come from,
 * and can the list of rooms that cannot answer only get shorter?**
 *
 * ## Why
 *
 * Before the envelope build, a room's light was a number somebody typed.
 * 195 Location rows shipped; 84 authored an `ambientIntensity` and 111 did
 * not, and neither group had a reason — the university-avenue crossing,
 * the market square, the terminal hall and the general store's shop floor
 * authored nothing and were therefore **pitch black at noon**, while a
 * dormitory authored 30 lumens that meant *"lit by day"* and burned
 * through the night.
 *
 * The build's rule (requirements S2) is: **every room's light has a named
 * source.** Three sources and nothing else — the sky, something lit in the
 * room, and spill through an open boundary. A room with none of the three
 * is dark, and that is correct rather than a bug.
 *
 * ⭐ The common case is **derived and needs no row**: a scope the biome
 * chain says is open to the sky follows the sun, and one that is not has
 * no ambient at all. So this gate is not a census of light — it is a
 * census of **exceptions**, and every exception is a line somebody had to
 * write in this file.
 *
 * ## The four lists
 *
 * {@link UNDECLARED_INTERIOR_AMBIENT} is the DEBT and the only list with a
 * falling ceiling: rooms that are not open to the sky, emit ambient light
 * anyway, and say nothing about where it comes from. Each one is either a
 * `glow`, a `sky` through an opening, or a value that meant *lit by day*
 * and should be deleted in favour of a lamp, a hearth, or spill.
 *
 * The other three are the sanctioned exceptions, each with a ceiling equal
 * to its own length so that adding one is a diff a reviewer reads:
 * {@link SKYLIT_INTERIORS} (an enclosed room a window or skylight reaches),
 * {@link INHERENT_GLOWS} (a luminous cave, a holodeck floor),
 * {@link DARK_UNDER_THE_SKY} (a sky-exposed place that is nonetheless
 * dark — a deep well, the bottom of a shaft).
 *
 * ## The clauses
 *
 *   (a) ⭐ every non-sky-exposed row with `ambientIntensity > 0` and no
 *       `ambientSource` is in {@link UNDECLARED_INTERIOR_AMBIENT}, whose
 *       length may fall and may never rise; a listed row that has since
 *       declared a source (or dropped the value) is STALE and fails, so
 *       paying the debt is what deletes the line.
 *   (b) an `ambientSource: sky` on an ENCLOSED row names an
 *       `ambientOpening`, that detail id exists in the row's own
 *       `details:`, and the row is listed in {@link SKYLIT_INTERIORS}.
 *       ⭐ The opening is what makes *"daylight reaches this room"* a
 *       claim a player can walk up to and look at, rather than a number.
 *   (c) every `glow` row is in {@link INHERENT_GLOWS} and every `none` row
 *       is in {@link DARK_UNDER_THE_SKY}, both at their ceilings, both
 *       failing on a stale entry.
 *   (d) a row authoring an `ambientIntensity` calibration that reads below
 *       `lit` at its own size scale is **WARNED, never failed**. An author
 *       may deliberately want a gloomy room, and
 *       `check-descriptor-banks.ts` already wrote down why a gate that
 *       second-guesses authorial intent is worse than no gate.
 *   (e) ⭐⭐ **no lamp object anywhere** (acceptance 6). A row declaring
 *       `publicLighting` places nothing that emits light, and no class in
 *       the kernel or any pack `src/` is named `*Lamppost*` / `*StreetLamp*`
 *       / `*StreetLight*`. The town's lamps are a PROPERTY of the street
 *       and prose beside it; minting one identical fuelled object per
 *       street would be 41 fuel reserves reconciling to produce a number
 *       that is the same for all of them.
 *   (f) ⚠⚠ no row authors `celestialProfile`. `CelestialApi.skyFactorNow()`
 *       is one memo for the whole realm, read synchronously by the light
 *       walk with no location in hand — a second profile would make it
 *       silently wrong for every room it does not describe. Envelope D1;
 *       `CelestialLogic.profileFor` throws at runtime, and this is the
 *       build-time half.
 *   (g) ⚠ a row whose class composes `FurnaceMixin` authors `lit:`.
 *       `FurnaceMixin.lit` defaults **true**, so a lantern row that
 *       forgets it ships burning, with its fuel draining, on a shelf in a
 *       shop.
 *
 * ## Usage
 *
 *   pnpm lint:light-sources            # the gate (clauses a–g)
 *   pnpm lint:light-sources --report   # every Location row and its source
 *   pnpm lint:light-sources --seed     # candidates for list (a), to curate
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import {
  composesMixin,
  packSources,
  packSrcFiles,
  MUD,
  type PackSource,
} from "./pack-roots";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "..");
const CONTENT = join(SERVER, "..", "content");
const REPO = join(SERVER, "..", "..");

/** The lux at which a room stops being gloomy — `LIGHT_BANDS`' `lit`. */
const LIT_LUX = 20;

/**
 * ⚠⚠ **The debt.** Enclosed rooms that emit ambient light and do not say
 * where it comes from.
 *
 * Every one of these is a number somebody typed. The content pass (W6)
 * decides, one room at a time, which of three things each actually is:
 *
 *   - **It meant *lit by day*** — delete the value. If the room has a
 *     doorless exit to somewhere open to the sky, the light walk already
 *     carries daylight in at full strength, and the room is lit when it
 *     should be and dark when it should be, for free.
 *   - **It meant *there is a lamp in here*** — put a lamp or a hearth in
 *     the row's `props:`. Then it burns fuel and goes out, which is the
 *     whole point of the build.
 *   - **It meant *there is a window*** — `ambientSource: sky` plus the
 *     detail the light comes through, and a line in
 *     {@link SKYLIT_INTERIORS}.
 *
 * ⭐ To pay one down: do one of those three, delete its line here, and the
 * ceiling falls with it. Clause (a) fails if you do the first without the
 * second, which is what makes the meter honest.
 */
export const UNDECLARED_INTERIOR_AMBIENT: readonly string[] = [
  // ⚠⚠ The census at W0, 2026-09-24. Fifty rows, and the three kinds are
  // visible from the numbers alone:
  //
  //   - **Rejection's whole surface** authors 8000 lm and NO BIOME AT ALL.
  //     Those rows are outdoors in the fiction — a pithead yard, a
  //     hillside, a fuel yard — and the realm does not know it, so they
  //     get no weather either. `_biomePath: /stuff/idea/biome/outdoor/
  //     baseline` + delete the value, and they follow the sun.
  //   - **Rooms with a big authored number** (a barn at 300, a bakery at
  //     400, a tailor's shop at 300, the Duncan Hall steps at 400) mean
  //     *lit by day*. Most have a doorless exit to somewhere open; the
  //     light walk carries daylight in at full strength already.
  //   - **Rooms with a small one** (a cellar at 15, a corridor at 9) mean
  //     *there is a lamp in here* and should have one.
  //
  '/platform/location/sandbox/CircleFloor', // 60 lm
  '/stuff/location/room/bathroom', // 20 lm
  '/stuff/location/room/bedroom', // 25 lm
  '/stuff/location/room/living', // 40 lm
  '/system/transport/thing/coach', // 40 lm
  '/trade/cooking/location/kitchen', // 35 lm
  '/trade/distilling/location/warehouse', // 25 lm
  '/world/terminus/counting-houses/cash-and-carry', // 30 lm
  '/world/terminus/eternal/duncan-hall/location/corridor', // 9 lm
  '/world/terminus/eternal/duncan-hall/location/dormroom', // 30 lm
  '/world/terminus/eternal/duncan-hall/location/lobby', // 80 lm
  '/world/terminus/eternal/duncan-hall/location/steps', // 400 lm
  '/world/terminus/goods-yards/bottling/location/floor', // 25 lm
  '/world/terminus/goods-yards/brewing/location/cold-store', // 15 lm
  '/world/terminus/goods-yards/brewing/location/floor', // 25 lm
  '/world/terminus/goods-yards/crowsfoot/location/floor', // 25 lm
  '/world/terminus/goods-yards/farm/location/yard', // 25 lm
  '/world/terminus/goods-yards/hollis/location/floor', // 30 lm
  '/world/terminus/goods-yards/pantry/location/floor', // 25 lm
  '/world/terminus/goods-yards/veshko/location/distillery', // 30 lm
  '/world/terminus/goods-yards/vintner/location/floor', // 25 lm
  '/world/terminus/hearthworks/location/cellar', // 15 lm
  '/world/terminus/hearthworks/location/cookhouse', // 35 lm
  '/world/terminus/hearthworks/location/smithy', // 40 lm
  '/world/terminus/hearthworks/location/woodshed', // 45 lm
  '/world/terminus/hearts-delight/location/barn', // 300 lm
  '/world/terminus/hinkley-hills/lots/hall', // 40 lm
  '/world/terminus/hinkley-hills/lots/kitchen', // 60 lm
  '/world/terminus/market/bakery', // 400 lm
  '/world/terminus/mayfield-row/seznick-house/corridor', // 25 lm
  '/world/terminus/mayfield-row/seznick-house/lobby', // 45 lm
  '/world/terminus/mayfield-row/seznick-house/location/bedroom', // 25 lm
  '/world/terminus/mayfield-row/seznick-house/location/hall', // 30 lm
  '/world/terminus/mayfield-row/seznick-house/location/main', // 55 lm
  '/world/terminus/mayfield-row/tailor/location/shop', // 300 lm
  '/world/terminus/realty/office', // 320 lm
  '/world/terminus/rejection/location/adit', // 800 lm
  '/world/terminus/rejection/location/assay-shed', // 8000 lm
  '/world/terminus/rejection/location/claims-office', // 8000 lm
  '/world/terminus/rejection/location/far-fringe', // 8000 lm
  '/world/terminus/rejection/location/fringe-claim', // 8000 lm
  '/world/terminus/rejection/location/fuel-yard', // 8000 lm
  '/world/terminus/rejection/location/hillside', // 8000 lm
  '/world/terminus/rejection/location/old-workings', // 8000 lm
  '/world/terminus/rejection/location/pithead-yard', // 8000 lm
  '/world/terminus/rejection/location/provisioning', // 2500 lm
  '/world/terminus/rejection/location/smelter', // 8000 lm
  '/world/terminus/rejection/location/the-dry', // 2500 lm
  '/world/terminus/wharfside/dyehouse/location/floor', // 120 lm
  '/world/terminus/wharfside/mill/location/floor', // 90 lm
];

/**
 * Today's count, and it is a RATCHET: it may fall and may never rise. The
 * ceiling IS the list's length, so the two can never disagree.
 */
export const UNDECLARED_INTERIOR_AMBIENT_CEILING =
  UNDECLARED_INTERIOR_AMBIENT.length;

/**
 * Enclosed rooms daylight genuinely reaches, through an opening the row
 * also authors as a detail you can look at.
 */
export const SKYLIT_INTERIORS: readonly string[] = [];

/**
 * Rooms with an inherent, always-on, non-sky ambient: a luminous cave, a
 * floor that is itself a light. These do NOT follow the sun.
 */
export const INHERENT_GLOWS: readonly string[] = [];

/**
 * Sky-exposed places that are nonetheless dark — the bottom of a shaft, a
 * deep well, a place the sky is technically above and practically not.
 */
export const DARK_UNDER_THE_SKY: readonly string[] = [];

/** Class names that would BE a street lamp. Clause (e) refuses all of them. */
const LAMP_OBJECT_PATTERNS = [/Lamppost/, /StreetLamp/, /StreetLight/];

interface Row {
  path: string;
  file: string;
  class: string;
  data: Record<string, unknown>;
}

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
      const d = doc as Record<string, unknown>;
      if (typeof d.class !== "string") continue;
      const rel = relative(contentRoot, file).replace(/\.yaml$/, "");
      const path = "/" + rel.split(/[\\/]/).join("/");
      out.set(path, {
        path,
        file: relative(REPO, file),
        class: d.class,
        data: (d.data as Record<string, unknown>) ?? {},
      });
    }
  }
  return out;
}

const atmosphericCache = new Map<string, boolean>();
const skyBiomeCache = new Map<string, boolean>();
const furnaceCache = new Map<string, boolean>();

/** A scope that can carry an atmosphere — a Location or a Vessel. */
function isAtmosphericRow(row: Row, sources: readonly PackSource[]): boolean {
  return composesMixin(row.class, "AtmosphericMixin", sources, atmosphericCache);
}

function isFurnaceRow(row: Row, sources: readonly PackSource[]): boolean {
  return composesMixin(row.class, "FurnaceMixin", sources, furnaceCache);
}

/**
 * Is this biome row's class a `SkyExposedBiome`?
 *
 * ⚠ The CLASS decides, never the folder. `indoor/cafeteria-atrium` is a
 * `SkyExposedBiome` sitting under the `indoor/` admin folder and it is
 * right to be — an atrium has a glass roof. A path test would have called
 * it enclosed and left it dark at noon.
 */
function isSkyBiome(path: string, rows: Map<string, Row>, sources: readonly PackSource[]): boolean {
  const row = rows.get(path);
  if (!row) return false;
  return composesMixin(row.class, "SkyExposedMixin", sources, skyBiomeCache);
}

/**
 * ⭐ Is this row open to the sky, as the runtime walk would decide it?
 *
 * `skyExposedWalk` reads the scope's own `_biomePath` (then its enclosing
 * containers', which a room root has none of) and asks whether that biome
 * composes `SkyExposedMixin`; no biome resolves to `false`. This mirrors
 * it exactly — which is the point: the gate must agree with the game.
 */
function isSkyExposedRow(
  row: Row,
  rows: Map<string, Row>,
  sources: readonly PackSource[],
): boolean {
  const biome = row.data._biomePath;
  if (typeof biome !== "string") return false;
  return isSkyBiome(biome, rows, sources);
}

function ambientIntensityOf(row: Row): number {
  const v = row.data.ambientIntensity;
  return typeof v === "number" ? v : 0;
}

function ambientSourceOf(row: Row): string | null {
  const v = row.data.ambientSource;
  return typeof v === "string" ? v : null;
}

/**
 * The row's light-receiving area in m², where it is knowable statically:
 * the row's own `extent` squared, else the longest-prefix zone row's
 * `cellSize` squared. `null` when neither is authored — the warning in
 * clause (d) simply skips those rather than guessing.
 */
function sizeScaleOf(row: Row, rows: Map<string, Row>): number | null {
  const own = row.data.extent;
  if (typeof own === "number" && own > 0) return own * own;
  let best: number | null = null;
  let bestLen = -1;
  for (const [path, candidate] of rows) {
    if (!row.path.startsWith(path + "/")) continue;
    const cell = candidate.data.cellSize;
    if (typeof cell !== "number" || cell <= 0) continue;
    if (path.length > bestLen) {
      bestLen = path.length;
      best = cell * cell;
    }
  }
  return best;
}

interface Reading {
  row: Row;
  skyExposed: boolean;
  source: string | null;
  ambient: number;
}

function readings(): { readings: Reading[]; rows: Map<string, Row>; sources: readonly PackSource[] } {
  const rows = contentRows();
  const sources = packSources();
  const out: Reading[] = [];
  for (const row of rows.values()) {
    if (!isAtmosphericRow(row, sources)) continue;
    out.push({
      row,
      skyExposed: isSkyExposedRow(row, rows, sources),
      source: ambientSourceOf(row),
      ambient: ambientIntensityOf(row),
    });
  }
  out.sort((a, b) => a.row.path.localeCompare(b.row.path));
  return { readings: out, rows, sources };
}

function report(): void {
  const { readings: rs } = readings();
  console.log(
    `\nlint:light-sources --report — ${rs.length} atmospheric row(s).\n`,
  );
  for (const r of rs) {
    const how = r.source
      ? `declared:${r.source}`
      : r.skyExposed
        ? "derived:sky"
        : r.ambient > 0
          ? "UNDECLARED"
          : "dark (lit by what is in it, or by spill)";
    const cal = r.ambient > 0 ? ` [${r.ambient} lm authored]` : "";
    console.log(`  ${r.row.path}  — ${how}${cal}`);
  }
  console.log();
}

function seed(): void {
  const { readings: rs } = readings();
  const candidates = rs.filter(
    (r) => !r.skyExposed && r.source === null && r.ambient > 0,
  );
  console.log(
    `\nlint:light-sources --seed — ${candidates.length} enclosed row(s) ` +
      `emitting ambient light with no declared source.\n` +
      `Paste into UNDECLARED_INTERIOR_AMBIENT; the ceiling is the list's ` +
      `own length.\n`,
  );
  for (const r of candidates) {
    console.log(`  '${r.row.path}', // ${r.ambient} lm`);
  }
  console.log();
}

/**
 * Clause (e)'s source half: no class anywhere IS a street lamp. Walks the
 * kernel tree AND every pack's `src/`, because a pack can ship classes.
 */
function lampObjectClasses(sources: readonly PackSource[]): string[] {
  const found: string[] = [];
  const trees = [MUD, ...sources.map((s) => s.srcDir)];
  for (const tree of trees) {
    if (!existsSync(tree)) continue;
    for (const file of packSrcFiles(tree)) {
      const base = file.split(/[\\/]/).pop() ?? "";
      if (LAMP_OBJECT_PATTERNS.some((p) => p.test(base))) {
        found.push(relative(REPO, file));
      }
    }
  }
  return found;
}

function lint(): void {
  const { readings: rs, rows, sources } = readings();
  const byPath = new Map(rs.map((r) => [r.row.path, r]));
  const failures: string[] = [];
  const warnings: string[] = [];

  const ratchet = (
    name: string,
    list: readonly string[],
    ceiling: number,
  ): void => {
    if (list.length > ceiling) {
      failures.push(
        `${name} has ${list.length} entries, over the ceiling of ` +
          `${ceiling}. The list may fall and may never rise.`,
      );
    }
  };

  // (a) the debt, and its ratchet
  ratchet(
    "UNDECLARED_INTERIOR_AMBIENT",
    UNDECLARED_INTERIOR_AMBIENT,
    UNDECLARED_INTERIOR_AMBIENT_CEILING,
  );
  const undeclared = rs.filter(
    (r) => !r.skyExposed && r.source === null && r.ambient > 0,
  );
  for (const r of undeclared) {
    if (UNDECLARED_INTERIOR_AMBIENT.includes(r.row.path)) continue;
    failures.push(
      `${r.row.file}: '${r.row.path}' is not open to the sky, emits ` +
        `${r.ambient} lumens of ambient light, and says nothing about ` +
        `where that light comes from. Every room's light has a named ` +
        `source (S2): give it a lamp or a hearth in \`props:\`, or ` +
        `\`ambientSource: sky\` + the opening it comes through, or delete ` +
        `the value and let daylight spill in through the door.`,
    );
  }
  for (const path of UNDECLARED_INTERIOR_AMBIENT) {
    const r = byPath.get(path);
    if (!r) {
      failures.push(
        `'${path}' is listed in UNDECLARED_INTERIOR_AMBIENT but is not an ` +
          `atmospheric row (moved? deleted?). A list of ghosts measures ` +
          `nothing.`,
      );
      continue;
    }
    if (r.skyExposed || r.source !== null || r.ambient === 0) {
      failures.push(
        `'${path}' now names a source — the debt is PAID. Delete its line ` +
          `from UNDECLARED_INTERIOR_AMBIENT; the ceiling falls with it.`,
      );
    }
  }

  // (b) a skylit interior names its opening, and the opening is real
  ratchet("SKYLIT_INTERIORS", SKYLIT_INTERIORS, SKYLIT_INTERIORS.length);
  for (const r of rs) {
    if (r.source !== "sky") continue;
    if (r.skyExposed) continue; // declaring what is already true: harmless
    const opening = r.row.data.ambientOpening;
    if (typeof opening !== "string" || opening === "") {
      failures.push(
        `${r.row.file}: \`ambientSource: sky\` on an enclosed room with no ` +
          `\`ambientOpening\`. Daylight reaching an enclosed room arrives ` +
          `THROUGH something; name the detail so a player can look at it.`,
      );
      continue;
    }
    const details = r.row.data.details;
    const ids =
      details && typeof details === "object"
        ? Object.keys(details as Record<string, unknown>)
        : [];
    if (!ids.includes(opening)) {
      failures.push(
        `${r.row.file}: \`ambientOpening: ${opening}\` names no detail on ` +
          `this row (has: ${ids.join(", ") || "none"}). The opening must be ` +
          `a thing you can look at, or the claim is another number.`,
      );
    }
    if (!SKYLIT_INTERIORS.includes(r.row.path)) {
      failures.push(
        `'${r.row.path}' declares \`ambientSource: sky\` while enclosed and ` +
          `is not in SKYLIT_INTERIORS. Add the line with its reason and ` +
          `raise nothing — the ceiling IS the list.`,
      );
    }
  }

  // (c) the two other exception lists
  const listed = (
    kind: string,
    list: readonly string[],
    listName: string,
  ): void => {
    ratchet(listName, list, list.length);
    for (const r of rs) {
      if (r.source !== kind) continue;
      if (!list.includes(r.row.path)) {
        failures.push(
          `'${r.row.path}' declares \`ambientSource: ${kind}\` and is not ` +
            `in ${listName}. Add the line with its reason.`,
        );
      }
    }
    for (const path of list) {
      const r = byPath.get(path);
      if (!r) {
        failures.push(
          `'${path}' is listed in ${listName} but is not an atmospheric ` +
            `row. A list of ghosts measures nothing.`,
        );
      } else if (r.source !== kind) {
        failures.push(
          `'${path}' is listed in ${listName} but no longer declares ` +
            `\`ambientSource: ${kind}\`. Delete the line.`,
        );
      }
    }
  };
  listed("glow", INHERENT_GLOWS, "INHERENT_GLOWS");
  listed("none", DARK_UNDER_THE_SKY, "DARK_UNDER_THE_SKY");

  // (d) a gloomy calibration — WARNED, never failed
  for (const r of rs) {
    if (r.ambient === 0) continue;
    const scale = sizeScaleOf(r.row, rows);
    if (scale === null) continue;
    const lux = r.ambient / scale;
    if (lux >= LIT_LUX) continue;
    warnings.push(
      `${r.row.file}: ${r.ambient} lumens over ${scale.toFixed(1)} m² is ` +
        `${lux.toFixed(1)} lux — below 'lit'. Deliberate gloom is fine; a ` +
        `value copied from a room of another size is not.`,
    );
  }

  // (e) ⭐⭐ no lamp object anywhere
  const lampClasses = lampObjectClasses(sources);
  for (const f of lampClasses) {
    failures.push(
      `${f}: a class that IS a street lamp. ⭐⭐ The town's lamps are a ` +
        `PROPERTY of the street (\`publicLighting:\`) and prose beside it — ` +
        `nothing is minted (acceptance 6). If a later build wants ONE lamp ` +
        `smashed or climbed, that lamp becomes a prop at THAT spot; not ` +
        `41 of them on the chance.`,
    );
  }
  let publicLit = 0;
  for (const r of rs) {
    if (r.row.data.publicLighting === undefined) continue;
    publicLit++;
    for (const key of ["props", "adornments"] as const) {
      const placed = r.row.data[key];
      if (!Array.isArray(placed)) continue;
      for (const p of placed) {
        const path =
          typeof p === "string" ? p : ((p as { template?: string })?.template ?? null);
        if (!path) continue;
        const target = rows.get(path);
        if (!target) continue;
        if (
          composesMixin(target.class, "LightSourceMixin", sources, new Map())
        ) {
          failures.push(
            `${r.row.file}: a street declaring \`publicLighting\` also ` +
              `places '${path}', which emits light. The service IS the ` +
              `light; a lamp object beside it would be counted twice and ` +
              `would keep burning when the town stopped paying.`,
          );
        }
      }
    }
  }

  // (f) ⚠⚠ one sky for one world
  let profiles = 0;
  for (const row of rows.values()) {
    if (row.data.celestialProfile === undefined) continue;
    profiles++;
    failures.push(
      `${row.file}: authors \`celestialProfile\`. ⚠⚠ ` +
        `\`CelestialApi.skyFactorNow()\` is ONE memo for the whole realm, ` +
        `read synchronously by the light walk with no location in hand, so ` +
        `a second profile is silently wrong for every room it does not ` +
        `describe (envelope D1). Per-zone profiles are a named deferred ` +
        `seam — see time.md § Future work.`,
    );
  }

  // (g) ⚠ a furnace row that forgets `lit:` ships burning
  let furnaceRows = 0;
  for (const row of rows.values()) {
    if (!isFurnaceRow(row, sources)) continue;
    furnaceRows++;
    if (row.data.lit === undefined) {
      failures.push(
        `${row.file}: a furnace row with no \`lit:\`. ⚠ ` +
          `\`FurnaceMixin.lit\` defaults TRUE, so this ships alight with ` +
          `its fuel draining — a lantern burning on a shop shelf nobody ` +
          `lit. Author \`lit: false\` (or \`true\`, and mean it).`,
      );
    }
  }

  for (const w of warnings) console.warn(`  ⚠ ${w}\n`);
  if (failures.length) {
    console.error(`\n✖ lint:light-sources — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  const sky = rs.filter((r) => r.skyExposed).length;
  console.log(
    `check-light-sources: ${rs.length} atmospheric row(s) — ${sky} follow ` +
      `the sky by derivation; ` +
      `${SKYLIT_INTERIORS.length} skylit interior(s), ` +
      `${INHERENT_GLOWS.length} inherent glow(s), ` +
      `${DARK_UNDER_THE_SKY.length} dark under the sky; ` +
      `${UNDECLARED_INTERIOR_AMBIENT.length}/` +
      `${UNDECLARED_INTERIOR_AMBIENT_CEILING} undeclared interior(s) ` +
      `outstanding; ${publicLit} street(s) publicly lit and no lamp object ` +
      `anywhere; ${profiles} celestial profile(s) authored; ` +
      `${furnaceRows} furnace row(s) all declare \`lit:\`.`,
  );
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  if (mode === "--report") return report();
  if (mode === "--seed") return seed();
  lint();
}

if (process.argv[1] && /check-light-sources\.ts$/.test(process.argv[1])) main();
