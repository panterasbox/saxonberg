/**
 * ⭐⭐ The salt pan, end to end (ceramics S17, W8): a `SaltPan` — the kernel
 * `Mould` with the maturing mixin — standing ON a `Tub`. Sea water in dry
 * air loses its water to the evaporative `brine` window, which rescales the
 * dissolved salt; past saturation the phase engine's crystallize arm sets
 * the salt IN the pan (one crop, growing while the sun still works the
 * brine); when the pan is done the bittern left runs off into the tub.
 *
 * The rows' arithmetic is stood up here as synthetic rows of the same
 * shape (the shipped rows are pinned by `salt.test.ts`); `StuffApi.clone`
 * is stubbed for the crop, as the kernel mould tests do.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import MaturationProfile from '@saxonberg/server/mud/platform/idea/maturation/MaturationProfile';
import Location from '@saxonberg/server/mud/lib/location/Location';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import SaltPan from '../thing/SaltPan';
import Tub from '../thing/Tub';

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;

const BRINE = '/stuff/idea/saltpan-test/idea/material/brine';
const SALT = '/stuff/idea/saltpan-test/idea/material/salt';
const BITTERN = '/stuff/idea/saltpan-test/idea/material/bittern';
const PROFILE = '/stuff/idea/saltpan-test/idea/maturation/brine';
const CRYSTALS = '/stuff/thing/_saltpan/salt-crystals';

class Crystals extends Provision {}
let cloned: string[] = [];

function stand(): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('salt');
    m.setDensity(Quantity.of(2160, 'kg/m³'));
    return m;
  }, SALT);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('bittern');
    m.setTags(['liquid', 'bittern']);
    m.setDensity(Quantity.of(1250, 'kg/m³'));
    return m;
  }, BITTERN);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('brine');
    m.setTags(['liquid', 'saltpan-brine']);
    m.setDensity(Quantity.of(1025, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(3990, 'J/(kg·K)'));
    m.setSolidsKgPerL(0.035);
    m.setSolubility([[273, 0.316], [293, 0.317], [373, 0.329]]);
    m.setCrystallizesTo({ product: SALT, residue: BITTERN });
    return m;
  }, BRINE);
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('saltpan-brine');
    p.setInputCategory('saltpan-brine');
    p.setMechanism('evaporative');
    p.setStallBelowK(273);
    p.setHappyK(283);
    p.setDamageAboveK(400);
    p.setRatePerDay(0.25);
    p.setProductMaterial(BRINE);
    p.setProductFraction(0.03);
    return p;
  }, PROFILE);
  if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  }
}

function saltern(): { pan: SaltPan; tub: Tub; room: Location } {
  const room = makeStuff(() => {
    const r = new Location();
    r.setHumidity(Quantity.of(20, '%'));
    r.setWind(Quantity.of(6, 'm/s'));
    r.setTemperature(Quantity.of(300, 'K'));
    return r;
  });
  const tub = makeStuff(() => new Tub());
  tub.setStampedTemperatureK(300);
  tub.setLastAmbientK(300);
  ContainmentApi.move(tub as never, room as never);
  const pan = makeStuff(() => new SaltPan());
  pan.setCastTemplate(CRYSTALS);
  (pan as unknown as { interiorBulk: boolean }).interiorBulk = true;
  pan.setInteriorCapacity(Quantity.of(40, 'L'));
  pan.setClosure('liquidTight');
  pan.setStampedTemperatureK(300);
  pan.setLastAmbientK(300);
  ContainmentApi.move(pan as never, tub as never, 'on');
  return { pan, tub, room };
}

function crop(pan: SaltPan): number {
  return pan
    .getContents()
    .filter((c) => (c as Stuff).getTemplatePath() === CRYSTALS)
    .reduce((a, c) => a + (MixinApi.isTangible(c as Stuff) ? (c as unknown as Stuff & { getMass(): Quantity<'kg'> }).getMass().rawValue() : 0), 0);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  stand();
  cloned = [];
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    cloned.push(path);
    const c = makeStuff(() => new Crystals());
    stampTemplatePathForTest(c, path);
    return c;
  }) as unknown as typeof StuffApi.clone);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('⭐⭐ the salt pan on its tub', () => {
  it('is a mould AND a maturing vessel, and it drains into the tub it stands on', () => {
    const { pan, tub } = saltern();
    expect(MixinApi.isMould(pan as unknown as Stuff)).toBe(true);
    expect(MixinApi.isMaturing(pan as unknown as Stuff)).toBe(true);
    expect(pan.drainsInto()).toBe(tub);
  });

  it('⭐ sea water in dry air: salt crystals set IN the pan, and the bittern runs into the tub beneath', async () => {
    const { pan, tub } = saltern();
    const brine = StuffApi.findByTemplatePath<Material>(BRINE)!;
    pan.setBulkMaterial('interior', brine);
    pan.setBulkAmount('interior', Quantity.of(20, 'L'));
    pan.setBulkPayload('interior', { dissolvedSolidsKgPerL: 0.28 });
    expect(pan.getMaturationPhase()).toBe('active');

    // A day at a time, read the way a watched pan is read.
    for (let d = 1; d <= 30 && tub.getBulkAmount('interior').rawValue() <= 0; d++) {
      now = BASE + d * DAY;
      pan.getMaturationPhase();
      pan.getContents();
      await settle();
    }

    expect(cloned).toEqual([CRYSTALS]); // ONE crop, grown — never a second
    // 20 L × 0.28 kg/L = 5.6 kg of salt; the bittern keeps only what its
    // last few per cent of liquor can hold.
    expect(crop(pan)).toBeGreaterThan(4.5);
    expect(crop(pan)).toBeLessThan(5.6);
    expect(pan.getBulkAmount('interior').rawValue()).toBe(0);
    expect(tub.getBulkMaterial('interior')?.getTemplatePath()).toBe(BITTERN);
    expect(tub.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
  });
});
