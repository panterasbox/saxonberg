/**
 * ⛔⛔ **A direction's `via` holds a LIVE Exit, and it may not be
 * serialized.**
 *
 * `candidatesForHere` offers every obvious exit as a candidate named for
 * its direction, carrying `via: { exit }`. An `Exit` reaches its
 * `Boundary` (the door), and a `Boundary`'s `anchorA`/`anchorB` point
 * back at it — so the object graph has a cycle, and `JSON.stringify`
 * throws `Converting circular structure to JSON`.
 *
 * Two places compared a `via` by stringifying it:
 *
 *   - `MqlLogic.consensusVia`, whose own comment said *"same exit
 *     reference … kept cheap by JSON-stringifying"* — the contradiction
 *     that shipped;
 *   - the resolver's chain-walk dedupe key.
 *
 * The caller catches the throw and reports `mql-error`, so a perfectly
 * well-formed query answered *"something went wrong"*.
 *
 * ⚠⚠ **Why nothing caught it.** Resolving a direction through a verb
 * whose arg declares a `requires:` mixin is the only way in, and before
 * the lock build no such verb was reachable: `lock`/`unlock` were
 * afforded by nothing, and `open`/`close` — which have the identical
 * shape and were therefore identically broken — are only ever tested by
 * naming the door by KEYWORD (`OpenController.test.ts` uses `'oak'`).
 * So `open north` and `close north` were broken for as long as they have
 * existed, each promised in its own help text, and the drive is what
 * found it.
 *
 * ⭐ This file pins the shape rather than the symptom: a `via` carrying a
 * real Exit must survive the comparison both ways round.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { MqlApi } from '../../../../api/mql';
import Exit from '../../../../lib/boundary/Exit';
import Door from '../../../thing/Door';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import CartesianZone from '../../location/CartesianZone';
import { ContainmentApi } from '../../../../api/containment';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { NamedMixin } from '../../../../lib/description/Named';
import { Idea } from '../../../../lib/stuff/Idea';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../../../lib/security/__tests__/test-setup';

const MoverBase = NamedMixin(
  MobileMixin(SensorMixin(ContainableMixin(Idea))),
);
class TestMover extends MoverBase {
  protected override handleMessage(): void {}
}

describe('a direction match carries a live Exit', () => {
  let zone: CartesianZone;
  let here: CartesianLocation;
  let there: CartesianLocation;
  let mover: TestMover;
  let door: Door;

  beforeEach(async () => {
    seedKernelContentStore();
    zone = makeStuff(() => new CartesianZone());
    here = makeStuff(() => new CartesianLocation());
    here.setShortDescription('Here');
    there = makeStuff(() => new CartesianLocation());
    there.setShortDescription('There');
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(there, 0, 1, 0);

    door = await StuffApi.create(() => new Door());
    door.setShortDescription('iron gate');
    door.setKeywords(['gate']);
    await here.addBidirectionalExit(there, 'north', { door });

    mover = makeStuff(() => new TestMover());
    mover.setName('Alice');
    ContainmentApi.move(mover, here);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('⛔ the exit graph really is circular — the premise, stated as a test', () => {
    const exit = here
      .getObviousExits()
      .find((e: Exit) => e.getDirection() === 'north');
    expect(exit, 'the north exit exists').toBeTruthy();
    // ⭐ If this ever stops throwing, the fixes below became unnecessary
    // rather than wrong — and this assertion is how anybody would know.
    expect(() => JSON.stringify({ exit })).toThrow(/circular/i);
  });

  it('⭐⭐⭐ resolving a DIRECTION does not throw', () => {
    // The whole defect in one call. Before the fix this raised
    // `Converting circular structure to JSON`, which the command layer
    // reported as `mql-error[target]`.
    const result = MqlApi.resolveMany('north', {
      commandGiver: mover as never,
      scope: 'reachable',
    });
    expect(result).toBeTruthy();
  });

  it('⭐⭐ the direction resolves, and carries the exit through `via`', () => {
    const one = MqlApi.resolveOne('north', {
      commandGiver: mover as never,
      scope: 'reachable',
    });
    expect(one.stuff, 'a direction match resolves to something').toBeTruthy();
    // ⚠ The attribution is the point: a controller reads `via.exit` to
    // act on the discovery without re-finding it, which is how
    // `lock north` reaches the door hanging on that exit.
    const exit = (one.via as { exit?: Exit } | undefined)?.exit;
    expect(exit, '`via.exit` is the attribution the controllers read')
      .toBeTruthy();
    expect(exit?.getDirection()).toBe('north');
  });

  it('⭐⭐ the DOOR on that exit is what a boundary verb acts on', () => {
    // `effectiveTarget` walks the named object, then the exit's door,
    // then the exit itself. This is rung two, and it is what makes
    // `open north` / `lock north` mean anything.
    const one = MqlApi.resolveOne('north', {
      commandGiver: mover as never,
      scope: 'reachable',
    });
    const found = MqlApi.effectiveTarget(
      one,
      (s): s is Door => s === (door as unknown as typeof s),
    );
    expect(found, 'the direction reaches the door hanging on it').toBe(door);
  });
});
