/**
 * ProfileLogic.composeCard — the viewer-aware redaction matrix (the
 * acceptance crux of social-inspection). Asserts the three tiers:
 *
 *  - **stranger** (not recognized): perceived physicality + always-outward
 *    standing show; the persona (name surface, bio, chronicle)
 *    is withheld entirely.
 *  - **recognized**: the persona unlocks.
 *  - **self**: everything, plus the standing digest; no observer
 *    annotations.
 *
 * The substrate Apis are stubbed (the `StandingController` test precedent),
 * so this is a pure logic test — no DB, no perception, no real mixins.
 */

import "../../../../../test-bootstrap";

let recognizedNow = false;
let statusNow = 'active';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MixinApi } from '../../../../api/mixin';
import { PlayerApi } from '../../../../api/player';
import { RenownApi } from '../../../../api/renown';
import { InfluenceApi } from '../../../../api/influence';
import { ConnectionApi } from '../../../../api/connection';
import { ShellApi } from '../../../../api/shell';
import { Band } from '../../../../lib/standing/Band';
import { InfluenceStanding } from '../../../../lib/standing/InfluenceStanding';
import { StuffApi } from '../../../../api/stuff';
import { ProxyApi } from '../../../../api/proxy';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { ProfileLogic } from '../ProfileLogic';

/**
 * White-box: the RAW (unproxied) logic instance — the fakes here are not
 * Stuff, so the compose entry is called directly (no gate; both fakes
 * carry no circle scope so the read aperture is the identity branch).
 * `Stuff.RAW_TARGET` is the sanctioned raw-state test seam.
 */
function composerRaw(): ProfileLogic {
  const proxy = StuffApi.createSync(() => new ProfileLogic());
  return (proxy as never as Record<symbol, ProfileLogic>)[ProxyApi.RAW_TARGET]!;
}
const composer = { 
  composeCard: (v: Stuff, t: Stuff) => composerRaw().composeCard(v, t),
  composeRow: (v: Stuff, t: Stuff) => composerRaw().composeRow(v, t),
};

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
    getBio: () => 'A wandering healer.',
    // The viewer-aware naming face (base Stuff methods) — the fakes
    // mirror the registered face.
    describeFor: () => (recognizedNow ? 'Mara' : 'a tall human woman'),
    kindFor: () => 'npc',
    // The chronicle owner face (the OO sweep): the composer reads the
    // ledger off the target itself.
    chronicleEntries: async () => [],
  } as unknown as Stuff;
}

function makeViewer(): Stuff {
  return {
    stuffId: 'v1',
    recognizes: () => recognizedNow,
    regardFor: () => 0,
    allContacts: () => [],
  } as unknown as Stuff;
}

/** Stub every substrate Api the composer reads. `recognized` varies. */
function stubSubstrate(recognized: boolean): void {
  // Identity mixin predicates — the target carries them all; never disguised.
  vi.spyOn(MixinApi, 'isOrganism').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isGendered').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isStatus').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isNamed').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isPersona').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isDisguisable').mockReturnValue(false);
  vi.spyOn(MixinApi, 'isContacts').mockReturnValue(true);
  // Not an Avatar in this unit — country / newness / presence status are
  // exercised separately; keeps this test to the identity-redaction core.
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(false);
  // Recognition rides the viewer's belief realm + the target face
  // since the OO sweep.
  vi.spyOn(MixinApi, 'isBeliefStore').mockReturnValue(true);
  recognizedNow = recognized;
  Stuff._registerRecognitionFace(() => ({
    describe: () => (recognizedNow ? 'Mara' : 'a tall human woman'),
    describeWithStatus: () => (recognizedNow ? 'Mara' : 'a tall human woman'),
    salientFeaturesOf: () => 'a tall human woman',
    perceivedKeywords: () => [],
    kindOf: () => 'npc' as const,
    knowsTrueType: () => false,
  }));
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
  vi.spyOn(InfluenceApi, 'standingForHost').mockReturnValue({
    at: 'here',
    standing: new InfluenceStanding('acct', 'producer', 0, Band.of('dormant')),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ProfileLogic.composeCard redaction', () => {
  it('withholds the persona from a stranger but shows physicality + renown', async () => {
    stubSubstrate(false);
    const card = await composer.composeCard(makeViewer(), makeTarget());

    expect(card.recognized).toBe(false);
    // Persona hidden.
    expect(card.nameSurface).toBeUndefined();
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
    const card = await composer.composeCard(makeViewer(), makeTarget());

    expect(card.recognized).toBe(true);
    expect(card.nameSurface?.name).toBe('Mara');
    expect(card.nameSurface?.surname).toBe('Voss');
    expect(card.bio).toBe('A wandering healer.');
  });

  it('gives the self-card everything plus the standing digest, no annotations', async () => {
    stubSubstrate(true);
    const me = makeTarget();
    const card = await composer.composeCard(me, me);

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
      getPresentation: () => 'Mara',
      describeFor: () => 'Mara',
      kindFor: () => 'player',
      getPlayerId: () => 'p-mara',
      presenceStatus: () => statusNow,
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
    recognizedNow = true;
    vi.spyOn(ConnectionApi, 'originOf').mockReturnValue({ country: 'Brazil' });
    statusNow = status;
    vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(showStatus as never);
  }

  it('always shows country and a notable status under `anyone`', async () => {
    stubRow('idle', 'anyone');
    const row = await composer.composeRow(viewer(), makeAvatarTarget());
    expect(row.country).toBe('Brazil');
    expect(row.status).toBe('idle');
  });

  it('withholds the granular status from a non-contact under `contacts+`', async () => {
    stubRow('idle', 'contacts+');
    const row = await composer.composeRow(viewer(), makeAvatarTarget());
    expect(row.country).toBe('Brazil'); // country is unconditional
    expect(row.status).toBeUndefined(); // bare online — status withheld
  });

  it('⭐ carries the @<id> a viewer may type (naming overhaul D-B6)', async () => {
    stubRow('active', 'anyone');
    const row = await composer.composeRow(viewer(), makeAvatarTarget());
    expect(row.address).toBe('@p-mara');
  });

  it('⭐ withholds the @<id> when a disguise masks who they are', async () => {
    stubRow('active', 'anyone');
    vi.spyOn(MixinApi, 'isDisguisable').mockReturnValue(true);
    const t = makeAvatarTarget() as unknown as Record<string, unknown>;
    t.getDisguise = () => ({ masksIdentity: true });
    const row = await composer.composeRow(viewer(), t as unknown as Stuff);
    expect(row.address).toBeUndefined();
  });

  it('omits the unremarkable active default from a row', async () => {
    stubRow('active', 'anyone');
    const row = await composer.composeRow(viewer(), makeAvatarTarget());
    expect(row.status).toBeUndefined();
  });

  it("on a self-card that is not the account's Compact character, names where Make is shown — and a stranger's card never does", async () => {
    stubSubstrate(true);
    vi.spyOn(InfluenceApi, 'standingForHost').mockReturnValue({
      at: 'compact-character',
      subject: '/platform/agent/Avatar/first',
      playerId: 'first',
    });
    vi.spyOn(PlayerApi, 'storedNameOf').mockResolvedValue('Odile Marsh');
    const me = makeTarget();
    const mine = await composer.composeCard(me, me);
    expect(mine.digest?.influence?.make).toBeUndefined();
    expect(mine.digest?.accountShownOn).toBe('Odile Marsh');

    // Another player's view of the same character carries no pointer: the
    // account's characters stay unlinked for others (D13).
    const theirs = await composer.composeCard(makeViewer(), me);
    expect(JSON.stringify(theirs)).not.toContain('Odile Marsh');
  });
});
