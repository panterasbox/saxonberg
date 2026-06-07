/**
 * FeelController mirror — channel = `touch`, topic =
 * `world.perception.feel`. AC #23 mirror.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeelController } from '../FeelController';
import type { MqlOneResult } from '../../../api/mql';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../api/command';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { NamedMixin } from '../../../lib/description/Named';
import { PerceptibleMixin } from '../../../lib/description/Perceptible';
import { FocusedMixin } from '../../../lib/command/Focused';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { VisibleMixin } from '../../../lib/description/Visible';
import { OrganismMixin } from '../../../lib/species/Organism';
import { Species } from '../../../lib/species/Species';
import { BodyPlan } from '../../../lib/species/BodyPlan';
import { Idea } from '../../../lib/stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';

const Base = OrganismMixin(
  ContainerMixin(
    ContainableMixin(
      SensorMixin(
        FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea)))),
      ),
    ),
  ),
);
class ReceivingGiver extends Base {
  static persistentFields: string[] = [];
  public received: Array<{ topic: string; body: string }> = [];
  protected override handleMessage(msg: unknown): void {
    const frame = msg as { topic: string; body: string };
    this.received.push({ topic: frame.topic, body: frame.body });
  }
}
class TestLocation extends ContainerMixin(
  DetailedMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {
  static persistentFields: string[] = [];
}
function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}
function makeFixture(): { giver: ReceivingGiver; location: TestLocation } {
  StuffApi.clearAll();
  const bp = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    '/lib/body-plans/test-feel',
  );
  bp.setSensoryPorts([
    { modality: 'touch', count: 1, position: 'circumferential' },
  ]);
  const sp = withTemplatePath(
    makeStuff(() => new Species()),
    '/lib/species/test/touch-only',
  );
  sp.setBodyPlan(bp);
  const location = makeStuff(() => new TestLocation()) as TestLocation & {
    setName: (n: string) => void;
  };
  location.setName('Workshop');
  const giver = makeStuff(() => new ReceivingGiver()) as ReceivingGiver & {
    setName: (n: string) => void;
    setSpecies: (s: Species) => void;
  };
  giver.setName('bob');
  giver.setSpecies(sp);
  ContainmentApi.move(
    giver as unknown as Parameters<typeof ContainmentApi.move>[0],
    location as unknown as Parameters<typeof ContainmentApi.move>[1],
  );
  return { giver, location };
}
function stub(): CommandDefinition {
  return CommandDefinition.fromYaml(
    'verbs: [feel]\ncontroller: NoopController\ndescription: stub\n',
    '<test>',
  );
}
function ctxOf(fix: { giver: ReceivingGiver; location: TestLocation }): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: fix.giver as unknown as Parameters<
      typeof CommandApi.createCommandContext
    >[0]['commandGiver'],
    location: fix.location as never,
    commandText: 'feel',
    executionId: 't',
    commandId: 'c',
    verb: 'feel',
    command: stub(),
  });
}
function modelOf(target: MqlOneResult | undefined): CommandModel {
  return { target } as ModelData as CommandModel;
}

describe('FeelController', () => {
  let fix: { giver: ReceivingGiver; location: TestLocation };
  beforeEach(() => {
    fix = makeFixture();
  });

  it('targeted feel reads touch slot from detail', () => {
    fix.location.setDetail(['workbench'], {
      touch: 'rough oak, scarred with chisel marks',
    });
    const target: MqlOneResult = {
      stuff: fix.location,
      raw: 'workbench',
      via: { detailPath: ['workbench'] },
    };
    const c = makeStuff(() => new FeelController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.topic).toBe('world.perception.feel');
    expect(f?.body).toContain('rough oak');
  });

  it('bare feel on a vision-only location → polite refusal', () => {
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription(
      '<sense channel="vision">Tools hang on the wall.</sense>',
    );
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const c = makeStuff(() => new FeelController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.topic).toBe('world.perception.feel');
    expect(f?.body).toContain("don't perceive");
  });
});
