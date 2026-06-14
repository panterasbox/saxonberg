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
 * v1 ships exactly one synthetic var: `$focus` on `FocusedMixin`. The
 * MQL pronoun words (`me`, `here`, `it`/`him`/`her`/`them`) are
 * resolver keywords, NOT shell vars — these tests do not exercise
 * `$me` / `$here` / etc.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import { ShellLogic } from '../../obj/api/ShellLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
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
import CartesianLocation from '../../lib/location/CartesianLocation';

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

  it('leaves text without sigils untouched', async () => {
    expect(ShellApi.expandVariables('hello world', giver)).toBe('hello world');
    expect(ShellApi.expandVariables('', giver)).toBe('');
  });

  it('expands $focus to the giver focus', async () => {
    expect(ShellApi.expandVariables('$focus', giver)).toBe('here');
    giver.setFocus('inventory, here');
    expect(ShellApi.expandVariables('look $focus', giver)).toBe(
      'look inventory, here',
    );
  });

  it('expands ${X} bracketed form, lets it abut other characters', async () => {
    giver.setFocus('library');
    expect(ShellApi.expandVariables('${focus}.book', giver)).toBe(
      'library.book',
    );
  });

  it('leaves $$ intact for MQL', async () => {
    expect(ShellApi.expandVariables('$$', giver)).toBe('$$');
    expect(ShellApi.expandVariables('$$:i', giver)).toBe('$$:i');
  });

  it('expands stored vars from giver.listVars()', async () => {
    giver.setVar('weapon', 'rusty sword');
    expect(ShellApi.expandVariables('the $weapon', giver)).toBe(
      'the rusty sword',
    );
  });

  it('synthetic wins over a colliding stored var', async () => {
    giver.setFocus('here');
    giver.setVar('focus', 'foo');
    // `var set focus foo` does not shadow the synthetic $focus —
    // documented names are stable.
    expect(ShellApi.expandVariables('$focus', giver)).toBe('here');
  });

  it('substitutes empty for unknown stored vars', async () => {
    expect(ShellApi.expandVariables('look $nope here', giver)).toBe(
      'look  here',
    );
  });

  it('handles multiple substitutions in one string', async () => {
    giver.setFocus('library');
    giver.setVar('item', 'book');
    expect(
      ShellApi.expandVariables('drilled into ${focus}.${item}', giver),
    ).toBe('drilled into library.book');
  });
});

describe('ShellApi.lookupSyntheticVar', () => {
  it('finds $focus on FocusedMixin', async () => {
    const giver = makeStuff(() => new TestGiver());
    expect(ShellApi.lookupSyntheticVar(giver, 'focus')?.name).toBe('focus');
  });

  it('returns null for unknown names', async () => {
    const giver = makeStuff(() => new TestGiver());
    expect(ShellApi.lookupSyntheticVar(giver, 'nonexistent')).toBeNull();
  });

  it('returns null for $focus when the giver lacks FocusedMixin', async () => {
    const npc = makeStuff(() => new NpcGiver());
    expect(ShellApi.lookupSyntheticVar(npc, 'focus')).toBeNull();
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

  it('expands $focus into the bound positional', async () => {
    giver.setFocus('library');
    const parsed = CommandLineApi.parsePipeline('look $focus').commands[0]!;
    const built = CommandApi.assemble(parsed, lookCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + JSON.stringify(built));
    expect(built.model.target).toBe('library');
  });

  it('expands inside a quoted greedy slice', async () => {
    giver.setFocus('plaza');
    const parsed = CommandLineApi.parsePipeline(
      'say the $focus is empty',
    ).commands[0]!;
    const built = CommandApi.assemble(parsed, sayCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + JSON.stringify(built));
    expect(built.model.words).toBe('the plaza is empty');
  });

  it('skips expansion when shell.interpolate-vars is false', async () => {
    giver.setSetting('shell.interpolate-vars', false, giver);
    const parsed = CommandLineApi.parsePipeline('look $focus').commands[0]!;
    const built = CommandApi.assemble(parsed, lookCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + JSON.stringify(built));
    // Untouched — the literal `$focus` flows to MQL.
    expect(built.model.target).toBe('$focus');
  });

  it('skips expansion when the giver lacks EnvironmentMixin', async () => {
    const npc = makeStuff(() => new NpcGiver());
    ContainmentApi.move(npc, location);
    const parsed = CommandLineApi.parsePipeline('look $focus').commands[0]!;
    const built = CommandApi.assemble(parsed, lookCmd(), {
      commandGiver: npc as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + JSON.stringify(built));
    expect(built.model.target).toBe('$focus');
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
        '    default: "$focus"',
      ].join('\n'),
      '<test>',
    );
  }

  function giveCmd(): CommandDefinition {
    // Two positionals: `gift` (default $focus) and `recipient`
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
        '    default: "$focus"',
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

  it('fills bare `look` from default: $focus, expands the default', async () => {
    giver.setFocus('here');
    const parsed = CommandLineApi.parsePipeline('look').commands[0]!;
    const built = CommandApi.assemble(parsed, lookWithDefault(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + JSON.stringify(built));
    expect(built.model.target).toBe('here');
  });

  it('skips later-preposition tokens via lookahead and defaults the gap', async () => {
    // `give to bob` — `to` belongs to `recipient`, so `gift`
    // defaults to `$focus` (= "here") and `recipient` consumes `to`
    // and binds `bob`.
    const parsed = CommandLineApi.parsePipeline('give to bob').commands[0]!;
    const built = CommandApi.assemble(parsed, giveCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + JSON.stringify(built));
    expect(built.model.gift).toBe('here');
    expect(built.model.recipient).toBe('bob');
  });

  it('defaults both fields on bare invocation', async () => {
    const parsed = CommandLineApi.parsePipeline('give').commands[0]!;
    const built = CommandApi.assemble(parsed, giveCmd(), {
      commandGiver: giver as never,
      location: location as never,
    });
    if ('error' in built) throw new Error('assemble failed: ' + JSON.stringify(built));
    expect(built.model.gift).toBe('here');
    expect(built.model.recipient).toBe('me');
  });
});

describe('CommandApi.resolveAndValidate — YAML scope[] fallback', () => {
  // The fallback chain lives on the YAML's scope array. A drilled
  // player typing `look chair` against `scope: ['$focus', 'inventory,
  // here']` searches the focus first, then the room — without the
  // implicit player-focus-priority that earlier iterations baked
  // into the dispatcher.
  // Coverage of the actual fallback resolution lives in
  // command-pronoun.test.ts (drill-fallback case) since it needs the
  // full Stuff world fixture.

  it('parses scope as a string[] from YAML, normalising bare strings', async () => {
    const arrayForm = CommandDefinition.fromYaml(
      [
        'verbs: [look]',
        'controller: LookController',
        'description: examine',
        'args:',
        '  - name: target',
        '    type: object',
        '    required: false',
        '    scope: ["$focus", "inventory, here"]',
      ].join('\n'),
      '<test>',
    );
    expect(arrayForm.args[0]!.scope).toEqual(['$focus', 'inventory, here']);

    // Bare-string YAML is normalised to a singleton array at
    // CommandDefinition construction so downstream code doesn't
    // branch on Array.isArray.
    const stringForm = CommandDefinition.fromYaml(
      [
        'verbs: [look]',
        'controller: LookController',
        'description: examine',
        'args:',
        '  - name: target',
        '    type: object',
        '    required: false',
        '    scope: "inventory, here"',
      ].join('\n'),
      '<test>',
    );
    expect(stringForm.args[0]!.scope).toEqual(['inventory, here']);
  });
});

describe('ShellLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/shell once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    const giver = makeStuff(() => new TestGiver());
    ShellApi.expandVariables('hello', giver);
    const logic = StuffApi.findByTemplatePath('/obj/api/shell');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-ShellApi caller', () => {
    const logic = makeStuffAtPath(() => new ShellLogic(), '/obj/api/shell');
    expect(StuffApi.findByTemplatePath('/obj/api/shell')).toBe(logic);
    // The test module is not `mud/api/shell#ShellApi` nor the singleton
    // itself; the FromModule gate on the logic's own methods denies the
    // call.
    const giver = makeStuff(() => new TestGiver());
    expect(() => logic.expandVariables('hello', giver)).toThrow(SecurityError);
  });
});
