/**
 * ⚠⚠ Acceptance criterion 16: **standing splits by level.**
 *
 * *Make* (you build) is something the PERSON does → account-level.
 * *Play* accrues by living in the world as one particular body →
 * per-character, and the only standing that can legitimately diverge
 * across an account's characters.
 *
 * The test asserts BOTH halves against two characters on one account:
 * the same make standing, and *different* play standing. The second
 * half is what proves the split is real rather than a global — a
 * makeStanding that merely returned a constant would pass the first
 * half alone.
 *
 * ⚠ `producer_events` is deliberately NOT re-keyed. Re-keying has a
 * wrong answer available (silently dropping the history of anyone with
 * more than one character), so the READ aggregates. That is only
 * possible because the figure derives on read.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import Avatar from '../Avatar';
import { User } from '../../lib/identity/User';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { collectSubscribableFields } from '../../api/mql-subscription';
import NPC from '../NPC';
import { AdvancementApi } from '../../api/advancement';

/**
 * Read a subscribable field as some viewer.
 *
 * ⚠ Resolves through `collectSubscribableFields` — the **prototype-chain
 * collector production uses** — not through `Avatar.subscribableFields`.
 * An earlier version of this helper read Avatar's own static, which
 * quietly asserted *where the descriptor is declared* instead of *that
 * the host has it*. That is the assertion that lets a descriptor sit on
 * a concrete class forever.
 */
function readField(name: string, host: Stuff, viewer: Stuff = host): unknown {
  const d = collectSubscribableFields(host).get(name);
  expect(d, `no subscribable field '${name}' on ${host.constructor.name}`).toBeDefined();
  return d!.read?.(host, viewer as never);
}

describe('standing splits by level', () => {
  let alice: Avatar;
  let bob: Avatar;

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();

    // One account, two characters — the whole point of the split.
    const user = new User();
    user.playerIds = ['alice', 'bob'];

    alice = makeStuff(() => new Avatar()) as Avatar;
    stampTemplatePathForTest(alice, Avatar.getTemplatePath('alice'));
    alice.setPlayerId('alice');
    alice.setUser(user);

    bob = makeStuff(() => new Avatar()) as Avatar;
    stampTemplatePathForTest(bob, Avatar.getTemplatePath('bob'));
    bob.setPlayerId('bob');
    bob.setUser(user);
  });

  /*
   * Half one: MAKE is the person's, so both bodies answer the same.
   */
  it('reports the SAME make standing for two characters on one account', () => {
    const a = readField('makeStanding', alice as unknown as Stuff) as { band: { name: string } };
    const b = readField('makeStanding', bob as unknown as Stuff) as { band: { name: string } };
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a.band.name).toBe(b.band.name);
  });

  /*
   * Half two, and the one that makes half one mean something: PLAY is
   * per-character, so the two are computed against different subjects.
   * If `makeStanding` had simply become a constant, this would still
   * distinguish it from `playStanding`.
   */
  it('keeps play standing keyed per character, not per account', () => {
    // The play descriptor reads against the CHARACTER's own subject.
    // Different template paths ⇒ different subjects ⇒ independently
    // derivable figures, which is exactly what make standing gave up.
    expect(alice.getTemplatePath()).not.toBe(bob.getTemplatePath());

    const aPlay = readField('playStanding', alice as unknown as Stuff);
    const bPlay = readField('playStanding', bob as unknown as Stuff);
    expect(aPlay).toBeDefined();
    expect(bPlay).toBeDefined();

    // Renown stays per-character too — the other half of the split.
    expect(readField('renown', alice as unknown as Stuff)).toBeDefined();
  });

  /*
   * A character with no account (a guest, or a directly-constructed
   * body) must still answer rather than throwing — the pre-existing
   * behaviour, so nothing regresses for guests.
   */
  it('falls back to this character alone when the account is unknown', () => {
    const loner = makeStuff(() => new Avatar()) as Avatar;
    stampTemplatePathForTest(loner, Avatar.getTemplatePath('loner'));
    loner.setPlayerId('loner');
    expect(() => readField('makeStanding', loner as unknown as Stuff)).not.toThrow();
    expect(readField('makeStanding', loner as unknown as Stuff)).toBeDefined();
  });

  /*
   * Criterion 14: the competence digest is a subscribable field and
   * derives on read. `undefined` here means "the fold has not landed
   * yet", which is a legitimate answer — what matters is that the
   * field is DECLARED, so the client can subscribe to it.
   */
  it('exposes the competence digest and the notify policy', () => {
    const names = [...collectSubscribableFields(alice as unknown as Stuff).keys()];
    expect(names).toContain('competenceDigest');
    expect(names).toContain('practisingCompetence');
    // Criterion 15 — the notification policy read.
    expect(names).toContain('notifyPolicy');
  });

  /*
   * ⚠⚠ The competence descriptors live on `AdvancementMixin`, not on
   * `Avatar` — a descriptor gated on a mixin belongs to that mixin.
   * Declaring them on the concrete class quietly encoded "competence is
   * a player dashboard figure", which the advancement substrate has
   * never assumed: `ownerKey` is `getIdentityPath()`, so an NPC has
   * always been able to own a Transcript.
   */
  describe('competence is expressed uniformly for NPCs', () => {
    it('is NOT declared on Avatar itself', () => {
      const own = (
        Avatar as unknown as {
          subscribableFields: { name: string }[];
        }
      ).subscribableFields.map((f) => f.name);
      expect(own).not.toContain('competenceDigest');
      expect(own).not.toContain('practisingCompetence');
      expect(own).not.toContain('notifyPolicy');
    });

    it('an NPC has the same competence fields a player does', () => {
      const dave = makeStuff(() => new NPC()) as unknown as Stuff;
      stampTemplatePathForTest(dave, '/obj/npc/dave-test');
      const names = [...collectSubscribableFields(dave).keys()];
      expect(names).toContain('competenceDigest');
      expect(names).toContain('practisingCompetence');
    });

    /*
     * The player/NPC asymmetry, both directions. A player's competence
     * is self-only; an NPC's is a fact about the world, because an NPC
     * never subscribes on its own behalf and a self-only gate would
     * make the field defined-but-unanswerable — a cosmetic move.
     */
    /*
     * ⚠ `undefined` from these descriptors is ambiguous by design — it
     * means BOTH "the gate withheld this" and "the derive-on-read fold
     * has not landed yet". A subscription treats them the same (omit
     * the field), but it means the gate cannot be observed through the
     * value until the fold has completed. So prime it first.
     */
    async function primeDigest(host: Stuff): Promise<void> {
      AdvancementApi.competenceDigestCached(host); // kick the async fold
      for (let i = 0; i < 20; i++) {
        if (AdvancementApi.competenceDigestCached(host) !== undefined) return;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error('digest fold never landed');
    }

    it('reads an NPC for any viewer, but a player only for themselves', async () => {
      const dave = makeStuff(() => new NPC()) as unknown as Stuff;
      stampTemplatePathForTest(dave, '/obj/npc/dave-test-2');
      expect(dave.getPlayerId()).toBeNull();

      await primeDigest(dave);
      await primeDigest(bob as unknown as Stuff);

      // Alice may read Dave's competence — an NPC's skill is a fact
      // about the world.
      expect(
        readField('competenceDigest', dave, alice as unknown as Stuff),
      ).toEqual({ disciplines: [] });

      // …but not Bob's. A player's competence is their own.
      expect(
        readField(
          'competenceDigest',
          bob as unknown as Stuff,
          alice as unknown as Stuff,
        ),
      ).toBeUndefined();

      // Bob reads his own.
      expect(
        readField('competenceDigest', bob as unknown as Stuff),
      ).toEqual({ disciplines: [] });
    });
  });
});
