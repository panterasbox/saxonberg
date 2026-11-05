/**
 * check-wizard-axis's pure decision core: a file naming the wizard axis
 * must be listed with its count and a reason; a new file fails, a rise
 * fails, a fall or a vanished file is stale and fails — the list only
 * shrinks.
 */

import { describe, it, expect } from 'vitest';
import { classify, countTokens, parseAllowlist } from '../check-wizard-axis';

/** Built, not written: the gate's own test must not trip the gate. */
const W = ['is', 'Wizard'].join('');
const RW = ['requires', 'Wizard'].join('');
const f = (path: string, text: string) => ({ path, text });
const e = (path: string, count: number, reason = 'prose') => ({ path, count, reason });

describe('check-wizard-axis', () => {
  it('counts the four tokens, word-bounded', () => {
    expect(countTokens(`AccessApi.${W}(g) && ${RW}`)).toBe(2);
    expect(countTokens(`${W}ly ${W}Thing`)).toBe(0);
    expect(countTokens(['isArch', 'wizard(x) requiresArch', 'wizard'].join(''))).toBe(2);
  });

  it('a listed file at its count passes', () => {
    const r = classify([f('a.ts', `${W}(x)`)], [e('a.ts', 1)]);
    expect(r.ok).toEqual(['a.ts']);
    expect(r.unlisted.length + r.rose.length + r.stale.length).toBe(0);
  });

  it('a NEW file fails', () => {
    const r = classify([f('a.ts', `${W}(x)`), f('b.yaml', `validators: [${RW}]`)], [e('a.ts', 1)]);
    expect(r.unlisted).toEqual([{ path: 'b.yaml', count: 1 }]);
  });

  it('a rise fails', () => {
    const r = classify([f('a.ts', `${W}(x) ${W}(y)`)], [e('a.ts', 1)]);
    expect(r.rose).toEqual([{ path: 'a.ts', listed: 1, count: 2 }]);
  });

  it('a fall, and a file that no longer names the axis, are stale', () => {
    const r = classify([f('a.ts', `${W}(x)`), f('b.ts', 'nothing')], [e('a.ts', 2), e('b.ts', 1), e('gone.ts', 1)]);
    expect(r.stale.map((s) => s.path).sort()).toEqual(['a.ts', 'b.ts', 'gone.ts']);
  });

  it('a reason outside the closed set fails', () => {
    const r = classify([f('a.ts', `${W}(x)`)], [e('a.ts', 1, 'because')]);
    expect(r.badReason).toHaveLength(1);
  });

  it('parses the allowlist shape', () => {
    expect(parseAllowlist('# c\n\npackages/x.ts  3  definition\n')).toEqual([e('packages/x.ts', 3, 'definition')]);
  });
});
