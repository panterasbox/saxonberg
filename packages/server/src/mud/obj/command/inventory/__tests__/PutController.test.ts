/**
 * PutController tests — preposition-aware dispatch into Container vs
 * Surfaced targets.
 *
 * Mirrors DropController's setup shape (TestGiver, Location, makeStuff
 * fixtures). The tests exercise the four core branches:
 *   - `put X in Y` where Y is a Container → move()
 *   - `put X on Y` where Y is a Surfaced → placeOn()
 *   - mismatched preposition → controller-rejected (wrong-preposition)
 *   - ambiguous (no preposition + target composes both) → reject
 *   - canRest() veto → controller-rejected (cannot-rest)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import PutController from '../PutController';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { SurfacedMixin } from '../../../../lib/spatial/Surfaced';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiver';
}

class TestSurface extends SurfacedMixin(
  ContainableMixin(NamedMixin(Idea)),
) {
  static _mixinName = 'TestSurface';
}

class TestChest extends ContainerMixin(
  ContainableMixin(NamedMixin(Idea)),
) {
  static _mixinName = 'TestChest';
}

class TestDeskWithDrawer extends SurfacedMixin(
  ContainerMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'TestDeskWithDrawer';
}

class TestItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestItem';
}

class RejectingSurface extends SurfacedMixin(
  ContainableMixin(NamedMixin(Idea)),
) {
  static _mixinName = 'RejectingSurface';
  canRest(): boolean {
    return false;
  }
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: TestGiver, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'put',
    executionId: 'test',
    commandId: 'test',
    verb: 'put',
    command: stubCommand('put'),
  });
}

type PutExecModel = Parameters<PutController['execute']>[0];

function makeModel(item: MqlOneResult, target: MqlOneResult): PutExecModel {
  return { item, target } as ModelData as unknown as PutExecModel;
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

let pathCounter = 0;
function freshPath(prefix: string): string {
  pathCounter += 1;
  return `${prefix}-${pathCounter}`;
}

describe('PutController — in/on dispatch', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('put X in Y (Container) moves item into the container', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(chest, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(chest, 'chest', 'in')),
      makeContext(giver, loc),
    );

    expect(item.getContainer()).toBe(chest);
    expect(item.getRestingOn()).toBeNull();
  });

  it('put X on Y (Surfaced) sets restingOn and moves into surface\'s env', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-table'));
    ContainmentApi.move(table, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(table, 'table', 'on')),
      makeContext(giver, loc),
    );

    expect(item.getContainer()).toBe(loc);
    expect(item.getRestingOn()).toBe(table);
  });

  it('put X on (Container, not Surfaced) → wrong-preposition rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(chest, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(chest, 'chest', 'on')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'wrong-preposition',
      ),
    ).toBe(true);
  });

  it('put X in (Surfaced, not Container) → wrong-preposition rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-wrong-prep-table'));
    ContainmentApi.move(table, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(table, 'table', 'in')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'wrong-preposition',
      ),
    ).toBe(true);
  });

  it('put X Y with no preposition + Container target → infers "in"', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(chest, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(chest, 'chest')),
      makeContext(giver, loc),
    );

    expect(item.getContainer()).toBe(chest);
  });

  it('put X Y with no preposition + Surfaced target → infers "on"', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-infer-on-table'));
    ContainmentApi.move(table, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(table, 'table')),
      makeContext(giver, loc),
    );

    expect(item.getRestingOn()).toBe(table);
  });

  it('put X Y with no preposition + target composes both → ambiguous rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const desk = makeStuffAtPath(() => {
      const d = new TestDeskWithDrawer();
      d.setName('desk');
      return d;
    }, freshPath('/test/put-desk-with-drawer'));
    ContainmentApi.move(desk, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(desk, 'desk')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'preposition-ambiguous',
      ),
    ).toBe(true);
  });

  it('put X on Y where canRest() rejects → cannot-rest rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const slick = makeStuffAtPath(() => {
      const s = new RejectingSurface();
      s.setName('slick');
      return s;
    }, freshPath('/test/put-slick'));
    ContainmentApi.move(slick, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(slick, 'slick', 'on')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'cannot-rest',
      ),
    ).toBe(true);
  });

  it('moving an apple from one table to another in the same room: container unchanged, restingOn updates', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    const tableA = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('tableA');
      return s;
    }, freshPath('/test/put-tableA'));
    const tableB = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('tableB');
      return s;
    }, freshPath('/test/put-tableB'));
    ContainmentApi.move(tableA, loc);
    ContainmentApi.move(tableB, loc);
    ContainmentApi.placeOn(apple, tableA);
    expect(apple.getContainer()).toBe(loc);
    expect(apple.getRestingOn()).toBe(tableA);

    // Apple has to be in inventory for put to fire — but the test
    // bypasses that validator since we go straight to execute(). For
    // realism, just drive placeOn via the controller's "on" path.
    ContainmentApi.move(apple, giver);
    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(tableB, 'tableB', 'on')),
      makeContext(giver, loc),
    );
    expect(apple.getContainer()).toBe(loc);
    expect(apple.getRestingOn()).toBe(tableB);
  });

  it('moving an apple from a table to a chest: container changes, restingOn clears', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-table-to-chest'));
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(table, loc);
    ContainmentApi.move(chest, loc);
    ContainmentApi.placeOn(apple, table);
    expect(apple.getRestingOn()).toBe(table);
    // Move apple to giver's inventory so the controller path can run.
    ContainmentApi.move(apple, giver);
    expect(apple.getRestingOn()).toBeNull();
    // Now put it in the chest.
    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(chest, 'chest', 'in')),
      makeContext(giver, loc),
    );
    expect(apple.getContainer()).toBe(chest);
    expect(apple.getRestingOn()).toBeNull();
  });
});
