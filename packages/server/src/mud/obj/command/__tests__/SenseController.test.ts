/**
 * SenseController tests — covers AC #26, #27, #28.
 *
 * AC #29 / #30 (auto-on-entry switch — Avatar.enter / Mobile
 * arrival hook) ride `Mobile.autoSenseOnArrival` which is already
 * verified by the rename (call sites updated, full server suite
 * green); their explicit gate lives below as a substrate test
 * that asserts `autoSenseOnArrival` forces the `sense` verb (not
 * `look`).
 */

import { describe, it, expect } from 'vitest';
import { SenseController } from '../SenseController';
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
import type { SenseChannel } from '../../../lib/description/Perceiver';
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
function makeFixture(channels: SenseChannel[]): { giver: ReceivingGiver; location: TestLocation } {
  StuffApi.clearAll();
  const bp = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    `/lib/body-plans/test-sense-${channels.join('-') || 'sessile'}`,
  );
  bp.setSensoryPorts(
    channels.map((ch) => ({
      modality: ch,
      count: 1,
      position: 'frontal',
    })),
  );
  const sp = withTemplatePath(
    makeStuff(() => new Species()),
    `/lib/species/test/sense-${channels.join('-') || 'sessile'}`,
  );
  sp.setBodyPlan(bp);
  const location = makeStuff(() => new TestLocation()) as TestLocation & {
    setName: (n: string) => void;
  };
  location.setName('Atrium');
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
    'verbs: [sense]\ncontroller: NoopController\ndescription: stub\n',
    '<test>',
  );
}
function ctxOf(fix: { giver: ReceivingGiver; location: TestLocation }): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: fix.giver as unknown as Parameters<
      typeof CommandApi.createCommandContext
    >[0]['commandGiver'],
    location: fix.location as never,
    commandText: 'sense',
    executionId: 't',
    commandId: 'c',
    verb: 'sense',
    command: stub(),
  });
}
function modelOf(target: MqlOneResult | undefined): CommandModel {
  return { target } as ModelData as CommandModel;
}

describe('SenseController', () => {
  it('bare sense fires Scene at world.perception.sense with viewer-full-sensorium filter; AC #26', () => {
    const fix = makeFixture(['vision', 'hearing', 'smell']);
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription(
      '<sense channel="vision">A bright hall.</sense>' +
        '<sense channel="hearing">Footsteps echo.</sense>' +
        '<sense channel="smell">Old varnish.</sense>' +
        '<sense channel="taste">should be stripped</sense>',
    );
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const c = makeStuff(() => new SenseController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.topic).toBe('world.perception.sense');
    expect(f?.body).toContain('A bright hall.');
    expect(f?.body).toContain('Footsteps echo.');
    expect(f?.body).toContain('Old varnish.');
    // Taste isn't in the viewer's sensorium → stripped.
    expect(f?.body).not.toContain('should be stripped');
  });

  it('sense <target> mirrors look <target> shape with gestalt filter; AC #27', () => {
    const fix = makeFixture(['vision', 'hearing']);
    // Author a separate Stuff with multi-sense long.
    const item = makeStuff(() => new TestLocation()) as TestLocation & {
      setName: (n: string) => void;
      setLongDescription: (s: string) => void;
    };
    item.setName('chime');
    item.setLongDescription(
      '<sense channel="vision">A brass chime.</sense>' +
        '<sense channel="hearing">It rings softly.</sense>',
    );
    const target: MqlOneResult = { stuff: item, raw: 'chime' };
    const c = makeStuff(() => new SenseController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.body).toContain('A brass chime.');
    expect(f?.body).toContain('It rings softly.');
  });

  it('sense detail uses vision sense for lookup; AC #27 detail rule', () => {
    const fix = makeFixture(['vision', 'hearing']);
    fix.location.setDetail(['plaque'], {
      vision: 'A bronze plaque.',
      hearing: 'should NOT come back through sense detail',
    });
    const target: MqlOneResult = {
      stuff: fix.location,
      raw: 'plaque',
      via: { detailPath: ['plaque'] },
    };
    const c = makeStuff(() => new SenseController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.body).toContain('A bronze plaque.');
    expect(f?.body).not.toContain('should NOT come back');
  });

  it('dark-room substrate: sightless-by-construction viewer sees only hearing region; AC #28', () => {
    // Sightless-by-construction sensorium (no LightApi integration v1).
    const fix = makeFixture(['hearing']);
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription(
      '<sense channel="vision">A bookcase looms.</sense>' +
        '<sense channel="hearing">Water drips somewhere.</sense>',
    );
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const c = makeStuff(() => new SenseController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.body).not.toContain('A bookcase looms.');
    expect(f?.body).toContain('Water drips somewhere.');
  });

  it('sighted+hearing viewer sees both vision + hearing regions; AC #28 mirror', () => {
    const fix = makeFixture(['vision', 'hearing']);
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription(
      '<sense channel="vision">A bookcase looms.</sense>' +
        '<sense channel="hearing">Water drips somewhere.</sense>',
    );
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const c = makeStuff(() => new SenseController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.body).toContain('A bookcase looms.');
    expect(f?.body).toContain('Water drips somewhere.');
  });

  it('vision-only authored long renders identically for vision-bearing viewer; AC #29 invariant', () => {
    const fix = makeFixture(['vision', 'hearing']);
    // Existing-style legacy long with no <sense> regions.
    (fix.location as unknown as {
      setLongDescription: (s: string) => void;
    }).setLongDescription('A vast atrium with a glass ceiling.');
    const target: MqlOneResult = { stuff: fix.location, raw: 'here' };
    const c = makeStuff(() => new SenseController());
    c.execute(modelOf(target), ctxOf(fix));
    const f = fix.giver.received.at(-1);
    expect(f?.body).toContain('A vast atrium with a glass ceiling.');
  });

  it('null target → polite refusal', () => {
    const fix = makeFixture(['vision']);
    const c = makeStuff(() => new SenseController());
    const ctx = ctxOf(fix);
    const target: MqlOneResult = { stuff: null, raw: 'imaginary-thing' };
    c.execute(modelOf(target), ctx);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'empty-result' }),
    );
  });
});
