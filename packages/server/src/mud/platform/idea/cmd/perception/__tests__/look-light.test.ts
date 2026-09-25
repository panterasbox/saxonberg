/**
 * ⭐⭐ **`look` narrates the light** (envelope D10) — the thing that makes
 * acceptance 1 true with nothing authored anywhere: the same room at
 * noon and at midnight renders two different things.
 *
 * Three behaviours, and the second is the one that matters:
 *
 *   1. At `lit` and `bright` the room says nothing about its light.
 *      Light you only notice when there is too little of it or too much.
 *   2. ⚠ Below `dim` the room's authored description is **withheld** and
 *      the band's own sentence is all you get, plus the exits — because
 *      you can feel along a wall for a door in the pitch dark. A
 *      description is what you can SEE.
 *   3. **No card opens in the dark.** A card is a view of what you
 *      perceive, and you perceive nothing of the place.
 *
 * ⚠⚠ The light line rides its own UNCARDED scene, which is why the
 * bodies are collected separately here rather than joined. Everything
 * folded into the room body is handed to `CardApi.open` as `prose` and
 * then suppressed from the transcript in favour of a card that renders
 * FIELDS and never the handed prose — so a room-level line folded in
 * reaches the wire and is invisible in a browser. The trades-and-labor
 * drive found that for the help-wanted sign; it is not repeated here.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LookController from '../LookController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { MessageApi } from '../../../../../api/message';
import { CardApi } from '../../../../../api/card';
import type { Mml } from '../../../../../api/mml';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import CartesianLocation from '../../../../../lib/location/CartesianLocation';
import CartesianZone from '../../../location/CartesianZone';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { PerceptionMixin } from '../../../../../lib/perception/Perception';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../../lib/perception/modalities/__tests__/test-helpers';

const ROOM = '/stuff/test/light/location/cellar';
const ALICE = '/platform/agent/Avatar/light-alice';
const DESCRIPTION = 'Barrels stand in ranks against the far wall.';

// `CartesianLocation` already composes `AmbientLit` (every `Location`
// does) and `Visible`; it does not compose `Named`, and `Mml.location`
// wants a name.
class Room extends NamedMixin(CartesianLocation) {
  static _mixinName = 'LightTestRoom';
}
class Looker extends PerceptionMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'LightTestLooker';
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
    command: CommandDefinition.fromYaml(
      'verbs: [look]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

/** Every `toSelf` body `look` put on the wire, separately. */
async function lookBodies(): Promise<string[]> {
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
  await withRootContext(null, 'light.test', () => {
    ExecutionContextApi.tagActingAuthor(alice as never);
    return makeStuff(() => new LookController()).execute(
      { target: { stuff: room, raw: '' } } as never,
      ctx(),
    );
  });
  return bodies;
}

const lookText = async (): Promise<string> => (await lookBodies()).join('\n');

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityTagTables();
  buildAllModalities();
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  room = makeStuffAtPath(() => new Room(), ROOM) as Room;
  room.setName('the cellar');
  room.setLongDescription(DESCRIPTION);
  zone.addLocation(room as never, 0, 0, 0);
  alice = makeStuffAtPath(() => {
    const a = new Looker();
    a.setName('alice');
    return a;
  }, ALICE) as Looker;
  ContainmentApi.move(alice as never, room as never);
});

afterEach(() => vi.restoreAllMocks());

describe('a lit room says nothing about its light', () => {
  it('at `lit` there is no light line and the description is told in full', async () => {
    room.setAmbientFlux(30 * 9); // 30 lux on a 9 m² cell
    const text = await lookText();
    expect(text).toContain(DESCRIPTION);
    expect(text).not.toMatch(/pitch dark|Shapes and edges|It is dim|glare/);
  });

  it('at `blinding` it says the glare is hard to look into, and still describes the place', async () => {
    room.setAmbientFlux(300 * 9);
    const text = await lookText();
    expect(text).toContain(DESCRIPTION);
    expect(text).toMatch(/glare here is hard to look into/);
  });
});

describe('⭐⭐ a dark room withholds its description', () => {
  it('pitch dark: the phrase, and NOT the prose somebody authored', async () => {
    // No ambient, no emitter, no exit — genuinely zero photons.
    const text = await lookText();
    expect(text).toMatch(/It is pitch dark/);
    expect(text).not.toContain(DESCRIPTION);
    expect(text).not.toContain('the cellar');
  });

  it('very dim: shapes and edges, and still not the prose', async () => {
    room.setAmbientFlux(2 * 9); // 2 lux — a full moon outdoors
    const text = await lookText();
    expect(text).toMatch(/Shapes and edges/);
    expect(text).not.toContain(DESCRIPTION);
  });

  it('dim: the line AND the description — you can make the place out', async () => {
    room.setAmbientFlux(10 * 9);
    const text = await lookText();
    expect(text).toMatch(/It is dim here/);
    expect(text).toContain(DESCRIPTION);
  });

  it('⚠ no card opens in the dark — a card is a view of what you perceive', async () => {
    const open = vi.spyOn(CardApi, 'open');
    await lookBodies();
    expect(open).not.toHaveBeenCalled();

    open.mockClear();
    room.setAmbientFlux(30 * 9);
    await lookBodies();
    expect(open).toHaveBeenCalled();
  });

  it('⭐ the light line is its OWN body, never folded into the carded room prose', async () => {
    room.setAmbientFlux(10 * 9); // `dim`: a line AND a room render
    const bodies = await lookBodies();
    const lightLine = bodies.find((b) => /It is dim here/.test(b));
    expect(lightLine).toBeDefined();
    // The line stands alone: if it were folded into the room body it
    // would carry the description with it, and be suppressed with it.
    expect(lightLine).not.toContain(DESCRIPTION);
  });
});
