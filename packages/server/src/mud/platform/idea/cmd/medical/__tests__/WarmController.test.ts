/**
 * ⭐ `warm` — frostbite wants warmth, not fluid; warming it applies its
 * treatment (D4/D5). The fire must actually be BURNING.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WarmController from '../WarmController';
import { Creature } from '../../../../../lib/creature/Creature';
import Location from '../../../../../lib/stuff/Location';
import Material from '../../../../../lib/material/Material';
import Thing from '../../../../../lib/stuff/Thing';
import { CombustibleMixin } from '../../../../../lib/fire/Combustible';
import { WetMixin } from '../../../../../lib/wetness/Wet';
import { ThermalMixin } from '../../../../../lib/thermal/Thermal';
import { ReservedMixin, Reserve } from '../../../../../lib/reserve';
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

class Firewood extends CombustibleMixin(
  WetMixin(ThermalMixin(ReservedMixin(Thing))),
) {
  static _mixinName = 'Firewood';
}

let note: ReturnType<typeof vi.fn>;
let woodSeq = 0;

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

/** A burning log (auto-ignited past its autoignition point). */
function burningLog(): Firewood {
  woodSeq += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`test-wood-${woodSeq}`);
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.17, 'W/(m·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
    return m;
  }, `/stuff/idea/material/_test/warmwood-${woodSeq}`) as unknown as Material;
  const log = makeStuff(() => {
    const w = new Firewood();
    w.setMass(Quantity.of(2, 'kg'));
    w.setMaterial(mat);
    w.setStampedTemperatureK(600); // > 570 K → auto-ignites
    w.setLastAmbientK(295);
    w.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return w;
  });
  log.tryAutoignite();
  return log;
}

function reachable(c: Creature): MqlManyResult {
  const out: Stuff[] = [];
  const self = c as unknown as Stuff;
  if (MixinApi.isContainable(self)) {
    const loc = self.getContainer();
    if (loc && MixinApi.isContainer(loc)) out.push(...loc.getContents());
  }
  return { stuff: out, raw: '' } as unknown as MqlManyResult;
}

/** A frostbitten body in a room with a burning log. */
function frostbitten(withFire = true): { me: Creature; frost: Trauma } {
  const room = makeStuff(() => new Location());
  const me = makeStuff(() => new Creature());
  ContainmentApi.move(me, room);
  if (withFire) ContainmentApi.move(burningLog(), room);
  const frost: Trauma = {
    kind: 'trauma',
    type: 'frostbite',
    site: 'body.arm.left.hand',
    severity: 2,
  };
  me.afflict(frost);
  return { me, frost };
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

describe('WarmController', () => {
  it('⭐⭐ warming frostbite treats it — it reads as rewarmed', async () => {
    const { me, frost } = frostbitten();
    await makeStuff(() => new WarmController()).execute(
      { source: reachable(me) },
      ctxFor(me),
    );
    expect(frost.dressed).toBe(true);
    expect(frost.careQuality).toBeGreaterThan(0);
  });

  it('⚠ needs a BURNING fire', async () => {
    const { me } = frostbitten(false); // no fire in the room
    await makeStuff(() => new WarmController()).execute(
      { source: reachable(me) },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-fire' }),
    );
  });

  it('⚠ refuses a body with nothing warmth would help', async () => {
    const room = makeStuff(() => new Location());
    const me = makeStuff(() => new Creature());
    ContainmentApi.move(me, room);
    ContainmentApi.move(burningLog(), room);
    me.afflict({ kind: 'trauma', type: 'burn', site: 'body.arm.left', severity: 2 });
    await makeStuff(() => new WarmController()).execute(
      { source: reachable(me) },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'nothing-to-warm' }),
    );
  });
});
