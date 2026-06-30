/**
 * Hitch / Unhitch controllers + the hands-occupied guard. Exercises the
 * self-haul and harness paths, the already-hitched / hands-full declines,
 * and the wield-while-hauling block.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import HitchController from '../HitchController';
import UnhitchController from '../UnhitchController';
import WieldController from '../../inventory/WieldController';
import Location from '../../../../lib/stuff/Location';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { CommandApi, type CommandContext } from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import type { MqlOneResult } from '../../../../api/mql';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import {
  cart,
  haulingBearer,
  type HaulingBearer,
} from '../../../../lib/slot/__tests__/haulage-fixtures';
import {
  heldThing,
  equip,
} from '../../../../lib/encumbrance/__tests__/encumbrance-fixtures';

function one(stuff: Stuff | null, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

function ctxFor(giver: HaulingBearer, loc: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: verb,
    executionId: 't',
    commandId: 't',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

function placedBearer(): { giver: HaulingBearer; loc: Location } {
  const loc = makeStuff(() => new Location());
  const giver = haulingBearer(70);
  ContainmentApi.move(giver, loc);
  return { giver, loc };
}

describe('HitchController', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('self-haul: giver takes hold of the cart', () => {
    const { giver, loc } = placedBearer();
    const c = cart();
    ContainmentApi.move(c, loc);
    makeStuff(() => new HitchController()).execute(
      { target: one(c, 'cart') },
      ctxFor(giver, loc, 'hitch'),
    );
    expect(giver.isHitched()).toBe(true);
    expect(c.getHauledBy()).toBe(giver);
  });

  it('self-haul declined when already hitched', () => {
    const { giver, loc } = placedBearer();
    const a = cart();
    const b = cart();
    giver.hitch(a);
    const ctx = ctxFor(giver, loc, 'hitch');
    makeStuff(() => new HitchController()).execute({ target: one(b, 'cart') }, ctx);
    expect(giver.getHauledCart()).toBe(a); // unchanged
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'already-hitched' }),
    );
  });

  it('self-haul declined when hands are full (wielding)', () => {
    const { giver, loc } = placedBearer();
    const c = cart();
    equip(giver, heldThing(1), 'hand:left'); // occupy a Wieldable slot
    const ctx = ctxFor(giver, loc, 'hitch');
    makeStuff(() => new HitchController()).execute({ target: one(c, 'cart') }, ctx);
    expect(giver.isHitched()).toBe(false);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'hands-occupied' }),
    );
  });

  it('harness: hitches the cart to a draft beast, rider hands stay free', () => {
    const { giver, loc } = placedBearer();
    const beast = haulingBearer(400); // a strong puller
    ContainmentApi.move(beast, loc);
    const c = cart();
    ContainmentApi.move(c, loc);
    makeStuff(() => new HitchController()).execute(
      { target: one(c, 'cart'), mount: one(beast, 'beast') },
      ctxFor(giver, loc, 'hitch'),
    );
    expect(beast.isHitched()).toBe(true);
    expect(c.getHauledBy()).toBe(beast);
    expect(giver.isHitched()).toBe(false); // the rider isn't the hauler
  });
});

describe('UnhitchController', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('bare unhitch drops the giver own cart', () => {
    const { giver, loc } = placedBearer();
    const c = cart();
    giver.hitch(c);
    makeStuff(() => new UnhitchController()).execute({}, ctxFor(giver, loc, 'unhitch'));
    expect(giver.isHitched()).toBe(false);
    expect(c.getHauledBy()).toBeNull();
  });

  it('unhitch <beast> releases the cart the beast pulls', () => {
    const { giver, loc } = placedBearer();
    const beast = haulingBearer(400);
    ContainmentApi.move(beast, loc);
    const c = cart();
    beast.hitch(c);
    makeStuff(() => new UnhitchController()).execute(
      { target: one(beast, 'beast') },
      ctxFor(giver, loc, 'unhitch'),
    );
    expect(beast.isHitched()).toBe(false);
    expect(c.getHauledBy()).toBeNull();
  });

  it('declines when nothing is hitched', () => {
    const { giver, loc } = placedBearer();
    const ctx = ctxFor(giver, loc, 'unhitch');
    makeStuff(() => new UnhitchController()).execute({}, ctx);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'not-hitched' }),
    );
  });
});

describe('hands-occupied guard — wield while hauling', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('wield is declined while the giver hauls a cart', () => {
    const { giver, loc } = placedBearer();
    const c = cart();
    giver.hitch(c);
    const sword = heldThing(1);
    ContainmentApi.move(sword, giver);
    const ctx = ctxFor(giver, loc, 'wield');
    makeStuff(() => new WieldController()).execute({ target: one(sword, 'sword') }, ctx);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'hands-hauling' }),
    );
  });
});
