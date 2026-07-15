/**
 * Schema-validation tests — every YAML body is checked against
 * `cmd/command.schema.json` before construction. Authoring mistakes
 * (typos, wrong shapes) surface at load time with the Ajv error
 * trail in the message.
 */

import { describe, it, expect } from 'vitest';
import { CommandDefinition } from '../CommandDefinition';

function load(yaml: string): CommandDefinition {
  return CommandDefinition.fromYaml(yaml, '<test>');
}

describe('CommandDefinition schema validation', () => {
  it('accepts a minimal flat-syntax command (zero args)', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
`)
    ).not.toThrow();
  });

  it('accepts a flat command with args', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
args:
  - name: target
    type: string
`)
    ).not.toThrow();
  });

  it('accepts a subcommanded command', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
subcommands:
  list:
    description: list things
`)
    ).not.toThrow();
  });

  it('rejects a YAML missing required `verbs`', () => {
    expect(() =>
      load(`
controller: TestController
description: ok
`)
    ).toThrow(/Schema validation failed/);
  });

  it('rejects an unknown top-level property', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
bogus: value
`)
    ).toThrow(/Schema validation failed/);
  });

  it('rejects a YAML with both args and subcommands', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
args:
  - name: x
    type: string
subcommands:
  list:
    description: list
`)
    ).toThrow(/Schema validation failed/);
  });

  it('rejects unknown property on a positional arg', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
args:
  - name: target
    type: object
    searchOrder: [inventory]
`)
    ).toThrow(/Schema validation failed/);
  });

  it('rejects a missing `name` on a positional arg', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
args:
  - type: string
    required: true
`)
    ).toThrow(/Schema validation failed/);
  });

  it('rejects a malformed validator spec (bare name)', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
args:
  - name: target
    type: object
    validators:
      - mustBeVisible
`)
    ).toThrow(/Schema validation failed/);
  });

  it('accepts validators with absolute and relative path specs', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
args:
  - name: target
    type: object
    validators:
      - /lib/command/validators/mustBeVisible
      - ./local
      - ../shared/foo
`)
    ).not.toThrow();
  });

  it('rejects a multi-character `short` on an option', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
options:
  json:
    short: jsn
    type: boolean
`)
    ).toThrow(/Schema validation failed/);
  });

  it('rejects an arg name that is not a valid identifier', () => {
    expect(() =>
      load(`
verbs: [test]
controller: TestController
description: ok
args:
  - name: 'has spaces'
    type: string
`)
    ).toThrow(/Schema validation failed/);
  });
});

describe('CommandDefinition Option E (per-subcommand controller)', () => {
  it('accepts a subcommand with its own `controller:` field', () => {
    expect(() =>
      load(`
verbs: [analyze]
description: ok
subcommands:
  light:
    controller: AnalyzeLightController
    description: light
  chemistry:
    controller: AnalyzeChemistryController
    description: chem
`)
    ).not.toThrow();
  });

  it('controllerForSubcommand returns the per-subcommand controller', () => {
    const cmd = load(`
verbs: [analyze]
description: ok
subcommands:
  light:
    controller: /obj/command/analyze/AnalyzeLightController
    description: light
`);
    // Absolute controller values resolve to themselves.
    expect(cmd.controllerForSubcommand('light')).toBe(
      '/obj/command/analyze/AnalyzeLightController'
    );
    expect(cmd.controller).toBeUndefined();
  });

  it('controllerForSubcommand falls back to verb-level controller', () => {
    const cmd = load(`
verbs: [settings]
controller: /obj/command/shell/SettingsController
description: ok
subcommands:
  list:
    description: list
  set:
    description: set
`);
    expect(cmd.controllerForSubcommand('list')).toBe(
      '/obj/command/shell/SettingsController'
    );
    expect(cmd.controllerForSubcommand('set')).toBe(
      '/obj/command/shell/SettingsController'
    );
  });

  it('per-subcommand controller wins when both are declared', () => {
    const cmd = load(`
verbs: [test]
controller: /obj/command/test/VerbLevel
description: ok
subcommands:
  fast:
    controller: /obj/command/test/SubFast
    description: fast
  slow:
    description: slow
`);
    expect(cmd.controllerForSubcommand('fast')).toBe(
      '/obj/command/test/SubFast'
    );
    expect(cmd.controllerForSubcommand('slow')).toBe(
      '/obj/command/test/VerbLevel'
    );
  });

  it('rejects a verb with no controller and no subcommands', () => {
    expect(() =>
      load(`
verbs: [bogus]
description: ok
`)
    ).toThrow(/must specify a controller/);
  });

  it('rejects a verb with subcommands that omit per-subcommand controller and no verb-level controller', () => {
    expect(() =>
      load(`
verbs: [bogus]
description: ok
subcommands:
  one:
    description: one
`)
    ).toThrow(/do not declare a per-subcommand controller/);
  });

  it('still requires verbs even with per-subcommand controllers', () => {
    expect(() =>
      load(`
description: ok
subcommands:
  light:
    controller: X
    description: light
`)
    ).toThrow(/Schema validation failed/);
  });
});
