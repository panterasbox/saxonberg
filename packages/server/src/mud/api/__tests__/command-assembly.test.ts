/**
 * Matcher tests — CommandApi.assemble + load-time invariants on
 * CommandDefinition.
 *
 * These don't run controllers; they exercise the parse → bind path
 * up to (but not including) MQL resolution.
 */

import { describe, it, expect } from 'vitest';
import { CommandApi } from '../command';
import { CommandLineApi } from '../command-line';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Location } from '../../lib/stuff/Location';
import type { CommandGiver } from '../../lib/command/CommandGiver';

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

function defOf(yaml: string): CommandDefinition {
  return CommandDefinition.fromYaml(yaml, '<test>');
}

function assembleText(text: string, def: CommandDefinition) {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  return CommandApi.assemble(parsed, def, ctx);
}

describe('CommandApi.assemble — flat verb / positional shape', () => {
  const lookYaml = `
verbs: [look]
controller: LookController
description: Look
args:
  - name: target
    type: object
    required: false
`;

  it('binds with no positional (target absent)', () => {
    const def = defOf(lookYaml);
    const r = assembleText('look', def);
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model).toEqual({});
    }
  });

  it('binds the target field when a positional is provided', () => {
    const def = defOf(lookYaml);
    const r = assembleText('look sword', def);
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model).toEqual({ target: 'sword' });
    }
  });

  it('returns shape error on leftover positionals', () => {
    const def = defOf(`
verbs: [look]
controller: LookController
description: Look
args:
  - name: target
    type: object
    required: true
`);
    const r = assembleText('look one two', def);
    expect('error' in r && r.error === 'shape').toBe(true);
  });
});

describe('CommandApi.assemble — greedy fields', () => {
  const sayYaml = `
verbs: [say]
controller: SayController
description: Say
args:
  - name: message
    type: string
    required: true
    greedy: true
`;

  it('preserves internal whitespace runs', () => {
    const def = defOf(sayYaml);
    const r = assembleText('say  hello   world', def);
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model.message).toBe('hello   world');
    }
  });

  it('keeps quotes literal inside the greedy slice', () => {
    const def = defOf(sayYaml);
    const r = assembleText('say "hello world"', def);
    if ('model' in r) {
      expect(r.model.message).toBe('"hello world"');
    }
  });

  it('processes outside-quote escapes (\\ -space, \\|, \\\\)', () => {
    const def = defOf(sayYaml);
    expect(extractMessage(assembleText('say a\\|b', def))).toBe('a|b');
    expect(extractMessage(assembleText('say a\\ b', def))).toBe('a b');
    expect(extractMessage(assembleText('say a\\\\b', def))).toBe('a\\b');
  });

  it('returns shape error when greedy field is required but no input', () => {
    const def = defOf(sayYaml);
    const r = assembleText('say', def);
    expect('error' in r && r.error === 'shape').toBe(true);
  });

  it('binds an MQL-style query into greedy text for type:object greedy', () => {
    const def = defOf(`
verbs: [scan]
controller: ScanController
description: Scan
args:
  - name: query
    type: string
    required: true
    greedy: true
`);
    expect(extractMessage(assembleText('scan red flower', def), 'query')).toBe(
      'red flower'
    );
  });
});

describe('CommandApi.assemble — required-after-optional and greedy-must-be-last', () => {
  it('rejects YAML with a required field after an optional', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
args:
  - name: a
    type: string
    required: false
  - name: b
    type: string
    required: true
`)
    ).toThrow(/required arg cannot follow optional/);
  });

  it('rejects YAML with greedy not in the last position', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
args:
  - name: a
    type: string
    required: true
    greedy: true
  - name: b
    type: string
    required: true
`)
    ).toThrow(/greedy arg must be last/);
  });
});

describe('CommandApi.assemble — verb options', () => {
  const giltYaml = `
verbs: [git]
controller: GitController
description: Git
options:
  json:
    short: j
    type: boolean
  author:
    short: a
    type: string
    multiple: true
args:
  - name: path
    type: string
    required: false
`;

  it('binds a long-flag boolean option', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git --json', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ json: true });
    } else {
      throw new Error('expected model');
    }
  });

  it('binds a short-flag boolean option', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git -j', def);
    if ('model' in r) expect(r.model).toMatchObject({ json: true });
  });

  it('accumulates values for multiple:true options', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git --author=alice --author=bob', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ author: ['alice', 'bob'] });
    }
  });

  it('rejects multi-occurrence on multiple:false', () => {
    const def = defOf(`
verbs: [git]
controller: GitController
description: Git
options:
  out:
    type: string
`);
    const r = assembleText('git --out=a --out=b', def);
    expect('error' in r && r.error === 'bind').toBe(true);
  });

  it('rejects a value on a boolean option', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git --json=foo', def);
    expect('error' in r && r.error === 'bind').toBe(true);
  });

  it('rejects an unknown verb-scope option', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git --bogus', def);
    expect('error' in r && r.error === 'bind').toBe(true);
  });

  it('handles short-flag value-bearing tail (-an alice)', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git -aalice', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ author: ['alice'] });
    }
  });

  it('handles a value-bearing short flag with separate value', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git -a alice', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ author: ['alice'] });
    }
  });

  it('handles mixed flag stacks with value-bearing tail (-jaalice)', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git -jaalice', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ json: true, author: ['alice'] });
    }
  });

  it('coerces number-typed options', () => {
    const def = defOf(`
verbs: [server]
controller: ServerController
description: Server
options:
  port:
    short: p
    type: number
`);
    const r = assembleText('server -p 8080', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ port: 8080 });
    } else {
      throw new Error('expected model');
    }
  });

  it('rejects non-numeric values on number-typed options', () => {
    const def = defOf(`
verbs: [server]
controller: ServerController
description: Server
options:
  port:
    type: number
`);
    const r = assembleText('server --port=xyz', def);
    expect('error' in r && r.error === 'bind').toBe(true);
  });
});

describe('CommandApi.assemble — subcommand option scope', () => {
  const playerYaml = `
verbs: [player]
controller: PlayerController
description: Player
options:
  json:
    type: boolean
subcommands:
  name:
    description: Set name
    options:
      formal:
        type: boolean
    args:
      - name: name
        type: string
        required: true
      - name: surname
        type: string
        required: false
  show:
    description: Show
`;

  it('rejects sub-only option used at verb level', () => {
    const def = defOf(playerYaml);
    const r = assembleText('player --formal name Aslan', def);
    expect('error' in r && r.error === 'bind').toBe(true);
  });

  it('binds sub-scope option after the subcommand', () => {
    const def = defOf(playerYaml);
    const r = assembleText('player name --formal Aslan', def);
    if ('model' in r) {
      expect(r.model.subcommand).toBe('name');
      expect(r.model).toMatchObject({ formal: true, name: 'Aslan' });
    } else {
      throw new Error('expected model');
    }
  });

  it('binds verb-scope option before the subcommand', () => {
    const def = defOf(playerYaml);
    const r = assembleText('player --json show', def);
    if ('model' in r) {
      expect(r.model.subcommand).toBe('show');
      expect(r.model).toMatchObject({ json: true });
    }
  });

  it('returns unknown-subcommand error with the typed name + available list', () => {
    const def = defOf(playerYaml);
    const r = assembleText('player nope', def);
    expect('error' in r && r.error === 'unknown-subcommand').toBe(true);
    if ('error' in r && r.error === 'unknown-subcommand') {
      expect(r.subcommand).toBe('nope');
      expect(Array.isArray(r.available)).toBe(true);
      expect(r.available.length).toBeGreaterThan(0);
    }
  });

  it('binds subcommand positionals from args-array order', () => {
    const def = defOf(playerYaml);
    const r = assembleText('player name Alice Smith', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ name: 'Alice', surname: 'Smith' });
    }
  });
});

describe('CommandApi.assemble — stop-options sentinel', () => {
  const giltYaml = `
verbs: [git]
controller: GitController
description: Git
options:
  json:
    short: j
    type: boolean
args:
  - name: path
    type: string
    required: false
    greedy: true
`;

  it('forces every token after -- to word', () => {
    const def = defOf(giltYaml);
    const r = assembleText('git -- --json', def);
    if ('model' in r) {
      expect(r.model).toMatchObject({ path: '--json' });
    } else {
      throw new Error('expected model');
    }
  });
});

describe('CommandDefinition load-time invariants — field-name uniqueness', () => {
  it('rejects collision between a verb-scope option and a positional arg', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
options:
  target:
    type: string
args:
  - name: target
    type: object
    required: true
`)
    ).toThrow(/collides with verb-scoped option/);
  });

  it('rejects collision between verb-scope and subcommand-scope options', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
options:
  json:
    type: boolean
subcommands:
  list:
    options:
      json:
        type: boolean
`)
    ).toThrow(/collides between verb-scoped option and subcommand "list" option/);
  });

  it('rejects duplicate arg names within the args array', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
args:
  - name: x
    type: string
  - name: x
    type: string
`)
    ).toThrow(/duplicated/);
  });

  it('rejects "subcommand" as an arg name when the verb has subcommands', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
subcommands:
  go:
    args:
      - name: subcommand
        type: string
`)
    ).toThrow(/reserved when subcommands are declared/);
  });
});

function extractMessage(
  r: ReturnType<typeof CommandApi.assemble>,
  field = 'message'
): unknown {
  if ('model' in r) return r.model[field];
  throw new Error(`expected model, got error: ${JSON.stringify(r)}`);
}
