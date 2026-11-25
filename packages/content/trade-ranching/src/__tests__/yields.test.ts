/**
 * ⭐⭐ What comes off a farm animal DERIVES from its body (organism-biology
 * D5): its plan's modules name what each tissue leaves a carcass as. The
 * same `shoulder` row off a ewe and a bullock weighs what each animal's
 * shoulder weighs, because the share is the body's and the scale the
 * animal's — and no row authors a list.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const ROOTS: Record<string, string> = { 'species-and-names': '/species-and-names', 'trade-ranching': '/trade/ranching' };

/** A document path → its file, for the two packs whose modules the farm uses. */
function moduleFile(path: string): string {
  for (const [pack, root] of Object.entries(ROOTS)) {
    if (path.startsWith(`${root}/body-modules/`)) return `${CONTENT}${pack}/content/body-modules/${path.slice(root.length + 14)}.yaml`;
  }
  throw new Error(`no pack ships ${path}`);
}

function yaml<T>(file: string): T {
  return YAML.parse(readFileSync(file, 'utf8')) as T;
}

/** Every row a plan's modules (plus any added) leave a carcass as. */
function rowsOf(planFile: string, added: string[] = []): Set<string> {
  const plan = yaml<{ data: { modules: { module: string }[] } }>(planFile);
  const out = new Set<string>();
  for (const m of [...plan.data.modules.map((x) => x.module), ...added]) {
    const doc = yaml<{ comesOffAs?: { cut: string }[] }>(moduleFile(m));
    for (const e of doc.comesOffAs ?? []) out.add(e.cut.split('/').pop()!);
  }
  return out;
}

const PLAN = (name: string): string => `${CONTENT}species-and-names/content/stuff/idea/species/BodyPlan/${name}.yaml`;

describe('the farm animals yield named joints, from their bodies', () => {
  it('a ewe and a bullock give shoulder, leg, loin, rib, neck, belly and shank', () => {
    const rows = rowsOf(PLAN('quadruped'));
    for (const cut of ['cut-shoulder', 'cut-leg', 'cut-loin', 'cut-rib', 'cut-neck', 'cut-belly', 'cut-shank']) {
      expect(rows.has(cut), cut).toBe(true);
    }
  });

  it('a quadruped gives its hide, its bones and its offal', () => {
    const rows = rowsOf(PLAN('quadruped'));
    for (const r of ['hide', 'bone', 'offal', 'gut', 'suet']) expect(rows.has(r), r).toBe(true);
  });

  it('⭐ a sow gives LEAF FAT; a ewe and a cow give SUET', () => {
    expect(rowsOf(PLAN('swine')).has('leaf-fat')).toBe(true);
    expect(rowsOf(PLAN('swine')).has('suet')).toBe(false);
    expect(rowsOf(PLAN('quadruped')).has('suet')).toBe(true);
  });

  it('⭐ the vell comes off a calf\'s own part — no adult plan names it', () => {
    expect(rowsOf(PLAN('quadruped')).has('vell')).toBe(false);
    expect(rowsOf(PLAN('quadruped'), ['/trade/ranching/body-modules/abomasum']).has('vell')).toBe(true);
  });

  it('⭐ no species row authors a yield list — the field is gone', () => {
    for (const rel of [
      'mammalia/artiodactyla/bovidae/bos/taurus.yaml',
      'mammalia/artiodactyla/bovidae/ovis/aries.yaml',
      'mammalia/artiodactyla/suidae/sus/domesticus.yaml',
    ]) {
      const file = `${CONTENT}trade-ranching/content/stuff/idea/species/animalia/chordata/${rel}`;
      expect(existsSync(file)).toBe(true);
      expect((yaml<{ data: Record<string, unknown> }>(file).data).butcheryYield, rel).toBeUndefined();
    }
  });
});
