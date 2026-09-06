/**
 * ⭐⭐ The in-host arm — an affliction that carries a live POPULATION.
 *
 * The distinction this file exists to pin: a toxin is an amount you carry
 * and clear, an infection is a thing that grows in you against how well
 * you are holding up. And it does not announce itself at the table —
 * illness arrives hours after the meal, which is what forces a player to
 * reason backwards to what they DID rather than forwards from what they
 * feel.
 *
 * Also here: the `ProgressionSpec` fill. It shipped with the comment "no
 * live scheduler is built here", was authored by three rows, and was read
 * by nothing — so a body three days into starvation staged identically to
 * one that had missed lunch.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Condition from '../../../platform/idea/Condition';
import type { AfflictionRecord } from '../../../platform/idea/Condition';
import type { PathogenBehavior } from '../../material/Contaminable';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePathPrefixes } from '../../paths';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

const HOUR = 3600;
const BASE = 2_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

/**
 * ⚠ **Game-time is not the provider's time**, and this file is where that
 * bites. The world clock RE-ANCHORS and applies its scale, so the number
 * the test feeds the provider and the number `getNow()` returns are
 * related by an offset and a factor — fine for every test that only
 * compares deltas, and wrong the moment something (an incubation) is an
 * ABSOLUTE game-time. So durations here are read off the clock itself.
 */
const gameNow = (): number => WorldClockApi.getNow().rawValue();

/**
 * Live through `gameSeconds` of world time, reading as you go.
 *
 * ⚠ Not a convenience — it is what being in the world looks like. Every
 * reconcile arm but the dying clock DROPS a gap longer than
 * `MAX_REASONABLE_GAP_SEC`, because absence must never cost a player
 * anything, so a test that jumps a day in one bound is testing the guard
 * rather than the mechanism.
 */
function live(body: Creature, gameSeconds: number, step = 2000): void {
  body.getConditions();
  const until = gameNow() + gameSeconds;
  for (let i = 0; i < 2000 && gameNow() < until; i++) {
    setNow(now - BASE + step);
    body.getConditions();
  }
}

const BUG: PathogenBehavior = {
  reach: 'infect',
  muMaxPerHour: 0.9,
  activationEnergy: 90000,
  referenceK: 303,
  minGrowthK: 280,
  killK: 331,
  killRatePerHour: 8,
  killActivationEnergy: 200000,
  awFloor: 0.94,
  inoculum: 0.03,
  infectiousDose: 0.02,
  channels: [],
  inHostPerHour: 0.6,
  incubationSec: 6 * HOUR,
};

const PATH = `${TemplatePathPrefixes.pathogenCondition}infection-test-bug`;

function infected(load: number, incubationGameSec: number): {
  body: Creature;
  record: AfflictionRecord;
} {
  const body = makeStuff(() => new Creature());
  const record: AfflictionRecord = {
    kind: 'affliction',
    templatePath: PATH,
    stage: 0,
    elapsed: 0,
    pathogenLoad: load,
    symptomsAt: gameNow() + incubationGameSec,
  };
  body.afflict(record);
  return { body, record };
}

describe('VitalsMixin — the in-host infection arm', () => {
  beforeAll(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => {
      const c = new Condition();
      c.setName('test bug');
      c.setObservableSigns(['feverish', 'cramping']);
      c.setPathogenBehavior(BUG);
      return c;
    }, PATH);
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

  it('⭐ the population GROWS in the host', () => {
    const { body, record } = infected(0.05, 0);
    live(body, 4 * HOUR);
    expect(record.pathogenLoad!).toBeGreaterThan(0.05);
  });

  it('⭐⭐ …and NOTHING shows until the incubation is up', () => {
    // Illness arrives hours after the meal, not at the table. The whole
    // pedagogy depends on it: the information is in what you DID.
    const { body, record } = infected(0.2, 6 * HOUR);
    live(body, 2 * HOUR);
    expect(record.stage).toBe(0);
    live(body, 6 * HOUR);
    expect(record.stage).toBeGreaterThan(0);
  });

  it('⭐ D12 — a healthy body clears it faster than a failing one', () => {
    // Resistance is THIN: one read of how the body is doing at all. No
    // immune memory, no exposure history, no per-pathogen resistance.
    const weakBug: PathogenBehavior = { ...BUG, inHostPerHour: 0.05 };
    const weakPath = `${TemplatePathPrefixes.pathogenCondition}infection-test-weak`;
    if (!StuffApi.findByTemplatePath(weakPath)) {
      makeStuffAtPath(() => {
        const c = new Condition();
        c.setName('weak bug');
        c.setPathogenBehavior(weakBug);
        return c;
      }, weakPath);
    }

    const mk = (): { body: Creature; rec: AfflictionRecord } => {
      const body = makeStuff(() => new Creature());
      const rec: AfflictionRecord = {
        kind: 'affliction',
        templatePath: weakPath,
        stage: 1,
        elapsed: 0,
        pathogenLoad: 0.5,
        symptomsAt: gameNow(),
      };
      body.afflict(rec);
      return { body, rec };
    };

    const healthy = mk();
    const hurt = mk();
    // ⚠ Blood loss, not a wound: a fracture HEALS over the span this test
    // walks, so by the time the infection arm read the band the body was
    // whole again and the two runs came out byte-identical. The first cut
    // of this test asserted a difference that the trauma arm had already
    // erased two lines earlier — a real ordering subtlety, worth the
    // comment.
    hurt.body.setVitalSign(
      'bloodVolume',
      Quantity.of(
        hurt.body.getVitalBand('bloodVolume').baseline * 0.7,
        'L',
      ),
    );
    expect(hurt.body.getConditionBand()).not.toBe('healthy');

    live(healthy.body, 4 * HOUR);
    live(hurt.body, 4 * HOUR);
    expect(healthy.rec.pathogenLoad!).toBeLessThan(hurt.rec.pathogenLoad!);
  });

  it('a body that wins is RELIEVED of the record entirely', () => {
    const gonePath = `${TemplatePathPrefixes.pathogenCondition}infection-test-gone`;
    makeStuffAtPath(() => {
      const c = new Condition();
      c.setName('feeble bug');
      c.setPathogenBehavior({ ...BUG, inHostPerHour: 0 });
      return c;
    }, gonePath);
    const body = makeStuff(() => new Creature());
    body.afflict({
      kind: 'affliction',
      templatePath: gonePath,
      stage: 1,
      elapsed: 0,
      pathogenLoad: 0.4,
      symptomsAt: gameNow(),
    });
    live(body, 40 * HOUR);
    expect(
      body.getConditions().filter((c) => c.kind === 'affliction'),
    ).toHaveLength(0);
  });

  it('⚠ absence never costs you — the far-past gap integrates nothing', () => {
    // Parity with every other arm but the dying clock. Being away is not a
    // way to get sicker.
    const { body, record } = infected(0.2, 0);
    body.getConditions();
    setNow(4000 * HOUR); // one enormous bound — the guard's whole purpose
    body.getConditions();
    expect(record.pathogenLoad!).toBeCloseTo(0.2, 6);
  });

  // ---- the ProgressionSpec fill ----

  it('⭐ an authored `progression` cadence finally MOVES the stage', () => {
    const path = '/platform/idea/Condition/metabolism/progression-test';
    makeStuffAtPath(() => {
      const c = new Condition();
      c.setName('slow thing');
      c.setProgression({ intervalMs: 3_600_000 });
      return c;
    }, path);
    const body = makeStuff(() => new Creature());
    const rec: AfflictionRecord = {
      kind: 'affliction',
      templatePath: path,
      stage: 0,
      elapsed: 0,
    };
    body.afflict(rec);
    live(body, 4 * HOUR, 1000);
    expect(rec.stage).toBe(4);
  });

  it('⚠ …and a TOXIN row is left alone — its stage is a live band', () => {
    // A dwell counter fighting the burden read would make the answer
    // depend on which arm ran last.
    const path = '/platform/idea/Condition/metabolism/toxin-progression-test';
    makeStuffAtPath(() => {
      const c = new Condition();
      c.setName('a burden');
      c.setProgression({ intervalMs: 3_600_000 });
      c.setToxinBehavior({
        toxinType: 'toxin-progression-test',
        absorptionRate: 1,
        clearanceRate: 0.01,
        potency: 1,
        bands: [{ threshold: 1, severity: 1 }],
      });
      return c;
    }, path);
    const body = makeStuff(() => new Creature());
    const rec: AfflictionRecord = {
      kind: 'affliction',
      templatePath: path,
      stage: 2,
      elapsed: 0,
    };
    body.afflict(rec);
    live(body, 10 * HOUR);
    expect(rec.stage).toBe(2);
  });
});
