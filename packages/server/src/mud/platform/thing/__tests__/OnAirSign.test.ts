/**
 * The on-air sign and the broadcast desk (stream arrival C3, D18, D19).
 *
 * The sign is lit exactly while some body in its own place is on the air —
 * derived when read, so it is right after a restart with no stored field;
 * dark with nobody on air, dark when the broadcaster walks out. The desk
 * lends `rodney` and `program` to whoever is in its place, through `peers`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi, type AnyConstructor } from '../../../api/mixin';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import Location from '../../../lib/location/Location';
import Thing from '../../../lib/stuff/Thing';
import OnAirSign from '../OnAirSign';
import BroadcastDesk from '../BroadcastDesk';
import { handsSpecies, Body } from '../../../lib/slot/__tests__/carrying-fixture';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import type { Stuff } from '../../../lib/stuff/Stuff';

/** A body that may be on the air — just the two answers the sign reads. */
class Broadcaster extends Thing {
  onAir = false;
  isOnAir(): boolean {
    return this.onAir;
  }
}

class Person extends CommandGiverMixin(Body) {}

describe('OnAirSign — lit by presence, derived', () => {
  let booth: Location;
  let street: Location;
  let sign: OnAirSign;

  beforeEach(() => {
    booth = makeStuff(() => new Location());
    street = makeStuff(() => new Location());
    sign = makeStuff(() => new OnAirSign());
    (sign as unknown as { emittedIntensity: number }).emittedIntensity = 400;
    booth.addFixture(sign, 'sign:window');
    vi.spyOn(MixinApi, 'isBroadcastHost').mockImplementation(((s: unknown) =>
      s instanceof Broadcaster) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('dark with nobody on the air', () => {
    const b = makeStuff(() => new Broadcaster());
    ContainmentApi.move(b, booth);
    expect(sign.isLit()).toBe(false);
    expect(sign.getEmittedFlux().value).toBe(0);
    expect(sign.getLong()).toMatch(/dark/);
  });

  it('lit while a body in the booth is on the air — its light and its words', () => {
    const b = makeStuff(() => new Broadcaster());
    ContainmentApi.move(b, booth);
    b.onAir = true;
    expect(sign.isLit()).toBe(true);
    expect(sign.getEmittedFlux().value).toBe(400);
    expect(sign.getLong()).toMatch(/LIT/);
  });

  it('dark again when they go off the air, and when they walk out still on it', () => {
    const b = makeStuff(() => new Broadcaster());
    ContainmentApi.move(b, booth);
    b.onAir = true;
    expect(sign.isLit()).toBe(true);
    ContainmentApi.move(b, street);
    expect(sign.isLit()).toBe(false);
    ContainmentApi.move(b, booth);
    b.onAir = false;
    expect(sign.isLit()).toBe(false);
  });

  it('stores nothing — no persistent field says it is lit', () => {
    const fields = MixinApi.getAllPersistentFields(OnAirSign as unknown as AnyConstructor);
    expect(fields.filter((f) => /lit|onAir/i.test(f))).toEqual([]);
  });
});

describe('BroadcastDesk — the verbs, to whoever is at it', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('lends `rodney` and `program` through peers, and takes them back when you leave', () => {
    const booth = makeStuff(() => new Location());
    const street = makeStuff(() => new Location());
    const desk = makeStuff(() => new BroadcastDesk());
    ContainmentApi.move(desk, booth);
    const { species } = handsSpecies();
    const me = makeStuff(() => new Person());
    me.setSpecies(species);
    ContainmentApi.move(me, booth);
    const verbs = (): string[] =>
      me
        .getAffordances()
        .filter((a) => a.source === (desk as Stuff))
        .flatMap((a) => a.command.verbs);
    expect(verbs()).toEqual(expect.arrayContaining(['program', 'rodney']));
    ContainmentApi.move(me, street);
    expect(verbs()).not.toContain('rodney');
    expect(verbs()).not.toContain('program');
  });
});
