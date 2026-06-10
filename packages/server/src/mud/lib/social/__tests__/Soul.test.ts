/**
 * SoulMixin tests — rendering + in-room dispatch.
 *
 * Covers:
 *   - renderEmote returns per-audience bodies with correct actor/target
 *     pronouns and verb agreement.
 *   - emote() composes a Scene at world.expression.emote with the
 *     emotive-esp modality stamp.
 *   - emoteFree() free-form prose.
 *   - Containable-wins routing (peers when containable, contents when
 *     pure-container).
 */

import { describe, it, expect } from 'vitest';
import { Stuff } from '../../stuff/Stuff';
import { ContainableMixin } from '../../spatial/Containable';
import { SensorMixin } from '../../message/Sensor';
import { VocalMixin } from '../../message/Vocal';
import { SoulMixin } from '../Soul';
import { NamedMixin } from '../../description/Named';
import { CommandGiverMixin } from '../../command/CommandGiver';
import Location from '../../stuff/Location';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from '../../stuff/Idea';
import { Emote } from '../Emote';

class CharacterStuff extends SoulMixin(
  VocalMixin(
    CommandGiverMixin(
      SensorMixin(ContainableMixin(NamedMixin(Idea))),
    ),
  ),
) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

class Listener extends SensorMixin(ContainableMixin(NamedMixin(Idea))) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

function waveEmote(): Emote {
  const e = new Emote();
  e.verb = 'wave';
  e.emoji = '👋';
  e.tags = ['greeting'];
  e.grammar = {
    slots: { target: { kind: 'stuff', optional: true } },
    template: '{{ actor }} wave{{ s }}{% if target %} at {{ target }}{% endif %}.',
  };
  return e;
}

describe('SoulMixin.renderEmote', () => {
  it('produces self/peer triples without a target', () => {
    const alice = makeStuff(() => new CharacterStuff());
    alice.setName('Alice');
    const bodies = alice.renderEmote(waveEmote());
    expect(bodies.self.toString()).toBe('You wave.');
    expect(bodies.peer.toString()).toMatch(/^<name[^>]*>Alice<\/name> waves\.$/);
    expect(bodies.target).toBeUndefined();
  });

  it('produces self/peer/target triples with a target', () => {
    const alice = makeStuff(() => new CharacterStuff());
    alice.setName('Alice');
    const iffy = makeStuff(() => new Listener());
    iffy.setName('Iffy');
    const bodies = alice.renderEmote(waveEmote(), { target: iffy });
    expect(bodies.self.toString()).toMatch(/^You wave at <name[^>]*>Iffy<\/name>\.$/);
    expect(bodies.peer.toString()).toMatch(/^<name[^>]*>Alice<\/name> waves at <name[^>]*>Iffy<\/name>\.$/);
    expect(bodies.target!.toString()).toMatch(/^<name[^>]*>Alice<\/name> waves at you\.$/);
  });
});

describe('SoulMixin.emote', () => {
  it('composes a Scene at world.expression.emote with emotive-esp modality', () => {
    const room = makeStuff(() => new Location());
    const alice = makeStuff(() => new CharacterStuff());
    alice.setName('Alice');
    ContainmentApi.move(alice, room);
    const bob = makeStuff(() => new Listener());
    ContainmentApi.move(bob, room);

    alice.emote(waveEmote());

    expect(alice.received).toHaveLength(1);
    expect(bob.received).toHaveLength(1);
    for (const f of [alice.received[0]!, bob.received[0]!]) {
      expect(f.topic).toBe('world.expression.emote');
      expect(f.meta.modality).toBe('emotive-esp');
    }
    expect(alice.received[0]!.payload).toMatchObject({
      verb: 'wave',
      emoji: '👋',
      tags: ['greeting'],
    });
  });

  it('emits a target frame when a target is supplied', () => {
    const room = makeStuff(() => new Location());
    const alice = makeStuff(() => new CharacterStuff());
    alice.setName('Alice');
    ContainmentApi.move(alice, room);
    const iffy = makeStuff(() => new Listener());
    iffy.setName('Iffy');
    ContainmentApi.move(iffy, room);

    alice.emote(waveEmote(), { target: iffy });

    expect(iffy.received).toHaveLength(1);
    expect(iffy.received[0]!.body).toMatch(/waves at you/);
  });
});

describe('SoulMixin.emoteFree', () => {
  it('emits free-form prose with actor name', () => {
    const room = makeStuff(() => new Location());
    const alice = makeStuff(() => new CharacterStuff());
    alice.setName('Alice');
    ContainmentApi.move(alice, room);
    const bob = makeStuff(() => new Listener());
    ContainmentApi.move(bob, room);

    alice.emoteFree('shuffles a deck of cards');

    expect(alice.received[0]!.body).toBe('You shuffles a deck of cards.');
    expect(bob.received[0]!.body).toMatch(/<name[^>]*>Alice<\/name> shuffles a deck of cards\./);
  });

  it('resolves `@mention` syntax inside the body to <mention> tags', () => {
    const room = makeStuff(() => new Location());
    const alice = makeStuff(() => new CharacterStuff());
    alice.setName('Alice');
    ContainmentApi.move(alice, room);
    const iffy = makeStuff(() => new Listener());
    iffy.setName('Iffy');
    ContainmentApi.move(iffy, room);

    alice.emoteFree('waves at @iffy');

    // Iffy is in the room as a peer — gets the same body as other
    // peers. Her cockpit substitutes "you" for the mention; the
    // server-side body keeps the structural mention tag with her
    // stuff-id.
    expect(iffy.received).toHaveLength(1);
    expect(iffy.received[0]!.body).toMatch(
      new RegExp(`<mention stuff-id="${iffy.stuffId}">@iffy<\\/mention>`),
    );
  });
});
