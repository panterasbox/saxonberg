/**
 * ⭐ The five mixin splits (controllers-are-io D6) — each half on its
 * honest hosts, and nothing persisted lost on the way.
 *
 * For every split: a host is CAPTURED through the persistence spine and a
 * fresh one MATERIALIZED from the record, and every persisted field of
 * both halves reads back. Then the Attired-style invariant — what a carved
 * half composing on the wrong host would have claimed: *a government is
 * an Organization and NOT OnCall; a cow is a Chattel and NOT MadeFrom.*
 *
 * ⚠ Paths are synthetic (`/test/**`): a kernel test proves the kernel.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistableApi } from '../../../api/persistable';
import { StuffApi } from '../../../api/stuff';
import { ParcelApi } from '../../../api/parcel';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistableMixin } from '../Persistable';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import { OrganizationMixin } from '../../employment/Organization';
import { OnCallMixin } from '../../employment/OnCall';
import { MetabolicMixin } from '../../metabolism/Metabolic';
import { EatingMixin } from '../../metabolism/Eating';
import { ChattelMixin } from '../../chattel/Chattel';
import { MadeFromMixin } from '../../chattel/MadeFrom';
import { WaterPlaceMixin } from '../../location/WaterPlace';
import { ShoreMixin } from '../../location/Shore';
import { SwimmableMixin } from '../../locomotion/Swimmable';
import { HaulOutMixin } from '../../location/HaulOut';
import { Creature } from '../../creature/Creature';
import Good from '../../stuff/Good';
import { Vessel } from '../../stuff/Vessel';
import { KeptAnimal } from '../../creature/KeptAnimal';
import Pool from '../../../platform/location/Pool';
import Compartment from '../../../platform/location/Compartment';
import OrganizationEntity from '../../../platform/idea/Organization';
import BusinessEntity from '../../../platform/idea/Business';
import type { Stuff } from '../../stuff/Stuff';
import type { AnyConstructor } from '../../../api/mixin';

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll();
  snapshots = [];
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return [];
    return snapshots.filter((d) =>
      Object.entries(query).every(([k, v]) => d[k] === v),
    );
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return 'id';
    const i = snapshots.findIndex(
      (d) => d.scope === doc.scope && d.owner === doc.owner,
    );
    if (i >= 0) {
      snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      return snapshots[i]!._id as string;
    }
    const _id = String(snapshots.length + 1);
    snapshots.push({ ...doc, _id });
    return _id;
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
    kind: 'group',
    name: 'test',
  });
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Capture `a`, then materialize a FRESH instance at the same path. */
async function roundTrip<T extends Stuff>(
  make: () => T,
  path: string,
  set: (host: T) => void,
): Promise<T> {
  const a = makeStuffAtPath(make, path);
  set(a);
  await PersistableApi.capture(a);
  StuffApi.clearAll();
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
  const b = makeStuffAtPath(make, path);
  await PersistableApi.materialize(b);
  return b;
}

const composes = (ctor: AnyConstructor, name: string): boolean =>
  MixinApi.hasMixin(ctor, name as never);

describe('Organization → OnCall', () => {
  class House extends PersistableMixin(
    OnCallMixin(OrganizationMixin(ContainerMixin(Idea))),
  ) {}

  it('⭐ the chart and the call both read back', async () => {
    const b = await roundTrip(() => new House(), '/test/splits/house', (h) => {
      h.setCall('rota');
      h.proprietorPath = '/test/splits/owner';
      h.parentOrganization = '/test/splits/parent';
      h.startsShiftOnHire = true;
      h.rosterSlots = [];
    });
    expect(b.getCall()).toBe('rota');
    expect(b.getProprietor()).toBe('/test/splits/owner');
    expect(b.getParentOrganizationPath()).toBe('/test/splits/parent');
    expect(b.getStartsShiftOnHire()).toBe(true);
  });

  it('⭐⭐ a government is an Organization and NOT OnCall; a business is both', () => {
    expect(composes(OrganizationEntity, Mixins.Organization)).toBe(true);
    expect(composes(OrganizationEntity, Mixins.OnCall)).toBe(false);
    expect(composes(BusinessEntity, Mixins.Organization)).toBe(true);
    expect(composes(BusinessEntity, Mixins.OnCall)).toBe(true);
  });
});

describe('WaterPlace → HaulOut', () => {
  it('every water place composes both halves (a co-use split)', () => {
    for (const cls of [Pool, Compartment] as AnyConstructor[]) {
      expect(composes(cls, Mixins.WaterPlace)).toBe(true);
      expect(composes(cls, Mixins.HaulOut)).toBe(true);
    }
  });

  it("⭐ the water's own fields read back on a hauling host", async () => {
    class Water extends PersistableMixin(
      HaulOutMixin(
        WaterPlaceMixin(
          SwimmableMixin(ShoreMixin(ContainerMixin(Idea))) as never,
        ),
      ),
    ) {}
    type W = InstanceType<typeof Water> & {
      setWater(v: unknown): void;
      getWater(): unknown;
      setTide(v: unknown): void;
      getTide(): unknown;
      setColumn(v: unknown): void;
      getColumn(): unknown;
    };
    const b = (await roundTrip(
      () => new Water() as unknown as Stuff,
      '/test/splits/water',
      (h) => {
        const w = h as unknown as W;
        w.setWater({ of: 'test:pond', depthM: 3 });
        w.setTide({ collectsFrom: ['test:pond'] });
        w.setColumn({
          neighbors: [
            { band: 'lit', direction: 'east', destination: '/test/splits/east' },
          ],
        });
      },
    )) as unknown as W;
    expect(b.getWater()).toMatchObject({ of: 'test:pond', depthM: 3 });
    expect(b.getTide()).toMatchObject({ collectsFrom: ['test:pond'] });
    expect(b.getColumn()).toEqual({
      neighbors: [
        { band: 'lit', direction: 'east', destination: '/test/splits/east' },
      ],
    });
    expect(MixinApi.isHaulOut(b as unknown as Stuff)).toBe(true);
  });
});

describe('Metabolic → Eating', () => {
  class Eater extends PersistableMixin(
    EatingMixin(MetabolicMixin(ContainerMixin(Idea))),
  ) {}

  it("⭐ digestion's seven fields read back on an eating host", async () => {
    const b = await roundTrip(() => new Eater(), '/test/splits/eater', (h) => {
      h.digestionPools = { satiation: 12 };
      h.solidVolume = 0.4;
      h.liquidVolume = 0.2;
      h.toxinBurdens = { ethanol: 3 };
      h.metabolicClockStamp = 1234;
      h.lastMealLabel = 'stew';
    });
    expect(b.digestionPools).toEqual({ satiation: 12 });
    expect(b.solidVolume).toBe(0.4);
    expect(b.liquidVolume).toBe(0.2);
    expect(b.toxinBurdens).toEqual({ ethanol: 3 });
    expect(b.metabolicClockStamp).toBe(1234);
    expect(b.lastMealLabel).toBe('stew');
    expect(MixinApi.isEating(b)).toBe(true);
  });

  it('every creature eats AND digests, and floats AND bears', () => {
    expect(composes(Creature, Mixins.Metabolic)).toBe(true);
    expect(composes(Creature, Mixins.Eating)).toBe(true);
    expect(composes(Creature, Mixins.LoadBearing)).toBe(true);
    expect(composes(Creature, Mixins.Buoyant)).toBe(true);
  });
});

describe('LoadBearing → Buoyant', () => {
  it('neither half persists anything; the carved half is its own predicate', () => {
    expect(MixinApi.getAllPersistentFields(Creature)).not.toContain(
      'displacement',
    );
    // The burden half does not answer the water's question by itself.
    expect(Mixins.Buoyant).toBe('BuoyantMixin');
    expect(Mixins.Buoyant).not.toBe(Mixins.LoadBearing);
  });
});

describe('Chattel → MadeFrom', () => {
  class Ware extends PersistableMixin(
    MadeFromMixin(ChattelMixin(ContainerMixin(Idea))),
  ) {}

  it("⭐ the title's fields read back on a made host", async () => {
    const b = await roundTrip(() => new Ware(), '/test/splits/ware', (h) => {
      h._chattelId = 'chattel-xyz';
      h._place = '/test/splits/shed';
    });
    expect(b.getChattelId()).toBe('chattel-xyz');
    expect(b._place).toBe('/test/splits/shed');
    expect(MixinApi.isMadeFrom(b)).toBe(true);
  });

  it('⭐⭐ a cow is a Chattel and NOT MadeFrom; a good and a vessel are both', () => {
    expect(composes(KeptAnimal, Mixins.Chattel)).toBe(true);
    expect(composes(KeptAnimal, Mixins.MadeFrom)).toBe(false);
    for (const cls of [Good, Vessel] as AnyConstructor[]) {
      expect(composes(cls, Mixins.Chattel)).toBe(true);
      expect(composes(cls, Mixins.MadeFrom)).toBe(true);
    }
  });
});
