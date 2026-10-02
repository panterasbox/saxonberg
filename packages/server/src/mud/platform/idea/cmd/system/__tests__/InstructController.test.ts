/**
 * `instruct` — ⛔⛔ **a take may be kept; a SALE may never be.**
 *
 * The taps build's relief, and the one test that matters here is the
 * refusal: the verb accepts a line only when that line's own view
 * declares `standing: true`, and only the taking verbs do. ⭐ A
 * DECLARATION rather than a list in the controller, because a list is
 * the thing somebody forgets to edit — and a verb that quietly became
 * keepable would be the game earning on a player's behalf.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import InstructController from '../InstructController';
import { BehavedMixin } from '../../../../../lib/behavior/Behaved';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../../api/command';
import { StuffApi } from '../../../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
import { buildAllModalities } from '../../../../../lib/perception/modalities/__tests__/test-helpers';

class TestBody extends BehavedMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
  ),
) {
  static _mixinName = 'TestBodyInstruct';
  public received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

/** A stub view, with or without the `standing:` opt-in. */
function view(verb: string, standing: boolean): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n` +
      (standing ? 'standing: true\n' : ''),
    `<test>/${verb}.yaml`,
  );
}

let seq = 0;
function body(): TestBody {
  return makeStuffAtPath(() => {
    const b = new TestBody();
    b.setName('Alice');
    return b;
  }, `/platform/agent/Avatar/_instruct-${++seq}`);
}

function ctx(giver: TestBody, room: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: room as never,
    commandText: 'instruct',
    executionId: 'test',
    commandId: 'test',
    verb: 'instruct',
    command: view('instruct', false),
  });
}

type Model = Parameters<InstructController['execute']>[0];
function model(subcommand: string | undefined, line?: string): Model {
  return { subcommand, line } as ModelData as unknown as Model;
}
function reasons(c: CommandContext): string[] {
  return c.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

describe('instruct — only a take may be kept', () => {
  beforeEach(() => {
    buildAllModalities();
    // ⭐ The catalogue the controller resolves the line's verb against:
    // `milk` opts in, `sell` does not. That is the whole gate.
    //
    // ⚠ Mocking `definitionsForVerb` rather than `allDefinitions`,
    // because the controller asks the OWNER the question now
    // (`lint:whole-table`) — mocking the table would leave the real
    // lookup running against an empty cache.
    //
    // ⚠⚠ PLURAL, because a verb can be claimed twice and nine such
    // collisions are shipped. `shear` is the ambiguous case: two views,
    // only one keepable.
    const catalogue = new Map<string, CommandDefinition[]>([
      ['milk', [view('milk', true)]],
      ['gather', [view('gather', true)]],
      ['sell', [view('sell', false)]],
      ['consign', [view('consign', false)]],
      // A collided verb where the claims DISAGREE.
      ['shear', [view('shear', true), view('shear', false)]],
      // …and one where they agree.
      ['tap', [view('tap', true), view('tap', true)]],
    ]);
    vi.spyOn(CommandApi, 'definitionsForVerb').mockImplementation(
      (v: string) => catalogue.get(v.toLowerCase()) ?? [],
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function scene(): { me: TestBody; room: Location; c: CommandController } {
    const room = makeStuff(() => new Location());
    const me = body();
    return { me, room, c: makeStuff(() => new InstructController()) };
  }
  type CommandController = InstructController;

  it('⭐⭐ accepts a TAKE, and records the round', async () => {
    const { me, room, c } = scene();
    const context = ctx(me, room);
    await c.execute(model('keep', 'milk cow into pail'), context);
    expect(reasons(context)).toEqual([]);
    expect(me.getBehaviors().length).toBe(1);
    const spec = me.getBehaviors()[0]!;
    expect(spec.brain).toBe('/lib/behavior/keeps');
    const rounds = (spec.config as { rounds: Array<{ line: string; target: string }> })
      .rounds;
    expect(rounds).toEqual([{ line: 'milk cow into pail', target: 'cow' }]);
  });

  it('⛔⛔ REFUSES a sale — and the refusal says the RULE', async () => {
    // ⭐ The player who tried should come away understanding WHY, not
    // thinking the parser is fussy. So the prose names the distinction.
    const { me, room, c } = scene();
    const context = ctx(me, room);
    await c.execute(model('keep', 'sell the milk'), context);
    expect(reasons(context)).toContain('not-standing');
    expect(me.getBehaviors()).toEqual([]);
    const said = JSON.stringify(me.received);
    expect(said).toMatch(/taking|milking|yours to do yourself/i);
  });

  it('⛔ refuses `consign` too — nothing that spends or sells', async () => {
    const { me, room, c } = scene();
    const context = ctx(me, room);
    await c.execute(model('keep', 'consign the fleece --ask 20'), context);
    expect(reasons(context)).toContain('not-standing');
    expect(me.getBehaviors()).toEqual([]);
  });

  it('⚠ refuses a verb that does not exist at all', async () => {
    const { me, room, c } = scene();
    const context = ctx(me, room);
    await c.execute(model('keep', 'frobnicate the cow'), context);
    expect(reasons(context)).toContain('unknown-verb');
  });

  it('⚠ a keepable verb with NO TARGET is refused — the round needs one', async () => {
    // The round looks for its target in the room each beat; a line that
    // names nothing can never find anything.
    const { me, room, c } = scene();
    const context = ctx(me, room);
    await c.execute(model('keep', 'milk'), context);
    expect(reasons(context)).toContain('no-target');
    expect(me.getBehaviors()).toEqual([]);
  });

  it('⭐ the target word skips articles and prepositions', async () => {
    const { me, room, c } = scene();
    await c.execute(model('keep', 'milk the cow into my pail'), ctx(me, room));
    const spec = me.getBehaviors()[0]!;
    const rounds = (spec.config as { rounds: Array<{ target: string }> }).rounds;
    expect(rounds[0]?.target).toBe('cow');
  });

  it('two rounds coexist on ONE spec, and a duplicate is refused', async () => {
    const { me, room, c } = scene();
    await c.execute(model('keep', 'milk cow into pail'), ctx(me, room));
    await c.execute(model('keep', 'gather hen'), ctx(me, room));
    expect(me.getBehaviors().length).toBe(1);
    const rounds = (
      me.getBehaviors()[0]!.config as { rounds: unknown[] }
    ).rounds;
    expect(rounds.length).toBe(2);

    const dup = ctx(me, room);
    await c.execute(model('keep', 'milk cow into pail'), dup);
    expect(reasons(dup)).toContain('already-kept');
  });

  it('⛔⛔⛔ an AMBIGUOUS verb is REFUSED — the bound must not fail open', async () => {
    // ⭐⭐⭐ The soundness case, and the reason the lookup is plural.
    //
    // Dispatch resolves a collided verb PER-GIVER (newest-first on the
    // recency stack, shape-vs-bind at assemble) and no catalogue read
    // can reproduce that. So when two views claim one word and only one
    // opted in, picking either answer is wrong half the time — and the
    // dangerous half PERMITS keeping a line that will dispatch to the
    // view that never opted in. That is the earn/preserve bound failing
    // OPEN, which is the only safety property this feature has.
    //
    // ⚠ The first draft of this controller took the FIRST match off the
    // filename cache's insertion order, which is exactly that bug.
    const { me, room, c } = scene();
    const context = ctx(me, room);
    await c.execute(model('keep', 'shear the ewe'), context);
    expect(reasons(context)).toContain('ambiguous-verb');
    expect(me.getBehaviors()).toEqual([]);
    // ⭐ And the refusal is a real sentence: a player who hits this
    // should understand the word is overloaded, not think the verb is
    // fussy for no reason.
    expect(JSON.stringify(me.received)).toMatch(/more than one thing/i);
  });

  it('⭐ a collided verb whose claims AGREE is still keepable', async () => {
    // Failing closed on ambiguity must not mean failing closed on
    // collision: if every view claiming the word opted in, the answer is
    // true whichever one dispatch picks.
    const { me, room, c } = scene();
    const context = ctx(me, room);
    await c.execute(model('keep', 'tap the birch'), context);
    expect(reasons(context)).toEqual([]);
    expect(me.getBehaviors().length).toBe(1);
  });

  it('`instruct none` clears the lot; bare `instruct` lists them', async () => {
    const { me, room, c } = scene();
    await c.execute(model('keep', 'milk cow into pail'), ctx(me, room));

    const listed = ctx(me, room);
    await c.execute(model(undefined), listed);
    expect(reasons(listed)).toEqual([]);
    expect(JSON.stringify(me.received)).toMatch(/milk cow into pail/);

    const cleared = ctx(me, room);
    await c.execute(model('none'), cleared);
    expect(reasons(cleared)).toEqual([]);
    expect(me.getBehaviors()).toEqual([]);

    // …and clearing nothing says so rather than claiming success.
    const again = ctx(me, room);
    await c.execute(model('none'), again);
    expect(reasons(again)).toContain('nothing-kept');
  });
});
