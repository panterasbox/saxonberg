/**
 * Variable interpolation tests — `expandVariables` plus its dispatch
 * through the matcher (`CommandApi.assemble`).
 *
 * Sections cover the synthetic-var pipeline (mixin-declared, walked
 * via `MixinApi.queryMixins`), stored vars (`giver.listVars()`),
 * synthetic-vs-stored precedence, the `${X}` bracketed form, the
 * `$$` MQL-passthrough rule, the gating chain (no `EnvironmentMixin`
 * → identity, `shell.interpolate-vars: false` → identity), unknown-
 * var soft-warn behavior, and the multi-word expansion case.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { FocusedMixin } from '../../command/Focused';
import { ContainableMixin } from '../../spatial/Containable';
import { EnvironmentMixin } from '../Environment';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import {
  expandVariables,
  lookupSyntheticVar,
} from '../var-interpolation';
import { makeStuff } from '../../security/__tests__/test-setup';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../../command/CommandDefinition';
import { ContainmentApi } from '../../../api/containment';
import { CartesianLocation } from '../../spatial/CartesianLocation';

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

describe('expandVariables', () => {
  let giver: TestGiver;
  let location: CartesianLocation;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
  });

  it('leaves text without sigils untouched', () => {
    expect(expandVariables('hello world', giver)).toBe('hello world');
    expect(expandVariables('', giver)).toBe('');
  });

  it('expands a synthetic $scope to the giver scope', () => {
    expect(expandVariables('$scope', giver)).toBe('here');
    giver.setScope('inventory, here');
    expect(expandVariables('look $scope', giver)).toBe('look inventory, here');
  });

  it('expands $me from CommandGiverMixin', () => {
    expect(expandVariables('look at $me', giver)).toBe('look at me');
  });

  it('expands $here from ContainableMixin', () => {
    expect(expandVariables('look $here', giver)).toBe('look here');
  });

  it('expands $it / $him / $her / $them as MQL pronoun literals', () => {
    expect(expandVariables('${it}', giver)).toBe('it');
    expect(expandVariables('${him}', giver)).toBe('him');
    expect(expandVariables('${her}', giver)).toBe('her');
    expect(expandVariables('${them}', giver)).toBe('them');
  });

  it('expands ${X} bracketed form, lets it abut other characters', () => {
    giver.setScope('library');
    expect(expandVariables('${scope}.book', giver)).toBe('library.book');
  });

  it('leaves $$ intact for MQL', () => {
    expect(expandVariables('$$', giver)).toBe('$$');
    expect(expandVariables('$$:i', giver)).toBe('$$:i');
  });

  it('expands stored vars from giver.listVars()', () => {
    giver.setVar('weapon', 'rusty sword');
    expect(expandVariables('the $weapon', giver)).toBe('the rusty sword');
  });

  it('synthetic wins over a colliding stored var', () => {
    giver.setVar('me', 'foo');
    // listVars() filters declared settings, but `me` isn't declared
    // — still, a synthetic with the same name wins.
    expect(expandVariables('$me', giver)).toBe('me');
  });

  it('soft-warns and substitutes empty for unknown stored vars', () => {
    expect(expandVariables('look $nope here', giver)).toBe('look  here');
  });

  it('handles multiple substitutions in one string', () => {
    giver.setScope('library');
    giver.setVar('item', 'book');
    expect(expandVariables('$me looks at ${scope}.${item}', giver)).toBe(
      'me looks at library.book',
    );
  });
});

describe('lookupSyntheticVar', () => {
  it('finds vars declared on composed mixins', () => {
    const giver = makeStuff(() => new TestGiver());
    expect(lookupSyntheticVar(giver, 'scope')?.name).toBe('scope');
    expect(lookupSyntheticVar(giver, 'me')?.name).toBe('me');
    expect(lookupSyntheticVar(giver, 'here')?.name).toBe('here');
    expect(lookupSyntheticVar(giver, 'it')?.name).toBe('it');
  });

  it('returns null for unknown names', () => {
    const giver = makeStuff(() => new TestGiver());
    expect(lookupSyntheticVar(giver, 'nonexistent')).toBeNull();
  });

  it('returns null for $scope when the giver lacks FocusedMixin', () => {
    const npc = makeStuff(() => new NpcGiver());
    expect(lookupSyntheticVar(npc, 'scope')).toBeNull();
    // CommandGiverMixin alone still supplies $me.
    expect(lookupSyntheticVar(npc, 'me')?.name).toBe('me');
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
    const parsed = CommandLineApi.parsePipeline('say the $scope is empty').commands[0]!;
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
