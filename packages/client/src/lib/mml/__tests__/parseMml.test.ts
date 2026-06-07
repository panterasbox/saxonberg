/**
 * Coverage for the nested-aware MML parser. Acceptance #7, #9 ride
 * this file; the renderer-level integration tests live alongside
 * `MmlRenderer.tsx`.
 */

import { describe, it, expect } from 'vitest';
import { parseMml, decodeEntities, type MmlNode } from '../parseMml';

function tag(t: string, children: MmlNode[] = [], attrs: Record<string, string> = {}): MmlNode {
  return { kind: 'tag', tag: t, attrs, children };
}

function text(s: string): MmlNode {
  return { kind: 'text', text: s };
}

describe('parseMml — basic shapes', () => {
  it('empty input → empty tree', () => {
    expect(parseMml('')).toEqual([]);
  });

  it('plain text passes through as a single text node', () => {
    expect(parseMml('hello world')).toEqual([text('hello world')]);
  });

  it('flat tag wraps text content', () => {
    expect(parseMml('<name>Alice</name>')).toEqual([
      tag('name', [text('Alice')]),
    ]);
  });

  it('tag with attributes parses attrs', () => {
    expect(parseMml('<name stuff-id="s_42">Alice</name>')).toEqual([
      tag('name', [text('Alice')], { 'stuff-id': 's_42' }),
    ]);
  });

  it('hyphenated attribute names parse correctly', () => {
    // Regression guard: the old regex `\w+` split `stuff-id="X"` into
    // a bare `id` attribute and dropped the prefix.
    const parsed = parseMml('<item stuff-id="s_1" data-rare="true">x</item>');
    expect(parsed[0]).toMatchObject({
      kind: 'tag',
      tag: 'item',
      attrs: { 'stuff-id': 's_1', 'data-rare': 'true' },
    });
  });
});

describe('parseMml — nested (acceptance #7)', () => {
  it('handles nested tag inside identity tag', () => {
    // The regression case from MmlRenderer.tsx's TODO comment:
    // `Mml.compose\`<item>${Mml.quantity(5)} apples</item>\``
    // would expand to roughly `<item><quantity>5</quantity> apples</item>`.
    const parsed = parseMml('<item stuff-id="X"><quantity>5</quantity> apples</item>');
    expect(parsed).toEqual([
      tag(
        'item',
        [
          tag('quantity', [text('5')]),
          text(' apples'),
        ],
        { 'stuff-id': 'X' },
      ),
    ]);
  });

  it('handles deep nesting', () => {
    const parsed = parseMml(
      '<msg>hello, <strong>brave <em>new</em> world</strong>!</msg>',
    );
    expect(parsed).toEqual([
      tag('msg', [
        text('hello, '),
        tag('strong', [
          text('brave '),
          tag('em', [text('new')]),
          text(' world'),
        ]),
        text('!'),
      ]),
    ]);
  });
});

describe('parseMml — entity decoding (acceptance #9)', () => {
  it('decodes all five MML entities in text content', () => {
    expect(parseMml('&lt;&gt;&amp;&quot;&apos;')).toEqual([
      text(`<>&"'`),
    ]);
  });

  it('decodes entities in attribute values', () => {
    const parsed = parseMml('<a href="x&amp;y">label</a>');
    expect(parsed[0]).toMatchObject({
      kind: 'tag',
      tag: 'a',
      attrs: { href: 'x&y' },
    });
  });

  it('decodes the &amp; entity LAST so &amp;lt; survives as literal &lt;', () => {
    // Mirrors the entity-replacement-order rule from the old renderer.
    expect(decodeEntities('&amp;lt;')).toBe('&lt;');
  });
});

describe('parseMml — tolerance', () => {
  it('tolerates unclosed tags by treating remaining input as text', () => {
    // The trailing "more" is inside the unclosed `<x>` body; the
    // parser swallows it as the tag's children since there's no
    // matching close.
    const parsed = parseMml('<x>some');
    expect(parsed).toEqual([tag('x', [text('some')])]);
  });

  it('drops unbalanced close-tags silently', () => {
    expect(parseMml('hello</wat>world')).toEqual([
      text('hello'),
      text('world'),
    ]);
  });

  it('handles malformed tag (missing >) as text', () => {
    expect(parseMml('a < b')).toEqual([text('a < b')]);
  });

  it('tag and attribute names lowercase', () => {
    const parsed = parseMml('<NAME Stuff-Id="x">A</NAME>');
    expect(parsed[0]).toMatchObject({
      kind: 'tag',
      tag: 'name',
      // attribute names retain raw case (no transformation)
      attrs: { 'Stuff-Id': 'x' },
    });
  });
});
