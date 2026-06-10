/**
 * Tests for MessageApi.scene — multi-audience composition + auto
 * commandId/causingCommandId stamping.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageApi } from '../message';
import { Mml } from '../mml';
import Location from '../../lib/stuff/Location';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SensorMixin } from '../../lib/message/Sensor';
import { NamedMixin } from '../../lib/description/Named';
import { Stuff } from '../../lib/stuff/Stuff';
import { ExecutionContextApi, FrameKind } from '../execution-context';
import { ContainmentApi } from '../containment';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from "../../lib/stuff/Idea";

class CapSensor extends SensorMixin(ContainableMixin(NamedMixin(Idea))) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

class HauntedPlace extends SensorMixin(ContainerMixin(Idea)) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

describe('MessageApi.Tags', () => {
  // `MessageApi.Topics` was retired — topic strings are emitted as
  // literals at call sites; the authored source of truth is the
  // `TopicCatalogue` (per-topic YAML leaf Ideas). Audience tags
  // remain framework-defined constants.
  it('exposes audience tag constants', () => {
    expect(MessageApi.Tags.Audience.Actor).toBe('audience:actor');
    expect(MessageApi.Tags.Audience.Target).toBe('audience:target');
    expect(MessageApi.Tags.Audience.Witness).toBe('audience:witness');
    expect(MessageApi.Tags.Audience.Bystander).toBe('audience:bystander');
  });
});

describe('MessageApi.refOf', () => {
  it('produces a wire-safe StuffRef with display name when available', () => {
    const obj = makeStuff(() => new CapSensor());
    obj.setName('Alice');
    obj.setSurname('A');
    const ref = MessageApi.refOf(obj);
    expect(ref.stuffId).toBe(obj.stuffId);
    // refOf carries the casual register; clients render the formal
    // form themselves when needed.
    expect(ref.displayName).toBe('Alice');
  });

  it('renders the baked-in default when no name is resolvable', () => {
    class Plain extends Idea {}
    const obj = makeStuff(() => new Plain());
    const ref = MessageApi.refOf(obj);
    expect(ref.stuffId).toBe(obj.stuffId);
    // DescribeApi.getDisplayName always returns a string post-reshape;
    // for hosts without Named/Visible state the baked-in `'something'`
    // default flows through.
    expect(ref.displayName).toBe('something');
  });
});

describe('Scene compositional checks', () => {
  it('toSelf throws when actor is not a Sensor', () => {
    class NonSensor extends ContainableMixin(Idea) {}
    const actor = makeStuff(() => new NonSensor());
    expect(() =>
      MessageApi.scene(actor)
        .topic('world.speech.say')
        .toSelf(Mml.compose`hi`)
    ).toThrow(/Sensor/);
  });

  it('toTarget throws when target is not a Sensor', () => {
    const actor = makeStuff(() => new CapSensor());
    class Plain extends Idea {}
    const target = makeStuff(() => new Plain());
    expect(() =>
      MessageApi.scene(actor)
        .topic('world.speech.tell')
        .toTarget(target, Mml.compose`hi`)
    ).toThrow(/Sensor/);
  });

  it('toPeers throws when actor is not Containable', () => {
    class HauntedNoContain extends SensorMixin(ContainerMixin(Idea)) {}
    const actor = makeStuff(() => new HauntedNoContain());
    expect(() =>
      MessageApi.scene(actor)
        .topic('world.speech.say')
        .toPeers(Mml.compose`hi`)
    ).toThrow(/Containable/);
  });

  it('toContents throws when actor is not a Container', () => {
    const actor = makeStuff(() => new CapSensor());
    expect(() =>
      MessageApi.scene(actor)
        .topic('world.speech.say')
        .toContents(Mml.compose`hi`)
    ).toThrow(/Container/);
  });

  it('throws on duplicate audience kinds', () => {
    const actor = makeStuff(() => new CapSensor());
    expect(() =>
      MessageApi.scene(actor)
        .topic('x')
        .toSelf(Mml.compose`a`)
        .toSelf(Mml.compose`b`)
    ).toThrow(/already/);
  });

  it('send() throws when topic is missing', () => {
    const actor = makeStuff(() => new CapSensor());
    expect(() =>
      MessageApi.scene(actor).toSelf(Mml.compose`hi`).send()
    ).toThrow(/topic/);
  });
});

describe('Scene multi-audience dispatch', () => {
  let location: Location;
  let alice: CapSensor;
  let bob: CapSensor;
  let carol: CapSensor;

  beforeEach(() => {
    location = makeStuff(() => new Location());
    alice = makeStuff(() => new CapSensor());
    alice.setName('Alice');
    bob = makeStuff(() => new CapSensor());
    bob.setName('Bob');
    carol = makeStuff(() => new CapSensor());
    carol.setName('Carol');
    ContainmentApi.move(alice, location);
    ContainmentApi.move(bob, location);
    ContainmentApi.move(carol, location);
  });

  it('toSelf delivers a single frame to the actor', () => {
    MessageApi.scene(alice)
      .topic('world.speech.say')
      .toSelf(Mml.compose`You say, ${Mml.speech('hi')}`)
      .send();

    expect(alice.received).toHaveLength(1);
    expect(bob.received).toHaveLength(0);
    expect(alice.received[0]!.body).toBe(
      'You say, <speech>"hi"</speech>'
    );
    expect(alice.received[0]!.tags).toContain('audience:actor');
  });

  it('toPeers excludes the actor', () => {
    MessageApi.scene(alice)
      .topic('world.speech.say')
      .toPeers(Mml.compose`peers`)
      .send();

    expect(alice.received).toHaveLength(0);
    expect(bob.received).toHaveLength(1);
    expect(carol.received).toHaveLength(1);
    expect(bob.received[0]!.tags).toContain('audience:witness');
  });

  it('toPeers excludes both actor and explicit target', () => {
    MessageApi.scene(alice)
      .topic('world.speech.tell')
      .toSelf(Mml.compose`actor`)
      .toTarget(bob, Mml.compose`target`)
      .toPeers(Mml.compose`witness`)
      .send();

    expect(alice.received).toHaveLength(1);
    expect(bob.received).toHaveLength(1);
    expect(carol.received).toHaveLength(1);
    expect(alice.received[0]!.body).toBe('actor');
    expect(bob.received[0]!.body).toBe('target');
    expect(carol.received[0]!.body).toBe('witness');
    // Crucially neither alice nor bob got the witness frame.
    expect(alice.received.some((f) => f.body === 'witness')).toBe(false);
    expect(bob.received.some((f) => f.body === 'witness')).toBe(false);
  });

  it('toContents broadcasts to a Container actor and excludes the actor itself', () => {
    const haunted = makeStuff(() => new HauntedPlace());
    // Move alice/bob OUT of the original location (they were placed
    // in beforeEach), into the haunted container. ContainmentApi.move
    // removes from the prior environment automatically.
    ContainmentApi.move(alice, haunted);
    ContainmentApi.move(bob, haunted);

    MessageApi.scene(haunted)
      .topic('world.speech.say')
      .toContents(Mml.compose`a whisper`)
      .send();

    expect(alice.received).toHaveLength(1);
    expect(bob.received).toHaveLength(1);
    expect(haunted.received).toHaveLength(0);
  });

  it('shared payload is applied to audiences without overrides', () => {
    MessageApi.scene(alice)
      .topic('world.speech.say')
      .toSelf(Mml.compose`a`)
      .toPeers(Mml.compose`b`)
      .payload({ shared: true })
      .send();

    expect(alice.received[0]!.payload).toEqual({ shared: true });
    expect(bob.received[0]!.payload).toEqual({ shared: true });
  });

  it('per-audience payload overrides shared', () => {
    MessageApi.scene(alice)
      .topic('x')
      .toSelf(Mml.compose`a`, { who: 'self' })
      .toPeers(Mml.compose`b`)
      .payload({ shared: 'fallback' })
      .send();

    expect(alice.received[0]!.payload).toEqual({ who: 'self' });
    expect(bob.received[0]!.payload).toEqual({ shared: 'fallback' });
  });

  it('every frame carries an audience: tag', () => {
    MessageApi.scene(alice)
      .topic('x')
      .toSelf(Mml.compose`a`)
      .toTarget(bob, Mml.compose`b`)
      .toPeers(Mml.compose`c`)
      .send();

    expect(alice.received[0]!.tags).toContain('audience:actor');
    expect(bob.received[0]!.tags).toContain('audience:target');
    expect(carol.received[0]!.tags).toContain('audience:witness');
  });

  it('frames have a unique id and a server timestamp', () => {
    MessageApi.scene(alice).topic('x').toSelf(Mml.compose`a`).send();
    MessageApi.scene(alice).topic('x').toSelf(Mml.compose`b`).send();
    expect(alice.received).toHaveLength(2);
    expect(alice.received[0]!.id).not.toBe(alice.received[1]!.id);
    expect(typeof alice.received[0]!.meta.timestamp).toBe('number');
  });

  it('plain string body is treated as raw markup-already', () => {
    MessageApi.scene(alice)
      .topic('x')
      .toSelf('<name>Alice</name> hi')
      .send();
    expect(alice.received[0]!.body).toBe('<name>Alice</name> hi');
  });
});

describe('Scene attribution stamping', () => {
  it('stamps commandId + causingCommandId from a Command frame', () => {
    const location = makeStuff(() => new Location());
    const alice = makeStuff(() => new CapSensor());
    ContainmentApi.move(alice, location);

    const fakeCtx = {
      commandGiver: alice,
      commandText: 'look',
      executionId: 'x',
      commandId: 'cmd-XYZ',
    };

    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        alice,
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: {
            commandContext: fakeCtx,
            causingCommandId: 'cmd-XYZ',
          },
        },
        () => {
          MessageApi.scene(alice)
            .topic('world.perception.sense.look')
            .toSelf(Mml.compose`look body`)
            .send();
        }
      );
    });

    expect(alice.received).toHaveLength(1);
    expect(alice.received[0]!.meta.commandId).toBe('cmd-XYZ');
    expect(alice.received[0]!.meta.causingCommandId).toBe('cmd-XYZ');
  });

  it('outside any command, neither commandId nor causingCommandId is set', () => {
    const location = makeStuff(() => new Location());
    const alice = makeStuff(() => new CapSensor());
    ContainmentApi.move(alice, location);

    MessageApi.scene(alice).topic('x').toSelf(Mml.compose`hi`).send();
    expect(alice.received[0]!.meta.commandId).toBeUndefined();
    expect(alice.received[0]!.meta.causingCommandId).toBeUndefined();
  });
});

describe('Scene per-recipient body materialization (Step B)', () => {
  it('renders Mml body once per recipient with the recipient as viewer', () => {
    const location = makeStuff(() => new Location());
    const alice = makeStuff(() => new CapSensor());
    alice.setName('Alice');
    const bob = makeStuff(() => new CapSensor());
    bob.setName('Bob');
    const carol = makeStuff(() => new CapSensor());
    carol.setName('Carol');
    ContainmentApi.move(alice, location);
    ContainmentApi.move(bob, location);
    ContainmentApi.move(carol, location);

    // A value whose toMml output depends on the viewer.
    const viewerAware = {
      toMml: (viewer?: unknown) => {
        const id = (viewer as { stuffId?: string } | undefined)?.stuffId;
        return Mml.fromMarkup(`<v>${id ?? 'none'}</v>`);
      },
    };

    MessageApi.scene(alice)
      .topic('x')
      .toPeers(Mml.compose`hi ${viewerAware}`)
      .send();

    expect(alice.received).toHaveLength(0);
    expect(bob.received).toHaveLength(1);
    expect(carol.received).toHaveLength(1);
    // Each peer's body carries their own stuffId — proves per-recipient
    // body materialization with the recipient as `viewer`.
    expect(bob.received[0]!.body).toBe(`hi <v>${bob.stuffId}</v>`);
    expect(carol.received[0]!.body).toBe(`hi <v>${carol.stuffId}</v>`);
  });

  it('threads viewer to toSelf body', () => {
    const location = makeStuff(() => new Location());
    const alice = makeStuff(() => new CapSensor());
    ContainmentApi.move(alice, location);

    const viewerAware = {
      toMml: (viewer?: unknown) =>
        Mml.fromMarkup(
          `<v>${(viewer as { stuffId?: string } | undefined)?.stuffId ?? 'none'}</v>`
        ),
    };
    MessageApi.scene(alice)
      .topic('x')
      .toSelf(Mml.compose`self ${viewerAware}`)
      .send();
    expect(alice.received[0]!.body).toBe(`self <v>${alice.stuffId}</v>`);
  });
});
