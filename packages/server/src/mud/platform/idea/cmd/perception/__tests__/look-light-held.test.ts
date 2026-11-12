/**
 * ⭐⭐ **`look` walks the light once per place, not once per thing**
 * (controller-liquidity /finalize — the potash drive's stall).
 *
 * Every thing a room lists, and every name the render prints, asks
 * `canSee`, and `canSee` asks for the light at the place. Without a hold
 * each ask walked the whole light graph again: quadratic in what the room
 * holds. A lean-to piled with ash heaps cost more than 30 s of CPU per
 * `look`, and every command behind it queued — a drive that could never
 * pass, on a world that seemed hung. `look` now holds the light steady
 * over its synchronous render (`PerceptionApi.holdLightSteady`, the hold
 * MQL resolution and the card refresh already take).
 *
 * The test is a SCALING test, not a count pinned to today's code: the
 * number of light walks one `look` makes may not grow with the number of
 * things in the room.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LookController from '../LookController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { MessageApi } from '../../../../../api/message';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/location/Location';
import CartesianZone from '../../../location/CartesianZone';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { PerceptionMixin } from '../../../../../lib/perception/Perception';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { Traversal } from '../../../../../lib/location/Traversal';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../../lib/perception/modalities/__tests__/test-helpers';

class Room extends NamedMixin(Location) {
  static _mixinName = 'HeldLightTestRoom';
}
class Heap extends VisibleMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'HeldLightTestHeap';
}
class Looker extends PerceptionMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'HeldLightTestLooker';
  handleMessage(): void {}
}

let room: Room;
let alice: Looker;

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: alice as never,
    location: room as never,
    commandText: 'look',
    executionId: 't',
    commandId: 't',
    verb: 'look',
    command: CommandDefinition.fromYaml('verbs: [look]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

/** Light walks one `look` makes in a room holding `n` heaps. */
async function walksFor(n: number): Promise<number> {
  for (let i = 0; i < n; i += 1) {
    const heap = makeStuff(() => new Heap());
    heap.setShortDescription(`heap of wood ash ${i}`);
    ContainmentApi.move(heap as never, room as never);
  }
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    for (const k of ['topic', 'meta', 'toSelf', 'toPeers']) b[k] = () => b;
    b.send = () => {};
    return b as never;
  });
  const walk = vi.spyOn(Traversal.prototype, 'walk');
  await withRootContext(null, 'held-light.test', () => {
    ExecutionContextApi.tagActingAuthor(alice as never);
    return makeStuff(() => new LookController()).execute({ target: { stuff: room, raw: '' } } as never, ctx());
  });
  const count = walk.mock.calls.length;
  vi.restoreAllMocks();
  return count;
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityTagTables();
  buildAllModalities();
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  room = makeStuffAtPath(() => new Room(), '/stuff/test/held-light/location/lean-to') as Room;
  room.setName('the lean-to');
  room.setLongDescription('An open-fronted shed against the wood.');
  room.setAmbientFlux(30 * 9);
  zone.addLocation(room as never, 0, 0, 0);
  alice = makeStuffAtPath(() => {
    const a = new Looker();
    a.setName('alice');
    return a;
  }, '/platform/agent/Avatar/held-light-alice') as Looker;
  ContainmentApi.move(alice as never, room as never);
});

afterEach(() => vi.restoreAllMocks());

describe('`look` holds the light steady while it describes a room', () => {
  it('⭐ forty heaps cost no more light walks than two', async () => {
    const few = await walksFor(2);
    StuffApi.clearAll();
    installV1QuantityTagTables();
    buildAllModalities();
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(3);
    room = makeStuffAtPath(() => new Room(), '/stuff/test/held-light/location/lean-to') as Room;
    room.setName('the lean-to');
    room.setLongDescription('An open-fronted shed against the wood.');
    room.setAmbientFlux(30 * 9);
    zone.addLocation(room as never, 0, 0, 0);
    alice = makeStuffAtPath(() => {
      const a = new Looker();
      a.setName('alice');
      return a;
    }, '/platform/agent/Avatar/held-light-alice') as Looker;
    ContainmentApi.move(alice as never, room as never);
    const many = await walksFor(40);
    expect(few, 'the walk was counted at all').toBeGreaterThan(0);
    expect(many, `2 heaps → ${few} walks, 40 heaps → ${many}`).toBeLessThanOrEqual(few + 2);
  });
});
