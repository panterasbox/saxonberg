/**
 * Structured-form ingress tests.
 *
 * Round-trip parity: identical CommandModel from text vs structured.
 * Type-mismatch detection and unknown-field rejection.
 */

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

describe('CommandApi.assembleFromStructured', () => {
  const playerYaml = `
verbs: [player]
controller: PlayerController
description: Player
subcommands:
  name:
    description: Set name
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

  it('builds a CommandModel from structured input', () => {
    const def = defOf(playerYaml);
    const r = CommandApi.assembleFromStructured(
      {
        verb: 'player',
        subcommand: 'name',
        fields: { name: 'Alice', surname: 'Smith' },
        raw: 'player name Alice Smith',
      },
      def,
      ctx
    );
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model.subcommand).toBe('name');
      expect(r.model).toMatchObject({ name: 'Alice', surname: 'Smith' });
    }
  });

  it('round-trips text vs structured to the same fields', () => {
    const def = defOf(playerYaml);
    const text = CommandApi.assemble(
      CommandLineApi.parsePipeline('player name Alice Smith').commands[0]!,
      def,
      ctx
    );
    const structured = CommandApi.assembleFromStructured(
      {
        verb: 'player',
        subcommand: 'name',
        fields: { name: 'Alice', surname: 'Smith' },
      },
      def,
      ctx
    );
    if ('model' in text && 'model' in structured) {
      expect(text.model).toEqual(structured.model);
    } else {
      throw new Error('both should be models');
    }
  });

  it('rejects unknown field keys', () => {
    const def = defOf(playerYaml);
    const r = CommandApi.assembleFromStructured(
      { verb: 'player', subcommand: 'name', fields: { bogus: 'x' } },
      def,
      ctx
    );
    expect('error' in r).toBe(true);
  });

  it('rejects unknown subcommand', () => {
    const def = defOf(playerYaml);
    const r = CommandApi.assembleFromStructured(
      { verb: 'player', subcommand: 'nope', fields: {} },
      def,
      ctx
    );
    expect('error' in r).toBe(true);
  });

  it('rejects type mismatch (string field given object)', () => {
    const def = defOf(playerYaml);
    const r = CommandApi.assembleFromStructured(
      {
        verb: 'player',
        subcommand: 'name',
        fields: { name: { foo: 'bar' } },
      },
      def,
      ctx
    );
    expect('error' in r).toBe(true);
  });

  it('rejects type mismatch (number field given string)', () => {
    const def = defOf(`
verbs: [server]
controller: ServerController
description: Server
options:
  port:
    type: number
`);
    const r = CommandApi.assembleFromStructured(
      { verb: 'server', fields: { port: 'eighty' } },
      def,
      ctx
    );
    expect('error' in r).toBe(true);
  });

  it('accepts pre-resolved object value for type:object field', () => {
    const def = defOf(`
verbs: [look]
controller: LookController
description: Look
args:
  - name: target
    type: object
    required: true
`);
    const fakeStuff = { stuffId: 'stuff:abc' } as unknown;
    const r = CommandApi.assembleFromStructured(
      { verb: 'look', fields: { target: fakeStuff } },
      def,
      ctx
    );
    if ('model' in r) {
      expect(r.model.target).toBe(fakeStuff);
    } else {
      throw new Error('expected model');
    }
  });

  it('applies option defaults', () => {
    const def = defOf(`
verbs: [foo]
controller: FooController
description: Foo
options:
  loud:
    type: boolean
    default: false
`);
    const r = CommandApi.assembleFromStructured(
      { verb: 'foo', fields: {} },
      def,
      ctx
    );
    if ('model' in r) {
      expect(r.model).toMatchObject({ loud: false });
    }
  });

  it('falls through verb-scope options into structured fields', () => {
    const def = defOf(`
verbs: [foo]
controller: FooController
description: Foo
options:
  loud:
    type: boolean
`);
    const r = CommandApi.assembleFromStructured(
      { verb: 'foo', fields: { loud: true } },
      def,
      ctx
    );
    if ('model' in r) {
      expect(r.model).toMatchObject({ loud: true });
    }
  });
});
