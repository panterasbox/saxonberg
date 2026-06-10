/**
 * `type: 'struct'` field shape — structured-input round-trip,
 * inline-schema validation, custom-validator path, and text-input
 * rejection.
 *
 * Struct fields exist for content the client composes via a GUI
 * (code-editor buffer, form-field bag) that doesn't fit cleanly
 * through tokenized command-line input. The matcher coerces and
 * (optionally) JSON-Schema-validates the value at the structured-
 * form ingress; the verb's `validators:` array still fires
 * downstream like any other field.
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

describe("CommandApi — type: 'struct' field shape", () => {
  describe('structured-input ingress', () => {
    const yaml = `
verbs: [compose]
controller: ComposeController
description: Compose a structured authoring payload
args:
  - name: path
    type: string
    required: true
  - name: doc
    type: struct
    required: true
`;

    it('passes a plain object through onto the model', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        {
          verb: 'compose',
          fields: { path: '/draft/foo', doc: { title: 'hello', body: 'world' } },
        },
        def,
        ctx,
      );
      if (!('model' in r)) throw new Error(`expected model, got ${JSON.stringify(r)}`);
      expect(r.model.path).toBe('/draft/foo');
      expect(r.model.doc).toEqual({ title: 'hello', body: 'world' });
    });

    it('rejects non-object struct values', () => {
      const def = defOf(yaml);
      for (const bad of [null, 'string', 42, true, ['array']]) {
        const r = CommandApi.assembleFromStructured(
          { verb: 'compose', fields: { path: '/x', doc: bad } },
          def,
          ctx,
        );
        expect('error' in r).toBe(true);
      }
    });
  });

  describe('inline JSON Schema (ajv)', () => {
    const yaml = `
verbs: [compose]
controller: ComposeController
description: Compose with schema
args:
  - name: doc
    type: struct
    required: true
    schema:
      type: object
      required: [title]
      properties:
        title: { type: string, minLength: 1 }
        body:  { type: string }
      additionalProperties: false
`;

    it('accepts a value matching the schema', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        { verb: 'compose', fields: { doc: { title: 'ok', body: 'x' } } },
        def,
        ctx,
      );
      if (!('model' in r)) throw new Error(`expected model, got ${JSON.stringify(r)}`);
      expect(r.model.doc).toEqual({ title: 'ok', body: 'x' });
    });

    it('rejects a value missing a required property', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        { verb: 'compose', fields: { doc: { body: 'no title' } } },
        def,
        ctx,
      );
      expect('error' in r).toBe(true);
      if ('error' in r) expect(r.error).toMatch(/title/i);
    });

    it('rejects a value with the wrong property type', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        { verb: 'compose', fields: { doc: { title: 42 } } },
        def,
        ctx,
      );
      expect('error' in r).toBe(true);
    });

    it('rejects a value with extra properties when additionalProperties:false', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        { verb: 'compose', fields: { doc: { title: 'ok', wat: 'extra' } } },
        def,
        ctx,
      );
      expect('error' in r).toBe(true);
    });
  });

  describe('text-input rejection', () => {
    it('errors clearly when a struct positional appears in text input', () => {
      const def = defOf(`
verbs: [compose]
controller: ComposeController
description: Compose
args:
  - name: doc
    type: struct
    required: true
`);
      const parsed = CommandLineApi.parsePipeline('compose somevalue').commands[0]!;
      const r = CommandApi.assemble(parsed, def, ctx);
      if (!('error' in r) || !('summary' in r)) {
        throw new Error(`expected a summary-bearing error, got ${JSON.stringify(r)}`);
      }
      expect(r.summary).toMatch(/structured input/i);
    });

    it('errors clearly when a struct positional is required and absent from text input', () => {
      const def = defOf(`
verbs: [compose]
controller: ComposeController
description: Compose
args:
  - name: doc
    type: struct
    required: true
`);
      const parsed = CommandLineApi.parsePipeline('compose').commands[0]!;
      const r = CommandApi.assemble(parsed, def, ctx);
      if (!('error' in r) || !('summary' in r)) {
        throw new Error(`expected a summary-bearing error, got ${JSON.stringify(r)}`);
      }
      expect(r.summary).toMatch(/structured input/i);
    });

    it('text-input on a verb with no struct fields still works', () => {
      const def = defOf(`
verbs: [echo]
controller: EchoController
description: Echo
args:
  - name: msg
    type: string
    required: true
`);
      const parsed = CommandLineApi.parsePipeline('echo hello').commands[0]!;
      const r = CommandApi.assemble(parsed, def, ctx);
      if (!('model' in r)) throw new Error('expected model');
      expect(r.model.msg).toBe('hello');
    });
  });

  describe('struct option', () => {
    const yaml = `
verbs: [render]
controller: RenderController
description: Render
options:
  data:
    type: struct
    schema:
      type: object
      required: [seed]
      properties:
        seed: { type: number }
`;

    it('accepts a struct option via structured input', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        { verb: 'render', fields: { data: { seed: 42 } } },
        def,
        ctx,
      );
      if (!('model' in r)) throw new Error('expected model');
      expect(r.model.data).toEqual({ seed: 42 });
    });

    it('rejects a struct option from text input (--data ...)', () => {
      const def = defOf(yaml);
      const parsed = CommandLineApi.parsePipeline('render --data=foo').commands[0]!;
      const r = CommandApi.assemble(parsed, def, ctx);
      if (!('error' in r) || !('summary' in r)) {
        throw new Error(`expected a summary-bearing error, got ${JSON.stringify(r)}`);
      }
      expect(r.summary).toMatch(/structured input/i);
    });
  });
});
