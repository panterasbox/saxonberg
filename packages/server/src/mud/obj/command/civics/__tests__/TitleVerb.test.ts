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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TitleController from '../TitleController';
import ParcelRegistry from '../../../ParcelRegistry';
import GroupRegistry from '../../../GroupRegistry';
import { ParcelApi } from '../../../../api/parcel';
import { BankingApi } from '../../../../api/banking';
import { EmploymentApi } from '../../../../api/employment';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { ParcelEvent } from '../../../../lib/parcel/ParcelEvent';
import { Document } from '../../../../lib/persistence/Document';
import { QuantityMarshaller } from '../../../../lib/persistence/QuantityMarshaller';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiverTitle';
  lines: string[] = [];
  protected handleMessage(msg: unknown): void {
    this.lines.push(JSON.stringify(msg));
  }
}

const REGISTRY_ROOM = '/domain/terminus/registry/office';
const SUBURB = '/domain/terminus/hinkley-hills';
const LOT2 = `${SUBURB}/lot-2`;

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

async function bootRegistries(): Promise<void> {
  if (!StuffApi.findByTemplatePath('/obj/GroupRegistry')) {
    const g = makeStuffAtPath(() => new GroupRegistry(), '/obj/GroupRegistry');
    await g.postRegister();
  }
  if (!StuffApi.findByTemplatePath('/obj/ParcelRegistry')) {
    const p = makeStuffAtPath(
      () => new ParcelRegistry(),
      '/obj/ParcelRegistry',
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
    return makeStuffAtPath(() => new Location(), fresh('/domain/somewhere'));
  }
  function buyerIn(room: Location): TestGiver {
    const g = makeStuffAtPath(() => {
      const t = new TestGiver();
      t.setName('Alice');
      return t;
    }, fresh('/obj/Avatar/_title'));
    ContainmentApi.move(g, room as unknown as Stuff & never);
    return g;
  }

  it('⭐ a funded buyer gets the lot, and ownerOf reports them', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);

    const ctx = await run(buyer, room, model('buy', 'lot 2'));
    expect(reasons(ctx)).not.toContain('insufficient-funds');

    const owner = await ParcelApi.ownerOf(LOT2);
    expect(owner.kind).toBe('player');
    expect((owner as { templatePath: string }).templatePath).toBe(
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
    expect(record?.getArea()?.value).toBe(1000);
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
    expect(owner.kind).toBe('group');
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
    expect((owner as { templatePath: string }).templatePath).toBe(
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

  it('title list shows unsold lots and marks sold ones', async () => {
    const room = registryRoom();
    const buyer = buyerIn(room);
    await run(buyer, room, model('buy', 'lot 2'));

    buyer.lines = [];
    await run(buyer, room, model('list'));
    const said = buyer.lines.join(' ');
    expect(said).toContain('lot-2 — sold.');
    expect(said).toContain('lot-1');
  });
});
