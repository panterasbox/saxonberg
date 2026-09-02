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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Vat from '../../platform/thing/Vat';
import FermentProfile from '../../platform/idea/ferment/FermentProfile';
import Material from '../../lib/material/Material';
import { Recipe } from '../../lib/craft/Recipe';
import { CombustibleMixin } from '../../lib/fire/Combustible';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { ReservedMixin, Reserve } from '../../lib/reserve';
import Thing from '../../lib/stuff/Thing';
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
  ThermalMixin(ReservedMixin(Thing)),
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
  it("ferments the still-house's rough wort, foreshot character authored and inert", () => {
    const profileData = rowData(
      DISTILLING,
      'content/trade/distilling/idea/ferment/wash.yaml',
    );
    expect(String(profileData.foreshotCharacter).length).toBeGreaterThan(0);

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
      const p = new FermentProfile();
      for (const [k, v] of Object.entries(profileData)) {
        const setter = `set${k[0]!.toUpperCase()}${k.slice(1)}`;
        const fn = (p as unknown as Record<string, unknown>)[setter];
        if (typeof fn === 'function') (fn as (x: unknown) => void).call(p, v);
      }
      return p;
    }, `${root}/ferment/wash`);

    const vat = makeStuff(() => new Vat());
    vat.lastAmbientK = 289;
    vat.stampedTemperatureK = 289;
    vat.setBulkMaterial('interior', wort);
    vat.setBulkAmount('interior', Quantity.of(60, 'L'));
    vat.getFermentPhase();
    setNow(5 * DAY); // 0.3/day → finished
    expect(vat.getFermentPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(
      '/trade/distilling/idea/material/wash',
    );
  });
});

describe('the still recipes (real rows)', () => {
  it("distil, brandy and grappa carry ethanol's boiling point as their gate", () => {
    for (const id of ['distil', 'brandy', 'grappa']) {
      const r = recipeOf(DISTILLING, id);
      expect(r.getRequiresHeatK(), id).toBe(351);
      expect(r.getToolCapabilities(), id).toContain('still');
    }
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
      // 'fuel' reserve; the material lends the ignition point).
      b.setReserve(
        new Reserve('fuel', Quantity.of(1, 'kg'), Quantity.of(1, 'kg'), 'fire', 'spent'),
      );
      return b;
    });
    (spill as unknown as { _materialPath: string })._materialPath =
      material.getTemplatePath()!;
    spill.setMass(Quantity.of(0.8, 'kg'));
    spill.lastAmbientK = 700; // the dropped lamp
    spill.stampedTemperatureK = 700;
    const caught = FireApi.tryAutoignite(spill);
    expect(caught).toBe(true);
    expect(FireApi.isBurning(spill)).toBe(true);
  });
});
