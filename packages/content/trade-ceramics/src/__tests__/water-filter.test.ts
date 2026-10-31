/**
 * ⭐⭐ The water filter's rows (ceramics S9, W8). The mechanism is the
 * kernel's (`lib/bulk/__tests__/WaterFilter.test.ts` — a porous body set in
 * a vessel runs its water through, swapped by `filteredTo`); what only the
 * pack can see is that the shipped filter's body really IS porous past the
 * threshold at which a body holds water, that it is unglazed, that a potter
 * can throw one, and that the town can buy one.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const pack = join(here, '..', '..');
const content = join(pack, '..');
const data = (path: string): Record<string, unknown> =>
  (parse(readFileSync(path, 'utf8')) as { data: Record<string, unknown> }).data;

const FILTER = '/trade/ceramics/thing/water-filter';

describe('the water filter', () => {
  const filter = data(join(pack, 'content/trade/ceramics/thing/water-filter.yaml'));
  const body = data(join(pack, 'content/trade/ceramics/idea/material/filter-stoneware.yaml'));
  const faces = parse(readFileSync(join(content, 'platform/content/settings/faces.yaml'), 'utf8')) as {
    settings: Array<{ key: string; value: string }>;
  };
  const holdsBelow = Number(faces.settings.find((s) => s.key === 'faces.holdsWaterBelow')!.value);

  it('⭐ its body is porous past the line at which a body holds water — so water runs THROUGH', () => {
    expect(filter._materialPath).toBe('/trade/ceramics/idea/material/filter-stoneware');
    expect((body.tags as string[])).toContain('porous');
    expect(Number(body.waterAbsorptionCapacity) / 100).toBeGreaterThan(holdsBelow);
    // ⚠ Unglazed: a coat on the row would close the pores.
    expect(filter.coats).toBeUndefined();
  });

  it('a potter can throw one — the `filter` form names the row', () => {
    const form = data(join(pack, 'content/trade/ceramics/idea/form/filter.yaml'));
    expect(form.key).toBe('filter');
    expect(form.product).toBe(FILTER);
  });

  it('the Terminus potter\'s stall sells one, and prices it', () => {
    const stall = data(join(content, 'terminus/content/world/terminus/market/thing/potters-stall.yaml'));
    const lines = (stall.stockLines as Array<{ itemTemplatePath: string }>).map((l) => l.itemTemplatePath);
    expect(lines).toContain(FILTER);
    expect((stall.prices as Record<string, number>)[FILTER]).toBeGreaterThan(0);
  });
});
