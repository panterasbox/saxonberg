/**
 * ⭐ `verb@source` in a SCRIPT (controllers-are-io D2, D23): the script
 * binder shares the dispatcher's matcher, so a scoped line binds from
 * its source; a plural scope dispatches once per source; and a NAME
 * matching several — a question a script cannot answer — fails closed
 * `needs-input`, naming the input, and never waits.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Interpreter, type DispatchFn, type ResourceLimits } from '../Interpreter';
import { Scope } from '../Scope';
import { CommandApi, type CommandContext } from '../../../api/command';
import { CommandDefinition } from '../../command/CommandDefinition';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import type { Script } from '../ast';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance } from '../../command/CommandGiver';

const LIMITS: ResourceLimits = { sliceSteps: 10000, maxSteps: 10000, maxDispatch: 10000, maxDepth: 64 };

const line = (word: string): Script => ({
  kind: 'script',
  statements: [{ kind: 'pipeline', commands: [{ kind: 'command', word, args: [] }] }],
});

describe('verb@source in a script', () => {
  let world: MqlWorld;
  let wind: CommandDefinition;
  let sources: (Stuff | undefined)[];
  const dispatch: DispatchFn = async (_c, _m, _p, source) => {
    sources.push(source);
    return { getNotes: () => [] } as unknown as CommandContext;
  };

  beforeEach(async () => {
    sources = [];
    world = makeWorld();
    wind = CommandDefinition.fromYaml(
      `
verbs: [windish]
controller: NoopController
description: script scope fixture
args:
  - name: target
    type: object
    scope: [reachable]
    requires: VisibleMixin
`,
      '<test>',
    );
    await CommandApi.resolveValidators(wind);
    vi.spyOn(world.giver, 'getAffordances').mockReturnValue([
      { command: wind, source: world.rose, bucket: 'environment' },
      { command: wind, source: world.daisy, bucket: 'environment' },
    ] as Affordance[]);
  });
  afterEach(() => vi.restoreAllMocks());

  const run = (word: string) =>
    new Interpreter(world.giver, LIMITS).drive(line(word), new Scope(), dispatch, async () => {});

  it('binds from the one source it names', async () => {
    await run('windish@daisy');
    expect(sources).toEqual([world.daisy]);
  });

  it('a plural scope dispatches once per source', async () => {
    await run('windish@"all flower"');
    expect(new Set(sources)).toEqual(new Set([world.rose, world.daisy]));
  });

  it('⭐⭐ a NAME matching several fails closed and names its input', async () => {
    const result = await run('windish@flower');
    expect(sources).toEqual([]);
    expect(result.notes).toContainEqual({
      kind: 'command-rejected',
      reason: 'needs-input',
      detail: "windish needs a choice of source ('flower' could be any of 2) when run from a script",
    });
  });

  it('a scope naming nothing → source-not-found', async () => {
    const result = await run('windish@teapot');
    expect(sources).toEqual([]);
    expect(result.notes.some((n) => (n as { reason?: string }).reason === 'source-not-found')).toBe(true);
  });
});
