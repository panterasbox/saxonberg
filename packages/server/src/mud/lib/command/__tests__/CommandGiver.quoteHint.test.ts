/**
 * ⭐ The quote hint (controller-liquidity D3). An object slot takes one
 * word; a name with a space in it is quoted. A line with words left over
 * is retried with each run of words joined into one quoted name, and when
 * a join fits — and no other view of the word claims the line — the player
 * is told exactly what to type.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import type { Stuff } from '../../stuff/Stuff';
import type Place from '../../stuff/Place';
import type { Affordance, CommandGiver } from '../CommandGiver';

const ctx = { commandGiver: {} as Stuff & CommandGiver, location: {} as Place };
const defOf = (yaml: string): CommandDefinition => CommandDefinition.fromYaml(yaml, '<test>');
const assemble = (text: string, def: CommandDefinition) =>
  CommandApi.assemble(CommandLineApi.parsePipeline(text).commands[0]!, def, ctx);

const BUY = `
verbs: [buyish]
controller: NoopController
description: quote-hint fixture
args:
  - { name: thing, type: object, required: true, requires: any }
  - { name: counter, type: object, required: false, requires: any, prepositions: [from], prepositionRequired: true }
`;

describe('the binder offers the quoted line', () => {
  it('⭐ `buyish dog loaf` → buyish "dog loaf"', () => {
    expect(assemble('buyish dog loaf', defOf(BUY))).toEqual({
      error: 'shape',
      summary: 'too many arguments',
      quoteHint: 'too many words — quote a name with a space in it: buyish "dog loaf"',
    });
  });

  it('keeps the rest of the line around the quoted name', () => {
    expect(assemble('buyish dog loaf from the counter', defOf(BUY))).toMatchObject({
      quoteHint: 'too many words — quote a name with a space in it: buyish "dog loaf" from the counter',
    });
  });

  it('the quoted form binds', () => {
    expect(assemble('buyish "dog loaf"', defOf(BUY))).toMatchObject({ model: { thing: 'dog loaf' } });
  });

  it('no hint when no join fits an object slot', () => {
    const def = defOf(`
verbs: [countish]
controller: C
description: d
args:
  - { name: n, type: number, required: true }
`);
    const r = assemble('countish 1 2', def);
    expect(r).toMatchObject({ error: 'shape', summary: 'too many arguments' });
    expect((r as { quoteHint?: string }).quoteHint).toBeUndefined();
  });
});

describe('the dispatcher says it when nothing claims the line', () => {
  let world: MqlWorld;
  beforeEach(() => {
    world = makeWorld();
  });
  afterEach(() => vi.restoreAllMocks());

  const run = async (views: CommandDefinition[], text: string) => {
    const giver = world.giver as unknown as Stuff & {
      getAffordances(): Affordance[];
      _executeOne(c: CommandDefinition): Promise<void>;
      _runChain(p: unknown, o: unknown): Promise<ReturnType<typeof CommandApi.createCommandContext>>;
    };
    vi.spyOn(giver, 'getAffordances').mockReturnValue(
      views.map((command) => ({ command, source: giver, bucket: 'self' }) as Affordance),
    );
    const ran: CommandDefinition[] = [];
    vi.spyOn(giver, '_executeOne').mockImplementation(async (c: CommandDefinition) => {
      ran.push(c);
    });
    const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
    const outer = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: text,
      executionId: 'test',
      commandId: 'test',
      verb: 'buyish',
      command: views[0]!,
    });
    return { ctx: await giver._runChain(parsed, outer), ran };
  };

  it('⭐ bind-failed with the quoted line', async () => {
    const view = defOf(BUY);
    await CommandApi.resolveValidators(view);
    const { ctx, ran } = await run([view], 'buyish dog loaf');
    expect(ran).toEqual([]);
    expect(ctx.getNotes()).toContainEqual({
      kind: 'command-rejected',
      reason: 'bind-failed',
      detail: 'too many words — quote a name with a space in it: buyish "dog loaf"',
    });
  });
});
