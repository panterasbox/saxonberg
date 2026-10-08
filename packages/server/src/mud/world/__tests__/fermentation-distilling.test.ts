/**
 * Distilling's authored rows close the lane (fermentation W6) — the
 * REAL pack content: the wash ferments from the still-house's own
 * rough wort (its foreshot character authored, inert — P10's cuts
 * seam); the still recipes carry ethanol's boiling point as their
 * gate (351 K — the number IS the lesson); the compounder's gin and
 * the vintner's fortifications consume the SAME neutral spirit (the
 * B2B falls out of the chemistry, D7); and the spirit materials are
 * flammable — an ignited spill burns (P10).
 */

import "../../../test-bootstrap";
import { chargeHot } from '../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../lib/fire/Burner';
import type { Stuff } from '../../lib/stuff/Stuff';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Vat from '../../platform/thing/Vat';
import MaturationProfile from '../../platform/idea/maturation/MaturationProfile';
import Material from '../../lib/material/Material';
import { Recipe } from '../../lib/craft/Recipe';
import { CombustibleMixin } from '../../lib/fire/Combustible';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { ReservedMixin, Reserve } from '../../lib/reserve';
import Good from '../../lib/stuff/Good';
import { FireApi } from '../../api/fire';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import '../../platform/idea/WorldClockRegistry';

const PACKS = fileURLToPath(new URL('../../../../../content/', import.meta.url));
const DISTILLING = join(PACKS, 'trade-distilling');
const WINEMAKING = join(PACKS, 'trade-winemaking');

const DAY = 86_400;
const BASE = 50_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

function rowData(pack: string, rel: string): Record<string, unknown> {
  const raw = parse(readFileSync(join(pack, rel), 'utf8')) as {
    data: Record<string, unknown>;
  };
  return raw.data;
}
function recipeOf(pack: string, id: string): Recipe {
  return Recipe.fromData(
    parse(
      readFileSync(join(pack, 'content', 'recipes', `${id}.yaml`), 'utf8'),
    ) as Record<string, unknown>,
  );
}

let seq = 0;

class BurnFixture extends CombustibleMixin(
  ThermalMixin(ReservedMixin(Good)),
) {
  static _mixinName = 'DistillingBurnFixture';
}

beforeEach(() => {
  seq += 1;
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('the wash (real rows)', () => {
  it("ferments the still-house's rough wort", () => {
    const profileData = rowData(
      DISTILLING,
      'content/trade/distilling/idea/maturation/wash.yaml',
    );
    // ⛔ This used to assert `foreshotCharacter` was non-empty — the one
    // reader of an inert seam. The whiskey build shipped the cuts rung,
    // so the character is per FRACTION on the fraction schedule and this
    // field no longer exists. What matters about the profile here is that
    // it keys on the WORT and not on the wash, or the still would try to
    // ferment its own charge.
    expect(profileData.inputCategory).toBe('distillers-wort');

    const root = `/stuff/idea/distilling-w6-${seq}/idea`;
    const wortData = rowData(
      DISTILLING,
      'content/trade/distilling/idea/material/distillers-wort.yaml',
    );
    const wort = makeStuffAtPath(() => {
      const m = new Material();
      m.setName(wortData.name as string);
      m.setTags(wortData.tags as string[]);
      m.setNutrients(wortData.nutrients as string[]);
      m.setNutrientAmounts(wortData.nutrientAmounts as Record<string, number>);
      return m;
    }, `${root}/material/distillers-wort`);
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('wash');
      m.setTags(['liquid', 'wash']);
      return m;
    }, '/trade/distilling/idea/material/wash');
    makeStuffAtPath(() => {
      const p = new MaturationProfile();
      for (const [k, v] of Object.entries(profileData)) {
        const setter = `set${k[0]!.toUpperCase()}${k.slice(1)}`;
        const fn = (p as unknown as Record<string, unknown>)[setter];
        if (typeof fn === 'function') (fn as (x: unknown) => void).call(p, v);
      }
      return p;
    }, `${root}/maturation/wash`);

    const vat = makeStuff(() => new Vat());
    vat.lastAmbientK = 289;
    vat.stampedTemperatureK = 289;
    vat.setBulkMaterial('interior', wort);
    vat.setBulkAmount('interior', Quantity.of(60, 'L'));
    vat.getMaturationPhase();
    setNow(5 * DAY); // 0.3/day → finished
    expect(vat.getMaturationPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(
      '/trade/distilling/idea/material/wash',
    );
  });
});

describe('the still recipes (real rows)', () => {
  // ⛔ `distil`, `brandy` and `grappa` are RETIRED. They asked for 351 K
  // and named the still's capability, and no still in the world authored
  // a fuel reserve — so `FireLogic` refused to ignite the burner,
  // `reachableHeatForImpl` counted no heat, and all three declined
  // `insufficient-heat` for the whole life of the pack. ⭐ What replaced
  // them is the fraction SCHEDULE, which keeps the same number and spends
  // it on four outputs instead of one.
  it("the SCHEDULES carry ethanol's boiling point, which the retired recipes could never reach", () => {
    for (const key of ['wash', 'rectify', 'wine']) {
      const row = rowData(
        DISTILLING,
        `content/trade/distilling/idea/fractionation/${key}.yaml`,
      );
      expect(row.requiresHeatK, key).toBe(351);
      expect(row.discipline, key).toBe('distilling');
    }
    // And the stills can actually get there. ⭐ The fix changed shape in
    // the fire build: the rows no longer author a `%` fuel reserve (which
    // was the original defect's fix) — they author a bed CAPACITY and a
    // POWER, and somebody `stoke`s them. The still's firebox is
    // deliberately NOT its interior, which is the wash.
    for (const row of ['still', 'small-still']) {
      const data = rowData(
        DISTILLING,
        `content/trade/distilling/thing/${row}.yaml`,
      );
      expect(data.reserves, row).toBeUndefined();
      expect(data.fuelCapacityKg, row).toBeGreaterThan(0);
      expect(data.maxBurnPowerW, row).toBeGreaterThan(0);
      expect(data.burnTemperatureK, row).toBeGreaterThan(351);
      expect(data.interiorBulk, row).toBe(true);
    }
  });

  it('⭐ the wash schedule is calibrated so a good cut harms nobody', () => {
    const schedule = rowData(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/wash.yaml',
    );
    const methanol = rowData(
      join(PACKS, 'platform'),
      'content/platform/idea/Condition/metabolism/methanol.yaml',
    );
    const behavior = methanol.toxinBehavior as {
      potency: number;
      bands: { threshold: number }[];
    };
    const lowest = Math.min(...behavior.bands.map((b) => b.threshold));
    const fractions = schedule.fractions as {
      key: string;
      toxins?: { type: string; amount: number }[];
    }[];
    const hearts = fractions.find((f) => f.key === 'hearts')!;
    const dose =
      hearts.toxins?.find((t) => t.type === 'methanol')?.amount ?? 0;
    // ⚠ The claim, as arithmetic rather than as prose: a WHOLE BOTTLE of
    // nothing but hearts stays under the lowest rung on a reference body.
    // If somebody retunes either row, this is what notices.
    const BOTTLE_L = 0.75;
    const REFERENCE_KG = 70;
    const burden = (dose * BOTTLE_L * behavior.potency) / REFERENCE_KG;
    expect(burden).toBeLessThan(lowest);
    // And it is NOT zero: a good spirit carries trace congeners, and
    // "nothing is pure" is a truer lesson than "good work is perfect".
    expect(dose).toBeGreaterThan(0);

    // Keeping the heads crosses it. Worked on the house pot's 60 L
    // charge: the heads span 0.005→0.03, so 1.5 L at 3000 mg/L, and the
    // rest of a 0.75 L bottle filled from that span is heads too.
    const heads = fractions.find((f) => f.key === 'heads')!;
    const headsDose =
      heads.toxins?.find((t) => t.type === 'methanol')?.amount ?? 0;
    const headsBurden =
      (headsDose * BOTTLE_L * behavior.potency) / REFERENCE_KG;
    expect(headsBurden).toBeGreaterThan(lowest);
  });

  it('⚠ whiskey is no longer the safest drink in the house', () => {
    // It authored `alcohol: 19` against neutral-spirit's 45 and the
    // wash's 8 — a 40 % spirit at half the dose of an 8 % wash.
    const whiskey = rowData(
      DISTILLING,
      'content/trade/distilling/idea/material/whiskey.yaml',
    );
    const wash = rowData(
      DISTILLING,
      'content/trade/distilling/idea/material/wash.yaml',
    );
    const doseOf = (d: Record<string, unknown>): number =>
      ((d.toxicity as { type: string; amount: number }[]) ?? []).find(
        (t) => t.type === 'alcohol',
      )?.amount ?? 0;
    expect(doseOf(whiskey)).toBeGreaterThan(doseOf(wash) * 2);
  });

  it("compounding and fortification consume the SAME neutral spirit (the B2B, D7)", () => {
    const spirit = rowData(
      DISTILLING,
      'content/trade/distilling/idea/material/neutral-spirit.yaml',
    );
    const tags = spirit.tags as string[];
    const gin = recipeOf(DISTILLING, 'compound-gin');
    const dry = recipeOf(WINEMAKING, 'dry-vermouth');
    const sweet = recipeOf(WINEMAKING, 'sweet-vermouth');
    for (const [r, name] of [
      [gin, 'compound-gin'],
      [dry, 'dry-vermouth'],
      [sweet, 'sweet-vermouth'],
    ] as const) {
      const slot = r
        .getInputSlots()
        .find((s2) => tags.includes(s2.category));
      expect(slot, name).toBeDefined();
    }
    // The martini's base: compound-gin outputs the shipped gin material
    // the bar's recipe already pours by category.
    expect(gin.getOutputMaterial()).toBe(
      '/trade/distilling/idea/material/gin',
    );
  });
});

describe('the spirit burns (P10)', () => {
  it('every spirit material authors its fire; an ignited spill burns', () => {
    const spirits = [
      'neutral-spirit',
      'gin',
      'vodka',
      'whiskey',
      'rum-light',
      'rum-dark',
      'tequila',
      'brandy',
      'grappa',
    ];
    for (const name of spirits) {
      const data = rowData(
        DISTILLING,
        `content/trade/distilling/idea/material/${name}.yaml`,
      );
      expect(Number(data.autoignitionTemperature), name).toBeGreaterThan(0);
      expect(Number(data.heatOfCombustion), name).toBeGreaterThan(0);
    }

    // The spill: a Combustible whose matter is the neutral spirit,
    // heated past the authored autoignition — it catches.
    const spiritData = rowData(
      DISTILLING,
      'content/trade/distilling/idea/material/neutral-spirit.yaml',
    );
    const material = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('neutral spirit');
      m.setTags(spiritData.tags as string[]);
      m.setAutoignitionTemperature(
        Quantity.of(Number(spiritData.autoignitionTemperature), 'K'),
      );
      m.setHeatOfCombustion(
        Quantity.of(Number(spiritData.heatOfCombustion), 'MJ/kg'),
      );
      return m;
    }, `/stuff/idea/distilling-w6-${seq}/idea/material/spill-spirit`);
    const spill = makeStuff(() => {
      const b = new BurnFixture();
      b.setKeywords(['spill']);
      // The fuel is the spilled spirit itself (Combustible reads the
      // 'fuel' reserve; the material lends the ignition point). ⚠ A
      // Combustible keeps that reserve — only an APPLIANCE that holds a
      // fire got a fuel bed (fire plan D16).
      b.setReserve(
        new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
      );
      return b;
    });
    (spill as unknown as { _materialPath: string })._materialPath =
      material.getTemplatePath()!;
    spill.setMass(Quantity.of(0.8, 'kg'));
    spill.lastAmbientK = 700; // the dropped lamp
    spill.stampedTemperatureK = 700;
    const caught = spill.tryAutoignite();
    expect(caught).toBe(true);
    expect(spill.isBurning()).toBe(true);
  });
});
