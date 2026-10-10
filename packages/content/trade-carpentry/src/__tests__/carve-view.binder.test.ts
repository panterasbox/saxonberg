/**
 * `carve` through the BINDER. The part is a WORD (a recipe's keyword) on
 * an object arg, so an unresolved word binds as `{ stuff: null, raw }`
 * and a multi-word part (`carve pick haft`) arrives whole; the stock and
 * the edge are prepositional and greedy so an article never breaks them.
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
  HERE, '..', '..', 'content', 'trade', 'carpentry', 'cmd', 'carpentry', 'carve.yaml',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

const def = (): CommandDefinition =>
  CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), 'carve.yaml');

function bind(text: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, def(), ctx);
  if (!('model' in r)) {
    throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  }
  return r.model as Record<string, unknown>;
}

const EDGE = 'reachable:[capability.cutting]';

describe('carve — the view binds what a woodworker says', () => {
  it('`carve haft` binds the part and defaults the edge', () => {
    const m = bind('carve haft');
    expect(m.thing).toBe('haft');
    expect(m.knife).toBe(EDGE);
    expect(m.stock).toBeUndefined();
  });

  it('⭐ `carve pick haft` — a two-word part arrives whole', () => {
    expect(bind('carve pick haft').thing).toBe('pick haft');
  });

  it('`carve peg from the blank` names the stock', () => {
    const m = bind('carve peg from the blank');
    expect(m.thing).toBe('peg');
    expect(m.stock).toBe('the blank');
    expect(m.knife).toBe(EDGE);
  });

  it('`carve handle with the billhook` names the edge', () => {
    const m = bind('carve handle with the billhook');
    expect(m.thing).toBe('handle');
    expect(m.knife).toBe('the billhook');
  });
});
