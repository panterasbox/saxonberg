/**
 * ⚠ Ectothermy is NEW behavior for five fish, the crab and the frog
 * (organism-biology D9, W7): their plans now float their cores to the
 * water. This holds each at the edges of the water its own row says it
 * tolerates and asserts it is neither torpid nor dead there — and that a
 * chilled one is sluggish before it is torpid, and pays more to cross.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import BodyPlan from '@saxonberg/server/mud/platform/idea/species/BodyPlan';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { standShippedConditions } from '@saxonberg/server/mud/lib/vitals/__tests__/conditions';
import { setFlatParts } from '@saxonberg/server/mud/lib/species/__tests__/flat-body';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';

const FISH = new URL('../../content/stuff/idea/species/', import.meta.url);
const FROG = new URL(
  '../../../species-and-names/content/stuff/idea/species/animalia/chordata/amphibia/anura/ranidae/lithobates/catesbeianus.yaml',
  import.meta.url,
);

interface Row { vitalProfile: Record<string, unknown>; habitat?: { tolerances?: { temperatureK?: { min: number; max: number } } } }

function rows(): Array<{ name: string; data: Row; water: [number, number] }> {
  const out: Array<{ name: string; data: Row; water: [number, number] }> = [];
  for (const f of ['brown-trout', 'carp', 'eel', 'grey-mullet', 'sturgeon', 'shore-crab']) {
    const { data } = parse(readFileSync(new URL(`${f}.yaml`, FISH), 'utf8')) as { data: Row };
    const t = data.habitat?.tolerances?.temperatureK;
    if (!t) throw new Error(`${f}: no habitat temperature`);
    out.push({ name: f, data, water: [t.min, t.max] });
  }
  // The bullfrog's pond: no habitat temperature authored — a temperate
  // pond's summer and its autumn, both inside its survivable band.
  const { data } = parse(readFileSync(FROG, 'utf8')) as { data: Row };
  out.push({ name: 'bullfrog', data, water: [283, 298] });
  return out;
}

let seq = 0;
let real = 0;
function ectotherm(row: Row): Creature {
  const id = seq++;
  const plan = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-ecto-${id}`);
  setFlatParts(plan, [{ key: 'body.torso', parent: null, tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', share: 1 }] }]);
  plan.setThermalStrategy('ectotherm');
  const species = makeStuffAtPath(() => {
    const s = new Species();
    s.setBodyPlan(plan);
    s.setVitalProfile(row.vitalProfile as never);
    return s;
  }, `/stuff/idea/species/_test/ecto-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  c.setLifecycleState('alive');
  c.setMass(Quantity.of(1, 'kg'));
  return c;
}

const carries = (c: Creature, path: string): boolean =>
  c.getConditions().some((x) => x.kind === 'affliction' && x.templatePath === path);

function soak(c: Creature, waterK: number, hours: number): void {
  (c as unknown as { setEffectiveAmbientK(k: number): void }).setEffectiveAmbientK(waterK);
  c.reconcileThermalRegulation();
  for (let h = 0; h < hours; h++) {
    real += (3600 / 12) * 1000;
    c.reconcileThermalRegulation();
  }
}

describe('ectotherms in the water they tolerate', () => {
  beforeEach(async () => {
    await standShippedConditions();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  for (const { name, data, water } of rows()) {
    it(`${name}: neither torpid nor dead at ${water[0]} K or ${water[1]} K`, () => {
      for (const k of water) {
        const c = ectotherm(data);
        soak(c, k, 48);
        expect(carries(c, TemplatePaths.thermalTorpor), `${name} torpid at ${k} K`).toBe(false);
        expect(c.isDying(), `${name} dying at ${k} K`).toBe(false);
        expect(c.isAlive(), `${name} dead at ${k} K`).toBe(true);
        // ⭐ …and not "hyperthermic" in water it lives in: a carp at 300 K
        // is a carp in summer, not a feverish one.
        expect(carries(c, TemplatePaths.thermalHyperthermia), `${name} hyperthermic at ${k} K`).toBe(false);
      }
    });
  }

  it('⭐ a chilled trout is sluggish before it is torpid — and pays more to cross', () => {
    const trout = rows().find((r) => r.name === 'brown-trout')!;
    const c = ectotherm(trout.data);
    const walk = { getCostMultiplier: () => 1, getName: () => 'swim' } as never;
    const warmCost = c.traversePowerW(walk);
    soak(c, 276, 48); // inside its tolerance, under its near cold line
    expect(carries(c, TemplatePaths.thermalSluggish)).toBe(true);
    expect(carries(c, TemplatePaths.thermalTorpor)).toBe(false);
    expect(c.traversePowerW(walk)).toBeGreaterThan(warmCost);
    soak(c, 270, 48); // under its floor
    expect(carries(c, TemplatePaths.thermalTorpor)).toBe(true);
    expect(carries(c, TemplatePaths.thermalSluggish)).toBe(false);
  });
});
