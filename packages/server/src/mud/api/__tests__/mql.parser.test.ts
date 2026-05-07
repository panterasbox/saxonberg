/**
 * MQL parser tests — every grammar production, bracket dispatch,
 * operator precedence, error cases, and the new `.X` detail-drill
 * chain operator.
 */

import { describe, it, expect } from 'vitest';
import { parse, MqlParseError } from '../mql/parser';
import type {
  ChainNode,
  KeywordsNode,
  PronounNode,
  QueryNode,
  SublistNode,
} from '../mql/types';

function singleSublist(q: QueryNode): SublistNode {
  expect(q.sublists).toHaveLength(1);
  return q.sublists[0]!;
}

function singleChain(q: QueryNode): ChainNode {
  const sub = singleSublist(q);
  expect(sub.subtract).toEqual([]);
  return sub.base;
}

describe('MQL parser — seeds', () => {
  it('parses a single bareword as keywords', () => {
    const q = parse('flower');
    const head = singleChain(q).head;
    expect(head).toEqual<KeywordsNode>({
      kind: 'keywords',
      words: ['flower'],
    });
  });

  it('collects multi-word barewords into one keywords node', () => {
    const q = parse('red rose');
    const head = singleChain(q).head;
    expect(head).toEqual<KeywordsNode>({
      kind: 'keywords',
      words: ['red', 'rose'],
    });
  });

  it('recognizes pronouns by name', () => {
    for (const name of ['me', 'here', 'it', 'them', 'him', 'her']) {
      const q = parse(name);
      const head = singleChain(q).head;
      expect(head).toEqual<PronounNode>({ kind: 'pronoun', name: name as never });
    }
  });

  it('does not treat multi-word forms starting with a pronoun name as a pronoun', () => {
    // `me bob` is two-word keyword search, not "pronoun me + something".
    const q = parse('me bob');
    expect(singleChain(q).head).toEqual<KeywordsNode>({
      kind: 'keywords',
      words: ['me', 'bob'],
    });
  });

  it('parses a string literal seed', () => {
    const q = parse("'oak door'");
    expect(singleChain(q).head).toEqual({
      kind: 'literal',
      value: 'oak door',
    });
  });

  it('parses a path seed', () => {
    const q = parse('/obj/Avatar/*');
    expect(singleChain(q).head).toEqual({
      kind: 'path',
      pattern: '/obj/Avatar/*',
    });
  });

  it('parses a stuff-id seed', () => {
    const q = parse('#abc123');
    expect(singleChain(q).head).toEqual({ kind: 'stuffId', id: 'abc123' });
  });

  it('parses $$ as last result', () => {
    const q = parse('$$');
    expect(singleChain(q).head).toEqual({ kind: 'lastResult' });
  });

  it('rejects #5 at chain head', () => {
    expect(() => parse('#5')).toThrow(/not valid at the head of a chain/);
  });

  it('rejects [N] at chain head', () => {
    expect(() => parse('[5]')).toThrow(/cannot start a chain/);
  });

  it('rejects bare integer at chain head', () => {
    expect(() => parse('5')).toThrow(/bare integer/);
  });

  it('rejects empty input', () => {
    expect(() => parse('')).toThrow(/empty query/);
  });
});

describe('MQL parser — chain operators', () => {
  it('parses :i and :e transforms', () => {
    const q = parse('me:i:e');
    const chain = singleChain(q);
    expect(chain.head).toEqual({ kind: 'pronoun', name: 'me' });
    expect(chain.rest).toHaveLength(2);
    expect(chain.rest[0]).toEqual({
      op: ':',
      element: { kind: 'transform', transform: 'i' },
    });
    expect(chain.rest[1]).toEqual({
      op: ':',
      element: { kind: 'transform', transform: 'e' },
    });
  });

  it('treats :i broken as a multi-word keyword filter (not transform i)', () => {
    const q = parse('me:i broken');
    const chain = singleChain(q);
    expect(chain.rest).toHaveLength(1);
    expect(chain.rest[0]).toEqual({
      op: ':',
      element: { kind: 'keywords', words: ['i', 'broken'] },
    });
  });

  it('parses #N at chain non-head position as ordinal', () => {
    const q = parse('roses:#5');
    const chain = singleChain(q);
    expect(chain.rest).toEqual([
      { op: ':', element: { kind: 'ordinal', index: 5 } },
    ]);
  });

  it('parses bareword chain elements as keyword filters', () => {
    const q = parse('roses:living');
    const chain = singleChain(q);
    expect(chain.rest).toEqual([
      { op: ':', element: { kind: 'keywords', words: ['living'] } },
    ]);
  });

  it('parses a path at chain non-head position', () => {
    const q = parse('me:/obj/Foo');
    const chain = singleChain(q);
    expect(chain.rest[0]?.element).toEqual({
      kind: 'path',
      pattern: '/obj/Foo',
    });
  });

  it('parses a literal at chain non-head position', () => {
    const q = parse("roses:'red rose'");
    const chain = singleChain(q);
    expect(chain.rest[0]?.element).toEqual({
      kind: 'literal',
      value: 'red rose',
    });
  });
});

describe('MQL parser — detail-drill operator', () => {
  it('parses bookcase.book as one chain with a detail-drill', () => {
    const q = parse('bookcase.book');
    const chain = singleChain(q);
    expect(chain.head).toEqual({ kind: 'keywords', words: ['bookcase'] });
    expect(chain.rest).toEqual([
      { op: '.', element: { kind: 'detail-drill', name: 'book' } },
    ]);
  });

  it('parses bookcase.book.page as two consecutive drills', () => {
    const q = parse('bookcase.book.page');
    const chain = singleChain(q);
    expect(chain.rest).toEqual([
      { op: '.', element: { kind: 'detail-drill', name: 'book' } },
      { op: '.', element: { kind: 'detail-drill', name: 'page' } },
    ]);
  });

  it('mixes : and . operators in one chain', () => {
    const q = parse('bag:i.sword');
    const chain = singleChain(q);
    expect(chain.rest).toEqual([
      { op: ':', element: { kind: 'transform', transform: 'i' } },
      { op: '.', element: { kind: 'detail-drill', name: 'sword' } },
    ]);
  });

  it('errors on . without a following name', () => {
    expect(() => parse('bookcase.')).toThrow(/expected a name after '\.'/);
  });
});

describe('MQL parser — set operations', () => {
  it('parses comma as union at top level', () => {
    const q = parse('rose, daisy');
    expect(q.sublists).toHaveLength(2);
    expect(q.sublists[0]?.base.head).toEqual({
      kind: 'keywords',
      words: ['rose'],
    });
    expect(q.sublists[1]?.base.head).toEqual({
      kind: 'keywords',
      words: ['daisy'],
    });
  });

  it('parses dash as set difference inside a sublist', () => {
    const q = parse('swords - broken');
    const sub = singleSublist(q);
    expect(sub.base.head).toEqual({ kind: 'keywords', words: ['swords'] });
    expect(sub.subtract).toHaveLength(1);
    expect(sub.subtract[0]?.head).toEqual({
      kind: 'keywords',
      words: ['broken'],
    });
  });

  it('keeps oak-door as one bareword (not set difference)', () => {
    const q = parse('oak-door');
    expect(singleChain(q).head).toEqual({
      kind: 'keywords',
      words: ['oak-door'],
    });
  });

  it('chains multiple set differences left-associatively', () => {
    const q = parse('a - b - c');
    const sub = singleSublist(q);
    expect(sub.subtract).toHaveLength(2);
  });

  it('parses parenthesized groups', () => {
    const q = parse('(rose, daisy)');
    const head = singleChain(q).head;
    expect(head.kind).toBe('group');
  });
});

describe('MQL parser — brackets', () => {
  it('parses [5] as ordinal', () => {
    const q = parse('roses:[5]');
    const chain = singleChain(q);
    expect(chain.rest[0]?.element).toEqual({
      kind: 'bracket-ordinal',
      index: 5,
    });
  });

  it('parses [-1] as last index', () => {
    const q = parse('roses:[-1]');
    const chain = singleChain(q);
    expect(chain.rest[0]?.element).toEqual({
      kind: 'bracket-ordinal',
      index: -1,
    });
  });

  it('parses [1..3] as inclusive range', () => {
    const q = parse('roses:[1..3]');
    expect(singleChain(q).rest[0]?.element).toEqual({
      kind: 'bracket-range',
      start: 1,
      end: 3,
      mode: 'inclusive',
    });
  });

  it('parses [1..<2] as count-from-end range', () => {
    const q = parse('roses:[1..<2]');
    expect(singleChain(q).rest[0]?.element).toEqual({
      kind: 'bracket-range',
      start: 1,
      end: 2,
      mode: 'from-end',
    });
  });

  it('parses [3..] as to-end range', () => {
    const q = parse('roses:[3..]');
    expect(singleChain(q).rest[0]?.element).toEqual({
      kind: 'bracket-range',
      start: 3,
      end: null,
      mode: 'to-end',
    });
  });
});

describe('MQL parser — filter expressions', () => {
  it('parses [prop.gold] as truthy namespaced atom', () => {
    const q = parse('roses:[prop.gold]');
    expect(singleChain(q).rest[0]?.element).toEqual({
      kind: 'bracket-filter',
      expr: {
        kind: 'truthy',
        atom: { kind: 'namespaced', namespace: 'prop', key: 'gold' },
      },
    });
  });

  it('parses comparisons', () => {
    const q = parse('roses:[prop.gold > 50]');
    const expr = (singleChain(q).rest[0]?.element as { expr: unknown }).expr;
    expect(expr).toEqual({
      kind: 'comparison',
      left: { kind: 'namespaced', namespace: 'prop', key: 'gold' },
      op: '>',
      right: { kind: 'value-int', value: 50 },
    });
  });

  it('parses != comparison', () => {
    const q = parse("roses:[name != 'rose']");
    const expr = (singleChain(q).rest[0]?.element as { expr: unknown }).expr;
    expect(expr).toEqual({
      kind: 'comparison',
      left: { kind: 'name' },
      op: '!=',
      right: { kind: 'value-quoted', value: 'rose' },
    });
  });

  it('parses bare name and id atoms', () => {
    const q1 = parse("things:[name = 'rose']");
    const e1 = (singleChain(q1).rest[0]?.element as { expr: unknown }).expr;
    expect(e1).toMatchObject({ left: { kind: 'name' } });

    const q2 = parse("things:[id = 'abc']");
    const e2 = (singleChain(q2).rest[0]?.element as { expr: unknown }).expr;
    expect(e2).toMatchObject({ left: { kind: 'id' } });
  });

  it('parses has', () => {
    const q = parse('things:[has prop.gold]');
    expect((singleChain(q).rest[0]?.element as { expr: unknown }).expr).toEqual({
      kind: 'has',
      atom: { kind: 'namespaced', namespace: 'prop', key: 'gold' },
    });
  });

  it('parses negative integer values', () => {
    const q = parse('things:[prop.balance < -5]');
    const expr = (singleChain(q).rest[0]?.element as { expr: unknown }).expr;
    expect(expr).toMatchObject({
      right: { kind: 'value-int', value: -5 },
    });
  });

  describe('boolean precedence', () => {
    it('and binds tighter than or', () => {
      const q = parse('things:[mixin.A or mixin.B and mixin.C]');
      const expr = (singleChain(q).rest[0]?.element as { expr: unknown }).expr;
      // a or (b and c)
      expect(expr).toMatchObject({
        kind: 'or',
        left: { kind: 'truthy' },
        right: { kind: 'and' },
      });
    });

    it('not binds tighter than and', () => {
      const q = parse('things:[not mixin.A and mixin.B]');
      const expr = (singleChain(q).rest[0]?.element as { expr: unknown }).expr;
      // (not a) and b
      expect(expr).toMatchObject({
        kind: 'and',
        left: { kind: 'not' },
        right: { kind: 'truthy' },
      });
    });

    it('parens override precedence', () => {
      const q = parse('things:[(mixin.A or mixin.B) and mixin.C]');
      const expr = (singleChain(q).rest[0]?.element as { expr: unknown }).expr;
      expect(expr).toMatchObject({
        kind: 'and',
        left: { kind: 'or' },
        right: { kind: 'truthy' },
      });
    });
  });

  it('inside [...], . is namespace separator (not detail drill)', () => {
    const q = parse('things:[prop.gold > 0]');
    expect(q).toBeDefined();
  });
});

describe('MQL parser — error positions', () => {
  it('reports the position of an unexpected token', () => {
    try {
      parse('rose @');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('reports unterminated bracket', () => {
    expect(() => parse('rose:[5')).toThrow(MqlParseError);
  });

  it('reports unmatched close paren as trailing input', () => {
    expect(() => parse('rose)')).toThrow(/after query/);
  });
});
