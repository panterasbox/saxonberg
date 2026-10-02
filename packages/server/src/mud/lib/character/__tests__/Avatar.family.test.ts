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
import RecordBody from '../../../platform/agent/PrimaryAvatar';
import ShadeAvatar from '../../../platform/agent/ShadeAvatar';
import SandboxAvatar from '../../../platform/agent/sandbox/SandboxAvatar';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import { PlayerApi } from '../../../api/player';
import type { Stuff } from '../../stuff/Stuff';

describe('⭐⭐ the Avatar family', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('all three bodies ARE Avatars', () => {
    for (const Body of [RecordBody, ShadeAvatar, SandboxAvatar]) {
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
    expect(names(ShadeAvatar as unknown as new () => Stuff)).toEqual(
      expect.arrayContaining(record),
    );
    expect(names(SandboxAvatar as unknown as new () => Stuff)).toEqual(
      expect.arrayContaining(record),
    );
  });

  it('⭐ only the body of record claims the registry slot', () => {
    // The two vessels carry no registration code at all now — not an
    // override that says no, simply nothing to inherit. Proven by
    // absence: neither declares `onCreate` beyond its own concern.
    expect(
      Object.prototype.hasOwnProperty.call(SandboxAvatar.prototype, 'onCreate'),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(RecordBody.prototype, 'onCreate'),
    ).toBe(true);
  });

  it('⛔ the W2 registration scaffolding is gone', () => {
    // `claimsRegistrySlot` was a boolean the subclasses flipped, added
    // in W2 to bridge one wave and explicitly marked for deletion
    // here. If it comes back, D9's argument has been lost.
    for (const C of [Avatar, RecordBody, ShadeAvatar, SandboxAvatar]) {
      expect(
        'claimsRegistrySlot' in
          ((C as unknown as { prototype: object }).prototype as object),
      ).toBe(false);
    }
  });

  /*
   * ⭐⭐ The predicate ~90 call sites use to ask "is this a person?"
   *
   * ⚠⚠ It was a `templatePath` PREFIX TEST until 2026-10-01 and it was
   * wrong for two of the three bodies. A `ShadeAvatar`'s row is
   * `/platform/agent/ShadeAvatar`, which does not start with
   * `/platform/agent/Avatar/` — so a DEAD PLAYER WAS NOT A PERSON to
   * `wallet`, `chat`, `forum`, `office`, `contacts` and
   * `AccessApi.isWizard`, none of which carry a `requiresEmbodied`
   * gate. And a `SandboxAvatar` only passed because `SandboxApi`
   * restamped its lineage to a path backed by no row, purely to
   * satisfy the string.
   *
   * `requiresEmbodied`'s own docstring states the doctrine this
   * violated: death "costs embodied agency and the price of coming
   * back; it never costs a seat as a person."
   */
  it('⭐⭐ all three bodies are a PERSON to isAvatarStuff', () => {
    for (const Body of [RecordBody, ShadeAvatar, SandboxAvatar]) {
      const b = makeStuff(() => new (Body as unknown as new () => Stuff)());
      expect(
        PlayerApi.isAvatarStuff(b),
        `${(Body as unknown as { name: string }).name} must count as a ` +
          'person — it IS one. A lineage string is not the question.',
      ).toBe(true);
    }
  });

  it('⚠ and a non-avatar body is not', () => {
    // The predicate must still DISCRIMINATE — an instanceof that is
    // true of everything would pass the test above vacuously.
    const notAPerson = makeStuff(() => new (Idea as unknown as new () => Stuff)());
    expect(PlayerApi.isAvatarStuff(notAPerson)).toBe(false);
  });

  it('⭐ the record body\'s row mirrors its class, like its siblings', () => {
    // ⚠ It was `/platform/agent/Avatar/seed` — a fossil of the scheme
    // that forked a per-player ROW at `/platform/agent/Avatar/<pid>`.
    // Nothing forks anything now (holder_snapshots is the spine), so
    // the row was parked inside a namespace of IDENTITIES wearing a
    // reserved fake playerId to avoid colliding with rows that cannot
    // exist.
    expect(RecordBody.ROW_TEMPLATE_PATH).toBe('/platform/agent/PrimaryAvatar');
    // ⭐ And the identity prefix is untouched: class is lineage,
    // identity path is identity, and the namespace is the FAMILY's.
    expect(Avatar.TEMPLATE_PATH_PREFIX).toBe('/platform/agent/Avatar/');
    expect(Avatar.getTemplatePath('abc')).toBe('/platform/agent/Avatar/abc');
  });

  it('⛔ nothing reintroduces the seed statics', () => {
    for (const C of [Avatar, RecordBody]) {
      const c = C as unknown as Record<string, unknown>;
      expect('SEED_TEMPLATE_PATH' in c).toBe(false);
      expect('SEED_PLAYER_ID' in c).toBe(false);
    }
  });
});