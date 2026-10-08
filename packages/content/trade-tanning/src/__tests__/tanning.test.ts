/**
 * ⭐⭐ Tanning — **the clock, the two failures, and the pit as a
 * condition.**
 *
 * What these pin, in order of how expensive the mistake would be:
 *
 *  1. **A hide out of a pit does not advance.** The clock stamp is
 *     cleared on the way out, so a skin pulled on Monday and put back on
 *     Friday does not collect the four days it spent on a shelf. That is
 *     the whole difference between a clock and a timer.
 *  2. **Crowding ruins a batch with no rule of its own** — the hides
 *     divide the same water, so coverage falls and all of them slow.
 *  3. **Over-strength liquor is remembered, not forgiven.** A tanner who
 *     throws in all his bark to save time gets a hard hide, and a week in
 *     gentler liquor does not repair burnt grain.
 *  4. **The transform runs once, at the lift**, and a skin pulled early
 *     is still a green skin at partial tannage — recoverable.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Hide from '../thing/Hide';
import Tanpit from '../thing/Tanpit';
import { TANNING } from '../lib/Tanning';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

/** This pack's root, for the shipped-row assertion at the foot of the file. */
const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const RAWHIDE = '/stuff/idea/material/organic/rawhide';
const LEATHER = '/stuff/idea/material/organic/leather';
const DAY = 24 * 60 * 60;

class TestYard extends ContainerMixin(Idea) {
  static _mixinName = 'TestYardTanning';
}

let now = 1_000_000;
let yard: TestYard;

function material(path: string, name: string, tags: string[]): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.35, 'W/(m·K)'));
    return m;
  }, path) as unknown as Material;
}

/** A pit with `litres` of liquor and `barkKg` of bark, standing in the yard. */
function pit(litres: number, barkKg: number): Tanpit {
  const p = makeStuff(() => new Tanpit());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(2000, 'L'));
  if (litres > 0) {
    p.setBulkMaterial(
      'interior',
      StuffApi.findByTemplatePath(
        '/stuff/idea/material/bulk/_test/water',
      ) as unknown as Material,
    );
    p.setInteriorAmount(Quantity.of(litres, 'L'));
  }
  p.addBark(barkKg);
  p.setContentsTemperature(288);
  ContainmentApi.move(p, yard);
  return p;
}

/** A green hide of `kg`. */
function hide(kg = 25): Hide {
  const h = makeStuff(() => new Hide());
  h.setShortDescription('green hide');
  h.setMass(Quantity.of(kg, 'kg'));
  h.setMaterial(
    StuffApi.findByTemplatePath(RAWHIDE) as unknown as Material,
  );
  h.setContentsTemperature(288);
  ContainmentApi.move(h, yard);
  return h;
}

/**
 * Push the world clock forward by `days`.
 *
 * ⚠ The test now-provider is read in **milliseconds** and `getNow()`
 * scales it by the world clock's rate, so the scale is pinned to 1 in
 * `beforeEach` and this converts game days to provider milliseconds. Get
 * either half wrong and every clock assertion in the file is off by a
 * factor of twelve, silently, in the generous direction.
 */
function advance(days: number): void {
  now += days * DAY * 1000;
}

beforeEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  now = 1_000_000;
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => now);
  // One game second per real second: see `advance`.
  WorldClockApi.setScale(1);
  material(RAWHIDE, 'rawhide', ['organic', 'skin', 'rawhide', 'once-living']);
  material(LEATHER, 'leather', ['organic', 'leather', 'hide', 'flexible']);
  material('/stuff/idea/material/bulk/_test/water', 'water', ['liquid', 'water']);
  yard = makeStuff(() => new TestYard());
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  WorldClockApi._resetForTesting();
});

describe('the hide is what tans; the pit is the condition', () => {
  it('composes what a skin needs and nothing it does not', () => {
    const h = hide();
    // ⚠ NOT a Provision: a hide is not food. These four are what tanning
    // actually rests on.
    expect(MixinApi.isFresh(h)).toBe(true);
    expect(MixinApi.isWaterActive(h)).toBe(true);
    expect(MixinApi.isCrafted(h)).toBe(true);
    expect(MixinApi.isTangible(h)).toBe(true);
    // The food-only machinery is absent.
    expect(MixinApi.isComposed(h)).toBe(false);
  });

  it('⭐ a hide on the ground does not tan, and needs no guard to say so', () => {
    const h = hide();
    advance(60);
    expect(h.getTannage()).toBe(0);
    expect(h.tanReport().band).toBe('green');
  });

  it('⭐⭐ a hide in a charged pit tans through in about three weeks', () => {
    const p = pit(2000, 100); // a full charge
    const h = hide(25);
    ContainmentApi.move(h, p);
    h.reconcileTanning(); // stamps the clock, as the verb does

    advance(TANNING.FULL_DAYS / 2);
    const half = h.getTannage();
    expect(half).toBeGreaterThan(0.3);
    expect(half).toBeLessThan(1);
    expect(h.tanReport().done).toBe(false);

    advance(TANNING.FULL_DAYS / 2 + 1);
    expect(h.isTanned()).toBe(true);
    expect(h.tanReport().band).toBe('ready');
  });

  it('⚠⚠ a hide OUT of the pit does not collect the days it was away', () => {
    // The clock-versus-timer distinction, and the most expensive thing to
    // get wrong here: a tanner who pulls a skin to look at it must not be
    // rewarded with the time it spent on the bench.
    const p = pit(2000, 100);
    const h = hide(25);
    ContainmentApi.move(h, p);
    h.reconcileTanning();
    advance(5);
    const atPull = h.getTannage();

    ContainmentApi.move(h, yard);
    h.reconcileTanning();
    advance(30);
    expect(h.getTannage()).toBeCloseTo(atPull, 6);

    ContainmentApi.move(h, p);
    h.reconcileTanning();
    advance(5);
    expect(h.getTannage()).toBeGreaterThan(atPull);
  });

  it('⭐ the shipped pit is RATED for about twenty skins', () => {
    // ⚠ Worth stating as a number once, here, because it is the figure a
    // tannery is authored against and it is not obvious from the dials:
    // 2,000 L at `LITRES_PER_KG` covers 500 kg of hide, which is twenty
    // 25 kg skins at full speed. The first draft of the test below used
    // twenty and found no crowding at all — correctly, and it was the
    // test that was wrong about the dial rather than the other way round.
    const rated = (2000 / TANNING.LITRES_PER_KG) / 25;
    expect(rated).toBeCloseTo(20, 5);

    const p = pit(2000, 100);
    const batch: Hide[] = [];
    for (let i = 0; i < 20; i++) {
      const h = hide(25);
      ContainmentApi.move(h, p);
      h.reconcileTanning();
      batch.push(h);
    }
    advance(TANNING.FULL_DAYS + 1);
    for (const h of batch) expect(h.isTanned()).toBe(true);
  });

  it('⭐⭐ past that, a crowded pit tans all of them badly — no rule of its own', () => {
    // Sixty skins divide the same water, so coverage falls to a third and
    // every one of them slows by the same amount. The greedy tanner's
    // real failure, falling out of the arithmetic rather than being
    // authored anywhere — and it is the whole pit that suffers, not the
    // ones that went in last.
    const roomy = pit(2000, 100);
    const alone = hide(25);
    ContainmentApi.move(alone, roomy);
    alone.reconcileTanning();

    const crowded = pit(2000, 100);
    const packed: Hide[] = [];
    for (let i = 0; i < 60; i++) {
      const h = hide(25);
      ContainmentApi.move(h, crowded);
      h.reconcileTanning();
      packed.push(h);
    }

    advance(TANNING.FULL_DAYS);
    expect(alone.getTannage()).toBeGreaterThanOrEqual(1);
    expect(packed[0]!.getTannage()).toBeLessThan(0.5);
    // ⭐ And evenly: the first skin in is no better off than the last.
    expect(packed[0]!.getTannage()).toBeCloseTo(
      packed[59]!.getTannage(),
      6,
    );
  });

  it('⭐ a weak pit works, slowly; a water-only pit does not work at all', () => {
    const weak = pit(2000, 20); // a fifth of a charge
    const h = hide(25);
    ContainmentApi.move(h, weak);
    h.reconcileTanning();
    advance(TANNING.FULL_DAYS);
    expect(h.getTannage()).toBeGreaterThan(0);
    expect(h.getTannage()).toBeLessThan(1);
    expect(weak.pitReport().band).toBe('weak');

    const plain = pit(2000, 0);
    const g = hide(25);
    ContainmentApi.move(g, plain);
    g.reconcileTanning();
    advance(TANNING.FULL_DAYS * 3);
    expect(g.getTannage()).toBe(0);
    // ⭐ And the refusal is LEGIBLE rather than silent: the pit says why.
    expect(plain.pitReport().band).toBe('water');
  });

  it('⭐ a frozen pit stalls — the reason tanning is not a winter job', () => {
    const p = pit(2000, 100);
    p.setContentsTemperature(TANNING.FROZEN_K - 5);
    const h = hide(25);
    ContainmentApi.move(h, p);
    h.reconcileTanning();
    advance(TANNING.FULL_DAYS * 2);
    expect(h.getTannage()).toBe(0);
  });

  it('⚠⚠ left too long it goes hard, and nothing brings it back', () => {
    const p = pit(2000, 100);
    const h = hide(25);
    ContainmentApi.move(h, p);
    h.reconcileTanning();
    advance(TANNING.FULL_DAYS * 2);

    expect(h.getTannage()).toBeGreaterThan(1 + TANNING.OVERRUN_PER_BAND);
    expect(h.tanReport().band).toBe('overdone');
    expect(h.tanPenaltyBands()).toBeGreaterThan(0);
  });

  it('⚠ harsh liquor is REMEMBERED — gentler liquor does not repair it', () => {
    const harsh = pit(2000, 100 * (TANNING.HARSH_STRENGTH + 1));
    expect(harsh.pitReport().band).toBe('harsh');
    const h = hide(25);
    ContainmentApi.move(h, harsh);
    h.reconcileTanning();
    advance(2);
    // ⚠ `_tanWorst` is a raw field: read the tannage first, because that
    // is what runs the reconcile that writes it.
    h.getTannage();
    expect(h._tanWorst).toBe(1);

    // Move it to good liquor and finish it there: the memory stands.
    const good = pit(2000, 100);
    ContainmentApi.move(h, good);
    h.reconcileTanning();
    advance(TANNING.FULL_DAYS);
    h.getTannage();
    expect(h._tanWorst).toBe(1);
    expect(h.tanPenaltyBands()).toBeGreaterThan(0);
  });
});

describe('the lift is the transform, and it runs once', () => {
  it('⭐⭐ a finished hide becomes leather and loses more than half its weight', async () => {
    const p = pit(2000, 100);
    const h = hide(25);
    ContainmentApi.move(h, p);
    h.reconcileTanning();
    advance(TANNING.FULL_DAYS + 1);

    expect(await h.becomeLeather(LEATHER)).toBe(true);
    expect(h.getMaterial()?.getName()).toBe('leather');
    // Water and flesh leave: 25 kg of green skin is about 11 kg of leather.
    expect(h.getMass().rawValue()).toBeCloseTo(25 * TANNING.LEATHER_MASS_SHARE, 1);
    // ⭐ And the material it became carries the tag the tailor's jerkin
    // matches, which the green skin deliberately does not.
    expect(h.getMaterial()?.getTags()).toContain('hide');
  });

  it('⚠ pulled early it stays a green skin at partial tannage — recoverable', async () => {
    const p = pit(2000, 100);
    const h = hide(25);
    ContainmentApi.move(h, p);
    h.reconcileTanning();
    advance(3);

    expect(await h.becomeLeather(LEATHER)).toBe(false);
    expect(h.getMaterial()?.getName()).toBe('rawhide');
    expect(h.getMass().rawValue()).toBe(25);
    expect(h.getTannage()).toBeGreaterThan(0);
    expect(h.tanReport().band).toBe('barely');
  });

  it('⭐ a green skin ROTS, which is the clock the whole trade is played under', () => {
    const h = hide(25);
    expect(MixinApi.isFresh(h)).toBe(true);
    // The material's own activation energy is what makes it fast; what
    // this pins is that the class can carry the clock at all, which is
    // what `lint:perishable` gates on.
    expect(h.getMaterial()?.getSpoilActivationEnergy).toBeDefined();
  });
});

describe('the pit', () => {
  it('⭐ a hide costs the pit bark, which is what makes bark worth selling', () => {
    const p = pit(2000, 100);
    const before = p.getBarkKg();
    p.consumeBark(25 * TANNING.BARK_PER_KG_HIDE);
    expect(p.getBarkKg()).toBeLessThan(before);
    expect(before - p.getBarkKg()).toBeCloseTo(25 * TANNING.BARK_PER_KG_HIDE, 2);
  });

  it('cannot be overdrawn', () => {
    const p = pit(2000, 5);
    expect(p.consumeBark(500)).toBe(5);
    expect(p.getBarkKg()).toBe(0);
  });

  it('⭐ an empty pit says it is empty rather than silently doing nothing', () => {
    const p = pit(0, 100);
    expect(p.pitReport().band).toBe('dry');
    expect(p.tanLiquorFor(25)).toBeNull();
  });

  it('⭐⭐ it affords `tan` — a second tannery needs zero code', () => {
    expect(Tanpit.commandContributions.peers).toContain(
      'trade/tanning/cmd/tanning/tan.yaml',
    );
  });

  it('⭐⭐⭐ the SHIPPED row is charged with BOTH — bark AND the water it is in', () => {
    // ⚠⚠ The row authored `barkKg: 100` and no liquor for one build, so
    // the one working tannery in the game had a DRY pit: `liquorLitres()`
    // read an empty bulk slot, `tanLiquorFor` returned `null`, and every
    // `tan` in the realm refused `pit-dry`. **The solute without the
    // solvent** — a hundred kilos of bark in no water is not a charge,
    // and the row's own comment claimed it was.
    //
    // ⭐ It failed closed and SILENT: nothing threw, the pit described
    // itself beautifully, and the refusal was a true sentence about a
    // world nobody meant to author. A warm world that had been
    // hand-filled once hid it; the sweep's drive, on a freshly dropped
    // database, found it. A row assertion is the cheap guard, because
    // what broke was content agreeing with its own prose.
    const row = YAML.parse(
      readFileSync(
        join(PACK, 'content', 'trade', 'tanning', 'thing', 'tanpit.yaml'),
        'utf8',
      ),
    ) as { data?: Record<string, unknown> };
    const data = row.data ?? {};
    expect(data['barkKg']).toBeGreaterThan(0);
    // The liquor the bark is dissolved IN, without which the strength is
    // a ratio over zero.
    expect(data['interiorMaterial']).toBe('/stuff/idea/material/bulk/water');
    expect(data['interiorAmount']).toBe(data['interiorCapacity']);

    // ⭐ And the arithmetic the two numbers have to satisfy together: a
    // full charge is `BARK_KG_PER_LITRE × litres`, so the shipped pit
    // reads at full strength rather than merely non-dry.
    const litres = Number(data['interiorAmount']);
    const bark = Number(data['barkKg']);
    expect(bark / (litres * TANNING.BARK_KG_PER_LITRE)).toBeCloseTo(1, 2);
  });
});
