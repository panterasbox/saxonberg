/**
 * OfficeRegistry — the government-office substrate: the authored
 * apparatus, founder-by-credential resolution, the founder-default
 * occupancy model, and sparse handoff persistence.
 *
 * Harness: a collection-aware in-memory PersistenceManager standing up
 * the identity collections the founder resolution needs (`users`,
 * `google_profiles`, `twitch_profiles`) plus `office_holders`, a
 * hand-stamped Registry at `/obj/OfficeRegistry`, and real `Avatar`
 * instances. Handoffs are driven by writing/deleting `OfficeHolder` rows
 * directly (the mechanism — the gated `assign`/`vacate` happy path is
 * exercised end-to-end through the controller in OfficeController.test);
 * occupancy is read through the ungated `CompactApi` surface.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OfficeRegistry from '../OfficeRegistry';
import Avatar from '../Avatar';
import { CompactApi } from '../../api/compact';
import { StuffApi } from '../../api/stuff';
import { Document } from '../../lib/persistence/Document';
import { OfficeHolder } from '../../lib/governance/OfficeHolder';
import { OFFICE_APPARATUS, Office } from '../../lib/governance/Office';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

type Store = Map<string, Doc[]>;

let store: Store;
let idCounter = 0;

function col(collection: string): Doc[] {
  let arr = store.get(collection);
  if (!arr) {
    arr = [];
    store.set(collection, arr);
  }
  return arr;
}

/** Push a plain doc into a collection; returns its assigned _id. */
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
  const findById = vi.fn(async (collection: string, id: string) => {
    return col(collection).find((d) => d._id === id) ?? null;
  });
  const del = vi.fn(async (collection: string, id: string) => {
    const arr = col(collection);
    const idx = arr.findIndex((d) => d._id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      const arr = col(collection);
      // {playerIds: id} — Mongo array-contains.
      if (typeof query.playerIds === 'string') {
        return arr.filter(
          (d) =>
            Array.isArray(d.playerIds) &&
            (d.playerIds as string[]).includes(query.playerIds as string),
        );
      }
      if (typeof query.officeKey === 'string') {
        return arr.filter((d) => d.officeKey === query.officeKey);
      }
      // Scalar-equality fallthrough.
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
  // TwitchProfile declares field marshallers; `find`/`findById` preload
  // them. Wire a no-op resolver so the preload doesn't throw (our stub
  // twitch_profiles docs carry no token fields, so the marshaller is
  // never actually invoked).
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function bootRegistry(): Promise<OfficeRegistry> {
  const reg = makeStuffAtPath(
    () => new OfficeRegistry(),
    '/obj/OfficeRegistry',
  );
  await reg.postRegister();
  return reg;
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

/** Seed a User owning `playerId` linked to a Google profile with `email`. */
function seedGoogleUser(playerId: string, email: string): void {
  const gid = seedDoc('google_profiles', { googleId: `g-${playerId}`, email });
  seedDoc('users', { playerIds: [playerId], googleProfileId: gid });
}

/** Seed a User owning `playerId` linked to a Twitch profile with `login`. */
function seedTwitchUser(playerId: string, login: string): void {
  const tid = seedDoc('twitch_profiles', {
    twitchUserId: `t-${playerId}`,
    login,
    displayName: login,
  });
  seedDoc('users', { playerIds: [playerId], twitchProfileId: tid });
}

const GOOGLE_ENV = 'FOUNDER_GOOGLE_EMAIL';
const TWITCH_ENV = 'FOUNDER_TWITCH_HANDLE';

describe('OfficeRegistry', () => {
  let prevGoogle: string | undefined;
  let prevTwitch: string | undefined;

  beforeEach(() => {
    prevGoogle = process.env[GOOGLE_ENV];
    prevTwitch = process.env[TWITCH_ENV];
    delete process.env[GOOGLE_ENV];
    delete process.env[TWITCH_ENV];
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
  });

  afterEach(() => {
    if (prevGoogle === undefined) delete process.env[GOOGLE_ENV];
    else process.env[GOOGLE_ENV] = prevGoogle;
    if (prevTwitch === undefined) delete process.env[TWITCH_ENV];
    else process.env[TWITCH_ENV] = prevTwitch;
    vi.restoreAllMocks();
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
  });

  it('warms the five offices with correct branch + origin; no jury/judiciary, no cardinality', () => {
    const keys = OFFICE_APPARATUS.map((o) => o.getKey());
    expect(keys).toEqual([
      'prime-minister',
      'speaker-producer-house',
      'speaker-capital-house',
      'speaker-consumer-house',
      'central-bank-governor',
    ]);
    expect(Office.byKey('prime-minister')!.getBranch()).toBe('executive');
    expect(Office.byKey('prime-minister')!.getOrigin()).toBe('constituted');
    expect(Office.byKey('speaker-producer-house')!.getBranch()).toBe(
      'legislative',
    );
    expect(Office.byKey('central-bank-governor')!.getBranch()).toBe(
      'executive',
    );
    expect(Office.byKey('central-bank-governor')!.getOrigin()).toBe(
      'founder-established',
    );
    // No judiciary branch / jury office exists.
    expect(keys.some((k) => k.includes('jury') || k.includes('judic'))).toBe(
      false,
    );
    // The value-object carries no cardinality / mustBeFilled.
    const pm = Office.byKey('prime-minister')! as unknown as Record<
      string,
      unknown
    >;
    expect('cardinality' in pm).toBe(false);
    expect('mustBeFilled' in pm).toBe(false);
  });

  it('isFounder is true for a matching Google email (case-insensitive)', async () => {
    process.env[GOOGLE_ENV] = 'Bobalu@Panterasbox.com';
    installInMemoryStore();
    seedGoogleUser('founder', 'bobalu@panterasbox.com');
    seedGoogleUser('rando', 'someone@example.com');
    await bootRegistry();

    expect(await CompactApi.isFounder(makeAvatar('founder'))).toBe(true);
    expect(await CompactApi.isFounder(makeAvatar('rando'))).toBe(false);
  });

  it('isFounder is true for a matching Twitch handle (case-insensitive login)', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    // TwitchProfile.login is stored lowercased.
    seedTwitchUser('founder', 'bobalu_smallberries');
    await bootRegistry();

    expect(await CompactApi.isFounder(makeAvatar('founder'))).toBe(true);
  });

  it('isFounder is false when no matching User exists yet', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    // No users seeded (founder hasn't logged in).
    await bootRegistry();

    expect(await CompactApi.isFounder(makeAvatar('founder'))).toBe(false);
  });

  it('the founder is the default holder of every office (pool-of-one)', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    seedTwitchUser('founder', 'bobalu_smallberries');
    await bootRegistry();

    const founder = makeAvatar('founder');
    for (const office of OFFICE_APPARATUS) {
      const held = await CompactApi.officeHolderOf(office.getKey());
      expect(held.kind).toBe('founder');
      if (held.kind === 'founder') {
        expect(held.founderLabel).toBe('Bobalu_Smallberries');
      }
      expect(await CompactApi.holdsOffice(founder, office.getKey())).toBe(true);
    }
  });

  it('officesOf lists the founder full set; a non-founder holds none', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    seedTwitchUser('founder', 'bobalu_smallberries');
    await bootRegistry();

    const founderOffices = await CompactApi.officesOf(makeAvatar('founder'));
    expect(founderOffices.sort()).toEqual(
      OFFICE_APPARATUS.map((o) => o.getKey()).sort(),
    );
    expect(await CompactApi.officesOf(makeAvatar('nobody'))).toEqual([]);
  });

  it('an explicit handoff overrides the founder default for that seat', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    seedTwitchUser('founder', 'bobalu_smallberries');
    await bootRegistry();

    seedDoc('office_holders', {
      officeKey: 'prime-minister',
      holderId: 'alice',
    });

    const held = await CompactApi.officeHolderOf('prime-minister');
    expect(held.kind).toBe('explicit');
    if (held.kind === 'explicit') expect(held.holderPlayerId).toBe('alice');

    expect(await CompactApi.holdsOffice(makeAvatar('alice'), 'prime-minister')).toBe(
      true,
    );
    expect(
      await CompactApi.holdsOffice(makeAvatar('founder'), 'prime-minister'),
    ).toBe(false);

    // The founder still holds the other four.
    const founderOffices = await CompactApi.officesOf(makeAvatar('founder'));
    expect(founderOffices).not.toContain('prime-minister');
    expect(founderOffices.length).toBe(OFFICE_APPARATUS.length - 1);
  });

  it('roster lists every office with branch, origin, and current holder', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    seedTwitchUser('founder', 'bobalu_smallberries');
    await bootRegistry();
    seedDoc('office_holders', {
      officeKey: 'prime-minister',
      holderId: 'alice',
    });

    const roster = await CompactApi.officeRoster();
    expect(roster.length).toBe(OFFICE_APPARATUS.length);
    const pm = roster.find((r) => r.key === 'prime-minister')!;
    expect(pm.branch).toBe('executive');
    expect(pm.origin).toBe('constituted');
    expect(pm.isFounderDefault).toBe(false);
    expect(pm.holderPlayerId).toBe('alice');
    const gov = roster.find((r) => r.key === 'central-bank-governor')!;
    expect(gov.isFounderDefault).toBe(true);
    expect(gov.holderPlayerId).toBeNull();
    expect(gov.founderLabel).toBe('Bobalu_Smallberries');
  });

  it('an explicit handoff persists across a registry reload (nothing to clobber)', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    seedTwitchUser('founder', 'bobalu_smallberries');
    await bootRegistry();
    seedDoc('office_holders', {
      officeKey: 'prime-minister',
      holderId: 'alice',
    });

    // Reload: re-construct the registry over the same store, re-run
    // postRegister (which does no DB work).
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
    await bootRegistry();

    const held = await CompactApi.officeHolderOf('prime-minister');
    expect(held.kind).toBe('explicit');
    if (held.kind === 'explicit') expect(held.holderPlayerId).toBe('alice');
  });

  it('holderOf reports unknown for a non-apparatus office key', async () => {
    installInMemoryStore();
    await bootRegistry();
    const held = await CompactApi.officeHolderOf('grand-vizier');
    expect(held.kind).toBe('unknown');
  });

  it('an OfficeHolder.findByOfficeKey + delete reverts to the founder default', async () => {
    process.env[TWITCH_ENV] = 'Bobalu_Smallberries';
    installInMemoryStore();
    seedTwitchUser('founder', 'bobalu_smallberries');
    await bootRegistry();
    seedDoc('office_holders', {
      officeKey: 'prime-minister',
      holderId: 'alice',
    });

    const row = await OfficeHolder.findByOfficeKey('prime-minister');
    expect(row).not.toBeNull();
    await row!.delete();

    const held = await CompactApi.officeHolderOf('prime-minister');
    expect(held.kind).toBe('founder');
    expect(
      await CompactApi.holdsOffice(makeAvatar('founder'), 'prime-minister'),
    ).toBe(true);
  });
});
