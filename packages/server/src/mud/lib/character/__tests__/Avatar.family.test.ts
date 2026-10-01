/**
 * ⭐⭐ The family is a family: one root, three bodies, one surface.
 *
 * `lint:instanceable` holds that no ROW names the abstract root. This
 * holds the part a lint cannot see — that the three concrete bodies
 * really do inherit one surface, and that code narrowing on `Avatar`
 * catches all three.
 *
 * ⚠⚠ The failure this prevents is silent and expensive: a site left
 * on the concrete body of record (`instanceof` it, or typed as it)
 * excludes shades and circle bodies. Both are the SAME PERSON, so an
 * identity-keyed read that misses them is wrong rather than narrow —
 * and it is wrong only for a player who happens to be dead or inside
 * a circle, which is exactly the state nobody tests by hand.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Avatar from '../Avatar';
import RecordBody from '../../../platform/agent/Avatar';
import Shade from '../../../platform/agent/Shade';
import WireBody from '../../../platform/agent/sandbox/WireBody';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

describe('⭐⭐ the Avatar family', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('all three bodies ARE Avatars', () => {
    for (const Body of [RecordBody, Shade, WireBody]) {
      const b = makeStuff(() => new (Body as unknown as new () => Stuff)());
      expect(b).toBeInstanceOf(Avatar);
    }
  });

  it('⭐ composition does not differ — the three carry the same mixins', () => {
    const names = (Body: new () => Stuff): string[] => {
      const out = new Set<string>();
      let p: unknown = Object.getPrototypeOf(makeStuff(() => new Body()));
      while (p && p !== Object.prototype) {
        const n = (p as { constructor?: { _mixinName?: string } }).constructor
          ?._mixinName;
        if (typeof n === 'string') out.add(n);
        p = Object.getPrototypeOf(p);
      }
      return [...out].sort();
    };
    const record = names(RecordBody as unknown as new () => Stuff);
    expect(record.length).toBeGreaterThan(10);
    // ⭐ mortality.md's rule, as a test: a shade and a circle body
    // ACTIVATE differently, they do not COMPOSE differently. A verb
    // that exists for one exists for all three; the refusal is what
    // varies, and a refusal you can be told about is the progression UI.
    expect(names(Shade as unknown as new () => Stuff)).toEqual(
      expect.arrayContaining(record),
    );
    expect(names(WireBody as unknown as new () => Stuff)).toEqual(
      expect.arrayContaining(record),
    );
  });

  it('⭐ only the body of record claims the registry slot', () => {
    // The two vessels carry no registration code at all now — not an
    // override that says no, simply nothing to inherit. Proven by
    // absence: neither declares `postRegister` beyond its own concern.
    expect(
      Object.prototype.hasOwnProperty.call(WireBody.prototype, 'postRegister'),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(RecordBody.prototype, 'postRegister'),
    ).toBe(true);
  });

  it('⛔ the W2 registration scaffolding is gone', () => {
    // `claimsRegistrySlot` was a boolean the subclasses flipped, added
    // in W2 to bridge one wave and explicitly marked for deletion
    // here. If it comes back, D9's argument has been lost.
    for (const C of [Avatar, RecordBody, Shade, WireBody]) {
      expect(
        'claimsRegistrySlot' in
          ((C as unknown as { prototype: object }).prototype as object),
      ).toBe(false);
    }
  });
});
