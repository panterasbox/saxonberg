/**
 * msh — emote prefix detection tests.
 *
 * `:` / `;` followed by a verb-starting char (alpha/underscore) marks
 * the input as emote-prefixed and strips the sigil. Whitespace,
 * punctuation, or end-of-input after the sigil all reject the
 * detection.
 */

import { describe, it, expect } from 'vitest';
import { detectEmotePrefix, stripEmotePrefix } from '../msh';
import msh from '../msh';

describe('detectEmotePrefix', () => {
  it('detects `:wave`', () => {
    expect(detectEmotePrefix(':wave')).toBe(true);
  });
  it('detects `;wave`', () => {
    expect(detectEmotePrefix(';wave')).toBe(true);
  });
  it('detects `:wave iffy`', () => {
    expect(detectEmotePrefix(':wave iffy')).toBe(true);
  });
  it('detects `;waves at iffy.`', () => {
    expect(detectEmotePrefix(';waves at iffy.')).toBe(true);
  });
  it('does NOT detect `: wave` (whitespace after sigil)', () => {
    expect(detectEmotePrefix(': wave')).toBe(false);
  });
  it('does NOT detect `:)` (no verb word)', () => {
    expect(detectEmotePrefix(':)')).toBe(false);
  });
  it('does NOT detect plain `wave`', () => {
    expect(detectEmotePrefix('wave')).toBe(false);
  });
  it('does NOT detect empty / sigil-only inputs', () => {
    expect(detectEmotePrefix('')).toBe(false);
    expect(detectEmotePrefix(':')).toBe(false);
    expect(detectEmotePrefix(';')).toBe(false);
  });
  it('tolerates leading whitespace', () => {
    expect(detectEmotePrefix('  ;wave')).toBe(true);
  });
});

describe('stripEmotePrefix', () => {
  it('strips `:`', () => {
    expect(stripEmotePrefix(':wave iffy')).toBe('wave iffy');
  });
  it('strips `;`', () => {
    expect(stripEmotePrefix(';waves at iffy.')).toBe('waves at iffy.');
  });
  it('strips leading whitespace + sigil', () => {
    expect(stripEmotePrefix('  ;wave')).toBe('wave');
  });
});

describe('msh parser — emote-prefix flag', () => {
  const ctx = { commandGiver: null as unknown as never };

  it('stamps `emotePrefixed: true` on `:wave iffy`', () => {
    const r = msh.parse(':wave iffy', ctx as never);
    expect('parsed' in r).toBe(true);
    if ('parsed' in r && r.parsed) {
      expect(r.parsed.verb).toBe('wave');
      expect(r.parsed.emotePrefixed).toBe(true);
    }
  });

  it('leaves `wave iffy` un-flagged', () => {
    const r = msh.parse('wave iffy', ctx as never);
    if ('parsed' in r && r.parsed) {
      expect(r.parsed.verb).toBe('wave');
      expect(r.parsed.emotePrefixed).toBeUndefined();
    }
  });

  it('does NOT flag `chat foo :)` — only the head', () => {
    const r = msh.parse('chat foo :)', ctx as never);
    if ('parsed' in r && r.parsed) {
      expect(r.parsed.verb).toBe('chat');
      expect(r.parsed.emotePrefixed).toBeUndefined();
    }
  });
});
