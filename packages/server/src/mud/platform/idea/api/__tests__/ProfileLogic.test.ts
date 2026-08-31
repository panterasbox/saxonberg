/**
 * ProfileLogic.composeCard — the viewer-aware redaction matrix (the
 * acceptance crux of social-inspection). Asserts the three tiers:
 *
 *  - **stranger** (not recognized): perceived physicality + always-outward
 *    standing show; the persona (name surface, aspiration, bio, chronicle)
 *    is withheld entirely.
 *  - **recognized**: the persona unlocks.
 *  - **self**: everything, plus the standing digest; no observer
 *    annotations.
 *
 * The substrate Apis are stubbed (the `StandingController` test precedent),
 * so this is a pure logic test — no DB, no perception, no real mixins.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SocialApi } from '../../../../api/social';
import { MixinApi } from '../../../../api/mixin';
import { PlayerApi } from '../../../../api/player';
import { RecognitionApi } from '../../../../api/recognition';
import { RenownApi } from '../../../../api/renown';
import { InfluenceApi } from '../../../../api/influence';
import { AdvancementApi } from '../../../../api/advancement';
import { TraitApi } from '../../../../api/trait';
import { RegardApi } from '../../../../api/regard';
import { ChronicleApi } from '../../../../api/chronicle';
import { ConnectionApi } from '../../../../api/connection';
import { ShellApi } from '../../../../api/shell';
import { Band } from '../../../../lib/standing/Band';
import { InfluenceStanding } from '../../../../lib/standing/InfluenceStanding';
import { StuffApi } from '../../../../api/stuff';
import type { Stuff } from '../../../../lib/stuff/Stuff';

/** A target with the full identity getter surface. */
function makeTarget(): Stuff {
  return {
    stuffId: 't1',
    getTemplatePath: () => '/platform/agent/Avatar/t1',
    getIdentityPath: () => '/platform/agent/Avatar/t1',
    getPresentation: () => 'Mara',
    getName: () => 'Mara',
    getHonorific: () => undefined,
    getSurname: () => 'Voss',
    getNameSuffix: () => undefined,
    getAlternateNames: () => [],
    getSpecies: () => ({ getCommonNames: () => ['human'] }),
    getLifecycleState: () => 'adult',
    getSex: () => 'female',
    getPronouns: () => 'she',
    getStatus: () => 'watching the road',
    getAspiration: () => 'healer',
    getBio: () => 'A wandering healer.',
  } as unknown as Stuff;
}

function makeViewer(): Stuff {
  return {
    stuffId: 'v1',
    allContacts: () => [],
  } as unknown as Stuff;
}

/** Stub every substrate Api the composer reads. `recognized` varies. */
function stubSubstrate(recognized: boolean): void {
  // Identity mixin predicates — the target carries them all; never disguised.
  vi.spyOn(MixinApi, 'isOrganism').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isSexed').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isGendered').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isStatus').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isNamed').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isPersona').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isDisguisable').mockReturnValue(false);
  vi.spyOn(MixinApi, 'isContacts').mockReturnValue(true);
  // Not an Avatar in this unit — country / newness / presence status are
  // exercised separately; keeps this test to the identity-redaction core.
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(false);
  vi.spyOn(RecognitionApi, 'recognizes').mockReturnValue(recognized);
  vi.spyOn(RecognitionApi, 'describe').mockReturnValue(
    recognized ? 'Mara' : 'a tall human woman'
  );
  // Standing — empty / dormant without a DB; the composer must still
  // surface renown + competence outward.
  vi.spyOn(RenownApi, 'renownOf').mockReturnValue(0);
  vi.spyOn(InfluenceApi, 'bandOf').mockReturnValue(Band.of('dormant'));
  // ⚠ Make is ACCOUNT-level and reads through the host seam, which
  // returns `undefined` for a target with no account — and this unit's
  // target is a bare Stuff, not an Avatar. Mocked so the assertion below
  // stays about "the digest carries make", which is what this test is
  // for; the account resolution itself is covered in
  // `Avatar.standing-split.test.ts`.
  vi.spyOn(InfluenceApi, 'standingForHost').mockReturnValue(
    new InfluenceStanding('acct', 'producer', 0, Band.of('dormant'))
  );
  vi.spyOn(AdvancementApi, 'bandsFor').mockResolvedValue([]);
  vi.spyOn(TraitApi, 'pronouncedFor').mockResolvedValue([]);
  vi.spyOn(RegardApi, 'getRegard').mockReturnValue(0);
  vi.spyOn(ChronicleApi, 'entriesFor').mockResolvedValue([]);
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ProfileLogic.composeCard redaction', () => {
  it('withholds the persona from a stranger but shows physicality + renown', async () => {
    stubSubstrate(false);
    const card = await SocialApi.composeCard(makeViewer(), makeTarget());

    expect(card.recognized).toBe(false);
    // Persona hidden.
    expect(card.nameSurface).toBeUndefined();
    expect(card.aspiration).toBeUndefined();
    expect(card.bio).toBeUndefined();
    expect(card.chronicle).toBeUndefined();
    // Observable physicality shown.
    expect(card.species).toBe('human');
    expect(card.sex).toBe('female');
    expect(card.pronouns).toBe('she');
    expect(card.ageStage).toBe('adult');
    expect(card.flavor).toBe('watching the road');
    // Always-outward standing shown even to a stranger.
    expect(card.renownBand).toBe('dormant');
    // Not the self-card.
    expect(card.isSelf).toBe(false);
    expect(card.digest).toBeUndefined();
  });

  it('unlocks the persona once recognized', async () => {
    stubSubstrate(true);
    const card = await SocialApi.composeCard(makeViewer(), makeTarget());

    expect(card.recognized).toBe(true);
    expect(card.nameSurface?.name).toBe('Mara');
    expect(card.nameSurface?.surname).toBe('Voss');
    expect(card.aspiration).toBe('healer');
    expect(card.bio).toBe('A wandering healer.');
  });

  it('gives the self-card everything plus the standing digest, no annotations', async () => {
    stubSubstrate(true);
    const me = makeTarget();
    const card = await SocialApi.composeCard(me, me);

    expect(card.isSelf).toBe(true);
    expect(card.nameSurface?.name).toBe('Mara');
    expect(card.digest).toBeDefined();
    expect(card.digest?.influence?.play).toBe('dormant');
    expect(card.digest?.influence?.make).toBe('dormant');
    // Observer-owned annotations never appear on your own card.
    expect(card.yourLabel).toBeUndefined();
    expect(card.yourRegard).toBeUndefined();
  });
});

describe('ProfileLogic.composeRow — country always, status gated', () => {
  /** An Avatar-shaped target (country / presence-status bearing). */
  function makeAvatarTarget(): Stuff {
    return {
      stuffId: 't1',
      getTemplatePath: () => '/platform/agent/Avatar/t1',
      getIdentityPath: () => '/platform/agent/Avatar/t1',
    getIdentityPath: () => '/platform/agent/Avatar/t1',
      getPresentation: () => 'Mara',
      getPlayerId: () => 'p-mara',
      allContacts: () => [], // viewer is not a contact of the target
    } as unknown as Stuff;
  }
  function viewer(): Stuff {
    return {
      stuffId: 'v1',
      getPlayerId: () => 'p-view',
      getTemplatePath: () => '/platform/agent/Avatar/p-view',
      getIdentityPath: () => '/platform/agent/Avatar/p-view',
    } as unknown as Stuff;
  }

  function stubRow(status: string, showStatus: string): void {
    vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isContacts').mockReturnValue(true);
    vi.spyOn(RecognitionApi, 'recognizes').mockReturnValue(true);
    vi.spyOn(RecognitionApi, 'describe').mockReturnValue('Mara');
    vi.spyOn(ConnectionApi, 'originOf').mockReturnValue({ country: 'Brazil' });
    vi.spyOn(SocialApi, 'statusOf').mockReturnValue(status as never);
    vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(showStatus as never);
  }

  it('always shows country and a notable status under `anyone`', async () => {
    stubRow('idle', 'anyone');
    const row = await SocialApi.composeRow(viewer(), makeAvatarTarget());
    expect(row.country).toBe('Brazil');
    expect(row.status).toBe('idle');
  });

  it('withholds the granular status from a non-contact under `contacts+`', async () => {
    stubRow('idle', 'contacts+');
    const row = await SocialApi.composeRow(viewer(), makeAvatarTarget());
    expect(row.country).toBe('Brazil'); // country is unconditional
    expect(row.status).toBeUndefined(); // bare online — status withheld
  });

  it('omits the unremarkable active default from a row', async () => {
    stubRow('active', 'anyone');
    const row = await SocialApi.composeRow(viewer(), makeAvatarTarget());
    expect(row.status).toBeUndefined();
  });
});
