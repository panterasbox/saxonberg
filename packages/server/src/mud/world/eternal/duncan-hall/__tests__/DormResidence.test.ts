/**
 * DormResidence — the residence verbs end-to-end over the REAL DormWarren +
 * content, against the multi-collection in-memory store (domain clone /
 * holder_snapshots D1 / parcels lease). Covers Phase 5 (provisioning +
 * decorate theme-seal), Phase 6 (unprovision revert + slot reuse), and the
 * Phase 7 reap/reconstitution scenarios not covered by DormWarren.test.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DormWarren from '../DormWarren';
import DormRoom from '../DormRoom';
import Desk from '../Desk';
import ProvisionController from '../command/ProvisionController';
import UnprovisionController from '../command/UnprovisionController';
import RemodelController from '../command/RemodelController';
import DormThemes from '../DormThemes';
import { PromptApi } from '../../../../api/prompt';
import type Interactive from '../../../../obj/Interactive';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ParcelApi } from '../../../../api/parcel';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import Location from '../../../../lib/stuff/Location';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { Idea } from '../../../../lib/stuff/Idea';
import PersistentHydrator from '../../../../obj/persistence/PersistentHydrator';
import { Document } from '../../../../lib/persistence/Document';
import ParcelRegistry from '../../../../obj/ParcelRegistry';
import GroupRegistry from '../../../../obj/GroupRegistry';
import Avatar from '../../../../obj/Avatar';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { ExecutionContextApi } from '../../../../api/execution-context';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { AccessApi } from '../../../../api/access';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PH = PersistentHydrator.templatePath;
const DORMS = DormWarren.DORMS_EXTENT;

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

// The born-with fixtures a DormRoom seeds, declared as `populates:` data (the
// same list the real dormroom.yaml carries) — no longer a class const.
const FIXTURES = [
  '/world/eternal/duncan-hall/dorm-fixtures/bed',
  '/world/eternal/duncan-hall/dorm-fixtures/desk',
  '/world/eternal/duncan-hall/dorm-fixtures/footlocker',
];

function seedDomain(): void {
  const domain = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    domain.push({ _id: `d-${++idCounter}`, path, class: cls, hydratorClass: PH, data });
  domain.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  add(DormWarren.WARREN_PATH, '/world/eternal/duncan-hall/DormWarren');
  add(DormRoom.SCOPE, '/world/eternal/duncan-hall/DormRoom', {
    shortDescription: 'a dorm room',
    // Fixtures as data — the spine's seedBornWith lays these down once.
    populates: FIXTURES,
  });
  add(DormWarren.CORRIDOR_TEMPLATE, '/world/eternal/duncan-hall/Corridor', {
    shortDescription: 'a dorm corridor',
  });
  add(DormWarren.LOBBY_PATH, '/world/eternal/duncan-hall/Corridor', {
    shortDescription: 'the lobby',
  });
  add(FIXTURES[0]!, '/world/eternal/duncan-hall/Bed', {
    shortDescription: 'a narrow bed',
  });
  add(FIXTURES[1]!, '/world/eternal/duncan-hall/Desk', {
    shortDescription: 'a plain desk',
  });
  add(FIXTURES[2]!, '/world/eternal/duncan-hall/Footlocker', {
    shortDescription: 'a footlocker',
  });
  add('/obj/Key', '/obj/Key', { shortDescription: 'a key' });
}

function seedUnit(floor: number, pos: number): string {
  const extent = `${DORMS}/f${floor}-r${pos}`;
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent,
    zonePath: extent,
    owner: { kind: 'group', name: 'duncan-hall' },
    parentParcel: DORMS,
    grants: [],
    allowance: null,
  });
  return extent;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  seedDomain();
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent: DORMS,
    zonePath: DORMS,
    owner: { kind: 'group', name: 'duncan-hall' },
    parentParcel: null,
    grants: [],
    allowance: null,
  });

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
  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    const arr = col(collection);
    const keys = Object.keys(query);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) =>
      keys.every((k) => {
        const stored = d[k];
        const wanted = query[k];
        if (Array.isArray(stored)) return stored.includes(wanted);
        return stored === wanted;
      }),
    );
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
  const groups = makeStuffAtPath(() => new GroupRegistry(), '/obj/GroupRegistry');
  await groups.postRegister();
  const parcels = makeStuffAtPath(() => new ParcelRegistry(), '/obj/ParcelRegistry');
  await parcels.postRegister();
}

async function warren(): Promise<DormWarren> {
  return StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
}

class Occupant extends HasInteractiveMixin(ContainableMixin(Idea)) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  StuffApi.clearAll();
  DormThemes.themesSource = null;
  /*
   * ⚠ Re-stubbed AFTER `restoreAllMocks`, and that ordering is the
   * point — a stub installed in a file-level `beforeEach` is wiped by
   * this call, which every describe block makes.
   *
   * None of this file is about authorization. The permission answer
   * used to be assumed: the access predicates returned true whenever no
   * `AccessRegistry` was registered, which is every test here. That
   * fail-open is gone — a missing authority is not a grant — so the
   * dependency is declared where a reader can see it.
   */
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
}

const snapshots = () => col('holder_snapshots');

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

function ctxFor(
  giver: Stuff,
  verb: string,
  interactive?: Interactive,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Location()) as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    interactive,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: Noop\ndescription: stub\n`,
      '<test>',
    ),
  });
}

/** A context carrying a stub Interactive — for the `remodel` prompt (the
 *  choice itself is mocked; the controller only needs a non-null viewer). */
function ctxWithInteractive(giver: Stuff, verb: string): CommandContext {
  return ctxFor(giver, verb, {} as unknown as Interactive);
}

function rejectionReason(ctx: CommandContext): string | null {
  const rej = ctx.getNotes().find((n) => n.kind === 'controller-rejected') as
    | { reason?: string }
    | undefined;
  return rej?.reason ?? null;
}

async function run(
  controller: { execute(m: never, c: CommandContext): Promise<void> },
  giver: Stuff,
  model: CommandModel,
  ctx: CommandContext,
): Promise<void> {
  await withRootContext(null, 'residence.test', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return controller.execute(model as never, ctx);
  });
}

const shortDesc = (s: Stuff): string =>
  (s as unknown as { getShortDescription(): string }).getShortDescription();

/* ────────────── Phase 5: shell personalization (move-in + remodel) ────────── */

describe('shell personalization — move-in theme + local remodel', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('move-in: `provision --theme` seals the style; it survives reap', async () => {
    await bootRegistries();
    const w = await warren();
    const op = makeAvatar('op'); // a dorms agent (isWizard-open in the harness)
    const tenant = makeAvatar('tenant');

    const ctx = ctxFor(op, 'provision');
    await run(
      makeStuff(() => new ProvisionController()),
      op,
      { player: { stuff: tenant }, theme: 'nautical' } as unknown as CommandModel,
      ctx,
    );
    expect(rejectionReason(ctx)).toBeNull();

    const unit = (await ParcelApi.heldUnitOf(tenant.getTemplatePath()!))!.getExtent();
    const room = await w.admit(unit);
    expect(shortDesc(room)).toBe('a nautical dorm room');
    expect(
      shortDesc(room.getContents().find((c) => c instanceof Desk)!),
    ).toBe('a chart-laden desk');

    // Dormancy: empty room reaps (captured sealed) → re-admit restores nautical.
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    expect(room.isDestroyed()).toBe(true);
    const reborn = await w.admit(unit);
    expect(shortDesc(reborn)).toBe('a nautical dorm room');
  });

  it('remodel: the leaseholder redoes the room from the menu (a local prompt)', async () => {
    const k1 = seedUnit(1, 1);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();
    await ParcelApi.grantUse(k1, '/obj/Avatar/iris', null);
    const iris = makeAvatar('iris');
    const room = await w.admit(k1);
    ContainmentApi.move(iris, room); // standing in their room

    // The choice wheel resolves to 'nautical' (the player's pick).
    vi.spyOn(PromptApi, 'choice').mockResolvedValue('nautical' as never);
    const ctx = ctxWithInteractive(iris, 'remodel');
    await run(makeStuff(() => new RemodelController()), iris, {} as CommandModel, ctx);
    expect(rejectionReason(ctx)).toBeNull();
    expect(shortDesc(room)).toBe('a nautical dorm room');
    expect(
      shortDesc(room.getContents().find((c) => c instanceof Desk)!),
    ).toBe('a chart-laden desk');
  });

  it('remodel refuses a non-leaseholder', async () => {
    const k1 = seedUnit(1, 1);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();
    const room = await w.admit(k1); // no grant to anyone
    const stranger = makeAvatar('stranger');
    ContainmentApi.move(stranger, room);

    const ctx = ctxWithInteractive(stranger, 'remodel');
    await run(makeStuff(() => new RemodelController()), stranger, {} as CommandModel, ctx);
    expect(rejectionReason(ctx)).toBe('no-lease');
    expect(shortDesc(room)).toBe('a dorm room'); // untouched
  });

  it('function-fixed: a style naming a non-prose field is refused whole', async () => {
    const k1 = seedUnit(1, 1);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();
    await ParcelApi.grantUse(k1, '/obj/Avatar/iris', null);
    const iris = makeAvatar('iris');
    const room = await w.admit(k1);
    ContainmentApi.move(iris, room);

    // A malformed style trying to set an executable-code field.
    DormThemes.themesSource =
      'themes:\n  hack:\n    room:\n      shortDescription: nice\n      class: /obj/evil/Backdoor\n';

    vi.spyOn(PromptApi, 'choice').mockResolvedValue('hack' as never);
    const ctx = ctxWithInteractive(iris, 'remodel');
    await run(makeStuff(() => new RemodelController()), iris, {} as CommandModel, ctx);
    expect(rejectionReason(ctx)).toBe('theme-error');
    expect(shortDesc(room)).toBe('a dorm room'); // nothing written (atomic refuse)
  });
});

/* ────────────────── Phase 5/6: provision + unprovision ─────────────────── */

describe('provision — lowest-free slot + gap reuse + multi-floor', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  async function provision(giverPlayer: string): Promise<string> {
    const op = makeAvatar(giverPlayer);
    const target = makeAvatar(`t-${++idCounter}`);
    const ctx = ctxFor(op, 'provision');
    await run(
      makeStuff(() => new ProvisionController()),
      op,
      { player: { stuff: target as never, raw: 'target' } } as unknown as CommandModel,
      ctx,
    );
    const held = await ParcelApi.heldUnitOf(target.getTemplatePath()!);
    return held!.getExtent();
  }

  it('provisions the lowest-free slot, then the next, then reuses a freed gap', async () => {
    await bootRegistries();
    await warren();

    const u1 = await provision('op');
    const u2 = await provision('op');
    expect(u1).toBe(`${DORMS}/f1-r1`);
    expect(u2).toBe(`${DORMS}/f1-r2`);

    // Free r1, provision again → the gap is reused (not r3).
    await ParcelApi.retire(u1);
    const u3 = await provision('op');
    expect(u3).toBe(`${DORMS}/f1-r1`);
  });

  it('fills a floor then buds the next (multi-floor)', async () => {
    // Seed floor 1 full (ROOMS_PER_FLOOR units) directly.
    for (let p = 1; p <= DormWarren.ROOMS_PER_FLOOR; p++) seedUnit(1, p);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();

    const next = await provision('op');
    expect(next).toBe(`${DORMS}/f2-r1`);
    await w.refreshProvisioned();
    // The stairwell now climbs to floor 2.
    expect(w.floorReachable(2)).toBe(true);
    const c2 = await w.ensureFloor(2);
    expect(c2).not.toBeNull();
  });
});

describe('unprovision — revert + free slot; re-provision = default look', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('reverts a decorated room; re-provisioning the slot yields the default', async () => {
    const k1 = seedUnit(1, 1);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();
    await ParcelApi.grantUse(k1, '/obj/Avatar/iris', null);
    const iris = makeAvatar('iris');
    const room = await w.admit(k1);
    ContainmentApi.move(iris, room);

    // Personalize (seal a style), then move iris out so the unit is vacant.
    await DormThemes.applyTo(room, 'medic');
    expect(snapshots().filter((s) => s.owner === k1)).toHaveLength(1);
    ContainmentApi.move(iris, (await w.ensureFloor(1))! as Stuff & Container);

    // Unprovision the tenant (iris → her held unit k1) → revoke + revert +
    // delete record + retire slot.
    const op = makeAvatar('op');
    const ctx = ctxFor(op, 'unprovision');
    await run(
      makeStuff(() => new UnprovisionController()),
      op,
      { player: { stuff: iris } } as unknown as CommandModel,
      ctx,
    );
    expect(rejectionReason(ctx)).toBeNull();
    expect(snapshots().filter((s) => s.owner === k1)).toHaveLength(0); // record cleared
    expect(await ParcelApi.hasUseGrant(k1, '/obj/Avatar/iris')).toBe(false);
    expect(await ParcelRecordFor(k1)).toBeNull(); // slot freed

    // Re-provision the same slot → a fresh, DEFAULT room (no phantom medic).
    seedUnit(1, 1); // re-mint the slot (a fresh provision would)
    await w.refreshProvisioned();
    const reborn = await w.admit(k1);
    expect(shortDesc(reborn)).toBe('a dorm room');
  });

  it('provision stamps the domicile; unprovision leaves it standing', async () => {
    await bootRegistries();
    await warren();
    const op = makeAvatar('op');
    const tenant = makeAvatar('tenant');
    expect(tenant.getDomicileAddress()).toBeNull();

    // Provision → the lease grant stamps the tenant's domicile (the
    // civics residency substrate).
    const provCtx = ctxFor(op, 'provision');
    await run(
      makeStuff(() => new ProvisionController()),
      op,
      { player: { stuff: tenant } } as unknown as CommandModel,
      provCtx,
    );
    expect(rejectionReason(provCtx)).toBeNull();
    expect(tenant.getDomicileAddress()).toBe(DormRoom.ADDRESS);

    // Unprovision → the dwelling goes; the domicile STANDS
    // (persists-until-replaced is structural — homelessness is no
    // dwelling, not no civic identity).
    const unprovCtx = ctxFor(op, 'unprovision');
    await run(
      makeStuff(() => new UnprovisionController()),
      op,
      { player: { stuff: tenant } } as unknown as CommandModel,
      unprovCtx,
    );
    expect(rejectionReason(unprovCtx)).toBeNull();
    expect(await ParcelApi.heldUnitOf(tenant.getTemplatePath()!)).toBeNull();
    expect(tenant.getDomicileAddress()).toBe(DormRoom.ADDRESS);
  });
});

/* ─────────────────── Phase 7: corridor reap correctness ────────────────── */

describe('corridor reap — top-down contiguity', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('a middle floor persists under a live upper floor; never reaps under a live room', async () => {
    const k2 = seedUnit(2, 1);
    const k3 = seedUnit(3, 1);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();

    // Materialize floor 3 (builds corridors 1,2,3 contiguously) + its room,
    // and keep an occupant in the floor-3 room.
    await w.ensureFloor(3);
    const room3 = await w.admit(k3);
    const occ = makeStuffAtPath(() => new Occupant(), '/obj/occ-live');
    ContainmentApi.move(occ, room3);

    // Floor 2's room is empty/never-entered. Reconcile.
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();

    // Corridor 2 must NOT reap (a live corridor 3 sits above it).
    expect(w.corridorForUnit(k2)).not.toBeNull();
    // The floor-3 room is live → its corridor stays.
    expect(w.corridorForUnit(k3)).not.toBeNull();
    expect(room3.isDestroyed()).toBe(false);
  });
});

/** Helper: the current parcel row for an extent, or null. */
async function ParcelRecordFor(extent: string) {
  const kids = await ParcelApi.childParcelsOf(DORMS);
  return kids.find((k) => k.getExtent() === extent) ?? null;
}
