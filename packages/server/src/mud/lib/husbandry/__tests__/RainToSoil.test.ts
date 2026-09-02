/**
 * The rain edge (watershed W1) — **precipitation reaches the ground it
 * falls on**, at the cheapest scale the build has: a garden bed.
 *
 * `mm × m² = litres`, with the millimetres from the exact precipitation
 * integral and the square metres from the bed's authored land
 * requirement. Two things are actually at stake here and both get their
 * own tests:
 *
 *  1. **Drought becomes possible.** Before this edge, soil moisture only
 *     ever went down (drain) or up by hand (`water`). The sky is the
 *     first thing that fills a bed nobody is standing next to.
 *  2. ⚠⚠ **An unresolved sky ref reads UNKNOWN, never ZERO.** The
 *     covering locality resolves asynchronously and the reconcile is
 *     synchronous, so there is a window in which the ground does not
 *     know where it is. The rain edge carries its **own checkpoint**
 *     through that window: the stamp does not advance while unresolved,
 *     so the first successful resolve integrates the whole backlog.
 *     These tests are written unresolved-path FIRST, because a test that
 *     hand-constructs the resolved value never exercises the path that
 *     fails.
 *
 * See docs/subsystems/watershed.md.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import GardenBed from '../../../platform/thing/GardenBed';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import Biome from '../../biome/Biome';
import { AtmosphericMixin } from '../../biome/Atmospheric';
import Location from '../../stuff/Location';
import { Reserve } from '../../reserve';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
} from '../Cultivable';
import { Quantity } from '../../quantity';
import { WeatherApi } from '../../../api/weather';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

class AirRoom extends AtmosphericMixin(Location) {}

const DAY = 86_400;
const BASE = 30_000_000;
let now = BASE;
/**
 * Advance the clock by `gameSeconds`. The test now-provider is a
 * **real-millisecond** source and the scale is 1000, so one real
 * millisecond is one game second — the shape the GardenBed suite uses.
 */
const setNow = (gameSeconds: number): void => {
  now = BASE + gameSeconds;
};

/** Game-seconds now, read from the clock rather than assumed. */
const clock = (): number => WorldClockApi.getNow().rawValue();

/** The liquid millimetres the sky delivered between two game-times. */
const fellMm = (t0: number, t1: number): number =>
  WeatherApi.precipitationBetween(
    Quantity.of(t0, 's'),
    Quantity.of(t1, 's'),
    null,
  ).liquid.rawValue();

let seq = 0;

/** A bed of `areaM2` productive ground with a `water`-litre reserve. */
function makeBed(areaM2: number, water = 200): GardenBed {
  seq += 1;
  return makeStuffAtPath(() => {
    const bed = new GardenBed();
    bed.setShortDescription('a raised garden bed');
    bed.setMass(Quantity.of(340, 'kg'));
    bed.interiorBulk = true;
    bed.setInteriorCapacity(Quantity.of(200, 'L'));
    bed.setInteriorAmount(Quantity.of(200, 'L'));
    bed.setLandRequirementM2(areaM2);
    bed.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 4 },
    ]);
    bed.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(water, 'L'), // capacity
        Quantity.of(0, 'L'), // starts EMPTY: the sky is what fills it

        'cultivation',
        'wilting',
      ),
    );
    return bed;
  }, `/test/water/bed-${seq}`) as GardenBed;
}

/** A room under open sky (`open`) or under a roof. */
function makeRoom(open: boolean): AirRoom {
  seq += 1;
  const biome = makeStuffAtPath(
    () => (open ? new SkyExposedBiome() : new Biome()),
    `/test/water/biome-${seq}`,
  ) as Biome;
  return makeStuff(() => {
    const room = new AirRoom();
    room.setBiome(biome);
    return room;
  }) as AirRoom;
}

/** Moisture litres currently in the bed. */
function litres(bed: GardenBed): number {
  return bed.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue();
}

beforeEach(() => {
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
});

// NO StuffApi.clearAll() — it wipes the WorldClockRegistry out of the
// byTemplatePath index and every reconcile silently no-ops thereafter
// (the GardenBed suite's note, and it applies verbatim here).
afterEach(() => {
  WeatherApi._forceTypeForTesting(null);
  WorldClockApi._resetForTesting();
});

describe('the rain edge — ⚠⚠ unresolved reads UNKNOWN, never zero', () => {
  it('a bed that has not resolved its sky reports null litres, not 0', async () => {
    const bed = makeBed(4);
    // Deliberately never placed, so the resolve has nowhere to look.
    expect(bed.isWatershedResolved()).toBe(false);
    expect(bed.rainfallAbsorbedLitres()).toBeNull();
    await bed.restampWatershed();
    // Still unresolved: an unplaced bed has no sky, and resolving it to
    // "nothing" here would swallow the rain it catches once put down.
    expect(bed.isWatershedResolved()).toBe(false);
  });

  it('holds its checkpoint while unresolved, then back-fills the WHOLE absence', async () => {
    WeatherApi._forceTypeForTesting('rain');
    const bed = makeBed(4);
    const room = makeRoom(true);
    await ContainmentApi.move(bed, room);
    await bed.restampWatershed();

    // Open the window, then force the ref back to unresolved — the state
    // a fresh clone, or a restore into a room it never "moved" into, is
    // genuinely in. (Direct field writes: there is no un-resolve method,
    // and inventing one would be production surface for a test.)
    bed.reconcileSoil();
    const opened = bed.rainClockStamp;
    expect(opened).toBeGreaterThan(0);
    bed._rainResolved = false;

    setNow(3 * DAY);
    bed.reconcileSoil();
    expect(bed.rainClockStamp).toBe(opened); // the stamp HELD
    expect(litres(bed)).toBe(0);
    expect(bed.rainfallAbsorbedLitres()).toBeNull(); // UNKNOWN, not dry

    // The kick the reconcile fired lands…
    await bed.restampWatershed();
    expect(bed.isWatershedResolved()).toBe(true);

    // …and the next read integrates every hour of the absence at once.
    const closed = clock();
    bed.reconcileSoil();
    const expected = fellMm(opened, closed) * 4;
    expect(expected).toBeGreaterThan(0);
    expect(litres(bed)).toBeCloseTo(expected, 6);
    expect(bed.rainfallAbsorbedLitres()).toBeCloseTo(expected, 6);
  });
});

describe('the rain edge — a bed fills from the sky', () => {
  it('a day of rain on 4 m² of open ground is mm × m² litres', async () => {
    WeatherApi._forceTypeForTesting('rain');
    const bed = makeBed(4);
    await ContainmentApi.move(bed, makeRoom(true));
    await bed.restampWatershed();
    bed.reconcileSoil(); // opens the window
    const opened = clock();

    setNow(DAY);
    const closed = clock();
    bed.reconcileSoil();

    const mm = fellMm(opened, closed);
    expect(mm).toBeGreaterThan(0);
    expect(litres(bed)).toBeCloseTo(mm * 4, 6);
  });

  it('replaying the same absence gives the same litres', async () => {
    WeatherApi._forceTypeForTesting('rain');
    const readings: number[] = [];
    for (let run = 0; run < 2; run++) {
      now = BASE;
      const bed = makeBed(4);
      await ContainmentApi.move(bed, makeRoom(true));
      await bed.restampWatershed();
      bed.reconcileSoil();
      setNow(2 * DAY + 5000);
      bed.reconcileSoil();
      readings.push(litres(bed));
    }
    expect(readings[0]).toBe(readings[1]);
  });

  it('a bed under a roof stays dry — sky exposure is the caller gate', async () => {
    WeatherApi._forceTypeForTesting('storm');
    const bed = makeBed(4);
    await ContainmentApi.move(bed, makeRoom(false));
    await bed.restampWatershed();
    expect(bed.isWatershedResolved()).toBe(true);
    bed.reconcileSoil();

    setNow(5 * DAY);
    bed.reconcileSoil();
    expect(litres(bed)).toBe(0);
    // Resolved-to-sheltered is an ANSWER: zero, and it says so.
    expect(bed.rainfallAbsorbedLitres()).toBe(0);
  });

  it('clear weather is dry ground — DROUGHT is now possible', async () => {
    WeatherApi._forceTypeForTesting('clear');
    const bed = makeBed(4);
    await ContainmentApi.move(bed, makeRoom(true));
    await bed.restampWatershed();
    bed.reconcileSoil();

    setNow(20 * DAY);
    bed.reconcileSoil();
    expect(litres(bed)).toBe(0);
    expect(bed.rainfallAbsorbedLitres()).toBe(0);
  });

  it('snow does NOT water the soil — the pack releases later, elsewhere', async () => {
    WeatherApi._forceTypeForTesting('snow');
    const bed = makeBed(4);
    await ContainmentApi.move(bed, makeRoom(true));
    await bed.restampWatershed();
    bed.reconcileSoil();

    setNow(4 * DAY);
    bed.reconcileSoil();
    expect(litres(bed)).toBe(0);
  });

  it('rain never overfills — it is capped by the reserve headroom', async () => {
    WeatherApi._forceTypeForTesting('storm');
    const bed = makeBed(40, 5); // huge catchment, tiny reserve
    await ContainmentApi.move(bed, makeRoom(true));
    await bed.restampWatershed();
    bed.reconcileSoil();

    setNow(10 * DAY);
    bed.reconcileSoil();
    expect(litres(bed)).toBe(5);
  });

  it('⭐ a POT catches nothing — it draws no land, and is watered by hand', async () => {
    WeatherApi._forceTypeForTesting('storm');
    const bed = makeBed(0); // landRequirementM2 = 0, the pot's default
    await ContainmentApi.move(bed, makeRoom(true));
    await bed.restampWatershed();
    bed.reconcileSoil();

    setNow(10 * DAY);
    bed.reconcileSoil();
    expect(litres(bed)).toBe(0);
  });
});
