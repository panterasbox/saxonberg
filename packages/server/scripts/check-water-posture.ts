/**
 * check-water-posture — ⭐ **a premises that never said where its water
 * comes from.** The water twin of `check-power-posture` (water-supply build,
 * D1).
 *
 * Every title claim whose `landUse` is a PREMISES — `residential`,
 * `commercial`, `industrial` or `civic` — is a place a pipe either reaches or
 * does not, and the water-supply build's point is that the answer is
 * DECLARED: a premises cites the supply its taps hang off (a main, a tank, a
 * cistern), or declares `waterSource: none` — dry on purpose. A premises
 * claim that says neither (and inherits nothing from a parent claim) is a
 * place every tap in reads `unplumbed` because nobody said anything — the
 * mistake that dries every bar in the realm in one missed line.
 *
 * ⚠ `agricultural` and `wild` are exempt (the power gate's hermit rule): a
 * field draws from its own water, through gates and wells, not a premises
 * citation. A claim with no `landUse` of its own is not checked here either,
 * exactly as the power gate does not.
 *
 * ⚠ **The realm root declares nothing**, and must not: an inherited
 * citation from `/world/terminus` would put Rejection on the city main. So
 * the inherit walk here is the same author-time one the power gate runs —
 * a claim whose extent sits under another claim in the same manifest that
 * cites — and the root's own claim is a premises like any other that
 * declares for itself.
 *
 * A ratchet at zero from the day it landed.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

/** ⚠⚠ The ratchet. May fall, never rise. */
export const WATER_POSTURE_CEILING = 0;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

/** The land uses that are PREMISES — a place taps hang off, or declare none. */
const PREMISES_USES = new Set([
  'residential',
  'commercial',
  'industrial',
  'civic',
]);

interface Claim {
  extent: string;
  landUse?: string;
  waterSource?: string;
  parentParcel?: string;
}

/** Every title claim across every pack manifest, with its owning pack. */
function allClaims(): Array<{ pack: string; claim: Claim; claims: Claim[] }> {
  const out: Array<{ pack: string; claim: Claim; claims: Claim[] }> = [];
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT)) {
    const manifest = join(CONTENT, pack, 'pack.yaml');
    if (!existsSync(manifest)) continue;
    let parsed: unknown;
    try {
      parsed = YAML.parse(readFileSync(manifest, 'utf8'));
    } catch {
      continue; // a malformed manifest is PackLogic's finding
    }
    const title = (parsed as { requires?: { title?: unknown } })?.requires
      ?.title;
    if (!Array.isArray(title)) continue;
    const claims = title as Claim[];
    for (const claim of claims) {
      if (claim && typeof claim.extent === 'string') {
        out.push({ pack, claim, claims });
      }
    }
  }
  return out;
}

/**
 * Declares a water source, or inherits a SUPPLY from a parent claim in its
 * manifest. ⭐ An inherited `none` does not count: a premises is dry only if
 * it says so itself — a root's `none` must never silently declare every
 * district under it dry (lens 3a: the realm should not lie for the house).
 */
function hasWaterSource(claim: Claim, siblings: Claim[]): boolean {
  const cites = (c: Claim): boolean =>
    typeof c.waterSource === 'string' && c.waterSource.length > 0;
  if (cites(claim)) return true;
  return siblings.some(
    (s) =>
      s !== claim &&
      cites(s) &&
      s.waterSource !== 'none' &&
      (claim.parentParcel === s.extent ||
        claim.extent.startsWith(s.extent + '/')),
  );
}

function main(): void {
  const undeclared: string[] = [];
  for (const { pack, claim, claims } of allClaims()) {
    if (!claim.landUse || !PREMISES_USES.has(claim.landUse)) continue;
    if (hasWaterSource(claim, claims)) continue;
    undeclared.push(`${pack}: ${claim.extent} (${claim.landUse})`);
  }
  const n = undeclared.length;
  // eslint-disable-next-line no-console -- the gate's own report
  console.log(
    `check-water-posture: ${n} premises claim(s) declare no waterSource ` +
      `(ceiling ${WATER_POSTURE_CEILING}).`,
  );
  if (n > WATER_POSTURE_CEILING) {
    for (const u of undeclared) {
      // eslint-disable-next-line no-console -- name each offender
      console.error(`  ✗ ${u}`);
    }
    console.error(
      `check-water-posture: FAIL — ${n} exceeds the ceiling of ` +
        `${WATER_POSTURE_CEILING}. A premises must cite its water ` +
        `(waterSource: <a supply's path> | none), or inherit one from a ` +
        `parent claim. ⚠ This is a RATCHET: the ceiling may fall, never rise.`,
    );
    process.exit(1);
  }
}

main();
