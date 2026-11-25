/**
 * CommsMixin — comms on the person (aether-devices D2). The person sends
 * as themselves: the `speech.comms` scene is built from the person with
 * the `verbal-esp` modality, and cohort state lands on the people. Whether
 * a message can leave is `sendOrHold`: a host that tunes them, with
 * Messages installed on it.
 */

import "../../../../test-bootstrap";
import { setFlatSenses } from '../../species/__tests__/flat-body';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { OrganismMixin } from '../../species/Organism';
import { AetherMixin } from '../../message/Aether';
import { AetherHostMixin, type AetherHost } from '../../augmentation/AetherHost';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { SlottedMixin } from '../../slot/Slotted';
import Good from '../../stuff/Good';
import AetherImplant from '../../../platform/thing/AetherImplant';
import App from '../../../platform/idea/App';
import { CommsMixin, type Comms } from '../Comms';
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
class AttunedActor extends CommsMixin(SlottedMixin(
  AetherHostMixin(AetherMixin(SensorMixin(NamedMixin(OrganismMixin(Good))))),
)) {
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
function makeAttuned(
  name: string,
  opts: { implant?: boolean } = {},
): AttunedActor & AetherHost & Comms {
  const biped = withPath(
    makeStuff(() => new BodyPlan()),
    `/stuff/idea/species/BodyPlan/biped-comms-test-${bodyPlanSeq}`,
  );
  setFlatSenses(biped, [
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'hearing', count: 2, position: 'lateral' },
  ]);
  biped.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const species = withPath(
    makeStuff(() => new Species()),
    `/stuff/idea/species/animalia/comms-test-${bodyPlanSeq}`,
  );
  bodyPlanSeq += 1;
  species.setBodyPlan(biped);
  const actor = makeStuff(() => new AttunedActor()) as AttunedActor & {
    setSpecies: (s: Species) => void;
  };
  actor.setSpecies(species);
  actor.setName(name);
  if (opts.implant !== false) {
    const implant = makeStuff(() => new AetherImplant());
    (actor as unknown as AttunedActor).occupy(implant, 'cranial');
  }
  return actor as unknown as AttunedActor & AetherHost & Comms;
}

/** The implant seated in `actor`'s cranial slot. */
function implantOf(actor: AttunedActor): AetherImplant {
  return [...actor.getOccupants('cranial')][0] as unknown as AetherImplant;
}

/** Stub the row clone so `installApp` stands up a stamped app. */
function stubAppClone(): void {
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) =>
    withPath(makeStuff(() => new App()), path)) as never);
}

describe('CommsMixin (on the person)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
    stubAppClone();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('tell sends as the person, with verbal-esp; cohort lands on the people', () => {
    const alice = makeAttuned('Alice');
    const bob = makeAttuned('Bob');

    alice.tell(bob as unknown as Stuff, 'hello there');

    const selfFrame = (alice as unknown as AttunedActor).received.find(
      (f) => f.topic === 'speech.comms',
    );
    expect(selfFrame).toBeDefined();
    const bobFrame = (bob as unknown as AttunedActor).received.find(
      (f) => f.topic === 'speech.comms',
    );
    expect(bobFrame).toBeDefined();
    expect(bobFrame!.meta.modality).toBe('verbal-esp');

    // ⭐ Both frames carry the server's privacy stamp (broadcast-ready D8)
    // — what a streamer's client redacts on air.
    expect(selfFrame!.tags).toContain('privacy:private');
    expect(bobFrame!.tags).toContain('privacy:private');

    expect(alice.getLastOutboundCohort()).toEqual([bob]);
    expect(bob.getLastInboundCohort()).toEqual([alice]);
  });

  it('an untuned person cannot transmit (tell throws — controllers ask first)', () => {
    const alice = makeAttuned('Alice', { implant: false });
    const bob = makeAttuned('Bob');
    expect(() => alice.tell(bob as unknown as Stuff, 'hi')).toThrow(
      InactiveCapabilityError,
    );
  });

  it('sendOrHold: nothing that tunes → none, naming the phone', () => {
    const alice = makeAttuned('Alice', { implant: false });
    const r = alice.sendOrHold('dm bob hi');
    expect(r?.reason).toBe('aether-none');
  });

  it('sendOrHold: a tuner without Messages → no-messages, naming apps install', () => {
    const alice = makeAttuned('Alice');
    const r = alice.sendOrHold('dm bob hi');
    expect(r?.reason).toBe('aether-no-messages');
  });

  it('sendOrHold: Messages on the tuner → go; uninstall → refused; reinstall → go', async () => {
    const alice = makeAttuned('Alice');
    const implant = implantOf(alice as unknown as AttunedActor);
    await implant.installApp(App.MESSAGES_PATH);
    expect(alice.sendOrHold('dm bob hi')).toBeNull();
    expect(implant.uninstallApp('messages')).toBe(true);
    expect(alice.sendOrHold('dm bob hi')?.reason).toBe('aether-no-messages');
    await implant.installApp(App.MESSAGES_PATH);
    expect(alice.sendOrHold('dm bob hi')).toBeNull();
  });

  it('sendOrHold: a person tuned by nature (species) is their own host', async () => {
    const alice = makeAttuned('Alice', { implant: false });
    (alice as unknown as { getSpecies(): Species }).getSpecies().setInnateMixins(['AetherMixin']);
    expect(alice.isOwnAetherHost()).toBe(true);
    expect(alice.sendOrHold('dm bob hi')?.reason).toBe('aether-no-messages');
    await alice.installApp(App.MESSAGES_PATH);
    expect(alice.sendOrHold('dm bob hi')).toBeNull();
  });
});
