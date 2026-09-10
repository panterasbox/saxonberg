/**
 * check-unconsumed-seams — the shapes the census must COUNT and the
 * shapes it must IGNORE (the shipped-broken-gate clause: a gate proven
 * only by staying green may have silently stopped matching, so assert it
 * FIRES).
 *
 * ⚠ The must-not-fire half is not hypothetical. The first cut of this
 * gate reported 38 seams; twelve of them were false. Three shapes did it:
 *
 *   - a `protected _foo` read through `getFoo()` (the underscore breaks a
 *     naive `get` + capitalize derivation);
 *   - a BOOLEAN field read through its PREDICATE-form getter
 *     (`respires` → `isRespiring()`), which no name derivation reaches;
 *   - an interface `@hook` implemented by the mixin **in the same file**
 *     (`Detailed.applyDetails`), where "no override outside the declaring
 *     file" is exactly the wrong question.
 *
 * The fix for the first two was to stop guessing the accessor's name and
 * DERIVE the read surface from which methods actually read the field.
 * All three are pinned below.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import {
  fieldMetaKeysIn,
  hookMethodsIn,
  fieldIsRead,
  hookIsOverridden,
  readSurfaceOf,
  unconsumedIn,
} from '../check-unconsumed-seams';

const FIXTURE = fileURLToPath(
  new URL('../__fixtures__/unconsumed-seam-shapes.ts.txt', import.meta.url),
);

/** The fixture must sit under a data-Idea path for the filter to admit it. */
const DECL = '/repo/packages/server/src/mud/platform/idea/FixtureIdea.ts';

const src = (): string => readFileSync(FIXTURE, 'utf8');

/**
 * The corpus: the fixture as the declaring file, plus two consumers —
 * one kernel-side, one pack-side (a pack is as legitimate a consumer as
 * the kernel; that is the whole point of a pack).
 */
function corpus(): Map<string, string> {
  return new Map<string, string>([
    [DECL, src()],
    [
      '/repo/packages/server/src/mud/lib/other/Consumer.ts',
      `
      export class Consumer {
        read(f: FixtureIdea): string { return f.getReadElsewhere(); }
        touch(f: FixtureIdea): string { return f.touchedElsewhere; }
        flagging(f: FixtureIdea): boolean { return f.isFlagging(); }
      }
      `,
    ],
    [
      '/repo/packages/content/some-pack/src/idea/PackHost.ts',
      `
      export class PackHost extends Base {
        public onOverridden(): void { this.doSomethingReal(); }
      }
      `,
    ],
  ]);
}

function seamNames(): string[] {
  return unconsumedIn(corpus()).map((s) => `${s.kind}:${s.name}`);
}

describe('check-unconsumed-seams — must fire', () => {
  it('counts a field read only by its own accessor, in its own file', () => {
    expect(seamNames()).toContain('field:orphanField');
  });

  it('counts an empty no-op terminal hook nothing overrides', () => {
    expect(seamNames()).toContain('hook:onNothing');
  });

  it('counts a terminal that returns a bare constant', () => {
    // `return 0` under "composed hosts supply the real read" — the
    // `MemorizedMixin.competenceRankFor` shape, live in the tree.
    expect(seamNames()).toContain('hook:defaultsToZero');
  });

  it('counts an interface contract with no implementation anywhere', () => {
    // The `CombatVenue.onCombatOpened` shape: a documented extension
    // surface no shipped venue speaks.
    expect(seamNames()).toContain('hook:contractOnly');
  });
});

describe('check-unconsumed-seams — must NOT fire', () => {
  it('IGNORES a field another file reads through its accessor', () => {
    expect(seamNames()).not.toContain('field:readElsewhere');
  });

  it('IGNORES a field another file reads by property access', () => {
    expect(seamNames()).not.toContain('field:touchedElsewhere');
  });

  it('⚠ IGNORES a boolean read by its PREDICATE-form getter elsewhere', () => {
    // `respires` → `isRespiring()`. No `get`+capitalize derivation finds
    // this; the read surface has to come from the bodies.
    expect(seamNames()).not.toContain('field:flagged');
    expect(readSurfaceOf('flagged', src(), DECL)).toContain('isFlagging');
  });

  it('⚠ IGNORES an interface hook the mixin implements in the SAME file', () => {
    // The Hydrator-applier shape — a contract with a live implementation
    // one screen down, which "no override outside this file" misreads.
    expect(seamNames()).not.toContain('hook:applyThings');
  });

  it('IGNORES a terminal a pack overrides', () => {
    expect(seamNames()).not.toContain('hook:onOverridden');
  });

  it('does not count a SETTER as a read', () => {
    // The Hydrator writes every persistent field by reflection, so a
    // write proves nothing about whether the seam is honoured.
    const onlySetter = new Map<string, string>([
      [DECL, src()],
      [
        '/repo/packages/server/src/mud/lib/other/Writer.ts',
        `export class Writer { w(f: FixtureIdea): void { f.setOrphanField('x'); } }`,
      ],
    ]);
    expect(
      unconsumedIn(onlySetter).some((s) => s.name === 'orphanField'),
    ).toBe(true);
  });
});

describe('check-unconsumed-seams — the pure halves', () => {
  it('reads every fieldMeta key off the declaration', () => {
    const keys = fieldMetaKeysIn(DECL, src()).map((f) => f.name);
    expect(keys).toEqual([
      'orphanField',
      'readElsewhere',
      'touchedElsewhere',
      'flagged',
    ]);
  });

  it('finds every @hook-tagged terminal and no others', () => {
    const hooks = hookMethodsIn(DECL, src()).map((h) => h.name).sort();
    expect(hooks).toEqual([
      'contractOnly',
      'defaultsToZero',
      'onNothing',
      'onOverridden',
    ]);
  });

  it('derives the read surface from the bodies, not the field name', () => {
    expect(readSurfaceOf('orphanField', src(), DECL)).toContain(
      'getOrphanField',
    );
    // …and never from the writer.
    expect(readSurfaceOf('orphanField', src(), DECL)).not.toContain(
      'setOrphanField',
    );
  });

  it('the two membership tests agree with the census', () => {
    const c = corpus();
    expect(
      fieldIsRead('flagged', DECL, c, readSurfaceOf('flagged', src(), DECL)),
    ).toBe(true);
    expect(
      fieldIsRead(
        'orphanField',
        DECL,
        c,
        readSurfaceOf('orphanField', src(), DECL),
      ),
    ).toBe(false);
    expect(hookIsOverridden('onOverridden', DECL, c)).toBe(true);
    expect(hookIsOverridden('onNothing', DECL, c)).toBe(false);
  });
});
