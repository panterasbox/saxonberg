/**
 * The sugar pack's rows are self-consistent: every arrow names a material
 * the pack ships, every stage that `extends:` names a real parent, and
 * every class a row names resolves to a file in `src/`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '../../content');
const SRC = join(HERE, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.yaml') ? [p] : [];
  });
}

/** A content path → the row file that backs it (`/trade/sugar/x` → `content/trade/sugar/x.yaml`). */
const rowFile = (path: string): string => join(CONTENT, `${path}.yaml`);

const rows = walk(CONTENT).map((file) => ({ file, row: YAML.parse(readFileSync(file, 'utf8')) }));

describe('trade-sugar rows', () => {
  it('every arrow names a shipped material', () => {
    for (const { file, row } of rows) {
      for (const a of row?.data?.concentratesTo ?? []) {
        expect(existsSync(rowFile(a.becomes)), `${file} → ${a.becomes}`).toBe(true);
        if (a.elseBecomes) expect(existsSync(rowFile(a.elseBecomes)), `${file} → ${a.elseBecomes}`).toBe(true);
      }
    }
  });

  it('⭐ cane is a RATOON: a cut keeps the stand (an annual was four blocks, ever)', () => {
    const cane = YAML.parse(readFileSync(rowFile('/trade/sugar/thing/plant/cane'), 'utf8'));
    expect(cane.data.profile.fruitSetCount).toBeGreaterThan(0);
    expect(cane.data.profile.fruitFillDays).toBeGreaterThan(0);
  });

  it('⭐ cane is an AREA crop that declines each ratoon (cover build)', () => {
    const cane = YAML.parse(readFileSync(rowFile('/trade/sugar/thing/plant/cane'), 'utf8'));
    expect(cane.data.profile.seedRateKgPerM2).toBeGreaterThan(0);
    expect(cane.data.profile.yieldKgPerM2).toBeGreaterThan(cane.data.profile.seedRateKgPerM2);
    expect(cane.data.profile.yieldDeclinePerCycle).toBeGreaterThan(0);
    expect(cane.data.harvestTool).toBe('reaping');
    expect(cane.data.seedTemplatePath).toBeUndefined();
  });

  it('⭐ cane is planted from cut cane: the bundle grows into the plant', () => {
    const bundle = YAML.parse(readFileSync(rowFile('/trade/sugar/thing/crop/cane'), 'utf8'));
    expect(bundle.class).toBe('/platform/thing/PlantableCrop');
    expect(bundle.data.growsIntoPath).toBe('/trade/sugar/thing/plant/cane');
  });

  it('the cane knife reaps about a bundle a stroke', () => {
    const knife = YAML.parse(readFileSync(rowFile('/trade/sugar/thing/cane-knife'), 'utf8'));
    const cane = YAML.parse(readFileSync(rowFile('/trade/sugar/thing/plant/cane'), 'utf8'));
    const bundle = YAML.parse(readFileSync(rowFile('/trade/sugar/thing/crop/cane'), 'utf8'));
    expect(knife.data.capabilities).toContain('reaping');
    // A stroke in a perfect season — the most a stand can give (its yield is
    // the attainable figure × its condition). About a bundle in a well-kept
    // piece; never three (they froze every cutter).
    const kg = knife.data.swathM2 * cane.data.profile.yieldKgPerM2;
    expect(kg / bundle.data.mass).toBeGreaterThanOrEqual(1);
    expect(kg / bundle.data.mass).toBeLessThan(3);
  });

  it('every extends names a shipped parent', () => {
    for (const { file, row } of rows) {
      if (row?.extends?.startsWith('/trade/sugar/')) {
        expect(existsSync(rowFile(row.extends)), `${file} extends ${row.extends}`).toBe(true);
      }
    }
  });

  it('every pack class a row names has its source', () => {
    for (const { file, row } of rows) {
      const cls: string | undefined = row?.class;
      if (!cls?.startsWith('/trade/sugar/')) continue;
      const src = join(SRC, `${cls.replace('/trade/sugar/', '')}.ts`);
      expect(existsSync(src), `${file} class ${cls}`).toBe(true);
    }
  });

  it('the strike arrow will not grain a poor pan', () => {
    const liquor = rows.find((r) => r.file.endsWith('material/raw-liquor.yaml'))!.row;
    const strike = liquor.data.concentratesTo.find((a: { becomes: string }) => a.becomes.endsWith('/strike'));
    expect(strike.minBand).toBe('fair');
    expect(strike.elseBecomes).toMatch(/blackstrap$/);
  });
});
