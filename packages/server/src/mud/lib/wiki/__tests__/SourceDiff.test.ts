/**
 * The word-level source diff — the pure half.
 *
 * Gates acceptance criterion **66** (`wiki diff` is a word-level diff
 * over source). The spoiler-gating half (67, 68) lives in the
 * controller suite, because it is a property of the ORDER the
 * controller does things in — redact, then diff — not of this module,
 * which is deliberately ignorant of the reveal model.
 */

import { describe, it, expect } from 'vitest';
import { SourceDiff } from '../SourceDiff';

/** The ops that actually represent a change. */
function changes(before: string, after: string) {
  return SourceDiff.words(before, after).filter((o) => o.kind !== 'same');
}

describe('word-level diffing (66)', () => {
  it('reports an addition', () => {
    expect(changes('oak is a wood', 'oak is a hard wood')).toEqual([
      { kind: 'added', text: 'hard' },
    ]);
  });

  it('reports a removal', () => {
    expect(changes('oak is a hard wood', 'oak is a wood')).toEqual([
      { kind: 'removed', text: 'hard' },
    ]);
  });

  it('reports a replacement as a removal plus an addition', () => {
    const ops = changes('oak is hard', 'oak is soft');
    expect(ops.map((o) => o.kind).sort()).toEqual(['added', 'removed']);
    expect(ops.find((o) => o.kind === 'removed')?.text).toBe('hard');
    expect(ops.find((o) => o.kind === 'added')?.text).toBe('soft');
  });

  it('is WORD-level, not line-level — it names the word', () => {
    const ops = changes(
      'a long sentence with one wrong word in it',
      'a long sentence with one right word in it',
    );
    expect(ops.find((o) => o.kind === 'added')?.text).toBe('right');
    expect(ops.find((o) => o.kind === 'removed')?.text).toBe('wrong');
  });

  it('coalesces adjacent changes into spans', () => {
    const ops = changes('a b c', 'a x y z c');
    const added = ops.filter((o) => o.kind === 'added');
    expect(added).toHaveLength(1);
    expect(added[0]!.text).toBe('x y z');
  });

  it('finds nothing between identical bodies', () => {
    expect(changes('same text', 'same text')).toEqual([]);
    expect(SourceDiff.changed('same text', 'same text')).toBe(false);
  });

  it('⚠ ignores a pure reflow — whitespace is normalised first', () => {
    // The single most common way a naive prose diff becomes useless:
    // rewrapping a paragraph reads as an entire rewrite.
    expect(changes('one two three', 'one   two\n\nthree')).toEqual([]);
    expect(SourceDiff.changed('one two', 'one\ttwo')).toBe(false);
  });

  it('does NOT hide markup — it is part of what was edited', () => {
    const ops = changes('a <em>b</em> c', 'a <strong>b</strong> c');
    expect(ops.length).toBeGreaterThan(0);
  });

  it('handles an empty before (a page created)', () => {
    expect(changes('', 'brand new')).toEqual([
      { kind: 'added', text: 'brand new' },
    ]);
  });

  it('handles an empty after (a page blanked)', () => {
    expect(changes('all of it', '')).toEqual([
      { kind: 'removed', text: 'all of it' },
    ]);
  });

  it('two empty bodies diff to nothing', () => {
    expect(SourceDiff.words('', '')).toEqual([]);
  });

  it('preserves document order', () => {
    const ops = SourceDiff.words('a b c d', 'a X c Y');
    const texts = ops.map((o) => o.text);
    expect(texts.indexOf('X')).toBeLessThan(texts.indexOf('Y'));
  });

  it('finds the minimal change, not a wholesale rewrite', () => {
    // A dumb diff would report the whole paragraph replaced.
    const before = 'the quick brown fox jumps over the lazy dog';
    const after = 'the quick red fox jumps over the lazy dog';
    const ops = changes(before, after);
    expect(ops).toHaveLength(2);
  });
});

describe('formatting', () => {
  it('marks additions with + and removals with -', () => {
    const out = SourceDiff.format(SourceDiff.words('a b', 'a c'));
    expect(out).toContain('- b');
    expect(out).toContain('+ c');
  });

  it('elides long unchanged runs, keeping context around the change', () => {
    // An un-elided diff of a long article is mostly unchanged text,
    // and a reviewer who has to hunt for the change stops reviewing.
    const filler = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ');
    const out = SourceDiff.format(
      SourceDiff.words(`${filler} old ${filler}`, `${filler} new ${filler}`),
    );
    expect(out).toContain('…');
    expect(out).toContain('+ new');
    expect(out).toContain('- old');
    expect(out.length).toBeLessThan(filler.length);
  });

  it('keeps a short unchanged run whole', () => {
    const out = SourceDiff.format(SourceDiff.words('a b', 'a b c'));
    expect(out).toContain('  a b');
    expect(out).not.toContain('…');
  });

  it('an unchanged body formats to just its text', () => {
    expect(SourceDiff.format(SourceDiff.words('a b', 'a b'))).toBe('  a b');
  });
});

describe('tokenize', () => {
  it('collapses whitespace runs and drops empties', () => {
    expect(SourceDiff.tokenize('  a \n\t b  ')).toEqual(['a', 'b']);
    expect(SourceDiff.tokenize('   ')).toEqual([]);
  });
});

describe('scale', () => {
  it('diffs a long article without falling over', () => {
    // A very long page is a few thousand words; the LCS table is a few
    // million small integers, built once per `wiki diff`.
    const words = Array.from({ length: 2000 }, (_, i) => `w${i}`);
    const before = words.join(' ');
    const after = [...words.slice(0, 999), 'CHANGED', ...words.slice(1000)].join(
      ' ',
    );
    const ops = changes(before, after);
    expect(ops.some((o) => o.text === 'CHANGED')).toBe(true);
  });
});
