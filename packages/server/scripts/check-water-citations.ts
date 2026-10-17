/**
 * check-water-citations — ⭐ **a water a place cites is a feature of that
 * place.**
 *
 * A shore (`ShoreMixin`) honours a `waters:` entry only when its key is
 * also one of the place's `details:` features — the feature is what a
 * player names (`fill bucket from river`, `look mere`) and what the cited
 * water answers to. A key with no feature is cited by NOTHING: `waterFor()`
 * answers *"There is no water here."*, every draw verb refuses, and a
 * pool's floor never binds the reach it is the ice of. At runtime the only
 * trace is one boot-log warning (*"cites a water under 'mere', which is
 * none of its features"*).
 *
 * Found by the storage-and-ice drive (run 3): Hollow Mere's pool and far
 * bank cited `mere` with no `mere` detail, so `fish` found no water on the
 * mere and every walker went through ice the reach itself said would bear
 * them.
 *
 * The rule: for every template row, each key of its effective `waters:`
 * names a key of its effective `details:`.
 */

import { relative } from "path";
import {
  CONTENT,
  SERVER_SRC,
  effectiveRow,
  inheritanceIndex,
  type TemplateRow,
} from "./pack-roots";

export interface WaterCitationFinding {
  where: string;
  detail: string;
}

/** The census over an already-read world — pure, so a test hands it fixtures. */
export function checkWaterCitations(
  rows: ReadonlyMap<string, TemplateRow>,
): WaterCitationFinding[] {
  const out: WaterCitationFinding[] = [];
  for (const [path, row] of rows) {
    const data = effectiveRow(path, rows).data;
    const waters = data.waters;
    if (!waters || typeof waters !== "object" || Array.isArray(waters)) continue;
    const details = data.details;
    const features =
      details && typeof details === "object" && !Array.isArray(details)
        ? new Set(Object.keys(details as Record<string, unknown>))
        : new Set<string>();
    for (const key of Object.keys(waters as Record<string, unknown>)) {
      if (features.has(key)) continue;
      out.push({
        where: relative(CONTENT, row.file),
        detail:
          `${path} cites a water under '${key}' and has no '${key}' detail — ` +
          `the citation is dead: draws refuse with "There is no water here", ` +
          `and a pool's floor never binds its reach. Add a '${key}' entry ` +
          `to details:.`,
      });
    }
  }
  return out;
}

function main(): void {
  const { rows } = inheritanceIndex(SERVER_SRC, CONTENT);
  const findings = checkWaterCitations(rows);
  if (findings.length === 0) {
    console.info("check-water-citations: ok — every cited water is a feature of its place.");
    return;
  }
  for (const f of findings) console.error(`  ⚠ ${f.where}\n      ${f.detail}`);
  console.error(`\n✖ check-water-citations: ${findings.length} finding(s).`);
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-water-citations.ts")) {
  main();
}
