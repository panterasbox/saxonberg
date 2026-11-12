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
import { readFileSync } from 'fs';
import { join } from 'path';
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
      quoteLine: 'buyish "dog loaf"',
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
      suggestion: 'buyish "dog loaf"',
    });
  });
});

/**
 * ⭐ W5: the sweep, over the REAL views — the ten verbs a player types most
 * with a thing's name, and `shelf reclaim`. Each refuses a bare phrase
 * with the quoted line, and binds the quoted form.
 */
describe('W5 — the real views quote a phrase', () => {
  const CMD = join(__dirname, '..', '..', '..', '..', '..', '..', 'content', 'platform', 'content', 'platform', 'cmd');
  const real = (rel: string): CommandDefinition =>
    CommandDefinition.fromYaml(readFileSync(join(CMD, rel), 'utf8'), rel);
  const cases: Array<[string, string, string, string, string]> = [
    // view, typed, quoted line, field, bound
    ['inventory/get.yaml', 'get boning knife', 'get "boning knife"', 'targets', 'boning knife'],
    ['perception/look.yaml', 'look brass lamp', 'look "brass lamp"', 'target', 'brass lamp'],
    ['retail/buy.yaml', 'buy dog loaf', 'buy "dog loaf"', 'thing', 'dog loaf'],
    ['inventory/put.yaml', 'put egg lot in tray', 'put "egg lot" in tray', 'item', 'egg lot'],
    ['inventory/drop.yaml', 'drop drop spindle', 'drop "drop spindle"', 'targets', 'drop spindle'],
    ['boundary/open.yaml', 'open oak door', 'open "oak door"', 'target', 'oak door'],
    ['boundary/close.yaml', 'close plain cask', 'close "plain cask"', 'target', 'plain cask'],
    ['perception/read.yaml', 'read flock book', 'read "flock book"', 'target', 'flock book'],
    ['bulk/fill.yaml', 'fill tub from bath tap', 'fill tub from "bath tap"', 'source', 'bath tap'],
    ['retail/order.yaml', 'order old fashioned', 'order "old fashioned"', 'cocktail', 'old fashioned'],
    ['retail/shelf.yaml', 'shelf reclaim dog loaf', 'shelf reclaim "dog loaf"', 'thing', 'dog loaf'],
  ];
  for (const [rel, typed, line, field, bound] of cases) {
    it(`\`${typed}\` → \`${line}\``, () => {
      const def = real(rel);
      expect(assemble(typed, def)).toMatchObject({ error: 'shape', quoteLine: line });
      expect(assemble(line, def)).toMatchObject({ model: { [field]: bound } });
    });
  }

  it('⭐ a count, `all` or an ordinal rides with the name (the determiner fold)', () => {
    const get = real('inventory/get.yaml');
    expect(assemble('get 1 gin', get)).toMatchObject({ model: { targets: '1 gin' } });
    expect(assemble('get all coins', get)).toMatchObject({ model: { targets: 'all coins' } });
    expect(assemble('get 1 "mooring line"', get)).toMatchObject({ model: { targets: '1 mooring line' } });
    expect(assemble('look 2nd greywater', real('perception/look.yaml'))).toMatchObject({
      model: { target: '2nd greywater' },
    });
    expect(assemble('get 1 mooring line', get)).toMatchObject({ quoteLine: 'get 1 "mooring line"' });
  });

  it('⭐ the name is quoted, never the slot word: `paint cottage with "ochre paint"`', () => {
    expect(assemble('paint cottage with ochre paint', real('crafting/paint.yaml'))).toMatchObject({
      quoteLine: 'paint cottage with "ochre paint"',
    });
  });

  it('⭐ two names in one line are both quoted', () => {
    expect(assemble('fit the oak haft to the old pick', real('crafting/fit.yaml'))).toMatchObject({
      quoteLine: 'fit the "oak haft" to the "old pick"',
    });
  });

  it('⭐ a missing preposition that word two took says the quoted line too', () => {
    expect(assemble('put mooring line on bitts', real('inventory/put.yaml'))).toMatchObject({
      quoteLine: 'put "mooring line" on bitts',
    });
  });

  it('prose still reads whole — `say good morning`', () => {
    expect(assemble('say good morning', real('social/say.yaml'))).toMatchObject({
      model: { message: 'good morning' },
    });
  });
});

describe('CommandLineApi.word — one value as one word', () => {
  it('quotes a name with a space, leaves a word bare', () => {
    expect(CommandLineApi.word('dog loaf')).toBe('"dog loaf"');
    expect(CommandLineApi.word('loaf')).toBe('loaf');
    expect(CommandLineApi.parsePipeline(`buy ${CommandLineApi.word('dog loaf')}`).commands[0]!.rawTokens[1]).toMatchObject({
      value: 'dog loaf',
    });
  });
});
