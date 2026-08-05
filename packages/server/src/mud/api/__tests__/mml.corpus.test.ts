/**
 * The MML **regression corpus** — the chat path, pinned byte for byte.
 *
 * `parseMarkdown` runs on every utterance in the game (`say`, `tell`,
 * `dm`, `emote`, channel chat). The wiki build adds an article dialect
 * to the same parser rather than forking it, which is the right call
 * for drift but puts long-form regexes next to the hot path: pipe
 * tables interact with `>` quote runs, and indent-nesting changes what
 * terminates a list run.
 *
 * So this file was **written before the feature**, capturing what the
 * shipped parser did. Every expectation below is a recording, not a
 * judgement — including the ones recording defects (see the link
 * entries). A diff here means chat output changed, which for this
 * build is a failure regardless of whether the new output is nicer.
 *
 * The article dialect's own behaviour is asserted in
 * `mml.longform.test.ts`. Nothing here passes `longForm`.
 */

import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';

/**
 * `[source, expected]`. Recorded from the parser as it stood at
 * `24f5b31c`, before the long-form options bag existed.
 */
const MARKDOWN_CORPUS: ReadonlyArray<readonly [string, string]> = [
  ['hello world', 'hello world'],
  ['**bold**', '<strong>bold</strong>'],
  ['*italic*', '<em>italic</em>'],
  ['_italic_', '<em>italic</em>'],
  ['`code`', '<code>code</code>'],
  ['```block```', '<pre>block</pre>'],
  ['~~strike~~', '<strike>strike</strike>'],
  ['> quoted line', '<blockquote>quoted line</blockquote>'],
  ['> line one\n> line two', '<blockquote>line one\nline two</blockquote>'],
  ['- one\n- two\n- three', '<list><li>one</li><li>two</li><li>three</li></list>'],
  ['1. first\n2. second', '<list ordered="true"><li>first</li><li>second</li></list>'],
  [
    'mixed **bold** and *italic* and `code`',
    // ⚠ RECORDED DEFECT, not a target. The chat dialect's sentinel
    // passthrough copies each space-delimited word verbatim, so an
    // emphasis run that starts mid-line never matches. Only the code
    // span survives, because it was substituted out in Phase 1 before
    // the inline pass ran. The article dialect narrows the passthrough
    // and does not have this behaviour.
    'mixed **bold** and *italic* and <code>code</code>',
  ],
  [
    'a [label](mudcmd:look%20x) link',
    // ⚠ Same recorded defect: a link after a space stays literal.
    'a [label](mudcmd:look%20x) link',
  ],
  ['[X](mudcmd:look%20sword)', '<link href="mudcmd:look%20sword">X</link>'],
  ['an [external](https://example.com) link', 'an [external](https://example.com) link'],
  ['email@addr.com is not a mention', 'email@addr.com is not a mention'],
  ['@Bobalu unresolved mention', '@Bobalu unresolved mention'],
  ['line one\nline two', 'line one\nline two'],
  ['text with <angle> brackets', 'text with &lt;angle&gt; brackets'],
  [`ampersand & quote " apostrophe '`, `ampersand & quote " apostrophe '`],
  ['snake_case_word stays', 'snake_case_word stays'],
  [
    '**bold with *nested italic* inside**',
    '<strong>bold with <em>nested italic</em> inside</strong>',
  ],
  ['trailing asterisk *', 'trailing asterisk *'],
  [
    '- item with **bold**\n- item with `code`',
    '<list><li>item with <strong>bold</strong></li><li>item with <code>code</code></li></list>',
  ],
  ['> quote with **bold**', '<blockquote>quote with <strong>bold</strong></blockquote>'],
  ['para one\n\npara two', 'para one\n\npara two'],
  // ⚠ An indented list marker is NOT a list in the chat dialect — it
  // is a paragraph. The article dialect makes it a nested list, which
  // is precisely why this line is pinned here.
  ['  - indented list marker', '  - indented list marker'],
  // ⚠ Pipe rows are plain text in the chat dialect.
  ['| not | a | table |', '| not | a | table |'],
  // ⚠ Hashes are plain text in the chat dialect.
  ['# not a heading today', '# not a heading today'],
  ['## also not', '## also not'],
  ['text\n- list\ntext after', 'text\n<list><li>list</li></list>\ntext after'],
  ['```\nmultiline\nblock\n```', '<pre>\nmultiline\nblock\n</pre>'],
  ['a * b * c', 'a * b * c'],
  ['~~strike **bold**~~', '<strike>strike <strong>bold</strong></strike>'],
  ['[nested [brackets]](mudref:abc)', '[nested [brackets]](mudref:abc)'],
  ['', ''],
];

/** `[markup, expected flatten]`, recorded at the same commit. */
const FLATTEN_CORPUS: ReadonlyArray<readonly [string, string]> = [
  ['<strong>x</strong>', '**x**'],
  ['<em>x</em>', '*x*'],
  ['<code>x</code>', '`x`'],
  ['<pre>x</pre>', '```x```'],
  ['<strike>x</strike>', '~~x~~'],
  ['<blockquote>a\nb</blockquote>', '> a\n> b'],
  ['<list><li>a</li><li>b</li></list>', '- a\n- b'],
  ['<list ordered="true"><li>a</li><li>b</li></list>', '1. a\n2. b'],
  ['<li>stray</li>', '- stray'],
  ['<chan id="gossip">[Gossip]</chan>', '[Gossip]'],
  ['<msg>hello</msg>', 'hello'],
  ['<name stuff-id="x">Alice</name>', 'Alice'],
  ['<speech>"hi"</speech>', '"hi"'],
  ['plain text', 'plain text'],
  ['&lt;&gt;&amp;&quot;&apos;', `<>&"'`],
];

describe('MML regression corpus — the chat path is byte-identical', () => {
  it.each(MARKDOWN_CORPUS)('markdownToMml(%j)', (src, expected) => {
    expect(Mml.markdownToMml(src).toString()).toBe(expected);
  });

  it.each(FLATTEN_CORPUS)('flatten(%j)', (src, expected) => {
    expect(Mml.flatten(src)).toBe(expected);
  });

  it('an explicitly-false longForm is the chat dialect too', () => {
    for (const [src, expected] of MARKDOWN_CORPUS) {
      expect(Mml.markdownToMml(src, undefined, { longForm: false }).toString()).toBe(
        expected,
      );
    }
  });

  it('no shared regex leaks state between calls (R-1: lastIndex)', () => {
    // The failure mode the options bag risks: a module-scope regex with
    // the `g` flag retains `lastIndex` across calls, so parsing an
    // article poisons the next `say`. Interleave the dialects and
    // assert the chat outputs are unchanged either way.
    for (const [src, expected] of MARKDOWN_CORPUS) {
      Mml.markdownToMml('# heading\n\n| a | b |\n- x\n  - y', undefined, {
        longForm: true,
      });
      expect(Mml.markdownToMml(src).toString()).toBe(expected);
    }
  });
});
