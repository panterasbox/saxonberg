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
import type { AbortReason } from '@saxonberg/types';
import CancelController from '../CancelController';
import type {
  Engaged,
  EngagementSlot,
} from '../../../../lib/activity/Engaged';
import { EngagedMixin } from '../../../../lib/activity/Engaged';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { SchedulerApi } from '../../../../api/scheduler';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

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

/**
 * Class-shaped fixture activity — registry-routed lifecycle dispatch
 * needs the class on `#activityRegistry`. The CancelController test
 * only cares about cancellation reaching the engagement, so the
 * lifecycle bodies are no-ops.
 */
class TestEngagement {
  engagementId = '';
  readonly type: string;
  readonly actor: Stuff & Engaged;
  readonly startedAt: number = Date.now();
  readonly slots: ReadonlySet<EngagementSlot>;
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable = true;
  readonly duration = 5000;
  readonly replaceableBy: readonly string[] = [];

  constructor(actor: TestActor, type: string) {
    this.type = type;
    this.actor = actor as unknown as Stuff & Engaged;
    this.slots = new Set([type === 'reading' ? 'attention' : 'body']);
  }
  onStart(): void {}
  onComplete(): void {}
  onAbort(): void {}
}

function makeEngagement(actor: TestActor, type: string): TestEngagement {
  SchedulerApi.registerActivity(type, TestEngagement as never);
  return new TestEngagement(actor, type);
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
    SchedulerApi.start(a as never);
    SchedulerApi.start(b as never);
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
    SchedulerApi.start(a as never);
    SchedulerApi.start(b as never);

    const controller = makeStuff(() => new CancelController());
    const ctx = makeContext(actor, loc);
    await controller.execute(
      makeModel('walking') as Parameters<CancelController['execute']>[0],
      ctx,
    );

    expect(SchedulerApi.getEngagementBySlot(actor, 'body')).toBeUndefined();
    expect(SchedulerApi.getEngagementBySlot(actor, 'attention')).toBe(
      b as never,
    );
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
