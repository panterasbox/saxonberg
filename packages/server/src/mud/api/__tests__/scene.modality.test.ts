import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageApi } from '../message';
import { StuffApi } from '../stuff';
import { SensorMixin } from '../../lib/message/Sensor';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { OrganismMixin } from '../../lib/species/Organism';
import { Idea } from '../../lib/stuff/Idea';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { buildAllModalities } from '../../lib/perception/modalities/__tests__/test-helpers';
import type { MessageFrame } from '@saxonberg/types';
import type { Stuff } from '../../lib/stuff/Stuff';

const ReceivingActorBase = OrganismMixin(
  ContainerMixin(
    ContainableMixin(SensorMixin(NamedMixin(PerceptibleMixin(Idea)))),
  ),
);
class ReceivingActor extends ReceivingActorBase {
  received: MessageFrame[] = [];
  protected override handleMessage(frame: MessageFrame): void {
    this.received.push(frame);
  }
}

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

function makeActor(channels: string[]): Stuff {
  const bp = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    `/stuff/idea/species/BodyPlan/scene-modality-${channels.join('-') || 'sessile'}`,
  );
  bp.setSensoryPorts(
    channels.map((ch) => ({
      modality: ch as never,
      count: 1,
      position: 'frontal',
    })),
  );
  const sp = withTemplatePath(
    makeStuff(() => new Species()),
    `/stuff/idea/species/test/scene-modality-${channels.join('-') || 'sessile'}`,
  );
  sp.setBodyPlan(bp);
  const actor = makeStuff(() => new ReceivingActor()) as ReceivingActor & {
    setSpecies: (s: Species) => void;
  };
  actor.setSpecies(sp);
  return actor;
}

describe('Scene.modality + SensorMixin.filterMessage', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Scene.modality stamps meta.modality on composed frames', () => {
    const speaker = makeActor(['hearing']) as ReceivingActor;
    MessageApi.scene(speaker)
      .topic('world.test.modality-stamp')
      .modality('hearing')
      .toSelf('hi')
      .send();
    const frame = speaker.received.at(-1);
    expect(frame?.meta.modality).toBe('hearing');
  });

  it('frames without modality have undefined meta.modality', () => {
    const speaker = makeActor(['hearing']) as ReceivingActor;
    MessageApi.scene(speaker)
      .topic('shell.diagnostic')
      .toSelf('hi')
      .send();
    const frame = speaker.received.at(-1);
    expect(frame?.meta.modality).toBeUndefined();
  });

  it('actor self-frame bypasses the modality check (always delivers)', () => {
    // A deaf-by-bodyplan actor speaks; their self-frame still delivers.
    const speaker = makeActor([]) as ReceivingActor;
    MessageApi.scene(speaker)
      .topic('world.test.actor-bypass')
      .modality('hearing')
      .toSelf('hello')
      .send();
    const frame = speaker.received.at(-1);
    expect(frame).toBeDefined();
    expect(frame!.tags).toContain('audience:actor');
  });

  it('frame with modality not in recipient sensorium is dropped', () => {
    // A target with no hearing receives a hearing-tagged frame → drop.
    const deaf = makeActor(['vision']) as ReceivingActor;
    MessageApi.scene(deaf)
      .topic('world.test.deaf')
      .modality('hearing')
      .toTarget(deaf, 'meow')
      .send();
    // The toTarget frame on `deaf` (NOT self) has audience:target,
    // not audience:actor, so the modality gate applies.
    const targetFrame = deaf.received.find((f) => f.tags?.includes('audience:target'));
    expect(targetFrame).toBeUndefined();
  });

  it('frame with modality IN recipient sensorium delivers', () => {
    const hearing = makeActor(['hearing']) as ReceivingActor;
    MessageApi.scene(hearing)
      .topic('world.test.hearing')
      .modality('hearing')
      .toTarget(hearing, 'meow')
      .send();
    const targetFrame = hearing.received.find((f) => f.tags?.includes('audience:target'));
    expect(targetFrame).toBeDefined();
  });

  it('no-meta-modality frame delivers to a recipient with empty sensorium', () => {
    const sessile = makeActor([]) as ReceivingActor;
    MessageApi.scene(sessile)
      .topic('session.link')
      .toTarget(sessile, 'hello')
      .send();
    const f = sessile.received.find((f) => f.tags?.includes('audience:target'));
    expect(f).toBeDefined();
  });
});
