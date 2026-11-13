/**
 * ⭐⭐⭐ `buy dog loaf` — **the form a person actually types**, bound
 * against the real YAML.
 *
 * Thirty-four of the ninety-three stock goods carry an authored
 * multi-word keyword, and for most of them it is the only name they
 * answer to (`dog-loaf.yaml:11` is `[loaf, "dog loaf", "dog bread",
 * "horse bread", dogbread]`; the general store's counter prose promises
 * *"the packet still answers to `orange seed`"*). `Stock.resolveBuy` →
 * `Perceptible.hasKeyword` is an exact `includes`, so the phrase IS the
 * purchase name.
 *
 * And the binder was cutting it in half. A non-greedy positional takes
 * exactly ONE token, and it consumes that token **before `default:` is
 * considered** — so `buy dog loaf` bound `thing = "dog"`, handed `loaf`
 * to the optional `counter` slot, and threw that slot's MQL default away
 * on the way. The player was then refused in the name of a counter they
 * had never mentioned, which is the one shape
 * `docs/requirements/…-requirements.md` AC 6 forbids.
 *
 * ⚠⚠ **A controller test cannot see any of this.** It is handed a
 * pre-built model, so it passes over a verb whose grammar is broken and
 * over a verb that does not exist at all. The binder is upstream of
 * every controller test in the suite, which is why these assertions are
 * here and not in `BuyController.test.ts`
 * (`docs/subsystems/command-routing.md:1408-1413`).
 *
 * ⭐ And the quoted form had NEVER been tested through `assemble` —
 * `command-parsing.md:84-96` documents `"…"` as one token and the only
 * coverage was a lex/format round-trip. The user's standing note is that
 * quoting exists and gets forgotten; this is where it stops being a
 * belief.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CommandApi } from '../../../../../api/command';
import { CommandLineApi } from '../../../../../api/command-line';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type Place from '../../../../../lib/stuff/Place';
import type { CommandGiver } from '../../../../../lib/command/CommandGiver';

const VIEWS = join(
  __dirname,
  '..', '..', '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'cmd', 'retail',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Place,
};

function view(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    readFileSync(join(VIEWS, `${verb}.yaml`), 'utf8'),
    `${verb}.yaml`,
  );
}

function bind(text: string, verb: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, view(verb), ctx);
  if (!('model' in r)) {
    throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  }
  return r.model as Record<string, unknown>;
}

function refuse(text: string, verb: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, view(verb), ctx);
  if ('model' in r) throw new Error(`"${text}" bound: ${JSON.stringify(r.model)}`);
  return r as unknown as Record<string, unknown>;
}

/**
 * ⭐⭐ controller-liquidity D3/W5: a good's name is a PHRASE, and a phrase
 * is QUOTED. The slot binds one word; `buy dog loaf` is refused with the
 * quoted line (`buy "dog loaf"`) for the player to tap — never cut in half
 * and handed to the counter slot, which binds only behind `from`.
 */
describe('buy — a good whose name is a phrase is quoted', () => {
  it('⭐ `buy "dog loaf"` binds the whole phrase to `thing`', () => {
    expect(bind('buy "dog loaf"', 'buy').thing).toBe('dog loaf');
  });

  it('⭐ `buy dog loaf` is refused, and the refusal carries the quoted line', () => {
    const r = refuse('buy dog loaf', 'buy');
    expect(r.quoteLine).toBe('buy "dog loaf"');
    expect(r.quoteHint).toMatch(/quote a name with a space in it/);
  });

  it('three words quote the same way', () => {
    expect(bind('buy "small brass lamp"', 'buy').thing).toBe('small brass lamp');
    expect(refuse('buy small brass lamp', 'buy').quoteLine).toBe('buy "small brass lamp"');
  });

  it('`buy torch` — the one-word form — is unchanged', () => {
    expect(bind('buy torch', 'buy').thing).toBe('torch');
  });

  it('a leading article folds away — `buy the loaf`', () => {
    expect(bind('buy the loaf', 'buy').thing).toBe('loaf');
  });

  it('⭐ the counter binds behind `from`, phrase and ordinal and all', () => {
    const m = bind('buy "dog loaf" from counter', 'buy');
    expect(m.thing).toBe('dog loaf');
    expect(m.counter).toBe('counter');
    expect(bind('buy torch from the second counter', 'buy').counter).toBe('second counter');
    expect(bind('buy torch from the counter', 'buy').counter).toBe('counter');
  });

  it('⚠ a bare good leaves `counter` to its MQL default, never to word two', () => {
    expect(bind('buy loaf', 'buy').counter).toBe('reachable:[mixin.ForSaleMixin]');
    expect(refuse('buy dog loaf', 'buy').quoteLine).toBe('buy "dog loaf"');
  });
});

describe('shelf reclaim — the same shape, the same answer', () => {
  it('`shelf reclaim "dog loaf"` binds the whole phrase; bare is refused with the hint', () => {
    expect(bind('shelf reclaim "dog loaf"', 'shelf').thing).toBe('dog loaf');
    expect(refuse('shelf reclaim dog loaf', 'shelf').quoteLine).toBe('shelf reclaim "dog loaf"');
  });

  it('the shelf binds behind `from`', () => {
    const m = bind('shelf reclaim "dog loaf" from the second shelf', 'shelf');
    expect(m.thing).toBe('dog loaf');
    expect(m.shelf).toBe('second shelf');
  });

  it('a bare good leaves `shelf` to its default', () => {
    expect(bind('shelf reclaim lantern', 'shelf').shelf).toBe(
      'reachable:[mixin.ConsignmentShelfMixin]',
    );
  });
});

/**
 * ⭐ The institution nouns (controllers-are-io W7, D9): a transaction with
 * a book is a subcommand of the book's noun, and each subcommand binds its
 * own book — nothing inherits.
 */
describe('the book is the operand — shelf / rack / house / job', () => {
  function viewAt(dir: string, verb: string): CommandDefinition {
    return CommandDefinition.fromYaml(
      readFileSync(join(VIEWS, '..', dir, `${verb}.yaml`), 'utf8'),
      `${verb}.yaml`,
    );
  }
  function bindAt(text: string, dir: string, verb: string): Record<string, unknown> {
    const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
    const r = CommandApi.assemble(parsed, viewAt(dir, verb), ctx);
    if (!('model' in r)) throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
    return r.model as Record<string, unknown>;
  }

  it('`shelf consign lantern --ask 12` binds the good, the ask and the shelf in reach', () => {
    const m = bind('shelf consign lantern --ask 12', 'shelf');
    expect(m.subcommand).toBe('consign');
    expect(m.ask).toBe('12');
    expect(m.shelf).toBe('reachable:[mixin.ConsignmentShelfMixin]');
  });

  it('⚠ `rack reclaim knife` binds a RACK — the flat reclaim bound only a shelf', () => {
    const m = bind('rack reclaim knife', 'rack');
    expect(m.thing).toBe('knife');
    expect(m.rack).toBe('reachable:[mixin.HeldGoodsMixin] - reachable:[mixin.ConsignmentShelfMixin]');
    expect(view('rack').controllerForSubcommand('reclaim')).toBe(
      '/platform/idea/cmd/retail/RackReclaimController',
    );
  });

  it('`house appoint alice to keeper at /x` binds through the house', () => {
    const m = bindAt('house appoint alice to keeper at /x', 'banking', 'house');
    expect(m.subcommand).toBe('appoint');
    expect(m.position).toBe('keeper');
    expect(m.organization).toBe('/x');
  });

  it('`job claim 3fa on the depot board` binds the id and the named board; bare `job` takes the board in reach', () => {
    const m = bindAt('job claim 3fa on the "depot board"', 'work', 'job');
    expect(m.id).toBe('3fa');
    expect(m.board).toBe('depot board');
    expect(bindAt('job', 'work', 'job').board).toBe('reachable:[class.JobBoard]');
  });

  it('each noun carries its transactions as subcommands, each with its own controller', () => {
    const cases: Array<[CommandDefinition, string[]]> = [
      [viewAt('banking', 'house'), ['appoint', 'dismiss', 'draw']],
      [viewAt('work', 'job'), ['post', 'claim', 'complete', 'abandon', 'fulfill', 'apply', 'quit']],
      [view('shelf'), ['consign', 'reclaim']],
      [view('rack'), ['check', 'reclaim']],
    ];
    for (const [def, subs] of cases) {
      expect(def.getSubcommandNames()).toEqual(expect.arrayContaining(subs));
      for (const sub of subs) expect(def.controllerForSubcommand(sub)).toMatch(/^\/platform\/idea\/cmd\//);
    }
  });
});
