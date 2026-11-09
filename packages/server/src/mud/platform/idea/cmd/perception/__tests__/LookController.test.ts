/**
 * LookController tests — focus on the detail-aware rendering path
 * (the via.detailPath case). The other branches (location render,
 * direct Stuff render) are covered by the integration in
 * command-pronoun and command-empty-resolve.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LookController from '../LookController';
import { MqlApi, type MqlOneResult } from '../../../../../api/mql';
import {
  makeWorld,
  type MqlWorld,
} from '../../../../../api/__tests__/fixtures/mql-world';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,

  type ModelData,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { makeStuff, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import { PerceptionApi } from '../../../../../api/perception';
import { MessageApi } from '../../../../../api/message';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(world: MqlWorld, text: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: world.giver,
    location: world.location as never,
    commandText: text,
    executionId: 'test',
    commandId: 'test',
    verb: 'look',
    command: stubCommand('look'),
  });
}

function buildResult(world: MqlWorld, raw: string, scope: string): MqlOneResult {
  const r = MqlApi.resolveOne(raw, {
    commandGiver: world.giver,
    scope,
  });
  const bound: MqlOneResult = { stuff: r.stuff, raw };
  if (r.via) bound.via = r.via;
  return bound;
}

function makeModel(target: MqlOneResult): CommandModel {
  return { target } as ModelData as CommandModel;
}

describe('LookController — detail rendering', () => {
  let world: MqlWorld;

  beforeEach(() => {
    world = makeWorld();
  });

  it('look bookcase renders the bookcase detail (top-level)', () => {
    const target = buildResult(world, 'bookcase', 'here');
    expect(target.via?.detailPath).toEqual(['bookcase']);

    const controller = makeStuff(() => new LookController());
    controller.execute(
      makeModel(target),
      makeContext(world, 'look bookcase'),
    );
  });

  it('look bookcase:book renders the nested book detail', () => {
    // Drill via the chain: `here:bookcase:book` lands the
    // location with via=['bookcase', 'book'].
    const target = buildResult(world, 'here:bookcase:book', 'here');
    expect(target.via?.detailPath).toEqual(['bookcase', 'book']);

    const controller = makeStuff(() => new LookController());
    controller.execute(
      makeModel(target),
      makeContext(world, 'look bookcase:book'),
    );
  });

  it('look at a detail on an inventory item (host=apple, via=engraving)', () => {
    // Add a detail to the apple inline — exercises the design
    // intent that detail dispatch works regardless of where the
    // host lives.
    (world.apple as unknown as {
      setDetail: (ids: string[], desc: string) => void;
    }).setDetail(['engraving'], 'A small heart, scratched into the skin.');

    const target = buildResult(world, 'me:i:apple:engraving', 'here');
    expect(target.stuff?.stuffId).toBe(world.apple.stuffId);
    expect(target.via?.detailPath).toEqual(['engraving']);

    const controller = makeStuff(() => new LookController());
    controller.execute(
      makeModel(target),
      makeContext(world, 'look engraving'),
    );
  });

  it("falls back politely when the host isn't Detailed", () => {
    // Synthesize a malformed binding — via.detailPath set but the
    // host isn't Detailed. Shouldn't normally happen (the chain
    // produces via only when matching a real detail) but defend
    // against it anyway.
    const fakeStuff = { stuffId: 'fake' } as Stuff;
    const target: MqlOneResult = {
      stuff: fakeStuff,
      raw: 'whatever',
      via: { detailPath: ['nonexistent'] },
    };

    const controller = makeStuff(() => new LookController());
    const ctx = makeContext(world, 'look whatever');
    controller.execute(makeModel(target), ctx);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'no-detail-here',
      }),
    );
  });
});

describe('LookController — look observes once (controller-liquidity W8)', () => {
  let world: MqlWorld;

  beforeEach(() => {
    world = makeWorld();
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.meta = () => b;
      b.toSelf = () => b;
      b.toPeers = () => b;
      b.send = () => {};
      return b as never;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const run = (target: MqlOneResult, text: string): Promise<void> =>
    withRootContext(null, 'look.test', async () => {
      await makeStuff(() => new LookController()).execute(
        makeModel(target),
        makeContext(world, text),
      );
    });

  it('⭐ bare `look` makes ONE perception moment, of the place', async () => {
    const observe = vi.spyOn(PerceptionApi, 'observe');
    await run({ stuff: world.location as unknown as Stuff, raw: '' }, 'look');
    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(world.giver, world.location);
  });

  it('⭐ `look <thing>` makes ONE perception moment, of the thing', async () => {
    const observe = vi.spyOn(PerceptionApi, 'observe');
    await run({ stuff: world.apple, raw: 'apple' }, 'look apple');
    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(world.giver, world.apple);
  });

  it('a detail and the ledger observe nothing (they write nothing)', async () => {
    const observe = vi.spyOn(PerceptionApi, 'observe');
    await run(buildResult(world, 'bookcase', 'here'), 'look bookcase');
    await run({ stuff: world.apple, raw: 'apple', prep: 'in' }, 'look in apple');
    expect(observe).not.toHaveBeenCalled();
  });
});
