/**
 * ⭐⭐ **The cold-box walk (AC 27).** One test, the whole chain, on the
 * database a fresh deploy actually has:
 *
 *   founder logs in            → isFounder matches the credential
 *   appoints THEMSELVES        → isCommitteeMember passes by the Art. XI
 *                                pool-of-one backstop
 *                              → the appointment verb fills the position
 *   publishes                  → requiresPublisher admits (holds it now)
 *                              → mayPublishAs admits
 *                              → the release lands in the tree, owned by
 *                                the publisher, realm derived, public
 *   an anonymous browser reads → the front-page filter passes
 *
 * ⚠ **The `core` group is EMPTY, and that is the whole point.**
 * `seedCoreGroup()` creates it empty; `WIZARD_PLAYER_IDS` seeds `wizards`,
 * not `core`; the only path that adds anyone is a dev/test provisioning
 * helper. So **nobody is an author on a fresh box, the founder included**,
 * and the two things that made this chain work — the committee appointing
 * authority and the `requiresPublisher` swap — are both invisible to any
 * test that stubs an author or a group membership.
 *
 * This suite therefore stubs `GroupApi.isMember` to **false for everyone**
 * and `AccessApi.isAuthor` to **false**, so the only thing that can carry
 * the founder through is the founder default itself.
 *
 * Both breaks this build fixed were invisible to tests that passed in
 * isolation. That is what this file exists for.
 *
 * AC 28 is the negative: the same walk for somebody who is not the
 * founder, sits on no committee, holds no office and holds no position —
 * refused at the appointment step, and nothing downstream of it runs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import AppointController from '../../obj/command/employment/AppointController';
import mustHoldAppointingAuthority from '../../lib/command/validators/mustHoldAppointingAuthority';
import requiresPublisher from '../../lib/command/validators/requiresPublisher';
import OrganizationEntity from '../../obj/Organization';
import PressBoard from '../../obj/PressBoard';
import OfficeRegistry from '../../obj/OfficeRegistry';
import Avatar from '../../obj/Avatar';
import Location from '../../lib/stuff/Location';
import { PressRoutes } from '../../../backend/PressRoutes';
import { PressApi } from '../press';
import { AppApi } from '../app';
import { AccessApi } from '../access';
import { GroupApi } from '../group';
import { ParcelApi } from '../parcel';
import { CompactApi } from '../compact';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EmploymentApi } from '../employment';
import { ExecutionContextApi } from '../execution-context';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Document } from '../../lib/persistence/Document';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { ParcelOwner } from '../../lib/parcel/ParcelRecord';

/* ── the box ─────────────────────────────────────────────────────── */

const PRESS = '/compact/press';
const PRESS_FEED = '/compact/press/feed';
const DIRECTOR = 'communications-director';
const CORE_GROUP = 'managed:g-core';
const FOUNDER_EMAIL = 'founder@example.com';

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

function installStore(): void {
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

/**
 * ⚠ The `core` group holds title over `/compact` and has **no members**.
 * `isMember` is false for everybody, always — exactly what a fresh
 * `seedCoreGroup()` leaves behind.
 */
function installEmptyCoreTitle(): void {
  vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
    async (): Promise<ParcelOwner> => ({
      kind: 'group',
      name: 'core',
      ref: CORE_GROUP,
    }),
  );
  vi.spyOn(ParcelApi, 'resolveOwnerRef').mockImplementation(
    async (owner: ParcelOwner) =>
      owner.kind === 'group' ? (owner.ref ?? `managed:g-${owner.name}`) : null,
  );
  vi.spyOn(ParcelApi, 'coveringParcelOf').mockResolvedValue(null);
  vi.spyOn(GroupApi, 'isMember').mockResolvedValue(false);
  // ...and therefore nobody is an author, the founder included.
  vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
}

/** The Compact press office, exactly as its seed ships it: UNFILLED. */
function installPressOffice(): OrganizationEntity {
  const org = makeStuffAtPath(() => new OrganizationEntity(), PRESS);
  org.appointingAuthority = { kind: 'committee', parcel: '/compact' };
  org.label = 'the Compact';
  org.realm = 'ooc';
  org.visibility = 'public';
  org.feedPath = PRESS_FEED;
  org.positions = [
    { key: DIRECTOR, label: 'speaking for the Compact', wageRate: 0, confers: [] },
  ];
  org.rosterSlots = [];
  org.publishingPositions = [DIRECTOR];
  return org;
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

function seedGoogleUser(playerId: string, email: string): void {
  const gid = seedDoc('google_profiles', { googleId: `g-${playerId}`, email });
  seedDoc('users', { playerIds: [playerId], googleProfileId: gid });
}

function contextFor(giver: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Location()) as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

/** The `appoint` verb's field gate, exactly as the dispatcher runs it. */
async function appointmentGate(
  giver: Stuff,
  organization: string,
): Promise<string | undefined> {
  const ctx = contextFor(giver, 'appoint');
  const allowed = await mustHoldAppointingAuthority.preload!(
    organization,
    'organization',
    ctx,
  );
  return mustHoldAppointingAuthority(organization, 'organization', ctx, allowed);
}

/** The `press` verb's affordance gate, exactly as the dispatcher runs it. */
async function pressGate(giver: Stuff): Promise<string | undefined> {
  const ctx = contextFor(giver, 'press');
  const allowed = await requiresPublisher.preload!(ctx);
  return requiresPublisher(ctx, allowed);
}

async function runAppoint(
  giver: Stuff,
  model: CommandModel,
): Promise<CommandContext> {
  const ctx = contextFor(giver, 'appoint');
  await withRootContext(null, 'cold-box', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return makeStuff(() => new AppointController()).execute(
      model as never,
      ctx,
    );
  });
  return ctx;
}

function pressApp(): Express {
  const app = express();
  PressRoutes.setup(app);
  return app;
}

/* ── the walk ────────────────────────────────────────────────────── */

describe('⭐⭐ the cold-box walk', () => {
  let prevGoogle: string | undefined;

  beforeEach(async () => {
    prevGoogle = process.env.FOUNDER_GOOGLE_EMAIL;
    process.env.FOUNDER_GOOGLE_EMAIL = FOUNDER_EMAIL;
    installStore();
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    CompactApi._resetOfficeRegistryRefForReload();
    installEmptyCoreTitle();
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === AppSettingKeys.pressFrontPage ? PRESS : '',
    );
    void makeStuffAtPath(() => new PressBoard(), '/obj/PressBoard');
    const reg = makeStuffAtPath(() => new OfficeRegistry(), '/obj/OfficeRegistry');
    await reg.postRegister();
    CompactApi._resetOfficeRegistryRefForReload();
  });

  afterEach(() => {
    if (prevGoogle === undefined) delete process.env.FOUNDER_GOOGLE_EMAIL;
    else process.env.FOUNDER_GOOGLE_EMAIL = prevGoogle;
    vi.restoreAllMocks();
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
  });

  it('AC 27 — founder appoints themselves, publishes, and a stranger reads it', async () => {
    seedGoogleUser('founder', FOUNDER_EMAIL);
    const founder = makeAvatar('founder');
    const org = installPressOffice();

    // ── The box really is cold ────────────────────────────────────
    await expect(CompactApi.isFounder(founder)).resolves.toBe(true);
    await expect(AccessApi.isAuthor(founder)).resolves.toBe(false);
    await expect(GroupApi.isMember('founder', CORE_GROUP)).resolves.toBe(
      false,
    );
    // Nobody holds the position, so nobody can publish yet — which is the
    // designed empty state, not a fault.
    expect(EmploymentApi.holdersOf(org, DIRECTOR)).toEqual([]);
    expect(EmploymentApi.mayPublishAs(founder, org)).toBe(false);
    await expect(pressGate(founder)).resolves.toMatch(
      /no publishing position/,
    );

    // ── Appointment: the founder default is the ONLY thing that carries
    //    them, since `core` is empty ─────────────────────────────────
    await expect(appointmentGate(founder, PRESS)).resolves.toBeUndefined();
    const ctx = await runAppoint(founder, {
      target: { stuff: founder },
      position: DIRECTOR,
      organization: PRESS,
    } as unknown as CommandModel);
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      false,
    );
    expect(EmploymentApi.holdersOf(org, DIRECTOR)).toEqual([
      '/obj/Avatar/founder',
    ]);

    // ── Publishing: earned by holding the position, not by being the
    //    authority ───────────────────────────────────────────────────
    await expect(pressGate(founder)).resolves.toBeUndefined();
    expect(EmploymentApi.mayPublishAs(founder, org)).toBe(true);

    const release = await withRootContext(null, 'cold-box', () => {
      ExecutionContextApi.tagActingAuthor(founder);
      return PressApi.publish({
        publisher: PRESS,
        headline: 'Saxonberg is open',
        body: 'Come in.',
      });
    });
    expect(release.getOwner()).toBe(PRESS);
    expect(release.getRealm()).toBe('ooc'); // derived from the publisher
    expect(release.getVisibility()).toBe('public');

    // ── And a browser that has never authenticated reads it ─────────
    const res = await request(pressApp()).get('/api/press/releases');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].headline).toBe('Saxonberg is open');
    expect(res.body[0].publisherLabel).toBe('the Compact');
    expect(res.body[0].author).toBeUndefined();
  });

  it('AC 28 — a non-founder with no committee, office or position is refused at the APPOINTMENT step', async () => {
    seedGoogleUser('founder', FOUNDER_EMAIL);
    seedGoogleUser('nobody', 'nobody@example.com');
    const stranger = makeAvatar('nobody');
    const org = installPressOffice();

    await expect(CompactApi.isFounder(stranger)).resolves.toBe(false);
    await expect(appointmentGate(stranger, PRESS)).resolves.toMatch(
      /authority/,
    );

    // Nothing downstream of the refusal happened: no position filled, no
    // publishing right, no release, nothing on the front page.
    expect(EmploymentApi.holdersOf(org, DIRECTOR)).toEqual([]);
    expect(EmploymentApi.mayPublishAs(stranger, org)).toBe(false);
    await expect(pressGate(stranger)).resolves.toMatch(
      /no publishing position/,
    );
    await expect(
      withRootContext(null, 'cold-box', () => {
        ExecutionContextApi.tagActingAuthor(stranger);
        return PressApi.publish({ publisher: PRESS, headline: 'let me in' });
      }),
    ).rejects.toThrow(/no publishing position/);

    const res = await request(pressApp()).get('/api/press/releases');
    expect(res.body).toEqual([]);
  });
});
