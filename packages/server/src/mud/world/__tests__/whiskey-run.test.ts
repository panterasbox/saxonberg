/**
 * ⭐⭐ **The run, on the REAL rows** — Crowsfoot's still, the wash
 * schedule, the shipped materials, the shipped cask, the shipped methanol
 * condition. Nothing inline, nothing stubbed but the heat.
 *
 * The world tests above it check that the rows *say* the right things.
 * This one checks that they *do* something, which is a different claim
 * and the one that kept being false: the `distil` recipe said 351 K and
 * named the still's capability for the whole life of the pack, and no
 * still could be lit, so it had never run once.
 *
 * Two walks:
 *
 *   1. **The good cut** — charge, heat, throw the foreshots away, keep
 *      the hearts, and the bottle is `fine` and harms nobody.
 *   2. **The bad cut** — keep everything from the first drop, and the
 *      drinker is ill and the ledger names the distiller.
 *
 * ⚠ `reachableHeatK` is the one stub, and the reason is the same as in
 * the unit tests: standing a lit, fuelled burner up in-process is
 * `lib/fire`'s test to write, and it has. What is under test here is the
 * schedule rows against the condition row.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Vat from '../../platform/thing/Vat';
import MaturationProfileRef from '../../lib/maturation/MaturationProfile';
import CraftVessel from '../../platform/thing/CraftVessel';
import MaturationProfile from '../../platform/idea/maturation/MaturationProfile';
import FractionSchedule from '../../platform/idea/fractionation/FractionSchedule';
import Condition from '../../platform/idea/Condition';
import Material from '../../lib/material/Material';
import { Creature } from '../../lib/creature/Creature';
import { AdvancementMixin } from '../../lib/advancement/Advancement';
import { BulkableApi } from '../../api/bulk';
import { StuffApi } from '../../api/stuff';
import { AccountabilityApi } from '../../api/accountability';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { Grade } from '../../lib/craft/Grade';
import { TemplatePaths, TemplatePathPrefixes } from '../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../platform/idea/WorldClockRegistry';
import Still from '../../../../../content/trade-distilling/src/thing/Still';

const PACKS = fileURLToPath(new URL('../../../../../content/', import.meta.url));
const DISTILLING = join(PACKS, 'trade-distilling');
const PLATFORM = join(PACKS, 'platform');

const DISTILLER = '/platform/agent/Avatar/the-distiller';
const DRINKER = '/platform/agent/Avatar/the-drinker';

const CLOCK_SCALE = 12;
let realMs = 0;
let recorded: Array<Record<string, unknown>>;

function row(pack: string, rel: string): Record<string, unknown> {
  const raw = parse(readFileSync(join(pack, rel), 'utf8')) as {
    data: Record<string, unknown>;
  };
  return raw.data;
}

/** Stand an authored Material row up at its own path. */
function material(rel: string, path: string): Material {
  const data = row(DISTILLING, rel);
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(String(data.name));
    m.setTags((data.tags as string[]) ?? []);
    m.setEdibility(data.edibility === true);
    if (data.toxicity) {
      m.setToxicity(data.toxicity as never);
    }
    m.setNutrients((data.nutrients as string[]) ?? []);
    return m;
  }, path);
}

/** Stand the authored wash fraction schedule up. */
function washSchedule(): FractionSchedule {
  const data = row(
    DISTILLING,
    'content/trade/distilling/idea/fractionation/wash.yaml',
  );
  return makeStuffAtPath(() => {
    const s = new FractionSchedule();
    s.setKey(String(data.key));
    s.setInputCategory(String(data.inputCategory));
    s.setDiscipline(String(data.discipline));
    s.setRequiresHeatK(Number(data.requiresHeatK));
    s.setProductMaterial(String(data.productMaterial));
    s.setResidueMaterial(String(data.residueMaterial));
    s.setReadBlur(Number(data.readBlur));
    s.setGradeStretch(Number(data.gradeStretch));
    s.setFractions(data.fractions as never);
    return s;
  }, '/trade/distilling/idea/fractionation/wash');
}

/** Stand the authored methanol condition row up. */
function methanolRow(): Condition {
  const data = row(
    PLATFORM,
    'content/platform/idea/Condition/metabolism/methanol.yaml',
  );
  return makeStuffAtPath(() => {
    const c = new Condition();
    c.setName(String(data.name));
    c.setProgression(data.progression as never);
    c.setToxinBehavior(data.toxinBehavior as never);
    return c;
  }, TemplatePathPrefixes.metabolismCondition + 'methanol');
}

/** Crowsfoot's still, authored row, with the heat stubbed. */
function houseStill(chargeL: number): Still & { testHeatK: number } {
  const data = row(DISTILLING, 'content/trade/distilling/thing/still.yaml');
  const s = makeStuff(() => new Still()) as Still & { testHeatK: number };
  s.setInteriorCapacity(Quantity.of(Number(data.interiorCapacity), 'L'));
  s.setClosure('liquidTight');
  s.testHeatK = 290;
  (s as unknown as { reachableHeatK(): number }).reachableHeatK = () =>
    s.testHeatK;
  if (chargeL > 0) {
    (s as unknown as { interiorMaterial: string }).interiorMaterial =
      '/trade/distilling/idea/material/wash';
    s.setInteriorAmount(Quantity.of(chargeL, 'L'));
  }
  return s;
}

function bucket(capacityL: number): CraftVessel {
  const v = makeStuff(() => new CraftVessel());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  return v;
}

function slotOf(v: unknown) {
  return BulkableApi.slotFor(v as never, undefined)!;
}

function pour(from: unknown, to: unknown, litres: number) {
  return BulkableApi.transfer(slotOf(from), to === null ? null : slotOf(to), {
    kind: 'measure',
    litres,
    mode: 'strict',
  });
}

function graded(v: unknown): {
  getGradeBand(): string;
  setGrade(g: Grade): void;
} {
  return v as { getGradeBand(): string; setGrade(g: Grade): void };
}

/**
 * ⚠⚠ The nose has to COMPOSE `AdvancementMixin` or there is no band at
 * all: `bandFor` asks `MixinApi.isAdvancing(viewer)` first and returns
 * `untrained` for anything that is not. A bare `Creature` is not — which
 * is how the first draft of this file gave the "expert" and the
 * "untrained" distiller the identical cut and still read as two passing
 * cases until the numbers were printed.
 */
class Distiller extends AdvancementMixin(Creature) {
  static _mixinName = 'WhiskeyRunDistiller';
}

/**
 * A distiller with a named competence band — the viewer whose nose
 * decides where the cut falls. `competenceDigestCached` is the SYNC read
 * `readFraction` consults, so stubbing it is stubbing the transcript,
 * which is `lib/advancement`'s to prove and does.
 */
function noseAt(band: string, path: string): Distiller {
  const c = makeStuffAtPath(() => new Distiller(), path);
  (
    c as unknown as { competenceDigestCached(): unknown }
  ).competenceDigestCached = () => [{ discipline: 'distilling', band }];
  return c;
}

/**
 * ⭐⭐ **Cut by the READING, which is what a player does.** Draw in small
 * steps into `sink` for as long as the nose says `while`, then stop. No
 * litre count anywhere — that is the whole design, and it is also what
 * makes this test survive a retuning of the schedule.
 */
function drawWhile(
  still: Still,
  nose: Distiller,
  sink: unknown,
  whileKeys: readonly string[],
  stepL = 0.1,
): number {
  let moved = 0;
  for (let i = 0; i < 400; i++) {
    const here = still.readFraction(nose as never)?.key;
    if (here === undefined || !whileKeys.includes(here)) break;
    const res = pour(still, sink, stepL);
    if (res.applied <= 0) break;
    moved += res.applied;
  }
  return moved;
}

/**
 * Let the drinker's own clock absorb and band.
 *
 * ⚠ Six game-hours, and the number is load-bearing. Methanol absorbs at
 * 1.5 dose-units a game-minute against a clearance of 0.01 burden-units,
 * so the burden climbs by about 0.011 a minute and does not reach the
 * lowest rung of 2 for nearly three game-hours. Two hours was the first
 * draft and it read as *nobody was harmed* — which is a timing miss
 * dressed as a design claim.
 *
 * ⭐ That lateness is the condition row's whole point: the ethanol has
 * had its say and worn off before this arrives, so the morning is not a
 * hangover.
 */
function settle(c: Creature, gameSec = 21600): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const step = Math.min(600, remaining);
    realMs += (step / CLOCK_SCALE) * 1000;
    c.getReserve('endurance');
    remaining -= step;
  }
}

beforeEach(() => {
  installV1QuantityMarshallers();
  stampTemplatePathForTest(
    makeStuff(() => new WorldClockRegistry()),
    TemplatePaths.worldClockRegistry,
  );
  WorldClockApi._resetForTesting();
  realMs = 100_000;
  WorldClockApi._setNowProviderForTesting(() => realMs);
  recorded = [];
  vi.spyOn(AccountabilityApi, 'record').mockImplementation(((
    r: Record<string, unknown>,
  ) => {
    recorded.push(r);
  }) as unknown as typeof AccountabilityApi.record);

  material('content/trade/distilling/idea/material/wash.yaml',
    '/trade/distilling/idea/material/wash');
  material('content/trade/distilling/idea/material/new-make.yaml',
    '/trade/distilling/idea/material/new-make');
  material('content/trade/distilling/idea/material/stillage.yaml',
    '/trade/distilling/idea/material/stillage');
  material('content/trade/distilling/idea/material/whiskey.yaml',
    '/trade/distilling/idea/material/whiskey');
  washSchedule();
  methanolRow();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐ the run, on the shipped rows', () => {
  it('the still charges COLD and will not run until it is hot', () => {
    const still = houseStill(60);
    expect(still.getRunPhase()).toBe('charged');
    expect(slotOf(still).getMaterialPath()).toBe(
      '/trade/distilling/idea/material/wash',
    );
  });

  it('heat starts the run and the pot holds new-make', () => {
    const still = houseStill(60);
    still.testHeatK = 358;
    expect(still.getRunPhase()).toBe('running');
    expect(slotOf(still).getMaterialPath()).toBe(
      '/trade/distilling/idea/material/new-make',
    );
  });

  /** Charge, mark and light the house still. */
  function chargedStill(band = 'masterful'): Still & { testHeatK: number } {
    const still = houseStill(60);
    still.setMaker(DISTILLER);
    graded(still).setGrade(Grade.of(band));
    still.testHeatK = 358;
    return still;
  }

  function doseIn(v: unknown): number {
    return (
      slotOf(v)
        .getPayload()
        ?.dissolvedToxins?.find((t) => t.type === 'methanol')?.amount ?? 0
    );
  }

  it('⭐⭐ the EXPERT cut — throw away what the nose says to, and the bottle is fine', () => {
    const still = chargedStill();
    const expert = noseAt('expert', '/platform/agent/Avatar/the-expert');

    // ⭐ No litre counts. Pour away for as long as it reads foreshots or
    // heads, then collect while it reads hearts.
    const slops = bucket(10);
    const thrown = drawWhile(still, expert, slops, ['foreshots', 'heads']);
    expect(thrown, 'something had to go').toBeGreaterThan(0);

    const bottle = bucket(1);
    drawWhile(still, expert, bottle, ['hearts']);

    expect(graded(bottle).getGradeBand()).toBe('fine');
    expect(slotOf(bottle).getPayload()?.maker).toBe(DISTILLER);
    // Trace only — the next case is what makes "trace" mean something.
    expect(doseIn(bottle)).toBeCloseTo(40, 3);
  });

  it('⭐⭐ and nobody is harmed by it, however much of it they drink', () => {
    const still = chargedStill();
    const expert = noseAt('expert', '/platform/agent/Avatar/the-expert');
    drawWhile(still, expert, bucket(10), ['foreshots', 'heads']);
    const bottle = bucket(1);
    drawWhile(still, expert, bottle, ['hearts']);

    const drinker = makeStuffAtPath(() => new Creature(), DRINKER);
    const newMake = StuffApi.findByTemplatePath<Material>(
      '/trade/distilling/idea/material/new-make',
    )!;
    // A WHOLE BOTTLE of it, which is the requirements' own wording.
    drinker.ingest(
      newMake,
      Quantity.of(0.75, 'L'),
      'liquid',
      slotOf(bottle).getPayload() as never,
    );
    settle(drinker);

    const burden =
      (drinker as unknown as { toxinBurdens: Record<string, number> })
        .toxinBurdens['methanol'] ?? 0;
    const bands = (
      methanolRowBehavior() as { bands: { threshold: number }[] }
    ).bands;
    expect(burden).toBeLessThan(Math.min(...bands.map((b) => b.threshold)));
    expect(
      drinker.getConditions().filter((c) => c.kind === 'affliction'),
    ).toHaveLength(0);
    expect(recorded, 'a good cut names nobody').toHaveLength(0);
  });

  it('⛔⛔ the UNTRAINED cut — the SAME procedure, and the customer is poisoned', () => {
    const still = chargedStill();
    // ⭐ This is the design in one test. The untrained distiller does
    // exactly what the expert did — throw away what the nose says to,
    // collect what it calls hearts — and their nose is a fiftieth of the
    // charge behind, so they stop throwing while the heads are still
    // coming over and bottle them.
    const novice = noseAt('untrained', '/platform/agent/Avatar/the-novice');

    const slops = bucket(10);
    drawWhile(still, novice, slops, ['foreshots', 'heads']);
    const bottle = bucket(1);
    drawWhile(still, novice, bottle, ['hearts']);

    // ⚠ Not just "more than the expert's 40" — ORDERS more. A loose
    // bound here would still pass if the blur stopped working and the
    // bottle came back at 41.
    expect(doseIn(bottle), 'the heads went in the bottle').toBeGreaterThan(
      1000,
    );
    expect(graded(bottle).getGradeBand()).not.toBe('fine');

    const drinker = makeStuffAtPath(() => new Creature(), DRINKER);
    const newMake = StuffApi.findByTemplatePath<Material>(
      '/trade/distilling/idea/material/new-make',
    )!;
    drinker.ingest(
      newMake,
      Quantity.of(0.75, 'L'),
      'liquid',
      slotOf(bottle).getPayload() as never,
    );
    settle(drinker);

    // ⭐ The condition arrived, and exactly one row names the distiller —
    // who did nothing malicious at all. That is the point of attributing
    // at the band crossing rather than at the swallow: the ledger records
    // a fact about an outcome, and nothing here decides it was a crime.
    const ill = drinker
      .getConditions()
      .filter(
        (c) =>
          c.kind === 'affliction' &&
          c.templatePath ===
            TemplatePathPrefixes.metabolismCondition + 'methanol',
      );
    expect(ill).toHaveLength(1);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      kind: 'harm',
      initiator: DISTILLER,
      consented: false,
    });
  });

  it('⛔ keeping everything from the first drop is worse still', () => {
    const still = chargedStill();
    const bottle = bucket(1);
    // Straight into the bottle: on a masterful charge the foreshots run
    // to 0.3 L at 12000 mg/L and the heads to 1.8 L at 3000, so a 0.75 L
    // bottle is 0.3 of the first and 0.45 of the second. By hand:
    // (0.3 × 12000 + 0.45 × 3000) / 0.75 = (3600 + 1350) / 0.75 = 6600.
    pour(still, bottle, 0.75);
    expect(doseIn(bottle)).toBeCloseTo(6600, 3);
    // And the grade is the WORST of the span, not an average.
    expect(graded(bottle).getGradeBand()).toBe('poor');
  });

  it('the run ends in stillage, and the dregs carry none of the spirit\'s dose', () => {
    const still = houseStill(60);
    graded(still).setGrade(Grade.of('fine'));
    still.testHeatK = 358;
    // 0.23 of 60 L is 13.8 L of product; the rest is residue.
    expect(slotOf(still).available()).toBeCloseTo(13.8, 6);
    // ⚠ `available()` rather than the literal 13.8: the floor is
    // `charge × residueFraction` and the literal is not the same float, so
    // a STRICT measure for 13.8 is a shortfall and declines. That refusal
    // is honest — a player pours `--all`, or whatever the vessel will
    // give — and it is the reason the run's end is keyed on `drawnL`
    // rather than on comparing two floats that reach the floor by
    // different routes.
    pour(still, null, slotOf(still).available());
    expect(still.getRunPhase()).toBe('spent');
    expect(slotOf(still).getMaterialPath()).toBe(
      '/trade/distilling/idea/material/stillage',
    );
    expect(slotOf(still).getPayload()?.dissolvedToxins).toBeUndefined();
  });
});

describe('⭐⭐ the cask — time improves whiskey; it does not absolve a distiller', () => {
  /** Stand the authored aging profile up. */
  function agingProfile(): MaturationProfile {
    const data = row(
      DISTILLING,
      'content/trade/distilling/idea/maturation/whiskey-aging.yaml',
    );
    return makeStuffAtPath(() => {
      const p = new MaturationProfile();
      p.setKey(String(data.key));
      p.setMechanism(data.mechanism as never);
      p.setInputCategory(String(data.inputCategory));
      p.setSealedOnly(data.sealedOnly === true);
      p.setProductMaterial(String(data.productMaterial));
      p.setRatePerDay(Number(data.ratePerDay));
      p.setStallBelowK(Number(data.stallBelowK));
      p.setHappyK(Number(data.happyK));
      p.setDamageAboveK(Number(data.damageAboveK));
      // ⚠ Read from the ROW, not defaulted. A helper that stands a
      // profile up field by field goes stale silently the moment the row
      // gains one — which is how `productAtFraction` arrived and these
      // tests started asserting against a profile the world does not
      // have.
      p.productAtFraction = Number(data.productAtFraction ?? 1);
      return p;
    }, '/trade/distilling/idea/maturation/whiskey-aging');
  }

  /** The authored cask row, bunged and in a happy warehouse. */
  function cask(): Vat {
    const data = row(DISTILLING, 'content/trade/distilling/thing/cask.yaml');
    const v = makeStuff(() => new Vat());
    (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(Number(data.interiorCapacity), 'L'));
    v.lastAmbientK = 290;
    v.stampedTemperatureK = 290;
    v.setOpen(true);
    return v;
  }

  function age(v: Vat, gameDays: number): void {
    let remaining = gameDays * 86_400;
    while (remaining > 0) {
      const step = Math.min(3600, remaining);
      realMs += (step / CLOCK_SCALE) * 1000;
      v.getMaturationPhase();
      remaining -= step;
    }
  }

  it('⭐ a BAD cut casked and aged comes out as POOR whiskey carrying the same dose', () => {
    agingProfile();
    const still = houseStill(60);
    still.setMaker(DISTILLER);
    graded(still).setGrade(Grade.of('masterful'));
    still.testHeatK = 358;

    // Everything from the first drop — foreshots and heads in the barrel.
    const barrel = cask();
    pour(still, barrel, 10);
    const doseAtFill =
      slotOf(barrel).getPayload()?.dissolvedToxins?.find(
        (t) => t.type === 'methanol',
      )?.amount ?? 0;
    expect(doseAtFill, 'the premise: a poisoned fill').toBeGreaterThan(500);
    expect(graded(barrel).getGradeBand()).toBe('poor');

    // Bung it and wait. `sealedOnly` means an open cask is not working.
    barrel.setOpen(false);
    // ⚠ 100 game-days, not 60. The styles build halved `ratePerDay`
    // (0.022 -> 0.011) so that `productAtFraction: 0.25` opens a real
    // window — drawable at ~23 days, finished at ~91 — instead of the
    // whole arc passing in a fortnight. This test's claim is about the
    // END state, so it waits for the end.
    age(barrel, 100);

    expect(barrel.getMaturationPhase()).toBe('finished');
    // ⭐ It IS whiskey now — the material swapped.
    expect(slotOf(barrel).getMaterialPath()).toBe(
      '/trade/distilling/idea/material/whiskey',
    );
    // ⭐⭐ And it is POOR whiskey, however perfect the warehouse: the cut's
    // grade is the ceiling. No amount of oak launders a bad cut.
    expect(graded(barrel).getGradeBand()).toBe('poor');
    // ⭐⭐ And the dose is UNCHANGED. Methanol does not age out; the
    // payload survives the product swap (`setBulkMaterial` keeps it when
    // the new path is non-null), which is the whole reason the harm
    // follows the bottle rather than the still.
    const doseAfter =
      slotOf(barrel).getPayload()?.dissolvedToxins?.find(
        (t) => t.type === 'methanol',
      )?.amount ?? 0;
    expect(doseAfter).toBeCloseTo(doseAtFill, 6);
  });

  it('⭐ a good cut casked and aged comes out as whiskey a bar would buy', () => {
    agingProfile();
    const still = houseStill(60);
    still.setMaker(DISTILLER);
    graded(still).setGrade(Grade.of('masterful'));
    still.testHeatK = 358;
    const expert = noseAt('expert', '/platform/agent/Avatar/the-expert');
    drawWhile(still, expert, bucket(10), ['foreshots', 'heads']);

    const barrel = cask();
    // ⭐⭐ **A careful distiller leaves a margin, and the system requires
    // it.** `drawWhile` checks the reading BEFORE each pour, so the step
    // that finally reads `tails` has already crossed — and the grade is
    // weakest-link over the span, so a hair of tails drags nine litres of
    // hearts down to `poor`. That is not a bug; it is AC5 and drive step
    // 7 (*keep pouring past the hearts and the grade in the bottle
    // falls*), and the only way to a `fine` cask is to stop short.
    //
    // ⚠ Which also means `drawWhile`'s shape — pour until the nose says
    // otherwise — is the NOVICE's procedure, and it costs a grade band
    // even at `expert`. The expert's edge is knowing to leave some
    // behind. Eight of the nine litres of hearts is that margin.
    pour(still, barrel, 8);
    expect(graded(barrel).getGradeBand()).toBe('fine');

    barrel.setOpen(false);
    age(barrel, 100);

    expect(slotOf(barrel).getMaterialPath()).toBe(
      '/trade/distilling/idea/material/whiskey',
    );
    expect(graded(barrel).getGradeBand()).toBe('fine');
    // ⭐ And the interior answers to the tag the Lounge's par line wants,
    // which is what closes the sale with no new code: the bar asks for
    // `category: whiskey` and a material tag is what that means.
    const whiskey = StuffApi.findByTemplatePath<Material>(
      '/trade/distilling/idea/material/whiskey',
    )!;
    expect(whiskey.hasTag('whiskey')).toBe(true);
  });

  it('⚠ an OPEN cask does nothing — `sealedOnly` means bunged', () => {
    agingProfile();
    const still = houseStill(60);
    graded(still).setGrade(Grade.of('masterful'));
    still.testHeatK = 358;
    const barrel = cask();
    pour(still, barrel, 5);
    // Left open on purpose.
    age(barrel, 100);
    expect(slotOf(barrel).getMaterialPath()).toBe(
      '/trade/distilling/idea/material/new-make',
    );
  });
});

function methanolRowBehavior(): unknown {
  return row(
    PLATFORM,
    'content/platform/idea/Condition/metabolism/methanol.yaml',
  ).toxinBehavior;
}

/**
 * ⭐⭐ The GRAIN line — the second cereal, run on its own shipped rows.
 *
 * Malt whisky and grain whisky are different products because they start
 * from different grain, and every difference between them is in rows:
 * four materials, a mash, a ferment profile, a cut schedule and a cask
 * profile. No code anywhere knows there are two kinds of whisky.
 */
describe('⭐ grain whisky — a second line, in rows only', () => {
  function grainSchedule(): FractionSchedule {
    const data = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/grain-wash.yaml',
    );
    return makeStuffAtPath(() => {
      const s = new FractionSchedule();
      s.setKey(String(data.key));
      s.setInputCategory(String(data.inputCategory));
      s.setDiscipline(String(data.discipline));
      s.setRequiresHeatK(Number(data.requiresHeatK));
      s.setProductMaterial(String(data.productMaterial));
      s.setResidueMaterial(String(data.residueMaterial));
      s.setReadBlur(Number(data.readBlur));
      s.setGradeStretch(Number(data.gradeStretch));
      s.setFractions(data.fractions as never);
      return s;
    }, '/trade/distilling/idea/fractionation/grain-wash');
  }

  function grainStill(chargeL: number): Still & { testHeatK: number } {
    const data = row(DISTILLING, 'content/trade/distilling/thing/still.yaml');
    const s = makeStuff(() => new Still()) as Still & { testHeatK: number };
    s.setInteriorCapacity(Quantity.of(Number(data.interiorCapacity), 'L'));
    s.setClosure('liquidTight');
    s.testHeatK = 290;
    (s as unknown as { reachableHeatK(): number }).reachableHeatK = () =>
      s.testHeatK;
    (s as unknown as { interiorMaterial: string }).interiorMaterial =
      '/trade/distilling/idea/material/grain-wash';
    s.setInteriorAmount(Quantity.of(chargeL, 'L'));
    return s;
  }

  beforeEach(() => {
    for (const leaf of [
      'grain-distillers-wort',
      'grain-wash',
      'grain-new-make',
      'grain-whisky',
    ]) {
      material(
        `content/trade/distilling/idea/material/${leaf}.yaml`,
        `/trade/distilling/idea/material/${leaf}`,
      );
    }
    grainSchedule();
  });

  it('a grain wash charges the still and runs to GRAIN spirit', () => {
    const still = grainStill(60);
    expect(still.getRunPhase()).toBe('charged');
    still.testHeatK = 358;
    expect(still.getRunPhase()).toBe('running');
    expect(slotOf(still).getMaterialPath()).toBe(
      '/trade/distilling/idea/material/grain-new-make',
    );
  });

  it('⭐⭐ gives up MORE of the charge than the malt run — the economics', () => {
    // Not a price and not an assertion: the grain schedule's head is
    // half as long and its hearts run further, so a grain run yields
    // more saleable spirit per charge. That is the entire case for grain
    // whisky and it is four numbers in a row file.
    const malt = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/wash.yaml',
    ).fractions as { key: string; upTo: number }[];
    const grain = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/grain-wash.yaml',
    ).fractions as { key: string; upTo: number }[];
    const span = (f: typeof malt, key: string) => {
      const i = f.findIndex((x) => x.key === key);
      return f[i]!.upTo - (i > 0 ? f[i - 1]!.upTo : 0);
    };
    expect(span(grain, 'hearts')).toBeGreaterThan(span(malt, 'hearts'));
    expect(span(grain, 'heads')).toBeLessThan(span(malt, 'heads'));
  });

  it('is cleaner at every stage — wheat carries less pectin', () => {
    const doseOf = (f: Record<string, unknown>[], key: string) =>
      (
        (f.find((x) => x.key === key)?.toxins ?? []) as {
          type: string;
          amount: number;
        }[]
      ).find((t) => t.type === 'methanol')?.amount ?? 0;
    const malt = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/wash.yaml',
    ).fractions as Record<string, unknown>[];
    const grain = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/grain-wash.yaml',
    ).fractions as Record<string, unknown>[];
    for (const key of ['foreshots', 'heads', 'hearts']) {
      expect(doseOf(grain, key), key).toBeLessThan(doseOf(malt, key));
    }
  });

  it('⚠ the grain hearts still harm NOBODY — the safety sentence holds', () => {
    // The requirements sentence the malt line was calibrated to: *a
    // well-cut bottle harms nobody however much of it they drink.* A
    // cheaper, easier spirit must not be a safer-looking trap.
    const grain = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/grain-wash.yaml',
    ).fractions as Record<string, unknown>[];
    const hearts = (
      (grain.find((x) => x.key === 'hearts')!.toxins ?? []) as {
        type: string;
        amount: number;
      }[]
    ).find((t) => t.type === 'methanol')!.amount;
    // A whole 0.75 L bottle on a 70 kg body, against methanol's lowest
    // band of 2: 25 mg/L × 0.75 = 18.75 mg ⇒ a burden of 0.27.
    expect((hearts * 0.75) / 70).toBeLessThan(2);
  });

  it('⚠ does NOT carry an aroma it has no reason to carry', () => {
    // `aromaticCarry` is flat at 1 across the grain schedule, because
    // unpeated wheat carries nothing to redistribute. Authoring a late
    // carry here would assert a chemistry that is not in the charge.
    const grain = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/grain-wash.yaml',
    ).fractions as { aromaticCarry?: number }[];
    for (const f of grain) {
      expect(f.aromaticCarry ?? 1).toBe(1);
    }
  });
});

/**
 * ⚠⚠ **The double-match guard, over the WHOLE content tree.**
 *
 * `MaturationProfile.forMaterial` and `FractionSchedule.forMaterial` both
 * match on the charge material's TAGS, and both resolve a double match
 * by taking the lowest key — a silent wrong answer rather than an error.
 * So a tag may belong to at most one matcher of a given kind, and the
 * whole grain line depends on it: `grain-wash` must not carry `wash`,
 * `grain-new-make` must not carry `new-make`, `grain-distillers-wort`
 * must not carry `distillers-wort`.
 *
 * ⭐ This scans every shipped row rather than the four this build added,
 * because the next trade to add a second line of anything will hit the
 * same wall and ought to hit it here.
 */
describe('⚠⚠ no material matches two profiles or two schedules', () => {
  function allRows(infix: string): { key: string; inputCategory: string }[] {
    const out: { key: string; inputCategory: string }[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules') walk(full);
          continue;
        }
        if (!entry.name.endsWith('.yaml')) continue;
        if (!full.includes(infix)) continue;
        const data = (
          parse(readFileSync(full, 'utf8')) as {
            data?: Record<string, unknown>;
          }
        ).data;
        if (!data?.key || !data?.inputCategory) continue;
        out.push({
          key: String(data.key),
          inputCategory: String(data.inputCategory),
        });
      }
    };
    walk(PACKS);
    return out;
  }

  for (const [what, infix] of [
    ['maturation profile', '/idea/maturation/'],
    ['fractionation schedule', '/idea/fractionation/'],
  ] as const) {
    it(`no tag is claimed by two ${what} rows`, () => {
      const rows = allRows(infix);
      expect(rows.length, `found no ${what} rows at all`).toBeGreaterThan(1);
      const byTag = new Map<string, string[]>();
      for (const r of rows) {
        byTag.set(r.inputCategory, [
          ...(byTag.get(r.inputCategory) ?? []),
          r.key,
        ]);
      }
      const clashes = [...byTag.entries()].filter(([, keys]) => keys.length > 1);
      expect(
        clashes.map(([tag, keys]) => `${tag} ← ${keys.join(', ')}`),
      ).toEqual([]);
    });
  }

  it('⭐ and the grain line shares no tag with the malt line', () => {
    const tagsOf = (leaf: string) =>
      (row(
        DISTILLING,
        `content/trade/distilling/idea/material/${leaf}.yaml`,
      ).tags ?? []) as string[];
    expect(tagsOf('grain-distillers-wort')).not.toContain('distillers-wort');
    expect(tagsOf('grain-wash')).not.toContain('wash');
    expect(tagsOf('grain-new-make')).not.toContain('new-make');
    // ⭐ But it DOES share `whiskey`, deliberately: that is what the bar
    // buys and the sour takes. The shared tag is the market; the distinct
    // ones are the process.
    expect(tagsOf('grain-whisky')).toContain('whiskey');
    expect(tagsOf('grain-whisky')).not.toContain('malt-whisky');
  });
});

/**
 * ⭐⭐ VATTING — the blend, and the join that makes it mean something.
 *
 * The arithmetic (the fold, the dilution, the min-age) is proved on the
 * engine in `CraftingLogic.blend-payload.test.ts`. What is proved HERE is
 * that the shipped rows actually wire up — the reachability half, which
 * is the half that fails closed and silent.
 */
describe('⭐⭐ vatting — the blend requires both lines', () => {
  const tagsOf = (leaf: string) =>
    (row(DISTILLING, `content/trade/distilling/idea/material/${leaf}.yaml`)
      .tags ?? []) as string[];

  function vatRecipe(): Record<string, unknown> {
    return parse(
      readFileSync(
        join(DISTILLING, 'content', 'recipes', 'vat-whisky.yaml'),
        'utf8',
      ),
    ) as Record<string, unknown>;
  }

  it('⭐⭐ the malt slot accepts MALT and refuses GRAIN', () => {
    // The constraint that stops a blender faking a blend out of the
    // cheap half alone. A slot matches material TAGS, so this is the
    // whole of the mechanism.
    const slots = vatRecipe().inputSlots as { slot: string; category: string }[];
    const maltSlot = slots.find((s) => s.slot === 'malt')!;
    expect(tagsOf('whiskey'), 'malt whisky must satisfy the malt slot')
      .toContain(maltSlot.category);
    expect(tagsOf('grain-whisky'), 'grain whisky must NOT satisfy it')
      .not.toContain(maltSlot.category);
  });

  it('the grain slot accepts GRAIN and refuses MALT', () => {
    const slots = vatRecipe().inputSlots as { slot: string; category: string }[];
    const grainSlot = slots.find((s) => s.slot === 'grain')!;
    expect(tagsOf('grain-whisky')).toContain(grainSlot.category);
    expect(tagsOf('whiskey')).not.toContain(grainSlot.category);
  });

  it('⭐ the blend is something the BAR will buy', () => {
    // The shared `whiskey` tag is the market. Without it the blend is a
    // product with no customer, which is the commonest way a content
    // chain dead-ends one row before the end.
    expect(tagsOf('blended-whisky')).toContain('whiskey');
    const sour = parse(
      readFileSync(
        join(PACKS, 'trade-hospitality', 'content', 'recipes', 'whiskey-sour.yaml'),
        'utf8',
      ),
    ) as { inputSlots: { category: string; minGrade?: string }[] };
    const spiritSlot = sour.inputSlots.find((s) =>
      tagsOf('blended-whisky').includes(s.category),
    );
    expect(spiritSlot, 'the sour will not take a blend').toBeDefined();
    // ⭐⭐ And the GRADE is what gates it, which is what makes stretching
    // a real decision rather than free money: three litres of `fair` is
    // three litres the bar buys; three litres of `poor` is none.
    expect(spiritSlot!.minGrade).toBe('fair');
  });

  it('⚠ a blend cannot be vatted back in as the malt half', () => {
    // True, and it is also what stops the recipe eating its own output.
    const slots = vatRecipe().inputSlots as { category: string }[];
    for (const s of slots) {
      expect(tagsOf('blended-whisky')).not.toContain(s.category);
    }
  });

  it('⚠ it is on the board, and the seat can make it', () => {
    const book = row(
      DISTILLING,
      'content/trade/distilling/thing/still-book.yaml',
    );
    expect(book.offeredRecipes as string[]).toContain('vat-whisky');
    // `standard`, and the hand claims `distilling: proficient` — which is
    // what licenses standard work. No `blending` discipline: a
    // distillery vats its own, and it is the same judgement.
    expect(String(vatRecipe().discipline)).toBe('distilling');
    expect(String(vatRecipe().difficulty)).toBe('standard');
  });
});
