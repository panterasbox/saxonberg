/**
 * The Wood (forestry D1) — **a place that is ground with a stand on it,
 * and `StuffApi.singleton` as its establishing context.**
 *
 * Three claims: the STACK (persistable + singleton + soil + stand +
 * coordinates, each omission silent, and the base imported by the
 * specifier `lint:locations` derives cartesian-ness from); the three
 * soil hooks answered as Field answers them; and ⭐ the singleton
 * round-trip — a Wood with an authored `mix:` seeds and captures on the
 * no-record branch, and a second `singleton()` on a fresh registry
 * RESTORES the cut count rather than re-seeding the authored block.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import Wood from '../location/Wood';
import { STAND_MIXIN } from '../lib/Stand';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { SOIL_MOISTURE_RESERVE_KEY, SOIL_NITROGEN_RESERVE_KEY } from '@saxonberg/server/mud/lib/husbandry/Soil';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const ROOM = '/world/_test/hanging-wood/ride';
const OAK = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/fagaceae/quercus/robur';

function newWood(): Wood {
  const w = new Wood();
  w.setShortDescription('the ride');
  w.setAreaM2(100);
  w.setMix([
    { speciesPath: OAK, name: 'oak', woodMaterialPath: '/stuff/idea/material/wood/oak', seedPath: '/trade/forestry/thing/seed/acorn', standing: 8, capacity: 10, incrementPerYear: 1 },
  ]);
  return w;
}

describe('Wood — the stack', () => {
  afterEach(() => StuffApi.clearAll());

  it('composes persistable + singleton + soil + stand + coordinates', () => {
    for (const m of [Mixins.Persistable, Mixins.Singleton, Mixins.Soil, Mixins.Reserved, Mixins.Populates, Mixins.Container, Mixins.Exitable, Mixins.CartesianCoordinates]) {
      expect(MixinApi.hasMixin(Wood, m), String(m)).toBe(true);
    }
    const w = makeStuffAtPath(newWood, ROOM);
    expect(MixinApi.isActive(w, STAND_MIXIN)).toBe(true);
  });

  it('imports the singleton cell by the specifier `lint:locations` derives from', () => {
    // The gate reads the class file's `extends` chain and resolves each
    // identifier through its import; `@saxonberg/server/mud/platform/location/SingletonCartesianLocation`
    // is in CARTESIAN_ROOTS. A relative or lib import would make every
    // Wood row "unplotted" — the no-roster-edit claim rests on this line.
    const src = readFileSync(fileURLToPath(new URL('../location/Wood.ts', import.meta.url)), 'utf8');
    expect(src).toMatch(/from '@saxonberg\/server\/mud\/platform\/location\/SingletonCartesianLocation'/);
  });

  it('answers the soil’s hooks as ground: its own scope, its whole area, the stand’s drink', () => {
    const w = makeStuffAtPath(newWood, ROOM);
    expect(w.soilCatchmentAreaM2()).toBe(100);
    expect(w.soilWaterDemandPerGameDay()).toBe(8 * 120);
    expect((w as unknown as { watershedScope(): unknown }).watershedScope()).toBe(w);
  });

  it('stands itself up at registration: reserves from its area, idempotently', async () => {
    const w = makeStuffAtPath(newWood, ROOM);
    await w.postRegister();
    expect(w.hasReserve(SOIL_MOISTURE_RESERVE_KEY)).toBe(true);
    expect(w.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.capacity.rawValue()).toBe(4500);
    expect(w.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue()).toBe(2250);
    expect(w.getReserve(SOIL_NITROGEN_RESERVE_KEY)!.current.rawValue()).toBe(60);
    // A second registration (a restore) keeps what is there.
    w.adjustReserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(-1000, 'L'));
    w.installWoodReserves();
    expect(w.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue()).toBe(1250);
  });
});

describe('Wood — ⭐ StuffApi.singleton is its establishing context', () => {
  let snapshots: Record<string, unknown>[];
  let base: number;

  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue({ rawValue: () => base } as never);
    snapshots = [];
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
    vi.spyOn(PersistApi, 'find').mockImplementation(async (col: string, query: Record<string, unknown>) => {
      if (col !== Collections.HolderSnapshots) return [];
      return snapshots.filter((d) => Object.entries(query).every(([k, v]) => d[k] === v));
    });
    vi.spyOn(PersistApi, 'save').mockImplementation(async (col: string, doc: Record<string, unknown>) => {
      if (col !== Collections.HolderSnapshots) return 'id';
      const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
      if (i >= 0) {
        snapshots[i] = { ...doc, _id: snapshots[i]!._id };
        return snapshots[i]!._id as string;
      }
      const _id = String(snapshots.length + 1);
      snapshots.push({ ...doc, _id });
      return _id;
    });
    vi.spyOn(PersistApi, 'delete').mockImplementation(async () => undefined);
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'rejection' });
    makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);
    // `singleton()` clones the row; here the "row" is the factory, and
    // its postRegister stands the ground up as the real cascade would.
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path !== ROOM) throw new Error(`no template ${path}`);
      const w = makeStuffAtPath(newWood, path);
      await w.postRegister();
      return w;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('seeds the authored mix and captures the first record when none exists; a cut is captured; a fresh registry RESTORES the cut', async () => {
    const first = await StuffApi.singleton<Wood>(ROOM);
    expect(first.getPersistenceKey()).not.toBeNull();
    expect(snapshots.some((d) => d.scope === ROOM)).toBe(true);
    expect(first.standingNow(first.getMix()[0]!)).toBe(8);

    // The axe.
    expect(first.cut(OAK, base, '/platform/agent/Avatar/t')).toBe(true);
    await PersistableApi.captureHostOf(first);
    expect(first.standingNow(first.getMix()[0]!)).toBe(7);

    // A "restart": the room gone, the record still there.
    StuffApi.unregister(first);
    const second = await StuffApi.singleton<Wood>(ROOM);
    expect(second).not.toBe(first);
    // ⭐ The record wins over the authored block: seven, not eight.
    expect(second.standingNow(second.getMix()[0]!)).toBe(7);
    expect(second.getStandStamp()).toBe(base);
    expect(second.getCutLog()).toHaveLength(1);
  });
});
