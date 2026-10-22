/**
 * The ashery's rows say what (potash D7, D16).
 *
 * ⭐ The egg is a TOOL that floats — the density row's hand tool — and
 * not the hen's egg, which is food. The rain butt is soft water, which is
 * the whole reason an ashery keeps one.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', 'content');
const row = (rel: string): { class: string; data: Record<string, unknown> } =>
  YAML.parse(readFileSync(join(ROOT, rel), 'utf8'));

describe('the ashery rows', () => {
  it('⭐ the test egg is a Tool with the capability the density row asks of its eye', () => {
    const egg = row('trade/potash/thing/test-egg.yaml');
    expect(egg.class).toBe('/platform/thing/Tool');
    expect(egg.data.capabilities).toEqual(['flotation']);
    const density = YAML.parse(
      readFileSync(join(HERE, '..', '..', '..', 'platform', 'content', 'platform', 'idea', 'reading', 'density.yaml'), 'utf8'),
    ) as { data: { handTool: string } };
    expect(density.data.handTool).toBe('flotation');
  });

  it('⭐ the rain butt is soft water', () => {
    const butt = row('trade/potash/thing/rain-butt.yaml');
    expect(butt.class).toBe('/platform/thing/WaterFixture');
    expect(butt.data.hardnessDgh as number).toBeLessThan(6);
  });

  it('the lye bands ascend', () => {
    const s = row('settings/potash.yaml') as unknown as { settings: { key: string; value: string }[] };
    const v = (k: string): number => Number(s.settings.find((e) => e.key === k)!.value);
    expect(v('potash.lye.weakFromKgPerL')).toBeLessThan(v('potash.lye.soapFromKgPerL'));
    expect(v('potash.lye.soapFromKgPerL')).toBeLessThan(v('potash.lye.strongFromKgPerL'));
  });
});

describe('the calcining (potash D12)', () => {
  // ⭐ Calcining is the one firing rule (ceramics M1): a heat transition on
  // the black salts' own row, never a recipe — the cake keeps its identity.
  const salts = row('trade/potash/idea/material/black-salts.yaml');
  const calcine = (salts.data.heatTransitions as {
    key: string; referenceK: number; massRetained: number; discipline: string;
    ladder: { becomes: string }[];
  }[]).find((t) => t.key === 'calcine')!;

  it('⭐ black salts become pearl ash at a red heat, credited to the ashery', () => {
    expect(calcine.referenceK).toBe(900);
    expect(calcine.ladder.at(-1)!.becomes).toBe('/trade/potash/idea/material/pearl-ash');
    expect(calcine.discipline).toBe('ashery');
  });

  it('⭐ pearl ash authors no purity of its own — the firing writes it', () => {
    expect(row('trade/potash/thing/pearl-ash.yaml').data.alloying).toBeUndefined();
    expect(calcine.massRetained).toBeCloseTo(0.8, 6);
  });

  it('⭐ a counter that lists pearl ash buys the calcined cake as pearl ash', () => {
    const pearl = row('trade/potash/idea/material/pearl-ash.yaml');
    expect(pearl.data.castTemplate).toBe('/trade/potash/thing/pearl-ash');
    expect(pearl.data.name).toBe('pearl ash');
  });

  it('⭐ the potash family carries the glassmaker’s `flux`', () => {
    const salts = row('trade/potash/idea/material/black-salts.yaml');
    expect(salts.data.tags).toContain('flux');
    expect(salts.data.tags).not.toContain('stabilizer');
  });
});
