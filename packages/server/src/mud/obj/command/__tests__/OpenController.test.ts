import { describe, it, expect, beforeEach } from 'vitest';
import { OpenController } from '../OpenController';
import { CloseController } from '../CloseController';
import { GoController } from '../GoController';
import { CartesianZone } from '../../../lib/spatial/CartesianZone';
import { CartesianLocation } from '../../../lib/spatial/CartesianLocation';
import { Door } from '../../../lib/spatial/Door';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { Stuff } from '../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { NamedMixin } from '../../../lib/description/Named';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import type { Interactive } from '../../Interactive';
import type { Location } from '../../../lib/stuff/Location';
import type { CommandContext } from '../../../api/command';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

const FakeAvatarBase = NamedMixin(
  MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Stuff))))
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}
class PeerSensor extends NamedMixin(SensorMixin(ContainableMixin(Stuff))) {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function makeContext(
  avatar: FakeAvatar,
  location: Location,
  commandText: string
): CommandContext {
  return {
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText,
    executionId: 'test-execution',
    commandId: 'test-command-id',
  };
}

describe('OpenController / CloseController / doors integration', () => {
  let zone: CartesianZone;
  let roomA: CartesianLocation;
  let roomB: CartesianLocation;
  let avatar: FakeAvatar;
  let peerInA: PeerSensor;
  let door: Door;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    roomA = makeStuff(() => new CartesianLocation());
    roomA.shortDescription = 'Room A';
    roomB = makeStuff(() => new CartesianLocation());
    roomB.shortDescription = 'Room B';
    zone.addRoom(roomA, 0, 0, 0);
    zone.addRoom(roomB, 0, 1, 0);

    door = makeStuff(() => new Door());
    door.shortDescription = 'heavy oak door';
    door.keywords = ['oak'];
    roomA.addBidirectionalExit(roomB, 'north', { door });

    avatar = makeStuff(() => new FakeAvatar());
    avatar.name = 'Alice';
    ContainmentApi.move(avatar, roomA);

    peerInA = makeStuff(() => new PeerSensor());
    peerInA.name = 'Bob';
    ContainmentApi.move(peerInA, roomA);
  });

  it('go north fails while door is closed', () => {
    const go = new GoController();
    const result = go.execute(
      { target: 'north' },
      makeContext(avatar, roomA, 'go north')
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/closed/i);
    expect(result.summary).toContain('heavy oak door');
  });

  it('open <keyword> resolves via MQL and opens the door', () => {
    const open = new OpenController();
    const result = open.execute(
      { target: 'oak' },
      makeContext(avatar, roomA, 'open the oak door')
    );
    expect(result.success).toBe(true);
    expect(door.isOpen).toBe(true);
    expect(result.summary).toContain('heavy oak door');

    const peerText = JSON.stringify(peerInA.received);
    expect(peerText).toContain('Alice');
    expect(peerText).toContain('opens');
    expect(peerText).toContain('heavy oak door');

    // Mover gets a self frame ("You open ..."), not the peer broadcast
    // (which names the mover).
    const moverFrames = avatar.received as Array<{ body?: string }>;
    expect(moverFrames.length).toBe(1);
    expect(moverFrames[0]!.body).toContain('You open');
  });

  it('already-open door returns a friendly error', () => {
    door.open();
    const open = new OpenController();
    const result = open.execute(
      { target: 'oak' },
      makeContext(avatar, roomA, 'open the oak door')
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/already open/i);
  });

  it('no sealable matching the name: clear error', () => {
    const open = new OpenController();
    const result = open.execute(
      { target: 'bathtub' },
      makeContext(avatar, roomA, 'open bathtub')
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/don't see/i);
  });

  it('go north succeeds after opening; close from destination closes same door', () => {
    new OpenController().execute(
      { target: 'oak' },
      makeContext(avatar, roomA, 'open the oak door')
    );
    const go = new GoController().execute(
      { target: 'north' },
      makeContext(avatar, roomA, 'go north')
    );
    expect(go.success).toBe(true);
    expect(avatar.getContainer()).toBe(roomB);

    const close = new CloseController().execute(
      { target: 'oak' },
      makeContext(avatar, roomB, 'close the oak door')
    );
    expect(close.success).toBe(true);
    expect(door.isOpen).toBe(false);

    // Both sides share the same Door instance — going south is now blocked.
    const goBack = new GoController().execute(
      { target: 'south' },
      makeContext(avatar, roomB, 'go south')
    );
    expect(goBack.success).toBe(false);
    expect(goBack.summary).toMatch(/closed|way/i);
  });

  it('already-closed door on close returns friendly error', () => {
    const close = new CloseController();
    const result = close.execute(
      { target: 'oak' },
      makeContext(avatar, roomA, 'close the oak door')
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/already closed/i);
  });
});
