/**
 * GetController tests — mirror of DropController coverage focused on
 * the environment-to-inventory direction. The two controllers share
 * the same `GlobbableApi.applyQuantity` workhorse, so this suite
 * checks the source/destination flip plus a few unique-to-get cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GetController } from '../GetController';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../lib/description/Named';
import { SensorMixin } from '../../../lib/message/Sensor';
import { GlobbableMixin } from '../../../lib/stuff/Globbable';
import { Idea } from '../../../lib/stuff/Idea';
import { Location } from '../../../lib/stuff/Location';
import { Stuff } from '../../../lib/stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import type {
  CommandContext,
  ModelData,
} from '../../../api/command';
import type { MqlManyResult, MqlQuantity } from '../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))
) {
  static _mixinName = 'TestGiver';
}

class Coin extends GlobbableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'Coin';
  static persistentFields = ['quantity', 'name', 'denomination'];
  static globIdentityFields = ['denomination'];
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
  return {
    commandGiver: giver as never,
    location: location as never,
    commandText: 'get',
    executionId: 'test',
    commandId: 'test',
    verb: 'get',
    command: stubCommand('get'),
  };
}

type GetExecModel = Parameters<GetController['execute']>[0];

function makeModel(targets: MqlManyResult): GetExecModel {
  return { targets } as ModelData as unknown as GetExecModel;
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

describe('GetController — bareword path (no quantity)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('moves a single item from the location into inventory', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const sword = makeStuff(() => {
      const s = new Sword();
      s.setName('sword');
      return s;
    });
    ContainmentApi.move(sword, loc);

    const controller = makeStuff(() => new GetController());
    const result = await controller.execute(
      makeModel(makeResult([sword], 'sword')),
      makeContext(giver, loc)
    );
    expect(result.success).toBe(true);
    expect(sword.getContainer()).toBe(giver);
  });

  it('reports failure when nothing matches the raw query', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const controller = makeStuff(() => new GetController());
    const result = await controller.execute(
      makeModel(makeResult([], 'turnips')),
      makeContext(giver, loc)
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/don't see any 'turnips'/);
  });
});

describe('GetController — quantity-bearing path', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks up 5 of a 30-coin pile (lenient count)', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const pile = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    pile.setQuantity(30);
    ContainmentApi.move(pile, loc);

    const controller = makeStuff(() => new GetController());
    const result = await controller.execute(
      makeModel(
        makeResult([pile], 'coins', {
          value: { kind: 'count', n: 5 },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );

    expect(result.success).toBe(true);
    // 5 ended up in inventory; remaining 25 are still on the floor.
    expect(pile.getQuantity()).toBe(25);
  });

  it('clamps a lenient overflow', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const pile = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    pile.setQuantity(10);
    ContainmentApi.move(pile, loc);

    const controller = makeStuff(() => new GetController());
    const result = await controller.execute(
      makeModel(
        makeResult([pile], 'coins', {
          value: { kind: 'count', n: 99 },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );
    expect(result.success).toBe(true);
    expect(result.summary).toMatch(/only 10 available/);
    expect(pile.getContainer()).toBe(giver);
  });

  it('rejects strict overcount', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const pile = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    pile.setQuantity(10);
    ContainmentApi.move(pile, loc);

    const controller = makeStuff(() => new GetController());
    const result = await controller.execute(
      makeModel(
        makeResult([pile], 'coins', {
          value: { kind: 'count', n: 99 },
          mode: 'strict',
        })
      ),
      makeContext(giver, loc)
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/only 10 of those here/);
    expect(pile.getQuantity()).toBe(10);
    expect(pile.getContainer()).toBe(loc);
  });

  it('reports empty-result when no candidates are in the room', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);

    const controller = makeStuff(() => new GetController());
    const result = await controller.execute(
      makeModel(
        makeResult([], 'turnips', {
          value: { kind: 'count', n: 2 },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/don't see any 'turnips'/);
  });

  it('all-kind picks up everything available', async () => {
    stubCoinClone();
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const pile = makeStuffAtPath(() => {
      const c = new Coin();
      c.setName('coin');
      return c;
    }, COIN_PATH);
    pile.setQuantity(7);
    ContainmentApi.move(pile, loc);

    const controller = makeStuff(() => new GetController());
    const result = await controller.execute(
      makeModel(
        makeResult([pile], 'coins', {
          value: { kind: 'all' },
          mode: 'lenient',
        })
      ),
      makeContext(giver, loc)
    );
    expect(result.success).toBe(true);
    expect(pile.getContainer()).toBe(giver);
    expect(pile.getQuantity()).toBe(7);
  });
});
