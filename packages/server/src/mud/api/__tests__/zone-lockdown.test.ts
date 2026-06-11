/**
 * `Stuff.#zone` tamper-resistance + invariant tests.
 *
 * Post-lockdown, `zone` is a hard-private (`#`) slot:
 *   - The only writers are `setZone` (gated by `FromSpatialZone`
 *     — only SpatialZone subclasses may call it through the proxy)
 *     and the caller-gated static `Stuff._stampZone` (allowlist:
 *     `mud/api/stuff.ts`, test-setup, `.test.ts` files).
 *   - The only readers are `getZone()` (instance method, unwraps
 *     `RAW_TARGET`) and the matching static read pattern.
 *   - Forging `(stuff as any).zone = X` no-ops on the `#` slot
 *     and cannot break the cross-zone containment invariant.
 *   - `zone` is NOT in `PASSTHROUGH_KEYS` — bracket reads on the
 *     proxy return `undefined`.
 *
 * Mirrors the templatePath-lockdown shape; the gate uses the
 * same `#stampGateAllowlist` (shared cache + regex set).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Stuff } from '../../lib/stuff/Stuff';
import { Idea } from '../../lib/stuff/Idea';
import CartesianZone from '../../lib/location/CartesianZone';
import CartesianLocation from '../../lib/location/CartesianLocation';
import Thing from '../../lib/stuff/Thing';
import { StuffApi } from '../stuff';
import { ContainmentApi, ContainmentError } from '../containment';
import { ShadowApi } from '../shadow';
import { ProxyApi } from '../proxy';
import { SecurityError } from '../../lib/security/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import ExitableVessel from '../../lib/boundary/ExitableVessel';

class Plain extends Idea {}

describe('zone lockdown — round-trip', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('default is null', () => {
    const s = makeStuff(() => new Plain());
    expect(s.getZone()).toBeNull();
  });

  it('_stampZone sets the slot (used by clone/pre-register)', () => {
    const s = makeStuff(() => new Plain());
    const zone = makeStuff(() => new CartesianZone());
    Stuff._stampZone(s, zone);
    expect(s.getZone()).toBe(zone);
  });

  it('_stampZone(null) clears the slot', () => {
    const s = makeStuff(() => new Plain());
    const zone = makeStuff(() => new CartesianZone());
    Stuff._stampZone(s, zone);
    Stuff._stampZone(s, null);
    expect(s.getZone()).toBeNull();
  });
});

describe('zone lockdown — tamper resistance', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('(s as any).zone = otherZone does NOT change the `#` slot', () => {
    const real = makeStuff(() => new CartesianZone());
    const fake = makeStuff(() => new CartesianZone());
    const s = makeStuff(() => new Plain());
    Stuff._stampZone(s, real);
    expect(s.getZone()).toBe(real);

    (s as unknown as { zone: unknown }).zone = fake;
    expect(s.getZone()).toBe(real);
  });

  it('bracket access on the proxy returns undefined (zone not in PASSTHROUGH_KEYS)', () => {
    const zone = makeStuff(() => new CartesianZone());
    const s = makeStuff(() => new Plain());
    Stuff._stampZone(s, zone);
    expect((s as unknown as { zone?: unknown }).zone).toBe(undefined);
  });

  it('Reflect.set(proxy, "zone", X) is a no-op on the `#` slot', () => {
    const real = makeStuff(() => new CartesianZone());
    const fake = makeStuff(() => new CartesianZone());
    const s = makeStuff(() => new Plain());
    Stuff._stampZone(s, real);
    Reflect.set(s, 'zone', fake);
    expect(s.getZone()).toBe(real);
  });
});

describe('zone lockdown — cross-zone invariant integrity under tamper', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('forging `(item as any).zone` does NOT bypass the cross-zone containment guard', async () => {
    // Set up two zones, each with a location.
    const zoneA = makeStuff(() => new CartesianZone());
    const zoneB = makeStuff(() => new CartesianZone());
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation());
    zoneA.addLocation(locA, 0, 0, 0);
    zoneB.addLocation(locB, 0, 0, 0);

    // An Exitable (vessel) stamped into zoneA. Place it in locA.
    const wardrobe = makeStuff(() => new ExitableVessel());
    Stuff._stampZone(wardrobe, zoneA);
    ContainmentApi.move(wardrobe, locA);

    // Forgery attempt: pretend the wardrobe is in zoneB to slip
    // past the cross-zone guard. The bracket-write is a no-op on
    // the `#` slot.
    (wardrobe as unknown as { zone: unknown }).zone = zoneB;

    // Real zone is still zoneA, so the move into locB (zoneB) is
    // still rejected. Pre-lockdown, the forgery would have made
    // the move succeed.
    expect(() => ContainmentApi.move(wardrobe, locB)).toThrow(
      ContainmentError
    );
    expect(wardrobe.getZone()).toBe(zoneA);
  });
});

describe('zone lockdown — getZone unwrap', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('works through the Proxy (unwraps via RAW_TARGET internally)', () => {
    const zone = makeStuff(() => new CartesianZone());
    const s = makeStuff(() => new Plain());
    Stuff._stampZone(s, zone);
    expect(s.getZone()).toBe(zone);
  });

  it('works on the raw target directly (no proxy)', () => {
    const zone = makeStuff(() => new CartesianZone());
    const s = makeStuff(() => new Plain());
    Stuff._stampZone(s, zone);
    const raw = (s as unknown as Record<symbol, Stuff | undefined>)[
      ProxyApi.RAW_TARGET
    ];
    expect(raw).toBeDefined();
    expect(raw!.getZone()).toBe(zone);
  });

  it('CartesianLocation.getZone override still works (super.getZone unwraps)', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    // CartesianLocation overrides getZone() to narrow the return
    // type. Its body delegates to `super.getZone()` which is the
    // unwrapping base method.
    expect(loc.getZone()).toBe(zone);
  });
});

describe('setZone gate — FromSpatialZone policy', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('SpatialZone.addLocation (and CartesianZone override) DO pass the gate', () => {
    // The whole point of FromSpatialZone is that the
    // addLocation/removeLocation chokepoints work normally.
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new CartesianLocation());
    expect(() => zone.addLocation(loc, 0, 0, 0)).not.toThrow();
    expect(loc.getZone()).toBe(zone);
  });

  it('SpatialZone.removeLocation passes the gate (null-stamp path)', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    expect(() => zone.removeLocation(loc)).not.toThrow();
    expect(loc.getZone()).toBeNull();
  });

  it('a non-SpatialZone caller (a Plain Stuff) is DENIED by the proxy gate', () => {
    const zone = makeStuff(() => new CartesianZone());
    const victim = makeStuff(() => new Thing());
    // Direct proxy call from this test's stack frame: caller
    // identity resolves to the .test.ts module, which isn't on
    // the FromSpatialZone module-id glob.
    expect(() => victim.setZone(zone)).toThrow(SecurityError);
    expect(victim.getZone()).toBeNull();
  });
});

describe('_stampZone gate — caller allowlist', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('direct call from a .test.ts file IS allowed', () => {
    const zone = makeStuff(() => new CartesianZone());
    const s = makeStuff(() => new Plain());
    expect(() => Stuff._stampZone(s, zone)).not.toThrow();
    expect(s.getZone()).toBe(zone);
  });

  it('a non-allowlisted caller (the bad-caller fixture under fixtures/) throws', async () => {
    const { stampZoneFromBadCaller } = await import(
      './fixtures/zone-bad-caller'
    );
    const zone = makeStuff(() => new CartesianZone());
    const s = makeStuff(() => new Plain());
    expect(() => stampZoneFromBadCaller(s, zone)).toThrow(
      /_stampZone refused/
    );
    expect(s.getZone()).toBeNull();
  });
});
