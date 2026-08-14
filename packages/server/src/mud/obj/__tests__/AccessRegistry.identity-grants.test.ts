/**
 * Founder access across a wipe — the grant keyed on the half of the
 * identity a reset cannot reach.
 *
 * ⚠⚠ **The trap this closes was recorded before it was fixed.**
 * `WIZARD_PLAYER_IDS` names CHARACTER ids; the nightly reset destroys
 * every character; so the founder's next sign-in mints a `playerId` the
 * env var has never heard of — and the env seed is boot-only on top of
 * that, so even editing it would not take effect until a restart. The
 * observable symptom is not an error: everything simply refuses, daily.
 *
 * The email is the durable half. It lives on the account's
 * already-verified provider profile, survives on Google's side of the
 * wipe, and is therefore the only key a grant can hang on that a reset
 * does not invalidate.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AccessRegistry from '../AccessRegistry';
import GroupRegistry from '../GroupRegistry';
import Avatar from '../Avatar';
import { User } from '../../lib/identity/User';
import { AccessApi } from '../../api/access';
import { RecordApi } from '../../api/record';
import { GroupApi } from '../../api/group';
import { StuffApi } from '../../api/stuff';
import { Collections } from '../../lib/persistence/Collections';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

interface Doc extends Record<string, unknown> {
  _id?: string;
  name?: string;
  email?: string;
}

/**
 * A two-collection in-memory store: `groups` (looked up by name) and
 * `google_profiles` (looked up by `_id`). Both shapes are exactly what
 * the code under test issues; nothing else is modelled.
 */
function installStore(profiles: Doc[] = []): Doc[] {
  const byCollection = new Map<string, Doc[]>();
  byCollection.set(
    Collections.GoogleProfiles,
    profiles.map((p, i) => ({ _id: `gp${i + 1}`, ...p })),
  );
  const bucket = (c: string): Doc[] => {
    let b = byCollection.get(c);
    if (!b) {
      b = [];
      byCollection.set(c, b);
    }
    return b;
  };
  const all: Doc[] = [];
  const save = vi.fn(async (collection: string, doc: Doc) => {
    const b = bucket(collection);
    const copy = { ...doc };
    if (copy._id) {
      const idx = b.findIndex((d) => d._id === copy._id);
      if (idx >= 0) b[idx] = copy;
      else b.push(copy);
      return copy._id;
    }
    copy._id = `${collection}-${b.length + 1}`;
    b.push(copy);
    return copy._id;
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      const b = bucket(collection);
      if (typeof query._id === 'string') {
        return b.filter((d) => d._id === query._id);
      }
      if (typeof query.name === 'string') {
        return b.filter((d) => d.name === query.name);
      }
      return b.slice();
    },
  );
  const findById = vi.fn(
    async (collection: string, id: string) =>
      bucket(collection).find((d) => d._id === id) ?? null,
  );
  const deleteMany = vi.fn(async (collection: string) => {
    // Only the empty-filter form is issued here (the reset's plain
    // `wipe`), so that is all this models.
    const b = bucket(collection);
    const n = b.length;
    b.length = 0;
    return n;
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    deleteMany,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  return all;
}

async function bootRegistry(): Promise<AccessRegistry> {
  if (!StuffApi.findByTemplatePath('/obj/GroupRegistry')) {
    const groups = makeStuffAtPath(
      () => new GroupRegistry(),
      '/obj/GroupRegistry',
    );
    await groups.postRegister();
  }
  const reg = makeStuffAtPath(
    () => new AccessRegistry(),
    '/obj/AccessRegistry',
  );
  await reg.postRegister();
  return reg;
}

function makeAvatar(playerId: string, googleProfileId?: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  if (googleProfileId) {
    const user = new User();
    user._id = `u-${playerId}`;
    user.googleProfileId = googleProfileId;
    av.setUser(user);
  }
  return av;
}

const ENV_KEYS = [
  'WIZARD_EMAILS',
  'ARCHWIZARD_EMAILS',
  'WIZARD_PLAYER_IDS',
  'ARCHWIZARD_PLAYER_IDS',
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
});

describe('identity grants by email', () => {
  it('⭐ a NEW character on a known account is a wizard again', async () => {
    process.env.WIZARD_EMAILS = 'founder@example.com';
    installStore([{ email: 'founder@example.com' }]);
    await bootRegistry();

    // The wipe took the old character; this is a fresh one, with a
    // playerId no config anywhere has ever seen.
    const reborn = makeAvatar('brand-new-id', 'gp1');
    expect(await AccessApi.isWizard(reborn)).toBe(false);

    await AccessApi.reconcileIdentityGrants(reborn);

    expect(await AccessApi.isWizard(reborn)).toBe(true);
  });

  it('grants the archwizard tier from its own list', async () => {
    process.env.ARCHWIZARD_EMAILS = 'founder@example.com';
    installStore([{ email: 'founder@example.com' }]);
    await bootRegistry();

    const av = makeAvatar('p1', 'gp1');
    await AccessApi.reconcileIdentityGrants(av);

    expect(await AccessApi.isArchwizard(av)).toBe(true);
    // ⚠ The two lists are separate. Being the operator is not the same
    // claim as being trusted with code, and conflating them would widen
    // one axis every time the other was set.
    expect(await AccessApi.isWizard(av)).toBe(false);
  });

  it('leaves an unlisted account alone', async () => {
    process.env.WIZARD_EMAILS = 'founder@example.com';
    installStore([{ email: 'someone.else@example.com' }]);
    await bootRegistry();

    const av = makeAvatar('p1', 'gp1');
    await AccessApi.reconcileIdentityGrants(av);

    expect(await AccessApi.isWizard(av)).toBe(false);
  });

  it('matches case-insensitively, both sides', async () => {
    process.env.WIZARD_EMAILS = 'Founder@Example.COM';
    installStore([{ email: 'founder@EXAMPLE.com' }]);
    await bootRegistry();

    const av = makeAvatar('p1', 'gp1');
    await AccessApi.reconcileIdentityGrants(av);

    expect(await AccessApi.isWizard(av)).toBe(true);
  });

  it('is idempotent — a second session adds nothing', async () => {
    process.env.WIZARD_EMAILS = 'founder@example.com';
    installStore([{ email: 'founder@example.com' }]);
    await bootRegistry();

    const av = makeAvatar('p1', 'gp1');
    await AccessApi.reconcileIdentityGrants(av);
    await AccessApi.reconcileIdentityGrants(av);

    const reg = await GroupApi.registry();
    const wizards = await reg.managed().findByName('wizards');
    expect(wizards!.memberIds).toEqual(['/obj/Avatar/p1']);
  });

  it('does nothing at all when the env lists are unset', async () => {
    installStore([{ email: 'founder@example.com' }]);
    await bootRegistry();

    const av = makeAvatar('p1', 'gp1');
    await AccessApi.reconcileIdentityGrants(av);

    expect(await AccessApi.isWizard(av)).toBe(false);
    expect(await AccessApi.isArchwizard(av)).toBe(false);
  });

  it('does nothing for an account with no provider profile', async () => {
    process.env.WIZARD_EMAILS = 'founder@example.com';
    installStore([{ email: 'founder@example.com' }]);
    await bootRegistry();

    // A guest, or a Twitch-origin account: no Google profile to read an
    // email off. It must fail closed rather than throw.
    const av = makeAvatar('p1');
    await AccessApi.reconcileIdentityGrants(av);

    expect(await AccessApi.isWizard(av)).toBe(false);
  });
});

describe('re-seeding the system groups', () => {
  it('is refused to any caller but the reset job', async () => {
    installStore();
    await bootRegistry();
    // Re-minting the system groups is one step of one destructive
    // sequence, not a capability. Anything else asking is a mistake.
    // ⚠ Synchronous, not a rejected promise: the gate fires before the
    // method body runs, so there is no promise to reject.
    expect(() => AccessApi.reseedSystemGroups()).toThrow(/denied/i);
  });

  it('⭐ the world still has its `core` group after an enforced reset', async () => {
    installStore();
    await bootRegistry();
    const reg = await GroupApi.registry();
    expect(await reg.managed().findByName('core')).not.toBeNull();

    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await RecordApi.wipe({ dryRun: false });

    // Without the re-seed this is null, every resource-targeted `can`
    // read fails closed, and nothing about it looks broken until a
    // player reports that they cannot do anything.
    expect(await reg.managed().findByName('core')).not.toBeNull();
    for (const name of ['wizards', 'archwizards', 'streamers']) {
      expect(await reg.managed().findByName(name)).not.toBeNull();
    }
  });
});
