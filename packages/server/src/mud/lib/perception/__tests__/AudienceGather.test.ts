/**
 * AudienceGather — the discrete-event outward sound walk.
 *
 * Fixtures mirror `SoundModality.test.ts`: CartesianZone + Location grid
 * with `addBidirectionalExit` (doorless / doored). Sensors are bare
 * `SensorMixin` ears — the gather is threshold-free and does no modality
 * gating (that is the Scene caller's), so no BodyPlan is needed.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudienceGather } from '../AudienceGather';
import { MAX_HOPS } from '../Modality';
import { Sound } from '../Sound';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../obj/location/CartesianZone';
import Door from '../../../obj/Door';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Ear extends SensorMixin(ContainableMixin(Idea)) {}

function room(zone: CartesianZone, x: number, y: number): CartesianLocation {
  const loc = makeStuff(() => new CartesianLocation());
  zone.addLocation(loc, x, y, 0);
  return loc;
}

function earIn(loc: CartesianLocation): Ear {
  const e = makeStuff(() => new Ear());
  ContainmentApi.move(e, loc);
  return e;
}

describe('gatherAudience — outward push walk', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('delivers to same-room and adjacent (doorless) sensors', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    await a.addBidirectionalExit(b, 'north');
    const earA = earIn(a);
    const earB = earIn(b);

    const arrivals = AudienceGather.gather(a, 100);
    const byId = new Map(arrivals.map((x) => [x.sensor.stuffId, x]));

    // same room: full level, no direction.
    expect(byId.get(earA.stuffId)?.db).toBeCloseTo(100, 5);
    expect(byId.get(earA.stuffId)?.direction).toBeNull();
    // adjacent: attenuated, directional.
    const arrB = byId.get(earB.stuffId);
    expect(arrB).toBeDefined();
    expect(arrB!.db).toBeLessThan(100);
    expect(arrB!.direction).toBe('north');
  });

  it('attenuation grows with each hop', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    const c = room(zone, 0, 2);
    await a.addBidirectionalExit(b, 'north');
    await b.addBidirectionalExit(c, 'north');
    const earA = earIn(a);
    const earB = earIn(b);
    const earC = earIn(c);

    const byId = new Map(
      AudienceGather.gather(a, 120).map((x) => [x.sensor.stuffId, x.db]),
    );
    const dA = byId.get(earA.stuffId)!;
    const dB = byId.get(earB.stuffId)!;
    const dC = byId.get(earC.stuffId)!;
    expect(dA).toBeGreaterThan(dB);
    expect(dB).toBeGreaterThan(dC);
  });

  it('a closed door blocks; open / doorless passes', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    door.setOpen(false);
    await a.addBidirectionalExit(b, 'north', { door });
    const earA = earIn(a);
    const earB = earIn(b);

    const closed = AudienceGather.gather(a, 100).map((x) => x.sensor.stuffId);
    expect(closed).toContain(earA.stuffId);
    expect(closed).not.toContain(earB.stuffId);

    door.open();
    const open = AudienceGather.gather(a, 100).map((x) => x.sensor.stuffId);
    expect(open).toContain(earA.stuffId);
    expect(open).toContain(earB.stuffId);
  });

  it('a louder source reaches farther (above threshold)', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    await a.addBidirectionalExit(b, 'north');
    const earB = earIn(b);
    const threshold = Sound.DEFAULT_HEARING_THRESHOLD_DB;

    // A quiet 25 dB source is below threshold after one hop.
    const quiet = AudienceGather.gather(a, 25).find(
      (x) => x.sensor.stuffId === earB.stuffId,
    );
    expect(quiet!.db).toBeLessThan(threshold);
    // A louder 45 dB source clears it at the same distance.
    const loud = AudienceGather.gather(a, 45).find(
      (x) => x.sensor.stuffId === earB.stuffId,
    );
    expect(loud!.db).toBeGreaterThanOrEqual(threshold);
  });

  it('MAX_HOPS caps the walk depth', async () => {
    expect(MAX_HOPS).toBe(2);
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = room(zone, 0, 0);
    const b = room(zone, 0, 1);
    const c = room(zone, 0, 2);
    const d = room(zone, 0, 3);
    await a.addBidirectionalExit(b, 'north');
    await b.addBidirectionalExit(c, 'north');
    await c.addBidirectionalExit(d, 'north');
    const earC = earIn(c); // depth 2 — reached
    const earD = earIn(d); // depth 3 — past the cap

    const ids = AudienceGather.gather(a, 200).map((x) => x.sensor.stuffId);
    expect(ids).toContain(earC.stuffId);
    expect(ids).not.toContain(earD.stuffId);
  });
});
