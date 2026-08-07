/**
 * CommsMixin — comms-as-update. A CommsUpdate hosted on an attuned
 * actor transmits on behalf of its operator (the host): the
 * `speech.comms` scene is built from the host with the `verbal-esp`
 * modality, and cohort state lands on the update.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import Species from '../../../obj/species/Species';
import BodyPlan from '../../../obj/species/BodyPlan';
import { OrganismMixin } from '../../species/Organism';
import { AetherMixin, type AetherHost } from '../../message/Aether';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { SlottedMixin } from '../../slot/Slotted';
import Thing from '../../stuff/Thing';
import AetherImplant from '../../../obj/AetherImplant';
import CommsUpdate from '../../../obj/CommsUpdate';
import { InactiveCapabilityError } from '../../security/RequiresActive';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { MessageFrame } from '@saxonberg/types';
import type { FieldMeta } from '../../mixin';

// An attuned, embodied actor: Slotted (carries the implant) + Aether
// (the host) + Sensor (hears its own self frame) + Named + Organism.
class AttunedActor extends SlottedMixin(
  AetherMixin(SensorMixin(NamedMixin(OrganismMixin(Thing)))),
) {
  static fieldMeta: FieldMeta = {};
  override staticSlots = [
    { name: 'cranial', accepts: 'SlottableMixin' as const },
  ];
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

function withPath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

let bodyPlanSeq = 0;
function makeAttuned(name: string): AttunedActor & AetherHost {
  const biped = withPath(
    makeStuff(() => new BodyPlan()),
    `/obj/species/BodyPlan/biped-comms-test-${bodyPlanSeq}`,
  );
  biped.setSensoryPorts([
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'hearing', count: 2, position: 'lateral' },
  ]);
  biped.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const species = withPath(
    makeStuff(() => new Species()),
    `/obj/species/animalia/comms-test-${bodyPlanSeq}`,
  );
  bodyPlanSeq += 1;
  species.setBodyPlan(biped);
  const actor = makeStuff(() => new AttunedActor()) as AttunedActor & {
    setSpecies: (s: Species) => void;
  };
  actor.setSpecies(species);
  actor.setName(name);
  const implant = makeStuff(() => new AetherImplant());
  (actor as unknown as AttunedActor).occupy(implant, 'cranial');
  return actor as unknown as AttunedActor & AetherHost;
}

describe('CommsMixin (comms-as-update)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('tell sends from the host, with verbal-esp; cohort lands on the updates', () => {
    const alice = makeAttuned('Alice');
    const bob = makeAttuned('Bob');
    const aliceComms = makeStuff(() => new CommsUpdate());
    alice.hostUpdate(aliceComms);
    const bobComms = makeStuff(() => new CommsUpdate());
    bob.hostUpdate(bobComms);

    aliceComms.tell(bob as unknown as Stuff, 'hello there');

    // Alice (the operator) hears her own self frame, tagged dm.
    const selfFrame = (alice as unknown as AttunedActor).received.find(
      (f) => f.topic === 'speech.comms',
    );
    expect(selfFrame).toBeDefined();

    // Bob receives the target frame.
    const bobFrame = (bob as unknown as AttunedActor).received.find(
      (f) => f.topic === 'speech.comms',
    );
    expect(bobFrame).toBeDefined();

    // Cohort: outbound on Alice's update, inbound on Bob's update.
    expect(aliceComms.getLastOutboundCohort()).toEqual([bob]);
    expect(bobComms.getLastInboundCohort()).toEqual([alice]);
  });

  it('an unhosted comms update cannot transmit (no operator)', () => {
    const orphan = makeStuff(() => new CommsUpdate());
    const bob = makeAttuned('Bob');
    expect(() => orphan.tell(bob as unknown as Stuff, 'hi')).toThrow(
      InactiveCapabilityError,
    );
  });
});
