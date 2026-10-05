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
 * ⚠ And a finding recorded while writing this: `noteMealAccountability`
 * is called from inside the PATHOGEN loop, so a **toxin** dose writes no
 * row at all. That matters for anything that makes a substance harmful
 * chemically rather than microbially — see the cuts requirements.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { MaterialApi } from '../../../api/material';
import { AccountabilityApi } from '../../../api/accountability';
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
