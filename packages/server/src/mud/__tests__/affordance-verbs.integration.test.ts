/**
 * Integration test for the affordance verbs (`put`, `give`). Exercises
 * the full pipeline: table + apple + recipient set up via the same
 * mixins the seed-driven content uses, then drives the verb controllers
 * end-to-end and asserts final containment + restingOn state.
 *
 * Intentionally light on YAML / template-load wiring — that's
 * covered by `validation.test.ts` (`preloadAll` succeeds) and the
 * per-controller unit tests. This test is the "all three pieces
 * compose without ambient state interfering" gate.
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import PutController from '../platform/idea/cmd/inventory/PutController';
import GiveController from '../platform/idea/cmd/inventory/GiveController';
import { ContainerMixin } from '../lib/spatial/Container';
import { ContainableMixin } from '../lib/spatial/Containable';
import { SurfacedMixin } from '../lib/spatial/Surfaced';
import { CommandGiverMixin } from '../lib/command/CommandGiver';
import { NamedMixin } from '../lib/description/Named';
import { SensorMixin } from '../lib/message/Sensor';
import { Agent } from '../lib/stuff/Agent';
import { Idea } from '../lib/stuff/Idea';
import Location from '../lib/stuff/Location';
import { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from '../api/stuff';
import { ShadowApi } from '../api/shadow';
import { ContainmentApi } from '../api/containment';
import { CommandDefinition } from '../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../api/command';
import type { MqlOneResult } from '../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../lib/security/__tests__/test-setup';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'IntegGiver';
}

class TestSurface extends SurfacedMixin(
  ContainableMixin(NamedMixin(Idea)),
) {
  static _mixinName = 'IntegSurface';
}

class TestAgent extends SensorMixin(
  ContainerMixin(ContainableMixin(NamedMixin(Agent))),
) {
  static _mixinName = 'IntegAgent';
}

class TestItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'IntegItem';
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<integration>',
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  verb: string,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: verb,
    executionId: 'integ',
    commandId: 'integ',
    verb,
    command: stubCommand(verb),
  });
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

describe('Affordance verbs — integration', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('full cycle: get apple, put apple on table, give apple to quartermaster', async () => {
    const room = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    giver.setName('bob');
    ContainmentApi.move(giver, room);

    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, '/integ/table');
    ContainmentApi.move(table, room);

    const quartermaster = makeStuff(() => {
      const a = new TestAgent();
      a.setName('quartermaster');
      return a;
    });
    ContainmentApi.move(quartermaster, room);

    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    // Apple starts in the giver's inventory (simulating a get).
    ContainmentApi.move(apple, giver);
    expect(apple.getContainer()).toBe(giver);

    // put apple on table
    const putController = makeStuff(() => new PutController());
    await putController.execute(
      { item: one(apple, 'apple'), target: one(table, 'table', 'on') } as ModelData as never,
      makeContext(giver, room, 'put'),
    );
    expect(apple.getContainer()).toBe(room);
    expect(apple.getRestingOn()).toBe(table);

    // Pick the apple back up (simulating get apple) so we can give it.
    ContainmentApi.move(apple, giver);
    // restingOn cleared by the move (container change invariant).
    expect(apple.getRestingOn()).toBeNull();

    // give apple to quartermaster
    const giveController = makeStuff(() => new GiveController());
    await giveController.execute(
      {
        item: one(apple, 'apple'),
        recipient: one(quartermaster, 'quartermaster', 'to'),
      } as ModelData as never,
      makeContext(giver, room, 'give'),
    );
    expect(apple.getContainer()).toBe(quartermaster);
    expect(apple.getRestingOn()).toBeNull();
  });
});
