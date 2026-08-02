/**
 * DropController tests — bareword and quantity-bearing paths.
 *
 * The quantity-bearing path defers to `GlobbableApi.applyQuantity`,
 * which calls `GlobbableApi.split` → `StuffApi.clone(...)` for
 * partial-stack splits. Tests stub `StuffApi.clone` so the
 * Persistence-layer domain collection doesn't need to be set up.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DropController from '../DropController';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { GlobbableMixin } from '../../../../lib/stuff/Globbable';
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
import type { MqlManyResult, MqlQuantity } from '../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../../../lib/mixin';

// Compose a giver that's both CommandGiver and Container — drop's
// inventory check needs it.
class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))
) {
  static _mixinName = 'TestGiver';
}

class Coin extends GlobbableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'Coin';
  static fieldMeta: FieldMeta = {
    quantity: { persistent: true },
    name: { persistent: true },
    denomination: { persistent: true, globIdentity: true },
  };
  public denomination: 'gold' | 'silver' | 'copper' = 'copper';
}

class Sword extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'Sword';
}

const COIN_PATH = '/obj/item/Coin';

function stubCoinClone() {
  return vi
    .spyOn(StuffApi, 'clone')
    .mockImplementation(async (path: string) => {
      const c = makeStuffAtPath(() => {
        const coin = new Coin();
        coin.setName('coin');
        return coin;
      }, path);
      return c as unknown as Stuff;
    }) as ReturnType<typeof vi.spyOn>;
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
    commandText: 'drop',
    executionId: 'test',
    commandId: 'test',
    verb: 'drop',
    command: stubCommand('drop'),
  });
}

type DropExecModel = Parameters<DropController['execute']>[0];

function makeModel(targets: MqlManyResult): DropExecModel {
  return { targets } as ModelData as unknown as DropExecModel;
}

function makeResult(
  stuff: Stuff[],
  raw: string,
  quantity?: MqlQuantity
): MqlManyResult {
  const out: MqlManyResult = { stuff, raw };
  if (quantity) out.quantity = quantity;
  return out;
}

describe('DropController — bareword path (no quantity)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('drops a single item from inventory to the location', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const sword = makeStuff(() => {
      const s = new Sword();
      s.setName('sword');
      return s;
    });
    ContainmentApi.move(sword, giver);

    const controller = makeStuff(() => new DropController());
    await controller.execute(
      makeModel(makeResult([sword], 'sword')),
      makeContext(giver, loc)
    );
    expect(sword.getContainer()).toBe(loc);
  });

  it('reports failure when nothing matches the raw query', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const controller = makeStuff(() => new DropController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(makeResult([], 'turnips')),
      ctx,
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'empty-result',
        field: 'targets',
        query: 'turnips',
      }),
    );
  });
});

describe('DropController — quantity-bearing path', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drops 5 of a 30-coin stack (lenient count)', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const stack = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    stack.setQuantity(30);
    ContainmentApi.move(stack, giver);

    const controller = makeStuff(() => new DropController());
    await controller.execute(
      makeModel(
        makeResult([stack], 'coins', {
          value: { kind: 'count', n: 5 },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );
    expect(stack.getQuantity()).toBe(25);
  });

  it('clamps when the lenient count exceeds available units (partial)', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const stack = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    stack.setQuantity(10);
    ContainmentApi.move(stack, giver);

    const controller = makeStuff(() => new DropController());
    await controller.execute(
      makeModel(
        makeResult([stack], 'coins', {
          value: { kind: 'count', n: 99 },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );
  });

  it('rejects strictly when the count exceeds supply', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const stack = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    stack.setQuantity(10);
    ContainmentApi.move(stack, giver);

    const controller = makeStuff(() => new DropController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(
        makeResult([stack], 'coins', {
          value: { kind: 'count', n: 99 },
          mode: 'strict',
        })
      ),
      ctx,
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'quantity-clamped-rejected',
        field: 'targets',
        available: 10,
      }),
    );
    // Strict rejects without acting — the stack stays intact.
    expect(stack.getQuantity()).toBe(10);
    expect(stack.getContainer()).toBe(giver);
  });

  it('drops everything with all-kind', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const stack = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    stack.setQuantity(10);
    ContainmentApi.move(stack, giver);

    const controller = makeStuff(() => new DropController());
    await controller.execute(
      makeModel(
        makeResult([stack], 'coins', {
          value: { kind: 'all' },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );
    expect(stack.getContainer()).toBe(loc);
    expect(stack.getQuantity()).toBe(10);
  });

  it('reports empty-result when no candidates are in inventory', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const controller = makeStuff(() => new DropController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(
        makeResult([], 'turnips', {
          value: { kind: 'count', n: 2 },
          mode: 'lenient',
        })
      ),
      ctx,
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'empty-result',
        field: 'targets',
        query: 'turnips',
      }),
    );
  });

  it('distributes a multi-match count across two stacks (apples + oranges shape)', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const gold = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      c.denomination = 'gold';
      return c;
    }, COIN_PATH);
    gold.setQuantity(2);
    const silver = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      c.denomination = 'silver';
      return c;
    }, COIN_PATH);
    silver.setQuantity(2);
    ContainmentApi.move(gold, giver);
    ContainmentApi.move(silver, giver);

    const controller = makeStuff(() => new DropController());
    await controller.execute(
      makeModel(
        makeResult([gold, silver], 'coins', {
          value: { kind: 'count', n: 3 },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );
    // Two operands: the 2-stack of gold (full), and a 1-split from silver.
    expect(gold.getContainer()).toBe(loc);
    expect(silver.getQuantity()).toBe(1); // 2 - 1 split-off
  });
});
