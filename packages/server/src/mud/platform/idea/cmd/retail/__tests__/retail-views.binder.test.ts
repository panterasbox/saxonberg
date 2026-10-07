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
import type Location from '../../../../../lib/stuff/Location';
import type { CommandGiver } from '../../../../../lib/command/CommandGiver';

const VIEWS = join(
  __dirname,
  '..', '..', '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'cmd', 'retail',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
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

describe('buy — a good whose name is a phrase', () => {
  it('⭐ `buy dog loaf` binds the WHOLE phrase to `thing`', () => {
    expect(bind('buy dog loaf', 'buy').thing).toBe('dog loaf');
  });

  it('⭐ `buy "dog loaf"` — the quoted form — binds the same thing', () => {
    expect(bind('buy "dog loaf"', 'buy').thing).toBe('dog loaf');
  });

  it('`buy orange seed` binds, the counter prose\'s own promise', () => {
    expect(bind('buy orange seed', 'buy').thing).toBe('orange seed');
  });

  it('`buy mana cell` binds — three words would too', () => {
    expect(bind('buy mana cell', 'buy').thing).toBe('mana cell');
    expect(bind('buy small brass lamp', 'buy').thing).toBe('small brass lamp');
  });

  it('`buy torch` — the one-word form — is unchanged', () => {
    expect(bind('buy torch', 'buy').thing).toBe('torch');
  });

  it('⭐ the greedy slice STOPS at `from`, so the counter still binds', () => {
    const m = bind('buy dog loaf from counter', 'buy');
    expect(m.thing).toBe('dog loaf');
    expect(m.counter).toBe('counter');
  });

  it('⭐ and the counter may be a PHRASE too — the help says it can', () => {
    const m = bind('buy dog loaf from the second counter', 'buy');
    expect(m.thing).toBe('dog loaf');
    expect(m.counter).toBe('the second counter');
  });

  it('⚠ `buy torch from the counter` — one article — used to be a shape error', () => {
    expect(bind('buy torch from the counter', 'buy').counter).toBe('the counter');
  });

  it('⚠ a bare good leaves `counter` to its MQL default, not to word two', () => {
    const m = bind('buy dog loaf', 'buy');
    expect(m.counter).toBe('reachable:[mixin.ConsignmentShelfMixin]');
  });

  it('`purchase` — the alias — binds identically', () => {
    expect(bind('purchase dog loaf', 'buy').thing).toBe('dog loaf');
  });
});

describe('reclaim — the same shape, the same answer', () => {
  it('`reclaim dog loaf` binds the whole phrase', () => {
    expect(bind('reclaim dog loaf', 'reclaim').thing).toBe('dog loaf');
  });

  it('the slice stops at `from`, so the shelf still binds — phrase and all', () => {
    const m = bind('reclaim lantern from the second shelf', 'reclaim');
    expect(m.thing).toBe('lantern');
    expect(m.shelf).toBe('the second shelf');
  });

  it('`reclaim dog loaf from the second shelf` binds BOTH phrases', () => {
    const m = bind('reclaim dog loaf from the second shelf', 'reclaim');
    expect(m.thing).toBe('dog loaf');
    expect(m.shelf).toBe('the second shelf');
  });

  it('a bare good leaves `shelf` to its default', () => {
    expect(bind('reclaim lantern', 'reclaim').shelf).toBe(
      'reachable:[mixin.ConsignmentShelfMixin]',
    );
  });
});
