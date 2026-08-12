/**
 * Phase 3 — the limp (LocomotionApi seam).
 *
 * An active foot laceration imposes a severity-gated endurance drain at the
 * universal self-powered traverse chokepoint (`engageAround`), scaling with
 * severity and clearing as the wound heals.
 *
 * (The binary `ConditionApi.isSiteCovered` coverage-presence read is
 * retired — materials-response resolves coverage *degree* through the
 * `inflict` covering stack. See `material-response.inflict.test.ts`.)
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocomotionApi } from '../../../api/locomotion';
import { LocomotionMode } from '../../LocomotionMode';
import { buildMode } from '../../../lib/locomotion/__tests__/test-helpers';
import Location from '../../../lib/stuff/Location';
import Exit from '../../../lib/boundary/Exit';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { Creature } from '../../../lib/creature/Creature';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../Condition';

class MobileCreature extends MobileMixin(Creature) {
  static _mixinName = 'MobileCreature';
}

const endurance = (c: Creature): number =>
  c.getReserve('endurance')!.current.rawValue();

function footLaceration(severity: number): Trauma {
  return {
    kind: 'trauma',
    type: 'laceration',
    site: 'body.leg.left.foot',
    severity,
    bleeding: true,
  };
}

describe('the limp — LocomotionApi.engageAround endurance drain', () => {
  let walk: LocomotionMode;
  beforeEach(() => {
    installV1QuantityMarshallers();
    walk = buildMode('walk');
  });
  afterEach(() => StuffApi.clearAll());

  function exitBetween(from: Location, to: Location): Exit {
    return makeStuff(
      () => new Exit({ direction: 'north', source: from, destination: to })
    );
  }

  async function traverse(a: MobileCreature): Promise<number> {
    const here = a.getContainer() as Location;
    const there = makeStuff(() => new Location());
    const before = endurance(a);
    await LocomotionApi.engageAround(
      a,
      walk,
      exitBetween(here, there),
      async () => {}
    );
    return before - endurance(a);
  }

  it('a foot laceration drains endurance on traverse, scaling with severity', async () => {
    const here = makeStuff(() => new Location());

    const light = makeStuff(() => new MobileCreature());
    ContainmentApi.move(light, here);
    light.afflict(footLaceration(1));
    const dropLight = await traverse(light);
    expect(dropLight).toBeGreaterThan(0);

    const heavy = makeStuff(() => new MobileCreature());
    ContainmentApi.move(heavy, here);
    heavy.afflict(footLaceration(2));
    const dropHeavy = await traverse(heavy);
    expect(dropHeavy).toBeGreaterThan(dropLight);
  });

  it('an unwounded body pays no limp cost', async () => {
    const here = makeStuff(() => new Location());
    const a = makeStuff(() => new MobileCreature());
    ContainmentApi.move(a, here);
    expect(await traverse(a)).toBe(0);
  });

  it('the limp clears when the wound heals (severity 0)', async () => {
    const here = makeStuff(() => new Location());
    const a = makeStuff(() => new MobileCreature());
    ContainmentApi.move(a, here);
    const wound = footLaceration(1.5);
    a.afflict(wound);
    expect(await traverse(a)).toBeGreaterThan(0);

    wound.severity = 0; // healed
    expect(await traverse(a)).toBe(0);
  });

  it('a non-locomotor (arm) laceration does not limp', async () => {
    const here = makeStuff(() => new Location());
    const a = makeStuff(() => new MobileCreature());
    ContainmentApi.move(a, here);
    a.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left.hand',
      severity: 2,
      bleeding: true,
    });
    expect(await traverse(a)).toBe(0);
  });
});
