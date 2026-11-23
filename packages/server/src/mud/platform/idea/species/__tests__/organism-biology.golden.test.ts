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

afterEach(() => StuffApi.clearAll());

const CONTENT = fileURLToPath(new URL('../../../../../../../content/', import.meta.url));
const GOLDEN = fileURLToPath(new URL('./goldens/organism-biology.golden.json', import.meta.url));

interface Row {
  class?: string;
  extends?: string;
  data?: Record<string, unknown>;
}

/** Every shipped row, by template path (the path under a pack's `content/`). */
function contentIndex(): Map<string, Row> {
  const out = new Map<string, Row>();
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
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
  dressOut: Record<string, unknown>;
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
    const plan = makeStuffAtPath(() => new BodyPlan(), planPath);
    plan.setBodyParts((data.bodyParts as never) ?? []);
    const parts = plan.getBodyParts();
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
      sensoryPorts: data.sensoryPorts ?? [],
      locomotionModes: data.locomotionModes ?? [],
      breathing: data.breathing ?? null,
    };
  }

  // ---- taps by sex, massAt, dressOut ----
  const taps: Record<string, unknown> = {};
  const massAt: Record<string, unknown> = {};
  const dressOut: Record<string, unknown> = {};
  for (const [path, row] of species.sort(([a], [b]) => a.localeCompare(b))) {
    const d = row.data ?? {};
    const production = (d.production as Record<string, unknown>[] | undefined) ?? [];
    if (production.length > 0) {
      const bySex = (sex: string): string[] =>
        production
          .filter((t) => t.sex === undefined || t.sex === sex)
          .map((t) => String(t.key));
      taps[path] = {
        female: bySex('female'),
        male: bySex('male'),
        specs: production.map((t) => ({
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
    const yieldLines = (d.butcheryYield as Record<string, unknown>[] | undefined) ?? [];
    if (yieldLines.length > 0 && typeof d._bodyPlanPath === 'string') {
      StuffApi.clearAll();
      const pdata = planData(index, d._bodyPlanPath);
      const plan = makeStuffAtPath(() => new BodyPlan(), d._bodyPlanPath);
      plan.setBodyParts((pdata.bodyParts as never) ?? []);
      const sp = makeStuffAtPath(() => new Species(), path);
      sp._bodyPlanPath = d._bodyPlanPath;
      sp.setButcheryYield(yieldLines as never);
      const claims = new Map<string, readonly string[]>();
      for (const line of yieldLines) {
        const cut = String(line.cut);
        const tissues = index.get(cut)?.data?.tissues;
        if (Array.isArray(tissues)) claims.set(cut, tissues.map(String));
      }
      const liveKg = adult > 0 ? adult : 100;
      dressOut[path] = {
        liveKg,
        lines: sp.dressOut({ liveKg, fleshPct: 55, claims }).map((l) => ({
          row: l.cut,
          units: l.units,
          kgEach: l.kgEach === null ? null : round6(l.kgEach),
        })),
      };
    }
  }
  return { plans, taps, massAt, dressOut };
}

describe('⭐⭐ organism-biology goldens — today’s behavior, frozen at W0', () => {
  const computed = computeGolden();

  if (process.env.WRITE_GOLDEN === '1') {
    writeFileSync(GOLDEN, JSON.stringify(computed, null, 2) + '\n');
  }
  const frozen = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Golden;

  it('finds the shipped plans and species', () => {
    expect(Object.keys(frozen.plans).length).toBeGreaterThanOrEqual(9);
    expect(Object.keys(frozen.dressOut).length).toBeGreaterThanOrEqual(14);
    expect(Object.keys(frozen.taps).length).toBeGreaterThanOrEqual(8);
  });

  it('every plan: the same parts, roles and resolved tissue shares (to 1e-6)', () => {
    expect(computed.plans).toEqual(frozen.plans);
  });

  it('every tapped species: the same taps by sex', () => {
    expect(computed.taps).toEqual(frozen.taps);
  });

  it('every species with a curve: the same mass at five ages', () => {
    expect(computed.massAt).toEqual(frozen.massAt);
  });

  it('every yielding species: the same rows and masses at its adult weight', () => {
    expect(computed.dressOut).toEqual(frozen.dressOut);
  });
});
