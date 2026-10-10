/**
 * ⭐⭐ **What can be seen from here** (maritime D24) — `look` at a room
 * appends the outside description of every landmark its zone walk names,
 * then each `RoomContributor`'s line, as their own uncarded bodies.
 *
 * The tower is described ONCE, on the tower; three zones naming it read
 * the same sentence; an authored `[]` is an answer and stops the walk.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LookController from '../LookController';
import Vantage from '../../../../thing/Vantage';
import StructureCatalogue from '../../../StructureCatalogue';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { MessageApi } from '../../../../../api/message';
import type { Mml } from '../../../../../api/mml';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { Stuff } from '../../../../../lib/stuff/Stuff';
import Location from '../../../../../lib/stuff/Location';
import { Template } from '../../../../../lib/stuff/Template';
import { SpatialZone } from '../../../../../lib/zone/SpatialZone';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { TemplatePaths } from '../../../../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';

const TOWER = '/test/landmark/tower/structure';
const AVENUE = '/test/landmark/avenue/street';
const STAIR = '/test/landmark/tower/stair';
const BAY = '/test/landmark/expanse/bay';

class Room extends VisibleMixin(NamedMixin(ContainerMixin(Location))) {
  static _mixinName = 'LandmarkRoom';
}
class Region extends SpatialZone {}
class Viewer extends SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))) {
  static _mixinName = 'LandmarkViewer';
}

let viewer: Viewer;

function room(path: string, landmarks: string[] | null): Room {
  const r = makeStuffAtPath(() => {
    const x = new Room();
    x.setName(path.split('/').pop()!);
    x.setLongDescription('Cobbles.');
    return x;
  }, path);
  const zone = makeStuff(() => new Region());
  zone.setVisibleLandmarks(landmarks);
  Stuff._stampZone(r, zone);
  return r;
}

async function lookBodies(where: Room): Promise<string[]> {
  ContainmentApi.move(viewer as never, where as never);
  const bodies: string[] = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.meta = () => b;
    b.toSelf = (body: Mml) => {
      bodies.push(body.toString());
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  const c: CommandContext = CommandApi.createCommandContext({
    commandGiver: viewer as never,
    location: where as never,
    commandText: 'look',
    executionId: 't',
    commandId: 't',
    verb: 'look',
    command: CommandDefinition.fromYaml(
      'verbs: [look]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
  await withRootContext(null, 'landmark.test', () => {
    ExecutionContextApi.tagActingAuthor(viewer as never);
    return makeStuff(() => new LookController()).execute(
      { target: { stuff: where, raw: '' } } as never,
      c,
    );
  });
  vi.mocked(MessageApi.scene).mockRestore();
  return bodies;
}

beforeEach(() => {
  StuffApi.clearAll();
  makeStuffAtPath(() => new StructureCatalogue(), TemplatePaths.structureCatalogue);
  vi.spyOn(Template, 'findByClass').mockResolvedValue([
    {
      path: TOWER,
      data: {
        extent: '/test/landmark/tower',
        outsideDescription: 'Over the rooftops the clock tower shows its face.',
        heightM: 25,
      },
    } as unknown as Template,
  ]);
  vi.spyOn(Template, 'findByPaths').mockImplementation(async (paths) =>
    paths.includes(BAY)
      ? [{ path: BAY, data: { outsideDescription: 'The bay lies open below.' } } as unknown as Template]
      : [],
  );
  viewer = makeStuffAtPath(() => {
    const v = new Viewer();
    v.setName('viewer');
    return v;
  }, '/platform/agent/Avatar/viewer');
});

afterEach(() => vi.restoreAllMocks());

const TOWER_LINE = 'Over the rooftops the clock tower shows its face.';

describe('the landmark walk', () => {
  it('a zone naming a landmark reads its outside description, once, as its own body', async () => {
    const bodies = await lookBodies(room(AVENUE, [TOWER]));
    expect(bodies.filter((b) => b.includes(TOWER_LINE))).toEqual([TOWER_LINE]);
  });

  it('three zones naming it read the same sentence', async () => {
    for (const p of ['/test/landmark/a/r', '/test/landmark/b/r', '/test/landmark/c/r']) {
      expect((await lookBodies(room(p, [TOWER]))).join('\n')).toContain(TOWER_LINE);
    }
  });

  it('⭐ an authored [] is an answer: nothing is visible from here', async () => {
    expect((await lookBodies(room('/test/landmark/hall/r', []))).join('\n')).not.toContain(TOWER_LINE);
  });

  it('you do not see the tower from inside the tower', async () => {
    expect((await lookBodies(room(STAIR, [TOWER]))).join('\n')).not.toContain(TOWER_LINE);
  });
});

describe('the vantage', () => {
  it('a vantage contributes the outside of what it overlooks to the room', async () => {
    const headland = room('/test/landmark/headland/top', null);
    const v = makeStuffAtPath(() => {
      const x = new Vantage();
      x.setOverlooks([BAY]);
      return x;
    }, '/test/landmark/headland/thing/vantage');
    ContainmentApi.move(v as never, headland as never);
    const bodies = await lookBodies(headland);
    expect(bodies).toContain('The bay lies open below.');
  });
});
