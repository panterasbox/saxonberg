/**
 * FeelController smoke — channel = `touch`, topic =
 * `world.perception.sense.feel`. Wider coverage lives in
 * SmellController.test.ts (the shared SingleSenseControllerBase
 * pipeline is exercised once there).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import FeelController from '../FeelController';
import type { MqlOneResult } from '../../../../api/mql';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { PerceptibleMixin } from '../../../../lib/description/Perceptible';
import { FocusedMixin } from '../../../../lib/command/Focused';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { DetailedMixin } from '../../../../lib/description/Detailed';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { OrganismMixin } from '../../../../lib/species/Organism';
import Species from '../../../species/Species';
import BodyPlan from '../../../species/BodyPlan';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import Thing from '../../../../lib/stuff/Thing';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import type { FieldMeta } from '../../../../lib/mixin';

class ThermalMug extends ThermalMixin(Thing) {
  static _mixinName = 'ThermalMugFeel';
}

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
  static fieldMeta: FieldMeta = {};
  public received: Array<{ topic: string; body: string }> = [];
  protected override handleMessage(msg: unknown): void {
    const frame = msg as { topic: string; body: string };
    this.received.push({ topic: frame.topic, body: frame.body });
  }
}
class TestLocation extends ContainerMixin(
  DetailedMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {
  static fieldMeta: FieldMeta = {};
}
function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}
function makeFixture(): { giver: ReceivingGiver; location: TestLocation } {
  StuffApi.clearAll();
  const bp = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    '/obj/species/BodyPlan/test-feel',
  );
  bp.setSensoryPorts([
    { modality: 'touch', count: 1, position: 'circumferential' },
  ]);
  const sp = withTemplatePath(
    makeStuff(() => new Species()),
    '/obj/species/test/touch-only',
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
    expect(f?.topic).toBe('world.perception.sense.feel');
    expect(f?.body).toContain('rough oak');
  });

  it('feel <thermal object> reports the object surface band', () => {
    const mug = makeStuff(() => {
      const m = new ThermalMug();
      m.setShortDescription('a mug');
      m.setStampedTemperatureK(330); // hot
      m.setLastAmbientK(295);
      return m;
    });
    ContainmentApi.move(
      mug as unknown as Parameters<typeof ContainmentApi.move>[0],
      fix.location as unknown as Parameters<typeof ContainmentApi.move>[1],
    );
    const target: MqlOneResult = { stuff: mug as unknown as Stuff, raw: 'mug' };
    const c = makeStuff(() => new FeelController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.topic).toBe('world.perception.sense.feel');
    expect(f?.body).toMatch(/feels (warm|hot)/);
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
    expect(f?.topic).toBe('world.perception.sense.feel');
    expect(f?.body).toContain("don't perceive");
  });
});
