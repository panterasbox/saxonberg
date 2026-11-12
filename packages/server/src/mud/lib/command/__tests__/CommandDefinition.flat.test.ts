/**
 * ⛔ A command is `verb target` or `verb subcommand target`, never deeper
 * (owner rule 2026-11-10). Nested subcommands shipped in controller-
 * liquidity W1 (D2) and were reversed in W16: the schema refuses a
 * `subcommands:` (or `fallthrough:`) inside a stanza, `validate()` refuses
 * it for a view built in code, and the binder walks exactly one word.
 * ⭐ A non-diegetic verb that wants a second word takes a hyphenated
 * compound NAME instead — `client-layout save <name>` — and the hyphen
 * tokenizes, resolves and binds as one word.
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

describe('no nested subcommands', () => {
  it('⛔ the schema refuses `subcommands:` inside a stanza', () => {
    expect(() =>
      defOf(`
verbs: [deep]
controller: /c/C
description: d
subcommands:
  layout:
    subcommands:
      save: { controller: /c/S }
`),
    ).toThrow(/Schema validation failed/);
  });

  it('⛔ the schema refuses a stanza-level `fallthrough:`', () => {
    expect(() =>
      defOf(`
verbs: [deep]
controller: /c/C
description: d
subcommands:
  layout:
    fallthrough: true
    args:
      - { name: name, type: string }
`),
    ).toThrow(/Schema validation failed/);
  });

  it('binds one subcommand word; a second word is an argument, never a stanza', () => {
    const def = defOf(`
verbs: [client-layout]
controller: /c/Recall
description: d
fallthrough: true
args:
  - { name: name, type: string, required: false }
subcommands:
  save:
    controller: /c/Save
    args:
      - { name: name, type: string, required: true }
  recall:
    controller: /c/Recall
    args:
      - { name: name, type: string, required: true }
  list: { controller: /c/List }
`);
    expect(assemble('client-layout save list', def)).toEqual({
      model: { subcommand: 'save', name: 'list' },
    });
    expect(assemble('client-layout recall list', def)).toEqual({
      model: { subcommand: 'recall', name: 'list' },
    });
    expect(assemble('client-layout list', def)).toEqual({ model: { subcommand: 'list' } });
    // An unknown word falls through to the verb's own args.
    expect(assemble('client-layout evening', def)).toEqual({ model: { name: 'evening' } });
    expect(def.controllerForSubcommand('save')).toBe('/c/Save');
  });

  it('⭐ a hyphenated verb and a hyphenated subcommand word tokenize as one word', () => {
    const parsed = CommandLineApi.parsePipeline('testharness clock-advance 2h').commands[0]!;
    expect(parsed.verb).toBe('testharness');
    const def = defOf(`
verbs: [testharness]
description: d
subcommands:
  clock: { controller: /c/Clock }
  clock-advance:
    controller: /c/Advance
    args:
      - { name: value, type: string }
`);
    expect(assemble('testharness clock-advance 2h', def)).toEqual({
      model: { subcommand: 'clock-advance', value: '2h' },
    });
    expect(CommandLineApi.parsePipeline('client-style plain-channel gossip on').commands[0]!.verb).toBe(
      'client-style',
    );
  });
});
