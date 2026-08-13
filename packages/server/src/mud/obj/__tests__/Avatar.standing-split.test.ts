/**
 * Standing levels, and the read seam every surface goes through.
 *
 * ⚠⚠ **Acceptance criterion 16 is NOT met, deliberately.** It asks that
 * two characters on one account report the SAME make standing — which
 * is a claim about the account **formula**, and the formula is an open
 * design question that was explicitly deferred. Asserting equality here
 * would pin a placeholder arithmetic into the test suite, and every
 * future change to the real formula would then read as a regression.
 *
 * What DID land is the abstraction:
 *
 *   - `STOCK_LEVEL` records that producer/capital are account-level and
 *     consumer is per-character — vocabulary, not arithmetic;
 *   - `InfluenceApi.standingForHost` is the one seam that will consult
 *     it, and all three player-facing surfaces already call through it,
 *     so they cannot disagree;
 *   - the aggregation inside it is a **stub** that does not aggregate.
 *
 * So these tests assert the SEAM and the LEVEL DECLARATION, and
 * explicitly pin that make standing is still per-character today — so
 * the day it stops being, this file says so out loud instead of
 * silently agreeing.
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
import { InfluenceApi, STOCK_LEVEL } from '../../api/influence';
import RenownStanding, {
  COMPACT_WIDE,
} from '../../lib/standing/RenownStanding';
import ProducerStanding, {
  PRODUCER_WIDE,
} from '../../lib/standing/ProducerStanding';

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
    RenownStanding._resetForTesting();

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
   * The level declaration — vocabulary only. This is the part of
   * criterion 16 that can be asserted without inventing arithmetic.
   */
  it('declares make and fund as account-level, play as per-character', () => {
    expect(STOCK_LEVEL.producer).toBe('account');
    expect(STOCK_LEVEL.capital).toBe('account');
    expect(STOCK_LEVEL.consumer).toBe('character');
  });

  /** Seed a character's producer scalar directly into the warmed cache. */
  function seedProducer(host: Avatar, scalar: number): void {
    ProducerStanding.cached().set(
      ProducerStanding.key(host.getTemplatePath()!, PRODUCER_WIDE),
      scalar,
    );
  }

  /*
   * ⭐ The roll-up. This test previously pinned the STUB — asserting
   * that make standing did *not* aggregate — precisely so that starting
   * to aggregate would be a visible, intentional edit rather than
   * something that quietly began happening. This is that edit.
   */
  it('sums the account characters into one make standing', () => {
    seedProducer(alice, 3);
    seedProducer(bob, 4);

    const viaSeam = InfluenceApi.standingForHost(
      alice as unknown as Stuff,
      'producer',
    );
    expect(viaSeam?.scalar).toBe(7);

    // And it is genuinely the ACCOUNT's figure: bob reads the same one.
    const bobSeam = InfluenceApi.standingForHost(
      bob as unknown as Stuff,
      'producer',
    );
    expect(bobSeam?.scalar).toBe(7);
    expect(bobSeam?.band.name).toBe(viaSeam?.band.name);
  });

  /*
   * ⭐⭐ The property that decides SUM over max or mean: the account is
   * the subject, so how a person spreads their work across bodies must
   * not move their figure. Max and mean both penalise minting a second
   * character, which would make the level claim incoherent.
   */
  it('is unchanged by how the work is split across characters', () => {
    seedProducer(alice, 7);
    seedProducer(bob, 0);
    const together = InfluenceApi.standingForHost(
      alice as unknown as Stuff,
      'producer',
    )!.scalar;

    seedProducer(alice, 3);
    seedProducer(bob, 4);
    const split = InfluenceApi.standingForHost(
      alice as unknown as Stuff,
      'producer',
    )!.scalar;

    expect(split).toBe(together);
  });

  /*
   * ⚠ Defect 2 of the three recorded against the previous attempt:
   * `Band.fromScalar(total)` with no argument silently uses
   * `DEFAULT_BAND_THRESHOLDS` while every real producer band uses the
   * configured ones. The roll-up must band through the same cutoffs a
   * single-character read does.
   */
  it('bands the sum through the same cutoffs a single read uses', () => {
    seedProducer(alice, 5);
    seedProducer(bob, 0);
    const rolled = InfluenceApi.standingForHost(
      alice as unknown as Stuff,
      'producer',
    );
    const single = InfluenceApi.standingOf(
      alice.getTemplatePath()!,
      'producer',
    );
    // Same scalar (bob contributes nothing) ⇒ same band, or the two
    // paths are using different threshold tables.
    expect(rolled?.scalar).toBe(single.scalar);
    expect(rolled?.band.name).toBe(single.band.name);
  });

  /*
   * The seam is what stops the three surfaces disagreeing — the defect
   * the first attempt shipped, where the dashboard was account-level
   * and `standing` / `profile` were not.
   */
  it('routes the dashboard field through the same seam the verbs use', () => {
    // ⚠ The wire carries the band NAME, not a serialized `Band` value
    // object — `{band: 'nascent'}`, matching `practisingCompetence`'s
    // already-plain band. The assertion is exactly as strong either way.
    const viaField = readField('makeStanding', alice as unknown as Stuff) as {
      band: string;
    };
    const viaSeam = InfluenceApi.standingForHost(
      alice as unknown as Stuff,
      'producer',
    );
    expect(viaField.band).toBe(viaSeam!.band.name);
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
    // ⚠ It has to be MEASURED to read at all: an unmaterialized scope
    // projects as absent, never as a neutral zero. Seeding alice's
    // alone is what makes this an assertion about KEYING — bob shares
    // the account and still reads nothing.
    RenownStanding.cached().set(
      RenownStanding.key(alice.getTemplatePath()!, COMPACT_WIDE),
      5
    );
    expect(readField('renown', alice as unknown as Stuff)).toEqual({
      value: 5,
    });
    expect(readField('renown', bob as unknown as Stuff)).toBeUndefined();
  });

  /*
   * ⭐⭐ Defect 3 of the three: the previous attempt read the runtime
   * `User`, found it unset, and quietly fell back to the per-character
   * figure with nothing saying so.
   *
   * ⚠ This is a deliberate BEHAVIOUR CHANGE. A body with no account —
   * a guest, or a directly-constructed one — used to report a make
   * band and now reports nothing at all. That is worse-looking and more
   * honest: the band it used to print was a per-character number under
   * an account-level label. The client hatches on the absence.
   */
  it('yields no make standing for a body with no account, and does not throw', () => {
    const loner = makeStuff(() => new Avatar()) as Avatar;
    stampTemplatePathForTest(loner, Avatar.getTemplatePath('loner'));
    loner.setPlayerId('loner');

    expect(() =>
      readField('makeStanding', loner as unknown as Stuff),
    ).not.toThrow();
    expect(readField('makeStanding', loner as unknown as Stuff)).toBeUndefined();
    expect(
      InfluenceApi.standingForHost(loner as unknown as Stuff, 'producer'),
    ).toBeUndefined();
  });

  /*
   * ⚠ Play must keep answering for an accountless body — the
   * `undefined` path is scoped to ACCOUNT-level stocks only, and a
   * character-level read has nothing to resolve.
   */
  it('still answers play standing for a body with no account', () => {
    const loner = makeStuff(() => new Avatar()) as Avatar;
    stampTemplatePathForTest(loner, Avatar.getTemplatePath('loner2'));
    loner.setPlayerId('loner2');
    expect(
      InfluenceApi.standingForHost(loner as unknown as Stuff, 'consumer'),
    ).toBeDefined();
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
