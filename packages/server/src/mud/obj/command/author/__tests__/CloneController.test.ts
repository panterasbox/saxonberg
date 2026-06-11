/**
 * CloneController tests — pin the hydrate-first refactor's
 * destination-resolution precedence: --into, --here, hydration
 * self-placement (Layer 3), giver-fallback (Layer 4).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CloneController from '../CloneController';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { MessageApi } from '../../../../api/message';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))
) {
  static _mixinName = 'TestGiver';
}

class TestContainable extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestContainable';
}

// A Container + Containable destination (could stand in for an inventory).
class TestContainer extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestContainer';
}

// Non-Containable Stuff for the "left unplaced" path.
class TestNonContainable extends NamedMixin(Idea) {
  static _mixinName = 'TestNonContainable';
}

function stubClone(produce: () => Stuff): void {
  vi.spyOn(StuffApi, 'clone').mockImplementation(
    async () => produce() as never
  );
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>'
  );
}

function makeContext(giver: TestGiver, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'clone',
    executionId: 'test',
    commandId: 'test',
    verb: 'clone',
    command: stubCommand('clone'),
  });
}

type CloneExecModel = Parameters<CloneController['execute']>[0];

function makeModel(opts: Partial<CloneExecModel>): CloneExecModel {
  return opts as CloneExecModel;
}

function captureTells() {
  // Mock MessageApi.scene to capture text passed through.
  const calls: string[] = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(
    () =>
      ({
        topic: () => ({
          toSelf: (m: { toMarkup?: () => string }) => {
            const text =
              typeof m?.toMarkup === 'function' ? m.toMarkup() : String(m);
            calls.push(text);
            return { send: () => undefined };
          },
        }),
      }) as never
  );
  return calls;
}

describe('CloneController.execute — hydrate-first', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('reports unplaced for a non-Containable template', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const cloned = makeStuffAtPath(
      () => new TestNonContainable(),
      '/test/non-containable'
    );
    stubClone(() => cloned);

    const tells = captureTells();
    const controller = makeStuff(() => new CloneController());
    await controller.execute(
      makeModel({ template: '/test/non-containable' }),
      makeContext(giver, loc)
    );

    expect(tells.length).toBe(1);
    expect(tells[0]).toMatch(/not Containable, left unplaced/);
  });

  it('places in --into when explicit override provided', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const target = makeStuff(() => {
      const c = new TestContainer();
      c.setName('target');
      return c;
    });
    ContainmentApi.move(target, loc);

    const child = makeStuffAtPath(
      () => {
        const t = new TestContainable();
        t.setName('child');
        return t;
      },
      '/test/child'
    );
    stubClone(() => child);

    const tells = captureTells();
    const into: MqlOneResult = { stuff: target as never, raw: 'target' };
    const controller = makeStuff(() => new CloneController());
    await controller.execute(
      makeModel({ template: '/test/child', into }),
      makeContext(giver, loc)
    );

    expect(child.getContainer()).toBe(target);
    expect(tells.length).toBe(1);
    expect(tells[0]).toMatch(/into/);
  });

  it('places in --here environment', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const child = makeStuffAtPath(
      () => {
        const t = new TestContainable();
        t.setName('thing');
        return t;
      },
      '/test/thing'
    );
    stubClone(() => child);

    captureTells();
    const controller = makeStuff(() => new CloneController());
    await controller.execute(
      makeModel({ template: '/test/thing', here: true }),
      makeContext(giver, loc)
    );

    expect(child.getContainer()).toBe(loc);
  });

  it('accepts hydration self-placement when no override given', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    // The "self-placed" container the template would have moved to.
    const target = makeStuff(() => {
      const c = new TestContainer();
      c.setName('treasury');
      return c;
    });
    ContainmentApi.move(target, loc);

    const child = makeStuffAtPath(
      () => {
        const t = new TestContainable();
        t.setName('artifact');
        return t;
      },
      '/test/artifact'
    );
    // Simulate hydration's applyContainer placing the child in target
    // BEFORE the controller gets it back from clone.
    stubClone(() => {
      ContainmentApi.move(child, target);
      return child;
    });

    const tells = captureTells();
    const controller = makeStuff(() => new CloneController());
    await controller.execute(
      makeModel({ template: '/test/artifact' }),
      makeContext(giver, loc)
    );

    // Layer 3: hydration placed it; no additional move.
    expect(child.getContainer()).toBe(target);
    expect(tells.length).toBe(1);
    expect(tells[0]).toMatch(/placed by template into/);
  });

  it('falls back to giver inventory when no override AND no self-placement', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const child = makeStuffAtPath(
      () => {
        const t = new TestContainable();
        t.setName('trinket');
        return t;
      },
      '/test/trinket'
    );
    stubClone(() => child);

    captureTells();
    const controller = makeStuff(() => new CloneController());
    await controller.execute(
      makeModel({ template: '/test/trinket' }),
      makeContext(giver, loc)
    );

    expect(child.getContainer()).toBe(giver);
  });

  it('Layer 1 (--into) overrides hydration self-placement and notes the override', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const declared = makeStuff(() => {
      const c = new TestContainer();
      c.setName('declared');
      return c;
    });
    ContainmentApi.move(declared, loc);

    const override = makeStuff(() => {
      const c = new TestContainer();
      c.setName('override');
      return c;
    });
    ContainmentApi.move(override, loc);

    const child = makeStuffAtPath(
      () => {
        const t = new TestContainable();
        t.setName('sword');
        return t;
      },
      '/test/sword'
    );
    stubClone(() => {
      ContainmentApi.move(child, declared);
      return child;
    });

    const tells = captureTells();
    const into: MqlOneResult = { stuff: override as never, raw: 'override' };
    const controller = makeStuff(() => new CloneController());
    await controller.execute(
      makeModel({ template: '/test/sword', into }),
      makeContext(giver, loc)
    );

    expect(child.getContainer()).toBe(override);
    expect(tells.length).toBe(1);
    expect(tells[0]).toMatch(/overrode template's container/);
  });
});
