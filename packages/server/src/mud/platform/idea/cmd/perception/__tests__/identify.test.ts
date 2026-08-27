/**
 * Identification — the **type axis** rendering: an item reads as its
 * unidentified appearance until a viewer holds an `IDENTIFICATION`
 * record for its class, and the type axis composes with the recognition
 * (instance) axis.
 *
 * ⚠ **There is no `identify` verb**, and there never was a good reason
 * for one (requirements D34): a verb that appears in your affordance
 * list *because of what you are holding* tells you what you are
 * holding, so a scroll of identify would have identified itself for
 * free. The scroll affords `read` like every other written thing, and
 * the identify **effect** fires from having read it — covered in
 * `lib/magic/__tests__/Consumables.test.ts`, where the catalogue is
 * warmed. What is left here is the belief-rendering half, which is what
 * this file was always really testing.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { RecognitionApi } from '../../../../../api/recognition';
import { IDENTIFICATION, RECOGNITION } from '../../../../../lib/belief/BeliefStore';
import { BeliefStoreMixin } from '../../../../../lib/belief/BeliefStore';
import { PerceptionMixin } from '../../../../../lib/perception/Perception';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { IdentifiableMixin } from '../../../../../lib/identification/Identifiable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { OrganismMixin } from '../../../../../lib/species/Organism';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { Idea } from '../../../../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';

class Viewer extends BeliefStoreMixin(PerceptionMixin(SensorMixin(Idea))) {}

// An identifiable item: no proper name, so getPresentation is the
// unidentified appearance ("a blue potion"); identifiedName is the type.
class Vial extends IdentifiableMixin(VisibleMixin(ContainableMixin(Idea))) {}

// A creature that is also type-identifiable (composes IDENTIFICATION) —
// for the both-axes compose case.
class Guard extends BeliefStoreMixin(
  IdentifiableMixin(
    OrganismMixin(VisibleMixin(NamedMixin(ContainableMixin(Idea)))),
  ),
) {}

let counter = 0;
function makeVial(): Vial {
  const v = makeStuffAtPath(() => new Vial(), `/obj/item/vial-${counter++}`);
  v.setShortDescription('a blue potion');
  v.setIdentifiedName('a potion of healing');
  return v;
}

describe('identification — the type axis', () => {
  it('renders the unidentified appearance until identified', () => {
    const viewer = makeStuff(() => new Viewer());
    const vial = makeVial();
    expect(RecognitionApi.describe(viewer, vial)).toBe('a blue potion');
  });

  it('a type record makes the vial read as its type to that viewer only', () => {
    const reader = makeStuff(() => new Viewer());
    const other = makeStuff(() => new Viewer());
    const vial = makeVial();

    reader.know(IDENTIFICATION, vial.getTemplatePath()!, { typeKnown: true });

    expect(
      reader.recall(IDENTIFICATION, vial.getTemplatePath()!)?.payload.typeKnown,
    ).toBe(true);
    expect(RecognitionApi.describe(reader, vial)).toBe('a potion of healing');
    // …but it stays unidentified to everyone else. Identification is
    // per-viewer memory, never a world fact.
    expect(RecognitionApi.describe(other, vial)).toBe('a blue potion');
  });

  it('the two axes compose: a recognized AND type-identified actor renders with both', () => {
    const viewer = makeStuff(() => new Viewer());
    const guard = makeStuffAtPath(() => new Guard(), '/obj/npc/guard-1');
    guard.setName('Bob');
    guard.setShortDescription('a tall figure');
    guard.setIdentifiedName('a city guard');

    // Unknown + unidentified → salient features.
    expect(RecognitionApi.describe(viewer, guard)).toBe('a tall figure');

    // Identify the type only → "a city guard" (dissociated: identified,
    // not recognized).
    viewer.know(IDENTIFICATION, guard.getTemplatePath()!, { typeKnown: true });
    expect(RecognitionApi.describe(viewer, guard)).toBe('a city guard');

    // Now recognize the instance too → both woven.
    viewer.know(RECOGNITION, guard.getTemplatePath()!, { knownAs: 'Bob' });
    expect(RecognitionApi.describe(viewer, guard)).toBe('Bob, a city guard');
  });
});
