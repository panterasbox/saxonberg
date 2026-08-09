/**
 * Async command surface — load-time (`CommandDefinition.async` + the
 * reserved-flag-name guard) and parse-time (`CommandApi.assemble`
 * stripping `--async` / `--sync` as reserved framework flags).
 *
 * These don't run controllers; the end-to-end detach behaviour lives in
 * `mud/lib/command/__tests__/CommandGiver.async.test.ts`.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../command';
import { CommandLineApi } from '../command-line';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Location from '../../lib/stuff/Location';
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

const LOOK = `
verbs: [look]
controller: LookController
description: Look
args:
  - name: target
    type: string
    required: false
`;

const ZAP = `
verbs: [zap]
controller: ZapController
description: Zap
`;

describe('CommandDefinition.async (load-time)', () => {
  it('defaults to false when the field is absent', () => {
    expect(defOf(LOOK).async).toBe(false);
  });

  it('reflects async: true', () => {
    expect(defOf(`${LOOK}async: true`).async).toBe(true);
  });

  it('reflects async: false', () => {
    expect(defOf(`${LOOK}async: false`).async).toBe(false);
  });

  it('rejects a non-boolean async value at load (schema)', () => {
    expect(() => defOf(`${LOOK}async: "yes"`)).toThrow(/Schema validation/);
  });
});

describe('reserved-flag-name guard (load-time)', () => {
  it('rejects an option named async', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
options:
  async:
    type: boolean
`)
    ).toThrow(/reserved framework flag/);
  });

  it('rejects an option whose field is sync', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
options:
  fast:
    type: boolean
    field: sync
`)
    ).toThrow(/reserved framework flag/);
  });

  it('rejects a positional arg named sync', () => {
    expect(() =>
      defOf(`
verbs: [foo]
controller: FooController
description: Foo
args:
  - name: sync
    type: string
    required: false
`)
    ).toThrow(/reserved framework flag/);
  });
});

describe('CommandApi.assemble — reserved --async / --sync', () => {
  it('strips --async and surfaces reservedAsync=async', () => {
    const r = assembleText('look --async', defOf(LOOK));
    expect('model' in r && r.reservedAsync).toBe('async');
  });

  it('strips --sync and surfaces reservedAsync=sync', () => {
    const r = assembleText('look --sync', defOf(LOOK));
    expect('model' in r && r.reservedAsync).toBe('sync');
  });

  it('leaves reservedAsync undefined with no flag', () => {
    const r = assembleText('look sword', defOf(LOOK));
    expect('model' in r && r.reservedAsync).toBeUndefined();
  });

  it('binds a positional alongside the reserved flag', () => {
    const r = assembleText('look --async sword', defOf(LOOK));
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model).toEqual({ target: 'sword' });
      expect(r.reservedAsync).toBe('async');
    }
  });

  it('accepts the flag on a verb that declares no options', () => {
    const r = assembleText('zap --async', defOf(ZAP));
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model).toEqual({});
      expect(r.reservedAsync).toBe('async');
    }
  });

  it('last flag wins (--sync then --async → async)', () => {
    const r = assembleText('look --sync --async', defOf(LOOK));
    expect('model' in r && r.reservedAsync).toBe('async');
  });

  it('does not intercept --async past the -- stop-options boundary', () => {
    const r = assembleText('look -- --async', defOf(LOOK));
    expect('model' in r && r.reservedAsync).toBeUndefined();
  });
});
