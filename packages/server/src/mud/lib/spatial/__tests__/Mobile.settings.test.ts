/**
 * Phase E migration tests — verify movement-message settings behave
 * correctly when the mover composes EnvironmentMixin (Avatar path)
 * and when it does not (NPC path).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MobileMixin } from '../Mobile';
import { ContainableMixin } from '../Containable';
import { ContainerMixin } from '../Container';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { EnvironmentMixin } from '../../shell/Environment';
import { CartesianZone } from '../CartesianZone';
import { CartesianLocation } from '../CartesianLocation';
import { Stuff } from '../../stuff/Stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';

const NpcBase = NamedMixin(
  MobileMixin(SensorMixin(ContainerMixin(ContainableMixin(Stuff)))),
);
class Npc extends NpcBase {
  received: MessageFrame[] = [];
  protected override handleMessage(msg: MessageFrame): void {
    this.received.push(msg);
  }
}

const AvatarLikeBase = EnvironmentMixin(
  NamedMixin(
    MobileMixin(SensorMixin(ContainerMixin(ContainableMixin(Stuff)))),
  ),
);
class AvatarLike extends AvatarLikeBase {
  received: MessageFrame[] = [];
  protected override handleMessage(msg: MessageFrame): void {
    this.received.push(msg);
  }
}

describe('Mobile movement-message settings (Phase E)', () => {
  let zone: CartesianZone;
  let roomA: CartesianLocation;
  let roomB: CartesianLocation;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    roomA = makeStuff(() => new CartesianLocation());
    roomA.shortDescription = 'A';
    roomB = makeStuff(() => new CartesianLocation());
    roomB.shortDescription = 'B';
    zone.addRoom(roomA, 0, 0, 0);
    zone.addRoom(roomB, 0, 1, 0);
  });

  it('NPC (no EnvironmentMixin) renders the schema default', () => {
    const npc = makeStuff(() => new Npc());
    npc.name = 'Goblin';
    ContainmentApi.move(npc, roomA);

    // Teleport: arrival is rendered at schema default for the bland
    // case (no exit, no inverse direction). The render must not
    // throw, and the produced text must reflect the schema default.
    npc.teleport(roomB);

    const arrivalSelf = npc.received
      .map((f) => f.body ?? '')
      .filter((b) => b.includes('materialize') || b.includes('arrive'));
    expect(arrivalSelf.length).toBeGreaterThan(0);
  });

  it('Avatar override changes the self-perspective message', () => {
    const avatar = makeStuff(() => new AvatarLike());
    avatar.name = 'Hero';
    ContainmentApi.move(avatar, roomA);

    avatar.setSetting<string>(
      'messages.movement.teleportInSelf',
      'CUSTOM ARRIVAL',
      avatar,
    );
    avatar.received = [];

    avatar.teleport(roomB);

    const selfFrames = avatar.received
      .map((f) => f.body ?? '')
      .filter((b) => b.includes('CUSTOM ARRIVAL'));
    expect(selfFrames.length).toBeGreaterThan(0);
  });

  it('Avatar override does NOT bleed into peer messages', () => {
    const avatar = makeStuff(() => new AvatarLike());
    avatar.name = 'Hero';
    ContainmentApi.move(avatar, roomA);

    const peer = makeStuff(() => new Npc());
    peer.name = 'Bystander';
    ContainmentApi.move(peer, roomB);

    avatar.setSetting<string>(
      'messages.movement.teleportInSelf',
      'CUSTOM ARRIVAL',
      avatar,
    );
    peer.received = [];

    avatar.teleport(roomB);

    // Peer sees the avatar's *peer* message, not the self message.
    const peerBodies = peer.received.map((f) => f.body ?? '');
    expect(peerBodies.some((b) => b.includes('CUSTOM ARRIVAL'))).toBe(false);
    expect(peerBodies.some((b) => b.includes('Hero'))).toBe(true);
  });
});
