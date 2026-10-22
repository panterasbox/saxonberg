/**
 * MovingZone — the zone of a place that moves (river D38): one zone per
 * moving place, adopted through the zone's own `addLocation`, its identity
 * fixed while its geography follows the place along its frame.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import { Idea } from '../../stuff/Idea';
import { MovingZoneMixin } from '../MovingZone';
import { PositionedMixin } from '../../expanse/Positioned';
import { LineFrameMixin } from '../../expanse/LineFrame';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { EvictionContext } from '../../stuff/Stuff';

class TestFrame extends LineFrameMixin(Idea) {
  override lengthKm(): number {
    return 20;
  }
  override elevationAtKm(km: number): number {
    return 100 + km * 10;
  }
  override localityAddressAt(km: number): string {
    return km > 10 ? 'realm/upriver' : 'realm/downriver';
  }
  override climateSiteAt(km: number) {
    return { latitude: 40 + km, continentality: 0.5, climateOffsetK: 0 };
  }
}

class TestZone extends MovingZoneMixin(CartesianZone) {}
class TestPlace extends PositionedMixin(Location) {}

const FRAME = '/test/river/frame';

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function setup() {
  makeStuffAtPath(() => new TestFrame(), FRAME);
  const zone = makeStuffAtPath(() => new TestZone(), '/test/river/patch/1') as TestZone;
  const place = makeStuff(() => new TestPlace()) as TestPlace;
  place.placeOnLine(FRAME, { course: 'test', km: 15, across: 4 });
  zone.adopt(place as never);
  return { zone, place };
}

describe('MovingZone (river D38)', () => {
  it('adopts its place through addLocation: the place is stamped by its own zone', () => {
    const { zone, place } = setup();
    expect(place.getZone()).toBe(zone);
    expect(zone.getPlace()).toBe(place);
  });

  it('answers the geography of where its place is NOW, and follows it', async () => {
    const { zone, place } = setup();
    expect(zone.getElevation()).toBe(250);
    expect(zone.getAddress()).toBe('realm/upriver');
    expect(await zone.lookupField<number>('elevation')).toBe(250);
    expect(zone.peekField<number>('latitude')).toBe(55);
    place.placeOnLine(FRAME, { course: 'test', km: 5, across: 4 });
    expect(zone.getElevation()).toBe(150);
    expect(zone.getAddress()).toBe('realm/downriver');
    // ⭐ The same object throughout: identity fixed, state derived.
    expect(place.getZone()).toBe(zone);
  });

  it('has no horizon of its own: a moving place sees by its frame', () => {
    const { zone } = setup();
    expect(zone.getHorizon()).toBeNull();
  });

  it('is kept while it holds its place', () => {
    const { zone } = setup();
    const veto = zone.canEvict({} as EvictionContext);
    expect(veto.ok).toBe(false);
  });

  it('a place off any frame falls back to the zone’s own fields', () => {
    const zone = makeStuffAtPath(() => new TestZone(), '/test/river/patch/2') as TestZone;
    zone.setElevation(42);
    const place = makeStuff(() => new TestPlace()) as TestPlace;
    zone.adopt(place as never);
    expect(zone.getElevation()).toBe(42);
  });
});

describe('Positioned: two frames, one record (river D18)', () => {
  it('refuses a line position while a chart position is set, and the reverse', () => {
    const place = makeStuff(() => new TestPlace()) as TestPlace;
    place.setExpansePosition({ latDeg: 42, lonDeg: -8 });
    expect(() => place.placeOnLine(FRAME, { course: 'test', km: 1, across: 1 })).toThrow(/never both/);
    place.setExpansePosition(null);
    place.placeOnLine(FRAME, { course: 'test', km: 1, across: 1 });
    expect(place.framePath()).toBe(FRAME);
    expect(() => place.setExpansePosition({ latDeg: 42, lonDeg: -8 })).toThrow(/never both/);
    place.placeOnLine(null, null);
    expect(place.getLine()).toBeNull();
  });
});
