/**
 * ⚠⚠ **The Journey cannot tell which factory made a Route** (AC15n).
 *
 * A scheduled service's route is authored; a haulage gig's, and any
 * on-demand trip's, is computed per request — and they are the same
 * shape. Today the realm has two corridors and the path is unique, so it
 * does not bite; if `Route` baked in *authored*, on-demand service would
 * become unrepresentable later and expensive to retrofit.
 *
 * The second claim is the one that matters for G2: **express versus
 * local is one lane with two stop sets**, so a stop set narrows an
 * otherwise identical route and costs a second YAML file rather than a
 * second lane.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import LaneCatalogue from '../idea/LaneCatalogue';
import { Route } from '../lib/journey/Route';
import { corridor, installModes, installRooms, installRows } from './transport-fixtures';

const catalogue = (): LaneCatalogue => makeStuff(() => new LaneCatalogue());
const P = (i: number): string => `/test/road/${i}`;

beforeEach(() => {
  StuffApi.clearAll();
  installModes();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('Route', () => {
  it('⭐ an authored and a computed route over the same ends are EQUAL but for provenance', async () => {
    const c = corridor(4);
    installRooms(c.rooms);
    installRows(
      [{ key: 'road', mode: 'walk', seeds: [P(0)] }],
      [{ key: 'road-local', laneKey: 'road', nodes: [P(0), P(1), P(2), P(3)] }],
    );
    const cat = catalogue();

    const authored = (await cat.routeByKey('road-local'))!;
    const computed = (await cat.planRoute(P(0), P(3), 'road'))!;

    expect(computed.nodes).toEqual(authored.nodes);
    expect(computed.stops).toEqual(authored.stops);
    expect(computed.laneKey).toEqual(authored.laneKey);
    // The ONE difference, and nothing anywhere may branch on it.
    expect(authored.provenance).toBe('authored');
    expect(computed.provenance).toBe('computed');
  });

  it('⭐ express vs local is ONE LANE with two stop sets', async () => {
    const c = corridor(5);
    installRooms(c.rooms);
    installRows(
      [{ key: 'road', mode: 'walk', seeds: [P(0)] }],
      [
        { key: 'local', laneKey: 'road', nodes: [P(0), P(1), P(2), P(3), P(4)] },
        {
          key: 'express',
          laneKey: 'road',
          nodes: [P(0), P(1), P(2), P(3), P(4)],
          stops: [P(0), P(4)],
        },
      ],
    );
    const cat = catalogue();
    const local = (await cat.routeByKey('local'))!;
    const express = (await cat.routeByKey('express'))!;

    // Same ground, same lane, same legs travelled…
    expect(express.nodes).toEqual(local.nodes);
    expect(express.laneKey).toBe(local.laneKey);
    // …and a different set of places you may get off.
    expect(local.stops).toHaveLength(5);
    expect(express.stops).toEqual([P(0), P(4)]);
    // Which is what lets somebody at the middle watch traffic go by
    // without being able to board it.
    expect(express.isStop(P(2))).toBe(false);
    expect(local.isStop(P(2))).toBe(true);
  });

  it('a computed route carries the lane stop set, narrowed to what it passes', async () => {
    const c = corridor(5);
    installRooms(c.rooms);
    installRows([
      { key: 'road', mode: 'walk', seeds: [P(0)], stops: [P(0), P(2), P(4)] },
    ]);
    const route = (await catalogue().planRoute(P(0), P(3), 'road'))!;
    expect(route.nodes).toEqual([P(0), P(1), P(2), P(3)]);
    expect(route.stops).toEqual([P(0), P(2)]);
  });

  it('the legs are the beats — one per consecutive pair', () => {
    const r = Route.computed('road', [P(0), P(1), P(2)], [P(0), P(2)]);
    expect(r.legs()).toEqual([
      [P(0), P(1)],
      [P(1), P(2)],
    ]);
    expect(r.origin()).toBe(P(0));
    expect(r.destination()).toBe(P(2));
    expect(r.legsFrom(0)).toBe(2);
    expect(r.legsFrom(1)).toBe(1);
    expect(r.legsFrom(2)).toBe(0);
  });

  it('a route to nowhere is null rather than an empty trip', async () => {
    const c = corridor(3);
    installRooms(c.rooms);
    installRows([{ key: 'road', mode: 'walk', seeds: [P(0)] }]);
    expect(await catalogue().planRoute(P(0), '/test/elsewhere', 'road'))
      .toBeNull();
    expect(await catalogue().planRoute(P(0), P(2), 'no-such-lane')).toBeNull();
  });

  it('⚠ mints nothing — a per-request route has no template row', async () => {
    const c = corridor(3);
    installRooms(c.rooms);
    installRows([{ key: 'road', mode: 'walk', seeds: [P(0)] }]);
    const cat = catalogue();
    // Warm first, so the count is about PLANNING and not about the load.
    await cat.planRoute(P(0), P(2), 'road');
    const before = StuffApi.getAllObjects().length;
    await cat.planRoute(P(0), P(2), 'road');
    await cat.planRoute(P(2), P(0), 'road');
    // A Route that were a Stuff would be unaddressable and un-editable —
    // exactly the anti-pattern `lint:census` exists to catch.
    expect(StuffApi.getAllObjects().length).toBe(before);
  });
});
