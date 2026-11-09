/**
 * ⭐ `values:` — a closed word set is the VIEW's refusal (controller-liquidity
 * D1). The binder canonicalizes a match and refuses anything else with the
 * set named, before a controller is cloned; `help` lists the set.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Place from '../../stuff/Place';
import type { CommandGiver } from '../CommandGiver';

const ctx = { commandGiver: {} as Stuff & CommandGiver, location: {} as Place };
const defOf = (yaml: string): CommandDefinition => CommandDefinition.fromYaml(yaml, '<test>');
const assemble = (text: string, def: CommandDefinition) =>
  CommandApi.assemble(CommandLineApi.parsePipeline(text).commands[0]!, def, ctx);

const STYLE = `
verbs: [stylish]
controller: NoopController
description: values fixture
options:
  width:
    type: string
    values: [wide, open, half, low, banked]
args:
  - name: mode
    type: string
    required: false
    values: [Bright, dim]
`;

describe('values: — the view refuses an out-of-set word', () => {
  it('binds the canonical spelling, case-insensitively', () => {
    const r = assemble('stylish DIM --width WIDE', defOf(STYLE));
    expect(r).toMatchObject({ model: { mode: 'dim', width: 'wide' } });
    expect(assemble('stylish bright', defOf(STYLE))).toMatchObject({ model: { mode: 'Bright' } });
  });

  it('⭐ refuses an option value with the list named — a bind error', () => {
    const r = assemble('stylish --width medium', defOf(STYLE));
    expect(r).toEqual({
      error: 'bind',
      summary: "option --width: 'medium' is not one of wide, open, half, low, banked",
    });
  });

  it('refuses a positional value with the list named', () => {
    const r = assemble('stylish loud', defOf(STYLE));
    expect(r).toEqual({ error: 'bind', summary: "mode: 'loud' is not one of Bright, dim" });
  });

  it('help renders the set in place of the placeholder', () => {
    const help = defOf(STYLE).getHelpText();
    expect(help).toContain('stylish [Bright|dim]');
    expect(help).toContain('--width <wide|open|half|low|banked>');
  });

  it('load time: an empty, duplicated or default-outside list is refused', () => {
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: string, values: [x, X] }
`),
    ).toThrow(/lists "X" twice/);
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: string, values: [x, y], default: z }
`),
    ).toThrow(/default "z" is not one of values/);
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: object, requires: any, values: [x] }
`),
    ).toThrow(/only valid on a string slot/);
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: string, values: [] }
`),
    ).toThrow();
  });
});
