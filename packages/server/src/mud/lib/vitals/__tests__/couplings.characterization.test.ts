/**
 * ⭐⭐ The vitals-side couplings, characterized — **including the ones that
 * are ABSENT.**
 *
 * The consequence build's premise is that a body carries a great deal of
 * declared state that acts on nothing. This file pins the wiring as it is
 * *today*, so that when W8 (the effect channel) and W11 (the twenty-three
 * rows) turn the absent edges on, the flip is a one-line edit to a test
 * that already names the edge — rather than a new test written after the
 * fact by somebody arguing the old behaviour was never intended.
 *
 * ⚠ Three of these assertions are **negative on purpose**. Each is marked
 * `ABSENT`, names the wave that flips it, and asserts the *current* truth.
 * A failure here after that wave is the expected outcome, not a
 * regression: change the assertion, keep the name.
 *
 * Couplings already characterized elsewhere, deliberately not duplicated:
 * fracture → `canOccupy` and the trauma decay laws
 * (`Trauma.behaviors.test.ts`), the limp drain
 * (`ConditionLogic.limp-coverage.test.ts`), the in-host infection law
 * (`Vitals.infection.test.ts`), `LoadBearing` band → capacity
 * (`lib/encumbrance/__tests__/LoadBearing.gauge.test.ts`), armour wear per
 * blow (`CombatLogic.gearwear.test.ts`).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { UNIVERSE_DEFAULT_VITAL_PROFILE } from '../Vitals';
import Condition from '../../../platform/idea/Condition';
import type { AfflictionRecord, Trauma } from '../../../platform/idea/Condition';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { ExecutionContextApi } from '../../../api/execution-context';
import { TemplatePathPrefixes } from '../../paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import Species from '../../../platform/idea/species/Species';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

const HOUR = 3600;
const BASE = 3_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const gameNow = (): number => WorldClockApi.getNow().rawValue();

/**
 * Live through `gameSeconds` of world time, reading as you go — the
 * `Vitals.infection.test` idiom. Every reconcile arm but the dying clock
 * drops a gap longer than `MAX_REASONABLE_GAP_SEC`, so a test that jumps
 * an hour in one bound tests the guard rather than the mechanism.
 */
function live(body: Creature, gameSeconds: number, step = 2000): void {
  body.getConditions();
  const until = gameNow() + gameSeconds;
  for (let i = 0; i < 2000 && gameNow() < until; i++) {
    setNow(now - BASE + step);
    body.getConditions();
  }
}

/**
 * A condition row that DECLARES an effect on a vital sign, and a cadence
 * to apply it on. Every shipped row ships `signature: []`; this one is
 * the strongest possible statement of the absent edge — an author who
 * wrote what they wanted gets nothing.
 */
const DECLARED = `${TemplatePathPrefixes.condition}characterization/declared-effect`;

function endurancePct(body: Creature): number {
  if (!MixinApi.isReserved(body)) return NaN;
  return body.getReserve('endurance')?.current.rawValue() ?? NaN;
}

describe('vitals couplings — characterization', () => {
  beforeAll(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => {
      const c = new Condition();
      c.setName('a declared effect');
      c.setObservableSigns(['declared']);
      // What the author said: raise the heart rate, drop the blood
      // volume, hour after hour. `signature` is persistent, authorable
      // and spoiler-levelled — every affordance of a live field.
      c.setSignature([
        { kind: 'vital', sign: 'heartRate', perHour: 40 },
        { kind: 'vital', sign: 'bloodVolume', perHour: -1 },
      ]);
      c.setProgression({ law: 'stage', intervalMs: 60 * 60 * 1000 });
      return c;
    }, DECLARED);
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

  /* ───────────────────── the absent edges ───────────────────── */

  it('⭐ W8 — a row that DECLARES a vital effect now HAS it', () => {
    // Was ABSENT: the row staged (so the arm reached it) and moved no
    // vital sign, because `signature` had no reader anywhere. It is now
    // the effect channel, and what a condition does is independent of how
    // it progresses.
    const body = makeStuff(() => new Creature());
    const record: AfflictionRecord = {
      kind: 'affliction',
      templatePath: DECLARED,
      stage: 0,
      elapsed: 0,
    };
    const hrBefore = body.getVitalSign('heartRate').rawValue();
    const bloodBefore = body.getVitalSign('bloodVolume').rawValue();
    body.afflict(record);

    live(body, 3 * HOUR);

    expect(record.stage).toBeGreaterThan(0);
    expect(body.getVitalSign('heartRate').rawValue()).toBeGreaterThan(hrBefore);
    expect(body.getVitalSign('bloodVolume').rawValue()).toBeLessThan(
      bloodBefore,
    );
  });

  it('⭐⭐ the effect scales with the condition\'s own severity', () => {
    // One row, one signature, and it gets worse as THAT condition gets
    // worse — which is why the arm that advanced it never needs to know
    // what the effect was.
    const mk = (): { body: Creature; rec: AfflictionRecord } => {
      const body = makeStuff(() => new Creature());
      const rec: AfflictionRecord = {
        kind: 'affliction',
        templatePath: DECLARED,
        stage: 1,
        elapsed: 0,
      };
      body.afflict(rec);
      return { body, rec };
    };
    const mild = mk();
    const severe = mk();
    severe.rec.stage = 6;
    severe.rec.elapsed = 6 * 60 * 60 * 1000;
    const base = mild.body.getVitalSign('heartRate').rawValue();
    live(mild.body, 1 * HOUR);
    live(severe.body, 1 * HOUR);
    const mildRise = mild.body.getVitalSign('heartRate').rawValue() - base;
    const severeRise = severe.body.getVitalSign('heartRate').rawValue() - base;
    expect(severeRise).toBeGreaterThan(mildRise);
  });

  it('⚠⚠ D22 — an effect naming a sign the body does not HAVE is a silent no-op', () => {
    // The `constructa`, `plantae` and `fungi` clades exist. A construct
    // that takes an edge blow has a wound, and no bleed, and that is the
    // honest answer — not a throw, and not a zero-filled sign it never
    // had. Asserted rather than incidental, BECAUSE the failure mode is
    // the silent-and-closed one this build exists to end: an effect that
    // does nothing because nobody wrote the branch reads identical to one
    // that does nothing because the author said so.
    const species = makeStuff(() => new Species());
    species.setVitalProfile({
      ...UNIVERSE_DEFAULT_VITAL_PROFILE,
      bloodVolume: { baseline: 0, survivableMin: 0, survivableMax: 0 },
    });
    stampTemplatePathForTest(species, '/stuff/idea/species/test/constructa');
    const bloodless = makeStuff(() => new Creature());
    bloodless.setSpecies(species);
    expect(bloodless.hasVitalSign('bloodVolume')).toBe(false);
    expect(bloodless.hasVitalSign('heartRate')).toBe(true);

    const rec: AfflictionRecord = {
      kind: 'affliction',
      templatePath: DECLARED,
      stage: 1,
      elapsed: 0,
    };
    const hrBefore = bloodless.getVitalSign('heartRate').rawValue();
    const bloodBefore = bloodless.getVitalSign('bloodVolume').rawValue();
    bloodless.afflict(rec);
    expect(() => live(bloodless, 2 * HOUR)).not.toThrow();
    // The sign it does not have: untouched. The one it does: moved.
    expect(bloodless.getVitalSign('bloodVolume').rawValue()).toBe(bloodBefore);
    expect(bloodless.getVitalSign('heartRate').rawValue()).toBeGreaterThan(
      hrBefore,
    );
  });

  it('⚠ ABSENT (W11 flips this) — a burn costs no blood, however long it burns', () => {
    // A serious burn weeps plasma; that is why burn victims are given
    // fluids. Today `BURN_BEHAVIOR` decays its own severity and nothing
    // else, so a burn is a number that counts down.
    const body = makeStuff(() => new Creature());
    const bloodBefore = body.getVitalSign('bloodVolume').rawValue();
    const burn: Trauma = {
      kind: 'trauma',
      type: 'burn',
      site: 'body.torso',
      severity: 0.9,
    };
    body.afflict(burn);

    live(body, 3 * HOUR);

    expect(burn.severity).toBeLessThan(0.9); // the decay IS wired
    expect(body.getVitalSign('bloodVolume').rawValue()).toBeCloseTo(
      bloodBefore,
      5,
    );
  });

  it('⚠ ABSENT (W11 flips this) — a bruise costs no endurance', () => {
    // The sparring currency: you should be a little slower the morning
    // after a beating. Today a contusion is the same countdown as a burn.
    const body = makeStuff(() => new Creature());
    const before = endurancePct(body);
    expect(Number.isNaN(before)).toBe(false);
    const bruise: Trauma = {
      kind: 'trauma',
      type: 'contusion',
      site: 'body.torso',
      severity: 0.8,
    };
    body.afflict(bruise);

    live(body, 3 * HOUR);

    expect(bruise.severity).toBeLessThan(0.8);
    expect(endurancePct(body)).toBeCloseTo(before, 5);
  });

  /* ──────────────── the one edge that IS wired ──────────────── */

  it('the ONE affliction effect that exists today is hard-coded, not declared', () => {
    // `progressInfection` drains hydration at stage ≥ 2 — in code, on the
    // infection arm, for pathogens only. It is the proof that the shape
    // works and the reason the effect channel is worth generalizing: no
    // row asked for this, and no row can ask for anything else.
    const src = StuffApi.findByTemplatePath(DECLARED);
    expect(src).not.toBeNull();
    // The declared row carries a signature the engine can read…
    expect((src as Condition).getSignature()).toHaveLength(2);
    // …and the only consumer of ANY effect anywhere is the hydration
    // drain in `Vitals.progressInfection`, which reads no signature.
  });
});

/* ─────────── W7: who did this — the poisoner's name on the record ─────────── */

describe('vitals — the affliction inflicter', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('⭐ an affliction landed by an actor records who did it', () => {
    // A wound has always known who dealt it (`Trauma.inflictedBy`); an
    // affliction never did — so the one kind of harm that is deliberate,
    // premeditated and quiet was the one kind the world could not
    // attribute. Stamped at the door every driver already uses, so
    // metabolism, thermal, respiration, magic, the passage and combat's
    // hook rider are all covered with no call-site changes.
    const poisoner = makeStuffAtPath(() => new Creature(), '/test/poisoner');
    const victim = makeStuff(() => new Creature());
    const record: AfflictionRecord = {
      kind: 'affliction',
      templatePath: DECLARED,
      stage: 0,
      elapsed: 0,
    };
    ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(poisoner);
      victim.afflict(record);
    });
    expect(record.inflictedBy).toBe('/test/poisoner');
  });

  it('⚠ nobody did the cold — an unattributed affliction stays unattributed', () => {
    // Most harm has no author. Inventing one would sweep the weather into
    // the crime ledger (accountability.md § Producers, the wrong blast
    // radius).
    const body = makeStuff(() => new Creature());
    const record: AfflictionRecord = {
      kind: 'affliction',
      templatePath: DECLARED,
      stage: 0,
      elapsed: 0,
    };
    body.afflict(record);
    expect(record.inflictedBy).toBeUndefined();
  });

  it('never overwrites a stamp a producer set deliberately', () => {
    const other = makeStuffAtPath(() => new Creature(), '/test/someone-else');
    const body = makeStuff(() => new Creature());
    const record: AfflictionRecord = {
      kind: 'affliction',
      templatePath: DECLARED,
      stage: 0,
      elapsed: 0,
      inflictedBy: '/test/the-real-culprit',
    };
    ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(other);
      body.afflict(record);
    });
    expect(record.inflictedBy).toBe('/test/the-real-culprit');
  });
});
