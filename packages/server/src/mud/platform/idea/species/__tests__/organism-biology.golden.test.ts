/**
 * ⭐⭐ The organism-biology goldens (W0) — today's behavior, frozen, so
 * every later wave can prove what it did NOT change.
 *
 * What is pinned, per the plan's W0:
 *  - every body plan's parts — keys, parents, roles — and each part's
 *    resolved tissue shares (W1 re-expresses the plans as modules and must
 *    reproduce these to 1e-6);
 *  - the senses, gaits and breathing every plan answers (W3, W8, W9 derive
 *    them from organs and must give the same answers);
 *  - each tapped species' taps BY SEX (a bull gives no milk; W3 moves the
 *    glands onto female-delta modules);
 *  - `massAt` at five ages for every species with a curve (W2 replaces the
 *    straight line with von Bertalanffy — re-pinned ON PURPOSE there, with
 *    both figures in the commit body);
 *  - the rows and masses `dressOut` gives each yielding species at its
 *    adult mass (W5 derives yields from tissues: the golden becomes
 *    *today's rows ⊆ the new rows*).
 *
 * ⚠ The golden file is a SNAPSHOT of master's behavior at W0, regenerated
 * only deliberately: `WRITE_GOLDEN=1 npx vitest run <this file>`. The
 * compute half of this test changes as the waves move the code; the
 * frozen half does not, except where a wave says so in its commit.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { parse } from 'yaml';
import Species from '../Species';
import BodyPlan from '../BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { SpeciesApi } from '../../../../api/species';
import { BodyModule } from '../../../../lib/species/BodyModule';
import type { ModuleRef } from '../../../../lib/species/Body';

afterEach(() => StuffApi.clearAll());

const CONTENT = fileURLToPath(new URL('../../../../../../../content/', import.meta.url));
const GOLDEN = fileURLToPath(new URL('./goldens/organism-biology.golden.json', import.meta.url));

interface Row {
  class?: string;
  extends?: string;
  data?: Record<string, unknown>;
}

/** A pack's namespace root: its manifest's `root:`, else `/<id>`. */
function packRoot(pack: string): string {
  const manifest = join(CONTENT, pack, 'pack.yaml');
  if (!existsSync(manifest)) return `/${pack}`;
  const m = parse(readFileSync(manifest, 'utf8')) as { id?: string; root?: string };
  return m.root ?? `/${m.id ?? pack}`;
}

/**
 * Every shipped row, by template path (the path under a pack's `content/`),
 * and every body-module document by its document path (the pack's root +
 * `/body-modules/<name>`).
 */
function contentIndex(): Map<string, Row> {
  const out = new Map<string, Row>();
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    const modDir = join(root, 'body-modules');
    if (existsSync(modDir)) {
      const proot = packRoot(pack);
      for (const name of readdirSync(modDir)) {
        if (!name.endsWith('.yaml')) continue;
        const data = parse(readFileSync(join(modDir, name), 'utf8')) as Record<string, unknown>;
        out.set(`${proot}/body-modules/${name.slice(0, -5)}`, { data });
      }
    }
    const walk = (dir: string, rel: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full, `${rel}/${name}`);
        } else if (name.endsWith('.yaml')) {
          try {
            const row = parse(readFileSync(full, 'utf8')) as Row;
            if (row && typeof row === 'object') out.set(`${rel}/${name.slice(0, -5)}`, row);
          } catch {
            // Not a row this golden reads (a malformed or non-row yaml).
          }
        }
      }
    };
    walk(root, '');
  }
  return out;
}

const SPECIES_CLASS = '/platform/idea/species/Species';

interface Golden {
  plans: Record<string, unknown>;
  taps: Record<string, unknown>;
  massAt: Record<string, unknown>;
  /** ⚠ W0's yields, FROZEN (never rewritten): the containment reference for W5. */
  dressOut: Record<string, unknown>;
  /** W5 on: what each body leaves as a carcass — adult lines, newborn rows. */
  carcass: Record<string, { adult: { row: string }[]; newborn: string[] }>;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** The plan's authored data, through `extends:` (one parent, resolved at read). */
function planData(index: Map<string, Row>, path: string): Record<string, unknown> {
  const row = index.get(path);
  if (!row) return {};
  const parent = row.extends ? planData(index, row.extends) : {};
  return { ...parent, ...(row.data ?? {}) };
}

/**
 * ⭐ A shipped plan, built the way the engine builds it (W1): its module
 * documents parsed and made resident, then `applyModules` — so the golden
 * reads the SAME expansion the game does.
 */
function buildPlan(index: Map<string, Row>, planPath: string, data: Record<string, unknown>): BodyPlan {
  const refs = (data.modules as ModuleRef[] | undefined) ?? [];
  for (const r of refs) {
    const doc = index.get(r.module);
    if (!doc) throw new Error(`golden: plan ${planPath} cites module ${r.module}, which no pack ships`);
    SpeciesApi.modules().remember(r.module, new BodyModule(r.module, doc.data ?? {}));
  }
  const plan = makeStuffAtPath(() => new BodyPlan(), planPath);
  plan.applyModules(refs);
  return plan;
}

/** A shipped species as the engine builds it: plan, body block, forms, every module resident. */
function buildSpecies(index: Map<string, Row>, path: string, d: Record<string, unknown>): Species | null {
  if (typeof d._bodyPlanPath !== 'string') return null;
  StuffApi.clearAll();
  buildPlan(index, d._bodyPlanPath, planData(index, d._bodyPlanPath));
  const sp = makeStuffAtPath(() => new Species(), path);
  sp._bodyPlanPath = d._bodyPlanPath;
  const remember = (delta: unknown): void => {
    for (const r of ((delta as { add?: ModuleRef[] } | undefined)?.add ?? [])) {
      const doc = index.get(r.module);
      if (!doc) throw new Error(`golden: ${path} adds module ${r.module}, which no pack ships`);
      SpeciesApi.modules().remember(r.module, new BodyModule(r.module, doc.data ?? {}));
    }
  };
  remember(d.body);
  const variants = (d.variants ?? {}) as { sex?: Record<string, { body?: unknown }>; stage?: Record<string, { body?: unknown }> };
  for (const v of [...Object.values(variants.sex ?? {}), ...Object.values(variants.stage ?? {})]) remember(v.body);
  sp.applyBody((d.body as never) ?? null);
  sp.applyVariants((d.variants as never) ?? null);
  if (d.ageCurve) sp.setAgeCurve(d.ageCurve as never);
  return sp;
}

function computeGolden(): Golden {
  const index = contentIndex();
  const species = [...index.entries()].filter(([, r]) => r.class === SPECIES_CLASS);
  const planPaths = new Set<string>();
  for (const [, r] of species) {
    const p = r.data?._bodyPlanPath;
    if (typeof p === 'string') planPaths.add(p);
  }

  // ---- plans: parts, roles, resolved shares, senses, gaits, breathing ----
  const plans: Record<string, unknown> = {};
  for (const planPath of [...planPaths].sort()) {
    const data = planData(index, planPath);
    const plan = buildPlan(index, planPath, data);
    const parts = plan.getBody().getParts();
    let total = 0;
    for (const p of parts) for (const t of p.tissues ?? []) total += t.share;
    plans[planPath] = {
      parts: parts.map((p) => ({
        key: p.key,
        parent: p.parent ?? null,
        governs: p.governs ?? [],
        serves: p.serves ?? [],
        severable: p.severable ?? false,
        tissues: (p.tissues ?? []).map((t) => ({
          tissue: t.tissuePath,
          share: total > 0 ? round6(t.share / total) : 0,
        })),
      })),
      // ⭐ W9 (D11): senses derive from the organs — each modality the body
      // has, with the media its organs work in (W0's ports, organ-shaped).
      senses: [...new Map(plan.getBody().senseOrgans().map(({ organ }) => [organ.modality, [...plan.getBody().organMedia(organ)].sort()])).entries()]
        .map(([modality, media]) => ({ modality, media }))
        .sort((a, b) => a.modality.localeCompare(b.modality)),
      // ⭐ W3: gaits derive from the limbs; compared as a set (order is the
      // parts' order, which carries no meaning).
      gaits: [...plan.getBody().gaits()].sort(),
      // ⭐ W8 (D10): breathing DERIVES from the organs — compared to what
      // W0's plan authored, where `null` was the plan default (lungs in
      // air, freely): a body breathing air freely and nothing else.
      breathing: ((b) => (b.length === 1 && b[0]!.medium === 'air' && b[0]!.intake === 1 ? null : b))(
        plan.getBody().breathing().map((x) => ({ medium: x.medium, apparatus: x.apparatus, intake: x.intake })),
      ),
    };
  }

  // ---- taps by sex, massAt, dressOut ----
  const taps: Record<string, unknown> = {};
  const massAt: Record<string, unknown> = {};
  const dressOut: Record<string, unknown> = {};
  const carcass: Record<string, { adult: { row: string }[]; newborn: string[] }> = {};
  for (const [path, row] of species.sort(([a], [b]) => a.localeCompare(b))) {
    const d = row.data ?? {};
    // ⭐ W3: a tap is a GLAND — a part of the body of each form. Built the
    // way the engine builds it: the plan, the species' own body block and
    // its forms, every module resident.
    const glandsOf = (sex: string): { key: string; spec: Record<string, unknown> }[] => {
      const sp = buildSpecies(index, path, d);
      return (sp?.bodyFor({ sex })?.producers() ?? []).map((g) => ({ key: g.spec.key, spec: g.spec as unknown as Record<string, unknown> }));
    };
    const female = glandsOf('female');
    const male = glandsOf('male');
    if (female.length > 0 || male.length > 0) {
      const all = [...female, ...male.filter((m) => !female.some((f) => f.key === m.key))];
      taps[path] = {
        female: female.map((g) => g.key),
        male: male.map((g) => g.key),
        specs: all.map(({ spec: t }) => ({
          key: t.key,
          yieldRow: t.yieldRow,
          perGameDay: t.perGameDay ?? null,
          behaviour: t.behaviour ?? null,
          window: (t.window as { kind?: string } | undefined)?.kind ?? null,
        })),
      };
    }
    const curve = d.ageCurve as { weanedAt?: number; matureAt?: number } | undefined;
    const adult = typeof d.adultMass === 'number' ? d.adultMass : 0;
    if (curve && adult > 0) {
      const sp = makeStuffAtPath(() => new Species(), `${path}#mass`);
      sp.setAdultMass(adult);
      sp.setAgeCurve(curve as never);
      const weaned = curve.weanedAt ?? 0;
      const mature = curve.matureAt ?? 0;
      const ages = [0, weaned / 2, weaned, (weaned + mature) / 2, mature];
      massAt[path] = ages.map((a) => ({ ageDays: round6(a), kg: round6(sp.massAt(a)) }));
    }
    // ⭐ W5: what comes off DERIVES from the body — its materials' rows,
    // through each module's carcass map. Computed for the adult female form
    // and the newborn (a calf's vell is a newborn's part).
    const sp = typeof d._bodyPlanPath === 'string' ? buildSpecies(index, path, d) : null;
    if (sp) {
      const liveKg = adult > 0 ? adult : 100;
      const linesOf = (stage: 'adult' | 'newborn'): { row: string; units: number; kgEach: number | null }[] => {
        const body = sp.bodyFor({ sex: 'female', stage });
        if (!body) return [];
        const lines = body.yieldLines().map((l) => {
          const claims = (index.get(l.row)?.data?.tissues as string[] | undefined) ?? l.tissues;
          const portion = index.get(l.row)?.data?.portionKg;
          return {
            row: l.row,
            claims,
            parts: index.get(l.row)?.class === '/platform/thing/Cut' ? l.parts.length : 1,
            portionKg: typeof portion === 'number' ? portion : null,
            conditioned: !l.integument,
            coatKg: l.integument
              ? l.tissues.reduce((a, m) => a + body.coatMassKg(m, liveKg, (x) => Number(index.get(x)?.data?.density ?? 0)), 0)
              : 0,
          };
        });
        return sp.dressOut({ liveKg, fleshPct: 55, lines, body }).map((x) => ({
          row: x.cut,
          units: x.units,
          kgEach: x.kgEach === null ? null : round6(x.kgEach),
        }));
      };
      const adultLines = linesOf('adult');
      if (adultLines.length > 0) carcass[path] = { adult: adultLines, newborn: linesOf('newborn').map((x) => x.row) };
    }
  }
  return { plans, taps, massAt, dressOut, carcass };
}

describe('⭐⭐ organism-biology goldens — today’s behavior, frozen at W0', () => {
  const computed = computeGolden();

  if (process.env.WRITE_GOLDEN === '1') {
    // ⚠ W0's `dressOut` is the containment reference and is never rewritten.
    const prior = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Golden;
    writeFileSync(GOLDEN, JSON.stringify({ ...computed, dressOut: prior.dressOut }, null, 2) + '\n');
  }
  const frozen = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Golden;

  it('finds the shipped plans and species', () => {
    expect(Object.keys(frozen.plans).length).toBeGreaterThanOrEqual(9);
    expect(Object.keys(frozen.dressOut).length).toBeGreaterThanOrEqual(14);
    expect(Object.keys(computed.carcass).length).toBeGreaterThanOrEqual(14);
    expect(Object.keys(frozen.taps).length).toBeGreaterThanOrEqual(8);
  });

  it('every plan: the same parts, roles and resolved tissue shares (to 1e-6)', () => {
    // ⭐ W1: a module expands part by part, so the ORDER of the list is the
    // modules' order, not the hand-authored one; nothing in the model reads
    // order (a root is `parent: null`, a ladder sorts by area). Compared by
    // key. The `insect` plan is new in W1 (bee, silkworm, cricket left
    // `sessile`) and is checked on its own below.
    const byKey = (plans: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(
        Object.entries(plans)
          .filter(([path]) => path in frozen.plans)
          .map(([path, plan]) => {
            const p = plan as { parts: { key: string }[] };
            return [path, { ...p, parts: [...p.parts].sort((a, b) => a.key.localeCompare(b.key)) }];
          }),
      );
    expect(byKey(computed.plans)).toEqual(byKey(frozen.plans));
  });

  it('⭐ W1: the insect plan — six legs, a head and a torso of chitin', () => {
    const insect = computed.plans['/stuff/idea/species/BodyPlan/insect'] as { parts: { key: string }[] };
    expect(insect.parts.map((p) => p.key)).toContain('body.leg.hindRight');
    expect(insect.parts.filter((p) => p.key.startsWith('body.leg.')).length).toBe(6);
  });

  it('every tapped species: the same taps by sex', () => {
    expect(computed.taps).toEqual(frozen.taps);
  });

  it('every species with a curve: the same mass at five ages', () => {
    expect(computed.massAt).toEqual(frozen.massAt);
  });

  it('⭐⭐ W5: every row a species yielded at W0 still comes off it (containment, adult ∪ newborn)', () => {
    const missing: string[] = [];
    for (const [path, old] of Object.entries(frozen.dressOut)) {
      const now = computed.carcass[path];
      const rows = new Set([...(now?.adult ?? []).map((l) => l.row), ...(now?.newborn ?? [])]);
      for (const l of (old as { lines: { row: string }[] }).lines) if (!rows.has(l.row)) missing.push(`${path}: ${l.row}`);
    }
    expect(missing).toEqual([]);
  });

  it('every body: the same carcass as pinned (regression from W5)', () => {
    expect(computed.carcass).toEqual(frozen.carcass);
  });
});
