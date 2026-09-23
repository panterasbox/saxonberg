/**
 * ⭐⭐ **The `isFulfilling` truth table** — who an `order` at a venue is
 * served by.
 *
 * Three conditions, all of them, all the time: the actor is **on shift**,
 * the seat its house authored marks **`fulfills`**, and the actor is
 * standing somewhere that house **operates**. That third leg is what
 * *employer-bounded* actually means — an on-shift bartender who walks
 * into the smithy does not fulfil smithy orders.
 *
 * ⚠ What this replaced (trades-and-labor D17): a Position's
 * `confers: ['MakerMixin']` list, folded into the AUGMENT walk by a
 * structural soft-lookup, gating a marker mixin with no behaviour. That
 * put a JOB through the implant mechanism — augment gating is for
 * physical implants and innate gifts — and, worse, made the grant
 * **unreachable by a player**: `MakerMixin` was composed only on
 * `Crafter`, an NPC class, so a player who took the seat got nothing.
 * Now nothing is composed on anybody and an Avatar and an NPC answer
 * identically, which the last case here asserts.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { EmployedMixin } from '../Employed';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import BusinessEntity from '../../../platform/idea/Business';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

const BUSINESS = '/world/lounge/idea/business';
const BAR = '/world/lounge/location/bar';
const SMITHY = '/world/elsewhere/location/smithy';

/** An employable body that can stand somewhere. Composes no capability. */
class Worker extends EmployedMixin(ContainableMixin(Idea)) {
  static _mixinName = 'ConferralWorker';
}
/** The same, standing in for an Avatar: a different class, same answers. */
class PlayerBody extends EmployedMixin(ContainableMixin(Idea)) {
  static _mixinName = 'ConferralPlayerBody';
}
class Room extends ContainerMixin(Idea) {
  static _mixinName = 'ConferralRoom';
}

let bar: Room;
let smithy: Room;

function seedBusiness(): void {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 12, fulfills: true },
    // The seat that pays but does not make: the book-keeper.
    { key: 'clerk', label: 'keeping the book', wageRate: 5 },
  ];
  b.operatingLocations = [BAR];
}

function employ(
  w: Worker | PlayerBody,
  positionKey: string,
  status: 'on-shift' | 'off-shift',
): void {
  w.employments = [
    {
      organizationPath: BUSINESS,
      positionKey,
      status,
      hiredAt: 0,
      onShiftSince: status === 'on-shift' ? 1 : null,
    },
  ];
}

describe('⭐ isFulfilling — on shift, in a fulfilling seat, where the house operates', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    seedBusiness();
    bar = makeStuffAtPath(() => new Room(), BAR);
    smithy = makeStuffAtPath(() => new Room(), SMITHY);
  });

  it('is false when never employed — nothing is composed, nothing is granted', () => {
    const w = makeStuff(() => new Worker());
    ContainmentApi.move(w as never, bar as never);
    expect(MixinApi.isEmployed(w)).toBe(true);
    expect(w.isFulfilling()).toBe(false);
  });

  it('is TRUE on shift, in the fulfilling seat, in the room the house operates', () => {
    const w = makeStuff(() => new Worker());
    ContainmentApi.move(w as never, bar as never);
    employ(w, 'bartender', 'on-shift');
    expect(w.isFulfilling()).toBe(true);
  });

  it('is false off shift — the same seat, the same room', () => {
    const w = makeStuff(() => new Worker());
    ContainmentApi.move(w as never, bar as never);
    employ(w, 'bartender', 'off-shift');
    expect(w.isFulfilling()).toBe(false);
  });

  it('is false in a seat the house did NOT mark `fulfills` — the clerk', () => {
    const w = makeStuff(() => new Worker());
    ContainmentApi.move(w as never, bar as never);
    employ(w, 'clerk', 'on-shift');
    expect(w.isFulfilling()).toBe(false);
  });

  it('⭐ is false in a room the house does not operate — employer-bounded', () => {
    const w = makeStuff(() => new Worker());
    ContainmentApi.move(w as never, smithy as never);
    employ(w, 'bartender', 'on-shift');
    expect(w.isFulfilling()).toBe(false);
    // …and true again the moment they walk back behind their own bar.
    ContainmentApi.move(w as never, bar as never);
    expect(w.isFulfilling()).toBe(true);
  });

  it('counts a FIXTURE the house operates as "here" — the counter, not the room', () => {
    const counter = makeStuffAtPath(
      () => new (class extends ContainableMixin(Idea) {
        static _mixinName = 'ConferralCounter';
      })(),
      '/world/lounge/thing/counter',
    );
    ContainmentApi.move(counter as never, bar as never);
    const biz = StuffApi.findByTemplatePath<BusinessEntity>(BUSINESS)!;
    // A house that names only its counter still fulfils in the room the
    // counter stands in — the `resolveHouse` walk, not a room-path match.
    biz.operatingLocations = ['/world/lounge/thing/counter'];
    const w = makeStuff(() => new Worker());
    ContainmentApi.move(w as never, bar as never);
    employ(w, 'bartender', 'on-shift');
    expect(w.isFulfilling()).toBe(true);
  });

  it('⭐⭐ an Avatar-shaped body and an NPC-shaped body answer identically', () => {
    const npc = makeStuff(() => new Worker());
    const player = makeStuff(() => new PlayerBody());
    for (const who of [npc, player]) {
      ContainmentApi.move(who as never, bar as never);
      employ(who, 'bartender', 'on-shift');
      expect(who.isFulfilling(), who.constructor.name).toBe(true);
      employ(who, 'bartender', 'off-shift');
      expect(who.isFulfilling(), who.constructor.name).toBe(false);
    }
  });
});
