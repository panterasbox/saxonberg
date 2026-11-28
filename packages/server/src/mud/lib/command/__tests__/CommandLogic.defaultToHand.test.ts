/**
 * ⭐ A tool default is what you CARRY, used where it sits (size and carrying
 * D-W10-1/-7; finalize run 16). The 31 tool views default their tool to
 * `~person:[…]` — the on-person pool, the whole carried tree (since W9 a
 * pouch's thing is the POUCH's contents; `me:i` read the top level) — and
 * declare `canReach`; the binder narrows such a
 * defaulted slot to what is to hand (an open medic's pouch on the belt is,
 * a shut one is not). When none of the pool is to hand it binds the pool as
 * though named, so `canReach` says why: *"Your medic's pouch is shut —
 * `open pouch` first."*
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandDefinition } from '../CommandDefinition';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, wornBag } from '../../slot/__tests__/carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../place/Location';
import canReach from '../validators/canReach';
import type { Stuff } from '../../stuff/Stuff';

const view = (validators: boolean, type: 'object' | 'objects' = 'object'): CommandDefinition =>
  CommandDefinition.fromYaml(
    `verbs: [stitch]
controller: StitchController
description: stub
args:
  - name: kit
    type: ${type}
    required: false
    prepositions: [with]
    default: "~person:bandage"
    scope: ["~reachable"]
${validators ? '    validators:\n      - /lib/command/validators/canReach\n' : ''}`,
    '<test>',
  );

function healer() {
  const room = makeStuff(() => new Location());
  const { me, plan } = makeBody();
  ContainmentApi.move(me, room);
  const pouch = wornBag(me, plan, 'pouch', 'waist');
  const bandage = tool('bandage', 0.05);
  ContainmentApi.move(bandage, pouch);
  return { room, me, plan, pouch, bandage };
}

async function bind(me: Stuff, room: Stuff, cmd: CommandDefinition): Promise<{ stuff: unknown; defaulted?: true }> {
  const ctx = CommandApi.createCommandContext({
    commandGiver: me as never,
    location: room as never,
    commandText: 'stitch',
    executionId: 'test',
    commandId: 'test',
    verb: 'stitch',
    command: cmd,
  });
  const r = await CommandApi.resolveModel({ kit: '~person:bandage' }, ctx);
  if (!('resolved' in r) || r.resolved === undefined) throw new Error('did not resolve');
  return r.resolved.kit as { stuff: unknown; defaulted?: true };
}

describe('a defaulted tool slot that declares canReach is used where it sits', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ the bandage in the open pouch on the belt binds by default', async () => {
    const { room, me, bandage } = healer();
    const kit = await bind(me, room, view(true));
    expect(kit.stuff).toBe(bandage);
  });

  it('⭐ shut, the pool binds as though named and `canReach` names `open pouch`', async () => {
    const { room, me, pouch, bandage } = healer();
    pouch.setOpen(false);
    const kit = await bind(me, room, view(true));
    expect(kit.stuff).toBe(bandage);
    expect(kit.defaulted).toBeUndefined();
    const ctx = { commandGiver: me, location: room } as never;
    expect(canReach(kit, 'kit', ctx)).toBe('Your pouch is shut — `open pouch` first.');
    expect(pouch.isOpen()).toBe(false);
  });

  it('⭐ one shut away and one to hand: the one to hand is bound, never the shut one', async () => {
    const { room, me, plan, pouch, bandage } = healer();
    pouch.setOpen(false);
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const spare = tool('bandage', 0.05);
    ContainmentApi.move(spare, satchel);
    const kit = await bind(me, room, view(true));
    expect(kit.stuff).toBe(spare);
    expect(kit.stuff).not.toBe(bandage);
  });

  it('a list slot narrows to what is to hand and stays `defaulted`', async () => {
    const { room, me, plan, pouch, bandage } = healer();
    const pack = wornBag(me, plan, 'rucksack', 'back');
    const packed = tool('bandage', 0.05);
    ContainmentApi.move(packed, pack);
    const kit = await bind(me, room, view(true, 'objects'));
    expect(kit.stuff).toEqual([bandage]);
    expect(kit.defaulted).toBe(true);
    expect(pouch.isOpen()).toBe(true);
  });

  it('without `canReach` the default is not narrowed (the def predicts it)', async () => {
    const { room, me, plan } = healer();
    const pack = wornBag(me, plan, 'rucksack', 'back');
    ContainmentApi.move(tool('bandage', 0.05), pack);
    const kit = await bind(me, room, view(false, 'objects'));
    expect((kit.stuff as Stuff[]).length).toBe(2);
  });
});
