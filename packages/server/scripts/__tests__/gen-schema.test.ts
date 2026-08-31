/**
 * gen-schema — determinism, and the two failures worth proving.
 *
 * The equivalence proof (that the emitted tables mean what the
 * hand-written ones meant) was a one-time diff against the pre-generation
 * tree and is recorded in the MR. What a test can hold forever is that
 * the generator is a FUNCTION of the docs: same input, same bytes.
 */

import { describe, it, expect } from 'vitest';
import {
  loadDocs,
  emitCollections,
  emitPolicy,
  emitReset,
} from '../gen-schema';
import { SchemaDoc } from '../../src/mud/lib/persistence/SchemaDoc';

const docs = loadDocs();

function fixture(overrides: Record<string, unknown>): SchemaDoc {
  return SchemaDoc.parse(
    {
      collection: 'widgets',
      owner: 'none',
      subsystem: 'persistence.md',
      summary: 'A fixture.',
      purpose: 'A fixture.',
      sandbox: 'pass',
      reset: 'wipe',
      ...overrides,
    },
    'widgets.yaml'
  );
}

describe('gen-schema', () => {
  it('reads every shipped doc', () => {
    expect(docs.length).toBeGreaterThan(40);
    expect(docs.map((d) => d.collection)).toContain('bank_ledger');
  });

  it('is deterministic — two runs produce identical bytes', () => {
    expect(emitCollections(docs)).toBe(emitCollections(docs));
    expect(emitPolicy(docs)).toBe(emitPolicy(docs));
    expect(emitReset(docs)).toBe(emitReset(docs));
  });

  it('emits one enum member per doc, in filename order', () => {
    const emitted = [...emitCollections(docs).matchAll(/^  (\w+) = '(\w+)',$/gm)];
    expect(emitted).toHaveLength(docs.length);
    expect(emitted.map((m) => m[2])).toEqual(
      [...docs.map((d) => d.collection)].sort()
    );
  });

  it('carries every doc into both policy tables', () => {
    const policy = emitPolicy(docs);
    const reset = emitReset(docs);
    for (const doc of docs) {
      const key = `[Collections.${SchemaDoc.enumKey(doc.collection)}]`;
      expect(policy).toContain(key);
      expect(reset).toContain(key);
    }
  });

  it('renders the sandbox verbs in their four shapes', () => {
    expect(emitPolicy([fixture({ sandbox: 'stamp' })])).toContain(
      "{ verb: 'stamp' }"
    );
    expect(
      emitPolicy([fixture({ sandbox: { verb: 'pass', mark: true } })])
    ).toContain("{ verb: 'pass', mark: true }");
    expect(
      emitPolicy([fixture({ sandbox: { verb: 'shadow', mode: 'skip' } })])
    ).toContain("{ verb: 'shadow', mode: 'skip' }");
    expect(emitPolicy([fixture({ sandbox: 'refuse' })])).toContain(
      "{ verb: 'refuse' }"
    );
  });

  it('an unknown sandbox verb fails at parse, before generation', () => {
    // ⚠ The generator never sees a bad verb: the parser is the gate, and
    // it is the same parser the runtime loader uses.
    expect(() => fixture({ sandbox: 'allow' })).toThrow(
      /unknown `sandbox` verb/
    );
  });

  it('an unknown reset keep derivation fails generation loudly', () => {
    // The parser refuses it first; assert generation also refuses a doc
    // that reached it some other way, because the emitter is what turns a
    // derivation name into an expression.
    const bad = {
      ...fixture({}),
      reset: { verb: 'wipe-except', keep: 'everything', because: 'x' },
    } as unknown as SchemaDoc;
    expect(() => emitReset([bad])).toThrow(/unknown reset keep derivation/);
  });

  it('emits the derived keep filter as an expression, not a frozen list', () => {
    // The whole point of the named derivation: the emitted table
    // references DECLARED_DOCUMENT_KINDS rather than copying it.
    const reset = emitReset(docs);
    expect(reset).toContain('DECLARED_DOCUMENT_KINDS');
    expect(reset).toContain(
      "import { DECLARED_DOCUMENT_KINDS } from '../document/DocumentKinds';"
    );
  });

  it('every generated file carries the do-not-edit banner', () => {
    for (const emitted of [
      emitCollections(docs),
      emitPolicy(docs),
      emitReset(docs),
    ]) {
      expect(emitted).toContain('GENERATED FILE — DO NOT EDIT');
      expect(emitted).toContain('pnpm gen:schema');
    }
  });
});
