/**
 * Sugaring — the sap chain's rows, and the arithmetic they commit to.
 *
 * ⭐⭐ The claims worth pinning here are the ones a player will feel and
 * no unit test of the mechanism can see, because they are about NUMBERS
 * AGREEING ACROSS ROWS:
 *
 *  1. the sap material's tag is the profile's `inputCategory`, or the
 *     boil silently never starts;
 *  2. the syrup is tagged so the Lounge's shipped cocktails accept it
 *     **with no recipe edited** — the demand checkpoint;
 *  3. ⛔ and it is NOT tagged `sugar`, which would make a recipe asking
 *     for sugar accept syrup and vice versa;
 *  4. the arch gets hot enough to reach the profile's `happyK` and not
 *     so hot that a tended boil cannot finish before `damageAboveK`;
 *  5. the pan's capacity and the profile's `productFraction` produce the
 *     yield the rows' own prose claims.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));

function row(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(`${CONTENT}${rel}`, 'utf8')) as Record<string, unknown>;
}
function data(rel: string): Record<string, never> {
  return row(rel).data as Record<string, never>;
}

const F = 'trade-forestry/content';
const SAP = (t: string): string => `${F}/stuff/idea/material/food/${t}-sap.yaml`;
const SYRUP = (t: string): string => `${F}/trade/forestry/idea/material/${t}-syrup.yaml`;
const PROFILE = (t: string): string => `${F}/trade/forestry/idea/maturation/${t}-sap.yaml`;
const PAN = `${F}/trade/forestry/thing/sap-pan.yaml`;
const ARCH = `${F}/trade/forestry/thing/evaporator.yaml`;

describe('the sap chain — the rows agree', () => {
  for (const t of ['birch', 'maple']) {
    it(`⭐⭐ ${t}: the sap's TAG is the profile's inputCategory`, () => {
      // ⚠ The silent failure this exists against: a profile whose
      // `inputCategory` matches no material tag never starts, and
      // nothing reports it — the pan just sits there full of sap.
      const tags = data(SAP(t)).tags as unknown as string[];
      expect(tags).toContain(`${t}-sap`);
      expect(data(PROFILE(t)).inputCategory).toBe(`${t}-sap`);
    });

    it(`${t}: the profile's product is the syrup material that exists`, () => {
      expect(data(PROFILE(t)).productMaterial).toBe(
        `/trade/forestry/idea/material/${t}-syrup`,
      );
      expect(data(SYRUP(t)).name).toBe(`${t} syrup`);
    });

    it(`⭐⭐ ${t} syrup is tagged \`syrup\` — and ⛔ NOT \`sugar\``, () => {
      const tags = data(SYRUP(t)).tags as unknown as string[];
      expect(tags).toContain('syrup');
      expect(tags).toContain('sweetener');
      // ⛔ The whole sweetener vocabulary in one assertion. `sugar`,
      // `honey` and `syrup` are the three RECIPE tags and `sweetener` is
      // the family that gates nothing; tagging syrup `sugar` would make
      // a dough recipe accept it and a cocktail accept granulated sugar.
      expect(tags).not.toContain('sugar');
      expect(tags).not.toContain('honey');
    });

    it(`⭐ ${t}: the sap SOURS and the syrup keeps — the hurdle is real`, () => {
      // The reason a sugarer boils the same day they tap, modelled
      // rather than asserted.
      expect(Number(data(SAP(t)).waterActivity)).toBeGreaterThan(0.95);
      expect(Number(data(SYRUP(t)).waterActivity)).toBeLessThan(0.8);
    });
  }

  it('⭐⭐⭐ the Lounge accepts the syrup with NO recipe edited', () => {
    // The demand checkpoint. All four shipped cocktails slot
    // `category: syrup`, and a recipe slot matches a MATERIAL
    // CLASSIFICATION tag — so this is the whole of what makes the boil
    // worth doing, and it cost zero lines in `trade-hospitality`.
    const gimlet = row('trade-hospitality/content/recipes/gimlet.yaml') as unknown as {
      inputSlots: Array<{ category: string }>;
    };
    const categories = gimlet.inputSlots.map((s) => s.category);
    expect(categories).toContain('syrup');
    for (const t of ['birch', 'maple']) {
      expect(data(SYRUP(t)).tags as unknown as string[]).toContain('syrup');
    }
  });

  it('⚠⚠ the arch reaches the profile’s happyK, and stops short of damage', () => {
    // ⭐ The calibration, and it is the one set of numbers in this build
    // that had to be CHECKED rather than chosen: a lit arch has to get a
    // pan to a rolling boil (`happyK`) or the trade does not work at
    // all, and it must not sit above `damageAboveK` or a tended boil
    // would scorch no matter who was watching. The gap between 370 and
    // 400 is where a sugarer's attention lives.
    const burn = Number(data(ARCH).burnTemperatureK);
    for (const t of ['birch', 'maple']) {
      const p = data(PROFILE(t));
      expect(burn).toBeGreaterThan(Number(p.happyK));
      expect(burn).toBeLessThan(Number(p.damageAboveK));
    }
  });

  it('⭐ the pan and the fraction give the yield the rows claim', () => {
    const capacity = Number(data(PAN).interiorCapacity);
    expect(capacity).toBe(40);
    // Birch at 2% — about three-quarters of a litre off a full pan.
    const birch = capacity * Number(data(PROFILE('birch')).productFraction);
    expect(birch).toBeCloseTo(0.8, 1);
    // Maple at 4% — a litre and a half, twice the sugar for less sap.
    const maple = capacity * Number(data(PROFILE('maple')).productFraction);
    expect(maple).toBeCloseTo(1.6, 1);
    // ⭐ And THAT is the economy: maple is the better tree per litre
    // gathered, birch the better tree per tree. Nobody is told; the two
    // numbers say it.
    expect(maple).toBeGreaterThan(birch);
  });

  it('⚠ the profile authors no strain — nothing lives in a boiling pan', () => {
    // Two shipped evaporative profiles were silently frozen by the
    // strain gate before the extraction build; a third would have been.
    for (const t of ['birch', 'maple']) {
      const p = data(PROFILE(t));
      expect(p.requiresFlora).toBeUndefined();
      expect(Number(p.leesFraction)).toBe(0);
    }
  });

  it('the pan is a `pan` vessel kind, like the saltern it copies', () => {
    expect(data(PAN).category).toBe('pan');
    const salt = YAML.parse(
      readFileSync(
        `${CONTENT}trade-quarrying/content/trade/quarrying/thing/salt-pan.yaml`,
        'utf8',
      ),
    ) as { data: { category: string } };
    expect(data(PAN).category).toBe(salt.data.category);
  });
});

describe('the sap trees — the rows the mechanism reads', () => {
  const SPECIES = (rel: string): Record<string, never> =>
    data(`${F}/stuff/idea/species/plantae/tracheophyta/magnoliopsida/${rel}`);

  const birch = (): Record<string, never> =>
    SPECIES('fagales/betulaceae/betula/pendula.yaml');
  const maple = (): Record<string, never> =>
    SPECIES('sapindales/sapindaceae/acer/saccharum.yaml');

  it('⭐⭐ a sap tap is a VOLUME naming the MATERIAL, not a thing row', () => {
    for (const sp of [birch(), maple()]) {
      const tap = (sp.production as unknown as Array<Record<string, unknown>>)[0]!;
      expect(tap.yieldShape).toBe('volume');
      // ⚠ For a volume tap `yieldRow` names a MATERIAL — the vessel is
      // the object, so there is nothing to clone. The one place a
      // field's meaning changes with another field's value.
      expect(String(tap.yieldRow)).toContain('/idea/material/');
    }
  });

  it('⭐⭐⭐ both windows are `rising` — or a tree would run twice a year', () => {
    // Spring and autumn cross the same daylength band and are not the
    // same season for a tree. Without this term the sap would run in
    // September, and nothing in the game would ever have reported it.
    for (const sp of [birch(), maple()]) {
      const tap = (sp.production as unknown as Array<Record<string, unknown>>)[0]!;
      const window = tap.window as Record<string, unknown>;
      expect(window.kind).toBe('weather');
      expect(window.rising).toBe(true);
    }
  });

  it('⚠ maple opens EARLIER than birch, which is the real order', () => {
    const b = (birch().production as unknown as Array<Record<string, unknown>>)[0]!;
    const m = (maple().production as unknown as Array<Record<string, unknown>>)[0]!;
    const bw = b.window as Record<string, number>;
    const mw = m.window as Record<string, number>;
    expect(mw.daylightFrom).toBeLessThan(bw.daylightFrom);
  });

  it('⚠⚠ no window asks for a FREEZE — it would never fire in this climate', () => {
    // The realm's temperature floor is around 276 K (a 295 K baseline
    // with ±10 K annual and ±4 K diurnal deviation), so a freeze-thaw
    // opener — which is what a real sugar maple runs on — would not fire
    // ONCE, in any season, anywhere. Authoring one would have shipped a
    // tree that silently never ran. ⭐ The fix is a ROW when winter is
    // real, which is the climate slate's first consumer, and this
    // assertion is what will fail when somebody tries it early.
    for (const sp of [birch(), maple()]) {
      const tap = (sp.production as unknown as Array<Record<string, unknown>>)[0]!;
      const window = tap.window as Record<string, number>;
      expect(window.minK).toBeGreaterThan(273);
    }
  });

  it('⭐ birch runs more sap per spile and maple carries more sugar', () => {
    const b = (birch().production as unknown as Array<Record<string, unknown>>)[0]!;
    const m = (maple().production as unknown as Array<Record<string, unknown>>)[0]!;
    expect(Number(b.perGameDay)).toBeGreaterThan(Number(m.perGameDay));
    expect(
      Number(data(PROFILE('maple')).productFraction),
    ).toBeGreaterThan(Number(data(PROFILE('birch')).productFraction));
  });

  it('the standard rows name the SapStandard class and their own species', () => {
    for (const t of ['birch', 'maple']) {
      const std = row(`${F}/trade/forestry/thing/plant/${t}-standard.yaml`) as {
        class: string;
        data: { _speciesPath: string; standardMaterialPath: string; spiles: number };
      };
      expect(std.class).toBe('/trade/forestry/thing/SapStandard');
      expect(std.data.standardMaterialPath).toBe(`/stuff/idea/material/wood/${t}`);
      expect(std.data.spiles).toBe(0);
      // ⭐ And the species row it names is the one carrying the tap —
      // the link that makes the whole thing work, and the one that
      // `taps()` reads SYNCHRONOUSLY, so a species nothing stood up
      // gives a tree with no taps (the apiculture lesson).
      const sp = data(`${F}${std.data._speciesPath}.yaml`.replace(`${F}/stuff`, `${F}/stuff`));
      expect((sp.production as unknown as unknown[]).length).toBe(1);
    }
  });

  it('⭐ a sap standard matures faster than an oak — a plantable bush', () => {
    const oak = row(`${F}/trade/forestry/thing/plant/oak-standard.yaml`) as {
      data: { profile: { daysToStage: { mature: number } } };
    };
    for (const t of ['birch', 'maple']) {
      const std = row(`${F}/trade/forestry/thing/plant/${t}-standard.yaml`) as {
        data: { profile: { daysToStage: { mature: number } } };
      };
      expect(std.data.profile.daysToStage.mature).toBeLessThan(
        oak.data.profile.daysToStage.mature,
      );
    }
  });
});
