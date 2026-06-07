/**
 * `Mml.markdownToMml` — Discord-dialect subset parser. Covers:
 *  - Emphasis (`**bold**`, `*italic*` / `_italic_`, `` `code` ``,
 *    ` ```block``` `, `> quote`, `- list`, `~~strike~~`).
 *  - In-world refs via `[label](URI)` with the three custom schemes;
 *    external URLs / unknown schemes strip URI, keep label.
 *  - Mention resolution (`@<word>`) via the supplied resolver.
 *
 * Acceptance criteria gated: #10, #11, #12, #13, #15, #16, #17, #18.
 */

import { describe, it, expect } from 'vitest';
import { Mml, type MentionResolver } from '../mml';
import { Idea } from '../../lib/stuff/Idea';
import { NamedMixin } from '../../lib/description/Named';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

class NamedThing extends NamedMixin(Idea) {}

function makeNamed(name: string): Stuff {
  const s = makeStuff(() => new NamedThing());
  (s as InstanceType<typeof NamedThing>).setName(name);
  return s;
}

/**
 * Bag-of-Stuff resolver, used so tests can assert mention behavior
 * without spinning up the chat or perceiver substrates.
 */
function resolverOver(...participants: Stuff[]): MentionResolver {
  return Mml.channelMentionResolver(participants);
}

describe('Mml.markdownToMml — Discord emphasis subset', () => {
  it('**bold** wraps in <strong>', () => {
    expect(Mml.markdownToMml('**hello**').toString()).toBe(
      '<strong>hello</strong>',
    );
  });

  it('*italic* and _italic_ both wrap in <em>', () => {
    expect(Mml.markdownToMml('*hi*').toString()).toBe('<em>hi</em>');
    expect(Mml.markdownToMml('_hi_').toString()).toBe('<em>hi</em>');
  });

  it('`code` wraps in <code> and is opaque to other transforms', () => {
    expect(Mml.markdownToMml('`look **bold**`').toString()).toBe(
      '<code>look **bold**</code>',
    );
  });

  it('```block``` wraps in <pre>', () => {
    expect(Mml.markdownToMml('```\nfoo\nbar\n```').toString()).toBe(
      '<pre>\nfoo\nbar\n</pre>',
    );
  });

  it('~~strike~~ wraps in <strike>', () => {
    expect(Mml.markdownToMml('~~gone~~').toString()).toBe(
      '<strike>gone</strike>',
    );
  });

  it('> quote wraps consecutive lines in <blockquote>', () => {
    expect(
      Mml.markdownToMml('> first\n> second\nnot quote').toString(),
    ).toBe('<blockquote>first\nsecond</blockquote>\nnot quote');
  });

  it('- list and 1. list wrap consecutive lines in <list>', () => {
    expect(Mml.markdownToMml('- apple\n- banana').toString()).toBe(
      '<list><li>apple</li><li>banana</li></list>',
    );
    expect(Mml.markdownToMml('1. first\n2. second').toString()).toBe(
      '<list ordered="true"><li>first</li><li>second</li></list>',
    );
  });
});

describe('Mml.markdownToMml — round-trip through flatten (acceptance #10, #11)', () => {
  it('emphasis subset round-trips through compose → MML → flatten → markdown', () => {
    const md = '**bold** *italic* `code` ~~strike~~';
    const back = Mml.flatten(Mml.markdownToMml(md).toString());
    expect(back).toBe(md);
  });

  it('code block round-trips', () => {
    const md = '```\nfoo\n```';
    const back = Mml.flatten(Mml.markdownToMml(md).toString());
    expect(back).toBe(md);
  });
});

describe('Mml.markdownToMml — link handling (#12, #13, #15, #16)', () => {
  it('[label](mudcmd:…) compiles to a clickable <link>', () => {
    expect(Mml.markdownToMml('[X](mudcmd:look%20sword)').toString()).toBe(
      '<link href="mudcmd:look%20sword">X</link>',
    );
  });

  it('[label](mudref:…) compiles to a stuff-ref <link>', () => {
    expect(Mml.markdownToMml('[the sword](mudref:s_42)').toString()).toBe(
      '<link href="mudref:s_42">the sword</link>',
    );
  });

  it('[label](mudq:…) compiles to a query <link> (renderer paints inert)', () => {
    expect(Mml.markdownToMml('[guards](mudq:guard%20in%20here)').toString()).toBe(
      '<link href="mudq:guard%20in%20here">guards</link>',
    );
  });

  it('[evil](https://attacker.com) strips the URI; label survives', () => {
    expect(Mml.markdownToMml('[evil](https://attacker.com)').toString()).toBe(
      'evil',
    );
  });

  it('[bogus](javascript:alert(1)) strips the URI', () => {
    expect(Mml.markdownToMml('[bogus](javascript:alert(1))').toString()).toBe(
      'bogus',
    );
  });
});

describe('Mml.markdownToMml — mentions (#17, #18)', () => {
  it('@Word with a matching resolver target emits <mention>', () => {
    const alice = makeNamed('Alice');
    const out = Mml.markdownToMml('hi @Alice', resolverOver(alice)).toString();
    expect(out).toBe(
      `hi <mention stuff-id="${alice.stuffId}">@Alice</mention>`,
    );
  });

  it('@Word with no match leaves the literal text', () => {
    const out = Mml.markdownToMml(
      'hi @Nobody',
      resolverOver(makeNamed('Alice')),
    ).toString();
    expect(out).toBe('hi @Nobody');
  });

  it('no resolver supplied leaves @ refs as literal text', () => {
    expect(Mml.markdownToMml('hi @whoever').toString()).toBe('hi @whoever');
  });

  it('mention match is case-insensitive on the head word', () => {
    const alice = makeNamed('Alice Smallberries');
    const out = Mml.markdownToMml('@alice', resolverOver(alice)).toString();
    expect(out).toBe(
      `<mention stuff-id="${alice.stuffId}">@alice</mention>`,
    );
  });

  it('email-like @ in a word is not a mention', () => {
    expect(Mml.markdownToMml('mailto:foo@example.com').toString()).toBe(
      'mailto:foo@example.com',
    );
  });
});

describe('Mml.markdownToMml — escape safety', () => {
  it('escapes raw <, >, & in user prose', () => {
    expect(Mml.markdownToMml('<script>').toString()).toBe(
      '&lt;script&gt;',
    );
  });

  it('does not double-escape inside an emphasis span', () => {
    expect(Mml.markdownToMml('**<x>**').toString()).toBe(
      '<strong>&lt;x&gt;</strong>',
    );
  });
});
