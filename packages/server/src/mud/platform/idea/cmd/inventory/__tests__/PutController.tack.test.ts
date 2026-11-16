/**
 * ⭐ Tack goes on by `put <tack> on <beast>` (size and carrying D-W10-8): a
 * body with no hands (a mule — it cannot dress itself) takes a slot claim
 * from `put`; a person is still refused; and HANDED tack is not put on — a
 * mule does not saddle itself; it has nowhere to carry it and sets it down
 * (W10i: `move` is the only call, owner 2026-11-15).
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PutController from '../PutController';
import GiveController from '../GiveController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MessageApi } from '../../../../../api/message';
import { CommandApi, type ModelData } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, carry, hold, Bag } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import Location from '../../../../../lib/location/Location';
import { Actor } from '../../../../../lib/creature/Actor';

const one = (stuff: Stuff | null, raw: string, prep?: string): MqlOneResult => ({ stuff, raw, ...(prep ? { prep } : {}) });

function ctx(giver: Stuff, loc: Stuff, verb: string) {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: CommandDefinition.fromYaml(`verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`, '<test>'),
  });
}

let said: string[];

describe('tack: `put saddle on mule` (D-W10-8)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
    said = [];
    const real = MessageApi.scene.bind(MessageApi);
    vi.spyOn(MessageApi, 'scene').mockImplementation((...args: Parameters<typeof MessageApi.scene>) => {
      const b = real(...args);
      const toSelf = b.toSelf.bind(b);
      b.toSelf = ((m: unknown) => {
        said.push(String((m as { toPlain?: () => string }).toPlain?.() ?? JSON.stringify(m)));
        return toSelf(m as never);
      }) as typeof b.toSelf;
      return b;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function scene() {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const { me: mule, plan: mulePlan } = makeBody({ hands: false, mass: 300 });
    mule.setShortDescription('mule');
    ContainmentApi.move(mule, room);
    const { me: bob } = makeBody();
    bob.setShortDescription('Bob');
    ContainmentApi.move(bob, room);
    const saddle = makeStuff(() => new Bag());
    saddle.setShortDescription('pack saddle');
    saddle.setKeywords(['saddle']);
    saddle.setSlotClaims({ [mulePlan]: ['back'] });
    ContainmentApi.move(saddle, room);
    carry(me, saddle);
    return { room, me, plan, mule, bob, saddle };
  }

  it('`put saddle on mule` seats it on its back', async () => {
    const { room, me, mule, saddle } = scene();
    const c = ctx(me, room, 'put');
    await makeStuff(() => new PutController()).execute(
      { item: one(saddle, 'saddle'), target: one(mule, 'mule', 'on') } as ModelData as never,
      c,
    );
    expect(mule.getOccupants('back').has(saddle)).toBe(true);
    expect(said.join('\n')).toMatch(/You put .* on /);
  });

  it('`put saddle on bob` is refused — a person dresses themself', async () => {
    const { room, me, bob, saddle } = scene();
    const c = ctx(me, room, 'put');
    await makeStuff(() => new PutController()).execute(
      { item: one(saddle, 'saddle'), target: one(bob, 'bob', 'on') } as ModelData as never,
      c,
    );
    expect(saddle.getContainer()).toBe(me);
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
  });

  it('`give saddle to mule` is given, and the mule — nowhere to carry it — sets it down; it is not put on', async () => {
    const { room, me, mule, saddle } = scene();
    const c = ctx(me, room, 'give');
    await makeStuff(() => new GiveController()).execute(
      { item: one(saddle, 'saddle'), recipient: one(mule, 'mule', 'to') } as ModelData as never,
      c,
    );
    expect(mule.getOccupants('back').has(saddle)).toBe(false);
    expect(me.tierOf(saddle)).toBe('elsewhere');
    expect(saddle.getContainer()).toBe(room);
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(false);
  });

  it('a body that does not carry takes nothing: refused before the release, the knife stays in the hand it was in', async () => {
    const { room, me, plan, saddle } = scene();
    class Fish extends Actor {}
    const fish = makeStuff(() => new Fish());
    ContainmentApi.move(fish, room);
    // The saddle out of the first hand; the knife in the right.
    ContainmentApi.move(saddle, room);
    const knife = hold(me, plan, tool('knife', 0.3), 'hand:right');
    const c = ctx(me, room, 'give');
    await makeStuff(() => new GiveController()).execute(
      { item: one(knife, 'knife'), recipient: one(fish, 'fish', 'to') } as ModelData as never,
      c,
    );
    expect(me.getOccupants('hand:right').has(knife)).toBe(true);
    expect(me.getOccupants('hand:left').has(knife)).toBe(false);
    expect(said.join('\n')).toMatch(/has nowhere to take .* You keep it/i);
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
  });
});
