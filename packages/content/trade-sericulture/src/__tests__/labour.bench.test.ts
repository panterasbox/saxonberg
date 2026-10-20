/**
 * ⭐⭐⭐ The labour bench — **a luxury is embodied HOURS at a wage** (silk
 * D14; silk-slate § 6).
 *
 * Labour in this game is commands, so a good is scarce only if its HOURS
 * are. The bench reads the shipped dials and rows — never restates a
 * duration — and computes the attended hours in one woven web (one
 * `weave`) of linen, of wool and of silk, and per kilogram of the fibre
 * that went into it. Silk must sit far above both, or the rows are wrong.
 * Then it checks that the silk prices on the shelves are those hours at
 * the seats' wages.
 *
 * ⭐ A rearing's hours are ATTENDANCE, not act length: a tray is visited
 * and fed twice a day for the four weeks its worms eat (`visitMinutes`
 * each). That is the time commitment the slate found to be the real
 * scarcity — what a paid hand converts into money.
 *
 * ⚠ Retting and the moths' ten days are ELAPSED, not labour, and are
 * reported apart (the mill bench's rule).
 *
 * ⚠ The cocoon's price is FLOORED at one minor unit: a cocoon is a few
 * minutes of a hand's wage and the currency has no smaller coin. The
 * bench says so rather than pretend; the floor is a markets question
 * (markets-slate open Q5), not a sericulture one.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));

function yamlAt(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(CONTENT + rel, 'utf-8')) as Record<string, unknown>;
}
function data(rel: string): Record<string, unknown> {
  return (yamlAt(rel).data ?? {}) as Record<string, unknown>;
}
function dials(rel: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { key, value } of (yamlAt(rel).settings as Array<{ key: string; value: string }>)) {
    out[key] = Number(value);
  }
  return out;
}
function rate(rel: string, kind: string): number {
  const caps = (data(rel).capabilities ?? []) as Array<{ kind: string; rate?: number }>;
  return caps.find((c) => c.kind === kind)?.rate ?? 1;
}
function wage(rel: string, key: string): number {
  const p = (data(rel).positions as Array<{ key: string; wageRate: number }>).find((x) => x.key === key);
  return p!.wageRate;
}

const HOUR = 3_600_000;
const tx = dials('trade-textiles/content/settings/textiles-trade.yaml');
const sx = dials('trade-sericulture/content/settings/sericulture.yaml');
const YARN_KG = Number(data('trade-textiles/content/trade/textiles/thing/yarn.yaml').mass);
const SPINDLE = rate('trade-textiles/content/trade/textiles/thing/drop-spindle.yaml', 'spinning');
const WHEEL = rate('trade-textiles/content/trade/textiles/thing/spinning-wheel.yaml', 'spinning');
const LOOM = rate('trade-textiles/content/trade/textiles/thing/hand-loom.yaml', 'weaving');
const BASIN = rate('trade-sericulture/content/trade/sericulture/thing/reeling-basin.yaml', 'reeling');
const STRAIN_MG = Number(data('trade-sericulture/content/trade/sericulture/idea/strain/valley-gold.yaml').meanShellMg);
const HOUSE = 'hearts-delight/content/world/terminus/hearts-delight/silk-house/';
const MILL = 'terminus/content/world/terminus/wharfside/mill/';

/** One web = one plain `weave`: its charge of yarn. */
const YARN_PER_WEB = tx['textiles.weave.chargeUnits']!;
const SPIN_ACTS = Math.ceil(YARN_PER_WEB / tx['textiles.spin.chargeUnits']!);
const WEAVE_H = tx['textiles.weave.baseMs']! / LOOM / HOUR;

function linenHours(): number {
  const line = SPIN_ACTS * tx['textiles.spin.chargeUnits']!;
  const scutchActs = Math.ceil(line / (tx['textiles.scutch.chargeLitres']! * 0.5));
  return scutchActs * (tx['textiles.scutch.baseMs']! / HOUR) + SPIN_ACTS * (tx['textiles.spin.baseMs']! / SPINDLE / HOUR) + WEAVE_H;
}

function woolHours(): number {
  return SPIN_ACTS * (tx['textiles.spin.baseMs']! / SPINDLE / HOUR) + WEAVE_H;
}

/** The silk web's chain, by stage, at the mill's tools. */
function silk(): Record<string, number> {
  const skeins = SPIN_ACTS * tx['textiles.spin.chargeUnits']!;
  const cocoonsPerWeb = skeins * sx['sericulture.reel.charge']!;
  const cocoonsPerTray = 300 * sx['sericulture.survival']!;
  // The feeding weeks at a warm 25 °C: the larval degree-days over 15 K.
  const feedingDays = 352 / (298 - sx['sericulture.baseK']!);
  const visits = feedingDays * sx['sericulture.bench.visitsPerDay']! + 4; // + mount, harvest, two at the oven
  const trayHours = (visits * sx['sericulture.bench.visitMinutes']!) / 60;
  return {
    rearing: trayHours * (cocoonsPerWeb / cocoonsPerTray),
    reel: skeins * (sx['sericulture.reel.baseMs']! / BASIN / HOUR),
    throw: SPIN_ACTS * (tx['textiles.spin.baseMs']! / WHEEL / HOUR),
    weave: WEAVE_H,
    trayHours,
    cocoonsPerWeb,
    cocoonsPerTray,
  };
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

describe('the labour bench', () => {
  const s = silk();
  const silkHours = s.rearing! + s.reel! + s.throw! + s.weave!;
  const linenKg = YARN_PER_WEB * YARN_KG;
  const silkKg = (s.cocoonsPerWeb! * STRAIN_MG) / 1e6;

  it('⭐⭐ silk is far above linen and wool, per kilogram of fibre', () => {
    const perKg = {
      linen: linenHours() / linenKg,
      wool: woolHours() / linenKg,
      silk: silkHours / silkKg,
    };
    console.info(
      `\n  attended hours per web: linen ${r2(linenHours())} · wool ${r2(woolHours())} · silk ${r2(silkHours)}` +
        `\n    silk: rearing ${r2(s.rearing!)} (a tray is ${r2(s.trayHours!)} h of visits) · reel ${r2(s.reel!)} · throw ${r2(s.throw!)} · weave ${r2(s.weave!)}` +
        `\n  attended hours per kg: linen ${r2(perKg.linen)} · wool ${r2(perKg.wool)} · silk ${r2(perKg.silk)}` +
        `\n  elapsed, not labour: retting ~a fortnight; the moths ${sx['sericulture.emergeDays']} days\n`,
    );
    expect(perKg.silk / perKg.linen, 'the rows are wrong: silk must cost far more hours than linen').toBeGreaterThan(4);
    expect(perKg.silk / perKg.wool, 'the rows are wrong: silk must cost far more hours than wool').toBeGreaterThan(3);
    // …and per web too, not only per kilo.
    expect(silkHours).toBeGreaterThan(linenHours());
  });

  it('⭐⭐ the house sells cocoons at the hours of rearing them — floored at one coin', () => {
    const counter = data(HOUSE + 'thing/counter.yaml').prices as Record<string, number>;
    const handWage = wage(HOUSE + 'idea/outfit.yaml', 'hand');
    const perCocoon = (s.trayHours! * handWage) / s.cocoonsPerTray!;
    expect(perCocoon).toBeLessThan(1); // the floor is doing work, and says so
    expect(counter['/trade/sericulture/thing/cocoons']).toBe(Math.max(1, Math.round(perCocoon)));
  });

  it("⭐⭐ the mill's silk bolt is the cocoons plus the reeler's hours at her wage", () => {
    const cocoonPrice = (data(HOUSE + 'thing/counter.yaml').prices as Record<string, number>)['/trade/sericulture/thing/cocoons']!;
    const reelerWage = wage(MILL + 'idea/outfit.yaml', 'reeler');
    const boltsPerWeb = 2; // a plain weave cuts two
    const perBolt = (s.cocoonsPerWeb! * cocoonPrice + (s.reel! + s.throw! + s.weave!) * reelerWage) / boltsPerWeb;
    const reeler = data(MILL + 'agent/reeler.yaml');
    const consigns = (reeler.behaviors as Array<{ brain: string; config: { defaultAsk?: number } }>).find((b) =>
      b.brain.endsWith('/consigns'),
    )!;
    console.info(`  a silk bolt: ${r2(perBolt)} (the linen bolt asks 40)\n`);
    expect(Math.abs(consigns.config.defaultAsk! - perBolt) / perBolt).toBeLessThanOrEqual(0.1);
  });
});
