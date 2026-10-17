/**
 * ⭐⭐ The milker's HAND is on what they drew (dairy D11): who drew it, by
 * the identity path the harm ledger keys on, and — when the hands have
 * gone unwashed — what came off them, into the milk and onto a pail that
 * can carry a surface load.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducingMixin } from '../Producing';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../platform/idea/species/Species';
import type { TapSpec } from '../../../platform/idea/species/Species';
import Material from '../../material/Material';
import Good from '../../stuff/Good';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ThermalMixin } from '../../thermal/Thermal';
import { ContaminableMixin, Contamination } from '../../material/Contaminable';
import UnboundedReceptacle from '../../../platform/thing/UnboundedReceptacle';
import CraftVessel from '../../../platform/thing/CraftVessel';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
const HOUR = 3600;
const SPECIES_PATH = '/stuff/idea/species/_test/pour-cow';
const MILK = '/stuff/idea/material/_test/pour-milk';

const TAPS: TapSpec[] = [
  {
    key: 'milk',
    yieldRow: MILK,
    perGameDay: 20,
    behaviour: 'expire',
    windowDays: 1,
    yieldShape: 'volume',
  },
];

class Cow extends ProducingMixin(Creature) {}
class PlainPail extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'PourTakePlainPail';
}
class FoodPail extends ContaminableMixin(ThermalMixin(BulkableMixin(Good))) {
  static _mixinName = 'PourTakeFoodPail';
}

function pail<T extends PlainPail | FoodPail>(make: () => T): T {
  const v = makeStuff(make);
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(20, 'L'));
  (v as unknown as { closure: string }).closure = 'liquidTight';
  return v;
}

describe('the hand on the milk', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;
  const advance = (s: number): void => {
    clock.mockReturnValue(Quantity.of(base + s, 's'));
  };

  const cow = (): Cow => {
    const c = makeStuff(() => {
      const x = new Cow();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES_PATH;
      return x;
    });
    const current = c.getReserve('flesh')!.current.rawValue();
    c.adjustReserve('flesh', Quantity.of(55 - current, '%'));
    c.reconcileProduction();
    return c;
  };
  let seq = 0;
  // ⚠ At a path, so the milker HAS an identity (`getIdentityPath` falls
  // back to the template path; a bare test Creature has neither).
  const milker = (): Creature =>
    makeStuffAtPath(() => new Creature(), `/platform/agent/Avatar/_milker-${++seq}`) as Creature;

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    makeStuffAtPath(() => {
      const s = new Species();
      s.setProduction(TAPS);
      return s;
    }, SPECIES_PATH);
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('milk');
      m.setDensity(Quantity.of(1030, 'kg/m³'));
      return m;
    }, MILK);
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    vi.spyOn(StuffApi, 'clone').mockImplementation(
      async () =>
        makeStuff(() => {
          const r = new UnboundedReceptacle();
          (r as unknown as { interiorBulk: boolean }).interiorBulk = true;
          return r;
        }) as never,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('the slot names the milker by identity path', async () => {
    const c = cow();
    const who = milker();
    who.scrub();
    advance(0.5 * DAY);
    const p = pail(() => new PlainPail());
    await c.completeTap(who, 'milk', null, p, { key: 'milk' });
    expect(p.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
    expect(p.getBulkPayload('interior')?.maker).toBe(who.getIdentityPath());
  });

  it('clean hands put nothing in the milk', async () => {
    const c = cow();
    const who = milker();
    advance(0.5 * DAY);
    who.scrub();
    const p = pail(() => new FoodPail());
    await c.completeTap(who, 'milk', null, p, { key: 'milk' });
    const slot = BulkableApi.slotFor(p, undefined)!;
    expect(new Contamination(slot).loads()['e-coli'] ?? 0).toBe(0);
    expect(p.getPathogenLoad('e-coli')).toBe(0);
  });

  it('dirty hands put e-coli in the milk and on a food pail, scaled by the dirt', async () => {
    const c = cow();
    const who = milker();
    who.scrub();
    advance(12 * HOUR); // six game-hours is filthy; twelve is past it
    const p = pail(() => new FoodPail());
    // ⚠ Spied rather than read back: with no pathogen roster standing in a
    // unit test, the pail's own reconcile has no organism to grow. That the
    // surface IS dirtied is the seam; what it does next is Contaminable's.
    const onPail = vi.spyOn(p, 'contaminate');
    await c.completeTap(who, 'milk', null, p, { key: 'milk' });
    const slot = BulkableApi.slotFor(p, undefined)!;
    expect(new Contamination(slot).loads()['e-coli'] ?? 0).toBeGreaterThan(0);
    expect(onPail).toHaveBeenCalledWith('e-coli', expect.any(Number));
    const severity = onPail.mock.calls[0]![1] as number;
    expect(severity).toBeGreaterThan(0);
    expect(severity).toBeLessThanOrEqual(0.3);
  });

  it('a plain vessel carries no surface load — only the milk is dirtied', async () => {
    const c = cow();
    const who = milker();
    who.scrub();
    advance(12 * HOUR);
    const p = pail(() => new PlainPail());
    await c.completeTap(who, 'milk', null, p, { key: 'milk' });
    const slot = BulkableApi.slotFor(p, undefined)!;
    expect(new Contamination(slot).loads()['e-coli'] ?? 0).toBeGreaterThan(0);
  });

  it('⭐ a CraftVessel pail (the shipped pail since the dairy build) takes the milk', async () => {
    const c = cow();
    const who = milker();
    who.scrub();
    advance(0.5 * DAY);
    const p = makeStuff(() => {
      const v = new CraftVessel();
      (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
      v.setInteriorCapacity(Quantity.of(10, 'L'));
      return v;
    });
    const r = await c.completeTap(who, 'milk', null, p, { key: 'milk' });
    expect(r.self).not.toMatch(/on the floor/);
    expect(p.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
  });
});
