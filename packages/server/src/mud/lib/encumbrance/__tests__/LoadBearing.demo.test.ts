/**
 * The three demo objects, each exercising one encumbrance axis with the
 * real shipped classes (the seeds at `domain/eternal/gear/*` are these
 * same classes + authored data):
 *
 *   - a worn `Pack` (backpack) — placement coupling: a stowed load
 *     counts at the worn floor and leaves the hands free;
 *   - a low-`transmissionFactor` `Vessel` (bag of holding) — its cargo
 *     barely adds to what the bearer bears;
 *   - a heavy `Thing` (anvil) — over the strain ceiling, can't be lifted.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import Pack from '../../equipment/Pack';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  bearerCreature,
  massThing,
  vessel,
} from './encumbrance-fixtures';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('encumbrance demo — three axes, real classes', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('worn Pack: stowed load counts at the worn floor, hands free', () => {
    const bearer = bearerCreature(70);
    const planPath = bearer.getSpecies()!.getBodyPlanPath()!;
    const pack = makeStuff(() => new Pack());
    pack.setMass(Quantity.of(2, 'kg'));
    pack.setSlotClaims({ [planPath]: ['torso'] });
    bearer.occupy(pack, 'torso');
    ContainmentApi.move(massThing(10), pack);

    // pack self (2) + stowed (10), both at the worn floor (1.0):
    expect(bearer.getBorneBurden().rawValue()).toBeCloseTo(12);
    // Hands are free — nothing occupies the held slot.
    expect(bearer.getOccupants('hand:left').size).toBe(0);
  });

  it('bag of holding: 100 kg of cargo barely registers', () => {
    const bearer = bearerCreature(70);
    const bag = vessel(0.5, 0.05); // light bag, near-zero transmission
    ContainmentApi.move(bag, bearer);
    const burdenEmpty = bearer.getBorneBurden().rawValue();
    ContainmentApi.move(massThing(100), bag);
    const burdenFull = bearer.getBorneBurden().rawValue();

    // 100 kg in → burden grows by only 100 * 0.05 * 1.25 = 6.25 kg.
    expect(burdenFull - burdenEmpty).toBeCloseTo(100 * 0.05 * 1.25);
    expect(burdenFull).toBeLessThan(10);
  });

  it('anvil: over the strain ceiling, the lift would decline', () => {
    const bearer = bearerCreature(70); // ceiling 70 kg
    const anvil = massThing(200);
    expect(bearer.wouldExceedCeiling(anvil)).toBe(true);
  });
});
