/**
 * ⭐ `dose` — an antidote is a substance with a tag (D7).
 *
 * The controller reads the vial's matter for `antidote:<toxin>` tags and
 * crashes each matching live burden. What a remedy counters is a fact
 * about the MATERIAL, not the verb, so a new antidote is a new row.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DoseController from '../DoseController';
import { Creature } from '../../../../../lib/creature/Creature';
import Location from '../../../../../lib/stuff/Location';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import { ContainmentApi } from '../../../../../api/containment';
import { Quantity } from '../../../../../lib/quantity';
import { makeStuffAtPath, makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { MessageApi } from '../../../../../api/message';
import { Mml } from '../../../../../api/mml';
import { StuffApi } from '../../../../../api/stuff';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../../api/command';
import type { MqlManyResult } from '../../../../../api/mql';
import { MixinApi } from '../../../../../api/mixin';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

let note: ReturnType<typeof vi.fn>;

function captureBody(): void {
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

const ANTIVENIN = '/stuff/idea/material/_test/antivenin';

/** A material tagged `antidote:venom`. */
function ensureAntivenin(): Material {
  return (
    StuffApi.findByTemplatePath<Material>(ANTIVENIN) ??
    (makeStuffAtPath(() => {
      const m = new Material();
      m.setName('antivenin');
      m.setTags(['antidote:venom', 'liquid', 'remedy']);
      return m;
    }, ANTIVENIN) as unknown as Material)
  );
}

/** A vial holding `litres` of antivenin. */
function vial(litres = 0.25): Receptacle {
  ensureAntivenin();
  const v = makeStuff(() => new Receptacle());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (v as unknown as { interiorMaterial: string }).interiorMaterial = ANTIVENIN;
  v.setInteriorCapacity(Quantity.of(0.25, 'L'));
  v.setInteriorAmount(Quantity.of(litres, 'L'));
  return v;
}

/** Reachable vessels the binder would hand `with` (carried, then room). */
function reachable(c: Creature): MqlManyResult {
  const out: Stuff[] = [];
  const self = c as unknown as Stuff;
  if (MixinApi.isContainer(self)) out.push(...self.getContents());
  if (MixinApi.isContainable(self)) {
    const loc = self.getContainer();
    if (loc && MixinApi.isContainer(loc)) out.push(...loc.getContents());
  }
  return { stuff: out, raw: '' } as unknown as MqlManyResult;
}

/** A poisoned body in a room, carrying a vial. */
function poisoned(venom = 4): { me: Creature; v: Receptacle } {
  const room = makeStuff(() => new Location());
  const me = makeStuff(() => new Creature());
  ContainmentApi.move(me, room);
  const v = vial();
  ContainmentApi.move(v, me);
  me.introduceToxin('venom', venom);
  return { me, v };
}

beforeEach(() => {
  installV1QuantityMarshallers();
  note = vi.fn();
  captureBody();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('DoseController', () => {
  it('⭐⭐ crashes the venom burden the vial counters', async () => {
    const { me } = poisoned(4);
    const before = me.toxinBurdens.venom ?? 0;
    await makeStuff(() => new DoseController()).execute(
      { with: reachable(me) },
      ctxFor(me),
    );
    expect(me.toxinBurdens.venom ?? 0).toBeLessThan(before);
  });

  it('spends a dose from the vial', async () => {
    const { me, v } = poisoned(4);
    const before = v.getInteriorAmount().rawValue();
    await makeStuff(() => new DoseController()).execute(
      { with: reachable(me) },
      ctxFor(me),
    );
    expect(v.getInteriorAmount().rawValue()).toBeLessThan(before);
  });

  it('⚠ leaves a toxin the remedy does NOT counter alone', async () => {
    const { me } = poisoned(0); // no venom
    me.introduceToxin('alcohol', 3);
    await makeStuff(() => new DoseController()).execute(
      { with: reachable(me) },
      ctxFor(me),
    );
    // The vial counters venom, of which there is none — alcohol is untouched.
    expect(me.toxinBurdens.alcohol).toBe(3);
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'nothing-to-counter' }),
    );
  });

  it('⚠ refuses a vial with less than a dose left', async () => {
    const room = makeStuff(() => new Location());
    const me = makeStuff(() => new Creature());
    ContainmentApi.move(me, room);
    const empty = vial(0.02); // non-empty, but under the 0.05 L dose
    ContainmentApi.move(empty, me);
    me.introduceToxin('venom', 4);
    await makeStuff(() => new DoseController()).execute(
      { with: reachable(me) },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'empty-vial' }),
    );
    expect(me.toxinBurdens.venom).toBe(4); // untouched
  });

  it('⚠ refuses when no remedy is to hand', async () => {
    const room = makeStuff(() => new Location());
    const me = makeStuff(() => new Creature());
    ContainmentApi.move(me, room);
    me.introduceToxin('venom', 4);
    await makeStuff(() => new DoseController()).execute(
      { with: reachable(me) },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-remedy' }),
    );
  });
});
