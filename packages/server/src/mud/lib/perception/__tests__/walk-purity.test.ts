/**
 * ⭐⭐ The room's reading never writes (crowded-rooms D9).
 *
 * One place holds a thing for each read that used to write: a hoop of curd
 * past its set time (its wake not yet fired), a pan of water below freezing,
 * a loaf with liquid working through it, and a warm good cooling. The light
 * walk, the sound gather and the smell fold run over it; nothing they reach
 * may change — no field fire, no clone, no move, no destruct, and every
 * stamp the same afterward. The walks hold the world still
 * (`ExecutionContextApi.holdWorldStill`), and inside the hold every write
 * chokepoint THROWS in a test world, so a new walk-time write fails here.
 *
 * Scope: only what these walks reach (the plan's D9). A deliberate `look`
 * at a thing is not inside a hold and may still bring it current.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Location from '../../location/Location';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Syrup from '../../../platform/idea/material/Syrup';
import { MouldMixin } from '../../mould/Mould';
import { DurableMixin } from '../../material/Durable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../../thermal/Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { PercolatingMixin } from '../../material/Percolating';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import { ExecutionContextApi } from '../../../api/execution-context';
import { PerceptionApi } from '../../../api/perception';
import { WorldClockApi } from '../../../api/worldclock';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../platform/idea/EventRegistry';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import {
  makeStuff,
  makeStuffAtPath,
  seedKernelContentStore,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../modalities/__tests__/test-helpers';
import { WalkWriteError } from '../../security/errors';
import { Creature } from '../../creature/Creature';
import { installCorpseMintStub } from '../../mortality/__tests__/corpse-mint-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class PurityHoop extends MouldMixin(
  DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
) {
  static _mixinName = 'PurityHoop';
}
class PurityPan extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'PurityPan';
}
class PurityWarm extends ThermalMixin(Good) {
  static _mixinName = 'PurityWarm';
}
class PurityLoaf extends PercolatingMixin(Good) {
  static _mixinName = 'PurityLoaf';
}

const DAY = 86_400;
let now = 1_000_000;

function syrup(path: string, setup: (m: Syrup) => void): Syrup {
  const found = StuffApi.findByTemplatePath<Syrup>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Syrup();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    setup(m);
    return m;
  }, path) as unknown as Syrup;
}

function fill<T extends Stuff>(v: T, mat: Syrup, litres: number, tempK: number): T {
  const b = v as unknown as {
    interiorBulk: boolean;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Syrup): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
    setStampedTemperatureK(k: number): void;
    setLastAmbientK(k: number): void;
  };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(10, 'L'));
  b.setBulkMaterial('interior', mat);
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  b.setStampedTemperatureK(tempK);
  b.setLastAmbientK(tempK);
  return v;
}

/**
 * EVERY persistent field of a thing, generically (crowded-rooms D15): the
 * `fieldMeta` of every class in its chain, as a capture enumerates them —
 * never a hand list, so a body's respiration, wetness, faculty, hygiene and
 * soiling stamps are in it with its reserves, thermal stamps and conditions.
 */
function persistentSnapshot(t: Stuff): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = t as unknown as Record<string, unknown>;
  for (let ctor = (t as object).constructor as { fieldMeta?: Record<string, { persistent?: boolean }> } | null;
    ctor && ctor !== Object;
    ctor = Object.getPrototypeOf(ctor) as typeof ctor) {
    const meta = Object.prototype.hasOwnProperty.call(ctor, 'fieldMeta') ? ctor.fieldMeta : undefined;
    for (const [k, m] of Object.entries(meta ?? {})) {
      if (!m?.persistent || k in out) continue;
      try {
        out[k] = JSON.stringify(raw[k], (_key, v: unknown) =>
          v && typeof v === 'object' && 'stuffId' in (v as object) ? `#${(v as { stuffId: string }).stuffId}` : v,
        ) ?? 'undefined';
      } catch {
        out[k] = '<unserializable>';
      }
    }
  }
  return out;
}

/** Every field a read that wrote would have changed. */
function snapshot(things: Record<string, Stuff>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, t] of Object.entries(things)) {
    const raw = t as unknown as Record<string, unknown> & {
      getBulkAmount?: (a: 'interior') => Quantity<'L'>;
    };
    out[name] = {
      setProgress: raw['setProgress'],
      setStamp: raw['setStamp'],
      setDrainedKg: raw['setDrainedKg'],
      stampedTemperatureK: raw['stampedTemperatureK'],
      thermalClockStamp: raw['thermalClockStamp'],
      percolationReach: raw['percolationReach'],
      percolationStamp: raw['percolationStamp'],
      percolantL: raw['percolantL'],
      amount:
        typeof raw.getBulkAmount === 'function' && raw['interiorBulk']
          ? raw.getBulkAmount('interior').rawValue()
          : null,
      container: (t as unknown as { getContainer?: () => Stuff | null }).getContainer?.()?.stuffId ?? null,
    };
  }
  return out;
}

describe('⭐⭐ the room’s reading never writes (crowded-rooms D9)', () => {
  beforeEach(async () => {
    seedKernelContentStore();
    installV1QuantityMarshallers();
    installCorpseMintStub();
    buildAllModalities();
    const events = await StuffApi.create(() => new EventRegistry());
    stampTemplatePathForTest(events, '/platform/idea/EventRegistry');
    EventApi._setRegistryForTesting(events);
    WorldClockApi._resetForTesting();
    now = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(async () => {
    // A move's Thermal restamp is async: let it land before the registry goes.
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('the light walk, the sound gather and the smell fold change nothing they reach', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(4);
    const place = makeStuff(() => new Location());
    zone.addLocation(place, 0, 0, 0);

    const cheese = syrup('/stuff/idea/material/_purity/cheese', () => {});
    const curd = syrup('/stuff/idea/material/_purity/curd', (m) => {
      m.setNutrientAmounts({ fat: 60000, protein: 60000, water: 800000 });
      m.setDrainSetting({ days: 0.5, becomes: cheese.getTemplatePath()!, moisture: { unloaded: 0.8, loaded: 0.55 }, loadRef: 2 });
    });
    const water = syrup('/stuff/idea/material/_purity/water', (m) => {
      (m as unknown as { meltingPoint: Quantity<'K'> }).meltingPoint = Quantity.of(273, 'K');
      (m as unknown as { latentHeatOfFusion: Quantity<'J/kg'> }).latentHeatOfFusion = Quantity.of(334_000, 'J/kg');
    });

    const hoop = makeStuff(() => new PurityHoop());
    hoop.setCastTemplate('/stuff/thing/_purity/wheel');
    fill(hoop, curd, 2, 290);
    ContainmentApi.move(hoop, place);
    const pan = fill(makeStuff(() => new PurityPan()), water, 3, 290);
    pan.setLastAmbientK(250); // a winter street: it would freeze if anything read it to now
    ContainmentApi.move(pan, place);
    const warm = makeStuff(() => new PurityWarm());
    (warm as unknown as { setStampedTemperatureK(k: number): void }).setStampedTemperatureK(360);
    ContainmentApi.move(warm, place);
    const loaf = makeStuff(() => new PurityLoaf());
    loaf.receivePercolant(2);
    ContainmentApi.move(loaf, place);
    // ⭐ A body (D15): fed, with an open wound, its clocks seeded.
    const person = makeStuff(() => new Creature());
    person.setLifecycleState('alive');
    person.afflict({ kind: 'trauma', type: 'laceration', site: 'body.arm.left', severity: 3, dressed: false });
    person.getVitalSign('bloodVolume');
    person.getReserve('flesh');
    ContainmentApi.move(person, place);

    // Let time pass with no wake firing: the hoop is a day past its set,
    // the loaf two days into its leach, the pan cooling toward the street.
    hoop.setWakeAtS(0);
    loaf.setPercolationWakeAtS(0);
    now += 1 * DAY;

    const things = { hoop, pan, warm, loaf } as Record<string, Stuff>;
    const before = snapshot(things);
    const bodyBefore = persistentSnapshot(person);
    const fires = vi.spyOn(MqlSubscriptionApi, 'fireFieldChange');
    const clones = vi.spyOn(StuffApi, 'clone');
    const moves = vi.spyOn(ContainmentApi, 'move');
    const destructs = vi.spyOn(StuffApi, 'destruct');

    const loc = place as unknown as Stuff & Container;
    for (const name of ['vision', 'sound', 'smell']) {
      // A write inside the hold throws WalkWriteError in a test world.
      expect(() => PerceptionApi.modalityByName(name).signalAt(loc), name).not.toThrow();
    }

    expect(fires).not.toHaveBeenCalled();
    expect(clones).not.toHaveBeenCalled();
    expect(moves).not.toHaveBeenCalled();
    expect(destructs).not.toHaveBeenCalled();
    expect(snapshot(things)).toEqual(before);
    expect(persistentSnapshot(person), 'a body in the room, field for field').toEqual(bodyBefore);
    expect(ExecutionContextApi.worldHeldStill, 'every walk released its hold').toBe(false);
  });

  it('the tripwire: a write inside a hold throws WalkWriteError in a test world, and nothing outside one', () => {
    const thing = makeStuff(() => new Good());
    const release = ExecutionContextApi.holdWorldStill('a test walk');
    try {
      expect(() => MqlSubscriptionApi.fireFieldChange(thing, 'name', 'a', 'b')).toThrow(WalkWriteError);
    } finally {
      release();
    }
    expect(() => MqlSubscriptionApi.fireFieldChange(thing, 'name', 'a', 'b')).not.toThrow();
  });
});
