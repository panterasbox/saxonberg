/**
 * ⭐ An authored `<placeholder>` is PROSE, not markup.
 *
 * A description is a mix: mostly what an author wrote, sometimes markup
 * that CODE composed into it (`<sense channel="…">` from BodyPlan /
 * Perceiver, `<detail>` keys wrapped by DetailedMixin). It can be
 * neither trusted wholesale nor escaped wholesale.
 *
 * ⚠ It was trusted wholesale, and that ATE authored text. Every hint
 * written the natural way — `` `teleport <place>` ``, `` `go
 * <direction>` `` — reached the player with its placeholder deleted. A
 * live drive read the TPA terminal's own help as
 *
 *     step up and name a stop — `teleport ` — to ride
 *
 * with a stray `</place>` further down, where the parser closed the tag
 * it thought had been opened. Shipped content carries `<path>`,
 * `<target>`, `<name>`, `<key>`, `<player>`, `<place>`, `<destination>`
 * — and not one of them is an MML tag.
 *
 * No unit test saw it: they assert on the composed string, and the
 * string looked fine. It is what a PLAYER sees that was wrong.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import Thing from '../../lib/stuff/Thing';

describe('Mml.augment — authored placeholders survive, real markup does not', () => {
  const host = () => makeStuff(() => new Thing());

  it('keeps an authored angle-bracket placeholder legible', () => {
    const h = host();
    const out = Mml.augment(
      'name a stop — `teleport <place>` — to ride.',
      h as never,
      h as never,
    );
    expect(out).toContain('&lt;place&gt;');
    expect(out).not.toContain('<place>');
  });

  it('escapes each of the placeholders shipped content actually uses', () => {
    const h = host();
    for (const name of ['path', 'target', 'key', 'destination', 'place', 'name']) {
      const out = Mml.augment(`use <${name}> here`, h as never, h as never);
      expect(out).toContain(`&lt;${name}&gt;`);
    }
  });

  // The other half of the rule: a KNOWN tag still reaches the
  // augmenters as markup. `<sense>` is code-composed (BodyPlan /
  // Perceiver) and the sense-strip augmenter drops it for a viewer
  // without that channel — so the proof it survived escaping is that
  // the augmenter got to act on it at all.
  it('leaves REAL markup alone — the sense-strip augmenter still sees its tags', () => {
    const h = host();
    const out = Mml.augment(
      'a smell <sense channel="smell">of woodsmoke</sense> hangs here',
      h as never,
      h as never,
    );
    expect(out).not.toContain('&lt;sense');       // not escaped as prose
    expect(out).not.toContain('of woodsmoke');    // stripped, i.e. recognised
    expect(out).toBe('a smell  hangs here');
  });

  // ⚠ A known limit, recorded rather than papered over: a placeholder
  // whose word IS a tag name collides. `<player>` is both an MML tag and
  // the natural way to write `office assign <player> <office>` — and
  // shipped command help does write it that way. The tag vocabulary owns
  // the name, so the placeholder loses. Worth knowing before authoring.
  it('a placeholder that collides with a real tag name is NOT rescued', () => {
    const h = host();
    // `player` and `direction` are both MML tags AND the natural
    // placeholder word — `office assign <player>`, `go <direction>`.
    for (const collide of ['player', 'direction']) {
      const out = Mml.augment(`x <${collide}> y`, h as never, h as never);
      expect(out).not.toContain(`&lt;${collide}&gt;`);
    }
  });

  it('a closing unknown tag is escaped too, so nothing is left half-open', () => {
    const h = host();
    const out = Mml.augment('<place>x</place>', h as never, h as never);
    expect(out).toBe('&lt;place&gt;x&lt;/place&gt;');
  });
});
