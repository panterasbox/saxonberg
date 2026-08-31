/**
 * `title` — the land-sale verb (Hinkley Hills Wave 7).
 *
 * The property substrate shipped every piece of title machinery and no
 * player-facing act. This is the act, and the tests are about the two
 * things that make a sale a sale rather than a state change:
 *
 *   1. ⭐ **An unfunded buyer changes NOTHING.** No parcel row, no money
 *      moved, no yard stood up. The money leg runs first for exactly
 *      this reason.
 *   2. **The same lot cannot be sold twice**, and the chain of title
 *      records what happened.
 *
 * The venue rule is tested too: land changes hands over a counter, not
 * wherever you happen to be standing.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TitleController from '@saxonberg/server/mud/platform/idea/cmd/civics/TitleController';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import LotHolder from '../idea/LotHolder';
import PlatBook from '../idea/PlatBook';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { ParcelEvent } from '@saxonberg/server/mud/lib/parcel/ParcelEvent';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
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
  stampIdentityPathForTest,
  withRootContext,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

/** A persistable room — what a real yard template clones to. */
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

const REGISTRY_ROOM = '/world/terminus/registry/office';
const SUBURB = '/world/terminus/hinkley-hills';
// Lots hang off their own zone branch — see PlatBook.lotBranch, and
// `lots.yaml`: the `lot-N` gate off the lane is non-cardinal, which a
// cartesian grid admits only across a zone boundary.
const LOTS = `${SUBURB}/lots`;
const LOT2 = `${LOTS}/lot-2`;
const HOLDER_PATH = `${SUBURB}/lot-holder`;
const BOOK_PATH = `${SUBURB}/plat-book`;
const STREET_PATH = `${SUBURB}/lane`;

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
  // The sale WRITES an area, so a real m² marshaller is needed — a no-op
  // resolver would throw on the save rather than round-trip the value.
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
 * Hinkley's two halves, exactly as the seeds author them: a CATALOGUE
 * (what is for sale, on what terms) naming a PROVISIONER (how ground
 * becomes a place). The controller knows no locality, so a test that
 * wants lots to exist has to stand both up.
 */
function seedSubdivision(): void {
  // The singletons persist across tests (no StuffApi.clearAll — it wipes
  // the WorldClockRegistry), so their FIELDS are re-seeded every time
  // rather than only on creation. Two tests below deliberately repoint
  // `holderPath`, and without this reset that mutation leaks forward.
  const holder =
    StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH) ??
    makeStuffAtPath(() => new LotHolder(), HOLDER_PATH);
  holder.setRoomTemplate(`${SUBURB}/yard`);
  holder.forgetLiveRooms();

  const book =
    StuffApi.findByTemplatePath<PlatBook>(BOOK_PATH) ??
    makeStuffAtPath(() => new PlatBook(), BOOK_PATH);
  book.setLabel('Hinkley Hills');
  book.setParentExtent(SUBURB);
  book.setLots(['lot-1', 'lot-2', 'lot-3', 'lot-4', 'lot-5']);
  book.setPriceMinor(4000);
  book.setAreaM2(1000);
  book.setLandUse('residential');
  book.setHolderPath(HOLDER_PATH);
}

/**
 * A street for the lots to front onto — a plain exitable room, since the
 * gate wiring only needs `addExit`/`getExit`. The cartesian zone rule
 * that forced the separate lots branch is `CartesianLocation`'s, and it
 * is exercised live in `e2e/tests/hinkley.spec.ts`; what a unit test can
 * pin is that a gate is hung, named for the lot, exactly once, and only
 * for lots that sold.
 */
function seedStreet(): StreetRoom {
  const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;
  const existing = StuffApi.findByTemplatePath<StreetRoom>(STREET_PATH);
  const street =
    existing ?? makeStuffAtPath(() => new StreetRoom(), STREET_PATH);
  holder.setStreetPath(STREET_PATH);
  holder.setParentExtent(SUBURB);
  return street;
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

/** Run the controller under a root context with an acting author. */
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
    installStore();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    seedSuburb();
    await bootRegistries();
    seedSubdivision();
    // The holder clones a room per sold lot and keys it through the
    // persistence spine, so the stub has to be a PERSISTABLE room — a
    // bare Location would make restoreOrSeed throw, correctly.
    // Honour `asIdentityPath` — the mint is the thing under test in one
    // of these, and a stub that ignored it would quietly prove nothing.
    // The stub takes clone's REAL 3-arg shape: the pre-residences stub
    // read opts from the second (context) position, which is where the
    // old LotHolder call put it — and where the real clone never looked.
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (
      path: string,
      _ctx?: unknown,
      opts?: { asIdentityPath?: string },
    ) => {
      const room = makeStuffAtPath(
        () => new TitleTestRoom(),
        path.startsWith('/') ? path : fresh('/world/_title/room'),
      );
      if (opts?.asIdentityPath) {
        stampIdentityPathForTest(room, opts.asIdentityPath);
      }
      return room;
    }) as unknown as typeof StuffApi.clone);

    settled = [];
    settleWorks = true;
    // The money leg is banking's business and is proven there; here it
    // is a switch, so the sale's ORDERING is what gets tested.
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
  });

  function registryRoom(): Location {
    return makeStuffAtPath(() => new Location(), REGISTRY_ROOM);
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
      buyer.getTemplatePath(),
    );
    // …and the money actually moved.
    expect(settled).toHaveLength(1);
    expect(settled[0]).toBe(4000);
  });

  it('the chain of title records subdivide THEN transfer', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    const events = await ParcelEvent.findByExtent(LOT2);
    expect(events.map((e) => e.event)).toEqual(['subdivide', 'transfer']);
  });

  it('the lot is stamped residential, with its area', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    const record = await ParcelApi.coveringParcelOf(LOT2);
    expect(record?.getLandUse()).toBe('residential');
    expect(record?.getArea()).toBe(1000);
    // …and it is therefore ground a bed may stand on.
    expect(ParcelApi.cultivationScaleAt(LOT2)).toBe('bed');
  });

  it('⭐ an unfunded buyer changes NOTHING — no row, no money', async () => {
    settleWorks = false;
    const room = registryRoom();
    const buyer = buyerIn(room);

    const ctx = await run(buyer, room, model('buy', 'lot 2'));

    expect(reasons(ctx)).toContain('insufficient-funds');
    expect(settled).toHaveLength(0);
    // No parcel row was minted…
    const record = await ParcelApi.coveringParcelOf(LOT2);
    expect(record?.getExtent()).not.toBe(LOT2);
    // …and no chain-of-title event was written.
    expect(await ParcelEvent.findByExtent(LOT2)).toHaveLength(0);
    // …and the ground is still the District's.
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
    // …and the second buyer was not charged for the privilege.
    expect(settled).toHaveLength(1);
    const owner = await ParcelApi.ownerOf(LOT2);
    expect((owner! as { templatePath: string }).templatePath).toBe(
      first.getTemplatePath(),
    );
  });

  it('buying away from the Registry is refused', async () => {
    const room = elsewhere();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model('buy', 'lot 2'));

    expect(reasons(ctx)).toContain('not-at-registry');
    expect(settled).toHaveLength(0);
  });

  it('listing away from the Registry is refused too', async () => {
    const room = elsewhere();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model('list'));
    expect(reasons(ctx)).toContain('not-at-registry');
  });

  it('an unknown lot is refused without charging', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model('buy', 'lot 99'));

    expect(reasons(ctx)).toContain('unknown-lot');
    expect(settled).toHaveLength(0);
  });

  it('accepts "lot 2", "lot-2" and "2" alike', async () => {
    const room = registryRoom();
    for (const raw of ['lot 2', 'lot-2', '2']) {
      const buyer = buyerIn(room);
      const ctx = await run(buyer, room, model('buy', raw));
      // The first sells; the rest hit already-sold — never unknown-lot,
      // which is the point.
      expect(reasons(ctx)).not.toContain('unknown-lot');
    }
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
    // The reason the two are separate objects. A different provisioning
    // model — the likely next one mints a template per residence rather
    // than cloning one shared template per lot — is a subclass of
    // LotHolder and a one-line change to the book's `holderPath`.
    // Nothing in the catalogue, the verb or the parcel layer moves.
    class MintingHolder extends LotHolder {
      public minted: string[] = [];
      public override async provision(
        lotExtent: string,
      ): Promise<{ room: Stuff; firstTime: boolean }> {
        this.minted.push(lotExtent);
        return {
          room: makeStuffAtPath(
            () => new TitleTestRoom(),
            `${lotExtent}/minted`,
          ),
          firstTime: true,
        };
      }
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

    // The sale went through the NEW provisioner…
    expect(reasons(ctx)).not.toContain('insufficient-funds');
    expect(swapped.minted).toEqual([`${LOTS}/lot-3`]);
    // …and everything the catalogue owns is unchanged: the title moved,
    // the money moved, the zoning was stamped.
    const owner = await ParcelApi.ownerOf(`${LOTS}/lot-3`);
    expect(owner?.kind).toBe('player');
    expect(settled).toEqual([4000]);
    const record = await ParcelApi.coveringParcelOf(`${LOTS}/lot-3`);
    expect(record?.getLandUse()).toBe('residential');
  });

  it('a book whose provisioner is missing still sells, and says nothing false', async () => {
    // An offer with nothing behind it is a content bug. The sale must not
    // pretend a room appeared, but it also must not take the money and
    // then throw — the title is real either way.
    const book = StuffApi.findByTemplatePath<PlatBook>(BOOK_PATH)!;
    book.setHolderPath('/world/nowhere/absent-holder');

    const room = registryRoom();
    const buyer = buyerIn(room);
    const ctx = await run(buyer, room, model('buy', 'lot 4'));

    expect(reasons(ctx)).not.toContain('insufficient-funds');
    const owner = await ParcelApi.ownerOf(`${LOTS}/lot-4`);
    expect(owner?.kind).toBe('player');
  });

  it('⭐ hangs a GATE on the street for the lot, and only for the lot', async () => {
    // The lane used to author `north -> <the yard template>`, which stood
    // the shared TEMPLATE up as an unowned place and could only ever mean
    // one lot. Gates are installed per sale instead, directioned by the
    // lot's leaf.
    const street = seedStreet();
    expect(street.getExit('lot-2')).toBeUndefined();

    const room = registryRoom();
    await run(buyerIn(room), room, model('buy', 'lot 2'));

    const gate = street.getExit('lot-2');
    expect(gate).toBeDefined();
    // Eager on its face — describable without materializing the yard.
    expect(gate!.getDestinationTemplatePath()).toBe(`${LOT2}/yard`);
    // …and nothing opens onto a lot nobody bought.
    expect(street.getExit('lot-3')).toBeUndefined();
  });

  it('the gate is idempotent — re-provisioning hangs no second one', async () => {
    const street = seedStreet();
    const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;

    await holder.ensureGate(LOT2);
    const first = street.getExit('lot-2');
    await holder.ensureGate(LOT2);
    await holder.ensureGate(LOT2);

    expect(street.getExit('lot-2')).toBe(first);
  });

  it('⭐ re-hangs every sold lot\'s gate at BOOT, materializing nothing', async () => {
    // A restart leaves the yards in `holder_snapshots` and the street
    // with no exits. Without this an owner standing on the lane has no
    // way home. The exits are deferred, so re-hanging must not stand a
    // single room up.
    const room = registryRoom();
    seedStreet();
    await run(buyerIn(room), room, model('buy', 'lot 2'));
    await run(buyerIn(room), room, model('buy', 'lot 3'));

    // Simulate the restart: a fresh street, and a holder that has
    // forgotten every live room.
    const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;
    holder.forgetLiveRooms();
    StuffApi.destruct(StuffApi.findByTemplatePath<StreetRoom>(STREET_PATH)!);
    const street = seedStreet();

    await holder.postRegister();

    expect(street.getExit('lot-2')).toBeDefined();
    expect(street.getExit('lot-3')).toBeDefined();
    expect(street.getExit('lot-4')).toBeUndefined();
    // Deferred: nothing was materialized to answer the question.
    expect(holder.liveRoomFor(LOT2)).toBeNull();
  });

  it('⭐ each lot\'s room is MINTED at its own identity, not shared', async () => {
    // The shared-template shape broke three things at once: land use
    // resolved to the district, an avatar's captured placement pointed at
    // a template rather than their own yard, and a cartesian room could
    // not be used at all (singleton-shaped, so N clones collide).
    //
    // Minting through `asIdentityPath` fixes all three (D17: the
    // templatePath stays the source ROW; the minted identity rides the
    // identity slot and the registry index). Pin the identity.
    const holder = StuffApi.findByTemplatePath<LotHolder>(HOLDER_PATH)!;
    expect(holder.identityFor(`${LOTS}/lot-2`)).toBe(
      `${LOTS}/lot-2/yard`,
    );
    expect(holder.identityFor(`${LOTS}/lot-3`)).toBe(
      `${LOTS}/lot-3/yard`,
    );

    const room = registryRoom();
    // Two lots sold, one after the other. Under the shared-template shape
    // the SECOND clone would have collided on the singleton guard.
    await run(buyerIn(room), room, model('buy', 'lot 2'));
    await run(buyerIn(room), room, model('buy', 'lot 3'));

    const two = holder.liveRoomFor(`${LOTS}/lot-2`);
    const three = holder.liveRoomFor(`${LOTS}/lot-3`);
    expect(two).not.toBeNull();
    expect(three).not.toBeNull();
    expect(two).not.toBe(three);

    // …and each carries its OWN identity, so a placement recorded
    // against it points at that lot rather than at a shared template —
    // while the template lineage stays the source ROW (D17).
    expect(two!.getIdentityPath()).toBe(`${LOTS}/lot-2/yard`);
    expect(three!.getIdentityPath()).toBe(`${LOTS}/lot-3/yard`);
    expect(two!.getTemplatePath()).toBe(`${SUBURB}/yard`);

    // ⭐ Which means land use resolves PER LOT from the path alone — no
    // persistence key needed to tell them apart.
    expect(ParcelApi.landUseOf(two!.getIdentityPath()!)).toBe('residential');
  });

  it('title list shows unsold lots and marks sold ones', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    buyer.lines = [];
    await run(buyer, room, model('list'));
    const said = buyer.lines.join(' ');
    expect(said).toContain('lot-2 — sold.');
    expect(said).toContain('lot-1');
    // …grouped under the subdivision that offers them.
    expect(said).toContain('Hinkley Hills');
  });
});
