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
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import { Stuff } from '../../stuff/Stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from "../../stuff/Idea";

const NpcBase = NamedMixin(
  MobileMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
);
class Npc extends NpcBase {
  received: MessageFrame[] = [];
  protected override handleMessage(msg: MessageFrame): void {
    this.received.push(msg);
  }
}

const AvatarLikeBase = EnvironmentMixin(
  NamedMixin(
    MobileMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
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
  let locA: CartesianLocation;
  let locB: CartesianLocation;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locA.setShortDescription('A');
    locB = makeStuff(() => new CartesianLocation());
    locB.setShortDescription('B');
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
  });

  it('NPC (no EnvironmentMixin) renders the schema default', () => {
    const npc = makeStuff(() => new Npc());
    npc.setName('Goblin');
    ContainmentApi.move(npc, locA);

    // Teleport: arrival is rendered at schema default for the bland
    // case (no exit, no inverse direction). The render must not
    // throw, and the produced text must reflect the schema default.
    npc.teleport(locB);

    const arrivalSelf = npc.received
      .map((f) => f.body ?? '')
      .filter((b) => b.includes('materialize') || b.includes('arrive'));
    expect(arrivalSelf.length).toBeGreaterThan(0);
  });

  it('Avatar override changes the self-perspective message', () => {
    const avatar = makeStuff(() => new AvatarLike());
    avatar.setName('Hero');
    ContainmentApi.move(avatar, locA);

    avatar.setSetting<string>(
      'messages.movement.teleportInSelf',
      'CUSTOM ARRIVAL',
      avatar,
    );
    avatar.received = [];

    avatar.teleport(locB);

    const selfFrames = avatar.received
      .map((f) => f.body ?? '')
      .filter((b) => b.includes('CUSTOM ARRIVAL'));
    expect(selfFrames.length).toBeGreaterThan(0);
  });

  it('Avatar override does NOT bleed into peer messages', () => {
    const avatar = makeStuff(() => new AvatarLike());
    avatar.setName('Hero');
    ContainmentApi.move(avatar, locA);

    const peer = makeStuff(() => new Npc());
    peer.setName('Bystander');
    ContainmentApi.move(peer, locB);

    avatar.setSetting<string>(
      'messages.movement.teleportInSelf',
      'CUSTOM ARRIVAL',
      avatar,
    );
    peer.received = [];

    avatar.teleport(locB);

    // Peer sees the avatar's *peer* message, not the self message.
    const peerBodies = peer.received.map((f) => f.body ?? '');
    expect(peerBodies.some((b) => b.includes('CUSTOM ARRIVAL'))).toBe(false);
    expect(peerBodies.some((b) => b.includes('Hero'))).toBe(true);
  });
});
