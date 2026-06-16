/**
 * AddressApi — the coverage index + the four-step resolve chain.
 *
 * Roster (templatePath deliberately diverges from the claimed address,
 * pinning namespace independence):
 *   /lib/address/narnia        claims 'narnia'        (root Region)
 *   /lib/address/cair-paravel  claims 'narnia/castle' (nested Locality)
 *   /lib/address/lantern-waste claims 'narnia/wild'   (sibling)
 *
 * The test harness skips `postRegister`, so Localities are registered
 * explicitly through `AddressApi`. The module-level registry cache in
 * AddressLogic survives `StuffApi.clearAll`, so each test resets it.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../lib/stuff/Location';
import Locality from '../../lib/address/Locality';
import { Vessel } from '../../lib/stuff/Vessel';
import CartesianZone from '../../lib/location/CartesianZone';
import { AddressApi } from '../address';
import { ContainmentApi } from '../containment';
import { StuffApi } from '../stuff';
import { Stuff } from '../../lib/stuff/Stuff';
import AddressRegistry from '../../obj/AddressRegistry';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';

class TestLocation extends Location {}

function installRegistry(): AddressRegistry {
  return makeStuffAtPath(() => new AddressRegistry(), '/obj/AddressRegistry');
}

function installLocality(
  path: string,
  name: string,
  address: string,
): Locality {
  const loc = makeStuffAtPath(() => {
    const l = new Locality();
    l.setName(name);
    l.setAddress(address);
    return l;
  }, path);
  AddressApi.registerLocality(loc);
  return loc;
}

function installRoster(): void {
  installLocality('/lib/address/narnia', 'Narnia', 'narnia');
  installLocality('/lib/address/cair-paravel', 'Cair Paravel', 'narnia/castle');
  installLocality('/lib/address/lantern-waste', 'Lantern Waste', 'narnia/wild');
}

describe('AddressApi — coverage index + resolve chain', () => {
  beforeEach(() => {
    AddressApi._resetRegistryRefForReload();
    installRegistry();
    installRoster();
  });

  afterEach(() => {
    StuffApi.clearAll();
    AddressApi._resetRegistryRefForReload();
  });

  // ── coverage index (longest-prefix) ──

  it('coveringLocalityOf resolves exact, deeper, and sibling addresses', () => {
    expect(AddressApi.coveringLocalityOf('narnia/castle')?.getName()).toBe(
      'Cair Paravel',
    );
    // deeper than any claimed prefix → longest (more-specific) wins
    expect(
      AddressApi.coveringLocalityOf('narnia/castle/closet')?.getName(),
    ).toBe('Cair Paravel');
    // no deeper prefix → falls back to the root Region
    expect(AddressApi.coveringLocalityOf('narnia/other/room')?.getName()).toBe(
      'Narnia',
    );
    expect(AddressApi.coveringLocalityOf('narnia/wild/glade')?.getName()).toBe(
      'Lantern Waste',
    );
  });

  it('coveringLocalityOf returns null outside the tree', () => {
    expect(AddressApi.coveringLocalityOf('elsewhere/void')).toBeNull();
  });

  it('findByAddress is exact-match, not nearest-ancestor', () => {
    expect(AddressApi.findByAddress('narnia/castle')?.getName()).toBe(
      'Cair Paravel',
    );
    expect(AddressApi.findByAddress('narnia/castle/closet')).toBeNull();
  });

  // ── namespace independence ──

  it('resolves through the address tree, ignoring templatePath and zone', async () => {
    const room = makeStuff(() => new TestLocation());
    // A templatePath and zone that have nothing to do with the address.
    stampTemplatePathForTest(room, '/domain/keep/great-hall');
    const zone = makeStuff(() => new CartesianZone());
    Stuff._stampZone(room, zone);
    room.setAddress('narnia/castle');

    const locality = await AddressApi.resolveLocalityFor(room);
    expect(locality?.getName()).toBe('Cair Paravel');
  });

  // ── declared ──

  it('resolves a declared address with source "declared"', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setAddress('narnia/castle');
    const r = await AddressApi.resolveFor(room);
    expect(r.locality?.getName()).toBe('Cair Paravel');
    expect(r.address).toBe('narnia/castle');
    expect(r.source).toBe('declared');
  });

  // ── containment-outward inheritance ──

  it('an un-addressed vessel inherits its room address (inherited-containment)', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setAddress('narnia/castle');
    const vessel = makeStuff(() => new Vessel());
    ContainmentApi.move(vessel, room);

    const r = await AddressApi.traceResolveFor(vessel);
    expect(r.locality?.getName()).toBe('Cair Paravel');
    expect(r.source).toBe('inherited-containment');
  });

  // ── zone-fallthrough inheritance ──

  it('an un-addressed room inherits its zone address (source "zone")', async () => {
    const zone = makeStuff(() => new CartesianZone());
    // Zone.lookupField reads the bare field key when no getter matches.
    (zone as unknown as Record<string, unknown>)['address'] = 'narnia';
    const room = makeStuff(() => new TestLocation());
    Stuff._stampZone(room, zone);

    const r = await AddressApi.resolveFor(room);
    expect(r.locality?.getName()).toBe('Narnia');
    expect(r.source).toBe('zone');
  });

  // ── no coverage → null, never throws ──

  it('returns null source "none" when no address is declared or inherited', async () => {
    const room = makeStuff(() => new TestLocation());
    const r = await AddressApi.resolveFor(room);
    expect(r.locality).toBeNull();
    expect(r.address).toBeNull();
    expect(r.source).toBe('none');
  });

  it('returns a null Locality (not a throw) for an address outside the tree', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setAddress('elsewhere/void');
    const r = await AddressApi.resolveFor(room);
    expect(r.locality).toBeNull();
    expect(r.address).toBe('elsewhere/void');
    expect(r.source).toBe('declared');
  });

  // ── trace coverage chain ──

  it('traceResolveFor reports the most-→least-specific coverage chain', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setAddress('narnia/castle/closet');
    const r = await AddressApi.traceResolveFor(room);
    expect(r.locality?.getName()).toBe('Cair Paravel');
    expect(r.coverageChain.map((c) => c.address)).toEqual([
      'narnia/castle',
      'narnia',
    ]);
  });

  // ── HMR / index mutation ──

  it('deregister removes a Locality from the index', () => {
    const loc = AddressApi.findByAddress('narnia/castle')!;
    expect(AddressApi.coveringLocalityOf('narnia/castle')?.getName()).toBe(
      'Cair Paravel',
    );
    AddressApi.deregisterLocality(loc);
    // The exact claim is gone…
    expect(AddressApi.findByAddress('narnia/castle')).toBeNull();
    // …and coverage falls back to the shallower root Region.
    expect(AddressApi.coveringLocalityOf('narnia/castle')?.getName()).toBe(
      'Narnia',
    );
    expect(
      AddressApi.coveringLocalityOf('narnia/castle/closet')?.getName(),
    ).toBe('Narnia');
  });
});
