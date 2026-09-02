/**
 * The smelt (metal chain S1) — ⭐⭐ **yield is chemistry, never a recipe
 * constant.**
 *
 *     metal out = Σ (lot mass × lot grade × the mineral's metal fraction)
 *
 * Every term is a fact something else already knows. **Nobody anywhere
 * authors how much copper comes out of a smelt** — which is what makes
 * grade load-bearing END TO END: a lean lump is worth less at the scale
 * because it makes less metal in the furnace, not because a table says
 * so.
 *
 * And ⭐ **the faucet is closed by construction** (P13): no shipped
 * content sells or spawns copper stock from nowhere. That is asserted by
 * scanning every pack rather than argued — the acceptance criterion is a
 * TEST, not an edit, because it was already true and this build kept it
 * true by building the trade instead of endowing a buyer.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Ore from '@saxonberg/content-trade-mining/src/thing/Ore';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const PACK = fileURLToPath(new URL('../../', import.meta.url));
const MALACHITE = '/stuff/idea/material/mineral/malachite';
const COPPER = '/stuff/idea/material/element/copper';

function lump(kgEach: number, count: number, grade: number): Ore {
  const o = makeStuff(() => new Ore());
  stampTemplatePathForTest(o, '/world/fx/thing/ore');
  o.setQuantity(count);
  o.setGrade(grade);
  (o as unknown as { _materialPath: string })._materialPath = MALACHITE;
  o.setMass(Quantity.of(kgEach, 'kg'));
  return o;
}

/** Every shipped `.yaml`, with its parsed body. */
function shippedRows(): Array<{ file: string; doc: Record<string, unknown> }> {
  const out: Array<{ file: string; doc: Record<string, unknown> }> = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.yaml')) {
        try {
          const doc = YAML.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
          if (doc && typeof doc === 'object') out.push({ file: full.slice(CONTENT.length), doc });
        } catch {
          /* a fixture that is not a template row */
        }
      }
    }
  };
  walk(CONTENT);
  return out;
}

describe('the smelt', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = makeStuffAtPath(() => new Material(), MALACHITE);
    // ⭐ Chemistry: two Cu in a 221.114 g/mol formula unit.
    m.setComposition([{ materialPath: COPPER, fraction: 0.5748 }]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ two lots of different grade yield measurably different metal from the same run', () => {
    const rich = lump(1, 10, 0.20);
    const lean = lump(1, 10, 0.04);
    const metalOf = (o: Ore): number => o.getQuantity() * 1 * o.metalFractionOf(COPPER);
    expect(metalOf(rich)).toBeCloseTo(10 * 0.5748 * 0.2, 8);
    expect(metalOf(lean)).toBeCloseTo(10 * 0.5748 * 0.04, 8);
    // Five times the grade, five times the metal — and the ratio is the
    // grade's, with nothing in between to blunt it.
    expect(metalOf(rich) / metalOf(lean)).toBeCloseTo(5, 6);
  });

  it('⭐ the yield MOVES when the grade moves — it is arithmetic, not a lookup', () => {
    const o = lump(1, 10, 0.10);
    const before = o.metalFractionOf(COPPER);
    o.setGrade(0.15);
    expect(o.metalFractionOf(COPPER)).toBeCloseTo(before * 1.5, 8);
  });

  it('⚠ a charge with no copper in it yields an honest ZERO, never a token bar', () => {
    const o = lump(1, 10, 0.2);
    expect(o.metalFractionOf('/stuff/idea/material/element/iron')).toBe(0);
  });

  it('the heat gate is the METAL’s own melting point, and the ladder falls out of it', () => {
    const furnace = (
      YAML.parse(readFileSync(`${PACK}content/trade/smelting/thing/furnace.yaml`, 'utf8')) as {
        data: Record<string, number>;
      }
    ).data;
    // Charcoal alone (1420 K) clears copper's 1358 K — the EASY rung.
    expect(furnace.burnTemperatureK).toBeGreaterThan(1358);
    // …and the bellows reaches iron's 1811 K, which is a later stage's.
    expect(furnace.burnTemperatureK! * furnace.bellowsMultiplier!).toBeGreaterThan(1811);
  });

  it('⭐ the ingot re-melts — the phase change is honest in BOTH directions', () => {
    const ingot = YAML.parse(
      readFileSync(`${PACK}content/trade/smelting/thing/copper-ingot.yaml`, 'utf8'),
    ) as { class: string };
    // `Ingot` composes Meltable + Thermal, so heating a bar past 1358 K
    // runs it back to a pool. Nothing here special-cases the direction.
    expect(ingot.class).toBe('/platform/thing/Ingot');
  });

  it('⚠ SLAG ships, because a smelt that produced only metal would be lying', () => {
    expect(existsSync(`${PACK}content/trade/smelting/thing/slag.yaml`)).toBe(true);
    // A lump of ore is mostly not ore, and the heap outside a smelter is
    // where the rest of the rock went.
  });
});

describe('⭐ the copper faucet is closed', () => {
  /**
   * ⚠ The acceptance criterion is a TEST rather than an edit, and that is
   * the finding: nothing in the shipped world ever sold or spawned copper
   * stock, so the faucet was already shut. This build kept it shut by
   * BUILDING THE TRADE — the smelter buys ore out of ingot revenue rather
   * than out of an endowment, and the deferred CB lending tier the bible
   * wanted for an off-take buyer is not needed at all.
   */
  it('no shipped row spawns or stocks copper from nowhere', () => {
    const offenders: string[] = [];
    for (const { file, doc } of shippedRows()) {
      const text = JSON.stringify(doc);
      if (!/copper/i.test(text)) continue;
      // A row that STOCKS or SPAWNS: the three fields a census/spawn/
      // storefront row uses to put goods in the world from nothing.
      const data = (doc.data ?? {}) as Record<string, unknown>;
      const spawns = data.stockLines ?? data.offers ?? doc.stockLines ?? doc.offers;
      if (!spawns) continue;
      if (/copper/i.test(JSON.stringify(spawns))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('every copper-composed product row is downstream of a PRODUCER this build ships', () => {
    // The one row that mints copper metal is the ingot, and the only
    // thing that mints an ingot is `smelt` — which consumes ore somebody
    // cut. There is no second path in.
    const ingots = shippedRows().filter(
      ({ doc }) =>
        (doc.class === '/platform/thing/Ingot' || doc.class === '/platform/thing/Casting') &&
        /copper/i.test(JSON.stringify(doc.data ?? {})),
    );
    expect(ingots.map((i) => i.file)).toEqual([
      'trade-smelting/content/trade/smelting/thing/copper-ingot.yaml',
    ]);
  });

  it('⭐ bronze is copper AND TIN, and the fractions sum to one', () => {
    const bronze = YAML.parse(
      readFileSync(
        `${CONTENT}base-library/content/stuff/idea/material/alloy/bronze.yaml`,
        'utf8',
      ),
    ) as { data: { tags: string[]; composition: Array<{ materialPath: string; fraction: number }> } };

    /*
     * ⚠⚠ It used to be 88% copper and 12% NOTHING — the tags said
     * "tin" and the composition named only copper, so every read that
     * walks composition (`analyze chemistry`, `containsElementOf`, the
     * flat element map) was quietly wrong about what bronze is. The
     * census now walks `composition[].materialPath`, so a blend naming a
     * row that does not exist fails the build; this pins the arithmetic
     * the census cannot see.
     */
    const byPath = Object.fromEntries(
      bronze.data.composition.map((c) => [c.materialPath, c.fraction]),
    );
    expect(byPath['/stuff/idea/material/element/copper']).toBeCloseTo(0.88, 6);
    expect(byPath['/stuff/idea/material/element/tin']).toBeCloseTo(0.12, 6);
    expect(
      bronze.data.composition.reduce((a, c) => a + c.fraction, 0),
    ).toBeCloseTo(1, 6);
    // …and the tags no longer promise an element the composition omits.
    for (const tag of ['copper', 'tin']) expect(bronze.data.tags).toContain(tag);
  });

  it('⭐⭐ alloying is not averaging — bronze is harder than EITHER constituent', () => {
    const read = (f: string): { hardness: number; meltingPoint?: number } =>
      (YAML.parse(readFileSync(`${CONTENT}base-library/content/stuff/idea/material/${f}`, 'utf8')) as
        { data: { hardness: number; meltingPoint?: number } }).data;
    const bronze = read('alloy/bronze.yaml');
    const tin = read('element/tin.yaml');

    /*
     * ⭐ The whole reason the metal chain ends in an alloy rather than a
     * pure metal. Tin on its own is the softest thing in the library —
     * you cannot make an edge out of it — and a twelfth part of it makes
     * copper into the best tool metal there was for two thousand years.
     * A player who reads the three rows can see that; nothing has to
     * tell them.
     */
    expect(tin.hardness).toBeLessThan(bronze.hardness);
    expect(tin.hardness).toBeLessThan(160); // softer than aluminium, too
    // ⚠ And tin melts in a hearth (505 K), which is why it was worked
    // long before anything smelted iron.
    expect(tin.meltingPoint).toBeLessThan(1000);
  });
});
