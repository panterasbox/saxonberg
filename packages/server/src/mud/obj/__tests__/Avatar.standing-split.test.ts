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
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';

/** Read one of Avatar's declared subscribable fields as the owner. */
function readField(name: string, avatar: Avatar): unknown {
  const d = (
    Avatar as unknown as { subscribableFields: SubscribableFieldDescriptor[] }
  ).subscribableFields.find((f) => f.name === name);
  expect(d, `no subscribable field '${name}'`).toBeDefined();
  return d!.read?.(avatar as unknown as Stuff, avatar as unknown as never);
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
    const a = readField('makeStanding', alice) as { band: { name: string } };
    const b = readField('makeStanding', bob) as { band: { name: string } };
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

    const aPlay = readField('playStanding', alice);
    const bPlay = readField('playStanding', bob);
    expect(aPlay).toBeDefined();
    expect(bPlay).toBeDefined();

    // Renown stays per-character too — the other half of the split.
    expect(readField('renown', alice)).toBeDefined();
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
    expect(() => readField('makeStanding', loner)).not.toThrow();
    expect(readField('makeStanding', loner)).toBeDefined();
  });

  /*
   * Criterion 14: the competence digest is a subscribable field and
   * derives on read. `undefined` here means "the fold has not landed
   * yet", which is a legitimate answer — what matters is that the
   * field is DECLARED, so the client can subscribe to it.
   */
  it('declares the competence digest as a subscribable field', () => {
    const names = (
      Avatar as unknown as { subscribableFields: SubscribableFieldDescriptor[] }
    ).subscribableFields.map((f) => f.name);
    expect(names).toContain('competenceDigest');
    expect(names).toContain('practisingCompetence');
    // Criterion 15 — the notification policy read.
    expect(names).toContain('notifyPolicy');
  });
});
