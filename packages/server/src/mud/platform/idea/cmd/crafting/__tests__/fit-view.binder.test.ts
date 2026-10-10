/**
 * `fit` — the view's shapes bind the way the help text says (controller
 * tests skip the binder; this is the binder). The mixin gate on `whole`
 * (`requires: AssembledMixin`) is resolution's, and the drive walks it.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CommandApi } from '../../../../../api/command';
import { CommandLineApi } from '../../../../../api/command-line';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type Location from '../../../../../lib/stuff/Location';
import type { CommandGiver } from '../../../../../lib/command/CommandGiver';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEW = join(
  HERE, '..', '..', '..', '..', '..', '..', '..', '..', 'content', 'platform',
  'content', 'platform', 'cmd', 'crafting', 'fit.yaml',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

function bind(text: string): Record<string, unknown> {
  const def = CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), 'fit.yaml');
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, def, ctx);
  if (!('model' in r)) throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  return r.model as Record<string, unknown>;
}

describe('fit — the view', () => {
  it('the raise arm: `fit cask` binds the word, no whole', () => {
    const m = bind('fit cask');
    expect(m.thing).toBe('cask');
    expect(m.whole).toBeUndefined();
  });

  it('the replace arm: `fit haft to pick`', () => {
    const m = bind('fit haft to pick');
    expect(m.thing).toBe('haft');
    expect(m.whole).toBe('pick');
  });

  it('⭐ greedy both sides: `fit the oak haft to the old pick`', () => {
    const m = bind('fit the oak haft to the old pick');
    expect(m.thing).toBe('the oak haft');
    expect(m.whole).toBe('the old pick');
  });

  it('the tool defaults to the reachable tools, and can be named', () => {
    expect(bind('fit stave to cask').tool).toBe('reachable:[mixin.ToolMixin]');
    expect(bind('fit stave to cask with the driver').tool).toBe('the driver');
  });
});
