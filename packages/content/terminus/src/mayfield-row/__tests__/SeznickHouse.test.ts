/**
 * Seznick House — the leased rung, end to end over real cloned content
 * (residences wave 6, D3/D9/D16): lease → an EMPTY unit (built-ins
 * only) behind a fresh key → whole-unit dormancy → reconstitution →
 * unlease (goods to storage intact + titled, records cleared, slot
 * freed, re-keyed) → the ascent gate. The DormWarren harness shape.
 */

import '@saxonberg/server/test-bootstrap';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LeaseController from '../idea/cmd/LeaseController';
import Walter from '../agent/Walter';
import UnleaseController from '../idea/cmd/UnleaseController';
import type BuildingWarren from '@saxonberg/content-residence/src/idea/BuildingWarren';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import ChattelRegistry from '@saxonberg/server/mud/platform/idea/ChattelRegistry';
import Avatar from '@saxonberg/server/mud/platform/agent/Avatar';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { GroupApi } from '@saxonberg/server/mud/api/group';
import { Lock } from '@saxonberg/server/mud/lib/lock/Lock';
import { ChattelApi } from '@saxonberg/server/mud/api/chattel';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { CommandApi, type CommandContext, type ModelData } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

type MemberStuff = Stuff & Container;

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PH = PersistentHydrator.templatePath;
const HOUSE = '/world/terminus/mayfield-row/seznick-house';
const BUILDING = `${HOUSE}/building`;
const PROGRAMME = `${HOUSE}/unit-programme`;
const LOBBY = `${HOUSE}/lobby`;
const CORRIDOR = `${HOUSE}/corridor`;

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(name: string): Doc[] {
  let arr = store.get(name);
  if (!arr) {
    arr = [];
    store.set(name, arr);
  }
  return arr;
}

/**
 * The SHIPPED class for a row, read off disk.
 *
 * ⚠ The fixture used to hard-code these, and hard-coding is how a suite
 * goes green against a world that does not exist: the corridor moved off
 * `FurnishableRoom` (it is minted per floor and keeps no record) and the
 * lobby onto `SingletonCartesianLocation`, and every one of these tests
 * kept passing against the old classes. A fixture may stub what it does
 * not want to boot — it may not invent a DIFFERENT world.
 */
function shippedClass(path: string): string | null {
  const rel = path.replace('/world/terminus/mayfield-row/', '');
  const file = fileURLToPath(
    new URL(
      `../../../content/world/terminus/mayfield-row/${rel}.yaml`,
      import.meta.url,
    ),
  );
  if (!existsSync(file)) return null;
  const m = /^class:\s*(\S+)\s*$/m.exec(readFileSync(file, 'utf8'));
  return m ? m[1]! : null;
}

function seedDomain(): void {
  const domain = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    domain.push({
      _id: `d-${++idCounter}`,
      path,
      // The shipped class wins wherever the row really exists; `cls` is
      // the fallback for the synthetic rows this fixture invents.
      class: shippedClass(path) ?? cls,
      hydratorClass: PH,
      data,
    });
  domain.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  add(BUILDING, '/system/residence/idea/BuildingWarren', {
    programmePath: PROGRAMME,
    corridorTemplate: CORRIDOR,
    lobbyPath: LOBBY,
    parentExtent: HOUSE,
    capacityKey: 'mayfield.unitCap',
    defaultCapacity: 3,
    plan: { shape: 'linear', frontagesPerNode: 2, frontageLeaf: 'u' },
  });
  add(PROGRAMME, '/system/residence/idea/HoldingWarren', {
    upkeepTerm: 'landlord-shell',
    floorplan: [
      {
        leaf: 'hall',
        room: `${HOUSE}/location/hall`,
        entry: true,
        exits: [{ to: 'main', direction: 'north', opposite: 'south' }],
      },
      { leaf: 'main', room: `${HOUSE}/location/main` },
    ],
  });
  add(`${HOUSE}/location/hall`, '/platform/location/FurnishableRoom', {
    shortDescription: 'the entry hall',
  });
  add(`${HOUSE}/location/main`, '/platform/location/FurnishableRoom', {
    shortDescription: 'the main room',
  });
  add(CORRIDOR, '/platform/location/FurnishableRoom', {
    shortDescription: 'a Seznick House landing',
  });
  add(LOBBY, '/platform/location/FurnishableRoom', {
    shortDescription: 'the Seznick House lobby',
  });
  add('/stuff/thing/Key', '/platform/thing/Key', { shortDescription: 'a key' });
  add('/world/test/lamp', '/platform/thing/Prop', {
    shortDescription: 'a tin lamp',
  });
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  seedDomain();
  col('parcels').push(
    {
      _id: `p-${++idCounter}`,
      extent: '/world/terminus/mayfield-row',
      zonePath: '/world/terminus/mayfield-row',
      owner: { kind: 'group', name: 'terminus' },
      parentParcel: null,
      grants: [],
      allowance: null,
      landUse: 'residential',
    },
    {
      _id: `p-${++idCounter}`,
      extent: HOUSE,
      zonePath: HOUSE,
      owner: { kind: 'group', name: 'mayfield-holdings' },
      parentParcel: '/world/terminus/mayfield-row',
      grants: [],
      allowance: null,
      landUse: 'residential',
    },
  );
  const save = vi.fn(async (c: string, doc: Doc) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const arr = col(c);
    const keys = Object.keys(q);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) =>
      keys.every((k) => {
        const stored = d[k];
        if (Array.isArray(stored)) return stored.includes(q[k]);
        return stored === q[k];
      }),
    );
  });
  const findById = vi.fn(
    async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (c: string, id: string) => {
    const arr = col(c);
    const i = arr.findIndex((d) => d._id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function bootRegistries(): Promise<void> {
  const g = makeStuffAtPath(() => new GroupRegistry(), '/platform/idea/GroupRegistry');
  await g.postRegister();
  const p = makeStuffAtPath(() => new ParcelRegistry(), '/platform/idea/ParcelRegistry');
  await p.postRegister();
  const c = makeStuffAtPath(() => new ChattelRegistry(), '/platform/idea/ChattelRegistry');
  await c.postRegister();
  await ParcelApi.rebuildCoverageIndex();
}

async function building(): Promise<BuildingWarren> {
  return StuffApi.singleton<BuildingWarren>(BUILDING);
}

/** Walter's authority: conferred membership in the owner group (the
 *  installer's seam, reached on the raw logic — the Katie test shape). */
async function conferStaff(memberKey: string): Promise<void> {
  const { ref } = await GroupApi.ensureGroup('mayfield-holdings', {
    kind: 'system',
  });
  const GroupLogicCls = (await StuffApi.loadClassByPath(
    '/platform/idea/api/GroupLogic',
  )) as new () => Stuff;
  const { ProxyApi } = await import('@saxonberg/server/mud/api/proxy');
  const logic = ProxyApi.unwrap(
    StuffApi.singletonSync('/platform/idea/api/group', () => new GroupLogicCls()) as unknown as Stuff,
  ) as unknown as {
    ensureMember(ref: unknown, id: string, role: string): Promise<unknown>;
  };
  await logic.ensureMember(ref, memberKey, 'member');
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeAvatar(id: string): Avatar {
  const a = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  a.setPlayerId(id);
  return a;
}

async function run(
  ctrl: LeaseController | UnleaseController,
  giver: Stuff,
  player: Stuff,
  verb: string,
): Promise<CommandContext> {
  const ctx = CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: null as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: stubCommand(verb),
  });
  await withRootContext(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(giver);
    await (ctrl as LeaseController).execute(
      { player: { stuff: player } } as ModelData as never,
      ctx,
    );
  });
  return ctx;
}

function reasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

const snapshots = () => col('holder_snapshots');

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  ChattelApi._resetRegistryRefForReload();
  StuffApi.clearAll();
}

describe('Seznick House — the lease loop', () => {
  let walter: Avatar;

  beforeEach(async () => {
    reset();
    installStore();
    await bootRegistries();
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    walter = makeAvatar('walter-test');
    await conferStaff(walter.getIdentityPath()!);
  });
  afterEach(reset);

  it('⭐ lease → an EMPTY keyed unit; the door is keyway-gated', async () => {
    const w = await building();
    const tenant = makeAvatar('iris');
    const issued: string[] = [];
    vi.spyOn(Lock, 'issueKey').mockImplementation((async (
      _who: Stuff,
      keyway: string,
    ) => {
      issued.push(keyway);
    }) as unknown as typeof Lock.issueKey);

    const ctx = await run(makeStuff(() => new LeaseController()), walter, tenant, 'lease');
    expect(reasons(ctx)).toEqual([]);

    const unit = `${HOUSE}/units/f1-u1`;
    const record = await ParcelApi.coveringParcelOf(unit);
    expect(record?.getExtent()).toBe(unit);
    expect(record?.getKeyway()).toBeTruthy();
    expect(issued).toEqual([record!.getKeyway()]);
    expect(await ParcelApi.hasUseGrant(unit, tenant.getIdentityPath()!)).toBe(true);

    // The unit stands EMPTY at move-in: built-ins only (zero contents in
    // this harness — the count is the pin, D9).
    const entry = await w.admit(unit);
    expect(entry.getContents()).toHaveLength(0);
    const holding = w.holdingFor(unit)!;
    expect(
      (holding as unknown as { getUpkeepTerm(): string }).getUpkeepTerm(),
    ).toBe('landlord-shell');

    // The corridor door hangs, keyway-gated: keyless refused.
    await w.ensureNode('main:1');
    const door = w.entryFor(unit)!;
    expect(door).not.toBeNull();
    const stranger = makeAvatar('bob');
    expect(
      (door as unknown as { canTraverse(m: unknown): { ok: boolean } }).canTraverse(
        stranger as never,
      ).ok,
    ).toBe(false);
  });

  it('⭐ whole-unit dormancy → reconstitution with placed state intact', async () => {
    const w = await building();
    const tenant = makeAvatar('iris');
    await run(makeStuff(() => new LeaseController()), walter, tenant, 'lease');
    const unit = `${HOUSE}/units/f1-u1`;

    const entry = await w.admit(unit);
    const holding = w.holdingFor(unit)! as unknown as {
      roomForLeaf(l: string): MemberStuff | null;
    };
    const main = holding.roomForLeaf('main')!;

    ContainmentApi.move(tenant, main);
    const lamp = await StuffApi.clone<Stuff>('/world/test/lamp');
    ContainmentApi.move(lamp as never, main);

    // Occupied (in the MAIN room, not the entry): nothing reaps — the
    // whole-holding aggregate, never room-by-room.
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    expect(entry.isDestroyed()).toBe(false);
    expect(main.isDestroyed()).toBe(false);

    // Vacate → the WHOLE unit sleeps; re-admit restores the lamp.
    StuffApi.destruct(tenant as unknown as Stuff);
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    expect(entry.isDestroyed()).toBe(true);
    expect(main.isDestroyed()).toBe(true);

    await w.admit(unit);
    const holding2 = w.holdingFor(unit)! as unknown as {
      roomForLeaf(l: string): MemberStuff | null;
    };
    const main2 = holding2.roomForLeaf('main')!;
    expect(
      main2
        .getContents()
        .some(
          (c) =>
            (c as unknown as { getShortDescription?: () => string })
              .getShortDescription?.() === 'a tin lamp',
        ),
    ).toBe(true);
  });

  it('⭐ unlease: goods to STORAGE intact + titled; the unit re-leases empty and re-keyed', async () => {
    const w = await building();
    const tenant = makeAvatar('iris');
    await run(makeStuff(() => new LeaseController()), walter, tenant, 'lease');
    const unit = `${HOUSE}/units/f1-u1`;
    const firstKeyway = (await ParcelApi.coveringParcelOf(unit))!.getKeyway();

    await w.admit(unit);
    const holding = w.holdingFor(unit)! as unknown as {
      roomForLeaf(l: string): MemberStuff | null;
    };
    const main = holding.roomForLeaf('main')!;

    // A bought good, chattel-stamped to the tenant, placed in the room.
    const lamp = await StuffApi.clone<Stuff>('/world/test/lamp');
    await ChattelApi.stamp(lamp as never, tenant as never);
    ContainmentApi.move(lamp as never, main);
    await ChattelApi.setPlace(lamp as never, `${HOUSE}/location/main#${unit}/main`);

    const ctx = await run(makeStuff(() => new UnleaseController()), walter, tenant, 'unlease');
    expect(reasons(ctx)).toEqual([]);

    // The good survived — in storage, still the tenant's (never destructed).
    const rows = await ChattelApi.placedIn('storage');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.owner).toMatchObject({
      templatePath: tenant.getIdentityPath(),
    });

    // Records cleared, slot freed.
    expect(
      snapshots().filter((s) => String(s.owner).startsWith(unit)),
    ).toHaveLength(0);
    const gone = await ParcelApi.coveringParcelOf(unit);
    expect(gone?.getExtent()).not.toBe(unit);

    // Re-lease: the SAME slot, a FRESH keyway, and empty again.
    const tenant2 = makeAvatar('rosa');
    await run(makeStuff(() => new LeaseController()), walter, tenant2, 'lease');
    const second = await ParcelApi.coveringParcelOf(unit);
    expect(second?.getExtent()).toBe(unit);
    expect(second!.getKeyway()).not.toBe(firstKeyway);
    const entry2 = await w.admit(unit);
    expect(entry2.getContents()).toHaveLength(0);
  });

  it('the ascent gate refuses a dilapidated holder and passes a kept one (P10)', async () => {
    const tenant = makeAvatar('iris');
    col('parcels').push({
      _id: `p-${++idCounter}`,
      extent: '/world/elsewhere/dorms/f1-r1',
      zonePath: '/world/elsewhere/dorms/f1-r1',
      owner: { kind: 'group', name: 'landlord' },
      parentParcel: '/world/elsewhere/dorms',
      grants: [],
      allowance: null,
    });
    await ParcelApi.rebuildCoverageIndex();
    await ParcelApi.grantUse(
      '/world/elsewhere/dorms/f1-r1',
      tenant.getIdentityPath()!,
      null,
    );
    const cond = vi
      .spyOn(OuterWarren, 'conditionOf')
      .mockResolvedValue({ condition: 0.2, band: 'dilapidated' });

    const ctx = await run(makeStuff(() => new LeaseController()), walter, tenant, 'lease');
    expect(reasons(ctx)).toContain('ascent-condition');

    cond.mockResolvedValue({ condition: 0.95, band: 'sound' });
    const ctx2 = await run(makeStuff(() => new LeaseController()), walter, tenant, 'lease');
    expect(reasons(ctx2)).not.toContain('ascent-condition');
  });

  it('a random principal is refused; capacity refuses at the cap', async () => {
    await building(); // the house ledger must be standing
    const nobody = makeAvatar('nobody');
    const t0 = makeAvatar('t0');
    const ctx = await run(makeStuff(() => new LeaseController()), nobody, t0, 'lease');
    expect(reasons(ctx)).toContain('not-authorized');

    for (let i = 1; i <= 3; i++) {
      const t = makeAvatar(`t${i}`);
      const c = await run(makeStuff(() => new LeaseController()), walter, t, 'lease');
      expect(reasons(c)).toEqual([]);
    }
    const t4 = makeAvatar('t4');
    const c4 = await run(makeStuff(() => new LeaseController()), walter, t4, 'lease');
    expect(reasons(c4)).toContain('at-capacity');
  });

  it('⭐ the building reconstitutes from the durable slot set after teardown', async () => {
    const w = await building();
    const tenant = makeAvatar('iris');
    await run(makeStuff(() => new LeaseController()), walter, tenant, 'lease');
    const unit = `${HOUSE}/units/f1-u1`;
    await w.admit(unit);

    w.teardown();
    await w.postRegister();

    expect(w.nodeReachable('main:1')).toBe(true);
    const reborn = await w.admit(unit);
    expect(reborn.isDestroyed()).toBe(false);
    expect(reborn.getTemplatePath()).toBe(`${HOUSE}/location/hall`);
  });

  /**
   * ⚠⚠ The affordance is a STATIC ON A CLASS, and nothing else.
   *
   * Walter's row first carried `commandContributions:` inside its `data`
   * block, which reads like it works and does nothing at all: the
   * per-instance contributor hook was removed on purpose (two records of
   * one fact, one of them on the containment hot path), so the field
   * landed on an instance property nobody reads and BOTH lease verbs
   * were unreachable — silently, with every other test still green. This
   * is the test that would have caught it.
   */
  it('⭐ Walter affords the operator verbs — from his CLASS, sideways to the room', () => {
    const verbs = CommandApi.collectContributions(Walter, 'peers')
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('lease');
    expect(verbs).toContain('unlease');
  });
});
