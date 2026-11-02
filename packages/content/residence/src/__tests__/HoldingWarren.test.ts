/**
 * HoldingWarren — the holding as a warren one level down (residences
 * D16 / wave 4): whole-holding wake over `(scope = row, key =
 * extent/leaf)` records, the locked front-door edge, whole-holding
 * dormancy (never room-by-room), the shell condition clock honest
 * across restarts, and the parcel surface's plural read.
 *
 * Synthetic fixture rows against an in-memory store (the DormWarren
 * harness shape).
 */

import '@saxonberg/server/test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '@saxonberg/server/test-bootstrap';
import { Lock } from "@saxonberg/server/mud/lib/lock/Lock";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HoldingStructure from '../idea/HoldingStructure';
import type Place from '@saxonberg/server/mud/lib/stuff/Place';
import HoldingWarren from '../idea/HoldingWarren';
import HouseholdersKit from '../thing/HouseholdersKit';
import MaintainController from '../idea/cmd/crafting/MaintainController';
import FrontDoorExit from '../idea/FrontDoorExit';
import { CirculationWarren } from '@saxonberg/server/mud/lib/location/CirculationWarren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import PersistentLocation from '@saxonberg/server/mud/platform/location/PersistentLocation';
import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import Avatar from '@saxonberg/server/mud/platform/agent/PrimaryAvatar';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import TemplateApplier from '@saxonberg/server/mud/platform/idea/TemplateApplier';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { CommandApi, type CommandContext, type CommandModel } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { BoundaryApi } from '@saxonberg/server/mud/api/boundary';

type MemberStuff = Stuff & Container;

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PH = TemplateApplier.templatePath;
const PARENT = '/world/prog-test/lots';
const WARREN_PATH = '/world/prog-test/holder';
const PROGRAMME = '/world/prog-test/house-programme';
const ROOM_A = '/world/prog-test/hall';
const ROOM_B = '/world/prog-test/bedroom';
const ROOM_C = '/world/prog-test/porch';
const STREET = '/world/prog-test/lane';
const LOT1 = `${PARENT}/lot-1`;

/** The generic institution the programme hangs off (a PlatWarren stand-in). */
class TestInstitution extends SingletonMixin(
  CirculationWarren,
) {
  static _mixinName = 'ProgTestInstitution';
  protected async standUpHolding(key: string): Promise<MemberStuff> {
    const programme = await StuffApi.clone<MemberStuff>(PROGRAMME);
    this.addMember(programme);
    const { PersistableApi } = await import(
      '@saxonberg/server/mud/api/persistable'
    );
    await PersistableApi.restoreOrSeed(programme, key);
    await (programme as unknown as { wake(): Promise<void> }).wake();
    return programme;
  }
  protected circulationTemplateFor(): string | null {
    return null; // authored street only
  }
  protected async wireCirculationNode(): Promise<void> {}
  protected async entryEdgeFor(): Promise<null> {
    return null;
  }
  protected async createMember(): Promise<MemberStuff> {
    throw new Error('unused');
  }
  public async admitArrival(): Promise<void> {}
  protected attachmentFor(): { direction: string } {
    return { direction: 'out' };
  }
  protected async wireHostFixtures(): Promise<void> {}
  protected async unwireHostFixtures(): Promise<void> {}
  protected override async wireHubExit(): Promise<void> {}
}

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

function seedDomain(): void {
  const domain = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    domain.push({ _id: `d-${++idCounter}`, path, class: cls, data });
  domain.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  // ⭐ The engine's own rows: every exit is a clone of a kind row
  // and a boundary's anchors are clones too.
  for (const row of KERNEL_CONTENT_ROWS) {
    domain.push({ _id: `d-${++idCounter}`, ...row });
  }
  add('/system/residence/idea/exits/upstairs', '/system/residence/idea/UpstairsExit');
  add('/system/residence/idea/holding-structure', '/system/residence/idea/HoldingStructure', {
    shortDescription: 'house',
    keywords: ['house'],
  });
  add('/system/residence/idea/exits/front-door', '/system/residence/idea/FrontDoorExit');
  add('/system/residence/idea/exits/lot-gate', '/system/residence/idea/LotGateExit');
  add('/system/residence/idea/exits/keyed-door', '/system/residence/idea/KeyedDoorExit');

  add(WARREN_PATH, WARREN_PATH.replace('/holder', '/TestInstitution'));
  add(PROGRAMME, '/system/residence/idea/HoldingWarren', {
    floorplan: [
      {
        leaf: 'hall',
        room: ROOM_A,
        entry: true,
        exits: [{ to: 'bedroom', direction: 'north' }],
      },
      // ⭐ A building of its own (paint review): its own coat and condition.
      { leaf: 'bedroom', room: ROOM_B, building: 'shed' },
      // A PLAIN room: keeps nothing, so has no record (tracts build review).
      // Open to the sky, so it is no building's.
      { leaf: 'porch', room: ROOM_C },
    ],
    upkeepTerm: 'owner-all',
    addressBase: 'prog-test/lot-1',
  });
  add(ROOM_A, '/platform/location/PersistentLocation', {
    shortDescription: 'the hall',
    props: ['/world/prog-test/coatrack'],
  });
  add(ROOM_B, '/platform/location/PersistentLocation', {
    shortDescription: 'a bedroom',
  });
  add(ROOM_C, '/platform/location/Location', {
    shortDescription: 'a porch',
    enclosure: 'none',
    roof: 'none',
  });
  add('/world/prog-test/coatrack', '/platform/thing/Thing', {
    shortDescription: 'a coat rack',
  });
  add(STREET, '/platform/location/PersistentLocation', {
    shortDescription: 'the lane',
  });
  add('/stuff/thing/Key', '/platform/thing/Key', { shortDescription: 'a key' });
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  seedDomain();
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent: PARENT,
    zonePath: PARENT,
    owner: { kind: 'group', name: 'prog-test' },
    parentParcel: null,
    grants: [],
    allowance: null,
  });
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

function seedLot(): void {
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent: LOT1,
    zonePath: LOT1,
    owner: { kind: 'player', templatePath: '/platform/agent/Avatar/iris' },
    parentParcel: PARENT,
    grants: [],
    allowance: null,
  });
}

async function bootRegistries(): Promise<void> {
  const groups = makeStuffAtPath(() => new GroupRegistry(), '/platform/idea/GroupRegistry');
  await groups.onCreate();
  const parcels = makeStuffAtPath(
    () => new ParcelRegistry(),
    '/platform/idea/ParcelRegistry',
  );
  await parcels.onCreate();
}

async function institution(): Promise<TestInstitution> {
  const w = makeStuffAtPath(() => new TestInstitution(), WARREN_PATH);
  w.setParentExtent(PARENT);
  await w.refreshProvisioned();
  return w;
}

function snapshots(): Doc[] {
  return col('holder_snapshots');
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  StuffApi.clearAll();
}

// The institution's class resolves by a path the store can't map — stub
// the clone ONLY for the institution row? No: TestInstitution is minted
// via makeStuffAtPath, and the programme/rooms clone through the real
// pipeline (their classes are real pack/kernel classes).

describe('the residential programme (D16)', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('⭐ wakes whole: keyed rooms from real rows, wired, addressed', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    const entry = await w.admit(LOT1);

    // The entry is the hall (floorplan `entry: true`), a keyed instance
    // of the REAL row — templatePath resolves to the row (D17), the
    // instance identity is the (scope, key) pair.
    expect(entry).toBeInstanceOf(PersistentLocation);
    expect(entry.getTemplatePath()).toBe(ROOM_A);
    expect(
      (entry as unknown as { getPersistenceKey(): string }).getPersistenceKey(),
    ).toBe(`${LOT1}/hall`);
    // Born-with fixture landed once.
    expect(
      entry.getContents().some((c) => c instanceof Thing),
    ).toBe(true);
    // Wired: hall → bedroom, and back.
    const hallEx = entry as unknown as Exitable;
    expect(hallEx.getExit('north')).toBeDefined();
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const bedroom = holding.roomForLeaf('bedroom')!;
    expect(bedroom.getTemplatePath()).toBe(ROOM_B);
    expect((bedroom as unknown as Exitable).getExit('south')).toBeDefined();
    // Addressed: the human per-place identity.
    expect(
      MixinApi.isAddressable(bedroom) ? bedroom.getAddress() : null,
    ).toBe('prog-test/lot-1/bedroom');
    // The upkeep term reads on the programme (D5).
    expect(holding.getUpkeepTerm()).toBe('owner-all');
  });

  it('⭐ a room that keeps nothing stands up with no record (persistence is the exception)', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    await w.admit(LOT1);
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const porch = holding.roomForLeaf('porch')!;
    expect(porch.getTemplatePath()).toBe(ROOM_C);
    expect(MixinApi.isPersistable(porch)).toBe(false);
  });

  it('⭐⭐ lays its rooms out in its OWN frame, from the floorplan (B53)', async () => {
    // Every place but the void has coordinates. A holding's rooms take
    // theirs from the floorplan's cardinal exits, the entry at the origin:
    // the hall at (0,0,0), the bedroom north of it.
    seedLot();
    await bootRegistries();
    const w = await institution();
    const hall = await w.admit(LOT1);
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const cell = (r: unknown) =>
      (r as { getCoordinates(): [number, number, number] }).getCoordinates();
    expect(cell(hall)).toEqual([0, 0, 0]);
    expect(cell(holding.roomForLeaf('bedroom'))).toEqual([0, 1, 0]);
    // A frame of its own — a door out of it may be named, like a door
    // between zones.
    expect(holding.laysOutOwnFrame()).toBe(true);
  });

  it('⭐⭐ its rooms stand in the HOLDING\'s zone, sized by its cell (B54)', async () => {
    // A room's size is its zone's cell. The rows live at `/world/prog-test/`
    // (no zone), the lot under a 4 m zone — so the rooms take the lot's.
    col('content').push({
      _id: `d-${++idCounter}`,
      path: PARENT,
      class: '/platform/idea/location/CartesianZone',
      data: { name: 'the lots', cellSize: 4 },
    });
    seedLot();
    await bootRegistries();
    const w = await institution();
    const hall = await w.admit(LOT1);
    expect(hall).toBeInstanceOf(PersistentLocation);
    expect(hall.getTemplatePath()).toBe(ROOM_A);
    expect(hall.getZone()?.getTemplatePath()).toBe(PARENT);
    expect((hall as unknown as PersistentLocation).getSizeScale()).toBe(16);
  });

  it('⭐ sleeps and wakes WHOLE — rooms + fixtures + placed goods together', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    const entry = await w.admit(LOT1);
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const bedroom = holding.roomForLeaf('bedroom')!;

    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    iris.setPlayerId('iris');
    ContainmentApi.move(iris, bedroom);

    // Occupied (in the BEDROOM, not the entry): nothing reaps.
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    expect(entry.isDestroyed()).toBe(false);
    expect(bedroom.isDestroyed()).toBe(false);

    // Vacate → the WHOLE holding sleeps: both rooms captured + reaped
    // together (partial reap impossible by construction).
    StuffApi.destruct(iris as unknown as Stuff);
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    expect(entry.isDestroyed()).toBe(true);
    expect(bedroom.isDestroyed()).toBe(true);
    const owners = snapshots().map((s) => s.owner);
    expect(owners).toContain(`${LOT1}/hall`);
    expect(owners).toContain(`${LOT1}/bedroom`);
    expect(owners).toContain(LOT1); // the programme's own record

    // Re-admit → the same keyed state.
    const reborn = await w.admit(LOT1);
    expect(reborn.isDestroyed()).toBe(false);
    expect(reborn.getTemplatePath()).toBe(ROOM_A);
    expect(
      reborn.getContents().some((c) => c instanceof Thing),
    ).toBe(true);
  });

  it('⭐ the front door refuses the keyless and admits a presented key', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    const street = await StuffApi.singleton<MemberStuff>(STREET);

    // The constructor arguments became a `configure` step (the exit is
    // a clone of `/system/residence/idea/exits/front-door` now).
    const door = await StuffApi.clone<FrontDoorExit>(
      '/system/residence/idea/exits/front-door',
    );
    door.configureFrontDoor(w, LOT1);

    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    iris.setPlayerId('iris');

    // No keyway on the lot → locked to everyone.
    expect((await door.canTraverse(iris as never)).ok).toBe(false);

    await ParcelApi.setKeyway(LOT1, 'kw-77');
    await w.refreshProvisioned();
    // Keyless still refused; a presented key admits.
    const bob = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/bob');
    bob.setPlayerId('bob');
    await new Lock('kw-77', 'pin-tumbler').issueKeyTo(iris);
    expect((await door.canTraverse(iris as never)).ok).toBe(true);
    expect((await door.canTraverse(bob as never)).ok).toBe(false);

    // Traversal materializes the holding and lands in the ENTRY room.
    const dest = await door.resolveDestination();
    expect(dest.getTemplatePath()).toBe(ROOM_A);
  });

  it('⭐ the holding stands its HOUSE up; a bare house wears, honest across restarts (paint D6/D13)', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    await w.admit(LOT1);
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const house = holding.house()!;
    expect(house).not.toBeNull();
    expect(house.getExtent()).toBe(LOT1);

    const base = WorldClockApi.getNow().rawValue();
    const clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    expect(house.getConditionWord()).toBe('sound');

    // A house that starts bare wears from the day it is held:
    // 45 game-days = the shipped daysToWorn default → half gone.
    clock.mockReturnValue(Quantity.of(base + 45 * 86_400, 's'));
    expect(house.getCondition()).toBeCloseTo(0.5, 2);
    expect(house.getConditionWord()).toBe('worn');
    expect(house.weatherCause()).toMatch(/paint has gone/i);

    // "Restart": capture, tear down, re-admit → the decline SURVIVED
    // (the house persists under the holding's key), and keeps declining.
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    await w.admit(LOT1);
    const holding2 = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const house2 = holding2.house()!;
    expect(house2.getCondition()).toBeLessThanOrEqual(0.51);

    // The maintenance restore (P10) — the fabric, not the coat.
    house2.setCondition(1);
    expect(house2.getConditionWord()).toBe('sound');
    clock.mockRestore();
  });

  it('⭐ a holding has a building per `building:` key; open ground is no building (paint review)', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    await w.admit(LOT1);
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const all = holding.buildings();
    expect(all).toHaveLength(2);
    const [house, shed] = all as [HoldingStructure, HoldingStructure];
    const hall = holding.roomForLeaf('hall')!;
    const bedroom = holding.roomForLeaf('bedroom')!;
    const porch = holding.roomForLeaf('porch')!;
    expect(holding.house()).toBe(house);
    expect(house.hasRoom(hall)).toBe(true);
    expect(house.hasRoom(bedroom)).toBe(false);
    expect(house.hasRoom(porch)).toBe(false);
    expect(shed.hasRoom(bedroom)).toBe(true);
    // By path, only the main building answers, and only at the extent.
    expect(house.hasMember(LOT1)).toBe(true);
    expect(shed.hasMember(LOT1)).toBe(false);
    expect(shed.getPresentation()).toMatch(/shed/);
    // ⭐ A room asks its warren which building it is in — no path names it.
    expect((bedroom as unknown as Place).structureNow()).toBe(shed);
    expect((hall as unknown as Place).structureNow()).toBe(house);
    expect((porch as unknown as Place).structureNow()).toBeNull();
    expect(holding.buildingOf(porch)).toBeNull();
    // Each keeps its own condition.
    shed.setCondition(0.3);
    expect(shed.getConditionWord()).toBe('badly worn');
    expect(house.getConditionWord()).toBe('sound');
  });

  it('heldUnitsOf returns every rung (lease + lease)', async () => {
    await bootRegistries();
    col('parcels').push(
      {
        _id: `p-${++idCounter}`,
        extent: `${PARENT}/lot-2`,
        zonePath: `${PARENT}/lot-2`,
        owner: { kind: 'group', name: 'prog-test' },
        parentParcel: PARENT,
        grants: [],
        allowance: null,
      },
      {
        _id: `p-${++idCounter}`,
        extent: `${PARENT}/lot-3`,
        zonePath: `${PARENT}/lot-3`,
        owner: { kind: 'group', name: 'prog-test' },
        parentParcel: PARENT,
        grants: [],
        allowance: null,
      },
    );
    await ParcelApi.rebuildCoverageIndex();
    await ParcelApi.grantUse(`${PARENT}/lot-2`, '/platform/agent/Avatar/iris', null);
    await ParcelApi.grantUse(`${PARENT}/lot-3`, '/platform/agent/Avatar/iris', null);

    const all = await ParcelApi.heldUnitsOf('/platform/agent/Avatar/iris');
    expect(all.map((r) => r.getExtent()).sort()).toEqual([
      `${PARENT}/lot-2`,
      `${PARENT}/lot-3`,
    ]);
    // The scoped singular.
    expect(
      (await ParcelApi.heldUnitOf('/platform/agent/Avatar/iris', PARENT))?.getExtent(),
    ).toBeTruthy();
    expect(
      await ParcelApi.heldUnitOf('/platform/agent/Avatar/iris', '/world/elsewhere'),
    ).toBeNull();
  });
});

/**
 * The maintenance act (residences D4/D5) — the other half of the
 * weathering clock.
 *
 * A shell decays on game time with no scheduler; `maintain` is what
 * reverses it, and it costs a tool, some wear on the tool, and
 * somebody's attention. The tenure TERM says who owes it; the verb
 * refuses nobody, which is the deliberate split.
 */
describe('the maintenance act (D4/D5)', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  /** Wear a holding's shell down to `worn` and hand back the pieces. */
  async function wornHolding(): Promise<{
    holding: HoldingWarren;
    hall: MemberStuff;
    clock: ReturnType<typeof vi.spyOn>;
  }> {
    seedLot();
    await bootRegistries();
    const w = await institution();
    const hall = await w.admit(LOT1);
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    const base = WorldClockApi.getNow().rawValue();
    const clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    holding.house()!.getCondition();
    clock.mockReturnValue(Quantity.of(base + 45 * 86_400, 's'));
    expect(holding.house()!.getConditionWord()).toBe('worn');
    return { holding, hall, clock };
  }

  function kit(): HouseholdersKit {
    const k = makeStuffAtPath(
      () => new HouseholdersKit(),
      '/system/residence/thing/householders-kit',
    );
    k.setCapabilities([{ kind: 'upkeep', rate: 1 }]);
    return k;
  }

  async function maintain(
    actor: Stuff,
    room: Stuff | null,
  ): Promise<CommandContext> {
    const ctx = CommandApi.createCommandContext({
      commandGiver: actor as never,
      location: room as never,
      commandText: 'maintain',
      executionId: 'test',
      commandId: 'test',
      verb: 'maintain',
      command: CommandDefinition.fromYaml(
        'verbs: [maintain]\ncontroller: NoopController\ndescription: stub\n',
        '<test>',
      ),
    });
    const controller = makeStuffAtPath(
      () => new MaintainController(),
      '/system/residence/idea/cmd/crafting/MaintainController',
    );
    // ⚠ Stand in for the BINDER: `maintain`'s `kit` is a declared arg
    // defaulting to `reachable:[capability.upkeep]`, so the binder finds
    // the kit and the controller reads it. A hand-built model skips the
    // binder and must carry what the view would have put there.
    const held =
      (actor as unknown as { getContents?(): unknown[] }).getContents?.() ?? [];
    const kit = held.find((i) => {
      const t = i as { hasCapability?(c: string): boolean };
      return typeof t.hasCapability === 'function' && t.hasCapability('upkeep');
    });
    await controller.execute(
      (kit === undefined ? {} : { kit: { stuff: kit, raw: 'kit' } }) as CommandModel,
      ctx,
    );
    return ctx;
  }

  const reasons = (ctx: CommandContext): string[] =>
    ctx
      .getNotes()
      .filter((n) => n.kind === 'controller-rejected')
      .map((n) => (n as { reason: string }).reason);

  it('⭐ restores a worn shell to sound, and wears the kit doing it', async () => {
    const { holding, hall } = await wornHolding();
    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    ContainmentApi.move(iris as unknown as Stuff & Containable, hall);
    const k = kit();
    ContainmentApi.move(
      k as unknown as Stuff & Containable,
      iris as unknown as Stuff & Container,
    );
    const before = k.getCondition();

    const ctx = await maintain(iris as unknown as Stuff, hall as unknown as Stuff);
    expect(reasons(ctx)).toEqual([]);
    expect(holding.house()!.getConditionWord()).toBe('sound');
    // Law 2: the tool wears with USE. That is the recurring cost of
    // upkeep, and the whole economic content of the act.
    expect(k.getCondition()).toBeLessThan(before);
  });

  it('refuses without a kit — the shell is untouched', async () => {
    const { holding, hall } = await wornHolding();
    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    ContainmentApi.move(iris as unknown as Stuff & Containable, hall);

    const ctx = await maintain(iris as unknown as Stuff, hall as unknown as Stuff);
    expect(reasons(ctx)).toContain('no-upkeep-tool');
    expect(holding.house()!.getConditionWord()).toBe('worn');
  });

  it('refuses where there is no holding to keep', async () => {
    seedLot();
    await bootRegistries();
    await institution();
    const street = await StuffApi.clone<MemberStuff>(STREET);
    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    ContainmentApi.move(iris as unknown as Stuff & Containable, street);
    ContainmentApi.move(
      kit() as unknown as Stuff & Containable,
      iris as unknown as Stuff & Container,
    );

    const ctx = await maintain(iris as unknown as Stuff, street as unknown as Stuff);
    expect(reasons(ctx)).toContain('nothing-to-maintain');
  });

  it('spares the kit when there is nothing to do', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    const hall = await w.admit(LOT1);
    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    ContainmentApi.move(iris as unknown as Stuff & Containable, hall);
    const k = kit();
    ContainmentApi.move(
      k as unknown as Stuff & Containable,
      iris as unknown as Stuff & Container,
    );

    const ctx = await maintain(iris as unknown as Stuff, hall as unknown as Stuff);
    // ⭐ A sound fabric under no coat: the kit is spared, and the refusal
    // says the house wants PAINT, which is a brush's work (paint D13).
    expect(reasons(ctx)).toContain('coat-not-fabric');
    expect(k.getCondition()).toBe(1);
  });

  it('⭐ ANYBODY may do it — the term says who OWES, not who MAY', async () => {
    // The owner of record is iris; a passing stranger with a kit puts
    // her window frames right, and the world lets them. Refusing would
    // be modelling permission where the world models work.
    const { holding, hall } = await wornHolding();
    const stranger = makeStuffAtPath(
      () => new Avatar(),
      '/platform/agent/Avatar/passerby',
    );
    ContainmentApi.move(stranger as unknown as Stuff & Containable, hall);
    ContainmentApi.move(
      kit() as unknown as Stuff & Containable,
      stranger as unknown as Stuff & Container,
    );

    const ctx = await maintain(stranger as unknown as Stuff, hall as unknown as Stuff);
    expect(reasons(ctx)).toEqual([]);
    expect(holding.house()!.getConditionWord()).toBe('sound');
  });

  it('⭐ interior goods show ZERO clock-wear over the same elapsed time (Law 2)', async () => {
    // The regression that keeps the two clocks apart: a SHELL weathers
    // on the passage of days; a GOOD wears only when you use it. If a
    // durable in the room ever loses condition to the calendar, the
    // economy's second law is broken and everything a player owns rots.
    const { holding, hall, clock } = await wornHolding();
    const tool = makeStuffAtPath(() => new Tool(), '/world/prog-test/spanner');
    ContainmentApi.move(tool as unknown as Stuff & Containable, hall);
    const before = tool.getCondition();

    const base = WorldClockApi.getNow().rawValue();
    clock.mockReturnValue(Quantity.of(base + 365 * 86_400, 's'));
    holding.house()!.getCondition();

    expect(holding.house()!.getConditionWord()).toBe('broken');
    expect(tool.getCondition()).toBe(before);
    clock.mockRestore();
  });

  it('the kit confers the verb — outward, to whoever holds it', async () => {
    const verbs = CommandApi.collectContributions(HouseholdersKit, 'environment')
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('maintain');
  });
});
