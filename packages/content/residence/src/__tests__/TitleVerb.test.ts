/**
 * `title` — the land-sale verb, on the KEYED model (residences wave 5).
 *
 * The two things that make a sale a sale still anchor the suite:
 *
 *   1. ⭐ **An unfunded buyer changes NOTHING.** No parcel row, no money
 *      moved, no house stood up. The money leg runs first.
 *   2. **The same lot cannot be sold twice**, and the chain of title
 *      records what happened.
 *
 * What the rework added, each pinned here: the venue is the DEED DESK's
 * presence (P6), the book is GENERATIVE (D10 — no roster; any lot number
 * under the cap), the sale mints the buyer's KEY at the chokepoint (D7),
 * the ASCENT GATE reads the buyer's existing holdings' condition (P10),
 * and a sold lot stands up a keyed HOUSE through the programme — every
 * room `(scope = a real row, key = <lotExtent>/<leaf>)` (D16/D17).
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TitleController from '@saxonberg/server/mud/platform/idea/cmd/civics/TitleController';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import LotHolder from '../idea/LotHolder';
import PlatBook from '../idea/PlatBook';
import DeedDesk from '../thing/DeedDesk';
import HoldingProgramme from '../idea/HoldingProgramme';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { CredentialApi } from '@saxonberg/server/mud/api/credential';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { ParcelEvent } from '@saxonberg/server/mud/lib/parcel/ParcelEvent';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { HoldingWarren } from '@saxonberg/server/mud/lib/location/HoldingWarren';
import { QuantityMarshaller } from '@saxonberg/server/mud/platform/idea/persistence/QuantityMarshaller';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ExitableMixin } from '@saxonberg/server/mud/lib/boundary/Exitable';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '@saxonberg/server/mud/api/command';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

/** A persistable room — what a real house room clones to. */
class TitleTestRoom extends PersistableMixin(
  PostRegistrationMixin(ContainerMixin(Location)),
) {
  static _mixinName = 'TitleTestRoom';
}

/** The street the lots front onto — needs only exits + containment. */
class StreetRoom extends ExitableMixin(ContainerMixin(Location)) {
  static _mixinName = 'TitleTestStreet';
}

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiverTitle';
  lines: string[] = [];
  protected handleMessage(msg: unknown): void {
    this.lines.push(JSON.stringify(msg));
  }
}

const SUBURB = '/world/terminus/hinkley-hills';
const LOTS = `${SUBURB}/lots`;
const LOT2 = `${LOTS}/lot-2`;
const HOLDER_PATH = `${SUBURB}/lot-holder`;
const BOOK_PATH = `${SUBURB}/plat-book`;
const STREET_PATH = `${SUBURB}/lane`;
const PROGRAMME = `${SUBURB}/house-programme`;
const YARD_ROW = `${SUBURB}/yard`;
const ROAD_ROW = `${SUBURB}/road-segment`;

interface Doc extends Record<string, unknown> {
  _id?: string;
}
let store: Map<string, Doc[]>;
let idCounter = 0;
let seq = 0;
function fresh(p: string): string {
  seq += 1;
  return `${p}-${seq}`;
}
function col(c: string): Doc[] {
  let a = store.get(c);
  if (!a) {
    a = [];
    store.set(c, a);
  }
  return a;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async (c: string, d: Doc) => {
      const arr = col(c);
      if (d._id) {
        const i = arr.findIndex((x) => x._id === d._id);
        if (i >= 0) arr[i] = { ...d };
        else arr.push({ ...d });
        return d._id;
      }
      const id = String(++idCounter);
      arr.push({ ...d, _id: id });
      return id;
    }),
    find: vi.fn(async (c: string, q: Record<string, unknown>) => {
      const arr = col(c);
      const keys = Object.keys(q);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) => keys.every((k) => d[k] === q[k]));
    }),
    findById: vi.fn(async () => null),
    delete: vi.fn(async () => {}),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  // The house rows the programme wakes (real clone pipeline).
  const domain = col('content');
  const PH = '/platform/idea/persistence/PersistentHydrator';
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    domain.push({ _id: `d-${++idCounter}`, path, class: cls, hydratorClass: PH, data });
  domain.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  add(PROGRAMME, '/residence/idea/HoldingProgramme', {
    floorplan: [{ leaf: 'yard', room: YARD_ROW, entry: true }],
    upkeepTerm: 'owner-all',
  });
  add(YARD_ROW, '/platform/location/FurnishableRoom', {
    shortDescription: 'the yard behind the house',
  });
  add(ROAD_ROW, '/platform/location/FurnishableRoom', {
    shortDescription: 'a reach of the lane',
  });
  // The sale WRITES an area, so a real m² marshaller is needed.
  const m2Path = QuantityMarshaller.pathFor('m²');
  const m2 = makeStuffAtPath(
    () => new QuantityMarshaller<'m²'>(),
    m2Path,
  );
  (m2 as unknown as { unit: string }).unit = 'm²';
  const resolve = (path: string) =>
    path === m2Path ? (m2 as unknown as never) : undefined;
  Document.setMarshallerResolver(resolve, async (path) => resolve(path));
}

function seedSuburb(): void {
  col('parcels').push({
    _id: `seed-${++idCounter}`,
    extent: SUBURB,
    zonePath: SUBURB,
    owner: { kind: 'group', name: 'hinkley-hills' },
    parentParcel: null,
    grants: [],
    allowance: null,
    landUse: 'residential',
    area: null,
  });
}

/**
 * Hinkley's two halves, exactly as the rows author them: the GENERATIVE
 * catalogue (no roster — D10) naming the provisioner, whose plan is the
 * branched one (the authored lane + minted reaches + the court).
 */
function seedSubdivision(): void {
  const holder =
    StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH) ??
    makeStuffAtPath(() => new LotHolder(), HOLDER_PATH);
  holder.setProgrammePath(PROGRAMME);
  holder.setRoadTemplate(ROAD_ROW);
  holder.setParentExtent(SUBURB);
  holder.setDefaultCapacity(60);
  holder.setPlan({
    shape: 'branched',
    roads: [
      {
        key: 'lane',
        segments: 14,
        frontagesPerSegment: 4,
        authored: { '1': STREET_PATH },
      },
      {
        key: 'court',
        segments: 1,
        frontagesPerSegment: 4,
        branchesFrom: { road: 'lane', segment: 2 },
      },
    ],
  });

  const book =
    StuffApi.findByTemplatePath<PlatBook>(BOOK_PATH) ??
    makeStuffAtPath(() => new PlatBook(), BOOK_PATH);
  book.setLabel('Hinkley Hills');
  book.setParentExtent(SUBURB);
  book.setPriceMinor(4000);
  book.setAreaM2(1000);
  book.setLandUse('residential');
  book.setHolderPath(HOLDER_PATH);
}

function seedStreet(): StreetRoom {
  const existing = StuffApi.findByTemplatePath<StreetRoom>(STREET_PATH);
  return existing ?? makeStuffAtPath(() => new StreetRoom(), STREET_PATH);
}

async function bootRegistries(): Promise<void> {
  if (!StuffApi.findByTemplatePath('/platform/idea/GroupRegistry')) {
    const g = makeStuffAtPath(() => new GroupRegistry(), '/platform/idea/GroupRegistry');
    await g.postRegister();
  }
  if (!StuffApi.findByTemplatePath('/platform/idea/ParcelRegistry')) {
    const p = makeStuffAtPath(
      () => new ParcelRegistry(),
      '/platform/idea/ParcelRegistry',
    );
    await p.postRegister();
  }
  await ParcelApi.rebuildCoverageIndex();
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    'verbs: [title]\ncontroller: NoopController\ndescription: stub\n',
    '<test>',
  );
}
function ctxFor(giver: TestGiver, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: 'title',
    executionId: 'test',
    commandId: 'test',
    verb: 'title',
    command: stubCommand(),
  });
}
type TitleExec = Parameters<TitleController['execute']>[0];
function model(subcommand?: string, lot?: string): TitleExec {
  return { subcommand, lot } as ModelData as unknown as TitleExec;
}
function reasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

async function run(
  giver: TestGiver,
  loc: Location,
  m: TitleExec,
): Promise<CommandContext> {
  const ctx = ctxFor(giver, loc);
  const ctrl = makeStuff(() => new TitleController());
  await withRootContext(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(giver as unknown as Stuff);
    await ctrl.execute(m, ctx);
  });
  return ctx;
}

let settled: number[];
let settleWorks: boolean;

describe('title', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    ParcelApi._resetRegistryRefForReload();
    StuffApi.clearAll();
    installStore();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    seedSuburb();
    await bootRegistries();
    seedSubdivision();

    settled = [];
    settleWorks = true;
    vi.spyOn(EmploymentApi, 'ensureOperatorAt').mockImplementation(
      (async () => ({}) as never) as unknown as typeof EmploymentApi.ensureOperatorAt,
    );
    vi.spyOn(EmploymentApi, 'operatingAccountOf').mockImplementation(
      (async () => 'registry-account') as unknown as typeof EmploymentApi.operatingAccountOf,
    );
    vi.spyOn(BankingApi, 'settle').mockImplementation((async (c: {
      amount: { minor: number };
    }) => {
      if (!settleWorks) throw new Error('declined');
      settled.push(c.amount.minor);
      return { corpoKey: null } as never;
    }) as unknown as typeof BankingApi.settle);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ParcelApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  /** A records room WITH its deed desk — the P6 venue. */
  function registryRoom(): Location {
    const room = makeStuffAtPath(
      () => new TitleTestRoom(),
      fresh('/world/somewhere/records'),
    );
    const desk = makeStuff(() => new DeedDesk());
    ContainmentApi.move(desk, room);
    return room as unknown as Location;
  }
  function elsewhere(): Location {
    return makeStuffAtPath(() => new Location(), fresh('/world/somewhere'));
  }
  function buyerIn(room: Location): TestGiver {
    const g = makeStuffAtPath(() => {
      const t = new TestGiver();
      t.setName('Alice');
      return t;
    }, fresh('/platform/agent/Avatar/_title'));
    ContainmentApi.move(g, room as unknown as Stuff & never);
    return g;
  }

  it('⭐ a funded buyer gets the lot, and ownerOf reports them', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);

    const ctx = await run(buyer, room, model('buy', 'lot 2'));
    expect(reasons(ctx)).not.toContain('insufficient-funds');

    const owner = await ParcelApi.ownerOf(LOT2);
    expect(owner?.kind).toBe('player');
    expect((owner! as { templatePath: string }).templatePath).toBe(
      buyer.getIdentityPath(),
    );
    expect(settled).toHaveLength(1);
    expect(settled[0]).toBe(4000);
  });

  it('⭐ the sale KEYS the house and hands the buyer the key (D7)', async () => {
    const issued: Array<[string, string]> = [];
    vi.spyOn(CredentialApi, 'issueKey').mockImplementation((async (
      _who: Stuff,
      keyway: string,
      tech: string,
    ) => {
      issued.push([keyway, tech]);
    }) as unknown as typeof CredentialApi.issueKey);

    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    const record = await ParcelApi.coveringParcelOf(LOT2);
    expect(record?.getKeyway()).toBeTruthy();
    expect(issued).toHaveLength(1);
    expect(issued[0]![0]).toBe(record!.getKeyway());
    expect(issued[0]![1]).toBe('pin-tumbler');
  });

  it('the chain of title records subdivide THEN transfer', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    const events = await ParcelEvent.findByExtent(LOT2);
    expect(events.map((e) => e.event)).toEqual(['subdivide', 'transfer']);
  });

  it('the lot is stamped residential, with its area, under the DISTRICT owner', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    const record = await ParcelApi.coveringParcelOf(LOT2);
    expect(record?.getLandUse()).toBe('residential');
    expect(record?.getArea()).toBe(1000);
    expect(ParcelApi.cultivationScaleAt(LOT2)).toBe('bed');
  });

  it('⭐ an unfunded buyer changes NOTHING — no row, no money', async () => {
    settleWorks = false;
    const room = registryRoom();
    const buyer = buyerIn(room);

    const ctx = await run(buyer, room, model('buy', 'lot 2'));

    expect(reasons(ctx)).toContain('insufficient-funds');
    expect(settled).toHaveLength(0);
    const record = await ParcelApi.coveringParcelOf(LOT2);
    expect(record?.getExtent()).not.toBe(LOT2);
    expect(await ParcelEvent.findByExtent(LOT2)).toHaveLength(0);
    const owner = await ParcelApi.ownerOf(LOT2);
    expect(owner?.kind).toBe('group');
  });

  it('the same lot cannot be sold twice', async () => {
    const room = registryRoom();
    const first = buyerIn(room);
    await run(first, room, model('buy', 'lot 2'));

    const second = buyerIn(room);
    const ctx = await run(second, room, model('buy', 'lot 2'));

    expect(reasons(ctx)).toContain('already-sold');
    expect(settled).toHaveLength(1);
    const owner = await ParcelApi.ownerOf(LOT2);
    expect((owner! as { templatePath: string }).templatePath).toBe(
      first.getIdentityPath(),
    );
  });

  it('⭐ the venue is the DESK, not a room constant (P6)', async () => {
    // Away from any desk: refused.
    const bare = elsewhere();
    const buyer = buyerIn(bare);
    const ctx = await run(buyer, bare, model('buy', 'lot 2'));
    expect(reasons(ctx)).toContain('not-at-registry');
    expect(settled).toHaveLength(0);

    // A SECOND desk anywhere is a records office — no code change.
    const annex = registryRoom();
    const buyer2 = buyerIn(annex);
    const ctx2 = await run(buyer2, annex, model('buy', 'lot 3'));
    expect(reasons(ctx2)).not.toContain('not-at-registry');
  });

  it('listing away from a desk is refused too', async () => {
    const room = elsewhere();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model('list'));
    expect(reasons(ctx)).toContain('not-at-registry');
  });

  it('⭐ GENERATIVE: a lot beyond any roster sells; past the cap is unknown', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    // lot-45 — no roster row anywhere (the old book stopped at 40).
    const ctx = await run(buyer, room, model('buy', 'lot 45'));
    expect(reasons(ctx)).not.toContain('unknown-lot');
    const owner = await ParcelApi.ownerOf(`${LOTS}/lot-45`);
    expect(owner?.kind).toBe('player');

    // …but past the operator's capacity there is nothing to buy.
    const ctx2 = await run(buyerIn(room), room, model('buy', 'lot 61'));
    expect(reasons(ctx2)).toContain('unknown-lot');
  });

  it('accepts "lot 2", "lot-2" and "2" alike', async () => {
    const room = registryRoom();
    for (const raw of ['lot 2', 'lot-2', '2']) {
      const buyer = buyerIn(room);
      const ctx = await run(buyer, room, model('buy', raw));
      expect(reasons(ctx)).not.toContain('unknown-lot');
    }
  });

  it('⭐ the ASCENT GATE refuses a dilapidated holder, names the reason, passes a kept one (P10)', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    // The buyer already holds a lease somewhere, and its shell is gone.
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
      buyer.getIdentityPath()!,
      null,
    );
    const cond = vi
      .spyOn(HoldingWarren, 'conditionOf')
      .mockResolvedValue({ condition: 0.2, band: 'dilapidated' });

    const ctx = await run(buyer, room, model('buy', 'lot 2'));
    expect(reasons(ctx)).toContain('ascent-condition');
    expect(settled).toHaveLength(0);
    expect(await ParcelApi.ownerOf(LOT2)).toMatchObject({ kind: 'group' });

    // A sound holding passes the same gate.
    cond.mockResolvedValue({ condition: 0.9, band: 'sound' });
    const ctx2 = await run(buyer, room, model('buy', 'lot 2'));
    expect(reasons(ctx2)).not.toContain('ascent-condition');
  });

  it('⭐ title bare reports what you hold and its land use', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    buyer.lines = [];
    const ctx = await run(buyer, room, model());
    expect(reasons(ctx)).not.toContain('holds-nothing');
    const said = buyer.lines.join(' ');
    expect(said).toContain('lot-2');
    expect(said).toContain('residential');
  });

  it('title bare on a landless character says so', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model());
    expect(reasons(ctx)).toContain('holds-nothing');
  });

  it('⭐ the provisioner is SWAPPABLE without touching the catalogue', async () => {
    class MintingHolder extends LotHolder {
      static _mixinName = 'TitleMintingHolder';
      public minted: string[] = [];
      public override async provision(
        lotExtent: string,
      ): Promise<{ room: Stuff; firstTime: boolean }> {
        this.minted.push(lotExtent);
        return {
          room: makeStuffAtPath(
            () => new TitleTestRoom(),
            fresh('/world/_title/minted'),
          ),
          firstTime: true,
        };
      }
      public override async ensureGate(): Promise<void> {}
    }

    const swapped = makeStuffAtPath(
      () => new MintingHolder(),
      fresh(`${SUBURB}/minting-holder`),
    );
    const book = StuffApi.findByTemplatePath<PlatBook>(BOOK_PATH)!;
    book.setHolderPath(swapped.getTemplatePath()!);

    const room = registryRoom();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model('buy', 'lot 3'));

    expect(reasons(ctx)).not.toContain('insufficient-funds');
    expect(swapped.minted).toEqual([`${LOTS}/lot-3`]);
    const owner = await ParcelApi.ownerOf(`${LOTS}/lot-3`);
    expect(owner?.kind).toBe('player');
    expect(settled).toEqual([4000]);
  });

  it('a book whose provisioner is missing still sells, and says nothing false', async () => {
    const book = StuffApi.findByTemplatePath<PlatBook>(BOOK_PATH)!;
    book.setHolderPath('/world/nowhere/absent-holder');

    const room = registryRoom();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model('buy', 'lot 4'));

    expect(reasons(ctx)).not.toContain('insufficient-funds');
    const owner = await ParcelApi.ownerOf(`${LOTS}/lot-4`);
    expect(owner?.kind).toBe('player');
  });

  it('⭐ hangs a GATE on the lane for the lot, eager on the yard ROW (D17)', async () => {
    const street = seedStreet();
    expect(street.getExit('lot-2')).toBeUndefined();

    const room = registryRoom();
    await run(buyerIn(room), room, model('buy', 'lot 2'));

    const gate = street.getExit('lot-2');
    expect(gate).toBeDefined();
    // Eager on its face — the ENTRY ROOM'S REAL ROW, never a minted path.
    expect(gate!.getDestinationTemplatePath()).toBe(YARD_ROW);
    expect(street.getExit('lot-3')).toBeUndefined();
  });

  it('⭐ the house stands up KEYED on the extent — rooms are instances of real rows (D16/D17)', async () => {
    const street = seedStreet();
    void street;
    const room = registryRoom();
    await run(buyerIn(room), room, model('buy', 'lot 2'));

    const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;
    const yard = holder.liveRoomFor(LOT2)!;
    expect(yard).not.toBeNull();
    // The lineage is the ROW; the instance identity is the (scope, key).
    expect(yard.getTemplatePath()).toBe(YARD_ROW);
    expect(
      (yard as unknown as { getPersistenceKey(): string }).getPersistenceKey(),
    ).toBe(`${LOT2}/yard`);
    // The holding is the keyed programme, carrying the tenure term (D5).
    const holding = holder.holdingFor(LOT2)! as unknown as HoldingProgramme;
    expect(holding).toBeInstanceOf(HoldingProgramme);
    expect(holding.getUpkeepTerm()).toBe('owner-all');
    expect(
      (holding as unknown as { getPersistenceKey(): string }).getPersistenceKey(),
    ).toBe(LOT2);
  });

  it('the gate is idempotent — re-provisioning hangs no second one', async () => {
    const street = seedStreet();
    const room = registryRoom();
    await run(buyerIn(room), room, model('buy', 'lot 2'));
    const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;
    const first = street.getExit('lot-2');
    await holder.ensureGate(LOT2);
    await holder.ensureGate(LOT2);
    expect(street.getExit('lot-2')).toBe(first);
  });

  it('⭐ re-hangs every sold lot\'s gate at BOOT, materializing no houses', async () => {
    const street = seedStreet();
    void street;
    const room = registryRoom();
    await run(buyerIn(room), room, model('buy', 'lot 2'));
    await run(buyerIn(room), room, model('buy', 'lot 3'));

    // Simulate the restart: tear the institution down, fresh street.
    const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;
    holder.teardown();
    StuffApi.destruct(StuffApi.findByTemplatePath<StreetRoom>(STREET_PATH)!);
    const reborn = seedStreet();

    await holder.postRegister();

    expect(reborn.getExit('lot-2')).toBeDefined();
    expect(reborn.getExit('lot-3')).toBeDefined();
    expect(reborn.getExit('lot-4')).toBeUndefined();
    // Deferred: nothing was materialized to answer the question.
    expect(holder.liveRoomFor(LOT2)).toBeNull();
  });

  it('⭐ a farther reach STANDS as its frontage sells (D13 branched growth)', async () => {
    const street = seedStreet();
    void street;
    const room = registryRoom();

    // lot-5 sits on lane:2 — the first minted reach past the made road.
    await run(buyerIn(room), room, model('buy', 'lot 5'));
    const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;
    expect(holder.nodeReachable('lane:2')).toBe(true);
    const reach = holder.circulationForNode('lane:2');
    expect(reach).not.toBeNull();
    // …wired back toward the entrance, gate hanging on the reach.
    expect(
      (reach as unknown as { getExit(d: string): unknown }).getExit('east'),
    ).toBeDefined();
    expect(
      (reach as unknown as { getExit(d: string): unknown }).getExit('lot-5'),
    ).toBeDefined();
    // The court (lot-57+ under this plan) is still unreachable.
    expect(holder.nodeReachable('court:1')).toBe(false);
  });

  it('title list shows sold lots and the next free one (the generative window)', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    buyer.lines = [];
    await run(buyer, room, model('list'));
    const said = buyer.lines.join(' ');
    expect(said).toContain('lot-2 — sold.');
    // The next free lot (lot-1 was never sold here) is on offer.
    expect(said).toContain('lot-1');
    expect(said).toContain('Hinkley Hills');
  });
});
