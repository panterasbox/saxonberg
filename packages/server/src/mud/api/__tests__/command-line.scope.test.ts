/**
 * ⭐ `source::verb` in the tokenizer (controllers-are-io D1).
 *
 * The verb token — and ONLY the verb token — splits at its first `::`
 * outside quotes: the part before is the source, the rest the verb
 * (naming overhaul D-B8; `@` is a player address now). The raw
 * token is untouched, so `format()` round-trips; a synthesized command
 * (an alias expansion) that carries a scope its token 0 does not
 * re-emits `scope::verb`.
 */

import { describe, it, expect } from 'vitest';
import { CommandLineApi, type ParsedCommand } from '../command-line';

const one = (text: string): ParsedCommand =>
  CommandLineApi.parsePipeline(text).commands[0]!;

describe('source::verb — the five forms', () => {
  it('splits a scoped verb: `me:watch::wind`', () => {
    const p = one('me:watch::wind');
    expect(p.verb).toBe('wind');
    expect(p.scope).toBe('me:watch');
  });

  it('a multi-word scope is quoted: `"pocket watch"::wind slowly`', () => {
    const p = one('"pocket watch"::wind slowly');
    expect(p.verb).toBe('wind');
    expect(p.scope).toBe('pocket watch');
    expect(p.rawTokens).toHaveLength(2);
  });

  it('an `@` is no longer a split: `wind@watch` is one (unknown) verb word', () => {
    const p = one('wind@watch');
    expect(p.verb).toBe('wind@watch');
    expect(p.scope).toBeUndefined();
  });

  it('an empty side is no split: `::wind`, `wind::`', () => {
    expect(one('::wind').scope).toBeUndefined();
    expect(one('wind::').scope).toBeUndefined();
  });

  it('a quoted source keeps its own colons: `"a::b"::wind`', () => {
    const p = one('"a::b"::wind');
    expect(p.verb).toBe('wind');
    expect(p.scope).toBe('a::b');
  });

  it('only the verb token is ever looked at: `say hi @bob` is untouched', () => {
    const p = one('say hi @bob');
    expect(p.verb).toBe('say');
    expect(p.scope).toBeUndefined();
    expect(p.rawTokens.map((t) => (t as { value?: string }).value)).toEqual([
      'say',
      'hi',
      '@bob',
    ]);
  });

  it('an unscoped line carries no `scope` key at all (byte-identical)', () => {
    expect('scope' in one('look rose')).toBe(false);
  });

  it('splits at the FIRST `::`: `me:i:watch::wind`', () => {
    const p = one('me:i:watch::wind');
    expect(p.verb).toBe('wind');
    expect(p.scope).toBe('me:i:watch');
  });
});

describe('source::verb — format() round-trips', () => {
  for (const text of ['me:watch::wind', '"pocket watch"::wind slowly', 'here:wheat::harvest --sync']) {
    it(`parse(format(parse(${JSON.stringify(text)}))) keeps verb + scope`, () => {
      const a = one(text);
      const b = one(CommandLineApi.format(a));
      expect(b.verb).toBe(a.verb);
      expect(b.scope).toBe(a.scope);
    });
  }

  it('a synthesized command with a scope re-emits `scope::verb`, quoted when needed', () => {
    const synth: ParsedCommand = {
      verb: 'wind',
      rawTokens: [{ kind: 'word', value: 'wind', raw: 'wind', pos: 0 }],
      source: '',
      start: 0,
      scope: 'pocket watch',
    };
    const text = CommandLineApi.format(synth);
    expect(text).toBe('"pocket watch"::wind');
    expect(one(text).scope).toBe('pocket watch');
  });

  it('a scope that differs from the one in token 0 wins (the alias carry)', () => {
    const p = { ...one('me:watch::wind'), scope: 'here' };
    expect(CommandLineApi.format(p)).toBe('here::wind');
  });
});
