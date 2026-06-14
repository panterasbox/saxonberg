/**
 * Identification (Wave 7) — the type axis, thin: the `identify` trigger
 * writes a type record; the item then renders by its known type to that
 * viewer only; the two axes compose.
 */

import { describe, it, expect } from 'vitest';
import IdentifyController from '../IdentifyController';
import { RecognitionApi } from '../../../../api/recognition';
import { IDENTIFICATION, RECOGNITION } from '../../../../lib/belief/BeliefStore';
import { BeliefStoreMixin } from '../../../../lib/belief/BeliefStore';
import { PerceptionMixin } from '../../../../lib/perception/Perception';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { IdentifiableMixin } from '../../../../lib/identification/Identifiable';
import { NamedMixin } from '../../../../lib/description/Named';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { OrganismMixin } from '../../../../lib/species/Organism';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { Idea } from '../../../../lib/stuff/Idea';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import type { MqlOneResult } from '../../../../api/mql';

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

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [identify]\ncontroller: perception/IdentifyController\ndescription: stub\n`,
    '<test>',
  );
}

function context(viewer: Viewer): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: viewer as never,
    location: null as never,
    commandText: 'identify vial',
    executionId: 'test',
    commandId: 'test',
    verb: 'identify',
    command: stubCommand(),
  });
}

function model(target: Vial): CommandModel {
  return { target: { stuff: target, raw: 'vial' } as MqlOneResult } as CommandModel;
}

describe('identify trigger', () => {
  it('renders the unidentified appearance until identified', () => {
    const viewer = makeStuff(() => new Viewer());
    const vial = makeVial();
    expect(RecognitionApi.describe(viewer, vial)).toBe('a blue potion');
  });

  it('identify writes the type record; the vial then reads as its type to that viewer only', () => {
    const reader = makeStuff(() => new Viewer());
    const other = makeStuff(() => new Viewer());
    const vial = makeVial();

    const controller = makeStuff(() => new IdentifyController());
    controller.execute(model(vial), context(reader));

    // The reader's record was written.
    expect(reader.recall(IDENTIFICATION, vial.getTemplatePath()!)?.payload.typeKnown).toBe(true);
    // …and the vial now reads as its true type to the reader,
    expect(RecognitionApi.describe(reader, vial)).toBe('a potion of healing');
    // …but stays unidentified to everyone else.
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
