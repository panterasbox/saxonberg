/**
 * Tests for Mml composer.
 */

import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/character/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Plain extends Stuff {}
class NamedThing extends NamedMixin(Stuff) {}
class VisibleThing extends VisibleMixin(Stuff) {}

describe('Mml.compose', () => {
  it('emits literal text verbatim', () => {
    const m = Mml.compose`hello world`;
    expect(m.toString()).toBe('hello world');
  });

  it('escapes raw string interpolations', () => {
    const evil = '<script>alert("xss")</script>';
    const m = Mml.compose`text: ${evil}`;
    expect(m.toString()).toBe(
      'text: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes the five reserved characters', () => {
    const m = Mml.compose`${'<>&"\''}`;
    expect(m.toString()).toBe('&lt;&gt;&amp;&quot;&apos;');
  });

  it('emits Mml fragments verbatim without re-escaping', () => {
    const fragment = Mml.fromMarkup('<name>Alice</name>');
    const m = Mml.compose`hi ${fragment}!`;
    expect(m.toString()).toBe('hi <name>Alice</name>!');
  });

  it('coerces numbers and booleans then escapes', () => {
    const m = Mml.compose`n=${42} b=${true}`;
    expect(m.toString()).toBe('n=42 b=true');
  });

  it('treats null and undefined as empty', () => {
    const m = Mml.compose`a${null}b${undefined}c`;
    expect(m.toString()).toBe('abc');
  });

  it('calls toMml() on objects when present', () => {
    const obj = {
      toMml: () => Mml.fromMarkup('<custom>X</custom>'),
    };
    const m = Mml.compose`${obj}`;
    expect(m.toString()).toBe('<custom>X</custom>');
  });
});

describe('Mml.fromMarkup', () => {
  it('does not escape input', () => {
    const m = Mml.fromMarkup('<name>Alice</name>');
    expect(m.toString()).toBe('<name>Alice</name>');
  });
});

describe('Mml vocabulary helpers', () => {
  it('Mml.name uses DescribeApi.getDisplayName', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.firstName = 'Alice';
    obj.lastName = 'Smith';
    expect(Mml.name(obj).toString()).toBe('<name>Alice Smith</name>');
  });

  it('Mml.name escapes chars in the resolved display name', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.shortDescription = 'a "quoted" sword';
    expect(Mml.name(obj).toString()).toBe(
      '<name>a &quot;quoted&quot; sword</name>'
    );
  });

  it('Mml.name falls back to "something"', () => {
    const obj = makeStuff(() => new Plain());
    expect(Mml.name(obj).toString()).toBe('<name>something</name>');
  });

  it('Mml.speech wraps text in quoted speech tags and escapes', () => {
    expect(Mml.speech('hi <there>').toString()).toBe(
      '<speech>"hi &lt;there&gt;"</speech>'
    );
  });

  it('Mml.direction wraps and escapes', () => {
    expect(Mml.direction('north').toString()).toBe(
      '<direction>north</direction>'
    );
  });

  it('Mml.list with no items emits "nothing"', () => {
    expect(Mml.list([]).toString()).toBe('nothing');
  });

  it('Mml.list with one item emits it as-is', () => {
    expect(Mml.list([Mml.fromMarkup('<x>A</x>')]).toString()).toBe('<x>A</x>');
  });

  it('Mml.list with two items joins with "and"', () => {
    expect(
      Mml.list([
        Mml.fromMarkup('<x>A</x>'),
        Mml.fromMarkup('<x>B</x>'),
      ]).toString()
    ).toBe('<x>A</x> and <x>B</x>');
  });

  it('Mml.list with three+ items uses Oxford comma', () => {
    expect(
      Mml.list([
        Mml.fromMarkup('<x>A</x>'),
        Mml.fromMarkup('<x>B</x>'),
        Mml.fromMarkup('<x>C</x>'),
      ]).toString()
    ).toBe('<x>A</x>, <x>B</x>, and <x>C</x>');
  });
});

describe('Mml.toJSON', () => {
  it('serializes to its raw string', () => {
    const m = Mml.compose`hello ${'<x>'}`;
    expect(JSON.stringify({ body: m })).toBe(
      '{"body":"hello &lt;x&gt;"}'
    );
  });
});

describe('Mml.stripTags', () => {
  it('strips simple tags', () => {
    expect(Mml.stripTags('<name>Alice</name>')).toBe('Alice');
  });

  it('strips nested tags', () => {
    expect(Mml.stripTags('<a><b>x</b><c>y</c></a>')).toBe('xy');
  });

  it('decodes the five built-in entities', () => {
    expect(Mml.stripTags('a &lt; b &gt; c &amp; d &quot;e&quot; &apos;f&apos;')).toBe(
      "a < b > c & d \"e\" 'f'"
    );
  });

  it('passes through ampersands that are not entities', () => {
    expect(Mml.stripTags('Q&A')).toBe('Q&A');
    expect(Mml.stripTags('&unknown;')).toBe('&unknown;');
  });

  it('tolerates an unclosed tag', () => {
    expect(Mml.stripTags('hello <broken')).toBe('hello ');
  });

  it('handles plain text unchanged', () => {
    expect(Mml.stripTags('plain text')).toBe('plain text');
  });
});

describe('Mml — escaping precedence', () => {
  it('re-escapes string args to vocabulary helpers (no markup pass-through)', () => {
    // Per requirements §7.1 — vocabulary helpers always escape strings.
    expect(Mml.direction('<bogus>').toString()).toBe(
      '<direction>&lt;bogus&gt;</direction>'
    );
  });

  it('Mml.compose preserves Mml fragment identity through nested compose', () => {
    const inner = Mml.compose`${'<raw>'}`;
    expect(inner.toString()).toBe('&lt;raw&gt;');
    const outer = Mml.compose`hi ${inner}`;
    expect(outer.toString()).toBe('hi &lt;raw&gt;');
  });
});

describe('Mml.format', () => {
  it('substitutes a single named placeholder', () => {
    expect(Mml.format('Hello {name}!', { name: 'world' }).toString()).toBe(
      'Hello world!'
    );
  });

  it('substitutes multiple placeholders', () => {
    expect(Mml.format('{a} and {b}', { a: 'one', b: 'two' }).toString()).toBe(
      'one and two'
    );
  });

  it('escapes raw string substitutions (same as Mml.compose)', () => {
    expect(Mml.format('say {what}', { what: '<bad>' }).toString()).toBe(
      'say &lt;bad&gt;'
    );
  });

  it('emits Mml fragment substitutions verbatim', () => {
    expect(
      Mml.format('hi {who}', {
        who: Mml.fromMarkup('<name>Alice</name>'),
      }).toString()
    ).toBe('hi <name>Alice</name>');
  });

  it('coerces numbers and booleans then escapes', () => {
    expect(Mml.format('n={n} b={b}', { n: 42, b: true }).toString()).toBe(
      'n=42 b=true'
    );
  });

  it('treats unrecognised names as empty', () => {
    expect(Mml.format('a={x} b={missing}', { x: 'X' }).toString()).toBe(
      'a=X b='
    );
  });

  it('treats null and undefined values as empty', () => {
    expect(
      Mml.format('a{a}b{b}c', { a: null, b: undefined }).toString()
    ).toBe('abc');
  });

  it('emits literal markup verbatim (template content is authored)', () => {
    expect(
      Mml.format('<wrap>before {x} after</wrap>', { x: 'X' }).toString()
    ).toBe('<wrap>before X after</wrap>');
  });

  it('tolerates an unclosed placeholder by emitting it literally', () => {
    expect(Mml.format('hello {broken', {}).toString()).toBe('hello {broken');
  });

  it('handles a placeholder at the very start and end', () => {
    expect(
      Mml.format('{greet}, {name}', { greet: 'Hi', name: 'Bob' }).toString()
    ).toBe('Hi, Bob');
  });

  it('handles two adjacent placeholders', () => {
    expect(Mml.format('{a}{b}', { a: 'x', b: 'y' }).toString()).toBe('xy');
  });

  it('returns an Mml that round-trips through JSON.stringify', () => {
    expect(JSON.stringify({ body: Mml.format('hi {what}', { what: '<x>' }) }))
      .toBe('{"body":"hi &lt;x&gt;"}');
  });

  it('calls toMml() on objects when present', () => {
    const obj = { toMml: () => Mml.fromMarkup('<custom>X</custom>') };
    expect(Mml.format('got {it}', { it: obj }).toString()).toBe(
      'got <custom>X</custom>'
    );
  });

  it('passes through empty templates and templates without placeholders', () => {
    expect(Mml.format('', {}).toString()).toBe('');
    expect(Mml.format('plain text', {}).toString()).toBe('plain text');
  });
});
