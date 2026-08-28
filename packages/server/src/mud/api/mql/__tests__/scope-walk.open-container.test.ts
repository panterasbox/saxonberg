/**
 * The `peers` scope reaches ONE level into an open container standing in
 * the room — and not into a shut one, and never into somebody.
 *
 * `get`'s help had promised "name it and `get` reaches in" while its
 * `peers` scope saw only the room's direct contents: the libations live
 * drive watched every floor hand's `get ale` at its own stock decline
 * `empty-result`, and a player could no more take a coupe off the rack.
 * `MqlApi.isOpenPeerContainer` is the one predicate the scope and
 * `mustBeInLocation` share, so they cannot disagree about reach.
 */
import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { MqlApi } from '../../mql';
import { PerceptionMixin } from '../../../lib/perception/Perception';
import { SensorMixin } from '../../../lib/message/Sensor';
import { VisibleMixin } from '../../../lib/description/Visible';
import { PerceptibleMixin } from '../../../lib/description/Perceptible';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { SealableMixin } from '../../../lib/spatial/Sealable';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainmentApi } from '../../containment';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { MqlContext } from '../types';

class Room extends ContainerMixin(Idea) {}
class Viewer extends PerceptionMixin(SensorMixin(ContainableMixin(Idea))) {}
class Rack extends ContainerMixin(VisibleMixin(PerceptibleMixin(ContainableMixin(Idea)))) {}
class Chest extends SealableMixin(
  ContainerMixin(VisibleMixin(PerceptibleMixin(ContainableMixin(Idea)))),
) {}
class Somebody extends CommandGiverMixin(
  ContainerMixin(VisibleMixin(PerceptibleMixin(ContainableMixin(Idea)))),
) {}
class Coupe extends VisibleMixin(PerceptibleMixin(ContainableMixin(Idea))) {}

function coupe(): Coupe {
  const c = makeStuff(() => new Coupe());
  c.setShortDescription('a coupe');
  c.setKeywords(['coupe']);
  return c;
}
function ctx(viewer: Viewer): MqlContext {
  return { commandGiver: viewer as never, scope: 'peers' };
}
const found = (viewer: Viewer): string[] =>
  MqlApi.resolveMany('peers:coupe', ctx(viewer)).stuff.map((s) => s.stuffId);

describe('MQL peers — one level into an open container', () => {
  it('sees a coupe in an open rack standing in the room', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const rack = makeStuff(() => new Rack());
    rack.setShortDescription('a rack');
    const glass = coupe();
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(rack, room);
    ContainmentApi.move(glass, rack);
    expect(found(viewer)).toContain(glass.stuffId);
    expect(MqlApi.isOpenPeerContainer(rack)).toBe(true);
  });

  it('does not see into a shut chest — and does once it is opened', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const chest = makeStuff(() => new Chest());
    chest.setShortDescription('a chest');
    chest.setOpen(false);
    const glass = coupe();
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(chest, room);
    ContainmentApi.move(glass, chest);
    expect(found(viewer)).not.toContain(glass.stuffId);
    chest.setOpen(true);
    expect(found(viewer)).toContain(glass.stuffId);
  });

  it("never reaches into somebody else's inventory", () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const other = makeStuff(() => new Somebody());
    other.setShortDescription('a patron');
    const glass = coupe();
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(other, room);
    ContainmentApi.move(glass, other);
    expect(found(viewer)).not.toContain(glass.stuffId);
    expect(MqlApi.isOpenPeerContainer(other)).toBe(false);
  });
});
