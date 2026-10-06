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
 * - **(b)** every species that yields anything names a body plan that
 *   resolves to a shipped row.
 * - **(c)** no yield line authors a `fraction` beside a claiming cut —
 *   two sources for one number.
 * - **(d/e)** every claimed tissue resolves to a Material row, and is
 *   carried by the body plan of every species whose yield claims it.
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


/** Every shipped row's `data` block, with the file it came from. */
function allRows(): { file: string; doc: unknown }[] {
  if (rowCache) return rowCache;
  const out: { file: string; doc: unknown }[] = [];
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) {
      const root = join(CONTENT, pack, 'content');
      if (!existsSync(root)) continue;
      for (const file of walk(root, '.yaml')) {
        let parsed: unknown;
        try {
          parsed = YAML.parse(readFileSync(file, 'utf8'));
        } catch {
          continue;
        }
        const data = (parsed as { data?: unknown } | null)?.data;
        if (!data || typeof data !== 'object') continue;
        out.push({ file: relative(resolve(HERE, '../../..'), file), doc: data });
      }
    }
  }
  rowCache = out;
  return out;
}
let rowCache: { file: string; doc: unknown }[] | null = null;

/**
 * The template path a content file ships at — `content/<root>/<rest>`
 * becomes `/<root>/<rest>` without the extension, which is the path a
 * `_bodyPlanPath` names.
 */
function rowPathOf(file: string): string | null {
  const m = /content\/[^/]+\/content\/(.+)\.yaml$/.exec(file);
  return m ? `/${m[1]}` : null;
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

/**
 * Clause (b) — every species' `_bodyPlanPath` resolves to a shipped
 * body-plan row.
 *
 * ⚠⚠ A species naming a plan that does not exist has **no anatomy at
 * all**: no parts, no tissues, so every cut derives a share of zero and
 * the animal butchers to nothing. `SpeciesApi.preloadAnatomy` warms what
 * it can find and says nothing about what it cannot.
 *
 * ⭐ This clause used to check `Species.tissueShares` keys. That field is
 * gone: a pig's proportions live in `BodyPlan/swine`, which `extends:`
 * quadruped and restates its shares, so the thing that could have been
 * authored wrong is now a plan reference — and this is the check for it.
 */
export function clauseSpeciesPlanResolves(): Finding[] {
  const out: Finding[] = [];
  const plans = planTissues();
  for (const { file, doc } of allRows()) {
    const data = doc as { butcheryYield?: unknown; _bodyPlanPath?: unknown };
    // Only a species that yields anything — a plant names no plan.
    if (!Array.isArray(data.butcheryYield)) continue;
    const planPath =
      typeof data._bodyPlanPath === 'string' ? data._bodyPlanPath : '';
    if (!planPath) {
      out.push({ file, detail: 'has a butcheryYield but names no _bodyPlanPath' });
      continue;
    }
    if (!plans.has(planPath)) {
      out.push({
        file,
        detail:
          `names body plan '${planPath}', which resolves to no shipped ` +
          `row — the animal would have no anatomy and every claiming ` +
          `cut would derive a share of ZERO`,
      });
    }
  }
  return out;
}

/**
 * Clause (c) — a yield line naming a CLAIMING cut must not also author a
 * `fraction`.
 *
 * ⚠ Two sources for one number. The claim derives the share from the body
 * plan; an authored `fraction` beside it is a second copy that will drift,
 * and the derivation silently wins — so the author's number would be a
 * comment that looks like data.
 */
export function clauseNoDoubleShare(): Finding[] {
  const out: Finding[] = [];
  const claimsFor = cutClaims();
  for (const { file, doc } of allRows()) {
    const lines = (doc as { butcheryYield?: unknown }).butcheryYield;
    if (!Array.isArray(lines)) continue;
    for (const line of lines) {
      const l = line as { cut?: string; fraction?: unknown };
      if (!l.cut || l.fraction === undefined) continue;
      if ((claimsFor.get(l.cut) ?? []).length > 0) {
        out.push({
          file,
          detail:
            `yield line '${l.cut}' authors a fraction AND its cut row ` +
            `claims tissues — the claim derives the share, so the ` +
            `authored number is a second copy that will drift`,
        });
      }
    }
  }
  return out;
}

/**
 * Clause (d/e) — every tissue a cut claims resolves to a Material row,
 * and every tissue a species' yield claims is on that species' own body
 * plan.
 *
 * ⚠⚠ (e) is the closed-and-silent one: a cut claiming a muscle the animal
 * does not carry derives a share of **zero**, so the line yields nothing
 * at all and the butchering simply comes up short. Nothing errors.
 */
export function clauseClaimsResolve(): Finding[] {
  const out: Finding[] = [];
  const materials = materialPaths();
  const claimsFor = cutClaims();
  const plans = planTissues();
  for (const [cutPath, tissues] of claimsFor) {
    for (const t of tissues) {
      if (!materials.has(t)) {
        out.push({
          file: cutPath,
          detail: `claims '${t}', which resolves to no Material row`,
        });
      }
    }
  }
  for (const { file, doc } of allRows()) {
    const data = doc as { butcheryYield?: unknown; _bodyPlanPath?: unknown };
    if (!Array.isArray(data.butcheryYield)) continue;
    const planPath =
      typeof data._bodyPlanPath === 'string' ? data._bodyPlanPath : '';
    const carried = plans.get(planPath);
    if (!carried) continue;
    for (const line of data.butcheryYield) {
      const cut = (line as { cut?: string }).cut;
      if (!cut) continue;
      for (const t of claimsFor.get(cut) ?? []) {
        if (!carried.has(t)) {
          out.push({
            file,
            detail:
              `yield line '${cut}' claims '${t}', which this species' ` +
              `body plan '${planPath}' does not carry — the line would ` +
              `derive a share of ZERO and yield nothing`,
          });
        }
      }
    }
  }
  return out;
}

/** Tissue paths each shipped body-plan row carries, by row path. */
function planTissues(): Map<string, Set<string>> {
  const plans = new Map<string, Set<string>>();
  for (const { file, doc } of allRows()) {
    const parts = (doc as { bodyParts?: unknown }).bodyParts;
    if (!Array.isArray(parts)) continue;
    const tissues = new Set<string>();
    for (const part of parts) {
      for (const t of (part as { tissues?: unknown[] }).tissues ?? []) {
        const path = (t as { tissuePath?: string }).tissuePath;
        if (path) tissues.add(path);
      }
    }
    const rowPath = rowPathOf(file);
    if (rowPath) plans.set(rowPath, tissues);
  }
  return plans;
}

/** What each shipped cut row claims, by row path. */
function cutClaims(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const { file, doc } of allRows()) {
    const tissues = (doc as { tissues?: unknown }).tissues;
    if (!Array.isArray(tissues)) continue;
    const rowPath = rowPathOf(file);
    if (rowPath) out.set(rowPath, tissues.filter((t): t is string => typeof t === 'string'));
  }
  return out;
}

/** Every shipped Material row's path. */
function materialPaths(): Set<string> {
  const out = new Set<string>();
  for (const { file, doc } of allRows()) {
    if (!(doc as { name?: unknown }).name) continue;
    const rowPath = rowPathOf(file);
    if (rowPath && rowPath.includes('/idea/material/')) out.add(rowPath);
  }
  return out;
}

function main(): void {
  const rows = bodyPlanRows();
  const findings = [
    ...clauseSharesSumToOne(rows),
    ...clauseSpeciesPlanResolves(),
    ...clauseNoDoubleShare(),
    ...clauseClaimsResolve(),
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
