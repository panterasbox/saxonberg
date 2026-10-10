/**
 * ⭐⭐⭐ `mill` is the rung-4 case — **the one verb in the trade where
 * quoting is the answer**, and this is where that stops being a claim.
 *
 * The phrase ladder (`docs/subsystems/command-spec.md § The phrase
 * ladder`) has four rungs, and `mill` cannot take the one the retail
 * verbs took. `greedy` on `grain` is **forbidden at load time**:
 * `CommandDefinition.validateArgOrdering` allows a greedy arg before
 * others only when every one of them declares a preposition to stop at,
 * and `extraction` is a bare number that declares none. So the name has
 * to say where it ends, and `"…"` is how.
 *
 * ⚠⚠ The honest part, and the reason the help text was rewritten: the
 * unquoted form **does not refuse you — it mills the wrong thing.**
 * `mill sack of wheat` reads `sack` as the grain, `of` as the extraction
 * and `wheat` as the stones. The binder applies no type gate to a
 * `number` positional, so `of` binds to it without complaint. That is a
 * sentence the grammar can take that nobody meant, and it is pinned here
 * so that if the binder ever grows that type gate, this test is what
 * tells the next person the help text needs rewriting with it.
 *
 * ⚠ `mill wheat at the quern` is the second finding: the arg's own
 * comment calls a second set of stones being ADDRESSABLE the point of
 * declaring it, and the form answered *"doesn't match any known command
 * shape"* because the instrument arg took one token. It is greedy now.
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
  HERE, '..', '..', 'content', 'trade', 'milling', 'cmd', 'milling', 'mill.yaml',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

const def = (): CommandDefinition =>
  CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), 'mill.yaml');

function bind(text: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, def(), ctx);
  if (!('model' in r)) {
    throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  }
  return r.model as Record<string, unknown>;
}

const STONES = 'reachable:[mixin.ComminutingMixin]';

describe('mill — rung 4, where quoting is the answer', () => {
  it('`mill wheat` binds the grain and defaults the stones', () => {
    const m = bind('mill wheat');
    expect(m.grain).toBe('wheat');
    expect(m.mill).toBe(STONES);
  });

  it('`mill wheat 0.9` binds the extraction', () => {
    const m = bind('mill wheat 0.9');
    expect(m.grain).toBe('wheat');
    expect(m.extraction).toBe('0.9');
  });

  it('⭐ `mill "sack of wheat"` — the quoted phrase — binds UNQUOTED', () => {
    const m = bind('mill "sack of wheat"');
    expect(m.grain).toBe('sack of wheat');
    expect(m.mill).toBe(STONES);
  });

  it('⭐ a quoted name AND an extraction together', () => {
    const m = bind('mill "sack of wheat" 0.6');
    expect(m.grain).toBe('sack of wheat');
    expect(m.extraction).toBe('0.6');
  });

  it('⭐ `mill wheat at the quern` — the comment\'s own example — binds', () => {
    const m = bind('mill wheat at the quern');
    expect(m.grain).toBe('wheat');
    expect(m.mill).toBe('the quern');
  });

  it('⚠⚠ unquoted, it takes a sentence nobody meant — and the help says so', () => {
    const m = bind('mill sack of wheat');
    expect(m.grain).toBe('sack');
    // `of` bound to a `number` arg: the binder applies no type gate to a
    // positional. If that ever changes, rewrite the help text with it.
    expect(m.extraction).toBe('of');
    expect(m.mill).toBe('wheat');
  });

  it('⛔ greedy on `grain` is refused at LOAD time — the reason rung 4 exists', () => {
    const yaml = readFileSync(VIEW, 'utf8').replace(
      '  - name: grain\n    type: object\n    required: true\n',
      '  - name: grain\n    type: object\n    required: true\n    greedy: true\n',
    );
    expect(() => CommandDefinition.fromYaml(yaml, 'mill.yaml')).toThrow();
  });
});
