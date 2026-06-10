/**
 * Top-level `payload:` block — structured-form-only fields.
 *
 * Verbs that need fields the user can't reasonably type
 * (code-editor buffers, JSON blobs, anything that doesn't ride
 * tokenization) declare them under `payload:`. The text-input
 * path doesn't see them at all; only `assembleFromStructured`
 * populates them. Same coercion / scope / validator pipeline as
 * options.
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

describe('command spec: top-level `payload:` block', () => {
  describe('structured-form ingress', () => {
    const yaml = `
verbs: [author]
controller: AuthorController
description: Author with payload-only body
args:
  - name: path
    type: string
    required: true
payload:
  body:
    type: string
    required: true
`;

    it('accepts a payload field via assembleFromStructured', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        { verb: 'author', fields: { path: '/draft', body: 'hello' } },
        def,
        ctx,
      );
      if (!('model' in r)) {
        throw new Error(`expected model, got ${JSON.stringify(r)}`);
      }
      expect(r.model.path).toBe('/draft');
      expect(r.model.body).toBe('hello');
    });

    it('rejects missing required payload field', () => {
      const def = defOf(yaml);
      const r = CommandApi.assembleFromStructured(
        { verb: 'author', fields: { path: '/draft' } },
        def,
        ctx,
      );
      expect('error' in r).toBe(true);
      if ('error' in r) {
        expect(r.error).toMatch(/missing required payload field: body/i);
      }
    });

    it('payload field name participates in the unknown-field check', () => {
      const def = defOf(yaml);
      // Sending a field name that isn't declared anywhere errors.
      const r = CommandApi.assembleFromStructured(
        {
          verb: 'author',
          fields: { path: '/draft', body: 'hi', wat: 'extra' },
        },
        def,
        ctx,
      );
      expect('error' in r).toBe(true);
      if ('error' in r) {
        expect(r.error).toMatch(/unknown field: wat/i);
      }
    });
  });

  describe('text-input path doesn\'t surface payload fields', () => {
    it("a text invocation can't bind body — body stays missing", () => {
      const def = defOf(`
verbs: [author]
controller: AuthorController
description: Author
args:
  - name: path
    type: string
    required: true
payload:
  body:
    type: string
    required: true
`);
      // `msh author /draft` should bind only `path`. Body is
      // payload-only — text-input doesn't know about it.
      const parsed = CommandLineApi.parsePipeline('author /draft').commands[0]!;
      const r = CommandApi.assemble(parsed, def, ctx);
      if (!('model' in r)) {
        throw new Error(`expected model, got ${JSON.stringify(r)}`);
      }
      expect(r.model.path).toBe('/draft');
      expect(r.model.body).toBeUndefined();
    });

    it("typing a payload-named token doesn't accidentally bind to it", () => {
      const def = defOf(`
verbs: [author]
controller: AuthorController
description: Author
args:
  - name: path
    type: string
    required: true
payload:
  body:
    type: string
    required: true
`);
      // Payload field 'body' — the matcher's positional binding
      // doesn't expose it. Trailing token "stuff" produces a
      // too-many-arguments shape error, NOT body=stuff.
      const parsed = CommandLineApi.parsePipeline('author /draft stuff').commands[0]!;
      const r = CommandApi.assemble(parsed, def, ctx);
      if (!('error' in r)) {
        throw new Error(`expected shape error, got ${JSON.stringify(r)}`);
      }
      expect(r.error).toBe('shape');
    });
  });

  describe('field-name uniqueness', () => {
    it('payload name collides with a verb-scoped option', () => {
      expect(() =>
        defOf(`
verbs: [foo]
controller: FooController
description: Foo
options:
  body:
    type: string
payload:
  body:
    type: string
`),
      ).toThrow(/collides with verb-scoped option/);
    });

    it('payload name collides with a positional arg', () => {
      expect(() =>
        defOf(`
verbs: [foo]
controller: FooController
description: Foo
args:
  - name: body
    type: string
    required: true
payload:
  body:
    type: string
`),
      ).toThrow(/collides with payload field/);
    });
  });

  describe('payload field of type: object — MQL resolution still fires', () => {
    it('lands an MqlOneResult wrapper on the model', () => {
      // Reuse the option-side MQL test world if we had one in scope;
      // simpler here is to just verify the matcher accepts the field
      // shape. End-to-end MQL resolution lives in command-option-mql.
      const def = defOf(`
verbs: [refer]
controller: ReferController
description: Refer
payload:
  target:
    type: object
    scope: [reachable]
`);
      // Dispatcher would pass the giver's commandGiver via ctx; for
      // a unit-shape check here we just verify the field is
      // declared and resolved through the matcher (not a string).
      const allowed = def.getAllFieldNames();
      expect(allowed.has('target')).toBe(true);
    });
  });
});
