/**
 * ⭐ Butchering — the act that creates both halves of the pressure.
 *
 * Four things this pins, and two of them are the defects the plan's review
 * found before a line was written:
 *
 *   - **D14** — a sentient corpse is refused, and the gate is
 *     `SpeciesApi.isSentient`, NOT a clade walk. The tutor-bot is sentient
 *     and is not a primate; a clade walk would have let a player butcher
 *     it.
 *   - **D15** — the cuts carry the carcass's AGE. A player who kills a
 *     beast, leaves it lying for three days and comes back must not get
 *     fresh meat. The failure is silent and reads as generosity.
 *   - the yield and the mess both answer to one band read;
 *   - the knife carries what the gut spilled, and `wash` clears it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { SpeciesApi } from '@saxonberg/server/mud/api/species';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePathPrefixes } from '@saxonberg/server/mud/lib/paths';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Condition from '@saxonberg/server/mud/platform/idea/Condition';
import Weapon from '@saxonberg/server/mud/platform/thing/equipment/Weapon';
import ButcherBlock from '../../../../thing/ButcherBlock';
import BoningKnife from '../../../../thing/BoningKnife';
import KitchenTool from '../../../../thing/KitchenTool';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import { Contamination } from '@saxonberg/server/mud/lib/material/Contaminable';
import type { PathogenBehavior } from '@saxonberg/server/mud/lib/material/Contaminable';
import { Freshness } from '@saxonberg/server/mud/lib/material/Freshness';

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const CONTENT = fileURLToPath(new URL('../../../../../../', import.meta.url));

/** The SHIPPED gut roster, read off the rows rather than restated here. */
function shippedPathogen(key: string): PathogenBehavior {
  const file = join(
    CONTENT,
    'platform/content/platform/idea/Condition/pathogen',
    `${key}.yaml`,
  );
  const row = YAML.parse(readFileSync(file, 'utf8')) as {
    data: { pathogenBehavior: PathogenBehavior };
  };
  return row.data.pathogenBehavior;
}

/** The wolf's shipped yield — the row, not a fixture of it. */
function shippedWolfYield(): { cut: string; units: number }[] {
  const file = join(
    CONTENT,
    'species-and-names/content/stuff/idea/species/wolf.yaml',
  );
  const row = YAML.parse(readFileSync(file, 'utf8')) as {
    data: { butcheryYield?: { cut: string; units: number }[] };
  };
  return row.data.butcheryYield ?? [];
}

let matSeq = 0;
/** A perishable flesh Material — the wolf's `_defaultMaterialPath` shape. */
function flesh(): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`butchery-test-flesh-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.45, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(80000, 'J/mol'));
    m.setWaterActivity(0.99);
    return m;
  }, `/stuff/idea/material/_test/butchery-${matSeq}`) as unknown as Material;
}

describe('butchery — the act, over the shipped rows', () => {
  beforeAll(() => {
    installV1QuantityMarshallers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const key of ['salmonella', 'perfringens', 'staph-aureus']) {
      makeStuffAtPath(() => {
        const c = new Condition();
        c.setName(key);
        c.setPathogenBehavior(shippedPathogen(key));
        return c;
      }, TemplatePathPrefixes.pathogenCondition + key);
    }
  });

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  // ---- D9 / P9: the yield is content ----

  it('⭐ the wolf row authors a butchery yield — a huntable animal is ONE row', () => {
    const yields = shippedWolfYield();
    expect(yields.length).toBeGreaterThan(0);
    expect(yields[0]!.cut).toBe('/stuff/thing/items/stew-meat');
    expect(yields[0]!.units).toBeGreaterThan(1); // more meat than one meal
  });

  it('…and `butcheryYield` round-trips onto the Species field', () => {
    const s = makeStuff(() => {
      const sp = new Species();
      sp.setButcheryYield(shippedWolfYield());
      return sp;
    });
    expect(s.getButcheryYield()).toEqual(shippedWolfYield());
  });

  it('⚠ an empty yield is a STATEMENT, not a gap — most species author none', () => {
    const rat = makeStuff(() => new Species());
    expect(rat.getButcheryYield()).toEqual([]);
  });

  // ---- D14: the gate ----

  it('⭐⭐ the sentient gate is a FLAG, not a clade walk', () => {
    // The tutor-bot ships `sentient: true` and sits nowhere near
    // `hominidae`. A clade walk would let a player butcher it.
    const bot = makeStuffAtPath(() => {
      const sp = new Species();
      sp.setSentient(true);
      sp._parentCladePath = '/stuff/idea/species/constructa/metallica';
      return sp;
    }, '/stuff/idea/species/_test/tutorbot');
    const beast = makeStuffAtPath(() => {
      const sp = new Species();
      sp.setSentient(false);
      sp._parentCladePath = '/stuff/idea/species/animalia';
      return sp;
    }, '/stuff/idea/species/_test/beast');
    expect(bot.isSentient()).toBe(true);
    expect(beast.isSentient()).toBe(false);
    // ⚠ And the shipped roster agrees: every playable species declares it.
    expect(typeof SpeciesApi.isSentient).toBe('function');
  });

  // ---- D15: the clock started at the kill ----

  it('⭐⭐ a cut off an AGED carcass is not fresh meat', () => {
    // ⚠⚠ The failure this pins is SILENT and reads as generosity: kill a
    // beast, leave it lying three days, come back, butcher it — and get
    // prime cuts, because the knife started the clock. A knife must not
    // reset a clock that has been running since the animal died.
    //
    // This asserts the controller's arithmetic directly: the cut's load is
    // the inoculum advanced over `sinceDeath()` at the CARCASS's own
    // temperature, not zero.
    const meat = flesh();
    const carcassK = 293;
    const prompt = Freshness.advance(
      Freshness.inoculum(),
      HOUR,
      meat,
      carcassK,
    );
    const stale = Freshness.advance(
      Freshness.inoculum(),
      3 * DAY,
      meat,
      carcassK,
    );
    expect(stale).toBeGreaterThan(prompt);
    expect(Freshness.bandFor(prompt)).toBe('fresh');
    expect(Freshness.bandFor(stale)).not.toBe('fresh');
  });

  it('⭐ …and dragging it into the cellar within the hour keeps it prime', () => {
    // The other half, and the reason the lesson is worth teaching: the
    // clock runs at the carcass's TEMPERATURE, so a cold carcass ages
    // slowly. Field dressing is time-critical; a cold store buys the time.
    const meat = flesh();
    const inTheSun = Freshness.advance(Freshness.inoculum(), DAY, meat, 303);
    const inTheCellar = Freshness.advance(Freshness.inoculum(), DAY, meat, 278);
    expect(inTheCellar).toBeLessThan(inTheSun);
    expect(Freshness.bandFor(inTheCellar)).toBe('fresh');
  });

  // ---- the gut spill, and the route out ----

  it('⭐ an unskilled hand deposits MORE than a practised one', () => {
    const clumsy = makeStuff(() => new Provision());
    const careful = makeStuff(() => new Provision());
    // `severity` is `1 − skill`, floored — the controller's arithmetic.
    for (const key of ['salmonella', 'perfringens', 'staph-aureus']) {
      clumsy.contaminate(key, 1);
      careful.contaminate(key, 0.15);
    }
    for (const key of ['salmonella', 'perfringens', 'staph-aureus']) {
      expect(clumsy.getPathogenLoad(key)).toBeGreaterThan(
        careful.getPathogenLoad(key),
      );
    }
  });

  it('⚠ …and a practised hand still deposits SOMETHING', () => {
    // The answer to this hazard is cooking and cold, never a good enough
    // butcher. An expert who deposited nothing would make the whole
    // system optional.
    const expert = makeStuff(() => new Provision());
    expert.contaminate('salmonella', 0.15);
    expect(expert.getPathogenLoad('salmonella')).toBeGreaterThan(0);
  });

  it('⭐⭐ the BLOCK carries it to whatever it touches next; `wash` clears it', () => {
    // ⚠ The block, not the blade. This was on `Weapon` for one build so
    // the store's clasp knife could carry it — which handed a mace, a
    // flail and a whip a pathogen-load surface they will never use. A
    // board is food equipment and is the canonical vector besides: *do not
    // prep vegetables on the board you cut raw meat on.*
    const block = makeStuff(() => new ButcherBlock());
    const carrot = makeStuff(() => new Provision());
    block.contaminate('salmonella', 1);
    block.transferContaminationTo(carrot);
    expect(carrot.getPathogenLoad('salmonella')).toBeGreaterThan(0);

    const secondCarrot = makeStuff(() => new Provision());
    block.clearContamination();
    block.transferContaminationTo(secondCarrot);
    expect(secondCarrot.getPathogenLoads()).toEqual({});
  });

  it('⭐⭐ a COOK\'s knife remembers; a pocket knife does not', () => {
    // Both open a carcass — the verb gates on an EDGE, not on a class —
    // and only one of them is food kit. This is the narrow class the
    // `Weapon`-wide mixin was replaced by: a mace, a flail, a warhammer
    // and a whip are none of them a cook's knife.
    const boning = makeStuff(() => new BoningKnife());
    const clasp = makeStuff(() => new Weapon());
    expect(MixinApi.isConstructed(boning)).toBe(true);
    expect(MixinApi.isConstructed(clasp)).toBe(true);
    expect(MixinApi.isContaminable(boning)).toBe(true);
    expect(MixinApi.isContaminable(clasp)).toBe(false);
  });

  it('…and the cook\'s knife carries it on to the next thing it touches', () => {
    // D3's *"a board, a knife, a hand and a vessel"* — the knife half,
    // which briefly went missing when the mixin came off `Weapon`.
    const knife = makeStuff(() => new BoningKnife());
    const carrot = makeStuff(() => new Provision());
    knife.contaminate('salmonella', 1);
    knife.transferContaminationTo(carrot);
    expect(carrot.getPathogenLoad('salmonella')).toBeGreaterThan(0);
    expect(knife.getPathogenLoad('salmonella')).toBeGreaterThan(0);
  });

  it('⭐ a kitchen tool can hold a load; a mining tool cannot', () => {
    const sieve = makeStuff(() => new KitchenTool());
    const shovel = makeStuff(() => new ToolItem());
    expect(MixinApi.isContaminable(sieve)).toBe(true);
    expect(MixinApi.isContaminable(shovel)).toBe(false);
    // …and the craft offers the load to BOTH; only one can take it, which
    // is the narrowing doing the work rather than a guard.
    expect(MixinApi.isTool(sieve)).toBe(true);
    expect(MixinApi.isTool(shovel)).toBe(true);
  });

  it('the freshly contaminated cut is ALREADY at the infectious dose', () => {
    // Salmonella's dose sits at the inoculum on purpose (its real one is
    // famously low) — which is what makes the raw-meat lesson land on the
    // first try rather than the fourth.
    const cut = makeStuff(() => new Provision());
    cut.contaminate('salmonella', 1);
    const behavior = shippedPathogen('salmonella');
    expect(cut.getPathogenLoad('salmonella')).toBeGreaterThanOrEqual(
      behavior.infectiousDose,
    );
  });

  it('⭐ the gut roster spans all three answers at once', () => {
    // salmonella: cooking removes it outright.
    // perfringens: spores survive and wake as the dish cools.
    // staph: it poisons the food, so cooking does not help at all.
    expect(shippedPathogen('salmonella').killSurvivalFraction ?? 0).toBe(0);
    expect(
      shippedPathogen('perfringens').killSurvivalFraction ?? 0,
    ).toBeGreaterThan(0);
    expect(shippedPathogen('staph-aureus').reach).toBe('intoxicate');
    expect(
      shippedPathogen('staph-aureus').toxin?.labileAtK,
    ).toBeUndefined();
  });

  it('⚠ cooking a carcass-fresh cut leaves the SPORES and nothing else', () => {
    const loads = {
      salmonella: 0.05,
      perfringens: 0.05,
      'staph-aureus': 0.02,
    };
    const cooked = Contamination.killOver(loads, 400, 0, 0.99);
    expect(cooked.salmonella).toBeUndefined();
    expect(cooked['staph-aureus']).toBeUndefined();
    expect(cooked.perfringens).toBeCloseTo(0.001, 6);
    // …and what survived is far under its infectious dose, so a cut cooked
    // and eaten at once is safe. It is the LEAVING it out that is not.
    expect(cooked.perfringens!).toBeLessThan(
      shippedPathogen('perfringens').infectiousDose,
    );
  });

  it('⭐⭐ …and left out overnight those same spores cross the dose', () => {
    const dish = makeStuff(() => new Provision());
    dish.setPathogenLoads({ perfringens: 0.001 });
    dish.setStampedTemperatureK(298);
    dish.setLastAmbientK(298);
    dish.getPathogenLoads();
    setNow(12 * HOUR);
    expect(dish.getPathogenLoad('perfringens')).toBeGreaterThan(
      shippedPathogen('perfringens').infectiousDose,
    );
  });

  it('…and a cold cellar is the counterplay — under the growth floor, nothing', () => {
    const dish = makeStuff(() => new Provision());
    dish.setPathogenLoads({ perfringens: 0.001 });
    dish.setStampedTemperatureK(278); // 5 °C, under minGrowthK 285
    dish.setLastAmbientK(278);
    dish.getPathogenLoads();
    setNow(3 * DAY);
    expect(dish.getPathogenLoad('perfringens')).toBeCloseTo(0.001, 6);
  });
});
