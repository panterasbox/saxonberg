/**
 * check-anatomy — ⭐ **a body plan's tissue shares must sum to the whole
 * body, and every share must name something real.**
 *
 * A `TissueComposition` states the **share of the whole body's mass** a
 * tissue of a part carries, and part mass is `share × the instance's own
 * mass`. That is what lets ONE plan serve every size of animal:
 * `quadruped` is named by sheep, cattle, dogs, cats and horses, and
 * `avian` by a canary and a hen.
 *
 * ⚠⚠ **It replaced absolute kilograms, which were already a lie.** The
 * quadruped plan authored a 28 kg torso and a bullock claimed the same one
 * as a ewe; `avian`'s canary-sized 4 g of torso bone is why nothing else
 * could reuse it. Nothing errored, because nothing checked: the masses
 * fed only `partArea`, whose two readers are ratio-only, so the fiction
 * was invisible by construction.
 *
 * ⭐ **Shares can carry the same lie unless something adds them up.** A
 * plan whose shares sum to 0.6 describes a body that is 40 % nothing —
 * every part under-massed, every surface fraction wrong, and silent. The
 * setter cannot catch it: it sees one tissue at a time, and test fixtures
 * author one-part bodies on purpose. **Only a whole-row check can, which
 * is this gate.**
 *
 * The clauses:
 *
 * - **(a)** every shipped `BodyPlan` row's shares sum to `1 ± 1e-3`.
 * - **(b)** every `Species.tissueShares` key names a tissue the species'
 *   body plan actually carries, and resolves to a Material row. *(Arrives
 *   with the field in W21; a named stub until then, so the clause list is
 *   the gate's contract rather than its history.)*
 * - **(c)** every `Cut` row's claimed tissues exist on the species it is
 *   authored for. *(W22.)*
 *
 * ⚠ A plan with **no tissues at all** is exempt from (a), and
 * deliberately: `sessile` is a plant — no limbs, no organs, nothing to
 * weigh — and a zero sum there is the honest answer rather than a
 * finding. The exemption is for an EMPTY plan, not a partial one: a plan
 * that states some tissues must state all of them.
 *
 * ⚠⚠ **Not a ratchet.** The sum is an invariant, not a population to
 * burn down: there is no honest count of bodies that are 40 % nothing, so
 * there is no ceiling to lower. Compare `check-mass`, which caps a
 * census.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const HERE = resolve(fileURLToPath(import.meta.url), '..');
const CONTENT = resolve(HERE, '../../content');
const SKIP = new Set(['node_modules', '.git', 'dist']);

/** How far a row's shares may sum from 1 before it is a finding. */
const SUM_TOLERANCE = 1e-3;

interface Finding {
  file: string;
  detail: string;
}

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, ext));
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

/** Every shipped row whose `data` carries a `bodyParts` list. */
function bodyPlanRows(): { file: string; parts: unknown[] }[] {
  const rows: { file: string; parts: unknown[] }[] = [];
  if (!existsSync(CONTENT)) return rows;
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    for (const file of walk(root, '.yaml')) {
      let parsed: unknown;
      try {
        parsed = YAML.parse(readFileSync(file, 'utf8'));
      } catch {
        continue; // a malformed row is another gate's finding
      }
      const data = (parsed as { data?: { bodyParts?: unknown } } | null)?.data;
      if (!data || !Array.isArray(data.bodyParts)) continue;
      rows.push({ file: relative(resolve(HERE, '../../..'), file), parts: data.bodyParts });
    }
  }
  return rows;
}

/** Clause (a) — the shares of a plan sum to the whole body. */
export function clauseSharesSumToOne(
  rows: { file: string; parts: unknown[] }[],
): Finding[] {
  const out: Finding[] = [];
  for (const row of rows) {
    let sum = 0;
    let count = 0;
    for (const part of row.parts) {
      const tissues = (part as { tissues?: unknown }).tissues;
      if (!Array.isArray(tissues)) continue;
      for (const t of tissues) {
        const share = (t as { share?: unknown }).share;
        if (typeof share !== 'number') {
          out.push({
            file: row.file,
            detail:
              `part '${(part as { key?: string }).key}' tissue ` +
              `'${(t as { tissuePath?: string }).tissuePath}' states no ` +
              `numeric 'share'` +
              ('mass' in (t as object) ? " — it still authors 'mass'" : ''),
          });
          continue;
        }
        sum += share;
        count += 1;
      }
    }
    // An EMPTY plan is exempt; a partial one is not. See the header.
    if (count === 0) continue;
    if (Math.abs(sum - 1) > SUM_TOLERANCE) {
      out.push({
        file: row.file,
        detail:
          `${count} tissue share(s) sum to ${sum.toFixed(4)}, not 1 — ` +
          `this body is ${((1 - sum) * 100).toFixed(1)}% nothing`,
      });
    }
  }
  return out;
}

/** Clause (b) — a species' share overrides name tissues its plan carries. (W21) */
export function clauseSpeciesOverridesResolve(): Finding[] {
  return [];
}

/** Clause (c) — a cut's claimed tissues exist on its species. (W22) */
export function clauseCutClaimsResolve(): Finding[] {
  return [];
}

function main(): void {
  const rows = bodyPlanRows();
  const findings = [
    ...clauseSharesSumToOne(rows),
    ...clauseSpeciesOverridesResolve(),
    ...clauseCutClaimsResolve(),
  ];
  console.log(
    `check-anatomy: ${rows.length} body-plan row(s) scanned; ` +
      `${findings.length} finding(s).`,
  );
  if (findings.length > 0) {
    console.error(
      `\ncheck-anatomy: FAIL.\n` +
        `A tissue states a SHARE of the whole body's mass, and the shares ` +
        `of a plan must sum to 1 — part mass is 'share × the body's own ` +
        `mass', so a plan summing to less describes a body that is partly ` +
        `nothing, in every part, silently.\n` +
        `⚠ This is an INVARIANT, not a ratchet: there is no ceiling to ` +
        `raise.\n\nThe rows:\n` +
        findings.map((f) => `  ✗ ${f.file}\n      ${f.detail}`).join('\n'),
    );
    process.exit(1);
  }
  console.log('check-anatomy: every body plan weighs a whole body. ✔');
}

if (process.argv[1] && /check-anatomy\.ts$/.test(process.argv[1])) main();
