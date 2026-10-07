/**
 * ⭐⭐⭐ **Firedamp — the third damp, and the opposite hazard from the
 * other two.**
 *
 * The two that shipped kill by DISPLACEMENT: blackdamp is air with
 * nothing left in it, odourless, and the bird is the only free reading;
 * stinkdamp reeks, which is why smell and the canary are complementary
 * rather than redundant. Firedamp is neither — ⭐ **it is breathable at
 * the fractions that will kill you**, so the bird sings right through it
 * and a miner who has learnt to trust the bird learns that the bird is
 * answering a different question.
 *
 * What it does is BURN. And every term in that is already true of
 * something else: a content whose material has a heat of combustion is
 * flammable (the same number that gives a fuel its flame temperature), a
 * fraction over the explosive limit is an explosive mixture, and a naked
 * flame is a lit `Burner` that is not gauzed. ⚠ No `hazard:` field, no
 * authored trap, no room marked dangerous.
 *
 * ⭐⭐ Which is why the remedy is an OBJECT and not a rule: a safety
 * lamp's flame is enclosed, so the check does not find a naked flame, so
 * a player with a gauze lamp can work ground a player with a torch
 * cannot — and nothing anywhere is told to make that true.
 *
 * ⚠ This file reads the SHIPPED rows. Every number in it is a claim
 * about a place, and a synthetic fixture would pass identically while
 * Ferrow's own band was a typo.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Deposit from '@saxonberg/content-ground/src/idea/Deposit';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKS = join(HERE, '..', '..', '..');
const REJECTION = join(
  PACKS,
  'rejection',
  'content',
  'world',
  'terminus',
  'rejection',
);
const FIREDAMP = '/stuff/idea/material/gas/firedamp';

function row(base: string, rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(join(base, rel), 'utf8')) as Record<
    string,
    unknown
  >;
}

/** The SHIPPED Ferrow row, stood up as a live `Deposit`. */
function ferrow(): Deposit {
  const data = (row(REJECTION, 'idea/deposit/ferrow.yaml').data ??
    {}) as Record<string, unknown>;
  const d = makeStuff(() => new Deposit());
  d.setName(String(data.name));
  d.setStratigraphy(data.stratigraphy as never);
  d.setWaterTable(data.waterTable as never);
  d.setLode(data.lode as never);
  d.setZones(data.zones as never);
  d.setDepletion(data.depletion as never);
  d.setFeatures(data.features as never);
  (d as unknown as { gas: unknown }).gas = data.gas;
  return d;
}

/** The firedamp material, as the pack ships it. */
function firedamp(): Material {
  const data = (row(
    join(PACKS, 'trade-mining'),
    'content/stuff/idea/material/gas/firedamp.yaml',
  ).data ?? {}) as Record<string, unknown>;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(String(data.name));
    m.setDensity(Quantity.of(Number(data.density), 'kg/m³'));
    m.setBoilingPoint(Quantity.of(Number(data.boilingPoint), 'K'));
    m.setHeatOfCombustion(
      Quantity.of(Number(data.heatOfCombustion), 'MJ/kg'),
    );
    return m;
  }, FIREDAMP) as unknown as Material;
}

const SEED = Deposit.seedFor('terminus/rejection');

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  for (const [path, mpa] of [
    ['/stuff/idea/material/rock/slate', 90],
    ['/stuff/idea/material/rock/granite', 200],
    ['/stuff/idea/material/mineral/malachite', 200],
    ['/stuff/idea/material/mineral/goethite', 450],
  ] as const) {
    const m = makeStuffAtPath(() => new Material(), path);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(
      mpa,
      'MPa',
    );
  }
});

describe('the gas is a GROUND fact in a depth band', () => {
  it('⭐⭐ Ferrow gives it off below the measures and NOT above them', () => {
    const d = ferrow();
    // ⭐ The adit and the authored drift (−10 m) are safe, which is why
    // going deeper is a decision rather than a flat tax on the trade.
    expect(d.sampleAt([0, 20, 0], SEED).gas).toBeNull();
    expect(d.sampleAt([0, 20, -10], SEED).gas).toBeNull();
    // ⭐⭐ …and ONE level below the drift you are in it. The band is set
    // against the WORKINGS, not in the abstract: a player sinks one
    // shaft and meets the gas, which is what makes the lesson reachable
    // inside a session. A band two levels down would be equally honest
    // geology and unreachable in practice, which is the same as not
    // shipping it.
    const deep = d.sampleAt([0, 20, -20], SEED).gas;
    expect(deep).not.toBeNull();
    expect(deep!.materialPath).toBe(FIREDAMP);
    expect(deep!.strength).toBeGreaterThan(0);
  });

  it('⭐ a deposit that authors none answers null at every depth', () => {
    // ⚠ The gas is a property of the ROCK, not a hazard somebody placed.
    // A quarry's ground, or a second mine's, says nothing.
    const d = ferrow();
    (d as unknown as { gas: unknown }).gas = null;
    for (const z of [-10, -20, -40, -80]) {
      expect(d.sampleAt([0, 20, z], SEED).gas).toBeNull();
    }
  });

  it('⚠ the authored band is the one the test asserts, read off the row', () => {
    const data = row(REJECTION, 'idea/deposit/ferrow.yaml').data as {
      gas: { material: string; belowZ: number; strength: number };
    };
    expect(data.gas.material).toBe(FIREDAMP);
    expect(data.gas.belowZ).toBeLessThan(0);
    expect(data.gas.strength).toBeGreaterThan(0);
    expect(data.gas.strength).toBeLessThan(1);
  });
});

describe('⭐⭐⭐ the gas is BREATHABLE, which is the whole design', () => {
  it('the canary sings through it — it is not a displacement hazard', () => {
    const data = row(REJECTION, 'idea/deposit/ferrow.yaml').data as {
      gas: { strength: number };
    };
    // ⭐ At the authored strength the air share stays above the
    // breathable floor, so respiration raises no crisis and the bird
    // does not stop singing. A hazard whose tell was the canary would
    // be a third copy of blackdamp; this one has its own tell.
    const contents = [{ type: FIREDAMP, amount: data.gas.strength }];
    expect(BiomeApi.airShareOf(contents)).toBeGreaterThan(0.76);
    expect(BiomeApi.isBreathableMixture('air', contents)).toBe(true);
    expect(BiomeApi.hasBreathableShare(contents)).toBe(true);
  });

  it('⭐ …and it is well ABOVE the share that burns', () => {
    const data = row(REJECTION, 'idea/deposit/ferrow.yaml').data as {
      gas: { strength: number };
    };
    // Methane's real lower explosive limit is 5 %. The authored 14 % into
    // dead air is comfortably over it, so a deep dead-ended heading is
    // genuinely dangerous rather than theoretically so.
    expect(data.gas.strength).toBeGreaterThan(0.05);
  });

  it('⭐ it is flammable because it is a FUEL — one number, two readers', () => {
    const m = firedamp();
    // The same `heatOfCombustion` that gives a fuel its flame
    // temperature is what makes a content in the air explosive. No
    // second field, no `flammable: true`.
    expect(m.getHeatOfCombustion().rawValue()).toBeGreaterThan(0);
  });

  it('⭐⭐ and only a SEALED vessel will hold it — derived, not authored', () => {
    // Which is what makes `drain` into a bladder a real act, and what
    // makes draining into a pail refuse in the vessel's own words.
    expect(BulkableApi.requiredClosureFor(firedamp())).toBe('sealed');
  });
});

describe('⭐⭐ the safety lamp is a ROW, and that is the test', () => {
  it('one authored field over the shipped Lamp — no class, no mixin', () => {
    const lamp = row(
      join(PACKS, 'trade-mining'),
      'content/trade/mining/thing/safety-lamp.yaml',
    );
    expect(lamp.class).toBe('/platform/thing/Lamp');
    const data = lamp.data as Record<string, unknown>;
    // ⭐ THE one fact. A naked flame is a lit Burner whose flame is not
    // enclosed; this one is, so the flash check does not find it.
    expect(data.flameEnclosed).toBe(true);
    // ⚠ And it ships UNLIT, which in a gassy heading is the one decision
    // that matters. `lint:light-sources` clause (g) refuses a Burner row
    // that omits `lit:` either way.
    expect(data.lit).toBe(false);
    // It has oil in it, or it is an ornament.
    expect(Number(data.interiorAmount)).toBeGreaterThan(0);
  });

  it('⚠ it is PROPPED where a miner would draw one', () => {
    // ⭐ The reachability link that fails closed and silent: a remedy
    // nobody can pick up is not a remedy, and the hazard would ship with
    // no counter but *do not go in there*.
    const drift = row(REJECTION, 'ferrow/timbered-drift.yaml').data as {
      props: string[];
    };
    expect(drift.props).toContain('/trade/mining/thing/safety-lamp');
  });
});
