/**
 * Snow on the ground (climate build W5, D6) — a sky-exposed floor reads
 * the snow lying on it from the weather its place has had, through the
 * kernel's one snow function.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Floor from '../../../platform/thing/Floor';
import CartesianLocation from '../../location/CartesianLocation';
import Biome from '../../biome/Biome';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import { Zone } from '../../zone/Zone';
import { Stuff } from '../../stuff/Stuff';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import { WeatherApi } from '../../../api/weather';
import { WorldClockApi } from '../../../api/worldclock';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
  EXIT_KIND_TEST_ROWS,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { MarkupAugmenter } from '../../../api/mml';
import '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
type Doc = Record<string, unknown> & { path: string; class: string; data: Record<string, unknown> };

let rows: Doc[] = [];
function installStore(): void {
  const all = [...(EXIT_KIND_TEST_ROWS as unknown as Doc[]), ...rows].map((d, i) => ({
    ...d,
    _id: String(i + 1),
  }));
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async () => '1'),
    find: vi.fn(async (c: string, q: Record<string, unknown>) =>
      c !== Collections.Content
        ? []
        : typeof q.path === 'string'
          ? all.filter((d) => d.path === q.path)
          : all.slice(),
    ),
  } as unknown as PersistenceManager);
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

let seq = 0;
async function floorAt(
  levers: { latitude: number; continentality?: number; elevation?: number; offsetK?: number },
  sky = true,
): Promise<{ room: CartesianLocation; floor: Floor }> {
  seq += 1;
  const zonePath = `/test/zone-${seq}`;
  rows.push({ path: zonePath, class: '/platform/idea/location/CartesianZone', data: {} });
  installStore();
  const zone = await StuffApi.singleton<Zone>(zonePath);
  zone.setLatitude(levers.latitude);
  zone.setContinentality(levers.continentality ?? 0.5);
  zone.setElevation(levers.elevation ?? 0);
  zone.setClimateOffsetK(levers.offsetK ?? 0);
  const biome = makeStuffAtPath(() => {
    const b = sky ? new SkyExposedBiome() : new Biome();
    b.setExtendsBiomePath('/stuff/idea/biome/universe');
    return b;
  }, `/test/biome-${seq}`) as Biome;
  const room = makeStuff(() => new CartesianLocation());
  Stuff._stampZone(room, zone as never);
  room.setBiome(biome);
  const floor = makeStuff(() => new Floor());
  room.addFixture(floor, 'floor');
  return { room, floor };
}

async function settle(room: CartesianLocation): Promise<void> {
  await room.resolveClimateSite();
  await room.resolveWeatherLocality();
}

let now = 0;
function setDay(day: number, hour = 12): void {
  now = day * DAY + hour * 3600;
}

const CIRCLE = { latitude: -66, continentality: 1, elevation: 900, offsetK: -7 };
const ICECAP = { latitude: 89, continentality: 1, elevation: 4000, offsetK: -20 };

beforeEach(() => {
  rows = [];
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  BiomeApi.invalidateRootBiomeCache();
  installRootBiome();
  WorldClockApi._resetForTesting();
  now = 0;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  WeatherApi._forceTypeForTesting('snow');
});

afterEach(() => {
  WeatherApi._resetForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
  BiomeApi.invalidateRootBiomeCache();
});

describe('snow lies on a sky-exposed floor', () => {
  it('deepens day on day where the cold is days old (the Circle)', async () => {
    const { room, floor } = await floorAt(CIRCLE);
    setDay(720);
    await settle(room);
    const d0 = floor.getSnowDepthM();
    setDay(721);
    const d1 = floor.getSnowDepthM();
    setDay(722);
    const d2 = floor.getSnowDepthM();
    expect(d0).toBeGreaterThan(0);
    expect(d1).toBeGreaterThan(d0);
    expect(d2).toBeGreaterThan(d1);
  });

  it('equals the kernel snow function at its place (one snow, AC 9)', async () => {
    const { room, floor } = await floorAt(CIRCLE);
    setDay(721);
    await settle(room);
    const kernel = WeatherApi.snowCoverAt(
      room.climateSite(),
      null,
      Quantity.of(now, 's'),
    );
    expect(floor.getSnowDepthM()).toBeCloseTo(kernel.depthM, 12);
  });

  it('the same floor indoors holds none', async () => {
    const { room, floor } = await floorAt(CIRCLE, false);
    setDay(721);
    await settle(room);
    expect(floor.getSnowDepthM()).toBe(0);
    expect(floor.getSnowBand()).toBe('none');
    expect(floor.snowPhrase()).toBeNull();
  });

  it('a warm place under the same sky holds none', async () => {
    const { room, floor } = await floorAt({ latitude: 0 });
    setDay(721);
    await settle(room);
    expect(floor.getSnowDepthM()).toBe(0);
  });

  it('a place that never thaws is deep and perennial, and the ground is masked', async () => {
    const { room, floor } = await floorAt(ICECAP);
    setDay(720);
    await settle(room);
    expect(floor.isSnowPerennial()).toBe(true);
    expect(floor.getSnowBand()).toBe('deep');
    expect(floor.snowPhrase()).toMatch(/deep here.*not gone in years/);

    const augmenters = (Floor as unknown as { markupAugmenters: MarkupAugmenter[] })
      .markupAugmenters;
    let text = 'A floor.';
    for (const aug of augmenters) text = aug(text, floor, floor);
    // The ground sentence ("It is …") is masked; the snow sentence is said.
    expect(text).not.toMatch(/\bIt is\b/);
    expect(text).toMatch(/Snow lies deep/);
  });

  it('⚠ an unresolved place reads 0 and is NOT memoised as bare', async () => {
    const { room, floor } = await floorAt(CIRCLE);
    setDay(721);
    // No settle: the site memo has not landed.
    expect(room.isClimateSiteResolved()).toBe(false);
    expect(floor.getSnowDepthM()).toBe(0);
    await settle(room);
    // Same segment — and still the real answer, because the zero was
    // never written to the memo.
    expect(floor.getSnowDepthM()).toBeGreaterThan(0);
  });

});
