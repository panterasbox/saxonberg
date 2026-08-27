/**
 * PublisherMixin and the publishing entitlement.
 *
 * ⭐ **AC 8 is written first on purpose.** *The appointing authority
 * cannot publish by virtue of being the authority* is the whole of
 * decision 2 — appointment and exercise are different powers — and it is
 * the assertion a reviewer is most likely to break by "helpfully"
 * re-adding an `||` to `mayPublishAs`. If only one test in this file
 * survives, it should be that one.
 *
 * ⚠ The fail-closed trap applies here too: with nobody holding anything,
 * everything is refused, so a suite that never appoints anyone passes
 * while testing nothing. Every refusal below is paired with an admit.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OrganizationEntity from '../../../platform/idea/Organization';
import Avatar from '../../../platform/agent/Avatar';
import { EmploymentApi } from '../../../api/employment';
import { CompactApi } from '../../../api/compact';
import { ParcelApi } from '../../../api/parcel';
import { GroupApi } from '../../../api/group';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { Mixins } from '../../mixin';
import { RELEASE_VISIBILITIES } from '../Publisher';
import type { ParcelOwner } from '../../parcel/ParcelRecord';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

const PRESS = '/compact/press';
const GROUP_REF = 'managed:g-core';
const DIRECTOR = 'communications-director';
const CLERK = 'filing-clerk';

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

/** The Compact press office as seeded: committee authority, one publishing
 *  position, plus a second non-publishing one to prove the distinction. */
function makePressOffice(): OrganizationEntity {
  const org = makeStuffAtPath(() => new OrganizationEntity(), PRESS);
  org.appointingAuthority = { kind: 'committee', parcel: '/compact' };
  org.positions = [
    { key: DIRECTOR, label: 'speaking for the Compact', wageRate: 0, confers: [] },
    { key: CLERK, label: 'filing', wageRate: 0, confers: [] },
  ];
  org.realm = 'ooc';
  org.visibility = 'public';
  org.feedPath = '/compact/press/feed';
  org.publishingPositions = [DIRECTOR];
  return org;
}

/** Title fixture: `/compact` is held by an (empty) group. */
function stubTitle(): void {
  vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
    async (): Promise<ParcelOwner> => ({
      kind: 'group',
      name: 'compact-holders',
      ref: GROUP_REF,
    }),
  );
  vi.spyOn(ParcelApi, 'resolveOwnerRef').mockImplementation(
    async (owner: ParcelOwner) =>
      owner.kind === 'group' ? (owner.ref ?? `managed:g-${owner.name}`) : null,
  );
  vi.spyOn(ParcelApi, 'coveringParcelOf').mockResolvedValue(null);
}

describe('the publishing entitlement', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    CompactApi._resetOfficeRegistryRefForReload();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ AC 8 — a committee member holding no publishing position is REFUSED', async () => {
    stubTitle();
    vi.spyOn(GroupApi, 'isMember').mockImplementation(
      async (playerId: string, ref: string) =>
        ref === GROUP_REF && playerId === 'member',
    );
    const org = makePressOffice();
    const member = makeAvatar('member');

    // They really do hold the appointing authority — the admit that keeps
    // the refusal below from passing vacuously.
    await expect(
      EmploymentApi.holdsAuthority(member, org.getAppointingAuthority()),
    ).resolves.toBe(true);

    // ...and that buys them exactly nothing at the publish step.
    expect(EmploymentApi.mayPublishAs(member, org)).toBe(false);

    // Once they appoint THEMSELVES, they may publish — as a
    // position-holder, which is how anyone earns it.
    EmploymentApi.hire(org, member as unknown as Stuff, DIRECTOR);
    expect(EmploymentApi.mayPublishAs(member, org)).toBe(true);
  });

  it('the entitlement matrix: publishing holder, other holder, stranger', () => {
    const org = makePressOffice();
    const director = makeAvatar('director');
    const clerk = makeAvatar('clerk');
    const stranger = makeAvatar('stranger');

    EmploymentApi.hire(org, director as unknown as Stuff, DIRECTOR);
    EmploymentApi.hire(org, clerk as unknown as Stuff, CLERK);

    expect(EmploymentApi.mayPublishAs(director, org)).toBe(true);
    // A position-holder — just not a publishing one.
    expect(EmploymentApi.mayPublishAs(clerk, org)).toBe(false);
    expect(EmploymentApi.mayPublishAs(stranger, org)).toBe(false);
    expect(EmploymentApi.mayPublishAs(null, org)).toBe(false);
  });

  it('an empty publishingPositions list means ANY position, not anybody', () => {
    const org = makePressOffice();
    org.publishingPositions = [];
    const clerk = makeAvatar('clerk');
    const stranger = makeAvatar('stranger');
    EmploymentApi.hire(org, clerk as unknown as Stuff, CLERK);

    expect(EmploymentApi.mayPublishAs(clerk, org)).toBe(true);
    // You still have to hold a position.
    expect(EmploymentApi.mayPublishAs(stranger, org)).toBe(false);
  });

  it('refuses an organization that does not publish at all', () => {
    const org = makePressOffice();
    const director = makeAvatar('director');
    EmploymentApi.hire(org, director as unknown as Stuff, DIRECTOR);
    expect(EmploymentApi.mayPublishAs(director, org)).toBe(true);

    // A bare organization — no PublisherMixin — refuses everyone.
    const notAPublisher = {
      ...org,
      getTemplatePath: () => PRESS,
    } as unknown as Parameters<typeof EmploymentApi.mayPublishAs>[1];
    vi.spyOn(MixinApi, 'isPublisher').mockReturnValue(false);
    expect(EmploymentApi.mayPublishAs(director, notAPublisher)).toBe(false);
  });

  it('reuses the one exit-handling path: an exit is never resurrected', () => {
    const org = makePressOffice();
    // An authored roster entry, the source that survives a cold start...
    const director = makeAvatar('director');
    org.rosterSlots = [
      {
        positionKey: DIRECTOR,
        assignee: director.getTemplatePath() ?? '',
        schedule: [],
      },
    ];
    expect(EmploymentApi.mayPublishAs(director, org)).toBe(true);

    // ...which an explicit exit suppresses rather than being resurrected by.
    EmploymentApi.hire(org, director as unknown as Stuff, DIRECTOR);
    EmploymentApi.quit(director as unknown as Stuff, PRESS);
    expect(EmploymentApi.mayPublishAs(director, org)).toBe(false);
    expect(EmploymentApi.holdersOf(org, DIRECTOR)).toEqual([]);
  });
});

describe('PublisherMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('is composed on the concrete Organization, over the chart', () => {
    const org = makePressOffice();
    expect(MixinApi.isPublisher(org as unknown as Stuff)).toBe(true);
    expect(MixinApi.isOrganization(org as unknown as Stuff)).toBe(true);
    // ...and it does not trade.
    expect(MixinApi.isBusiness(org as unknown as Stuff)).toBe(false);
    expect(MixinApi.hasMixin(OrganizationEntity, Mixins.Publisher)).toBe(true);
  });

  it('reads its declared realm, visibility, feed and publishing positions', () => {
    const org = makePressOffice();
    expect(org.getRealm()).toBe('ooc');
    expect(org.getVisibility()).toBe('public');
    expect(org.getFeedPath()).toBe('/compact/press/feed');
    expect(org.getPublishingPositions()).toEqual([DIRECTOR]);
  });

  it('⚠ defaults an unauthored or misspelled visibility to the NARROW end', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), PRESS);
    expect(org.getVisibility()).toBe('members');
    org.visibility = 'everyone-on-earth';
    expect(org.getVisibility()).toBe('members');
    // Realm's default is the operator one, which reveals nothing by itself.
    expect(org.getRealm()).toBe('ooc');
    org.realm = 'nonsense';
    expect(org.getRealm()).toBe('ooc');
  });

  it('orders the visibility vocabulary most-public-first', () => {
    // Load-bearing: the narrowing clamp is a `max` over this ordinal, so
    // an inverted list would serve members-only releases publicly.
    expect(RELEASE_VISIBILITIES).toEqual(['public', 'members']);
  });
});
