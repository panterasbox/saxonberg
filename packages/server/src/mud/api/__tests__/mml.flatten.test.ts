/**
 * `Mml.flatten` per-tag failsafe table. Each test gates one tag's
 * contribution to the markdown-emphasis-preserving flatten path.
 *
 * `stripTags` (markdown-stripping plain-mode collapse) lives in
 * `mml.test.ts`; this file is flatten-specific.
 */

import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';

describe('Mml.flatten — per-tag failsafe table', () => {
  it('text passes through verbatim', () => {
    expect(Mml.flatten('hello world')).toBe('hello world');
  });

  it('decodes the five entities', () => {
    expect(Mml.flatten('&lt;&gt;&amp;&quot;&apos;')).toBe(`<>&"'`);
  });

  it('chan flattens to its label', () => {
    expect(Mml.flatten('<chan id="gossip">[Gossip]</chan>')).toBe('[Gossip]');
  });

  it('msg flattens to its children verbatim', () => {
    expect(Mml.flatten('<msg>hello</msg>')).toBe('hello');
  });

  it('player, npc, mention, link, name, item, location, object, speech, detail, direction, exit — children verbatim', () => {
    expect(Mml.flatten('<player stuff-id="x">Bobalu</player>')).toBe('Bobalu');
    expect(Mml.flatten('<npc stuff-id="x">Guard</npc>')).toBe('Guard');
    expect(Mml.flatten('<mention stuff-id="x">@Bobalu</mention>')).toBe('@Bobalu');
    expect(Mml.flatten('<link href="mudcmd:look%20x">label</link>')).toBe('label');
    expect(Mml.flatten('<name stuff-id="x">Alice</name>')).toBe('Alice');
    expect(Mml.flatten('<item stuff-id="x">sword</item>')).toBe('sword');
    expect(Mml.flatten('<location stuff-id="x">Lobby</location>')).toBe('Lobby');
    expect(Mml.flatten('<object stuff-id="x">desk</object>')).toBe('desk');
    expect(Mml.flatten('<speech>"hi"</speech>')).toBe('"hi"');
    expect(Mml.flatten('<detail key="hands">hands</detail>')).toBe('hands');
    expect(Mml.flatten('<direction>north</direction>')).toBe('north');
    expect(Mml.flatten('<exit dir="n" stuff-id="x">north</exit>')).toBe('north');
  });

  it('strong → **text**', () => {
    expect(Mml.flatten('<strong>x</strong>')).toBe('**x**');
  });

  it('em → *text*', () => {
    expect(Mml.flatten('<em>x</em>')).toBe('*x*');
  });

  it('code → `text`', () => {
    expect(Mml.flatten('<code>x</code>')).toBe('`x`');
  });

  it('pre → ```text```', () => {
    expect(Mml.flatten('<pre>x</pre>')).toBe('```x```');
  });

  it('blockquote prefixes each line with > ', () => {
    expect(Mml.flatten('<blockquote>one\ntwo\nthree</blockquote>')).toBe(
      '> one\n> two\n> three',
    );
  });

  it('strike → ~~text~~', () => {
    expect(Mml.flatten('<strike>x</strike>')).toBe('~~x~~');
  });

  it('list of <li> flattens to dashed lines', () => {
    expect(Mml.flatten('<list><li>a</li><li>b</li><li>c</li></list>')).toBe(
      '- a\n- b\n- c',
    );
  });

  it('list ordered="true" flattens to numbered lines', () => {
    expect(
      Mml.flatten('<list ordered="true"><li>a</li><li>b</li></list>'),
    ).toBe('1. a\n2. b');
  });

  it('nested tags flatten recursively', () => {
    // The flatten serializer walks children, so a `<strong>` containing
    // an `<em>` round-trips its markdown form layer by layer.
    expect(Mml.flatten('<strong>bold <em>and italic</em></strong>')).toBe(
      '**bold *and italic***',
    );
  });

  it('unknown tag falls back to children verbatim', () => {
    // Forward-compat: new tag additions can ship to the renderer
    // without breaking flatten.
    expect(Mml.flatten('<future>payload</future>')).toBe('payload');
  });

  it('produces a single readable line for typical chat input (acceptance #28)', () => {
    // The chat-frame body shape; flatten must NOT inject ASCII grid
    // characters or multi-blank-line gaps.
    const body =
      '<chan id="gossip">[Gossip]</chan> <player stuff-id="X">Bobalu</player>: <msg>hello, <strong>world</strong>!</msg>';
    const flat = Mml.flatten(body);
    expect(flat).toBe('[Gossip] Bobalu: hello, **world**!');
    expect(flat).not.toMatch(/\n\n/);
    expect(flat).not.toMatch(/\|/);
  });
});
