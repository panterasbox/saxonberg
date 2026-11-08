/**
 * ⭐ `verb@source` in the tokenizer (controllers-are-io D1).
 *
 * The verb token — and ONLY the verb token — splits at its first `@`
 * past index 0: the part before is the verb, the rest the scope. The raw
 * token is untouched, so `format()` round-trips; a synthesized command
 * (an alias expansion) that carries a scope its token 0 does not
 * re-emits `verb@scope`.
 */

import { describe, it, expect } from 'vitest';
import { CommandLineApi, type ParsedCommand } from '../command-line';

const one = (text: string): ParsedCommand =>
  CommandLineApi.parsePipeline(text).commands[0]!;

describe('verb@source — the five forms', () => {
  it('splits a scoped verb: `wind@me:watch`', () => {
    const p = one('wind@me:watch');
    expect(p.verb).toBe('wind');
    expect(p.scope).toBe('me:watch');
  });

  it('a multi-word scope is quoted: `wind@"pocket watch" slowly`', () => {
    const p = one('wind@"pocket watch" slowly');
    expect(p.verb).toBe('wind');
    expect(p.scope).toBe('pocket watch');
    expect(p.rawTokens).toHaveLength(2);
  });

  it('a leading `@` is not a split: `@bob` is a verb word', () => {
    const p = one('@bob hello');
    expect(p.verb).toBe('@bob');
    expect(p.scope).toBeUndefined();
  });

  it('an empty scope is no scope: `wind@`', () => {
    const p = one('wind@');
    expect(p.verb).toBe('wind');
    expect(p.scope).toBeUndefined();
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

  it('splits at the FIRST `@`: `give@a@b`', () => {
    const p = one('give@a@b');
    expect(p.verb).toBe('give');
    expect(p.scope).toBe('a@b');
  });
});

describe('verb@source — format() round-trips', () => {
  for (const text of ['wind@me:watch', 'wind@"pocket watch" slowly', 'harvest@here:wheat --sync']) {
    it(`parse(format(parse(${JSON.stringify(text)}))) keeps verb + scope`, () => {
      const a = one(text);
      const b = one(CommandLineApi.format(a));
      expect(b.verb).toBe(a.verb);
      expect(b.scope).toBe(a.scope);
    });
  }

  it('a synthesized command with a scope re-emits `verb@scope`, quoted when needed', () => {
    const synth: ParsedCommand = {
      verb: 'wind',
      rawTokens: [{ kind: 'word', value: 'wind', raw: 'wind', pos: 0 }],
      source: '',
      start: 0,
      scope: 'pocket watch',
    };
    const text = CommandLineApi.format(synth);
    expect(text).toBe('wind@"pocket watch"');
    expect(one(text).scope).toBe('pocket watch');
  });

  it('a scope that differs from the one in token 0 wins (the alias carry)', () => {
    const p = { ...one('wind@me:watch'), scope: 'here' };
    expect(CommandLineApi.format(p)).toBe('wind@here');
  });
});
