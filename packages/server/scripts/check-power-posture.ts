/**
 * check-power-posture — ⭐ **a premises that never said what it draws.**
 *
 * Every title claim whose `landUse` is a PREMISES — `residential`,
 * `commercial`, `industrial` or `civic` — is a place power either reaches or
 * does not, and the energy build's whole point is that the answer is DECLARED,
 * not assumed: a shack is off the grid *on purpose*, a works is `industrial`
 * *on purpose*. A premises claim that declares no `powerBand` (and inherits
 * none from a parent claim) is a place whose power posture nobody stated — the
 * exact mistake the build exists to make impossible.
 *
 * ⚠ `agricultural` and `wild` are exempt: a field and an unserviced acre
 * declare nothing, and gating them would turn every pasture into red tape (the
 * `LandUse` hermit rule). If a farmstead should count, widen `PREMISES_USES` —
 * it is one array.
 *
 * ## ⭐⭐ Why a CEILING and not zero (census-then-ratchet)
 *
 * `docs/lint-family.md`'s pattern: the gate opens as a burn-down meter pinned
 * at today's count, so the number cannot GROW while the declarations are
 * written row by row, and the build that writes them re-pins it lower — B3
 * drives it to 0. The ceiling may fall and must never rise.
 *
 * ⚠ **A wrong declaration is NOT this gate's business.** A premises declared
 * `domestic` in a locality no grid reaches is a *disagreement a reviewer sees*,
 * recorded as a diagnostic at install — not a build error. This gate asks only
 * whether anybody said anything at all.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

/**
 * ⚠⚠ The ratchet. Set to the census count when this gate landed (B0). It may
 * FALL — re-pin it in the same commit — and it may never rise. B3 drives it to 0.
 */
export const POWER_POSTURE_CEILING = 0;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

/** The land uses that are PREMISES — a place that draws (or declares it does not). */
const PREMISES_USES = new Set([
  'residential',
  'commercial',
  'industrial',
  'civic',
]);

interface Claim {
  extent: string;
  landUse?: string;
  powerBand?: string;
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
 * Whether `claim` declares a power band, or inherits one from a parent claim in
 * the same manifest — a claim whose extent is a strict prefix of this one's
 * (the longest-prefix inherit walk, at author time).
 */
function hasPowerBand(claim: Claim, siblings: Claim[]): boolean {
  if (typeof claim.powerBand === 'string' && claim.powerBand.length > 0) {
    return true;
  }
  return siblings.some(
    (s) =>
      s !== claim &&
      typeof s.powerBand === 'string' &&
      s.powerBand.length > 0 &&
      (claim.extent === s.parentParcel ||
        claim.extent.startsWith(s.extent + '/')),
  );
}

function main(): void {
  const undeclared: string[] = [];
  for (const { pack, claim, claims } of allClaims()) {
    if (!claim.landUse || !PREMISES_USES.has(claim.landUse)) continue;
    if (hasPowerBand(claim, claims)) continue;
    undeclared.push(`${pack}: ${claim.extent} (${claim.landUse})`);
  }
  const n = undeclared.length;
  // eslint-disable-next-line no-console -- the gate's own report
  console.log(
    `check-power-posture: ${n} premises claim(s) declare no powerBand ` +
      `(ceiling ${POWER_POSTURE_CEILING}).`,
  );
  if (n > POWER_POSTURE_CEILING) {
    for (const u of undeclared) {
      // eslint-disable-next-line no-console -- name each offender
      console.error(`  ✗ ${u}`);
    }
    console.error(
      `check-power-posture: FAIL — ${n} exceeds the ceiling of ` +
        `${POWER_POSTURE_CEILING}. A premises must declare its power posture ` +
        `(powerBand: off-grid | domestic | commercial | industrial), or ` +
        `inherit one from a parent claim. ⚠ This is a RATCHET: the ceiling ` +
        `may fall, never rise.`,
    );
    process.exit(1);
  }
}

main();
