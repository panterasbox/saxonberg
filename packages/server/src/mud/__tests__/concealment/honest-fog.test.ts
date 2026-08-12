/**
 * Honest fog (Phase 2, D4) — the wire-shape assertion. A concealed,
 * undiscovered thing is absent from a low-perception viewer's world at the
 * server: it appears in **no** `look`-emitted frame, **no** MQL match set,
 * and **no** wire projection. After `recordDiscovery`, it appears in all
 * three. This is the no-metagaming proof — the client never receives data
 * about a thing the player can't perceive.
 *
 * Driven through the real paths (not mocks): the `LookController` render,
 * `MqlApi` scope resolution (scope-walk → `perceives`), and the
 * `ContainerMixin` `contents` subscribable-field projection.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import LookController from '../../obj/command/perception/LookController';
import { MqlApi } from '../../api/mql';
import { PerceptionApi } from '../../api/perception';
import {
  collectSubscribableFields,
  REF_FIELDS,
} from '../../api/mql-subscription';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../api/command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import { Idea } from '../../lib/stuff/Idea';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ConcealableMixin } from '../../lib/concealment/Concealable';
import { DetailedMixin } from '../../lib/description/Detailed';
import { VisibleMixin } from '../../lib/description/Visible';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { SensorMixin } from '../../lib/message/Sensor';
import { FocusedMixin } from '../../lib/command/Focused';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { PerceptionMixin } from '../../lib/perception/Perception';
import { BeliefStoreMixin } from '../../lib/belief/BeliefStore';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

// A viewer that runs commands, keeps a belief store + perception, and
// records the frames it receives (the Vocal-test capture idiom).
class Viewer extends BeliefStoreMixin(
  PerceptionMixin(
    CommandGiverMixin(
      FocusedMixin(
        SensorMixin(
          ContainerMixin(
            ContainableMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
          ),
        ),
      ),
    ),
  ),
) {
  public received: unknown[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame);
  }
}

class Room extends ContainerMixin(
  DetailedMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {}

// A concealable item (a Thing-shaped perceivable).
class Item extends ConcealableMixin(
  ContainableMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {}

const SECRET_TOKEN = 'quxsecretcache';
const OBVIOUS_TOKEN = 'zibvisiblelamp';

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [look]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function lookContext(viewer: Viewer, room: Room): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: viewer as never,
    location: room as never,
    commandText: 'look',
    executionId: 'test',
    commandId: 'test',
    verb: 'look',
    command: stubCommand(),
  });
}

async function runLook(viewer: Viewer, room: Room): Promise<string> {
  viewer.received.length = 0;
  const controller = makeStuff(() => new LookController());
  await controller.execute(
    { target: { stuff: room as unknown as Stuff, raw: 'here' } } as CommandModel,
    lookContext(viewer, room),
  );
  return JSON.stringify(viewer.received);
}

/** The wire projection of the room's `contents` field for `viewer`. */
function projectContents(room: Room, viewer: Viewer): Array<Record<string, unknown>> {
  const descriptor = collectSubscribableFields(room as unknown as Stuff).get(
    'contents',
  );
  const value = descriptor!.read!(room as unknown as Stuff, viewer as never);
  return value as Array<Record<string, unknown>>;
}

describe('honest fog — a concealed thing is absent until discovered', () => {
  let viewer: Viewer;
  let room: Room;
  let secret: Item;
  let lamp: Item;

  beforeEach(() => {
    StuffApi.clearAll();
    room = makeStuff(() => new Room());
    room.setName('Vault');
    room.setLongDescription('A bare stone vault.');

    viewer = makeStuff(() => new Viewer());
    viewer.setName('Seeker');
    ContainmentApi.move(viewer, room as never);

    // A buried secret (requirement 11 — unreachable by a cold, passive
    // zero-awareness viewer, so it stays hidden until discovered).
    secret = makeStuffAtPath(() => new Item(), '/obj/test/secret-crate');
    secret.setName(SECRET_TOKEN);
    secret.setShortDescription(SECRET_TOKEN);
    secret.setConcealment('buried');
    ContainmentApi.move(secret as never, room as never);

    // An obvious control item — proves the paths actually surface contents.
    lamp = makeStuff(() => new Item());
    lamp.setName(OBVIOUS_TOKEN);
    lamp.setShortDescription(OBVIOUS_TOKEN);
    ContainmentApi.move(lamp as never, room as never);
  });

  it('the gate hides the buried secret from the cold viewer', () => {
    expect(PerceptionApi.perceives(viewer, secret as never)).toBe(false);
    expect(PerceptionApi.perceives(viewer, lamp as never)).toBe(true);
  });

  it('the concealed thing appears in NO look frame, NO MQL match, NO projection', async () => {
    // 1) look frame.
    const frame = await runLook(viewer, room);
    expect(frame).toContain(OBVIOUS_TOKEN); // the render did surface contents
    expect(frame).not.toContain(SECRET_TOKEN);
    expect(frame).not.toContain(secret.stuffId);

    // 2) MQL scope resolution (scope-walk → perceives). The concealed
    // keyword resolves to nothing; the obvious one resolves to the lamp.
    const lampHits = MqlApi.resolveMany(OBVIOUS_TOKEN, {
      commandGiver: viewer as never,
      scope: 'reachable',
    }).stuff.map((s) => s.stuffId);
    const secretHits = MqlApi.resolveMany(SECRET_TOKEN, {
      commandGiver: viewer as never,
      scope: 'reachable',
    }).stuff.map((s) => s.stuffId);
    expect(lampHits).toContain(lamp.stuffId);
    expect(secretHits).not.toContain(secret.stuffId);

    // 3) wire projection of the room contents.
    const projected = projectContents(room, viewer);
    const projectedIds = projected.map((p) => p.stuffId);
    expect(projectedIds).toContain(lamp.stuffId);
    expect(projectedIds).not.toContain(secret.stuffId);
  });

  it('after recordDiscovery, the concealed thing appears in all three', async () => {
    PerceptionApi.recordDiscovery(viewer, secret as never);
    expect(PerceptionApi.perceives(viewer, secret as never)).toBe(true);

    const frame = await runLook(viewer, room);
    expect(frame).toContain(SECRET_TOKEN);

    const secretHits = MqlApi.resolveMany(SECRET_TOKEN, {
      commandGiver: viewer as never,
      scope: 'reachable',
    }).stuff.map((s) => s.stuffId);
    expect(secretHits).toContain(secret.stuffId);

    const projectedIds = projectContents(room, viewer).map((p) => p.stuffId);
    expect(projectedIds).toContain(secret.stuffId);
  });
});

// Keep REF_FIELDS referenced so the import is meaningful even if the
// projection descriptor's default field-set changes shape.
void REF_FIELDS;
