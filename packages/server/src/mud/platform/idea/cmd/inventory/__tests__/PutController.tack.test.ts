/**
 * ⭐ Tack goes on by `put <tack> on <beast>` (size and carrying D-W10-8): a
 * body with no hands (a mule — it cannot dress itself) takes a slot claim
 * from `put`; a person is still refused; and HANDING tack is refused in the
 * beast's own answer — a mule does not saddle itself.
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

  it('`give saddle to mule` is refused `nowhere-to-carry`, in the third person; you keep it', async () => {
    const { room, me, mule, saddle } = scene();
    const c = ctx(me, room, 'give');
    await makeStuff(() => new GiveController()).execute(
      { item: one(saddle, 'saddle'), recipient: one(mule, 'mule', 'to') } as ModelData as never,
      c,
    );
    expect(mule.getOccupants('back').has(saddle)).toBe(false);
    expect(me.tierOf(saddle)).toBe('hand');
    expect(said.join('\n')).toMatch(/has nowhere to take/i);
  });

  it('a refused give re-seats into the hand it left — not the first free one', async () => {
    const { room, me, plan, mule, saddle } = scene();
    // The saddle in the first hand; the knife in the right.
    ContainmentApi.move(saddle, room);
    const knife = hold(me, plan, tool('knife', 0.3), 'hand:right');
    await makeStuff(() => new GiveController()).execute(
      { item: one(knife, 'knife'), recipient: one(mule, 'mule', 'to') } as ModelData as never,
      ctx(me, room, 'give'),
    );
    expect(me.getOccupants('hand:right').has(knife)).toBe(true);
    expect(me.getOccupants('hand:left').has(knife)).toBe(false);
  });
});
