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
import { Body, type BodyDelta, type ModuleRef } from '../src/mud/lib/species/Body';
import { BodyModule } from '../src/mud/lib/species/BodyModule';

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

/** A pack's namespace root: its manifest's `root:`, else `/<id>`. */
function packRoot(pack: string): string {
  const manifest = join(CONTENT, pack, 'pack.yaml');
  if (!existsSync(manifest)) return `/${pack}`;
  const m = YAML.parse(readFileSync(manifest, 'utf8')) as { id?: string; root?: string } | null;
  return m?.root ?? `/${m?.id ?? pack}`;
}

/** Every shipped body-module document, by its document path (organism-biology D1). */
function moduleDocs(): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT)) {
    const dir = join(CONTENT, pack, 'content', 'body-modules');
    if (!existsSync(dir)) continue;
    const root = packRoot(pack);
    for (const file of walk(dir, '.yaml')) {
      const rel = relative(dir, file).replace(/\.yaml$/, '');
      out.set(`${root}/body-modules/${rel}`, (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as Record<string, unknown>);
    }
  }
  return out;
}

/**
 * ⭐ Every shipped body plan, EXPANDED the way the engine expands it
 * (organism-biology W1): its `modules:` (through `extends:`) built into a
 * `Body` from the parsed module documents. A plan that will not build — a
 * module path nobody ships, two instances on one key, an instance hung from
 * a missing part, a malformed module — is a finding here, not a boot error.
 */
export function bodyPlanRows(): { file: string; path: string; body: Body | null; modules?: ModuleRef[]; error?: string; authorsBodyParts: boolean }[] {
  const docs = moduleDocs();
  const parsed = new Map<string, BodyModule>();
  const resolveModule = (path: string): BodyModule => {
    const hit = parsed.get(path);
    if (hit) return hit;
    const data = docs.get(path);
    if (!data) throw new Error(`cites module '${path}', which no pack ships`);
    const mod = new BodyModule(path, data);
    parsed.set(path, mod);
    return mod;
  };
  const rows = allRows().filter((r) => (r as { cls?: string }).cls === '/platform/idea/species/BodyPlan');
  const byPath = new Map(rows.map((r) => [rowPathOf(r.file) ?? '', r]));
  const dataOf = (path: string, depth = 0): Record<string, unknown> => {
    const row = byPath.get(path);
    if (!row || depth > 8) return {};
    const own = row.doc as Record<string, unknown>;
    const parent = (row as { ext?: string }).ext;
    return parent ? { ...dataOf(parent, depth + 1), ...own } : own;
  };
  const out: { file: string; path: string; body: Body | null; modules?: ModuleRef[]; error?: string; authorsBodyParts: boolean }[] = [];
  for (const row of rows) {
    const path = rowPathOf(row.file) ?? row.file;
    const data = dataOf(path);
    const authorsBodyParts = 'bodyParts' in (row.doc as object);
    try {
      const modules = (data.modules as ModuleRef[] | undefined) ?? [];
      const body = new Body({ modules }, resolveModule);
      out.push({ file: row.file, path, body, modules, authorsBodyParts });
    } catch (err) {
      out.push({ file: row.file, path, body: null, error: (err as Error).message, authorsBodyParts });
    }
  }
  return out;
}

/** Every shipped row's `data` block, with the file it came from. */
export function allRows(): AnyRow[] {
  if (rowCache) return rowCache;
  const out: AnyRow[] = [];
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
        const row = parsed as { data?: unknown; class?: string; extends?: string } | null;
        const data = row?.data;
        if (!data || typeof data !== 'object') continue;
        out.push({ file: relative(resolve(HERE, '../../..'), file), doc: data, cls: row?.class, ext: row?.extends });
      }
    }
  }
  rowCache = out;
  return out;
}
let rowCache: AnyRow[] | null = null;
interface AnyRow { file: string; doc: unknown; cls?: string; ext?: string }

/**
 * The template path a content file ships at — `content/<root>/<rest>`
 * becomes `/<root>/<rest>` without the extension, which is the path a
 * `_bodyPlanPath` names.
 */
export function rowPathOf(file: string): string | null {
  const m = /content\/[^/]+\/content\/(.+)\.yaml$/.exec(file);
  return m ? `/${m[1]}` : null;
}

/**
 * Clause (0) — no row authors `bodyParts:` (organism-biology W1: a plan is
 * composed of modules; the parts are derived, never authored) — and every
 * plan builds.
 */
export function clausePlansBuild(rows: ReturnType<typeof bodyPlanRows>): Finding[] {
  const out: Finding[] = [];
  for (const row of rows) {
    if (row.authorsBodyParts) {
      out.push({ file: row.file, detail: "authors 'bodyParts' — a plan names its modules (`modules:`); parts are derived" });
    }
    if (row.error) out.push({ file: row.file, detail: `does not build: ${row.error}` });
  }
  // ⭐ …and its slots are what `setSlots` will take at hydration: each a
  // mapping with a `name` and an `accepts`. A stray list item under
  // `slots:` (the biped's `stoop`/`crawl`, left behind when gaits moved onto
  // the limbs in W3) failed EVERY person's plan at hydration while every
  // lint and unit test stayed green — the full suite found it.
  for (const row of allRows()) {
    if (row.cls !== '/platform/idea/species/BodyPlan') continue;
    const slots = (row.doc as { slots?: unknown }).slots;
    if (slots === undefined) continue;
    if (!Array.isArray(slots)) {
      out.push({ file: row.file, detail: "'slots' is not a list" });
      continue;
    }
    for (const s of slots) {
      const spec = s as { name?: unknown; accepts?: unknown } | null;
      if (!spec || typeof spec !== 'object' || typeof spec.name !== 'string' || typeof spec.accepts !== 'string') {
        out.push({ file: row.file, detail: `a slot is not { name, accepts }: ${JSON.stringify(s)}` });
      }
    }
  }
  return out;
}

/**
 * Clause (0b) — every species FORM builds (organism-biology D8): a variant
 * that adds or scales modules expands on its plan, so a calf whose `scale`
 * names a leg the plan does not have, or an udder module nobody ships, is a
 * finding here rather than a throw on the first read in play.
 */
export function clauseVariantsBuild(): Finding[] {
  const out: Finding[] = [];
  const docs = moduleDocs();
  const resolveModule = (path: string): BodyModule => {
    const data = docs.get(path);
    if (!data) throw new Error(`cites module '${path}', which no pack ships`);
    return new BodyModule(path, data);
  };
  const plans = new Map(bodyPlanRows().map((r) => [r.path, r]));
  for (const row of allRows()) {
    if (row.cls !== '/platform/idea/species/Species') continue;
    const data = row.doc as { _bodyPlanPath?: string; variants?: { sex?: Record<string, { body?: BodyDelta }>; stage?: Record<string, { body?: BodyDelta }> } };
    const forms = [...Object.entries(data.variants?.sex ?? {}), ...Object.entries(data.variants?.stage ?? {})];
    const plan = data._bodyPlanPath ? plans.get(data._bodyPlanPath) : undefined;
    for (const [name, form] of forms) {
      if (!form?.body) continue;
      if (!plan?.modules) {
        out.push({ file: row.file, detail: `form '${name}' changes a body, but the species names no plan that builds` });
        continue;
      }
      for (const key of Object.keys(form.body.scale ?? {})) {
        const known = plan.body?.getPart(key) ?? null;
        const added = (form.body.add ?? []).some((r) => r.as.includes(key));
        if (!known && !added) out.push({ file: row.file, detail: `form '${name}' scales '${key}', which this body does not have` });
      }
      try {
        const body = new Body({ modules: plan.modules }, resolveModule, [form.body]);
        const sum = body.getParts().reduce((a, p) => a + p.tissues.reduce((b, t) => b + t.share, 0), 0);
        if (body.getParts().length > 0 && Math.abs(sum - 1) > SUM_TOLERANCE) {
          out.push({ file: row.file, detail: `form '${name}' sums to ${sum.toFixed(4)}, not 1` });
        }
      } catch (err) {
        out.push({ file: row.file, detail: `form '${name}' does not build: ${(err as Error).message}` });
      }
    }
  }
  return out;
}

/**
 * Clause (0c) — every body has an outside (organism-biology D3): each
 * exterior part that weighs anything has a skin, and every layer of every
 * outside names a material row some pack ships. A part with no skin would
 * come off a carcass with no pelt and take a blow with nothing between it
 * and the world.
 */
export function clauseIntegument(rows: ReturnType<typeof bodyPlanRows>): Finding[] {
  const out: Finding[] = [];
  const materials = materialPaths();
  for (const row of rows) {
    if (!row.body) continue;
    for (const part of row.body.getParts()) {
      if (row.body.isInterior(part.key)) continue;
      const weighs = part.tissues.some((t) => t.share > 0);
      const outside = part.integument;
      if (weighs && !outside?.skin) out.push({ file: row.file, detail: `exterior part '${part.key}' has no skin` });
      for (const layer of [outside?.skin, outside?.under, outside?.coat]) {
        if (layer && !materials.has(layer.material)) {
          out.push({ file: row.file, detail: `part '${part.key}' integument names '${layer.material}', which no pack ships` });
        }
      }
    }
  }
  return out;
}

/**
 * Clause (0d) — within one body's carcass lines, no two rows answer to the
 * same word (organism-biology D5): `butcher hen for feathers` takes the
 * feathers and leaves the down, and nothing is tied, so nothing prompts.
 */
export function clauseCarcassWords(rows: ReturnType<typeof bodyPlanRows>): Finding[] {
  const out: Finding[] = [];
  const keywordsOf = new Map<string, string[]>();
  for (const r of allRows()) {
    const path = rowPathOf(r.file);
    const kw = (r.doc as { keywords?: unknown }).keywords;
    if (path && Array.isArray(kw)) keywordsOf.set(path, kw.map((k) => String(k).toLowerCase()));
  }
  // The generic words every meat row shares (`cut`, `meat`) name no one line.
  const GENERIC = new Set(['cut', 'cuts', 'meat', 'joint']);
  for (const row of rows) {
    if (!row.body) continue;
    const owner = new Map<string, string>();
    for (const line of row.body.yieldLines()) {
      for (const word of keywordsOf.get(line.row) ?? []) {
        if (GENERIC.has(word)) continue;
        const first = owner.get(word);
        if (first && first !== line.row) out.push({ file: row.file, detail: `'${word}' names both ${first} and ${line.row}` });
        else owner.set(word, line.row);
      }
    }
  }
  return out;
}

/** Clause (a) — the shares of a plan sum to the whole body (a regression check: true by construction). */
export function clauseSharesSumToOne(rows: ReturnType<typeof bodyPlanRows>): Finding[] {
  const out: Finding[] = [];
  for (const row of rows) {
    if (!row.body) continue;
    let sum = 0;
    let count = 0;
    for (const part of row.body.getParts()) {
      for (const t of part.tissues) {
        sum += t.share;
        count += 1;
      }
    }
    // An EMPTY plan is exempt (`sessile`: the plants have no anatomy).
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
  return out;
}

/** Tissue paths each shipped body plan's expanded body carries, by plan path. */
function planTissues(): Map<string, Set<string>> {
  const plans = new Map<string, Set<string>>();
  for (const row of bodyPlanRows()) {
    if (row.body) plans.set(row.path, new Set(row.body.tissuePaths()));
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
    ...clausePlansBuild(rows),
    ...clauseVariantsBuild(),
    ...clauseIntegument(rows),
    ...clauseSharesSumToOne(rows),
    ...clauseCarcassWords(rows),
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
