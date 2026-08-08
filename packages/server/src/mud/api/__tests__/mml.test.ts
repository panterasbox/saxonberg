/**
 * Tests for Mml composer.
 */

import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';
import { isKnownTag } from '../mml/tags';
import { NamedMixin } from '../../lib/description/Named';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

class Plain extends Idea {}
class NamedThing extends NamedMixin(Idea) {}

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

  it('escapes the four MML-structural characters; passes apostrophe through', () => {
    // Apostrophe is intentionally NOT escaped — it carries no
    // structural meaning in MML text content or `"..."` attribute
    // values, and emitting `&apos;` shows up as literal in clients
    // that haven't shipped MML parsing yet.
    const m = Mml.compose`${'<>&"\''}`;
    expect(m.toString()).toBe(`&lt;&gt;&amp;&quot;'`);
  });

  it('emits Mml fragments verbatim without re-escaping', () => {
    const fragment = Mml.fromMarkup('<player>Alice</player>');
    const m = Mml.compose`hi ${fragment}!`;
    expect(m.toString()).toBe('hi <player>Alice</player>!');
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
    const m = Mml.fromMarkup('<player>Alice</player>');
    expect(m.toString()).toBe('<player>Alice</player>');
  });
});

describe('Mml vocabulary helpers', () => {
  it('Mml.actor returns the casual register (just `name`) and stamps stuff-id', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('Alice');
    obj.setSurname('Smith');
    // Casual register — surname not included. Call `obj.getFullName()`
    // when you need the formal form.
    expect(Mml.actor(obj).toString()).toBe(
      `<thing stuff-id="${obj.stuffId}">Alice</thing>`
    );
  });

  it('Mml.actor escapes chars in the casual name', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('a "quoted" name');
    expect(Mml.actor(obj).toString()).toBe(
      `<thing stuff-id="${obj.stuffId}">a &quot;quoted&quot; name</thing>`
    );
  });

  it('Mml.actor falls back to "something" when no name set', () => {
    const obj = makeStuff(() => new Plain());
    expect(Mml.actor(obj).toString()).toBe(
      `<thing stuff-id="${obj.stuffId}">something</thing>`
    );
  });

  it('⭐ Mml.actor handed a non-person renders `thing`, never `npc`', () => {
    // The honest-failure guarantee. `actor` is the face ~120 emitters
    // use because they hold a `giver` and cannot know what is behind
    // it; the one thing it must never do is upgrade a chair to a
    // character. A `NamedThing` composes no `Organism`, so `kindOf`
    // stops at the first gate.
    const chair = makeStuff(() => new NamedThing());
    chair.setName('a wooden chair');
    expect(Mml.actor(chair).toString()).toContain('<thing ');
    expect(Mml.actor(chair).toString()).not.toContain('<npc');
    expect(Mml.actor(chair).toString()).not.toContain('<player');
  });

  it('⚠ `actor` is never itself a wire tag', () => {
    // It is an authoring face that resolves before serialization. If it
    // ever reached the wire, every consumer downstream — parser, policy,
    // stylesheet, renderer — would need a branch for it.
    const obj = makeStuff(() => new NamedThing());
    obj.setName('Alice');
    expect(Mml.actor(obj).toString()).not.toContain('actor');
    expect(isKnownTag('actor')).toBe(false);
  });

  it('Mml.thing / Mml.location stamp stuff-id and use the casual `name`', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('rusty sword');
    expect(Mml.thing(obj).toString()).toBe(
      `<thing stuff-id="${obj.stuffId}">rusty sword</thing>`
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

  it('Mml.exit emits clickable exit affordance with dir + stuff-id', () => {
    // Minimal Exit stub — only the surface Mml.exit consults.
    const exit = {
      stuffId: 'exit-abc',
      getDirection: () => 'north',
    } as unknown as import('../../lib/boundary/Exit').default;
    expect(Mml.exit(exit).toString()).toBe(
      '<exit dir="north" stuff-id="exit-abc">north</exit>'
    );
  });

  it('Mml.exit escapes direction values that contain reserved chars', () => {
    const exit = {
      stuffId: 'exit-xyz',
      getDirection: () => '<bogus>',
    } as unknown as import('../../lib/boundary/Exit').default;
    expect(Mml.exit(exit).toString()).toBe(
      '<exit dir="&lt;bogus&gt;" stuff-id="exit-xyz">&lt;bogus&gt;</exit>'
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
    expect(Mml.stripTags('<player>Alice</player>')).toBe('Alice');
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
      Mml.stripTags('<player stuff-id="abc123">Alice</player>')
    ).toBe('Alice');
    expect(
      Mml.stripTags(
        'hi <player stuff-id="x">A</player> meet <player stuff-id="y">B</player>'
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

describe('Mml.compose — lazy evaluation (Step B)', () => {
  it('defers value materialization to toString', () => {
    let calls = 0;
    const value = {
      toMml: () => {
        calls += 1;
        return Mml.fromMarkup('<x>v</x>');
      },
    };
    const m = Mml.compose`a ${value} b`;
    // Composition is lazy: nothing rendered until toString.
    expect(calls).toBe(0);
    expect(m.toString()).toBe('a <x>v</x> b');
    expect(calls).toBe(1);
    // Re-rendering re-invokes — that's the per-recipient seam.
    m.toString();
    expect(calls).toBe(2);
  });

  it('threads viewer through to toMml on values', () => {
    const seen: unknown[] = [];
    const value = {
      toMml: (viewer?: unknown) => {
        seen.push(viewer);
        return Mml.fromMarkup(`<seen>${viewer ? 'with' : 'no'}</seen>`);
      },
    };
    const m = Mml.compose`hi ${value}`;
    const fakeViewer = { stuffId: 'v-1' } as unknown as Parameters<
      typeof m.toString
    >[0];
    expect(m.toString()).toBe('hi <seen>no</seen>');
    expect(m.toString(fakeViewer)).toBe('hi <seen>with</seen>');
    expect(seen).toEqual([undefined, fakeViewer]);
  });

  it('threads viewer through nested Mml.compose', () => {
    const value = {
      toMml: (viewer?: { stuffId?: string }) =>
        Mml.fromMarkup(`<v>${viewer?.stuffId ?? 'none'}</v>`),
    };
    const inner = Mml.compose`leaf:${value}`;
    const outer = Mml.compose`outer{${inner}}`;
    const v = { stuffId: 'r-1' } as unknown as Parameters<
      typeof outer.toString
    >[0];
    expect(outer.toString(v)).toBe('outer{leaf:<v>r-1</v>}');
  });

  it('toJSON snapshots without a viewer', () => {
    const value = {
      toMml: (viewer?: { stuffId?: string }) =>
        Mml.fromMarkup(`<v>${viewer?.stuffId ?? 'none'}</v>`),
    };
    const m = Mml.compose`x:${value}`;
    expect(JSON.stringify(m)).toBe('"x:<v>none</v>"');
  });

  it('eager fromMarkup ignores viewer', () => {
    const m = Mml.fromMarkup('<x>raw</x>');
    const v = { stuffId: 'v-1' } as unknown as Parameters<
      typeof m.toString
    >[0];
    expect(m.toString()).toBe('<x>raw</x>');
    expect(m.toString(v)).toBe('<x>raw</x>');
  });
});

