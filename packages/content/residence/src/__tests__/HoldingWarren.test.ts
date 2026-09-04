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
import { Lock } from "@saxonberg/server/mud/lib/lock/Lock";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HoldingWarren from '../idea/HoldingWarren';
import HouseholdersKit from '../thing/HouseholdersKit';
import MaintainController from '../idea/cmd/crafting/MaintainController';
import FrontDoorExit from '../idea/FrontDoorExit';
import { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import FurnishableRoom from '@saxonberg/server/mud/platform/location/FurnishableRoom';
import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import Avatar from '@saxonberg/server/mud/platform/agent/Avatar';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { CommandApi, type CommandContext, type CommandModel } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

type MemberStuff = Stuff & Container;

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PH = PersistentHydrator.templatePath;
const PARENT = '/world/prog-test/lots';
const WARREN_PATH = '/world/prog-test/holder';
const PROGRAMME = '/world/prog-test/house-programme';
const ROOM_A = '/world/prog-test/hall';
const ROOM_B = '/world/prog-test/bedroom';
const STREET = '/world/prog-test/lane';
const LOT1 = `${PARENT}/lot-1`;

/** The generic institution the programme hangs off (a PlatWarren stand-in). */
class TestInstitution extends SingletonMixin(
  PostRegistrationMixin(OuterWarren),
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
    domain.push({ _id: `d-${++idCounter}`, path, class: cls, hydratorClass: PH, data });
  domain.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  add(WARREN_PATH, WARREN_PATH.replace('/holder', '/TestInstitution'));
  add(PROGRAMME, '/system/residence/idea/HoldingWarren', {
    floorplan: [
      {
        leaf: 'hall',
        room: ROOM_A,
        entry: true,
        exits: [{ to: 'bedroom', direction: 'north' }],
      },
      { leaf: 'bedroom', room: ROOM_B },
    ],
    upkeepTerm: 'owner-all',
    addressBase: 'prog-test/lot-1',
  });
  add(ROOM_A, '/platform/location/FurnishableRoom', {
    shortDescription: 'the hall',
    props: ['/world/prog-test/coatrack'],
  });
  add(ROOM_B, '/platform/location/FurnishableRoom', {
    shortDescription: 'a bedroom',
  });
  add('/world/prog-test/coatrack', '/platform/thing/Thing', {
    shortDescription: 'a coat rack',
  });
  add(STREET, '/platform/location/FurnishableRoom', {
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
  await groups.postRegister();
  const parcels = makeStuffAtPath(
    () => new ParcelRegistry(),
    '/platform/idea/ParcelRegistry',
  );
  await parcels.postRegister();
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
    expect(entry).toBeInstanceOf(FurnishableRoom);
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

    const door = StuffApi.createSync(
      () =>
        new FrontDoorExit(street, w, LOT1, 'lot-1', ROOM_A),
    );
    await (street as unknown as Exitable & { addExit(e: unknown): Promise<void> }).addExit(door);

    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    iris.setPlayerId('iris');

    // No keyway on the lot → locked to everyone.
    expect(door.canTraverse(iris as never).ok).toBe(false);

    await ParcelApi.setKeyway(LOT1, 'kw-77');
    await w.refreshProvisioned();
    // Keyless still refused; a presented key admits.
    const bob = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/bob');
    bob.setPlayerId('bob');
    await Lock.issueKey(iris, 'kw-77', 'pin-tumbler');
    expect(door.canTraverse(iris as never).ok).toBe(true);
    expect(door.canTraverse(bob as never).ok).toBe(false);

    // Traversal materializes the holding and lands in the ENTRY room.
    const dest = await door.resolveDestination();
    expect(dest.getTemplatePath()).toBe(ROOM_A);
  });

  it('shell condition declines over game time, stamp honest across restarts', async () => {
    seedLot();
    await bootRegistries();
    const w = await institution();
    await w.admit(LOT1);
    const holding = w.holdingFor(LOT1)! as unknown as HoldingWarren;

    const base = WorldClockApi.getNow().rawValue();
    const clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    expect(holding.conditionBand()).toBe('sound');

    // 45 game-days = the shipped daysToWorn default → half gone.
    clock.mockReturnValue(Quantity.of(base + 45 * 86_400, 's'));
    const c = holding.reconcileShell();
    expect(c).toBeCloseTo(0.5, 2);
    expect(holding.conditionBand()).toBe('worn');
    expect(holding.conditionCause()).toMatch(/rain|paint|weather/i);

    // "Restart": capture, tear down, re-admit → the decline SURVIVED
    // (persistent state), and further elapsed time keeps declining.
    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    const reborn = await w.admit(LOT1);
    void reborn;
    const holding2 = w.holdingFor(LOT1)! as unknown as HoldingWarren;
    expect(holding2.reconcileShell()).toBeLessThanOrEqual(0.51);

    // The maintenance restore (P10).
    holding2.restoreShell();
    expect(holding2.conditionBand()).toBe('sound');
    clock.mockRestore();
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
    holding.reconcileShell();
    clock.mockReturnValue(Quantity.of(base + 45 * 86_400, 's'));
    expect(holding.conditionBand()).toBe('worn');
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
    await controller.execute({} as CommandModel, ctx);
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
    expect(holding.conditionBand()).toBe('sound');
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
    expect(holding.conditionBand()).toBe('worn');
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
    expect(reasons(ctx)).toContain('already-sound');
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
    expect(holding.conditionBand()).toBe('sound');
  });

  it('⭐ interior goods show ZERO clock-wear over the same elapsed time (Law 2)', async () => {
    // The regression that keeps the two clocks apart: a SHELL weathers
    // on the passage of days; a GOOD wears only when you use it. If a
    // durable in the room ever loses condition to the calendar, the
    // economy's second law is broken and everything a player owns rots.
    const { holding, hall, clock } = await wornHolding();
    const tool = makeStuffAtPath(() => new ToolItem(), '/world/prog-test/spanner');
    ContainmentApi.move(tool as unknown as Stuff & Containable, hall);
    const before = tool.getCondition();

    const base = WorldClockApi.getNow().rawValue();
    clock.mockReturnValue(Quantity.of(base + 365 * 86_400, 's'));
    holding.reconcileShell();

    expect(holding.conditionBand()).toBe('dilapidated');
    expect(tool.getCondition()).toBe(before);
    clock.mockRestore();
  });

  it('the kit confers the verb — outward, to whoever holds it', () => {
    const verbs = CommandApi.collectContributions(HouseholdersKit, 'environment')
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('maintain');
  });
});
