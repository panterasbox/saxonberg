/**
 * ⭐ `cool` — a burn wants fluid, and cooling it directly applies its
 * treatment (D4/D5), so it knits at the treated rate.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CoolController from '../CoolController';
import { Creature } from '../../../../../lib/creature/Creature';
import Location from '../../../../../lib/stuff/Location';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import { ContainmentApi } from '../../../../../api/containment';
import { Quantity } from '../../../../../lib/quantity';
import { makeStuffAtPath, makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../../api/command';
import type { MqlManyResult } from '../../../../../api/mql';
import { MixinApi } from '../../../../../api/mixin';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { Trauma } from '../../../Condition';

let note: ReturnType<typeof vi.fn>;

function silence(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

const ctxFor = (actor: unknown): CommandContext =>
  ({ commandGiver: actor, location: null, note } as unknown as CommandContext);

const WATER = '/stuff/idea/material/_test/cool-water';

function ensureWater(): Material {
  return (
    StuffApi.findByTemplatePath<Material>(WATER) ??
    (makeStuffAtPath(() => {
      const m = new Material();
      m.setName('water');
      m.setTags(['water', 'liquid']);
      return m;
    }, WATER) as unknown as Material)
  );
}

function waterJug(): Receptacle {
  ensureWater();
  const jug = makeStuff(() => new Receptacle());
  (jug as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (jug as unknown as { interiorMaterial: string }).interiorMaterial = WATER;
  jug.setInteriorCapacity(Quantity.of(2, 'L'));
  jug.setInteriorAmount(Quantity.of(1, 'L'));
  return jug;
}

function reachableWater(c: Creature): MqlManyResult {
  const out: Stuff[] = [];
  const self = c as unknown as Stuff;
  if (MixinApi.isContainer(self)) out.push(...self.getContents());
  if (MixinApi.isContainable(self)) {
    const loc = self.getContainer();
    if (loc && MixinApi.isContainer(loc)) out.push(...loc.getContents());
  }
  return { stuff: out, raw: '' } as unknown as MqlManyResult;
}

/** A burned body with a jug of water in reach. */
function burned(): { me: Creature; burn: Trauma } {
  const room = makeStuff(() => new Location());
  const me = makeStuff(() => new Creature());
  ContainmentApi.move(me, room);
  ContainmentApi.move(waterJug(), room);
  const burn: Trauma = {
    kind: 'trauma',
    type: 'burn',
    site: 'body.arm.left',
    severity: 2,
  };
  me.afflict(burn);
  return { me, burn };
}

beforeEach(() => {
  installV1QuantityMarshallers();
  note = vi.fn();
  silence();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('CoolController', () => {
  it('⭐⭐ cooling a burn treats it — it reads as cooled', async () => {
    const { me, burn } = burned();
    await makeStuff(() => new CoolController()).execute(
      { water: reachableWater(me) },
      ctxFor(me),
    );
    expect(burn.dressed).toBe(true);
    expect(burn.careQuality).toBeGreaterThan(0);
  });

  it('⚠ needs water in reach', async () => {
    const room = makeStuff(() => new Location());
    const me = makeStuff(() => new Creature());
    ContainmentApi.move(me, room);
    me.afflict({ kind: 'trauma', type: 'burn', site: 'body.arm.left', severity: 2 });
    await makeStuff(() => new CoolController()).execute(
      { water: reachableWater(me) },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-water' }),
    );
  });

  it('⚠ refuses a body with nothing cooling would help', async () => {
    const room = makeStuff(() => new Location());
    const me = makeStuff(() => new Creature());
    ContainmentApi.move(me, room);
    ContainmentApi.move(waterJug(), room);
    me.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 1,
      bleeding: true,
    });
    await makeStuff(() => new CoolController()).execute(
      { water: reachableWater(me) },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'nothing-to-cool' }),
    );
  });
});
