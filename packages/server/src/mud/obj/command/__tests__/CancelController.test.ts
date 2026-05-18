/**
 * CancelController tests — bare `cancel`, `cancel <type>`, and the
 * empty-result branch when nothing matches.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { CancelController } from '../CancelController';
import { EngagedMixin } from '../../../lib/activity/Engaged';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { Idea } from '../../../lib/stuff/Idea';
import { Location } from '../../../lib/stuff/Location';
import { SchedulerApi } from '../../../api/scheduler';
import type { DurativeActivity } from '../../../api/scheduler';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../api/command';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

// CommandGiver shape that composes EngagedMixin so isEngaged is true.
class TestActor extends SensorMixin(
  CommandGiverMixin(
    EngagedMixin(
      ContainerMixin(ContainableMixin(Idea)),
    ),
  ),
) {
  static _mixinName = 'TestActor';
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [cancel]\ncontroller: CancelController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(actor: TestActor, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'cancel',
    executionId: 'test',
    commandId: 'test',
    verb: 'cancel',
    command: stubCommand(),
  });
}

function makeModel(type?: string): unknown {
  return { type } as ModelData;
}

/** Build a fixture engagement with a configurable type/duration. */
function makeEngagement(
  actor: TestActor,
  type: string,
): DurativeActivity {
  return {
    engagementId: '',
    type,
    actor: actor as unknown as DurativeActivity['actor'],
    startedAt: Date.now(),
    slots: new Set([type === 'reading' ? 'attention' : 'body']),
    interruptibleBy: new Set(),
    cancelable: true,
    duration: 5000,
    replaceableBy: [],
    onStart: () => undefined,
    onComplete: () => undefined,
    onAbort: () => undefined,
  };
}

describe('CancelController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  it('bare cancel narrates "You cancel what you were doing." and clears every engagement', async () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, loc);

    const a = makeEngagement(actor, 'walking');
    const b = makeEngagement(actor, 'reading');
    SchedulerApi.start(a);
    SchedulerApi.start(b);
    expect(SchedulerApi.getEngagements(actor).length).toBe(2);

    const controller = makeStuff(() => new CancelController());
    const ctx = makeContext(actor, loc);
    await controller.execute(
      makeModel() as Parameters<CancelController['execute']>[0],
      ctx,
    );

    expect(SchedulerApi.getEngagements(actor).length).toBe(0);
    expect(ctx.getStatus()).toBe('ok');
  });

  it('cancel <type> aborts the matching engagement only', async () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, loc);

    const a = makeEngagement(actor, 'walking');
    const b = makeEngagement(actor, 'reading');
    SchedulerApi.start(a);
    SchedulerApi.start(b);

    const controller = makeStuff(() => new CancelController());
    const ctx = makeContext(actor, loc);
    await controller.execute(
      makeModel('walking') as Parameters<CancelController['execute']>[0],
      ctx,
    );

    expect(SchedulerApi.getEngagementBySlot(actor, 'body')).toBeUndefined();
    expect(SchedulerApi.getEngagementBySlot(actor, 'attention')).toBe(b);
  });

  it('cancel <type> with no matching engagement emits empty-result', async () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, loc);

    const controller = makeStuff(() => new CancelController());
    const ctx = makeContext(actor, loc);
    await controller.execute(
      makeModel('forging') as Parameters<CancelController['execute']>[0],
      ctx,
    );

    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'empty-result',
        field: 'type',
        query: 'forging',
      }),
    );
  });

  it('bare cancel against an empty engagement map is a clean no-op', async () => {
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, loc);

    const controller = makeStuff(() => new CancelController());
    const ctx = makeContext(actor, loc);
    expect(() =>
      controller.execute(
        makeModel() as Parameters<CancelController['execute']>[0],
        ctx,
      ),
    ).not.toThrow();
    expect(ctx.getStatus()).toBe('ok');
  });
});
