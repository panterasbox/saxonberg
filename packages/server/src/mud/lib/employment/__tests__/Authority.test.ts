/**
 * The appointing authority — `PrincipalRef` and its resolver.
 *
 * ⚠ **The fail-closed test trap.** Every delegate here (`holdsOffice`,
 * `holdsSeat`, `isCommitteeMember`) refuses with no registry, so a suite
 * that forgets to stand one up **passes while testing nothing**. Every
 * kind below therefore constructs its registry and asserts an *admit*
 * before asserting the matching refusal.
 *
 * Harness: the collection-aware in-memory `PersistenceManager` from the
 * OfficeRegistry suite (the office half needs real `office_holders` rows
 * so ⭐ AC 3 exercises a real handoff rather than a stubbed one), plus the
 * `GovernmentCatalogue` warm from the GovernmentLogic suite and the
 * parcel-title stubs from the CompactLogic suite.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Authority, type PrincipalRef } from '../Authority';
import { OrganizationMixin } from '../Organization';
import { EmployedMixin } from '../Employed';
import { Idea } from '../../stuff/Idea';
import Avatar from '../../../platform/agent/Avatar';
import GovernmentCatalogue from '../../../platform/idea/GovernmentCatalogue';
import Government from '../../../platform/idea/Government';
import OfficeRegistry from '../../../platform/idea/OfficeRegistry';
import { EmploymentApi } from '../../../api/employment';
import { CompactApi } from '../../../api/compact';
import { ParcelApi } from '../../../api/parcel';
import { GroupApi } from '../../../api/group';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { Template } from '../../stuff/Template';
import { Document } from '../../persistence/Document';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import type { ParcelOwner } from '../../parcel/ParcelRecord';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

/* ───────────────────────── the harness ───────────────────────── */

interface Doc extends Record<string, unknown> {
  _id?: string;
}

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(collection: string): Doc[] {
  let arr = store.get(collection);
  if (!arr) {
    arr = [];
    store.set(collection, arr);
  }
  return arr;
}

function seedDoc(collection: string, doc: Doc): string {
  const id = doc._id ?? String(++idCounter);
  col(collection).push({ ...doc, _id: id });
  return id;
}

function installInMemoryStore(): void {
  store = new Map();
  idCounter = 0;
  const save = vi.fn(async (collection: string, doc: Doc) => {
    const arr = col(collection);
    if (doc._id) {
      const idx = arr.findIndex((d) => d._id === doc._id);
      if (idx >= 0) arr[idx] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const findById = vi.fn(
    async (collection: string, id: string) =>
      col(collection).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (collection: string, id: string) => {
    const arr = col(collection);
    const idx = arr.findIndex((d) => d._id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      const arr = col(collection);
      if (typeof query.playerIds === 'string') {
        return arr.filter(
          (d) =>
            Array.isArray(d.playerIds) &&
            (d.playerIds as string[]).includes(query.playerIds as string),
        );
      }
      const keys = Object.keys(query);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) => keys.every((k) => d[k] === query[k]));
    },
  );
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

/** A non-trading organization — the thing an authority is authored on. */
class OrganizationEntity extends OrganizationMixin(Idea) {
  static _mixinName = 'OrganizationEntity';
}

class EmployedHost extends EmployedMixin(Idea) {
  static _mixinName = 'EmployedHost';
}

const ORG = '/compact/press';
const REGISTRY_BUSINESS = '/world/terminus/registry/business';
const GROUP_REF = 'managed:g-core';
const FOUNDER_EMAIL = 'founder@example.com';

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

/** Seed a User owning `playerId`, linked to a Google profile with `email`. */
function seedGoogleUser(playerId: string, email: string): void {
  const gid = seedDoc('google_profiles', { googleId: `g-${playerId}`, email });
  seedDoc('users', { playerIds: [playerId], googleProfileId: gid });
}

async function bootOfficeRegistry(): Promise<OfficeRegistry> {
  const reg = makeStuffAtPath(
    () => new OfficeRegistry(),
    '/platform/idea/OfficeRegistry',
  );
  await reg.postRegister();
  CompactApi._resetOfficeRegistryRefForReload();
  return reg;
}

/** Title fixture: everything resolves to one empty group. */
function stubTitle(): void {
  vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
    async (): Promise<ParcelOwner> => ({
      kind: 'group',
      name: 'commons',
      ref: GROUP_REF,
    }),
  );
  vi.spyOn(ParcelApi, 'resolveOwnerRef').mockImplementation(
    async (owner: ParcelOwner) =>
      owner.kind === 'group' ? (owner.ref ?? `managed:g-${owner.name}`) : null,
  );
  vi.spyOn(ParcelApi, 'coveringParcelOf').mockResolvedValue(null);
}

/** A government whose one seat points at a position on an organization. */
async function warmGovernment(): Promise<void> {
  vi.spyOn(Template, 'findDescendants').mockImplementation(
    async (basePath: string) => {
      if (basePath !== Government.TEMPLATE_PATH_PREFIX) return [];
      return [
        {
          path: `${Government.TEMPLATE_PATH_PREFIX}terminus-city`,
          data: {
            key: 'terminus-city',
            displayName: 'the City of Terminus',
            seats: [
              {
                key: 'magistrate',
                label: 'Magistrate of Terminus',
                department: REGISTRY_BUSINESS,
                positionKey: 'magistrate',
              },
            ],
          },
        },
      ] as unknown as Template[];
    },
  );
  const cat = makeStuffAtPath(
    () => new GovernmentCatalogue(),
    '/platform/idea/GovernmentCatalogue',
  );
  await cat.postRegister();
}

/* ───────────────────────── the tests ───────────────────────── */

describe('Authority.fromData', () => {
  it('normalizes a legacy bare proprietorPath string to an entity ref', () => {
    expect(Authority.fromData('/world/lounge/npc/dave')).toEqual({
      kind: 'entity',
      path: '/world/lounge/npc/dave',
    });
  });

  it('reads all four kinds and nothing else', () => {
    expect(Authority.fromData({ kind: 'entity', path: '/x' })).toEqual({
      kind: 'entity',
      path: '/x',
    });
    expect(Authority.fromData({ kind: 'office', office: 'pm' })).toEqual({
      kind: 'office',
      office: 'pm',
    });
    expect(
      Authority.fromData({ kind: 'seat', government: 'g', seat: 's' }),
    ).toEqual({ kind: 'seat', government: 'g', seat: 's' });
    expect(Authority.fromData({ kind: 'committee', parcel: '/p' })).toEqual({
      kind: 'committee',
      parcel: '/p',
    });
    // ⚠ No `author` kind — the operator axis is an override on top of an
    // authority, never an authority in its own right.
    expect(Authority.fromData({ kind: 'author' })).toBeNull();
  });

  it('fails closed on empty, malformed and half-authored refs', () => {
    expect(Authority.fromData('')).toBeNull();
    expect(Authority.fromData(null)).toBeNull();
    expect(Authority.fromData(undefined)).toBeNull();
    expect(Authority.fromData(42)).toBeNull();
    expect(Authority.fromData({ kind: 'entity' })).toBeNull();
    expect(Authority.fromData({ kind: 'seat', government: 'g' })).toBeNull();
    expect(Authority.fromData({ kind: 'committee', parcel: '' })).toBeNull();
  });
});

describe('EmploymentApi.holdsAuthority — the four-kind matrix', () => {
  let prevGoogle: string | undefined;

  beforeEach(() => {
    prevGoogle = process.env.FOUNDER_GOOGLE_EMAIL;
    process.env.FOUNDER_GOOGLE_EMAIL = FOUNDER_EMAIL;
    installInMemoryStore();
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    CompactApi._resetOfficeRegistryRefForReload();
  });

  afterEach(() => {
    if (prevGoogle === undefined) delete process.env.FOUNDER_GOOGLE_EMAIL;
    else process.env.FOUNDER_GOOGLE_EMAIL = prevGoogle;
    vi.restoreAllMocks();
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
  });

  it('refuses an unauthored authority and a null principal (fail closed)', async () => {
    const someone = makeAvatar('someone');
    await expect(
      EmploymentApi.holdsAuthority(someone, null),
    ).resolves.toBe(false);
    await expect(
      EmploymentApi.holdsAuthority(null, { kind: 'entity', path: '/x' }),
    ).resolves.toBe(false);
  });

  it('entity — matches the named templatePath and nothing else', async () => {
    const dave = makeStuffAtPath(() => new EmployedHost(), '/npc/dave');
    const mara = makeStuffAtPath(() => new EmployedHost(), '/npc/mara');
    const ref: PrincipalRef = { kind: 'entity', path: '/npc/dave' };
    await expect(
      EmploymentApi.holdsAuthority(dave as unknown as Stuff, ref),
    ).resolves.toBe(true);
    await expect(
      EmploymentApi.holdsAuthority(mara as unknown as Stuff, ref),
    ).resolves.toBe(false);
  });

  it('office — the founder holds it by default; a non-founder does not', async () => {
    seedGoogleUser('fp', FOUNDER_EMAIL);
    seedGoogleUser('bp', 'bob@example.com');
    await bootOfficeRegistry();
    const founder = makeAvatar('fp');
    const bob = makeAvatar('bp');
    const ref: PrincipalRef = { kind: 'office', office: 'prime-minister' };

    await expect(EmploymentApi.holdsAuthority(founder, ref)).resolves.toBe(
      true,
    );
    await expect(EmploymentApi.holdsAuthority(bob, ref)).resolves.toBe(false);
  });

  it('office — with NO registry standing, everybody is refused', async () => {
    seedGoogleUser('fp', FOUNDER_EMAIL);
    const founder = makeAvatar('fp');
    // No `bootOfficeRegistry()` — the delegate fails closed rather than
    // granting office authority it cannot prove.
    await expect(
      EmploymentApi.holdsAuthority(founder, {
        kind: 'office',
        office: 'prime-minister',
      }),
    ).resolves.toBe(false);
  });

  it('seat — the roster holder of the seat’s position, and nobody else', async () => {
    await warmGovernment();
    const registry = makeStuffAtPath(
      () => new OrganizationEntity(),
      REGISTRY_BUSINESS,
    );
    registry.positions = [
      { key: 'magistrate', label: 'sitting', wageRate: 0, confers: [] },
    ];
    const odile = makeAvatar('odile');
    registry.rosterSlots = [
      {
        positionKey: 'magistrate',
        assignee: odile.getTemplatePath() ?? '',
        schedule: [],
      },
    ];
    const stranger = makeAvatar('stranger');
    const ref: PrincipalRef = {
      kind: 'seat',
      government: 'terminus-city',
      seat: 'magistrate',
    };

    await expect(EmploymentApi.holdsAuthority(odile, ref)).resolves.toBe(true);
    await expect(EmploymentApi.holdsAuthority(stranger, ref)).resolves.toBe(
      false,
    );
  });

  it('committee — a member of the title-holding group, and nobody else', async () => {
    stubTitle();
    vi.spyOn(GroupApi, 'isMember').mockImplementation(
      async (playerId: string, ref: string) =>
        ref === GROUP_REF && playerId === 'member',
    );
    const member = makeAvatar('member');
    const outsider = makeAvatar('outsider');
    const ref: PrincipalRef = { kind: 'committee', parcel: '/compact' };

    await expect(EmploymentApi.holdsAuthority(member, ref)).resolves.toBe(
      true,
    );
    await expect(EmploymentApi.holdsAuthority(outsider, ref)).resolves.toBe(
      false,
    );
  });

  it('committee — a non-Avatar fails closed before the group read', async () => {
    stubTitle();
    const isMember = vi
      .spyOn(GroupApi, 'isMember')
      .mockResolvedValue(true);
    const prop = makeStuffAtPath(() => new EmployedHost(), '/obj/prop');
    await expect(
      EmploymentApi.holdsAuthority(prop as unknown as Stuff, {
        kind: 'committee',
        parcel: '/compact',
      }),
    ).resolves.toBe(false);
    expect(isMember).not.toHaveBeenCalled();
  });

  it('⭐ AC 3 — staff follows the seat: reassigning the office moves who may appoint, and touches no record', async () => {
    seedGoogleUser('fp', FOUNDER_EMAIL);
    seedGoogleUser('bp', 'bob@example.com');
    await bootOfficeRegistry();
    const founder = makeAvatar('fp');
    const bob = makeAvatar('bp');

    const org = makeStuffAtPath(() => new OrganizationEntity(), ORG);
    org.appointingAuthority = { kind: 'office', office: 'prime-minister' };
    org.positions = [
      {
        key: 'communications-director',
        label: 'speaking for the office',
        wageRate: 0,
        confers: [],
      },
    ];
    // Somebody already holds the position — the whole point is that the
    // handover below must not disturb them.
    const staffer = makeStuffAtPath(() => new EmployedHost(), '/npc/staffer');
    EmploymentApi.hire(
      org,
      staffer as unknown as Stuff,
      'communications-director',
    );
    const employmentsBefore = JSON.stringify(staffer.employments);
    const rosterBefore = JSON.stringify(org.rosterSlots);

    const authority = () => org.getAppointingAuthority();
    await expect(
      EmploymentApi.holdsAuthority(founder, authority()),
    ).resolves.toBe(true);
    await expect(EmploymentApi.holdsAuthority(bob, authority())).resolves.toBe(
      false,
    );

    // The handover — an explicit `office_holders` row, which is exactly
    // what `OfficeRegistry.assign` writes. Driven as a row rather than
    // through `office assign`, whose verb path is recorded broken in
    // governance.md (and whose registry method is gated to CompactApi).
    seedDoc('office_holders', { officeKey: 'prime-minister', holderId: 'bp' });

    // Who may appoint has moved...
    await expect(EmploymentApi.holdsAuthority(bob, authority())).resolves.toBe(
      true,
    );
    await expect(
      EmploymentApi.holdsAuthority(founder, authority()),
    ).resolves.toBe(false);

    // ...with no employment or roster record touched.
    expect(JSON.stringify(staffer.employments)).toBe(employmentsBefore);
    expect(JSON.stringify(org.rosterSlots)).toBe(rosterBefore);
    expect(
      EmploymentApi.holdersOf(org, 'communications-director'),
    ).toEqual(['/npc/staffer']);
  });
});

describe('the appointing authority on an organization', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('reads a legacy `proprietorPath` seed with no seed edit', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), ORG);
    org.proprietorPath = '/world/lounge/npc/dave';
    expect(org.getAppointingAuthority()).toEqual({
      kind: 'entity',
      path: '/world/lounge/npc/dave',
    });
    // ...and the economic half still gets its proprietor.
    expect(org.getProprietor()).toBe('/world/lounge/npc/dave');
  });

  it('lets an authored `appointingAuthority` win over the legacy field', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), ORG);
    org.proprietorPath = '/world/lounge/npc/dave';
    org.appointingAuthority = { kind: 'office', office: 'prime-minister' };
    expect(org.getAppointingAuthority()).toEqual({
      kind: 'office',
      office: 'prime-minister',
    });
    // An office-held organization has no proprietor — nobody's unpaid
    // cover, nobody's `businessOfProprietor`.
    expect(org.getProprietor()).toBeUndefined();
  });

  it('has no authority at all when nothing is authored', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), ORG);
    expect(org.getAppointingAuthority()).toBeNull();
    expect(org.getProprietor()).toBeUndefined();
  });
});
