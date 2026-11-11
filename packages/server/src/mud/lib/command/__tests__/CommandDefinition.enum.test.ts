/**
 * ⭐ `type: enum` — a closed word list is a TYPE (controller-liquidity D1,
 * owner ruling 2026-11-10), and the VIEW's refusal. The binder
 * canonicalizes a match and refuses anything else with the list named,
 * before a controller is cloned; `help` lists the words. `values:` is
 * required on `enum` and refused on every other type.
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
description: enum fixture
options:
  width:
    type: enum
    values: [wide, open, half, low, banked]
args:
  - name: mode
    type: enum
    required: false
    values: [Bright, dim]
`;

describe('type: enum — the view refuses an out-of-set word', () => {
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

  // ⭐ The schema refuses a type/values mismatch before the definition's own
  // validate() (which refuses it again, for a definition built past the
  // schema): values: on a non-enum slot, or an enum with no values:.
  it('load time: an empty, duplicated, default-outside or mistyped list is refused', () => {
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: enum, values: [x, X] }
`),
    ).toThrow(/lists "X" twice/);
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: enum, values: [x, y], default: z }
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
    ).toThrow(/must match "else" schema/);
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: string, values: [x] }
`),
    ).toThrow(/must match "else" schema/);
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
options:
  o: { type: enum }
`),
    ).toThrow(/must have required property 'values'/);
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
args:
  - { name: a, type: enum, values: [] }
`),
    ).toThrow();
  });
});
