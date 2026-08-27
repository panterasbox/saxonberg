/**
 * TasteController smoke — channel = `taste`, topic =
 * `sense.survey`. Wider coverage lives in
 * SmellController.test.ts.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import TasteController from '../TasteController';
import type { MqlOneResult } from '../../../../../api/mql';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { PerceptibleMixin } from '../../../../../lib/description/Perceptible';
import { FocusedMixin } from '../../../../../lib/command/Focused';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { DetailedMixin } from '../../../../../lib/description/Detailed';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { OrganismMixin } from '../../../../../lib/species/Organism';
import Species from '../../../species/Species';
import BodyPlan from '../../../species/BodyPlan';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import type { FieldMeta } from '../../../../../lib/mixin';

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
    '/stuff/idea/species/BodyPlan/test-taste',
  );
  bp.setSensoryPorts([
    { modality: 'taste', count: 1, position: 'forward' },
  ]);
  const sp = withTemplatePath(
    makeStuff(() => new Species()),
    '/stuff/idea/species/test/taste-only',
  );
  sp.setBodyPlan(bp);
  const location = makeStuff(() => new TestLocation()) as TestLocation & {
    setName: (n: string) => void;
  };
  location.setName('Kitchen');
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
    'verbs: [taste]\ncontroller: NoopController\ndescription: stub\n',
    '<test>',
  );
}
function ctxOf(fix: { giver: ReceivingGiver; location: TestLocation }): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: fix.giver as unknown as Parameters<
      typeof CommandApi.createCommandContext
    >[0]['commandGiver'],
    location: fix.location as never,
    commandText: 'taste',
    executionId: 't',
    commandId: 'c',
    verb: 'taste',
    command: stub(),
  });
}
function modelOf(target: MqlOneResult | undefined): CommandModel {
  return { target } as ModelData as CommandModel;
}

describe('TasteController', () => {
  let fix: { giver: ReceivingGiver; location: TestLocation };
  beforeEach(() => {
    fix = makeFixture();
  });

  it('targeted taste reads taste slot from detail', () => {
    fix.location.setDetail(['apple'], {
      taste: 'tart and a little metallic',
    });
    const target: MqlOneResult = {
      stuff: fix.location,
      raw: 'apple',
      via: { detailPath: ['apple'] },
    };
    const c = makeStuff(() => new TasteController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.topic).toBe('sense.survey');
    expect(f?.body).toContain('tart');
  });
});
