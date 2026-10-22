/**
 * ⭐ Two views of one verb coexist BY TARGET (potash drive 20): holding a
 * tallow crock — a build vessel — put the shaker's `pour` first, and
 * `pour crock into kettle` died on "isn't a vessel you can work in" while
 * the bulk `pour` never ran. A view that refuses an ARGUMENT as the wrong
 * kind hands the line to the next view; the first refusal stands when no
 * view claims it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { ContainableMixin } from '../../spatial/Containable';
import { DetailedMixin } from '../../description/Detailed';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import { VisibleMixin } from '../../description/Visible';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import { makeStuff } from '../../security/__tests__/test-setup';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance } from '../CommandGiver';

/** A kettle: no `SealableMixin`, so the narrow view refuses it. */
class TestKettle extends ContainableMixin(
  DetailedMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {}

const view = async (requires: string): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(
    `
verbs: [pourish]
controller: NoopController
description: chain fixture
args:
  - name: target
    type: object
    scope: [reachable]
    requires: ${requires}
`,
    '<test>',
  );
  await CommandApi.resolveValidators(def);
  return def;
};

describe('two views of one verb', () => {
  let world: MqlWorld;
  let ran: CommandDefinition[];

  const run = async (views: CommandDefinition[]): Promise<ReturnType<typeof CommandApi.createCommandContext>> => {
    const giver = world.giver as unknown as Stuff & {
      getAffordances(): Affordance[];
      _executeOne(c: CommandDefinition): Promise<void>;
      _runChain(p: unknown, o: unknown): Promise<ReturnType<typeof CommandApi.createCommandContext>>;
    };
    vi.spyOn(giver, 'getAffordances').mockReturnValue(
      views.map((command) => ({ command, source: giver, bucket: 'self' }) as Affordance),
    );
    vi.spyOn(giver, '_executeOne').mockImplementation(async (c: CommandDefinition) => {
      ran.push(c);
    });
    const parsed = CommandLineApi.parsePipeline('pourish kettle').commands[0]!;
    const outer = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: 'pourish kettle',
      executionId: 'test',
      commandId: 'test',
      verb: 'pourish',
      command: views[0]!,
    });
    return giver._runChain(parsed, outer);
  };

  beforeEach(() => {
    ran = [];
    world = makeWorld();
    const kettle = makeStuff(() => new TestKettle()) as unknown as Stuff & {
      setName(n: string): void;
      addKeyword(k: string): void;
    };
    kettle.setName('kettle');
    kettle.addKeyword('kettle');
    ContainmentApi.move(kettle as never, world.location as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('⭐ a view that refuses the ARGUMENT hands the line to the next', async () => {
    const shaker = await view('SealableMixin');
    const bulk = await view('any');
    await run([shaker, bulk]);
    expect(ran).toEqual([bulk]);
  });

  it('the FIRST refusal stands when no view takes the line', async () => {
    const a = await view('SealableMixin');
    const b = await view('SealableMixin');
    const ctx = await run([a, b]);
    expect(ran).toEqual([]);
    expect(ctx.command).toBe(a);
    expect(ctx.getNotes().some((n) => n.kind === 'validator-failed')).toBe(true);
  });
});
