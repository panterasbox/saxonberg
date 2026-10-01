/**
 * RecognitionApi.describe — the viewer-aware naming step (Wave 2).
 *
 * Covers: known (record `knownAs` → that name), unknown being (salient
 * features, never the true name), non-perceiver viewer (viewer-blind
 * baseline), non-perceivable target (obscured backstop), non-organism
 * (identification placeholder → baseline). The identification + disguise
 * branches are inert seams here (Waves 7 / 4).
 *
 * Plus a real scene-path integration: two co-present viewers receive the
 * SAME composed scene line and see DIFFERENT names for the same target —
 * exercising `Scene.send`'s per-recipient `Mml.toString(recipient)`
 * materialization, not a direct `describe` call.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { RECOGNITION } from '../BeliefStore';
import { BeliefStoreMixin } from '../BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { OrganismMixin } from '../../species/Organism';
import { PersonaMixin } from '../../character/Persona';
import { Idea } from '../../stuff/Idea';
import { Agent } from '../../stuff/Agent';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { buildModality } from '../../perception/modalities/__tests__/test-helpers';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { MessageFrame } from '@saxonberg/types';

// A viewer: perceives + holds identity memory. Captures received frames
// so the integration test can read what name each recipient was shown.
class Viewer extends BeliefStoreMixin(
  PerceptionMixin(SensorMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

// A being you can recognize: a PERSON + a proper name + a generic
// appearance (the salient-feature fallback for strangers).
// ⚠ **PersonaMixin is what makes it a PERSON**, and recognition is now a
// person-only gate: an animal cannot be a stranger, wear a hood, or be
// impersonated, so a non-person organism renders its name to everybody.
// A fixture called Bob that models a person must compose the thing that
// makes one — faking the shape passes only until the rule gets stricter.
// ⭐ On the `Agent` branch, deliberately: "someone" vs "something" is
// the Agent/Thing split (`Stuff.isAgent`), so a fixture that models a
// person and extends `Idea` renders as *something* when the viewer
// cannot see it. The old `Idea` base was the cheap one, not the honest
// one — the same point the PersonaMixin note above makes, one rung up.
class Being extends PersonaMixin(
  VisibleMixin(OrganismMixin(NamedMixin(ContainableMixin(Agent)))),
) {}

// An inert item — not an Organism, so recognition doesn't apply.
class Item extends VisibleMixin(ContainableMixin(Idea)) {}

// ⭐ A living thing that is NOBODY — the shape of a plant, a beehive, a
// colony of bees: an `Organism` with no `PersonaMixin`. The whole point
// of the fixture is the mixin it does NOT have.
class Growth extends VisibleMixin(
  OrganismMixin(NamedMixin(ContainableMixin(Idea))),
) {}

// A bare room with no light infrastructure → pitch-black.
class Room extends ContainerMixin(Idea) {}

let beingCounter = 0;
function makeBeing(name: string, appearance: string): Being {
  const path = `/obj/npc/being-${beingCounter++}`;
  const b = makeStuffAtPath(() => new Being(), path);
  b.setName(name);
  b.setShortDescription(appearance);
  return b;
}

afterEach(() => {
  // Drop any vision singleton a gate test registered so other tests see
  // the no-modality (gate-permits) baseline.
  for (const m of StuffApi.findAllByTemplatePath('/platform/idea/modalities/vision')) {
    StuffApi.unregister(m);
  }
});

describe('RecognitionApi.describe', () => {
  it('renders the learned name for a recognized being', () => {
    const viewer = makeStuff(() => new Viewer());
    const bob = makeBeing('Bob', 'tall stranger');
    viewer.know(RECOGNITION, bob.getTemplatePath()!, { knownAs: 'Bob' });
    expect(bob.describeFor(viewer)).toBe('Bob');
  });

  it('renders the bare stem (not the true name) for an unknown being', () => {
    // `describe` is the concise identity — the `shortDescription` stem, no
    // worn-feature affix (that's `salientFeatures`, reserved for targeting)
    // and no status (that's `describeWithStatus`, the presence roll-call).
    const viewer = makeStuff(() => new Viewer());
    const bob = makeBeing('Bob', 'tall stranger');
    const rendered = bob.describeFor(viewer);
    expect(rendered).toBe('a tall stranger');
    expect(rendered).not.toContain('Bob');
  });

  it('falls back to the viewer-blind baseline for a non-perceiver viewer', () => {
    // A plain Idea isn't a Sensor/Perception — logs, refOf, viewer-less
    // contexts get the baseline `getPresentation()`.
    const nonPerceiver = makeStuff(() => new Idea());
    const bob = makeBeing('Bob', 'tall stranger');
    expect(bob.describeFor(nonPerceiver)).toBe('Bob');
  });

  it('returns the baseline for a non-organism (identification placeholder)', () => {
    const viewer = makeStuff(() => new Viewer());
    const rock = makeStuff(() => new Item());
    rock.setShortDescription('blue rock');
    // No Named name → baseline is the shortDescription; the type axis is
    // a no-op until Wave 7.
    expect(rock.describeFor(viewer)).toBe('a blue rock');
  });

  it('obscures a target the viewer cannot see, even a recognized one', () => {
    installV1QuantityTagTables(); // lux band table for the vision gate
    buildModality('vision'); // gate now active
    const viewer = makeStuff(() => new Viewer());
    const bob = makeBeing('Bob', 'tall stranger');
    viewer.know(RECOGNITION, bob.getTemplatePath()!, { knownAs: 'Bob' });

    // Put Bob in a lightless room — vision can't resolve a figure.
    const darkRoom = makeStuff(() => new Room());
    ContainmentApi.move(bob, darkRoom);

    const rendered = bob.describeFor(viewer);
    expect(rendered).toBe('someone');
    expect(rendered).not.toContain('Bob');
  });

  it('⚠⚠ a living thing that is not a PERSON obscures to "something"', () => {
    /*
     * ⭐⭐ **"someone" is the person register, and it used to leak to
     * everything alive.** `obscured` asked `isOrganism` — a far bigger
     * set than *is this somebody*. A `Plant` composes `OrganismMixin`
     * and nothing person-shaped, so a wheat stalk, a cherry tree and a
     * houseplant have always announced themselves as "someone" in the
     * dark; apiculture's beehive made it loud, because the colony IS
     * the organism and `drop hive` answered *"You drop someone."*
     *
     * ⚠ Found in a LIVE BROWSER WALK — three cherry trees in a dim
     * close offered themselves to the binder as *someone (1) ·
     * someone (2) · someone (3)*. No unit test could see it: this
     * file's own `Being` fixture is a `PersonaMixin` person, so every
     * case it had was a case the old predicate got right.
     *
     * ⭐ And it is what this file already said it did: *recognition is a
     * person-only gate — an animal cannot be a stranger, wear a hood,
     * or be impersonated.*
     */
    installV1QuantityTagTables();
    buildModality('vision');
    const viewer = makeStuff(() => new Viewer());
    // An ORGANISM with no Persona — a plant, a hive, a colony of bees.
    const shrub = makeStuffAtPath(
      () => {
        const g = new Growth();
        g.setName('cherry');
        return g;
      },
      `/stuff/thing/plant/cherry-${beingCounter++}`,
    );
    ContainmentApi.move(shrub, makeStuff(() => new Room()));
    expect(shrub.describeFor(viewer)).toBe('something');
  });
});

describe("the `distinguishing` form — what salientFeatures became", () => {
  // ⭐ It was a method of its own with exactly ONE caller, because the
  // only way to reach it was to resolve eagerly for a single known
  // viewer. It is a form a sentence asks for now. Viewer-blind here (the
  // room's group label is one label for everybody), which is precisely
  // the aperture the old single-argument method had.
  it('uses the authored appearance when present', () => {
    const bob = makeBeing('Bob', 'tall stranger');
    expect(bob.describeFor(undefined, 'distinguishing')).toBe('a tall stranger');
  });

  it('falls back to "someone" with no appearance or species', () => {
    const b = makeStuffAtPath(
      () => new Being(),
      `/obj/npc/featureless-${beingCounter++}`,
    );
    b.setName('Nemo');
    expect(b.describeFor(undefined, 'distinguishing')).toBe('someone');
  });
});

describe('viewer-aware naming through a scene (real path)', () => {
  it('two co-present viewers see different names for the same target', () => {
    const room = makeStuff(() => new Room());
    const friend = makeStuff(() => new Viewer());
    const stranger = makeStuff(() => new Viewer());
    const bob = makeBeing('Bob', 'tall stranger');

    ContainmentApi.move(friend, room);
    ContainmentApi.move(stranger, room);
    ContainmentApi.move(bob, room);

    // Only `friend` has met Bob.
    friend.know(RECOGNITION, bob.getTemplatePath()!, { knownAs: 'Bob' });

    // One composed line, broadcast to the room's contents. Each
    // recipient materializes it against itself as the viewer.
    MessageApi.scene(room)
      .topic('sense.survey')
      .toContents(Mml.compose`${Mml.actor(bob)} is here.`)
      .send();

    const friendBody = friend.received.at(-1)?.body ?? '';
    const strangerBody = stranger.received.at(-1)?.body ?? '';

    expect(friendBody).toContain('Bob');
    expect(strangerBody).toContain('a tall stranger');
    expect(strangerBody).not.toContain('Bob');
    // Same stuff-id tag carried to both — only the inner text differs.
    expect(friendBody).toContain(`stuff-id="${bob.stuffId}"`);
    expect(strangerBody).toContain(`stuff-id="${bob.stuffId}"`);
  });
});
