/**
 * Passive hints (Phase 3, D5) — the "something sits oddly" nudge that
 * directs attention without revealing. Asserts:
 *   - a concealed-but-close thing (`requirement − effectivePerception ≤
 *     concealment.hintCutoff`) surfaces as a hint;
 *   - a buried / too-deep thing does NOT (gap beyond the cutoff);
 *   - honest fog: a hint carries the authored *tell* to the wire, but
 *     NEVER the hidden thing's identity (name / stuffId).
 *
 * The cold viewer keeps a belief store but is not a Sensor/Perception, so
 * the light term is a clean 0 and effective perception is exactly the
 * (floor) capacity + passive baseline = 0 — the ladder is a clean function
 * of the concealment band against the seeded-literal dials (subtle 2,
 * hidden 4, deep 7, buried 11; cutoff 4).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import LookController from '../../obj/command/perception/LookController';
import { PerceptionApi } from '../../api/perception';
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
import { makeStuff, makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

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

class Item extends ConcealableMixin(
  ContainableMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {}

// Distinctive tokens so the wire-shape assertions are unambiguous.
const CLOSE_NAME = 'closehiddenitemzz';
const CLOSE_TELL = 'afaintdraftzz';
const DEEP_NAME = 'deepburiedcachezz';

let counter = 0;
function makeItem(name: string, level: 'subtle' | 'hidden' | 'deep' | 'buried'): Item {
  const it = makeStuffAtPath(() => new Item(), `/obj/test/hint-item-${counter++}`);
  it.setName(name);
  it.setShortDescription(name);
  it.setConcealment(level);
  return it;
}

function stubLook(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [look]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

async function runLook(viewer: Viewer, room: Room): Promise<string> {
  viewer.received.length = 0;
  const controller = makeStuff(() => new LookController());
  const ctx: CommandContext = CommandApi.createCommandContext({
    commandGiver: viewer as never,
    location: room as never,
    commandText: 'look',
    executionId: 'test',
    commandId: 'test',
    verb: 'look',
    command: stubLook(),
  });
  await controller.execute(
    { target: { stuff: room as unknown as Stuff, raw: 'here' } } as CommandModel,
    ctx,
  );
  return JSON.stringify(viewer.received);
}

describe('passive hints — close hints, deep does not', () => {
  let viewer: Viewer;
  let room: Room;
  let close: Item;
  let deep: Item;

  beforeEach(() => {
    StuffApi.clearAll();
    room = makeStuff(() => new Room());
    room.setName('Study');
    room.setLongDescription('A cluttered study.');

    viewer = makeStuff(() => new Viewer());
    viewer.setName('Seeker');
    ContainmentApi.move(viewer, room as never);

    // Close: subtle (req 2) — gap 2 ≤ cutoff 4 → a hint; carries a tell.
    close = makeItem(CLOSE_NAME, 'subtle');
    close.setConcealmentHint(CLOSE_TELL);
    ContainmentApi.move(close as never, room as never);

    // Deep: buried (req 11) — gap 11 > cutoff 4 → NOT a hint.
    deep = makeItem(DEEP_NAME, 'buried');
    ContainmentApi.move(deep as never, room as never);
  });

  it('hintsFor includes the close thing, excludes the buried one', () => {
    const hinted = PerceptionApi.hintsFor(viewer as never, [
      close as never,
      deep as never,
    ]).map((s) => s.stuffId);
    expect(hinted).toContain(close.stuffId);
    expect(hinted).not.toContain(deep.stuffId);
  });

  it('a discovered thing is no longer a hint', () => {
    PerceptionApi.recordDiscovery(viewer as never, close as never);
    const hinted = PerceptionApi.hintsFor(viewer as never, [close as never]).map(
      (s) => s.stuffId,
    );
    expect(hinted).not.toContain(close.stuffId);
  });

  it('the look frame carries the authored tell but NOT the hidden identity', async () => {
    const frame = await runLook(viewer, room);
    // The tell is surfaced (attention directed)…
    expect(frame).toContain(CLOSE_TELL);
    // …but the concealed thing's identity never reaches the wire.
    expect(frame).not.toContain(CLOSE_NAME);
    expect(frame).not.toContain(close.stuffId);
    // The too-deep thing produces no hint and no identity leak either.
    expect(frame).not.toContain(DEEP_NAME);
    expect(frame).not.toContain(deep.stuffId);
  });
});
