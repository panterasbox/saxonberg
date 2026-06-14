/**
 * IntroduceController — the recognition instance-axis trigger (Wave 3).
 *
 * Covers: self-introduce upgrades in-earshot listeners' records (they
 * then render the speaker by name); third-party introduce by someone who
 * recognizes the subject; third-party introduce rejected when the
 * speaker doesn't know the subject; repeat-perception coalescing; NPC
 * (programmatic) dispatch.
 */

import { describe, it, expect } from 'vitest';
import IntroduceController from '../IntroduceController';
import { RecognitionApi } from '../../../../api/recognition';
import { RECOGNITION } from '../../../../lib/belief/BeliefStore';
import { BeliefStoreMixin } from '../../../../lib/belief/BeliefStore';
import { PerceptionMixin } from '../../../../lib/perception/Perception';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { VocalMixin } from '../../../../lib/message/Vocal';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { OrganismMixin } from '../../../../lib/species/Organism';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainmentApi } from '../../../../api/containment';
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

// A speaker / introducee: can speak, perceive, hold beliefs, and is a
// recognizable being (Organism + Named + Visible).
class Person extends VocalMixin(
  BeliefStoreMixin(
    PerceptionMixin(
      SensorMixin(
        OrganismMixin(VisibleMixin(NamedMixin(ContainableMixin(Idea)))),
      ),
    ),
  ),
) {}

class Room extends ContainerMixin(Idea) {}

let counter = 0;
function makePerson(name: string, appearance: string): Person {
  const p = makeStuffAtPath(() => new Person(), `/obj/npc/person-${counter++}`);
  p.setName(name);
  p.setShortDescription(appearance);
  return p;
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [introduce]\ncontroller: social/IntroduceController\ndescription: stub\n`,
    '<test>',
  );
}

function context(speaker: Person, room: Room): CommandContext {
  return CommandApi.createCommandContext({
    // The fixture composes Vocal/BeliefStore but not the full
    // CommandGiver surface the dispatcher type wants; the controller
    // only reads `commandGiver` as the speaker, so a cast is honest.
    commandGiver: speaker as never,
    location: room as never,
    commandText: 'introduce',
    executionId: 'test',
    commandId: 'test',
    verb: 'introduce',
    command: stubCommand(),
  });
}

function ref(stuff: Person): MqlOneResult {
  return { stuff, raw: 'subject' } as MqlOneResult;
}

function model(subject?: Person): CommandModel {
  return (subject ? { subject: ref(subject) } : {}) as CommandModel;
}

describe('IntroduceController', () => {
  it('self-introduce upgrades in-earshot listeners; they then see the name', () => {
    const room = makeStuff(() => new Room());
    const mara = makePerson('Mara', 'a tall stranger');
    const listener = makePerson('Pat', 'a short person');
    ContainmentApi.move(mara, room);
    ContainmentApi.move(listener, room);

    const controller = makeStuff(() => new IntroduceController());
    controller.execute(model(), context(mara, room));

    const rec = listener.recall(RECOGNITION, mara.getTemplatePath()!);
    expect(rec?.knownAs).toBe('Mara');
    expect(RecognitionApi.describe(listener, mara)).toBe('Mara');
  });

  it('a listener who never heard the intro still sees salient features', () => {
    const room = makeStuff(() => new Room());
    const elsewhere = makeStuff(() => new Room());
    const mara = makePerson('Mara', 'a tall stranger');
    const absent = makePerson('Gus', 'a stout person');
    ContainmentApi.move(mara, room);
    ContainmentApi.move(absent, elsewhere); // out of earshot

    const controller = makeStuff(() => new IntroduceController());
    controller.execute(model(), context(mara, room));

    expect(absent.recall(RECOGNITION, mara.getTemplatePath()!)).toBeNull();
    expect(RecognitionApi.describe(absent, mara)).toBe('a tall stranger');
  });

  it('third-party introduce by someone who knows the subject upgrades listeners', () => {
    const room = makeStuff(() => new Room());
    const alice = makePerson('Alice', 'a woman');
    const bob = makePerson('Bob', 'a tall stranger');
    const listener = makePerson('Pat', 'a short person');
    ContainmentApi.move(alice, room);
    ContainmentApi.move(bob, room);
    ContainmentApi.move(listener, room);

    // Alice already recognizes Bob.
    alice.know(RECOGNITION, bob.getTemplatePath()!, { knownAs: 'Bob' });

    const controller = makeStuff(() => new IntroduceController());
    controller.execute(model(bob), context(alice, room));

    expect(listener.recall(RECOGNITION, bob.getTemplatePath()!)?.knownAs).toBe(
      'Bob',
    );
    expect(RecognitionApi.describe(listener, bob)).toBe('Bob');
  });

  it('third-party introduce is rejected when the speaker does not know the subject', () => {
    const room = makeStuff(() => new Room());
    const alice = makePerson('Alice', 'a woman');
    const bob = makePerson('Bob', 'a tall stranger');
    const listener = makePerson('Pat', 'a short person');
    ContainmentApi.move(alice, room);
    ContainmentApi.move(bob, room);
    ContainmentApi.move(listener, room);

    const controller = makeStuff(() => new IntroduceController());
    controller.execute(model(bob), context(alice, room));

    // No record written for the listener — Alice couldn't vouch.
    expect(listener.recall(RECOGNITION, bob.getTemplatePath()!)).toBeNull();
  });

  it('repeat-perception via learnIdentity coalesces to one advancing record', () => {
    const room = makeStuff(() => new Room());
    const watcher = makePerson('Watcher', 'an observer');
    const subject = makePerson('Subject', 'a tall stranger');
    ContainmentApi.move(watcher, room);
    ContainmentApi.move(subject, room);

    RecognitionApi.learnIdentity(watcher, subject, null);
    RecognitionApi.learnIdentity(watcher, subject, null);

    expect(watcher.recallRealm(RECOGNITION).size).toBe(1);
    const rec = watcher.recall(RECOGNITION, subject.getTemplatePath()!);
    expect(rec?.knownAs).toBeNull(); // stranger, name not learned
    // Still renders salient features, not a record-less crash.
    expect(RecognitionApi.describe(watcher, subject)).toBe('a tall stranger');
  });

  it('an introduce after repeat-perception upgrades the same record', () => {
    const room = makeStuff(() => new Room());
    const mara = makePerson('Mara', 'a tall stranger');
    const listener = makePerson('Pat', 'a short person');
    ContainmentApi.move(mara, room);
    ContainmentApi.move(listener, room);

    // Listener has seen Mara around (stranger record) before the intro.
    RecognitionApi.learnIdentity(listener, mara, null);
    expect(listener.recall(RECOGNITION, mara.getTemplatePath()!)?.knownAs).toBeNull();

    const controller = makeStuff(() => new IntroduceController());
    controller.execute(model(), context(mara, room));

    // Same single record, now named.
    expect(listener.recallRealm(RECOGNITION).size).toBe(1);
    expect(listener.recall(RECOGNITION, mara.getTemplatePath()!)?.knownAs).toBe(
      'Mara',
    );
  });
});
