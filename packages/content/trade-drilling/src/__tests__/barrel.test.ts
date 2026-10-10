/**
 * ⭐⭐⭐ **The barrel — and the claim is that you cannot distil crude and
 * choose not to make the light ends.**
 *
 * The claims, in order of how load-bearing they are:
 *
 *  1. ⭐⭐⭐ **A column separates one substance into DIFFERENT
 *     SUBSTANCES**, and the `separation: fractions` pair is validated
 *     TOGETHER — because a row that gets it half right is the dangerous
 *     case: one missing `material` would hand that span out as the
 *     schedule's `productMaterial`, which in a refinery means a cask
 *     labelled kerosene full of gasoline.
 *  2. ⭐⭐ **Nobody will buy the gasoline.** No stock line anywhere in
 *     the realm names it, and there must not be one until there is an
 *     engine. That is acceptance criterion 9, asserted over every
 *     shipped counter.
 *  3. ⭐ **Kerosene IS the shipped `lamp-oil` material**, so the lamp,
 *     the civic fuel store and the street-lighting bill needed nothing;
 *     and **paraffin is a TAG**, so chandlery needed nothing.
 *  4. The per-fraction heat ladder is real: a cold column gives the
 *     light ends and stops.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { FractionSpec } from '@saxonberg/server/mud/lib/fractionation/FractionSchedule';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const FUEL = `${CONTENT}trade-fuel/content/`;
const CHANDLERY = `${CONTENT}trade-chandlery/content/`;

function row(abs: string): Record<string, unknown> {
  return YAML.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>;
}
function data(abs: string): Record<string, unknown> {
  return (row(abs).data ?? {}) as Record<string, unknown>;
}

const crude = data(`${FUEL}trade/fuel/idea/fractionation/crude.yaml`);
const fractions = crude.fractions as FractionSpec[];

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
});

describe('⭐⭐⭐ the column separates DIFFERENT SUBSTANCES', () => {
  it('declares `fractions`, names NO product, and every span names its own', () => {
    expect(crude.separation).toBe('fractions');
    // ⚠ There is no such thing as THE product of a column.
    expect(crude.productMaterial).toBe('');
    for (const spec of fractions) {
      expect(spec.material, `fraction '${spec.key}' names no material`).toBeTruthy();
    }
    // Five things out of one: four fractions and a residue.
    expect(fractions).toHaveLength(4);
    expect(crude.residueMaterial).toBeTruthy();
  });

  it('⚠⚠ the half-right row is refused by a GATE, not at runtime', () => {
    // ⭐⭐ The dangerous case is a `'fractions'` row missing ONE
    // `material`: that span would be handed out as the schedule's
    // `productMaterial`, which in a refinery means a cask labelled
    // kerosene full of gasoline — at the completion of a pour, with
    // nobody watching.
    //
    // ⚠ The check is `pnpm lint:fraction-schedules`, and it got there by
    // elimination. `setFractions` cannot hold it, because `separation`
    // and `fractions` are two authored keys dispatched in whatever order
    // the row lists them — a good column would throw and reordering the
    // YAML would fix it. `onCreate` is the convention's home for a
    // cross-field rule and `lint:on-create` refused it as a ratchet
    // rise, with the complaint that the hook *collects work that belongs
    // elsewhere*. The audit agreed: this is an AUTHORING rule, it cannot
    // be fixed by a player, it cannot vary at run time, and the person
    // who needs to hear about it is reading a YAML file right now.
    //
    // Asserted on the gate's existence and its enrolment, because
    // `lint:family` derives its roster from package.json — a gate
    // nobody runs is the failure this repo keeps paying for.
    const gate = readFileSync(
      `${CONTENT}../server/scripts/check-fraction-schedules.ts`,
      'utf8',
    );
    // ⚠ The backtick needs no escape inside a character-class-free
    // alternation — eslint's `no-useless-escape` is right and this was
    // the branch's one lint ERROR.
    expect(gate).toMatch(/names no \$\{?material|names no ` \+/);
    expect(gate).toMatch(/no such thing as THE product/);
    expect(gate).toMatch(/GRADES of one/);
    const pkg = JSON.parse(
      readFileSync(`${CONTENT}../server/package.json`, 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts['lint:fraction-schedules']).toBe(
      'tsx scripts/check-fraction-schedules.ts',
    );
  });

  it('⭐ every shipped `cuts` schedule is untouched by the new field', () => {
    // The default is `cuts`, so a schedule authored before this existed
    // is byte-identical. Asserted over the shipped distilling rows.
    const dir = `${CONTENT}trade-distilling/content/trade/distilling/idea/fractionation`;
    const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const d = data(join(dir, f));
      expect(d.separation, `${f} should say nothing about separation`).toBeUndefined();
      expect(d.productMaterial).toBeTruthy();
      for (const spec of (d.fractions ?? []) as FractionSpec[]) {
        expect(spec.material, `${f}/${spec.key}`).toBeUndefined();
      }
    }
  });

  it('⭐ the per-fraction HEAT LADDER is real, and ascending', () => {
    // `FractionSpec.requiresHeatK` shipped with the substrate and no
    // shipped schedule ever used it: a pot still is one temperature. A
    // column is a ladder of them, which is the seam the substrate's own
    // header predicted a refinery would need and a still never would.
    const gates = fractions.map((f) => f.requiresHeatK ?? 0);
    for (let i = 1; i < gates.length; i++) {
      expect(gates[i]!).toBeGreaterThan(gates[i - 1]!);
    }
    // ...and the column's own floor is not above its first fraction.
    expect(Number(crude.requiresHeatK)).toBeLessThanOrEqual(gates[0]!);
  });

  it('⚠ no `character` carries a digit — the cut is a judgement', () => {
    for (const spec of fractions) {
      expect(spec.character, spec.key).not.toMatch(/\d/);
    }
  });
});

describe('⭐⭐ nobody will buy the gasoline', () => {
  /** Every `stockLines` entry on every shipped row in the realm. */
  function everyStockedPath(): string[] {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (entry === 'node_modules' || entry === 'dist') continue;
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith('.yaml')) continue;
        let parsed: Record<string, unknown>;
        try {
          parsed = data(full);
        } catch {
          continue;
        }
        const lines = parsed.stockLines;
        if (!Array.isArray(lines)) continue;
        for (const line of lines as Array<{ itemTemplatePath?: string }>) {
          if (line?.itemTemplatePath) out.push(line.itemTemplatePath);
        }
        // `prices:` is the other half — a priced thing is a sellable one.
        const prices = parsed.prices;
        if (prices && typeof prices === 'object') {
          out.push(...Object.keys(prices as Record<string, unknown>));
        }
      }
    };
    walk(CONTENT);
    return out;
  }

  it('⭐⭐⭐ NOTHING in the realm stocks or prices gasoline', () => {
    // Acceptance criterion 9, asserted over every counter that exists.
    // ⚠ And it must stay false until there is an engine to put it in:
    // the day somebody adds a stock line for it, THIS FAILS, which is
    // the intended tripwire.
    const stocked = everyStockedPath().join(' ');
    expect(stocked).not.toMatch(/gasoline/i);
  });

  it('⭐ the two disposal routes that ship need NO code', () => {
    // Stored: a cask of it is a fire risk by the material's own authored
    // fields. Flared: a `Lamp` with a tank, `fill` + `light`.
    const gasoline = data(`${FUEL}stuff/idea/material/bulk/gasoline.yaml`);
    expect(Number(gasoline.autoignitionTemperature)).toBeGreaterThan(0);
    expect(Number(gasoline.heatOfCombustion)).toBeGreaterThan(0);
    expect((gasoline.tags ?? []) as string[]).toContain('flammable');
    const flare = row(`${FUEL}trade/fuel/thing/flare.yaml`);
    expect(flare.class).toBe('/platform/thing/Lamp');
    const f = flare.data as Record<string, unknown>;
    expect(f.interiorBulk).toBe(true);
    expect(Number(f.interiorCapacity)).toBeGreaterThan(0);
  });

  it('⚠ and the RIVER route is deliberately absent — recorded, not shipped', () => {
    // Nothing shipped turns a poured liquid into a discharge, and
    // building that half is cross-cutting water substrate a trade build
    // may not solve. AC 9's dump leg is unmet and the requirements say
    // so; the whole withdrawn shape is on the water design pack.
    const slate = readFileSync(
      `${CONTENT}../../docs/slates/tails/water-design-pack.md`,
      'utf8',
    );
    expect(slate).toMatch(/a dumped liquid is not a discharge/i);
    expect(slate).toMatch(/hydrocarbon/);
  });
});

describe('⭐ kerosene is the SHIPPED material, and paraffin is a TAG', () => {
  it('the kerosene fraction names `lamp-oil`, which the lamp already burns', () => {
    const kerosene = fractions.find((f) => f.key === 'kerosene')!;
    expect(kerosene.material).toBe('/stuff/idea/material/bulk/lamp-oil');
    // ⭐ So the lantern, the civic fuel store and the street-lighting
    // bill needed nothing: the store counts casks whose interior carries
    // the `lamp-oil` TAG, and this is that material.
    const oil = data(`${FUEL}stuff/idea/material/bulk/lamp-oil.yaml`);
    expect((oil.tags ?? []) as string[]).toContain('lamp-oil');
    // ...and the row's own keywords already said `kerosene`, which is
    // why renaming it would have been a rename across five packs for no
    // new behaviour.
    expect((oil.keywords ?? []) as string[]).toContain('kerosene');
  });

  it('⭐⭐ paraffin wax carries `candle-stock`, so CHANDLERY is untouched', () => {
    const wax = data(`${FUEL}stuff/idea/material/bulk/paraffin-wax.yaml`);
    const recipe = YAML.parse(
      readFileSync(`${CHANDLERY}recipes/candle.yaml`, 'utf8'),
    ) as { inputSlots: Array<{ category?: string }> };
    const wanted = recipe.inputSlots.map((s) => s.category);
    expect((wax.tags ?? []) as string[]).toContain('candle-stock');
    expect(wanted).toContain('candle-stock');
    // ⚠ Solid at room temperature and liquid on a stove, which is what
    // a dipping pot needs — the phase change is the kernel's.
    expect(Number(wax.meltingPoint)).toBeGreaterThan(293);
  });

  it('⚠ the column is distilling\'s Still — a SECOND namer, recorded', () => {
    // The content-packs rule says a class two packs name wants
    // promoting to the kernel. Recorded rather than done: promotion is
    // a review question about where a `Still` belongs.
    const refinery = row(`${FUEL}trade/fuel/thing/refinery.yaml`);
    expect(refinery.class).toBe('/trade/distilling/thing/Still');
    const pkg = JSON.parse(
      readFileSync(`${CONTENT}trade-fuel/package.json`, 'utf8'),
    ) as { dependencies: Record<string, string> };
    expect(
      pkg.dependencies['@saxonberg/content-trade-distilling'],
      'naming another pack\'s class needs that pack as a dependency',
    ).toBe('workspace:*');
  });
});
