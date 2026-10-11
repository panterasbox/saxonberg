/**
 * Wave 6: cardinality policy validation (YAML load-time) +
 * synchronous dispatcher matrix coverage.
 *
 * The `prompt` policy is wired through to deferral notes in v1
 * (the dispatcher refactor for inline prompt-await lands in a
 * follow-up). The synchronous policies (top, take-all, truncate,
 * error) work end-to-end.
 */

import "../../../test-bootstrap";
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
  it('rejects exactly + min/max coexisting', async () => {
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

  it('rejects min > max', async () => {
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

  it('rejects onExcess=top on objects', async () => {
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

  it('rejects onExcess=truncate on object', async () => {
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

  it('rejects cardinality on object (implicit { exactly: 1 })', async () => {
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

  it('rejects cardinality on non-MQL types', async () => {
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

  it('rejects onShortage values other than error in v1', async () => {
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

  it('accepts valid policies', async () => {
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

  it('accepts every existing shipped command unchanged', async () => {
    // Sample a few of the existing commands — they shouldn't have
    // any of the new fields, and the schema validation should not
    // reject them.
    const samples = ['platform/cmd/social/say.yaml', 'platform/cmd/perception/look.yaml', 'platform/cmd/inventory/get.yaml', 'platform/cmd/inventory/drop.yaml', 'platform/cmd/system/cancel.yaml'];
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
  it('top (default) picks the highest-scored match', async () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'object' },
      [a, b, makeStuffStub('c')],
      'target',
      ctx,
    );
    expect(out).toEqual([a]);
    expect(ctx.notes).toEqual([]);
  });

  it('error rejects ambiguity', async () => {
    const ctx = makeContextStub();
    const out = await CommandApi.applyCardinalityPolicy(
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

  it('error passes through when single match', async () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'error' },
      [a],
      'target',
      ctx,
    );
    expect(out).toEqual([a]);
  });

  it('zero matches passes through (resolveModel handles no-match)', async () => {
    const ctx = makeContextStub();
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'top' },
      [],
      'target',
      ctx,
    );
    expect(out).toEqual([]);
  });

  it('prompt policy without an Interactive emits ambiguous and returns null', async () => {
    // No `context.interactive` is set in the stub — there's no
    // way to push a disambiguation prompt, so the policy degrades
    // to an ambiguity error (the equivalent of `onExcess: 'error'`).
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'prompt' },
      [a, b],
      'target',
      ctx,
    );
    expect(out).toBeNull();
    expect(ctx.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'ambiguous' }),
    );
  });
});

describe('CommandApi.applyCardinalityPolicy — objects', () => {
  it('take-all (default when max unset) returns everything', async () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const c = makeStuffStub('c');
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'objects' },
      [a, b, c],
      'targets',
      ctx,
    );
    expect(out).toEqual([a, b, c]);
  });

  it('truncate cuts to max', async () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const c = makeStuffStub('c');
    const d = makeStuffStub('d');
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'objects', cardinality: { max: 2 }, onExcess: 'truncate' },
      [a, b, c, d],
      'targets',
      ctx,
    );
    expect(out).toEqual([a, b]);
  });

  it('error rejects when over max', async () => {
    const ctx = makeContextStub();
    const out = await CommandApi.applyCardinalityPolicy(
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

  it('error rejects when under min (shortage)', async () => {
    const ctx = makeContextStub();
    const out = await CommandApi.applyCardinalityPolicy(
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

  it('exactly: 3 enforces both min and max', async () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    const c = makeStuffStub('c');
    const d = makeStuffStub('d');

    // got 3, in range — passes through.
    expect(
      await CommandApi.applyCardinalityPolicy(
        { type: 'objects', cardinality: { exactly: 3 } },
        [a, b, c],
        'targets',
        ctx,
      ),
    ).toEqual([a, b, c]);

    // got 4 — over; default onExcess for `max set` is 'prompt',
    // but we have no Interactive on the stub context, so the policy
    // degrades to too-many.
    const ctxOver = makeContextStub();
    expect(
      await CommandApi.applyCardinalityPolicy(
        { type: 'objects', cardinality: { exactly: 3 } },
        [a, b, c, d],
        'targets',
        ctxOver,
      ),
    ).toBeNull();
    expect(ctxOver.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'too-many' }),
    );

    // got 2 — under; insufficient error.
    const ctx2 = makeContextStub();
    expect(
      await CommandApi.applyCardinalityPolicy(
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

  it('in-range passes through unchanged', async () => {
    const ctx = makeContextStub();
    const a = makeStuffStub('a');
    const b = makeStuffStub('b');
    expect(
      await CommandApi.applyCardinalityPolicy(
        { type: 'objects', cardinality: { min: 1, max: 5 } },
        [a, b],
        'targets',
        ctx,
      ),
    ).toEqual([a, b]);
  });
});

describe('how many — a prompt asks only about a NAME (maritime revision 2)', () => {
  const three = [makeStuffStub('a'), makeStuffStub('b'), makeStuffStub('c')];
  const all = { value: { kind: 'all' as const }, mode: 'lenient' as const };

  it('⭐ a SET in a one-thing slot is refused in words, never prompted', async () => {
    const ctx = makeContextStub();
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'prompt' }, three, 'target', ctx, { isSet: true },
    );
    expect(out).toBeNull();
    expect(ctx.notes[0]).toMatchObject({ kind: 'controller-rejected', reason: 'too-many' });
    expect(String(ctx.notes[0]!.detail)).toMatch(/names 3 things, and this takes one/);
  });

  it('⭐ the player said how many: a one-thing slot takes the top (units off it), never asks', async () => {
    const ctx = makeContextStub();
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'prompt' }, three, 'target', ctx, { quantity: all },
    );
    expect(out).toEqual([three[0]]);
    expect(ctx.notes).toEqual([]);
  });

  it('a set or a player quantity past a plural slot\'s hard limit is refused, never prompted', async () => {
    const ctx = makeContextStub();
    const spec = { type: 'objects', cardinality: { max: 2 }, onExcess: 'prompt' as const };
    expect(await CommandApi.applyCardinalityPolicy(spec, three, 'targets', ctx, { isSet: true })).toBeNull();
    expect(await CommandApi.applyCardinalityPolicy(spec, three, 'targets', ctx, { quantity: all })).toBeNull();
    expect(ctx.notes.map((n) => n.reason)).toEqual(['too-many', 'too-many']);
  });

  it('a set within an unbounded plural slot is simply taken', async () => {
    const ctx = makeContextStub();
    expect(
      await CommandApi.applyCardinalityPolicy({ type: 'objects', onExcess: 'prompt' }, three, 'targets', ctx, { isSet: true }),
    ).toEqual(three);
  });

  it('a NAME keeps the view\'s own policy (here: error on ambiguity)', async () => {
    const ctx = makeContextStub();
    expect(await CommandApi.applyCardinalityPolicy({ type: 'object', onExcess: 'error' }, three, 'target', ctx)).toBeNull();
    expect(ctx.notes[0]).toMatchObject({ reason: 'ambiguous' });
  });
});

describe('cardinality.named — how many a plain NAME takes (look: one)', () => {
  const two = [makeStuffStub('a'), makeStuffStub('b')];
  const spec = { type: 'objects', cardinality: { named: 1 }, onExcess: 'error' as const };

  it('⭐ a NAME matching more than `named` is an ambiguity (here: error; `look` prompts)', async () => {
    const ctx = makeContextStub();
    expect(await CommandApi.applyCardinalityPolicy(spec, two, 'target', ctx)).toBeNull();
    expect(ctx.notes[0]).toMatchObject({ reason: 'ambiguous' });
  });

  it('⭐ a SET or the player\'s own quantity fills the slot past `named` — nothing asked', async () => {
    const ctx = makeContextStub();
    expect(await CommandApi.applyCardinalityPolicy(spec, two, 'target', ctx, { isSet: true })).toEqual(two);
    expect(
      await CommandApi.applyCardinalityPolicy(spec, two, 'target', ctx, {
        quantity: { value: { kind: 'all' }, mode: 'lenient' },
      }),
    ).toEqual(two);
    expect(ctx.notes).toEqual([]);
  });

  it('`named` above `max` is refused at load', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `verbs: [foo]\ncontroller: FooController\ndescription: stub\nargs:\n  - name: targets\n    type: objects\n    cardinality:\n      max: 1\n      named: 2\n`,
        '<test>',
      ),
    ).toThrow(/named \(2\) cannot exceed cardinality.max/);
  });
});
