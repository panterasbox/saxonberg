/**
 * Coverage for the message-rendering Wave 1 MML extensions:
 *  - New tag helpers (chan, msg, player, npc, mention, link, emphasis
 *    tags, list / li / unorderedList / orderedList).
 *  - `Mml.flatten` per-tag failsafe table.
 *  - `Mml.sys` retirement guard.
 *
 * Round-trip and markdown-pipeline tests live in `mml.markdown.test.ts`
 * and `mml.flatten.test.ts`; this file gates that each helper produces
 * the expected markup shape and that the retired helper is gone.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';
import { Idea } from '../../lib/stuff/Idea';
import { NamedMixin } from '../../lib/description/Named';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class NamedThing extends NamedMixin(Idea) {}

describe('Mml — new semantic tag helpers', () => {
  it('chan emits a channel chip with id + label', () => {
    expect(Mml.chan('gossip', '[Gossip]').toString()).toBe(
      '<chan id="gossip">[Gossip]</chan>',
    );
  });

  it('msg accepts raw text (escaped) or an Mml fragment (verbatim)', () => {
    expect(Mml.msg('hello').toString()).toBe('<msg>hello</msg>');
    const fragment = Mml.fromMarkup('<strong>bold</strong>');
    expect(Mml.msg(fragment).toString()).toBe('<msg><strong>bold</strong></msg>');
  });

  it('msg escapes structural characters in raw text input', () => {
    expect(Mml.msg('<evil>').toString()).toBe('<msg>&lt;evil&gt;</msg>');
  });

  it('player / npc tag stuff-id + display name', () => {
    const alice = makeStuff(() => new NamedThing());
    alice.setName('Alice');
    expect(Mml.player(alice).toString()).toBe(
      `<player stuff-id="${alice.stuffId}">Alice</player>`,
    );
    expect(Mml.npc(alice).toString()).toBe(
      `<npc stuff-id="${alice.stuffId}">Alice</npc>`,
    );
  });

  it('mention emits stuff-id + literal @label', () => {
    expect(Mml.mention('s_42', '@Bobalu').toString()).toBe(
      '<mention stuff-id="s_42">@Bobalu</mention>',
    );
  });

  it('link accepts the three custom URI schemes', () => {
    expect(Mml.link('mudcmd:look%20sword', 'Excalibur').toString()).toBe(
      '<link href="mudcmd:look%20sword">Excalibur</link>',
    );
    expect(Mml.link('mudref:s_12345', 'the sword').toString()).toBe(
      '<link href="mudref:s_12345">the sword</link>',
    );
    expect(Mml.link('mudq:guard%20in%20here', 'guards here').toString()).toBe(
      '<link href="mudq:guard%20in%20here">guards here</link>',
    );
  });

  it('link throws on unknown schemes', () => {
    expect(() => Mml.link('https://attacker.com', 'evil')).toThrow();
    expect(() => Mml.link('javascript:alert(1)', 'evil')).toThrow();
    expect(() => Mml.link('mailto:foo@bar', 'foo')).toThrow();
  });

  it('emphasis helpers wrap with the expected tag', () => {
    expect(Mml.strong('x').toString()).toBe('<strong>x</strong>');
    expect(Mml.em('x').toString()).toBe('<em>x</em>');
    expect(Mml.code('x').toString()).toBe('<code>x</code>');
    expect(Mml.pre('x').toString()).toBe('<pre>x</pre>');
    expect(Mml.blockquote('x').toString()).toBe('<blockquote>x</blockquote>');
    expect(Mml.strike('x').toString()).toBe('<strike>x</strike>');
  });

  it('li is the markdown list-item tag, NOT the identity item tag', () => {
    // Round-trip-friendly: <li> is distinct from <list> (the existing
    // identity tag), avoiding the renderer's per-tag treatment
    // overload that drove the rename in the requirements doc.
    expect(Mml.li('apple').toString()).toBe('<li>apple</li>');
  });

  it('unorderedList and orderedList wrap <li> children', () => {
    const items = [Mml.li('a'), Mml.li('b'), Mml.li('c')];
    expect(Mml.unorderedList(items).toString()).toBe(
      '<list><li>a</li><li>b</li><li>c</li></list>',
    );
    expect(Mml.orderedList(items).toString()).toBe(
      '<list ordered="true"><li>a</li><li>b</li><li>c</li></list>',
    );
  });
});

describe('Mml.sys retirement (acceptance #8, #26 — sys grep guard)', () => {
  it('Mml.sys is gone from the public surface', () => {
    expect((Mml as unknown as { sys?: unknown }).sys).toBeUndefined();
  });
});
