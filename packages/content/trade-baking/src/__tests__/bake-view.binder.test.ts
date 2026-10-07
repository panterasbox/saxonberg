/**
 * ⭐⭐ `bake` binds the forms its own help text promises — against the
 * real YAML, through the real binder.
 *
 * Two of them did not. The view's help has said *"where there is more
 * than one fire in reach, say which: `bake at the brick oven`"* since
 * the oven arg shipped, and the arg's own comment calls making a second
 * oven ADDRESSABLE the whole point of declaring it. Neither worked: a
 * non-greedy positional takes exactly ONE token, so `the` and `brick`
 * and `oven` were three positionals with two slots, and the answer was
 * *"that doesn't match any known command shape"* — the parser saying it
 * ran out of room, which reads nothing like a sentence about ovens.
 *
 * ⚠ A help text that promises a form the binder refuses is the same
 * defect class as a verb nothing confers: it fails closed, it fails
 * silent, and the only person who finds out is a player who believed the
 * documentation. Both arms are greedy now and both forms bind.
 *
 * ⚠⚠ `required: false` on `loaf` is load-bearing and explicit:
 * `CommandDefinition.ts:703-723` makes `greedy` default an arg to
 * REQUIRED, so dropping it would make the dough mandatory and break
 * bare `bake` in every one-oven bakehouse.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { CommandLineApi } from '@saxonberg/server/mud/api/command-line';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Location from '@saxonberg/server/mud/lib/stuff/Location';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEW = join(
  HERE, '..', '..', 'content', 'trade', 'baking', 'cmd', 'baking', 'bake.yaml',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

const def = (): CommandDefinition =>
  CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), 'bake.yaml');

function bind(text: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, def(), ctx);
  if (!('model' in r)) {
    throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  }
  return r.model as Record<string, unknown>;
}

const OVEN_DEFAULT = 'reachable:[mixin.BurnerMixin]';

describe('bake — the forms the help text promises', () => {
  it('bare `bake` leaves the dough unbound and the oven to its default', () => {
    const m = bind('bake');
    expect(m.loaf).toBeUndefined();
    expect(m.oven).toBe(OVEN_DEFAULT);
  });

  it('⭐ `bake lean loaf` binds the two-word name whole', () => {
    expect(bind('bake lean loaf').loaf).toBe('lean loaf');
  });

  it('⭐ `bake "rye sponge"` — the quoted form — binds unquoted', () => {
    expect(bind('bake "rye sponge"').loaf).toBe('rye sponge');
  });

  it('⭐ `bake at the brick oven` — the help\'s own example — binds', () => {
    const m = bind('bake at the brick oven');
    expect(m.loaf).toBeUndefined();
    expect(m.oven).toBe('the brick oven');
  });

  it('⭐ a dough AND an oven, both phrases, in one sentence', () => {
    const m = bind('bake rye sponge at the brick oven');
    expect(m.loaf).toBe('rye sponge');
    expect(m.oven).toBe('the brick oven');
  });

  it('`bake flatbread` — the one-word form — is unchanged', () => {
    expect(bind('bake flatbread').loaf).toBe('flatbread');
  });
});
