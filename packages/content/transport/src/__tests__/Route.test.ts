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
    // ⚠ Built with `Route.computed` directly, which is what
    // `JourneyController` does now that routing is
    // `NavigationApi.routeBetween`'s: the Journey never cared who made
    // its Route, and AC15n of logistics says nothing downstream may
    // tell authored from computed.
    const computed = Route.computed('road', authored.nodes, authored.stops);

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

  it('carries exactly the stop set it is given, narrowed by its maker', async () => {
    // ⭐ The NARROWING moved, and this test moved with it. It used to
    // live inside `LaneCatalogue.planRoute`, which is retired;
    // `JourneyController` now intersects the lane's stops with the
    // plan's nodes and hands the result here. `Route`'s own contract
    // is what it was: it carries what it is given.
    const route = Route.computed('road', [P(0), P(1), P(2), P(3)], [P(0), P(2)]);
    expect(route.nodes).toEqual([P(0), P(1), P(2), P(3)]);
    expect(route.stops).toEqual([P(0), P(2)]);
    expect(route.isStop(P(1))).toBe(false);
  });

  /*
   * ⛔ "A route to nowhere is null rather than an empty trip" lived
   * here and is gone with `planRoute`. The question it asked is the
   * ROUTER's now and is answered better there: `routeBetween` names
   * WHY there is no way — `unknown-destination`, `no-way`, `budget`,
   * `graph-cold` — where this could only say `null`, and a caller
   * could not tell "I have never heard of that place" from "I stopped
   * looking". See `NavigationLogic.routing.test.ts`.
   */

  it('⚠ mints nothing — a per-request route has no template row', async () => {
    const c = corridor(3);
    installRooms(c.rooms);
    installRows([{ key: 'road', mode: 'walk', seeds: [P(0)] }]);
    const before = StuffApi.getAllObjects().length;
    Route.computed('road', [P(0), P(1), P(2)], [P(0), P(2)]);
    Route.computed('road', [P(2), P(1), P(0)], [P(2), P(0)]);
    // A Route that were a Stuff would be unaddressable and un-editable —
    // exactly the anti-pattern `lint:census` exists to catch.
    expect(StuffApi.getAllObjects().length).toBe(before);
  });
});
