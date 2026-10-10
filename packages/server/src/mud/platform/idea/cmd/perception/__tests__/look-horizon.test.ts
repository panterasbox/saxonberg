/**
 * ⭐ `look horizon` (maritime R5) — the horizon surveyed like a room:
 * what is FEATURED first (a landmark, or what this room's author
 * features), then *"You can also make out …"*, and at sea the passers-by
 * in words. ⛔ And a plain `look` appends nothing from outside the room.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LookController from '../LookController';
import Structure from '../../../Structure';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { PerceptionApi, type HorizonView } from '../../../../../api/perception';
import type { Mml } from '../../../../../api/mml';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';

class Room extends VisibleMixin(NamedMixin(ContainerMixin(Location))) {
  static _mixinName = 'HorizonRoom';
}
class Viewer extends SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))) {
  static _mixinName = 'HorizonViewer';
}

let room: Room;
let viewer: Viewer;

function structure(path: string, short: string, landmark: boolean): Structure {
  return makeStuffAtPath(() => {
    const s = new Structure();
    s.setShortDescription(short);
    s.setRegister('definite');
    s.setLandmark(landmark);
    return s;
  }, path);
}

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: viewer as never,
    location: room as never,
    commandText: 'look horizon',
    executionId: 't',
    commandId: 't',
    verb: 'look',
    command: CommandDefinition.fromYaml(
      'verbs: [look]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

async function lookHorizon(view: HorizonView): Promise<string[]> {
  vi.spyOn(PerceptionApi, 'horizonFor').mockResolvedValue(view);
  const bodies: string[] = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => { bodies.push(body.toString()); return b; };
    b.toPeers = () => b;
    b.meta = () => b;
    b.send = () => {};
    return b as never;
  });
  await withRootContext(null, 'horizon.test', () =>
    makeStuff(() => new LookController()).execute(
      { target: { stuff: null, raw: 'horizon' } } as never,
      ctx(),
    ),
  );
  return bodies;
}

beforeEach(() => {
  StuffApi.clearAll();
  room = makeStuffAtPath(() => new Room(), '/t/look/room');
  viewer = makeStuff(() => new Viewer());
});
afterEach(() => vi.restoreAllMocks());

describe('look horizon', () => {
  it('⭐ features the landmark first, then makes out the rest', async () => {
    const tower = structure('/t/tower', 'clock tower', true);
    const mill = structure('/t/mill', 'windmill', false);
    const out = await lookHorizon({
      things: [
        { stuff: mill, bearingDeg: null, rangeNm: null },
        { stuff: tower, bearingDeg: null, rangeNm: null },
      ],
      traffic: [],
      atSea: false,
    });
    // One reading, one scene: featured first, then the rest.
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/You can see [^\n]*clock tower[^\n]*\nYou can also make out [^\n]*windmill/);
  });

  it('a room may feature what is not a landmark', async () => {
    const mill = structure('/t/mill', 'windmill', false);
    room.setFeatured(['/t/mill']);
    const out = await lookHorizon({ things: [{ stuff: mill, bearingDeg: null, rangeNm: null }], traffic: [], atSea: false });
    expect(out[0]).toMatch(/You can see .*windmill/);
  });

  it('at sea: a compass point and a rough range, and the passers-by in words', async () => {
    const brig = structure('/t/brig', 'brig', false);
    const out = await lookHorizon({
      things: [{ stuff: brig, bearingDeg: 44, rangeNm: 3.2 }],
      traffic: [{ name: 'a fishing boat', bearingDeg: 181, rangeNm: 0.5 }],
      atSea: true,
    });
    expect(out.join('\n')).toMatch(/brig.*to the north-east, some 3 miles off/);
    expect(out.join('\n')).toMatch(/a fishing boat, to the south, close by/);
    expect(out.join('\n')).not.toMatch(/°|\b044\b/);
  });

  it('nothing beyond: says so', async () => {
    const out = await lookHorizon({ things: [], traffic: [], atSea: false });
    expect(out).toEqual(['Nothing beyond where you stand catches the eye.']);
  });
});
