/**
 * MQL lexer tests — covers every token kind, the tricky `-` boundary
 * rule, the `#` shape dispatch, and string-literal whitespace
 * preservation.
 */

import { describe, it, expect } from 'vitest';
import { lex, MqlLexError, type Token } from '../mql/lexer';

function kinds(input: string): string[] {
  return lex(input)
    .filter((t) => t.kind !== 'eof')
    .map((t) => t.kind);
}

function tokens(input: string): Token[] {
  return lex(input).filter((t) => t.kind !== 'eof');
}

describe('MQL lexer', () => {
  describe('whitespace and EOF', () => {
    it('emits only EOF on empty input', () => {
      const out = lex('');
      expect(out).toHaveLength(1);
      expect(out[0]?.kind).toBe('eof');
    });

    it('skips ASCII whitespace', () => {
      expect(kinds('  \t\n  ')).toEqual([]);
    });

    it('terminates the stream with EOF at input length', () => {
      const out = lex('x');
      expect(out[out.length - 1]).toMatchObject({
        kind: 'eof',
        start: 1,
        end: 1,
      });
    });
  });

  describe('single-character punctuation', () => {
    it('lexes commas, colons, parens, brackets', () => {
      expect(kinds(',:()[]')).toEqual([
        'comma',
        'colon',
        'lparen',
        'rparen',
        'lbracket',
        'rbracket',
      ]);
    });

    it('lexes equals as eq', () => {
      expect(kinds('=')).toEqual(['eq']);
    });
  });

  describe('comparison operators', () => {
    it('lexes != as neq', () => {
      expect(kinds('!=')).toEqual(['neq']);
    });

    it('rejects bare !', () => {
      expect(() => lex('!')).toThrow(MqlLexError);
    });

    it('lexes > and >=', () => {
      expect(kinds('>')).toEqual(['gt']);
      expect(kinds('>=')).toEqual(['gte']);
    });

    it('lexes < and <=', () => {
      expect(kinds('<')).toEqual(['lt']);
      expect(kinds('<=')).toEqual(['lte']);
    });
  });

  describe('dots', () => {
    it('lexes single dot', () => {
      expect(kinds('.')).toEqual(['dot']);
    });

    it('lexes double dot as dotdot', () => {
      expect(kinds('..')).toEqual(['dotdot']);
    });

    it('lexes 1..3 as int dotdot int', () => {
      expect(kinds('1..3')).toEqual(['int', 'dotdot', 'int']);
    });
  });

  describe('dollar', () => {
    it('lexes $$ as dollardollar', () => {
      expect(kinds('$$')).toEqual(['dollardollar']);
    });

    it('rejects bare $', () => {
      expect(() => lex('$')).toThrow(/only '\$\$'/);
    });

    it('rejects $ followed by non-$', () => {
      expect(() => lex('$x')).toThrow(MqlLexError);
    });
  });

  describe('hash shape dispatch', () => {
    it('numeric body → hashInt', () => {
      const t = tokens('#5');
      expect(t).toHaveLength(1);
      expect(t[0]).toMatchObject({ kind: 'hashInt', value: '5' });
    });

    it('alphanumeric body → hashId', () => {
      const t = tokens('#abc123');
      expect(t).toHaveLength(1);
      expect(t[0]).toMatchObject({ kind: 'hashId', value: 'abc123' });
    });

    it('mixed leading-digit body → hashId (id semantics)', () => {
      const t = tokens('#1abc');
      expect(t[0]).toMatchObject({ kind: 'hashId', value: '1abc' });
    });

    /**
     * ⚠⚠ **One `stuffId` in sixty-four begins with a hyphen.**
     *
     * `nanoid()`'s alphabet is `A-Za-z0-9_-`, so a leading `-` turns up
     * at a measured 1.56% — and the `#` guard tested only the narrow
     * word-char set, so `#-Xk3…` threw *"bare '#'"* and killed the
     * command. The disambiguation loop stores `#<stuffId>` as the
     * focus, so roughly one pick in sixty-four left a focus that could
     * not be re-resolved. It surfaced as an intermittent full-suite
     * failure that passed every time it was run alone.
     */
    it('⭐ leading-dash body → hashId (a nanoid may start with `-`)', () => {
      const t = tokens('#-Xk3f_1a');
      expect(t).toHaveLength(1);
      expect(t[0]).toMatchObject({ kind: 'hashId', value: '-Xk3f_1a' });
    });

    it('a dash-only body is still a bare #, not an id', () => {
      expect(() => lex('#-')).toThrow(/bare '#'/);
      expect(() => lex('#- ')).toThrow(/bare '#'/);
    });

    it('rejects bare # at end of input', () => {
      expect(() => lex('#')).toThrow(/bare '#'/);
    });

    it('rejects # followed by whitespace', () => {
      expect(() => lex('# 5')).toThrow(/bare '#'/);
    });

    it('rejects # followed by punctuation', () => {
      expect(() => lex('#,')).toThrow(/bare '#'/);
    });
  });

  describe('string literals', () => {
    it('lexes a basic literal', () => {
      const t = tokens("'rose'");
      expect(t[0]).toMatchObject({ kind: 'literal', value: 'rose' });
    });

    it('preserves whitespace', () => {
      const t = tokens("'a long name with spaces'");
      expect(t[0]?.value).toBe('a long name with spaces');
    });

    it('preserves case', () => {
      const t = tokens("'OakDoor'");
      expect(t[0]?.value).toBe('OakDoor');
    });

    it('allows empty literals', () => {
      const t = tokens("''");
      expect(t[0]?.value).toBe('');
    });

    it('records start/end at the surrounding quotes', () => {
      const t = tokens("'rose'");
      expect(t[0]).toMatchObject({ start: 0, end: 6 });
    });

    it('throws on unterminated literal', () => {
      expect(() => lex("'oops")).toThrow(/unterminated string literal/);
    });
  });

  describe('paths', () => {
    it('lexes a simple path', () => {
      const t = tokens('/platform/agent/Avatar/abc');
      expect(t).toHaveLength(1);
      expect(t[0]).toMatchObject({ kind: 'path', value: '/platform/agent/Avatar/abc' });
    });

    it('absorbs * and ? globs', () => {
      const t = tokens('/platform/agent/Avatar/*');
      expect(t[0]?.value).toBe('/platform/agent/Avatar/*');
    });

    it('absorbs ** for recursive glob', () => {
      const t = tokens('/obj/**');
      expect(t[0]?.value).toBe('/obj/**');
    });

    it('absorbs hyphens in path segments', () => {
      const t = tokens('/lib/foo-bar/Baz');
      expect(t[0]?.value).toBe('/lib/foo-bar/Baz');
    });

    it('stops at whitespace', () => {
      expect(kinds('/obj/Foo bar')).toEqual(['path', 'bareword']);
    });

    it('stops at . (paths do not contain dots)', () => {
      expect(kinds('/obj/Foo.bar')).toEqual(['path', 'dot', 'bareword']);
    });

    it('stops at colon', () => {
      expect(kinds('/platform/agent/Avatar/*:i')).toEqual([
        'path',
        'colon',
        'transformLetter',
      ]);
    });
  });

  describe('barewords and ints', () => {
    it('all-digit body → int', () => {
      const t = tokens('42');
      expect(t[0]).toMatchObject({ kind: 'int', value: '42' });
    });

    it('mixed body starting with digit → bareword', () => {
      const t = tokens('5th');
      expect(t[0]).toMatchObject({ kind: 'bareword', value: '5th' });
    });

    it('lowercases barewords', () => {
      const t = tokens('Rose');
      expect(t[0]?.value).toBe('rose');
    });

    it('preserves case in literal but not in bareword', () => {
      // Sanity check across both shapes.
      const lit = tokens("'Rose'");
      expect(lit[0]?.value).toBe('Rose');
      const bw = tokens('Rose');
      expect(bw[0]?.value).toBe('rose');
    });

    it('allows underscores in barewords', () => {
      const t = tokens('foo_bar');
      expect(t[0]).toMatchObject({ kind: 'bareword', value: 'foo_bar' });
    });
  });

  describe('hyphen boundary rule', () => {
    it('oak-door is one bareword', () => {
      const t = tokens('oak-door');
      expect(t).toHaveLength(1);
      expect(t[0]).toMatchObject({ kind: 'bareword', value: 'oak-door' });
    });

    it('a-b-c chains across multiple hyphens', () => {
      const t = tokens('a-b-c');
      expect(t).toHaveLength(1);
      expect(t[0]?.value).toBe('a-b-c');
    });

    it('swords - broken is set difference', () => {
      expect(kinds('swords - broken')).toEqual(['bareword', 'dash', 'bareword']);
    });

    it('swords -broken still lexes - as operator (no whitespace before next word)', () => {
      // `swords` ends, whitespace, then `-` at token start. The next-
      // char check on `-` only matters when we're already inside a
      // word — at token start, `-` is always the operator.
      expect(kinds('swords -broken')).toEqual(['bareword', 'dash', 'bareword']);
    });

    it('-x is dash + bareword (not a negative-prefix bareword)', () => {
      expect(kinds('-x')).toEqual(['dash', 'bareword']);
    });

    it('a- (trailing hyphen) is bareword + dash', () => {
      expect(kinds('a-')).toEqual(['bareword', 'dash']);
    });

    it('a-1 absorbs the digit on the right side', () => {
      const t = tokens('a-1');
      expect(t).toHaveLength(1);
      expect(t[0]?.value).toBe('a-1');
    });

    it('1-a absorbs the letter on the right side (yields bareword, not int)', () => {
      const t = tokens('1-a');
      expect(t).toHaveLength(1);
      expect(t[0]).toMatchObject({ kind: 'bareword', value: '1-a' });
    });
  });

  describe('compound queries', () => {
    it('me:i:rose lexes — `i` is a transformLetter, others are barewords', () => {
      // `i` / `I` / `e` / `E` get the dedicated transformLetter
      // kind so the parser can dispatch shallow vs deep / step vs
      // root. Multi-letter words (`me`, `rose`) stay barewords.
      expect(kinds('me:i:rose')).toEqual([
        'bareword',
        'colon',
        'transformLetter',
        'colon',
        'bareword',
      ]);
    });

    it('uppercase :I lexes as transformLetter (deep variant)', () => {
      expect(kinds('me:I')).toEqual(['bareword', 'colon', 'transformLetter']);
    });

    it('uppercase :E lexes as transformLetter (root variant)', () => {
      expect(kinds('me:E')).toEqual(['bareword', 'colon', 'transformLetter']);
    });

    it('roses:[5] lexes correctly', () => {
      expect(kinds('roses:[5]')).toEqual([
        'bareword',
        'colon',
        'lbracket',
        'int',
        'rbracket',
      ]);
    });

    it('roses:[1..3] lexes correctly', () => {
      expect(kinds('roses:[1..3]')).toEqual([
        'bareword',
        'colon',
        'lbracket',
        'int',
        'dotdot',
        'int',
        'rbracket',
      ]);
    });

    it('A, B, C lexes union', () => {
      expect(kinds('A, B, C')).toEqual([
        'bareword',
        'comma',
        'bareword',
        'comma',
        'bareword',
      ]);
    });

    it('[prop.gold > 50] lexes', () => {
      expect(kinds('[prop.gold > 50]')).toEqual([
        'lbracket',
        'bareword',
        'dot',
        'bareword',
        'gt',
        'int',
        'rbracket',
      ]);
    });

    it('[name = "rose"] uses single-quote literal', () => {
      expect(kinds("[name = 'rose']")).toEqual([
        'lbracket',
        'bareword',
        'eq',
        'literal',
        'rbracket',
      ]);
    });

    it('#abc123:i:rose works as id-seeded chain', () => {
      expect(kinds('#abc123:i:rose')).toEqual([
        'hashId',
        'colon',
        'transformLetter',
        'colon',
        'bareword',
      ]);
    });

    it('roses:[#5] uses hashInt at chain position', () => {
      expect(kinds('roses:[#5]')).toEqual([
        'bareword',
        'colon',
        'lbracket',
        'hashInt',
        'rbracket',
      ]);
    });

    it('preserves source positions for error messages', () => {
      const t = lex('rose : door');
      expect(t[0]).toMatchObject({ start: 0, end: 4 });
      expect(t[1]).toMatchObject({ start: 5, end: 6 });
      expect(t[2]).toMatchObject({ start: 7, end: 11 });
    });
  });

  describe('error cases', () => {
    it('throws on unrecognized characters', () => {
      expect(() => lex('@')).toThrow(/unexpected character '@'/);
    });
  });

  describe('quantity braces and star (globbable syntax)', () => {
    it('lexes { and } as lbrace / rbrace', () => {
      expect(kinds('{}')).toEqual(['lbrace', 'rbrace']);
    });

    it('lexes * as star at top level', () => {
      expect(kinds('*')).toEqual(['star']);
    });

    it('lexes coin:{5} as bareword colon lbrace int rbrace', () => {
      expect(kinds('coin:{5}')).toEqual([
        'bareword',
        'colon',
        'lbrace',
        'int',
        'rbrace',
      ]);
    });

    it('lexes coin:{*} as bareword colon lbrace star rbrace', () => {
      expect(kinds('coin:{*}')).toEqual([
        'bareword',
        'colon',
        'lbrace',
        'star',
        'rbrace',
      ]);
    });

    it('does not change path lexing — /obj/* still lexes as a single path token', () => {
      expect(kinds('/obj/*')).toEqual(['path']);
    });
  });
});
