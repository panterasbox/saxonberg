/**
 * ShellApi tests — `expandVariables` plus its dispatch through the
 * matcher (`CommandApi.assemble`).
 *
 * Sections cover the synthetic-var lookup (mixin-declared, walked via
 * `MixinApi.queryMixins`), stored vars (`giver.listVars()`),
 * synthetic-vs-stored precedence, the `${X}` bracketed form, the `$$`
 * MQL-passthrough rule, the gating chain (no `EnvironmentMixin` →
 * identity, `shell.interpolate-vars: false` → identity), unknown-var
 * soft-warn behavior, multi-word expansion, and YAML-side scope[]
 * fallback through the dispatcher.
 *
 * v1 ships exactly one synthetic var: `$scope` on `FocusedMixin`. The
 * MQL pronoun words (`me`, `here`, `it`/`him`/`her`/`them`) are
 * resolver keywords, NOT shell vars — these tests do not exercise
 * `$me` / `$here` / etc.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { FocusedMixin } from '../../lib/command/Focused';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { EnvironmentMixin } from '../../lib/shell/Environment';
import { SensorMixin } from '../../lib/message/Sensor';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { ShellApi } from '../shell';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { CommandApi } from '../command';
import { CommandLineApi } from '../command-line';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { CartesianLocation } from '../../lib/spatial/CartesianLocation';

class TestGiverBase extends EnvironmentMixin(
  FocusedMixin(
    CommandGiverMixin(
      SensorMixin(
        ContainableMixin(NamedMixin(PerceptibleMixin(Idea))),
      ),
    ),
  ),
) {
  protected handleMessage(): void {}
}
class TestGiver extends TestGiverBase {}

class NpcGiver extends CommandGiverMixin(
  ContainableMixin(NamedMixin(PerceptibleMixin(Idea))),
) {}

describe('ShellApi.expandVariables', () => {
  let giver: TestGiver;
  let location: CartesianLocation;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
  });

  it('leaves text without sigils untouched', () => {
    expect(ShellApi.expandVariables('hello world', giver)).toBe('hello world');
    expect(ShellApi.expandVariables('', giver)).toBe('');
  });

  it('expands $scope to the giver scope', () => {
    expect(ShellApi.expandVariables('$scope', giver)).toBe('here');
    giver.setScope('inventory, here');
    expect(ShellApi.expandVariables('look $scope', giver)).toBe(
      'look inventory, here',
    );
  });

  it('expands ${X} bracketed form, lets it abut other characters', () => {
    giver.setScope('library');
    expect(ShellApi.expandVariables('${scope}.book', giver)).toBe(
      'library.book',
    );
  });

  it('leaves $$ intact for MQL', () => {
    expect(ShellApi.expandVariables('$$', giver)).toBe('$$');
    expect(ShellApi.expandVariables('$$:i', giver)).toBe('$$:i');
  });

  it('expands stored vars from giver.listVars()', () => {
    giver.setVar('weapon', 'rusty sword');
    expect(ShellApi.expandVariables('the $weapon', giver)).toBe(
      'the rusty sword',
    );
  });

  it('synthetic wins over a colliding stored var', () => {
    giver.setScope('here');
    giver.setVar('scope', 'foo');
    // `var set scope foo` does not shadow the synthetic $scope —
    // documented names are stable.
    expect(ShellApi.expandVariables('$scope', giver)).toBe('here');
  });

  it('substitutes empty for unknown stored vars', () => {
    expect(ShellApi.expandVariables('look $nope here', giver)).toBe(
      'look  here',
    );
  });

  it('handles multiple substitutions in one string', () => {
    giver.setScope('library');
    giver.setVar('item', 'book');
    expect(
      ShellApi.expandVariables('drilled into ${scope}.${item}', giver),
    ).toBe('drilled into library.book');
  });
});

describe('ShellApi.lookupSyntheticVar', () => {
  it('finds $scope on FocusedMixin', () => {
    const giver = makeStuff(() => new TestGiver());
    expect(ShellApi.lookupSyntheticVar(giver, 'scope')?.name).toBe('scope');
  });

  it('returns null for unknown names', () => {
    const giver = makeStuff(() => new TestGiver());
    expect(ShellApi.lookupSyntheticVar(giver, 'nonexistent')).toBeNull();
  });

  it('returns null for $scope when the giver lacks FocusedMixin', () => {
    const npc = makeStuff(() => new NpcGiver());
    expect(ShellApi.lookupSyntheticVar(npc, 'scope')).toBeNull();
  });
});

describe('CommandApi.assemble — variable expansion through matcher', () => {
  let giver: TestGiver;
  let location: CartesianLocation;

  function lookCmd(): CommandDefinition {
    return CommandDefinition.fromYaml(
      [
        'verbs: [look]',
        'controller: LookController',
        'description: examine',
        'args:',
        '  - name: target',
        '    type: object',
        '    required: false',
        '    scope: "inventory, here"',
        '    prepositions: [at]',
      ].join('\n'),
      '<test>',
    );
  }

  function sayCmd(): CommandDefinition {
    return CommandDefinition.fromYaml(
      [
        'verbs: [say]',
        'controller: SayController',
        'description: speak',
        'args:',
        '  - name: words',
        '    type: string',
        '    required: true',
        '    greedy: true',
      ].join('\n'),
      '<test>',
    );
  }

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
  });

  it('expands $scope into the bound positional', () => {
    giver.setScope('library');
    const parsed = CommandLineApi.parsePipeline('look $scope').commands[0]!;
    const built = CommandApi.assemble(parsed, lookCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + built.summary);
    expect(built.model.target).toBe('library');
  });

  it('expands inside a quoted greedy slice', () => {
    giver.setScope('plaza');
    const parsed = CommandLineApi.parsePipeline(
      'say the $scope is empty',
    ).commands[0]!;
    const built = CommandApi.assemble(parsed, sayCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + built.summary);
    expect(built.model.words).toBe('the plaza is empty');
  });

  it('skips expansion when shell.interpolate-vars is false', () => {
    giver.setSetting('shell.interpolate-vars', false, giver);
    const parsed = CommandLineApi.parsePipeline('look $scope').commands[0]!;
    const built = CommandApi.assemble(parsed, lookCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + built.summary);
    // Untouched — the literal `$scope` flows to MQL.
    expect(built.model.target).toBe('$scope');
  });

  it('skips expansion when the giver lacks EnvironmentMixin', () => {
    const npc = makeStuff(() => new NpcGiver());
    ContainmentApi.move(npc, location);
    const parsed = CommandLineApi.parsePipeline('look $scope').commands[0]!;
    const built = CommandApi.assemble(parsed, lookCmd(), {
      commandGiver: npc as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + built.summary);
    expect(built.model.target).toBe('$scope');
  });
});

describe('CommandApi.assemble — defaults', () => {
  let giver: TestGiver;
  let location: CartesianLocation;

  function lookWithDefault(): CommandDefinition {
    return CommandDefinition.fromYaml(
      [
        'verbs: [look]',
        'controller: LookController',
        'description: examine',
        'args:',
        '  - name: target',
        '    type: object',
        '    required: false',
        '    scope: "inventory, here"',
        '    prepositions: [at]',
        '    default: "$scope"',
      ].join('\n'),
      '<test>',
    );
  }

  function giveCmd(): CommandDefinition {
    // Two positionals: `gift` (default $scope) and `recipient`
    // (`prepositions: [to]`, default `me`). The matcher's
    // boundary-lookahead picks up `to` as recipient's marker.
    return CommandDefinition.fromYaml(
      [
        'verbs: [give]',
        'controller: GiveController',
        'description: hand over',
        'args:',
        '  - name: gift',
        '    type: string',
        '    required: false',
        '    default: "$scope"',
        '  - name: recipient',
        '    type: string',
        '    required: false',
        '    prepositions: [to]',
        '    default: me',
      ].join('\n'),
      '<test>',
    );
  }

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
  });

  it('fills bare `look` from default: $scope, expands the default', () => {
    giver.setScope('here');
    const parsed = CommandLineApi.parsePipeline('look').commands[0]!;
    const built = CommandApi.assemble(parsed, lookWithDefault(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + built.summary);
    expect(built.model.target).toBe('here');
  });

  it('skips later-preposition tokens via lookahead and defaults the gap', () => {
    // `give to bob` — `to` belongs to `recipient`, so `gift`
    // defaults to `$scope` (= "here") and `recipient` consumes `to`
    // and binds `bob`.
    const parsed = CommandLineApi.parsePipeline('give to bob').commands[0]!;
    const built = CommandApi.assemble(parsed, giveCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + built.summary);
    expect(built.model.gift).toBe('here');
    expect(built.model.recipient).toBe('bob');
  });

  it('defaults both fields on bare invocation', () => {
    const parsed = CommandLineApi.parsePipeline('give').commands[0]!;
    const built = CommandApi.assemble(parsed, giveCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + built.summary);
    expect(built.model.gift).toBe('here');
    expect(built.model.recipient).toBe('me');
  });
});

describe('CommandApi.resolveAndValidate — YAML scope[] fallback', () => {
  // The fallback chain lives on the YAML's scope array. A drilled
  // player typing `look chair` against `scope: ['$scope', 'inventory,
  // here']` searches the drill scope first, then the room — without
  // the implicit player-scope-priority that earlier iterations baked
  // into the dispatcher.
  // Coverage of the actual fallback resolution lives in
  // command-pronoun.test.ts (drill-fallback case) since it needs the
  // full Stuff world fixture.

  it('parses scope as a string[] from YAML', () => {
    const cmd = CommandDefinition.fromYaml(
      [
        'verbs: [look]',
        'controller: LookController',
        'description: examine',
        'args:',
        '  - name: target',
        '    type: object',
        '    required: false',
        '    scope: ["$scope", "inventory, here"]',
      ].join('\n'),
      '<test>',
    );
    expect(cmd.args[0]!.scope).toEqual(['$scope', 'inventory, here']);
  });
});
