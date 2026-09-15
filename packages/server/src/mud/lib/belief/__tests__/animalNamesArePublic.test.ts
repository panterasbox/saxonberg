/**
 * ⭐⭐ **An animal's name is public; a person's is not.**
 *
 * Recognition exists so that a PERSON can be a stranger to you, wear a
 * hood, or be impersonated. An animal can be none of those things — so
 * the instance-recognition gate narrows from every organism to every
 * *persona*, and a named animal reads as itself to everybody.
 *
 * ⭐ This is not a detail: it is the second route a lost animal gets
 * home. A neighbour who has never met Mouse can still see "Mouse" on the
 * lane and tell you where it is. *It has a name, and names are public.*
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BeliefStoreMixin } from '../BeliefStore';
import { PersonaMixin } from '../../character/Persona';
import { OrganismMixin } from '../../species/Organism';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class Stranger extends BeliefStoreMixin(
  PerceptionMixin(SensorMixin(ContainableMixin(NamedMixin(Idea)))),
) {}

/** An animal: a body with a name, and no persona. */
class Animal extends VisibleMixin(
  OrganismMixin(NamedMixin(ContainableMixin(Idea))),
) {}

/** A person: the same, plus the thing that makes somebody a somebody. */
class Person extends PersonaMixin(
  VisibleMixin(OrganismMixin(NamedMixin(ContainableMixin(Idea)))),
) {}

let n = 0;
beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('a stranger reading a name', () => {
  it('⭐ sees a named ANIMAL by its name', () => {
    const viewer = makeStuffAtPath(() => new Stranger(), `/v/${n++}`);
    const mouse = makeStuffAtPath(() => new Animal(), `/stuff/agent/cat-${n++}`);
    mouse.setName('Mouse');
    mouse.setShortDescription('thin cat');
    expect(mouse.describeFor(viewer)).toBe('Mouse');
  });

  it('⚠ does NOT see a named PERSON by their name', () => {
    const viewer = makeStuffAtPath(() => new Stranger(), `/v/${n++}`);
    const bob = makeStuffAtPath(() => new Person(), `/obj/npc/bob-${n++}`);
    bob.setName('Bob');
    bob.setShortDescription('tall stranger');
    expect(bob.describeFor(viewer)).not.toBe('Bob');
  });

  it('an UNnamed animal is still just what it is', () => {
    // Before naming there is nothing to be public: the stray is "a thin
    // cat" to the whole street, which is what makes naming a change.
    const viewer = makeStuffAtPath(() => new Stranger(), `/v/${n++}`);
    const stray = makeStuffAtPath(() => new Animal(), `/stuff/agent/cat-${n++}`);
    stray.setShortDescription('thin cat');
    expect(stray.describeFor(viewer)).not.toBe('Mouse');
    expect(stray.describeFor(viewer)).toContain('thin cat');
  });
});
