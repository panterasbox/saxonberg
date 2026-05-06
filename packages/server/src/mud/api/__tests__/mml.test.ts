/**
 * Tests for Mml composer.
 */

import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

class Plain extends Idea {}
class NamedThing extends NamedMixin(Idea) {}
class VisibleThing extends VisibleMixin(Idea) {}

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
  it('Mml.name returns the casual register (just `name`) and stamps stuff-id', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('Alice');
    obj.setSurname('Smith');
    // Casual register — surname not included. Call `obj.getFullName()`
    // when you need the formal form.
    expect(Mml.name(obj).toString()).toBe(
      `<name stuff-id="${obj.stuffId}">Alice</name>`
    );
  });

  it('Mml.name escapes chars in the casual name', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('a "quoted" name');
    expect(Mml.name(obj).toString()).toBe(
      `<name stuff-id="${obj.stuffId}">a &quot;quoted&quot; name</name>`
    );
  });

  it('Mml.name falls back to "something" when no name set', () => {
    const obj = makeStuff(() => new Plain());
    expect(Mml.name(obj).toString()).toBe(
      `<name stuff-id="${obj.stuffId}">something</name>`
    );
  });

  it('Mml.object / Mml.item / Mml.location stamp stuff-id and use the casual `name`', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('rusty sword');
    expect(Mml.object(obj).toString()).toBe(
      `<object stuff-id="${obj.stuffId}">rusty sword</object>`
    );
    expect(Mml.item(obj).toString()).toBe(
      `<item stuff-id="${obj.stuffId}">rusty sword</item>`
    );
    expect(Mml.location(obj).toString()).toBe(
      `<location stuff-id="${obj.stuffId}">rusty sword</location>`
    );
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

  it('strips tags with attributes (e.g. stuff-id)', () => {
    expect(
      Mml.stripTags('<name stuff-id="abc123">Alice</name>')
    ).toBe('Alice');
    expect(
      Mml.stripTags(
        'hi <name stuff-id="x">A</name> meet <name stuff-id="y">B</name>'
      )
    ).toBe('hi A meet B');
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

