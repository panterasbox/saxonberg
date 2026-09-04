/**
 * `plot` — the act that makes a field (W3 / D3, D88).
 *
 * ⭐ The two claims worth testing, and neither is about prose:
 *
 *  1. **A field carries the ground it was plotted from.** D3's *"you can
 *     survey before you commit"* is only meaningful if the field you
 *     make on ground you sampled IS the ground you sampled. The spot is
 *     stamped from where the plotter stood.
 *  2. **The `field` cultivation ceiling finally has a consumer.** It has
 *     shipped in `LandUse` since the smallholding build with nothing
 *     reading it; a residential lot admits a bed and refuses a field, and
 *     that refusal names the zoning.
 *
 * ⚠ The holding is a **duck-typed stub**, and deliberately so: `plot`
 * finds its host by the shape it answers (`admitPlot`), never by
 * importing the residence pack. Testing against the shape IS testing the
 * contract. The real `HoldingWarren.admitPlot` is proven in that pack's
 * own suite, where it belongs.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PlotController from '../PlotController';
import Field from '../../../../location/Field';
import Spade from '../../../../thing/Spade';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import CartesianLocation from '@saxonberg/server/mud/platform/location/CartesianLocation';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  TestActor,
  makeContext,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

const LOT = '/world/plot-test/lots/lot-1';
const FIELD_ROW = '/trade/farming/location/field';

/** A yard: a coordinate room that belongs to a warren. */
class TestYard extends WarrenMemberMixin(CartesianLocation) {}

/**
 * ⚠ The duck-typed holding. It answers `admitPlot` and `getMembers` and
 * nothing else, which is the entire contract `plot` relies on.
 */
class StubHolding {
  public readonly members: Stuff[] = [];
  public readonly admitted: Array<Record<string, unknown>> = [];
  public refuse = false;

  public getMembers(): readonly Stuff[] {
    return this.members;
  }

  public async admitPlot(spec: Record<string, unknown>): Promise<Stuff | null> {
    if (this.refuse) return null;
    this.admitted.push(spec);
    const field = await StuffApi.clone<Field>(FIELD_ROW);
    this.members.push(field as unknown as Stuff);
    return field as unknown as Stuff;
  }
}

let store: Map<string, Array<Record<string, unknown>>>;
let ids = 0;

function col(name: string): Array<Record<string, unknown>> {
  let a = store.get(name);
  if (!a) {
    a = [];
    store.set(name, a);
  }
  return a;
}

function installStore(): void {
  store = new Map();
  ids = 0;
  col('content').push(
    {
      _id: 'ph',
      path: '/platform/idea/persistence/PersistentHydrator',
      class: '/platform/idea/persistence/PersistentHydrator',
      data: {},
    },
    {
      _id: 'field',
      path: FIELD_ROW,
      class: '/trade/farming/location/Field',
      hydratorClass: '/platform/idea/persistence/PersistentHydrator',
      data: { shortDescription: 'a field' },
    },
  );
  const save = vi.fn(async (c: string, doc: Record<string, unknown>) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id as string;
    }
    const id = String(++ids);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const keys = Object.keys(q);
    return col(c).filter((d) => keys.every((k) => d[k] === q[k]));
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById: vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null),
    delete: vi.fn(async () => undefined),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function bootRegistries(): Promise<void> {
  const groups = makeStuffAtPath(() => new GroupRegistry(), '/platform/idea/GroupRegistry');
  await groups.postRegister();
  const parcels = makeStuffAtPath(() => new ParcelRegistry(), '/platform/idea/ParcelRegistry');
  await parcels.postRegister();
}

interface Scene {
  actor: TestActor;
  yard: TestYard;
  holding: StubHolding;
  ctx: CommandContext;
}

async function scene(coords: [number, number, number] = [12, 34, 0]): Promise<Scene> {
  const holding = new StubHolding();
  const yard = makeStuffAtPath(() => new TestYard(), '/world/plot-test/yard');
  yard.setCoordinates(coords);
  yard.setWarren(holding as unknown as never);
  const actor = makeStuff(() => new TestActor());
  ContainmentApi.move(
    actor as unknown as Stuff & Containable,
    yard as unknown as Stuff & Container,
  );
  const spade = makeStuff(() => {
    const s = new Spade();
    s.setShortDescription('a garden spade');
    s.setCapabilities(['digging']);
    return s;
  });
  ContainmentApi.move(
    spade as unknown as Stuff & Containable,
    actor as unknown as Stuff & Container,
  );
  return {
    actor,
    yard,
    holding,
    ctx: makeContext(actor as unknown as Stuff, yard as unknown as Stuff, 'plot'),
  };
}

function reasons(ctx: CommandContext): string[] {
  return ctx
    .getNotes()
    .map((n) => (n as { reason?: string }).reason)
    .filter((r): r is string => typeof r === 'string');
}

async function run(ctx: CommandContext, name?: string): Promise<void> {
  const c = makeStuff(() => new PlotController());
  await c.execute({ name } as never, ctx);
}

describe('plot — breaking a field out of ground you hold', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ParcelApi._resetRegistryRefForReload();
    StuffApi.clearAll();
    installStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    ParcelApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  it('⭐ mints a field, hangs it on the holding, and names the gate after it', async () => {
    await bootRegistries();
    const s = await scene();
    await run(s.ctx, 'Top Meadow');

    expect(reasons(s.ctx)).toEqual([]);
    expect(s.holding.admitted).toHaveLength(1);
    // ⭐ D88 — the name IS the way in. `go top-meadow`, never `paddock 7`.
    expect(s.holding.admitted[0]).toMatchObject({
      leaf: 'top-meadow',
      room: FIELD_ROW,
      direction: 'top-meadow',
    });
    const field = s.holding.members[0] as unknown as Field;
    expect(field.getFieldName()).toBe('Top Meadow');
    expect(field.getPresentation()).toBe('Top Meadow');
  });

  it('⭐⭐ the field carries the ground it was PLOTTED FROM', async () => {
    // The whole reason surveying before you commit predicts anything.
    await bootRegistries();
    const s = await scene([7, -3, 0]);
    await run(s.ctx);
    const field = s.holding.members[0] as unknown as Field;
    expect(field.getGroundSpot()).toEqual([7, -3]);
  });

  it('installs soil reserves DERIVED from area and texture, half full', async () => {
    await bootRegistries();
    const s = await scene();
    await run(s.ctx);
    const field = s.holding.members[0] as unknown as Field;
    const water = field.getReserve('moisture');
    expect(water).toBeDefined();
    expect(water!.capacity.rawValue()).toBeGreaterThan(0);
    expect(water!.current.rawValue()).toBeCloseTo(water!.capacity.rawValue() / 2, 6);
    // ⚠ Rough ground is not fertile ground.
    expect(field.getReserve('nitrogen')!.current.rawValue()).toBe(25);
    // Every square metre of it catches rain — that is what a field is.
    expect(field.soilCatchmentAreaM2()).toBe(field.getAreaM2());
  });

  it('unnamed fields number themselves', async () => {
    await bootRegistries();
    const s = await scene();
    await run(s.ctx);
    await run(s.ctx);
    expect(s.holding.admitted.map((a) => a.leaf)).toEqual(['field-1', 'field-2']);
  });

  it('refuses without something to dig with', async () => {
    await bootRegistries();
    const s = await scene();
    for (const held of (s.actor as unknown as Stuff & Container).getContents()) {
      StuffApi.destruct(held);
    }
    await run(s.ctx);
    expect(reasons(s.ctx)).toEqual(['no-tool']);
    expect(s.holding.admitted).toHaveLength(0);
  });

  it('refuses when there is no holding to hang it on', async () => {
    await bootRegistries();
    const s = await scene();
    s.yard.setWarren(null);
    await run(s.ctx);
    expect(reasons(s.ctx)).toEqual(['no-holding']);
  });

  it('⭐ the FIELD ceiling finally has a consumer: a residential lot refuses', async () => {
    col('parcels').push({
      _id: 'p1',
      extent: LOT,
      zonePath: LOT,
      owner: { kind: 'player', templatePath: '/platform/agent/Avatar/iris' },
      parentParcel: null,
      grants: [],
      allowance: null,
      landUse: 'residential',
    });
    await bootRegistries();
    const s = await scene();
    vi.spyOn(s.yard, 'getTemplatePath').mockReturnValue(`${LOT}/yard`);
    await run(s.ctx);
    expect(reasons(s.ctx)).toEqual(['land-use-forbids-field']);
  });

  it('⚠ unparcelled ground is NOT policed — the hermit still works', async () => {
    // "Nobody has zoned this" is not the same statement as "this is
    // zoned against you", and treating it as one breaks the clearing in
    // the woods. No parcel row at all, and the plot goes through.
    await bootRegistries();
    const s = await scene();
    await run(s.ctx);
    expect(reasons(s.ctx)).toEqual([]);
  });

  it('the spade affords the verb — a static on the class, not a row', () => {
    // ⚠ A row's `commandContributions:` is dead silently.
    const verbs = CommandApi.collectContributions(Spade, 'self')
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('plot');
  });
});
