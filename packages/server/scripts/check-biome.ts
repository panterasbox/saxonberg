/**
 * check-biome — ⭐⭐ **does every biome a room names exist, and is the
 * roster a tree with one root?**
 *
 * ## Why
 *
 * A biome is reference data: a row a room cites by path (`_biomePath`)
 * and the chain resolver walks by its `extends:`. Every link fails
 * SILENT. A room citing a path with no row reads the universe default
 * and looks fine; a row whose class does not load is skipped by the
 * catalogue's warm; a chain that ends anywhere but the universe answers
 * whatever its last link had. `lint:census` (b) checks that a cited path
 * EXISTS — this gate checks that it is a biome, that the roster is one
 * tree, and that the climate build's rule holds.
 *
 * ## The clauses
 *
 *   (a) every `_biomePath` cited by any row resolves to a row whose class
 *       extends `Biome` — not merely to a row (census stops at existence:
 *       a room citing a `FolderZone` folder passes census and has no air).
 *   (b) every biome row's `extends:` chain terminates at the universe root
 *       with no cycle and no missing link.
 *   (c) the root authors all six mandatory `_default*` fields (the chain's
 *       step 6 throws without them — at boot, not here, unless here).
 *   (d) ⭐⭐ no row whose class composes `SkyExposedMixin` authors
 *       `_defaultTemperature`. **The climate build's rule as a gate:**
 *       under the sky the temperature is DERIVED from latitude,
 *       elevation, continentality and offset; a flat number on an outdoor
 *       biome would override the climate for every room that cites it, in
 *       every season. The honest tool for *this place is warm for its
 *       latitude* is the zone's `climateOffsetK`.
 *   (e) every biome row's class LOADS (its source file resolves). The
 *       catalogue's warm skips a class that fails to load, silently; this
 *       makes it loud at build time.
 *
 * ## Usage
 *
 *   pnpm lint:biome
 */

import { existsSync } from "fs";
import { relative, join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  classFileOf,
  composesMixin,
  extendsAny,
  packSources,
  templateRows,
  effectiveDoc,
  inheritanceIndex,
  type PackSource,
} from "./pack-roots";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");

/** The root of the biome inheritance tree. */
export const ROOT_BIOME_PATH = "/stuff/idea/biome/universe";

/** The six fields every chain must be able to answer at its root. */
export const MANDATORY_ROOT_FIELDS = [
  "_defaultTemperature",
  "_defaultPressure",
  "_defaultHumidity",
  "_defaultWind",
  "_defaultGravity",
  "_defaultAtmosphere",
] as const;

/** The class paths a biome row's class must descend from. */
const BIOME_ROOT_CLASSES = ["/lib/biome/Biome", "/platform/idea/Biome"];

/** One row, as the gate reasons about it (effective class + data). */
export interface BiomeGateRow {
  path: string;
  file: string;
  class: string | null;
  /** The row's own `extends:` (template inheritance — the biome parent). */
  extends: string | null;
  data: Record<string, unknown>;
}

/** What the gate needs to know about classes — injected so a test can stub it. */
export interface BiomeClassFacts {
  isBiome(classPath: string): boolean;
  isSkyExposed(classPath: string): boolean;
  loads(classPath: string): boolean;
}

/**
 * The gate's verdicts over a set of rows — pure, so the fixture test can
 * hand it a synthetic tree.
 */
export function biomeFindings(
  rows: ReadonlyMap<string, BiomeGateRow>,
  facts: BiomeClassFacts,
): { failures: string[]; biomeRows: number; citations: number } {
  const failures: string[] = [];
  const biomeRows = [...rows.values()].filter(
    (r) => r.class !== null && facts.isBiome(r.class),
  );

  // (a) citations resolve to a BIOME row.
  let citations = 0;
  for (const row of rows.values()) {
    const cited = row.data._biomePath;
    if (typeof cited !== "string") continue;
    citations++;
    const target = rows.get(cited);
    if (!target) {
      failures.push(
        `${row.file}: cites _biomePath '${cited}', which is no row. The ` +
          `room reads the universe default and nothing says why.`,
      );
      continue;
    }
    if (target.class === null || !facts.isBiome(target.class)) {
      failures.push(
        `${row.file}: cites _biomePath '${cited}', a row whose class ` +
          `(${target.class ?? "none"}) is not a Biome — a folder, or a ` +
          `typo for a sibling. The room has no air of its own.`,
      );
    }
  }

  for (const row of biomeRows) {
    // (b) the chain ends at the root.
    if (row.path !== ROOT_BIOME_PATH) {
      const seen = new Set<string>([row.path]);
      let cursor: BiomeGateRow | undefined = row;
      let verdict: string | null = null;
      for (let depth = 0; depth < 32; depth++) {
        const parent: string | null = cursor?.extends ?? null;
        if (parent === null) {
          verdict = `its extends: chain stops at '${cursor?.path}', which is not the root`;
          break;
        }
        if (parent === ROOT_BIOME_PATH) break;
        if (seen.has(parent)) {
          verdict = `its extends: chain cycles at '${parent}'`;
          break;
        }
        seen.add(parent);
        cursor = rows.get(parent);
        if (!cursor) {
          verdict = `its extends: chain names '${parent}', which is no row`;
          break;
        }
      }
      if (verdict) {
        failures.push(
          `${row.file}: a biome row whose ${verdict}. Every chain must end ` +
            `at ${ROOT_BIOME_PATH}, or the resolver answers whatever the ` +
            `last link had.`,
        );
      }
    }

    // (d) the climate rule.
    if (
      row.class !== null &&
      facts.isSkyExposed(row.class) &&
      row.data._defaultTemperature !== undefined
    ) {
      failures.push(
        `${row.file}: a sky-exposed biome authoring _defaultTemperature. ` +
          `⭐⭐ Under the sky the temperature is DERIVED — latitude, ` +
          `elevation, continentality, offset — and a flat number here ` +
          `would override the climate for every room that cites it, in ` +
          `every season. Author the zone's climateOffsetK instead.`,
      );
    }

    // (e) the class loads.
    if (row.class !== null && !facts.loads(row.class)) {
      failures.push(
        `${row.file}: a biome row whose class '${row.class}' does not ` +
          `resolve to a source file. The catalogue's warm would skip it ` +
          `silently.`,
      );
    }
  }

  // (c) the root answers every mandatory field.
  const root = rows.get(ROOT_BIOME_PATH);
  if (!root) {
    failures.push(`no row at ${ROOT_BIOME_PATH}: the biome tree has no root.`);
  } else {
    for (const field of MANDATORY_ROOT_FIELDS) {
      if (root.data[field] === undefined) {
        failures.push(
          `${root.file}: the universe root does not author ${field}. The ` +
            `chain's last step reads it for every place nothing else ` +
            `answers.`,
        );
      }
    }
  }

  return { failures, biomeRows: biomeRows.length, citations };
}

function diskRows(): ReadonlyMap<string, BiomeGateRow> {
  const idx = inheritanceIndex();
  const out = new Map<string, BiomeGateRow>();
  for (const [path, row] of templateRows()) {
    const eff = effectiveDoc(row.file, row.raw, idx);
    out.set(path, {
      path,
      file: relative(REPO, row.file),
      class: typeof eff.class === "string" ? eff.class : null,
      extends: typeof row.raw.extends === "string" ? row.raw.extends : null,
      data:
        eff.data && typeof eff.data === "object"
          ? (eff.data as Record<string, unknown>)
          : {},
    });
  }
  return out;
}

export function diskFacts(sources: readonly PackSource[]): BiomeClassFacts {
  const biome = new Map<string, boolean>();
  const sky = new Map<string, boolean>();
  return {
    // ⚠ Ancestry, not a mixin match: `Biome` is a base CLASS, and its own
    // twin (`/platform/idea/Biome extends BiomeBase`) names it by alias.
    isBiome: (c) => {
      const hit = biome.get(c);
      if (hit !== undefined) return hit;
      const v = extendsAny(c, BIOME_ROOT_CLASSES, 0, sources);
      biome.set(c, v);
      return v;
    },
    isSkyExposed: (c) => composesMixin(c, "SkyExposedMixin", sources, sky),
    loads: (c) => existsSync(classFileOf(c, sources)),
  };
}

function main(): void {
  const sources = packSources();
  const { failures, biomeRows, citations } = biomeFindings(
    diskRows(),
    diskFacts(sources),
  );
  if (failures.length) {
    console.error(`\n✖ lint:biome — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `check-biome: ${biomeRows} biome row(s), one tree rooted at the ` +
      `universe, every class loading, no sky biome decreeing a ` +
      `temperature; ${citations} _biomePath citation(s), each a biome.`,
  );
}

if (process.argv[1] && /check-biome\.ts$/.test(process.argv[1])) main();
