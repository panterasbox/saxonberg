/**
 * The sky in the light walk (envelope D1/D2/D4) — the leg that makes the
 * same street read two different ways at noon and at midnight with
 * nothing authored on the row.
 *
 * Three factors that know nothing about each other: the room's own noon
 * flux, `CelestialApi.skyFactorNow()`, and the weather's cloud dim.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VisionModality } from '../VisionModality';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import CartesianZone from '../../location/CartesianZone';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
import { StuffApi } from '../../../../api/stuff';
import { WorldClockApi } from '../../../../api/worldclock';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import { PerceptionApi } from '../../../../api/perception';
import { Light } from '../../../../lib/perception/Light';

const vision = (): VisionModality =>
  PerceptionApi.modalityByName('vision') as VisionModality;

class AmbientCartesianLocation extends AmbientLitMixin(CartesianLocation) {}

const DAY = 86_400;
const SCALE = 12; // the shipped clock scale: a game hour per 5 real minutes

/**
 * Park the world clock at game-second `t`. `getNow()` is
 * provider-ms / 1000 × scale after a reset from a zero anchor, so the
 * provider value for a game second is `t / scale × 1000`.
 */
function atGameSecond(t: number): void {
  WorldClockApi._setNowProviderForTesting(() => (t / SCALE) * 1000);
}

/**
 * A 3 m Terminus-sized cell that follows the sun. `ambientSource` is
 * bracket-assigned exactly as the Hydrator's Phase-2 dispatch assigns
 * it from a row's `data:` — there is deliberately no runtime setter,
 * because nothing in the game ever changes what a room's light source
 * IS at runtime.
 */
function skyLitCell(): AmbientCartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const loc = makeStuff(() => new AmbientCartesianLocation());
  zone.addLocation(loc, 0, 0, 0);
  (loc as unknown as Record<string, unknown>).ambientSource = 'sky';
  return loc;
}

describe('the sky leg', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('⭐ a sky-lit room reads BRIGHT at noon and PITCH-BLACK at a moonless midnight, with nothing authored', () => {
    const loc = skyLitCell();
    expect(loc.getAmbientFlux().rawValue()).toBe(0); // no row value at all

    atGameSecond(DAY / 2); // equinox noon
    const noon = vision().bandAt(loc);

    atGameSecond(0); // midnight on day 0 — a new moon, by construction
    const midnight = vision().bandAt(loc);

    expect(noon).toBe('bright');
    expect(midnight).toBe('pitch-black');
  });

  it('is DERIVED per room size: a big yard and a small closet both read the noon dial', () => {
    const big = skyLitCell();
    const small = makeStuff(() => new AmbientCartesianLocation());
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    zone.addLocation(small, 0, 0, 0);
    (small as unknown as Record<string, unknown>).ambientSource = 'sky';

    atGameSecond(DAY / 2);
    // ⭐ The flux differs by 9× (their areas), the LUX does not — which
    // is the whole reason an unauthored room is lit correctly.
    expect(vision().bandAt(big)).toBe(vision().bandAt(small));
    expect(vision().lightAt(big).intensity.rawValue()).toBeCloseTo(
      vision().lightAt(small).intensity.rawValue(),
      6,
    );
  });

  it('an authored ambientIntensity is a CALIBRATION the sky still moves', () => {
    const loc = skyLitCell();
    loc.setAmbientFlux(180); // 20 lux at noon on 9 m² — a gloomy alley

    atGameSecond(DAY / 2);
    const noon = vision().lightAt(loc).intensity.rawValue();
    atGameSecond(0);
    const midnight = vision().lightAt(loc).intensity.rawValue();

    expect(noon).toBeLessThan(20); // the calibration held, not the 80 dial
    expect(noon).toBeGreaterThan(midnight * 10);
  });

  it('cloud and sun multiply, and neither knows about the other', () => {
    const loc = skyLitCell();
    atGameSecond(DAY / 2);
    const clear = vision().lightAt(loc).intensity.rawValue();
    loc.setWeatherDimFactor(0.4);
    const overcast = vision().lightAt(loc).intensity.rawValue();
    expect(overcast).toBeCloseTo(clear * 0.4, 6);
  });

  it('a room that is NOT sky-lit ignores the sun entirely — its light is its own', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(3);
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    (loc as unknown as Record<string, unknown>).ambientSource = 'glow';
    loc.setAmbientFlux(360); // 40 lux on 9 m²

    atGameSecond(DAY / 2);
    const noon = vision().lightAt(loc).intensity.rawValue();
    atGameSecond(0);
    const midnight = vision().lightAt(loc).intensity.rawValue();
    expect(noon).toBe(40);
    expect(midnight).toBe(40);
  });

  it('⭐⭐ SPILL: an enclosed room with a doorless opening onto the sky is lit by day and dark by night', async () => {
    // The mechanism NINETEEN shipped rows depend on after the W6 content
    // pass. A shop floor, a works floor, a barn — none of them authors a
    // light any more. Their doorway stands open onto a yard or a street,
    // and the light walk carries daylight one hop at full strength. The
    // payoff is that they are correctly lit at noon and correctly DARK at
    // night, at the cost of no authored number at all.
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(3);
    const yard = makeStuff(() => new AmbientCartesianLocation());
    const shop = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(yard, 0, 1, 0);
    zone.addLocation(shop, 0, 0, 0);
    (yard as unknown as Record<string, unknown>).ambientSource = 'sky';
    // The shop authors NOTHING: no source, no intensity. Exits are
    // explicit here as everywhere — the doorway is declared, doorless.
    await shop.addBidirectionalExit(yard, 'north');

    atGameSecond(DAY / 2);
    expect(vision().bandAt(shop)).not.toBe('pitch-black');
    expect(
      Light.compareBand(vision().bandAt(shop), 'dim'),
    ).toBeGreaterThanOrEqual(0);

    atGameSecond(0); // a moonless midnight
    expect(vision().bandAt(shop)).toBe('pitch-black');
  });

  it('⭐⭐ a lantern IN SOMEBODY\'S HAND lights the room', async () => {
    // ⚠ It did not. The walk's contents leg sees the ROOM's contents,
    // and a carried lamp is in the CARRIER's — so a player could light
    // a lantern, stand in the pitch dark, and have the street read
    // exactly as black as before. Acceptance 4 is *"a player who
    // lights a lantern can work by it"*, and it was false until the
    // drive read `analyze light` before and after and got the same
    // number twice.
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(3);
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    expect(vision().bandAt(room)).toBe('pitch-black');

    const { ContainerMixin } = await import('../../../../lib/spatial/Container');
    const { ContainableMixin } = await import(
      '../../../../lib/spatial/Containable'
    );
    const { LightSourceMixin } = await import(
      '../../../../lib/perception/LightSource'
    );
    const Thing = (await import('../../../../lib/stuff/Thing')).default;
    class Person extends ContainerMixin(ContainableMixin(Thing)) {}
    class Lantern extends LightSourceMixin(ContainableMixin(Thing)) {}
    const { ContainmentApi } = await import('../../../../api/containment');

    const alice = makeStuff(() => new Person());
    ContainmentApi.move(alice as never, room as never);
    expect(vision().bandAt(room)).toBe('pitch-black'); // a person is not a light

    const lamp = makeStuff(() => new Lantern());
    lamp.setEmittedFlux(220);
    ContainmentApi.move(lamp as never, alice as never);
    // 220 lm over a 9 m² cell ≈ 24 lux: lit enough to work by.
    expect(vision().bandAt(room)).toBe('lit');
  });

  it('an enclosed room with no source is dark at every hour of the day', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(3);
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    for (let h = 0; h < 24; h++) {
      atGameSecond(h * 3600);
      expect(vision().bandAt(loc)).toBe('pitch-black');
    }
  });
});
