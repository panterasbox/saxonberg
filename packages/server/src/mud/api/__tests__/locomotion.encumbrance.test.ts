/**
 * Encumbrance consequences at the LocomotionApi self-powered seam:
 *
 *   - the load-aware veto (alongside the capability check) suppresses
 *     climb/swim/fly for an overloaded body, never walk;
 *   - the loaded-traversal endurance drain fires in `engageAround` after
 *     a successful self-powered traverse — universal across triggers
 *     (this test calls it directly, as an NPC brain / automation would),
 *     gentle for light loads, and absent from raw `Mobile.traverse`.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocomotionApi } from '../locomotion';
import { LocomotionMode } from '../../platform/idea/LocomotionMode';
import { ClimbableMixin } from '../../lib/locomotion/Climbable';
import Location from '../../lib/stuff/Location';
import Exit from '../../lib/boundary/Exit';
import { MobileMixin } from '../../lib/spatial/Mobile';
import { PropertiedMixin } from '../../lib/stuff/Propertied';
import { Creature } from '../../lib/creature/Creature';
import { ContainmentApi } from '../containment';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { buildMode } from '../../lib/locomotion/__tests__/test-helpers';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  bearerOf,
  massThing,
} from '../../lib/encumbrance/__tests__/encumbrance-fixtures';

const ClimbLoc = ClimbableMixin(Location);
class ClimbLocation extends ClimbLoc {}

// A Mobile + Propertied load-bearer (Character-shaped: can traverse and
// engage modes; capability props for the climb difficulty check).
class MobileBearerBase extends PropertiedMixin(MobileMixin(Creature)) {}
class MobileBearer extends MobileBearerBase {
  static _mixinName = 'MobileBearer';
}

/** Push the bearer's load ratio above 1.0 with a heavy worn-free load. */
function overload(bearer: Creature): void {
  // capacity = 70 * 0.5 = 35 kg; 100 kg loose → ratio well over 1.
  ContainmentApi.move(massThing(100), bearer);
}

describe('LocomotionApi — load-aware veto', () => {
  let climb: LocomotionMode;
  let walk: LocomotionMode;
  beforeEach(() => {
    installV1QuantityMarshallers();
    climb = buildMode('climb');
    walk = buildMode('walk');
  });
  afterEach(() => StuffApi.clearAll());

  it('refuses climb for an overloaded body with the encumbrance gate', () => {
    const loc = makeStuff(() => new ClimbLocation());
    loc.setAxes(['up']);
    const bearer = bearerOf(() => new MobileBearer());
    ContainmentApi.move(bearer, loc);
    overload(bearer);

    const guard = LocomotionApi.checkEnablement(bearer, climb, 'up');
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe('encumbrance');
    expect(guard.mode).toBe('climb');
  });

  it('lets an unloaded body climb', () => {
    const loc = makeStuff(() => new ClimbLocation());
    loc.setAxes(['up']);
    const bearer = bearerOf(() => new MobileBearer());
    ContainmentApi.move(bearer, loc);

    expect(LocomotionApi.checkEnablement(bearer, climb, 'up')).toEqual({
      ok: true,
    });
  });

  it('never gates walk on load (walk has no enablement mixin)', () => {
    const loc = makeStuff(() => new Location());
    const bearer = bearerOf(() => new MobileBearer());
    ContainmentApi.move(bearer, loc);
    overload(bearer);

    // walk → no enablementMixin → checkEnablement is { ok: true } regardless.
    expect(LocomotionApi.checkEnablement(bearer, walk, 'north')).toEqual({
      ok: true,
    });
  });
});

describe('LocomotionApi — loaded-traversal drain (engageAround)', () => {
  let walk: LocomotionMode;
  beforeEach(() => {
    installV1QuantityMarshallers();
    walk = buildMode('walk');
  });
  afterEach(() => StuffApi.clearAll());

  function exitBetween(from: Location, to: Location): Exit {
    return makeStuff(
      () => new Exit({ direction: 'north', source: from, destination: to }),
    );
  }

  function endurance(bearer: Creature): number {
    return bearer.getReserve('endurance')!.current.rawValue();
  }

  it('a loaded self-powered traverse draws down endurance', async () => {
    const here = makeStuff(() => new Location());
    const there = makeStuff(() => new Location());
    const bearer = bearerOf(() => new MobileBearer());
    ContainmentApi.move(bearer, here);
    overload(bearer);
    const before = endurance(bearer);

    await LocomotionApi.engageAround(bearer, walk, exitBetween(here, there), async () => {});

    expect(endurance(bearer)).toBeLessThan(before);
  });

  it('a light load costs no endurance', async () => {
    const here = makeStuff(() => new Location());
    const there = makeStuff(() => new Location());
    const bearer = bearerOf(() => new MobileBearer());
    ContainmentApi.move(bearer, here);
    ContainmentApi.move(massThing(1), bearer); // ratio well under the floor
    const before = endurance(bearer);

    await LocomotionApi.engageAround(bearer, walk, exitBetween(here, there), async () => {});

    expect(endurance(bearer)).toBe(before);
  });

  it('a raw Mobile.traverse (bypassing LocomotionApi) drains nothing', async () => {
    const here = makeStuff(() => new Location());
    const there = makeStuff(() => new Location());
    const bearer = bearerOf(() => new MobileBearer());
    ContainmentApi.move(bearer, here);
    overload(bearer);
    const before = endurance(bearer);

    // The §1.4 guarantee: the move substrate is encumbrance-agnostic.
    await bearer.traverse(exitBetween(here, there), 'walk');

    expect(endurance(bearer)).toBe(before);
  });
});
