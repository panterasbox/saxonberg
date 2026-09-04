/**
 * ContaminableMixin — the second population.
 *
 * The invariants this pins, in the order they matter:
 *
 *   1. ⭐⭐ **Nothing self-contaminates.** A clean thing at any temperature
 *      over any span stays clean, and writes no stamp doing it. That is
 *      criterion 9, and it is what keeps an invisible hazard from being a
 *      tax on existing.
 *   2. ⭐ **A contaminated thing is indistinguishable from a clean one** —
 *      asserted as the two renderings being EQUAL, never by naming the
 *      words twice.
 *   3. The kill is a **rate held for a time**, and a spore-former has a
 *      floor it never goes under.
 *   4. Cooling past `germinationK` turns the survivors' rate positive
 *      again — the properly-cooked-dish-left-out lesson.
 *
 * See docs/subsystems/spoilage.md.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import Provision from '../../../platform/thing/Provision';
import ToolItem from '../../../platform/thing/ToolItem';
import Weapon from '../../../platform/thing/equipment/Weapon';
import CraftVessel from '../../../platform/thing/CraftVessel';
import Cutlery from '../../../platform/thing/Cutlery';
import Material from '../Material';
import Condition from '../../../platform/idea/Condition';
import {
  Contamination,
  type PathogenBehavior,
} from '../Contaminable';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { TemplatePathPrefixes } from '../../paths';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { SenseChannel } from '../../description/Perceiver';
import '../../../platform/idea/WorldClockRegistry';

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;

let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}

/** A plain vegetative organism: grows warm, dies hot, no spores. */
const VEGETATIVE: PathogenBehavior = {
  reach: 'infect',
  muMaxPerHour: 0.9,
  activationEnergy: 90000,
  referenceK: 303,
  minGrowthK: 280,
  killK: 331,
  killRatePerHour: 8,
  killActivationEnergy: 200000,
  killSurvivalFraction: 0,
  awFloor: 0.94,
  inoculum: 0.03,
  infectiousDose: 0.02,
  channels: [],
};

/** A spore-former: cooking reduces it, never removes it. */
const SPORING: PathogenBehavior = {
  ...VEGETATIVE,
  muMaxPerHour: 2.4,
  minGrowthK: 285,
  killK: 333,
  germinationK: 325,
  killRatePerHour: 6,
  killSurvivalFraction: 0.02,
  inoculum: 0.01,
  infectiousDose: 0.2,
};

/** A toxin-maker whose poison survives the pot. */
const STABLE_TOXIN: PathogenBehavior = {
  ...VEGETATIVE,
  reach: 'intoxicate',
  infectiousDose: 0.1,
  toxin: { type: 'test-stable-toxin', scaleMg: 600 },
};

/** A toxin-maker whose poison does not. */
const LABILE_TOXIN: PathogenBehavior = {
  ...STABLE_TOXIN,
  toxin: { type: 'test-labile-toxin', scaleMg: 500, labileAtK: 358 },
};

function pathogenRow(key: string, behavior: PathogenBehavior): void {
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName(key);
    c.setPathogenBehavior(behavior);
    return c;
  }, TemplatePathPrefixes.pathogenCondition + key);
}

let matSeq = 0;
function material(aw = 0.99): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`contam-test-mat-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(80000, 'J/mol'));
    m.setWaterActivity(aw);
    return m;
  }, `/stuff/idea/material/_test/contam-${matSeq}`) as unknown as Material;
}

function food(tempK = 293, aw = 0.99): Provision {
  return makeStuff(() => {
    const p = new Provision();
    p.setMass(Quantity.of(1, 'kg'));
    p.setMaterial(material(aw));
    p.setStampedTemperatureK(tempK);
    p.setLastAmbientK(tempK);
    return p;
  });
}

describe('ContaminableMixin — the population no sense reports', () => {
  // ⚠ The roster stands ONCE: a `Condition` is a singleton by path, and
  // re-minting one per test throws `expected singleton, found N`.
  beforeAll(() => {
    installV1QuantityMarshallers();
    pathogenRow('vegetative', VEGETATIVE);
    pathogenRow('sporing', SPORING);
    pathogenRow('stable', STABLE_TOXIN);
    pathogenRow('labile', LABILE_TOXIN);
  });

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  // ---- criterion 9: contamination is an EVENT ----

  it('⭐⭐ NO food ever becomes dangerous on its own — at any heat, over any span', () => {
    for (const tempK of [263, 277, 293, 310, 330, 350]) {
      const p = food(tempK);
      p.getPathogenLoads();
      setNow(365 * DAY);
      expect(p.getPathogenLoads(), `${tempK} K`).toEqual({});
      setNow(0);
    }
  });

  it('…and a clean thing writes no stamp doing it — the sparse default holds', () => {
    const p = food();
    setNow(90 * DAY);
    expect(p.getPathogenLoads()).toEqual({});
    expect(p.pathogenClockStamp).toBe(0);
  });

  it('a zero load integrates to zero however favourable the conditions', () => {
    expect(
      Contamination.advance(0, 1000 * HOUR, VEGETATIVE, 303, 0.99),
    ).toBe(0);
  });

  it('an EVENT is the only way a load starts', () => {
    const p = food();
    expect(p.getPathogenLoad('vegetative')).toBe(0);
    p.contaminate('vegetative');
    expect(p.getPathogenLoad('vegetative')).toBeCloseTo(0.03, 10);
  });

  it('an unauthored key deposits nothing rather than inventing a population', () => {
    const p = food();
    p.contaminate('no-such-organism');
    expect(p.getPathogenLoads()).toEqual({});
  });

  // ---- criterion 10: it is undetectable ----

  it('⭐⭐ a contaminated item renders IDENTICALLY to a clean one', () => {
    // Asserted as the two renderings being EQUAL — never by naming the
    // expected words twice, which would pass a build whose renderer
    // silently said nothing at all.
    const clean = food();
    const dirty = food();
    dirty.contaminate('vegetative');
    dirty.contaminate('sporing');
    expect(dirty.getPathogenLoad('vegetative')).toBeGreaterThan(0);

    // `getMarkupLong` is the seam every sense verb renders through — the
    // one every `markupAugmenters` contributor folds into.
    const channels = [
      undefined,
      ['vision'],
      ['smell'],
      ['taste'],
    ] as const satisfies readonly (readonly SenseChannel[] | undefined)[];
    for (const filter of channels) {
      const opts = filter ? { filter } : undefined;
      expect(dirty.getMarkupLong(clean, opts)).toBe(
        clean.getMarkupLong(clean, opts),
      );
    }
  });

  it('⚠ …and the comparison is not vacuous — the SAME seam does report a cure', () => {
    // The equality above would pass over a renderer that said nothing at
    // all. This is the control: a treatment IS legible through exactly the
    // seam the contamination is invisible through.
    const plain = food();
    const salted = food();
    salted.treat({ solute: 0.6 });
    expect(salted.getMarkupLong(plain)).not.toBe(plain.getMarkupLong(plain));
    expect(salted.getMarkupLong(plain)).toMatch(/salted/);
  });

  it('…and the mixin ships no augmenter at all, which is why', () => {
    const composed = Object.getPrototypeOf(
      Object.getPrototypeOf(food()),
    );
    // The absence is the design (requirement D4); this pins that nobody
    // adds a "faintly tainted" line in a later build without reading it.
    const own = (
      Provision as unknown as { markupAugmenters?: unknown[] }
    ).markupAugmenters;
    expect(String(own ?? '')).not.toMatch(/contamin/i);
    expect(composed).toBeTruthy();
  });

  // ---- the growth law ----

  it('it grows in warm, wet food', () => {
    const p = food(303);
    p.contaminate('vegetative');
    setNow(12 * HOUR);
    expect(p.getPathogenLoad('vegetative')).toBeGreaterThan(0.03);
  });

  it('a cold cellar stops it — below the growth floor nothing happens', () => {
    const p = food(277);
    p.contaminate('sporing'); // minGrowthK 285: 277 K is under it
    const seeded = p.getPathogenLoad('sporing');
    setNow(30 * DAY);
    expect(p.getPathogenLoad('sporing')).toBeCloseTo(seeded, 10);
  });

  it('⭐ curing stops it too — under the organism\'s own water floor', () => {
    const p = food(303);
    p.contaminate('vegetative');
    const seeded = p.getPathogenLoad('vegetative');
    p.treat({ solute: 0.55 }); // a_w ≈ 0.45, far under 0.94
    setNow(120 * DAY);
    // ⚠⚠ Preserved, NOT killed. Curing suspends the population; a cured
    // cut that was contaminated is still contaminated a season later —
    // which is criterion 13 and the counterpart to "heat kills it".
    expect(p.getPathogenLoad('vegetative')).toBeCloseTo(seeded, 10);
  });

  // ---- the kill is a RATE ----

  it('⭐⭐ a long hold at a lower heat and a brief one higher do the same work', () => {
    const long = Contamination.advance(1, 300, VEGETATIVE, 343, 0.99);
    const brief = Contamination.advance(1, 3, VEGETATIVE, 373, 0.99);
    expect(long).toBeLessThan(0.05);
    expect(brief).toBeLessThan(0.05);
  });

  it('…and a lazy warm-through achieves neither, however long you leave it', () => {
    // Two degrees over the line for two minutes: more than half survives.
    const warmed = Contamination.advance(1, 120, VEGETATIVE, 332, 0.99);
    expect(warmed).toBeGreaterThan(0.4);
  });

  it('⭐ a spore-former has a FLOOR the kill can never go under', () => {
    const boiled = Contamination.advance(1, 3600, SPORING, 373, 0.99);
    expect(boiled).toBeCloseTo(0.02, 6);
  });

  it('⭐⭐ …and the survivors WAKE as the dish cools — the overnight lesson', () => {
    const dish = food(373);
    dish.contaminate('sporing');
    dish.setPathogenLoads({ sporing: 0.02 }); // what survived the pot
    // It cools to the room and sits there overnight.
    dish.setStampedTemperatureK(295);
    dish.setLastAmbientK(295);
    dish.getPathogenLoads();
    setNow(10 * HOUR);
    const woken = dish.getPathogenLoad('sporing');
    expect(woken).toBeGreaterThan(SPORING.infectiousDose);
  });

  it('the lag band between germination and kill neither grows nor dies', () => {
    expect(Contamination.growthRate(SPORING, 328, 0.99)).toBe(0);
  });

  // ---- D10: the two poisons ----

  it('⭐⭐ a heat-STABLE toxin survives the pot; a heat-LABILE one does not', () => {
    const loads = { stable: 0.8, labile: 0.8 };
    const raw = Contamination.formedToxins(loads, 0).map((t) => t.type);
    expect(raw).toContain('test-stable-toxin');
    expect(raw).toContain('test-labile-toxin');

    // The tag carries the lability; `BlendLabel.toxicityOf` is what applies
    // it, so what this pins is that the tag is authored honestly.
    const labile = Contamination.formedToxins(loads, 0).find(
      (t) => t.type === 'test-labile-toxin',
    )!;
    const stable = Contamination.formedToxins(loads, 0).find(
      (t) => t.type === 'test-stable-toxin',
    )!;
    expect(labile.labileAtK).toBe(358);
    expect(stable.labileAtK).toBeUndefined();
  });

  it('a population under its infectious dose has made no poison yet', () => {
    expect(Contamination.formedToxins({ stable: 0.05 })).toEqual([]);
  });

  // ---- criterion 17: the route between objects ----

  it('⭐ a dirty implement carries it to whatever it touches next', () => {
    const pot = makeStuff(() => new CraftVessel());
    const carrot = food();
    pot.contaminate('vegetative');
    pot.transferContaminationTo(carrot);
    expect(carrot.getPathogenLoad('vegetative')).toBeGreaterThan(0);
    // ⚠ …and the implement keeps what it had. Wiping it on a carrot is
    // not washing it.
    expect(pot.getPathogenLoad('vegetative')).toBeGreaterThan(0);
  });

  it('…and washing it clears the load outright, back to the clean default', () => {
    const pot = makeStuff(() => new CraftVessel());
    pot.contaminate('vegetative');
    pot.clearContamination();
    expect(pot.getPathogenLoads()).toEqual({});
    expect(pot.pathogenClockStamp).toBe(0);
  });

  // ---- the host set (P8) ----

  it('⭐ the hosts are FOOD EQUIPMENT — food, and the kit that works on it', () => {
    expect(MixinApi.isContaminable(makeStuff(() => new Provision()))).toBe(true);
    expect(MixinApi.isContaminable(makeStuff(() => new ToolItem()))).toBe(true);
    expect(MixinApi.isContaminable(makeStuff(() => new CraftVessel()))).toBe(true);
  });

  it('⚠⚠ NOT `Weapon` — most weapons are never used on food', () => {
    // It was composed there for one build so the clasp knife a player buys
    // could carry pathogens off a carcass — which put `getPathogenLoad()`
    // on the author surface of a mace, a flail, a warhammer and a whip.
    // The claim "this can carry pathogens between things" is FALSE of most
    // of that host set, and `callable == visible == cared-about` settles
    // it. The carrying lives on the butcher's BLOCK instead, which is the
    // canonical cross-contamination vector anyway.
    //
    // ⭐ Butchering is unaffected: the verb still gates on an EDGE
    // (`constructionForm: bladed`), so any blade opens a carcass. Cutting
    // and carrying are different facts.
    expect(MixinApi.isContaminable(makeStuff(() => new Weapon()))).toBe(false);
  });

  it('⚠ NOT `Cutlery` — serviceware touches a mouth, not a carcass', () => {
    expect(MixinApi.isContaminable(makeStuff(() => new Cutlery()))).toBe(false);
  });

  // ---- the pour rule ----

  it('blending is mass-weighted, so decanting never launders', () => {
    const bad = { vegetative: 0.8 };
    const good = {};
    const half = Contamination.blend(bad, 1, good, 1);
    expect(half.vegetative).toBeCloseTo(0.4, 10);
    // Half a bad pot into a full clean one still leaves it contaminated.
    const splash = Contamination.blend(bad, 0.1, good, 0.9);
    expect(splash.vegetative).toBeGreaterThan(0);
  });
});
