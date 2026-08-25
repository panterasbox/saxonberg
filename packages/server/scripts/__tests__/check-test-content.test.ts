/**
 * check-test-content's pure decision core: a kernel test naming shipped
 * content is an offender; listed offenders warn; a NEW offender fails;
 * a listed path that no longer offends is stale and fails too — the
 * allowlist only shrinks.
 */

import { describe, it, expect } from 'vitest';
import { classify, OFFENDER_RE } from '../check-test-content';

const f = (path: string, text: string) => ({ path, text });

describe('check-test-content.classify', () => {
  it('matches /domain/<locality> paths and nothing else', () => {
    expect(OFFENDER_RE.test("import x from '../../domain/eternal/Whistle'")).toBe(true);
    expect(OFFENDER_RE.test("const p = '/domain/lounge/msh/martini'")).toBe(true);
    expect(OFFENDER_RE.test("const p = '/test/ritual/threshold'")).toBe(false);
    expect(OFFENDER_RE.test('the `domain` command category')).toBe(false);
  });

  it('a listed offender is warned, not failed', () => {
    const r = classify([f('a.test.ts', "'/domain/lounge/x'")], ['a.test.ts']);
    expect(r).toEqual({ warned: ['a.test.ts'], newOffenders: [], stale: [] });
  });

  it('a NEW offender fails', () => {
    const r = classify([f('a.test.ts', "'/domain/lounge/x'"), f('b.test.ts', "'/domain/eternal/y'")], ['a.test.ts']);
    expect(r.newOffenders).toEqual(['b.test.ts']);
    expect(r.warned).toEqual(['a.test.ts']);
  });

  it('a listed path that no longer offends is stale — and so is one that no longer exists', () => {
    const r = classify([f('a.test.ts', "'/test/x'")], ['a.test.ts', 'gone.test.ts']);
    expect(r.stale).toEqual(['a.test.ts', 'gone.test.ts']);
    expect(r.warned).toEqual([]);
  });

  it('allowlist-only-shrinks: removing a fixed line passes; keeping it fails; adding a new offender fails', () => {
    const files = [f('kept.test.ts', "'/domain/a'"), f('fixed.test.ts', "'/test/a'")];
    expect(classify(files, ['kept.test.ts']).stale).toEqual([]);
    expect(classify(files, ['kept.test.ts', 'fixed.test.ts']).stale).toEqual(['fixed.test.ts']);
    expect(classify([...files, f('new.test.ts', "'/domain/b'")], ['kept.test.ts']).newOffenders).toEqual(['new.test.ts']);
  });
});
