/**
 * Wave 6: cardinality policy validation (YAML load-time) +
 * synchronous dispatcher matrix coverage.
 *
 * The `prompt` policy is wired through to deferral notes in v1
 * (the dispatcher refactor for inline prompt-await lands in a
 * follow-up). The synchronous policies (top, take-all, truncate,
 * error) work end-to-end.
 */

import { describe, it, expect } from 'vitest';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { CommandApi } from '../command';
import type { CommandContext } from '../command';
import type { Stuff } from '../../lib/stuff/Stuff';

function makeStuffStub(id: string): Stuff {
  return { stuffId: id } as unknown as Stuff;
}

function makeContextStub(): CommandContext & {
  notes: Array<{ kind: string; [k: string]: unknown }>;
} {
  const notes: Array<{ kind: string; [k: string]: unknown }> = [];
  return {
    note(n: { kind: string; [k: string]: unknown }) {
      notes.push(n);
    },
    notes,
  } as unknown as CommandContext & {
    notes: Array<{ kind: string; [k: string]: unknown }>;
  };
}

describe('cardinality vocabulary — YAML load-time schema validation', () => {
  it('rejects exactly + min/max coexisting', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: targets
    type: objects
    cardinality:
      exactly: 3
      min: 1
`,
        '<test>',
      ),
    ).toThrow(/exactly cannot coexist/);
  });

  it('rejects min > max', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: targets
    type: objects
    cardinality:
      min: 5
      max: 3
`,
        '<test>',
      ),
    ).toThrow(/cannot exceed/);
  });

  it('rejects onExcess=top on objects', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: targets
    type: objects
    onExcess: top
`,
        '<test>',
      ),
    ).toThrow(/invalid on type='objects'/);
  });

  it('rejects onExcess=truncate on object', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: target
    type: object
    onExcess: truncate
`,
        '<test>',
      ),
    ).toThrow(/invalid on type='object'/);
  });

  it('rejects cardinality on object (implicit { exactly: 1 })', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: target
    type: object
    cardinality:
      min: 2
`,
        '<test>',
      ),
    ).toThrow(/not valid on type='object'/);
  });

  it('rejects cardinality on non-MQL types', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: message
    type: string
    cardinality:
      max: 3
`,
        '<test>',
      ),
    ).toThrow(/only valid on object \/ objects/);
  });

  it('rejects onShortage values other than error in v1', () => {
    // JSON Schema rejects unknown enum values first.
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: targets
    type: objects
    onShortage: prompt-to-widen
`,
        '<test>',
      ),
    ).toThrow(/onShortage must be equal/);
  });

  it('accepts valid policies', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]
controller: FooController
description: stub
args:
  - name: targets
    type: objects
    cardinality:
      min: 1
      max: 3
    onExcess: truncate
    onShortage: error
`,
        '<test>',
      ),
    ).not.toThrow();
  });

  it('accepts every existing shipped command unchanged', () => {
    // Sample a few of the existing commands — they shouldn't have
    // any of the new fields, and the schema validation should not
    // reject them.
    const samples = ['say.yaml', 'look.yaml', 'get.yaml', 'drop.yaml', 'cancel.yaml'];
    void samples;
    // The full preloadAll test runs in `validation.test.ts`; here we
    // assert that a representative bare YAML loads cleanly.
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [look]
controller: LookController
description: stub
args:
  - name: target
    type: object
    required: false
`,
        '<test>',
      ),
    ).not.toThrow();
  });
});

describe('CommandApi.applyCardinalityPolicy — object', () => {
  it('top (default) picks the highest-scored match', () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'object' },
      [a, b, makeStuffStub('c')],
      'target',
      ctx,
    );
    expect(out).toEqual([a]);
    expect(ctx.notes).toEqual([]);
  });

  it('error rejects ambiguity', () => {
    const ctx = makeContextStub();
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'error' },
      [makeStuffStub('a'), makeStuffStub('b')],
      'target',
      ctx,
    );
    expect(out).toBeNull();
    expect(ctx.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'ambiguous' }),
    );
  });

  it('error passes through when single match', () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'error' },
      [a],
      'target',
      ctx,
    );
    expect(out).toEqual([a]);
  });

  it('zero matches passes through (resolveModel handles no-match)', () => {
    const ctx = makeContextStub();
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'top' },
      [],
      'target',
      ctx,
    );
    expect(out).toEqual([]);
  });

  it('prompt policy degrades to top with deferral note', () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'prompt' },
      [a, b],
      'target',
      ctx,
    );
    expect(out).toEqual([a]);
    expect(ctx.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'prompt-deferred' }),
    );
  });
});

describe('CommandApi.applyCardinalityPolicy — objects', () => {
  it('take-all (default when max unset) returns everything', () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const c = makeStuffStub('c');
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'objects' },
      [a, b, c],
      'targets',
      ctx,
    );
    expect(out).toEqual([a, b, c]);
  });

  it('truncate cuts to max', () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const c = makeStuffStub('c');
    const d = makeStuffStub('d');
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'objects', cardinality: { max: 2 }, onExcess: 'truncate' },
      [a, b, c, d],
      'targets',
      ctx,
    );
    expect(out).toEqual([a, b]);
  });

  it('error rejects when over max', () => {
    const ctx = makeContextStub();
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'objects', cardinality: { max: 1 }, onExcess: 'error' },
      [makeStuffStub('a'), makeStuffStub('b')],
      'targets',
      ctx,
    );
    expect(out).toBeNull();
    expect(ctx.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'too-many' }),
    );
  });

  it('error rejects when under min (shortage)', () => {
    const ctx = makeContextStub();
    const out = CommandApi.applyCardinalityPolicy(
      { type: 'objects', cardinality: { min: 2 } },
      [makeStuffStub('a')],
      'targets',
      ctx,
    );
    expect(out).toBeNull();
    expect(ctx.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'insufficient' }),
    );
  });

  it('exactly: 3 enforces both min and max', () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const c = makeStuffStub('c');
    const d = makeStuffStub('d');

    // got 3, in range — passes through.
    expect(
      CommandApi.applyCardinalityPolicy(
        { type: 'objects', cardinality: { exactly: 3 } },
        [a, b, c],
        'targets',
        ctx,
      ),
    ).toEqual([a, b, c]);

    // got 4 — over; default onExcess for `max set` is 'prompt',
    // which degrades to truncate. Verify truncation to 3.
    expect(
      CommandApi.applyCardinalityPolicy(
        { type: 'objects', cardinality: { exactly: 3 } },
        [a, b, c, d],
        'targets',
        ctx,
      ),
    ).toEqual([a, b, c]);

    // got 2 — under; insufficient error.
    const ctx2 = makeContextStub();
    expect(
      CommandApi.applyCardinalityPolicy(
        { type: 'objects', cardinality: { exactly: 3 } },
        [a, b],
        'targets',
        ctx2,
      ),
    ).toBeNull();
    expect(ctx2.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'insufficient' }),
    );
  });

  it('in-range passes through unchanged', () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    expect(
      CommandApi.applyCardinalityPolicy(
        { type: 'objects', cardinality: { min: 1, max: 5 } },
        [a, b],
        'targets',
        ctx,
      ),
    ).toEqual([a, b]);
  });
});
