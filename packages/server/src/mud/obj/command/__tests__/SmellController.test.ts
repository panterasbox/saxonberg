/**
 * SmellController tests — full coverage of the four branches.
 * Sibling tests for listen/feel/taste rely on the shared
 * `SingleSenseControllerBase` exercised here.
 *
 * Branches under test:
 *   - bare `smell` fires Scene at `world.perception.sense.smell`
 *     with the location's long filtered to `['smell']`.
 *   - `smell <target>` resolves via MQL, reads
 *     `getDetail(id, 'smell')`, polite fallback on null.
 *   - non-Detailed / nothing-to-perceive targets get polite refusal.
 *   - targets outside MQL scope aren't addressable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import SmellController from '../SmellController';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
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
import Species from '../../../lib/species/Species';
import BodyPlan from '../../../lib/species/BodyPlan';
import { Idea } from '../../../lib/stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import type { CommandGiver } from '../../../lib/command/CommandGiver';
import type { Focused } from '../../../lib/command/Focused';
import { buildAllModalities } from '../../../lib/perception/modalities/__tests__/test-helpers';

const ReceivingGiverBase = OrganismMixin(
  ContainerMixin(
    ContainableMixin(
      SensorMixin(
        FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea)))),
      ),
    ),
  ),
);

class ReceivingGiver extends ReceivingGiverBase {
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

interface Fixture {
  giver: Stuff & CommandGiver & Focused & { received: Array<{ topic: string; body: string }> };
  location: TestLocation;
}

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

function makeFixture(): Fixture {
  StuffApi.clearAll();
  buildAllModalities();
  const bodyPlan = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    '/lib/body-plans/test-smell',
  );
  bodyPlan.setSensoryPorts([
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'smell', count: 1, position: 'forward' },
    { modality: 'hearing', count: 2, position: 'lateral' },
    { modality: 'touch', count: 1, position: 'circumferential' },
    { modality: 'taste', count: 1, position: 'forward' },
  ]);
  const species = withTemplatePath(
    makeStuff(() => new Species()),
    '/lib/species/test/full-sensory',
  );
  species.setBodyPlan(bodyPlan);

  const location = makeStuff(() => new TestLocation()) as TestLocation & {
    setName: (n: string) => void;
  };
  location.setName('Town Square');

  const giver = makeStuff(() => new ReceivingGiver()) as unknown as Fixture['giver'] & {
    setName: (n: string) => void;
    setSpecies: (s: Species) => void;
  };
  giver.setName('bob');
  giver.setSpecies(species);
  ContainmentApi.move(
    giver as unknown as Parameters<typeof ContainmentApi.move>[0],
    location as unknown as Parameters<typeof ContainmentApi.move>[1],
  );

  return { giver, location };
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(fix: Fixture, text: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: fix.giver,
    location: fix.location as never,
    commandText: text,
    executionId: 'test',
    commandId: 'test',
    verb: 'smell',
    command: stubCommand('smell'),
  });
}

function makeModel(target: MqlOneResult | undefined): CommandModel {
  return { target } as ModelData as CommandModel;
}

describe('SmellController', () => {
  let fix: Fixture;

  beforeEach(() => {
    fix = makeFixture();
  });

  it('null target → polite "you don\'t perceive any X here"', () => {
    const controller = makeStuff(() => new SmellController());
    const ctx = makeContext(fix, 'smell nothing');
    const target: MqlOneResult = { stuff: null, raw: 'mystery-thing' };
    controller.execute(makeModel(target), ctx);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'empty-result', field: 'target' }),
    );
    const lastFrame = fix.giver.received.at(-1);
    expect(lastFrame?.topic).toBe('world.perception.sense.smell');
    expect(lastFrame?.body).toContain('mystery-thing');
  });

  it('non-Detailed direct target → polite refusal', () => {
    const fakeStuff = { stuffId: 'fake' } as Stuff;
    const target: MqlOneResult = { stuff: fakeStuff, raw: 'fake' };
    const controller = makeStuff(() => new SmellController());
    const ctx = makeContext(fix, 'smell fake');
    controller.execute(makeModel(target), ctx);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'target-not-perceivable',
      }),
    );
  });

  it('detail-via with smell slot populated renders the slot', () => {
    fix.location.setDetail(['leather'], {
      smell: 'old leather and tobacco',
    });
    const target: MqlOneResult = {
      stuff: fix.location,
      raw: 'leather',
      via: { detailPath: ['leather'] },
    };
    const controller = makeStuff(() => new SmellController());
    const ctx = makeContext(fix, 'smell leather');
    controller.execute(makeModel(target), ctx);
    expect(ctx.getNotes()).not.toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected' }),
    );
    const lastFrame = fix.giver.received.at(-1);
    expect(lastFrame?.topic).toBe('world.perception.sense.smell');
    expect(lastFrame?.body).toContain('old leather and tobacco');
  });

  it('detail-via with no smell slot → polite fallback', () => {
    // Vision-only legacy detail; getDetail('book', 'smell') = null.
    fix.location.setDetail(['book'], 'A leather-bound tome.');
    const target: MqlOneResult = {
      stuff: fix.location,
      raw: 'book',
      via: { detailPath: ['book'] },
    };
    const controller = makeStuff(() => new SmellController());
    const ctx = makeContext(fix, 'smell book');
    controller.execute(makeModel(target), ctx);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'detail-not-found',
      }),
    );
  });

  it('bare smell on a vision-only location → polite refusal', () => {
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription(
      '<sense channel="vision">Cobblestones.</sense>',
    );
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const controller = makeStuff(() => new SmellController());
    const ctx = makeContext(fix, 'smell here');
    controller.execute(makeModel(target), ctx);
    const lastFrame = fix.giver.received.at(-1);
    expect(lastFrame?.topic).toBe('world.perception.sense.smell');
    expect(lastFrame?.body).toContain("don't perceive");
  });

  it('bare smell on a location with smell region renders it', () => {
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription(
      '<sense channel="vision">A wide stone plaza.</sense>' +
        '<sense channel="smell">Wet stone and ozone from the rain.</sense>',
    );
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const controller = makeStuff(() => new SmellController());
    const ctx = makeContext(fix, 'smell here');
    controller.execute(makeModel(target), ctx);
    const lastFrame = fix.giver.received.at(-1);
    expect(lastFrame?.topic).toBe('world.perception.sense.smell');
    expect(lastFrame?.body).not.toContain('A wide stone plaza.');
    expect(lastFrame?.body).toContain('Wet stone and ozone');
  });

  it('untagged prose survives the smell filter on the location branch', () => {
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription('Plain prose, no sense tags.');
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const controller = makeStuff(() => new SmellController());
    const ctx = makeContext(fix, 'smell here');
    controller.execute(makeModel(target), ctx);
    const lastFrame = fix.giver.received.at(-1);
    expect(lastFrame?.body).toContain('Plain prose, no sense tags.');
  });

  it('targets outside MQL scope are unresolvable', () => {
    const result = MqlApi.resolveOne('nonsense-thing-9001', {
      commandGiver: fix.giver,
      scope: 'reachable',
    });
    expect(result.stuff).toBeNull();
  });
});
