/**
 * `saw` through the BINDER — the view's arg shapes, asserted on the model
 * a player's sentence actually produces (a controller test builds its
 * model by hand and would never notice a view that cannot bind).
 *
 * ⭐ Two things are pinned:
 *
 *  1. the SAW is declared, with the CAPABILITY as its default — never
 *     `[class.Sawmill]` — and a second saw is addressable (`at the pit
 *     saw`, greedy, so the article does not break it);
 *  2. the cut is an OPTION (`--quarter`), not a positional word: a bare
 *     string before a defaulted object is the binder's phrase-shape
 *     defect, which would hand word two of `saw oak bole` to the cut and
 *     throw the saw's default away.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { CommandLineApi } from '@saxonberg/server/mud/api/command-line';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Location from '@saxonberg/server/mud/lib/stuff/Location';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEW = join(
  HERE, '..', '..', 'content', 'trade', 'carpentry', 'cmd', 'carpentry', 'saw.yaml',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

const def = (): CommandDefinition =>
  CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), 'saw.yaml');

function bind(text: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, def(), ctx);
  if (!('model' in r)) {
    throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  }
  return r.model as Record<string, unknown>;
}

const SAWS = 'reachable:[capability.sawing]';

describe('saw — the view binds what a sawyer says', () => {
  it('`saw bole` binds the log and defaults the saw by CAPABILITY', () => {
    const m = bind('saw bole');
    expect(m.log).toBe('bole');
    expect(m.saw).toBe(SAWS);
    expect(m.quarter).toBeFalsy();
  });

  it('⭐ `saw bole --quarter` sets the cut and keeps the saw default', () => {
    const m = bind('saw bole --quarter');
    expect(m.log).toBe('bole');
    expect(m.quarter).toBe(true);
    expect(m.saw).toBe(SAWS);
  });

  it('⭐ `saw the length at the pit saw` — a second saw is addressable, article and all', () => {
    const m = bind('saw length at the pit saw');
    expect(m.log).toBe('length');
    expect(m.saw).toBe('the pit saw');
  });

  it('the saw arg is the capability, never a class', () => {
    const view = YAML.parse(readFileSync(VIEW, 'utf8')) as {
      args: Array<{ name: string; default?: string; requires?: unknown }>;
    };
    const saw = view.args.find((a) => a.name === 'saw')!;
    expect(saw.default).toBe(SAWS);
    expect(saw.requires).toEqual(['ToolMixin']);
  });
});
