/**
 * ⭐⭐ Nested subcommands (controller-liquidity D2). The binder walks words
 * while they match; `model.subcommand` is the leaf, `model.subcommandPath`
 * the whole walk; options bind lexically per level; the controller resolves
 * at the deepest stanza that names one; `unknown-subcommand` names the
 * words valid AT THAT LEVEL; `fallthrough` works one level down — so a
 * layout named `list` saves and recalls (drive step 9's grammar half).
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

const COCKPIT = `
verbs: [cockpitish]
controller: /c/CockpitController
description: nested fixture
options:
  quiet: { type: boolean }
subcommands:
  layout:
    controller: /c/LayoutRecallController
    description: Arrangements you have saved
    fallthrough: true
    options:
      shared: { type: boolean }
    args:
      - { name: name, type: string, required: true }
    subcommands:
      save:
        controller: /c/LayoutSaveController
        options:
          force: { type: boolean }
        args:
          - { name: name, type: string, required: true }
      forget:
        args:
          - { name: name, type: string, required: true }
      list: {}
  card:
    subcommands:
      move:
        controller: /c/CardMoveController
        args:
          - { name: col, type: number, required: true }
          - { name: row, type: number, required: true }
      pin:
        controller: /c/CardPinController
`;

describe('nested subcommands — the walk', () => {
  it('⭐ leaf in `subcommand`, the walk in `subcommandPath`', () => {
    const r = assemble('cockpitish layout save list', defOf(COCKPIT));
    expect(r).toMatchObject({
      model: { subcommand: 'save', subcommandPath: ['layout', 'save'], name: 'list' },
    });
  });

  it('⭐ fallthrough one level down: an unknown word is the layout name', () => {
    expect(assemble('cockpitish layout evening', defOf(COCKPIT))).toMatchObject({
      model: { subcommand: 'layout', subcommandPath: ['layout'], name: 'evening' },
    });
  });

  it('⭐ a layout named `list` round-trips: saved by `save`, recalled by the quoted name', () => {
    const def = defOf(COCKPIT);
    expect(assemble('cockpitish layout save list', def)).toMatchObject({ model: { name: 'list' } });
    expect(assemble('cockpitish layout list', def)).toMatchObject({
      model: { subcommand: 'list', subcommandPath: ['layout', 'list'] },
    });
    // The name is reachable past the control word: `--` ends the words.
    expect(assemble('cockpitish layout -- list', def)).toMatchObject({
      model: { subcommand: 'layout', name: 'list' },
    });
  });

  it('options bind lexically: a level sees its own and every enclosing level’s', () => {
    expect(
      assemble('cockpitish layout --shared save --force --quiet dusk', defOf(COCKPIT)),
    ).toMatchObject({ model: { shared: true, force: true, quiet: true, name: 'dusk' } });
    // `--force` belongs to `save`, not to `layout`.
    expect(assemble('cockpitish layout --force dusk', defOf(COCKPIT))).toMatchObject({ error: 'bind' });
  });

  it('typed positionals bind at the leaf', () => {
    expect(assemble('cockpitish card move 2 3', defOf(COCKPIT))).toMatchObject({
      model: { subcommand: 'move', subcommandPath: ['card', 'move'], col: 2, row: 3 },
    });
  });

  it('⭐ unknown-subcommand names the words valid AT THAT LEVEL', () => {
    expect(assemble('cockpitish card shuffle', defOf(COCKPIT))).toEqual({
      error: 'unknown-subcommand',
      subcommand: 'card shuffle',
      available: ['move', 'pin'],
    });
    expect(assemble('cockpitish nope', defOf(COCKPIT))).toMatchObject({
      error: 'unknown-subcommand',
      available: ['layout', 'card'],
    });
  });

  it('a stanza with nested words and no args, given none, binds bare', () => {
    expect(assemble('cockpitish card', defOf(COCKPIT))).toMatchObject({
      model: { subcommand: 'card', subcommandPath: ['card'] },
    });
  });
});

describe('nested subcommands — the definition', () => {
  it('⭐ the controller resolves at the deepest stanza that names one', () => {
    const def = defOf(COCKPIT);
    expect(def.controllerForSubcommand('layout save')).toBe('/c/LayoutSaveController');
    expect(def.controllerForSubcommand(['layout', 'forget'])).toBe('/c/LayoutRecallController');
    expect(def.controllerForSubcommand('card')).toBe('/c/CockpitController');
    expect(def.subcommandKey({ subcommand: 'save', subcommandPath: ['layout', 'save'] })).toBe('layout save');
    expect(def.subcommandKey({ subcommand: 'layout' })).toBe('layout');
  });

  it('every stanza is walked by `allSubcommands`, keyed by its path', () => {
    expect(defOf(COCKPIT).allSubcommands().map(([k]) => k)).toEqual([
      'layout',
      'layout save',
      'layout forget',
      'layout list',
      'card',
      'card move',
      'card pin',
    ]);
  });

  it('a structured caller names a nested stanza by its path', () => {
    const r = CommandApi.assembleFromStructured(
      { verb: 'cockpitish', subcommand: 'layout save', fields: { name: 'dusk' } },
      defOf(COCKPIT),
      ctx,
    );
    expect(r).toMatchObject({ model: { subcommand: 'save', subcommandPath: ['layout', 'save'] } });
  });

  it('help renders the tree', () => {
    const help = defOf(COCKPIT).getHelpText();
    expect(help).toContain('  cockpitish layout <name>');
    expect(help).toContain('    cockpitish layout save <name>');
    expect(help).toContain('  cockpitish card <move|pin>');
    expect(help).toContain('    cockpitish card move <col> <row>');
  });

  it('load time: args beside nested words need fallthrough; every stanza needs a controller', () => {
    expect(() =>
      defOf(`
verbs: [v]
controller: C
description: d
subcommands:
  a:
    args: [{ name: x, type: string }]
    subcommands: { b: {} }
`),
    ).toThrow(/cannot have both args and nested subcommands/);
    expect(() =>
      defOf(`
verbs: [v]
description: d
subcommands:
  a:
    controller: A
    subcommands: { b: {} }
  c:
    subcommands: { d: {} }
`),
    ).toThrow(/\[c, c d\]/);
  });
});
