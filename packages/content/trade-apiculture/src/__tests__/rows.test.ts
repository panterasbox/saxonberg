/**
 * The pack's rows — ⭐ **the authoring contract**, read off the YAML
 * rather than through a clone, because what regresses here is what an
 * author is allowed to write.
 *
 * The claims worth a test:
 *
 *  - **the epoch ladder is `extends:`** — the thick hive differs from the
 *    plain one in its `enclosure` and nothing else, which is what makes
 *    "a better box" content rather than code;
 *  - **honey is not sugar.** The tag keeps the two supply chains apart,
 *    and a shared tag would silently make every sugar recipe accept
 *    honey;
 *  - **a hive ships empty.** The bees are a separate purchase, a caught
 *    swarm or a split (AC 1), so a row that shipped a live colony inside
 *    a box would delete the whole acquisition decision;
 *  - **the species' tap ceiling is deliberately absurd**, because the
 *    real ceiling is the box.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, '..', '..', 'content');
const TRADE = join(CONTENT, 'trade', 'apiculture');

interface Row {
  class?: string;
  extends?: string;
  hydratorClass?: string;
  data?: Record<string, unknown>;
}

function row(...parts: string[]): Row {
  return YAML.parse(readFileSync(join(...parts), 'utf-8')) as Row;
}

const thing = (name: string): Row => row(TRADE, 'thing', `${name}.yaml`);

describe('the hive rows', () => {
  it('⭐ the epoch ladder is `extends:` — a better box is a thicker wall', () => {
    const plain = thing('hive');
    const thick = thing('thick-hive');
    expect(thick.extends).toBe('/trade/apiculture/thing/hive');
    expect(thick.class).toBe('/trade/apiculture/thing/Hive');
    // What the child changes: the wall, the prose, the weight. Not the
    // capacities, not the species, not the mechanism.
    const enclosure = thick.data?.enclosure as { thicknessM: number };
    const plainEnclosure = plain.data?.enclosure as { thicknessM: number };
    expect(enclosure.thicknessM).toBeGreaterThan(plainEnclosure.thicknessM);
    expect(thick.data).not.toHaveProperty('broodCombKg');
    expect(thick.data).not.toHaveProperty('superCapacityKg');
    expect(thick.data).not.toHaveProperty('_speciesPath');
  });

  it('⭐ a hive ships EMPTY — the bees are a separate decision', () => {
    const plain = thing('hive');
    expect(plain.data?.strength).toBe(0);
    expect(plain.data?.hasQueen).toBe(false);
    expect(plain.data?.lifecycleState).toBe('');
    expect(plain.data?.open).toBe(false);
  });

  it('⚠ `interiorCapacity` is NOT authored — a hive holds no fluid', () => {
    for (const name of ['hive', 'thick-hive']) {
      expect(thing(name).data).not.toHaveProperty('interiorCapacity');
    }
  });

  it('the nucleus is alive and queened; the swarm is alive and wilder', () => {
    const nuc = thing('nuc');
    const swarm = thing('swarm');
    for (const r of [nuc, swarm]) {
      expect(r.class).toBe('/trade/apiculture/thing/Colony');
      expect(r.data?.lifecycleState).toBe('alive');
      expect(r.data?.hasQueen).toBe(true);
    }
    // ⚠ A bought nuc is used to being handled; a swarm never has been.
    expect(nuc.data?.handling as number).toBeGreaterThan(
      swarm.data?.handling as number,
    );
    // A swarm carries no stores — that is why catching one is urgent.
    expect(swarm.data?.pollenKg).toBe(0);
  });

  it('a super declares the two numbers that make it a super', () => {
    const s = thing('super');
    expect(s.class).toBe('/trade/apiculture/thing/HiveBox');
    expect(s.data?.volumeM3 as number).toBeGreaterThan(0);
    expect(s.data?.combCapacityKg as number).toBeGreaterThan(0);
  });
});

describe('the materials', () => {
  it('⭐⭐ honey is NOT sugar — the tag keeps the two chains apart', () => {
    const honey = row(TRADE, 'idea', 'material', 'honey.yaml');
    const tags = honey.data?.tags as string[];
    expect(tags).toContain('honey');
    expect(tags).toContain('sweetener');
    expect(tags).toContain('food');
    // ⚠⚠ The load-bearing absence. `trade-cooking`'s sugar row owns the
    // `sugar` tag; sharing it would make every recipe that wants sugar
    // accept honey silently, and vice versa.
    expect(tags).not.toContain('sugar');
  });

  it('⭐ water activity 0.60 — at the floor, which is why honey keeps', () => {
    const honey = row(TRADE, 'idea', 'material', 'honey.yaml');
    expect(honey.data?.waterActivity).toBe(0.6);
    // It answers steeply to warmth and it does not matter: the rate is
    // multiplied by a water term of nothing.
    expect(honey.data?.spoilActivationEnergy as number).toBeGreaterThan(0);
  });
});

describe('the honeybee', () => {
  const bee = row(
    CONTENT, 'stuff', 'idea', 'species', 'animalia', 'arthropoda',
    'insecta', 'hymenoptera', 'apidae', 'apis', 'mellifera.yaml',
  );

  it('⭐⭐ the tap ceiling is absurd on purpose — the BOX is the real one', () => {
    const production = bee.data?.production as Array<{
      key: string;
      yieldRow: string;
      behaviour: string;
      windowDays: number;
    }>;
    expect(production).toHaveLength(1);
    expect(production[0]!.key).toBe('honey');
    // ⭐ The yield of the tap is COMB, not honey: you take the comb away
    // and get the honey out of it afterwards, two ways (AC 11).
    expect(production[0]!.yieldRow).toBe('/trade/apiculture/thing/comb');
    expect(production[0]!.behaviour).toBe('accrue');
    // Far above any box, so `Hive.combCapacityKg()` binds instead.
    expect(production[0]!.windowDays).toBeGreaterThan(300);
  });

  it('⭐ the lifespan is the QUEEN’s — she is the one individual', () => {
    // The row said 0–1 days, which is nothing's lifespan.
    expect(bee.data?.lifespanMin as number).toBeGreaterThan(300);
    expect(bee.data?.lifespanMax as number).toBeGreaterThan(1000);
  });

  it('a colony has a temper with a floor and a ceiling', () => {
    const range = bee.data?.handlingRange as { floor: number; ceiling: number };
    expect(range.floor).toBeGreaterThan(0);
    expect(range.ceiling).toBeLessThan(1);
  });

  it('⚠ the file moved into the pack; the template path did NOT', () => {
    // A honeybee is a fact about the world, so the row belongs in the
    // commons — but it has to name an apiculture row, and pointing
    // `trade-ranching`'s content at apiculture is the arrow backwards.
    const raw = readFileSync(
      join(
        CONTENT, 'stuff', 'idea', 'species', 'animalia', 'arthropoda',
        'insecta', 'hymenoptera', 'apidae', 'apis', 'mellifera.yaml',
      ),
      'utf-8',
    );
    expect(raw).toContain('/trade/apiculture/thing/comb');
  });
});

describe('the comb', () => {
  it('⭐ a Provision, because it spoils and because it CARRIES', () => {
    const comb = thing('comb');
    // `lint:perishable` needs a Freshness host for a spoiling material;
    // `ComposedMixin` — also Provision's — is what carries what the bees
    // foraged into the jar, so clover honey and cherry honey differ with
    // no row authored for either.
    expect(comb.class).toBe('/platform/thing/Provision');
    expect(comb.data?._materialPath).toBe(
      '/trade/apiculture/idea/material/honey',
    );
  });
});
