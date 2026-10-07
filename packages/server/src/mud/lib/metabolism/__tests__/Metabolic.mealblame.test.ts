/**
 * `noteMealAccountability` — ⭐⭐ **the bad-meal harm row, driven for the
 * first time.**
 *
 * `accountability.md` § *Producers* documents this as shipped: one
 * `harm` row appended at ingest when a payload carries a `maker` and the
 * maker is somebody else — *"eating your own risky food is a private
 * gamble; putting it in front of a paying customer is a choice about
 * another person, and the ledger is what makes the two different acts."*
 *
 * ⚠⚠ **Nothing in the suite had ever walked that path**, which is
 * exactly why a hole in it went unnoticed for as long as it did: the
 * `order` craft path minted bulk output with **no payload at all**, so
 * the maker never reached the ledger and harm from something you were
 * served was indistinguishable from harm you did to yourself. The fix is
 * in `CraftingLogic.applyBulkOutput`; this file is the other half —
 * proof that the row fires, and fires only for a stranger's hand.
 *
 * ⭐ Scope, deliberately: the claim under test is **attribution**, not
 * pathogen biology. So `pathogenBehaviorOf` is stubbed to a known
 * infective organism and the assertion is taken at the ledger boundary.
 * Pathogen growth is `Vitals.infection`'s to prove and does.
 *
 * ⭐⭐ **The whiskey build closed the finding this file recorded.** It used
 * to end with: *"`noteMealAccountability` is called from inside the
 * PATHOGEN loop, so a toxin dose writes no row at all."* It does now —
 * `noteConsumptionHarm` is one function with two call moments, and the
 * second half of this file is the chemical arm. The two differ in exactly
 * one way and it is the moment: a pathogen row goes at the infection, a
 * toxin row at the **first band crossing**, because a trace dose is not
 * harm and attributing at the swallow would make every honest distiller a
 * poisoner for selling good whiskey.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { MaterialApi } from '../../../api/material';
import { AccountabilityApi } from '../../../api/accountability';
import Condition from '../../../platform/idea/Condition';
import { TemplatePathPrefixes } from '../../paths';
import { WorldClockApi } from '../../../api/worldclock';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { TemplatePaths } from '../../paths';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const COOK = '/platform/agent/Avatar/the-cook';
const BUG = 'salmonella';
const EATER = '/platform/agent/Avatar/the-drinker';

/**
 * ⚠ The eater needs a durable IDENTITY or the row never fires: the guard
 * is `if (!victimId || victimId === maker) return`, and `partyIdOf`
 * falls back to the template path. A bare `makeStuff` Creature has
 * none, which reads as "no row" for the wrong reason — the first draft
 * of this file asserted a passing-looking zero on exactly that.
 */
function eaterAt(path = EATER): Creature {
  return makeStuffAtPath(() => new Creature(), path);
}

function drink(name: string): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName(name);
    m.setNutrients(['water']);
    m.setEdibility(true);
    return m;
  }) as unknown as Material;
}

/** Rows the ledger was asked to record. */
let recorded: Array<Record<string, unknown>>;

beforeEach(() => {
  installV1QuantityMarshallers();
  // ⚠⚠ The body's clock reads `null` — *metabolism idle* — unless the
  // WorldClockRegistry **Stuff** is registered, and `StuffApi.clearAll()`
  // in the teardown removes it. Minting it per test is what makes the
  // toxin half of this file able to FAIL: without it every burden stayed
  // at 0 and "no harm row" passed for the wrong reason.
  stampTemplatePathForTest(
    makeStuff(() => new WorldClockRegistry()),
    TemplatePaths.worldClockRegistry,
  );
  WorldClockApi._resetForTesting();
  realMs = 100000;
  WorldClockApi._setNowProviderForTesting(() => realMs);
  recorded = [];
  // The organism: infective, and a dose well under what the meal carries.
  vi.spyOn(MaterialApi, 'pathogenBehaviorOf').mockReturnValue({
    reach: 'infect',
    infectiousDose: 0.1,
    incubationSec: 0,
  } as unknown as ReturnType<typeof MaterialApi.pathogenBehaviorOf>);
  // The boundary the claim is taken at.
  vi.spyOn(AccountabilityApi, 'record').mockImplementation(((
    row: Record<string, unknown>,
  ) => {
    recorded.push(row);
  }) as unknown as typeof AccountabilityApi.record);
});

afterEach(() => {
  vi.restoreAllMocks();
  // ⚠ `clearAll` removes the WorldClockRegistry Stuff, and
  // `metabolicNowSeconds` returns null — metabolism simply idle — when
  // it is missing. So the clock is reset AFTER the wipe, in beforeEach,
  // which re-mints it. Resetting first left every body's clock stamp at
  // 0 and the toxin burden at 0, which reads as "no harm" rather than as
  // "no clock": a vacuous pass.
  StuffApi.clearAll();
});

describe('the bad meal names the hand that made it', () => {
  it('⭐⭐ a contaminated drink made by SOMEBODY ELSE appends one harm row', () => {
    const eater = eaterAt();
    eater.ingest(drink('cloudy juice'), Quantity.of(0.2, 'L'), 'liquid', {
      pathogens: { [BUG]: 0.5 },
      maker: COOK,
    } as never);

    expect(recorded, 'exactly one row per bad meal').toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      kind: 'harm',
      initiator: COOK,
      consented: false,
    });
  });

  it('⛔ and the SAME drink made by your own hand appends none', () => {
    const eater = eaterAt();
    // The maker IS the victim: a private gamble, not an act against
    // another person.
    const own = EATER;
    eater.ingest(drink('cloudy juice'), Quantity.of(0.2, 'L'), 'liquid', {
      pathogens: { [BUG]: 0.5 },
      maker: own,
    } as never);

    expect(recorded, 'no row against yourself').toHaveLength(0);
  });

  it('⚠ an UNMARKED batch appends none — which is what the craft bug produced', () => {
    // Before the `applyBulkOutput` fix every ordered bulk product looked
    // like this: contaminated, harmful, and naming nobody.
    const eater = eaterAt();
    eater.ingest(drink('cloudy juice'), Quantity.of(0.2, 'L'), 'liquid', {
      pathogens: { [BUG]: 0.5 },
    } as never);

    expect(recorded).toHaveLength(0);
  });
});

/**
 * The chemical arm. A methanol-style toxin is seeded as a `Condition`
 * row at the path `reconcileToxinConditions` reads, so the band ladder
 * under test is the one the shipped rows use.
 */
const TOXIN = 'test-methanol';

function seedToxinRow(): void {
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName('test methanol poisoning');
    c.setProgression({ law: 'burden' });
    c.setToxinBehavior({
      toxinType: TOXIN,
      absorptionRate: 1000,
      clearanceRate: 0.01,
      potency: 1,
      bands: [{ threshold: 2, severity: 1 }],
    });
    return c;
  }, TemplatePathPrefixes.metabolismCondition + TOXIN);
}

/**
 * Drive the body's own clock far enough that the pool absorbs and the
 * bands are read — through `getReserve`, which is what any real read
 * does. ⚠ Deliberately NOT by calling the protected absorb/reconcile
 * pair: those are proxy-blocked from outside, and reaching past the
 * proxy would prove the arithmetic rather than the path.
 */
const CLOCK_SCALE = 12;
let realMs = 0;

function settle(c: Creature, gameSec = 3600): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const step = Math.min(600, remaining);
    realMs += (step / CLOCK_SCALE) * 1000;
    c.getReserve('endurance');
    remaining -= step;
  }
}

describe('the bad BOTTLE names the hand that cut it', () => {
  it('⭐⭐ one harm row at the first band crossing, and not before', () => {
    seedToxinRow();
    const eater = eaterAt();
    // 1000 mg/L across 0.75 L on a reference body: a burden well past the
    // lowest rung once absorbed.
    eater.ingest(drink('rough spirit'), Quantity.of(0.75, 'L'), 'liquid', {
      dissolvedToxins: [{ type: TOXIN, amount: 1000 }],
      maker: COOK,
    } as never);

    // ⚠ The swallow alone writes nothing — that is the decision, not an
    // accident of ordering. Attributing at ingest would name a maker for
    // every trace dose in a perfectly good bottle.
    expect(recorded, 'the swallow is not the harm').toHaveLength(0);

    settle(eater);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      kind: 'harm',
      initiator: COOK,
      consented: false,
    });
  });

  it('⛔ a trace dose under the lowest band names nobody, however much you drink', () => {
    seedToxinRow();
    const eater = eaterAt();
    // The well-cut bottle: 40 mg/L × 0.75 L = 30 mg ⇒ burden ≈ 0.43.
    eater.ingest(drink('good whiskey'), Quantity.of(0.75, 'L'), 'liquid', {
      dissolvedToxins: [{ type: TOXIN, amount: 40 }],
      maker: COOK,
    } as never);
    settle(eater);

    expect(recorded, 'a good cut harms nobody').toHaveLength(0);
  });

  it('⛔ and your own bad cut names nobody either', () => {
    seedToxinRow();
    const eater = eaterAt();
    eater.ingest(drink('rough spirit'), Quantity.of(0.75, 'L'), 'liquid', {
      dissolvedToxins: [{ type: TOXIN, amount: 1000 }],
      maker: EATER,
    } as never);
    settle(eater);

    expect(recorded, 'a private gamble').toHaveLength(0);
  });

  it('⚠ an unmarked bottle names nobody — the dose is real, the hand is not recorded', () => {
    seedToxinRow();
    const eater = eaterAt();
    eater.ingest(drink('rough spirit'), Quantity.of(0.75, 'L'), 'liquid', {
      dissolvedToxins: [{ type: TOXIN, amount: 1000 }],
    } as never);
    settle(eater);

    expect(recorded).toHaveLength(0);
    // But the body IS ill: the harm is not conditional on attribution.
    expect(
      (eater as unknown as { toxinBurdens: Record<string, number> })
        .toxinBurdens[TOXIN],
    ).toBeGreaterThan(2);
  });

  it('⭐ a MATERIAL\'s own toxicity names nobody — being alcoholic is what whiskey IS', () => {
    seedToxinRow();
    const eater = eaterAt();
    const boozy = makeStuff(() => {
      const m = new Material();
      m.setName('spirit');
      m.setNutrients(['water']);
      m.setEdibility(true);
      m.setToxicity([{ type: TOXIN, amount: 500 }]);
      return m;
    }) as unknown as Material;
    eater.ingest(boozy, Quantity.of(0.75, 'L'), 'liquid', {
      maker: COOK,
    } as never);
    settle(eater);

    // The dose landed (the material authored it) and the ledger is empty:
    // the row is for what the MAKING put there, never for what the thing
    // is.
    expect(
      (eater as unknown as { toxinBurdens: Record<string, number> })
        .toxinBurdens[TOXIN],
    ).toBeGreaterThan(2);
    expect(recorded, 'a bartender is not a poisoner').toHaveLength(0);
  });

  it('a second bad bottle worsens the illness and writes no second row', () => {
    seedToxinRow();
    const eater = eaterAt();
    const bad = {
      dissolvedToxins: [{ type: TOXIN, amount: 1000 }],
      maker: COOK,
    };
    eater.ingest(drink('rough spirit'), Quantity.of(0.75, 'L'), 'liquid', bad as never);
    settle(eater);
    expect(recorded).toHaveLength(1);

    eater.ingest(drink('rough spirit'), Quantity.of(0.75, 'L'), 'liquid', bad as never);
    settle(eater);
    expect(recorded, 'one illness, one row').toHaveLength(1);
  });
});
