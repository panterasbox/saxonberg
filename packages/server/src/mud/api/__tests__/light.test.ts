import { describe, it, expect, afterEach } from 'vitest';
import { LightApi, MAX_HOPS, EXIT_TAU } from '../light';
import { Light } from '../../lib/perception/Light';
import { CartesianLocation } from '../../lib/spatial/CartesianLocation';
import { CartesianZone } from '../../lib/spatial/CartesianZone';
import { SphericalLocation } from '../../lib/spatial/SphericalLocation';
import { SphericalZone } from '../../lib/spatial/SphericalZone';
import { Door } from '../../lib/boundary/Door';
import { AmbientLitMixin } from '../../lib/perception/AmbientLit';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// AmbientLit is opt-in for content — outdoor rooms compose it,
// underground rooms keep the Light.ZERO default (no mixin). The
// tests use opt-in subclasses so the propagation walk has values
// to add up.
class AmbientCartesianLocation extends AmbientLitMixin(CartesianLocation) {}
class AmbientSphericalLocation extends AmbientLitMixin(SphericalLocation) {}

describe('LightApi.lightAt — Phase 2 propagation core', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('empty room with no ambient reads ZERO', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    expect(LightApi.lightAt(loc)).toBe(Light.ZERO);
    expect(LightApi.bandAt(loc)).toBe('pitch-black');
  });

  it('room with setAmbientLight reflects the band', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    loc.setAmbientLight(Light.of(40, 'warm'));

    const total = LightApi.lightAt(loc);
    expect(total.intensity).toBe(40);
    expect(total.color).toBe('warm');
    expect(LightApi.bandAt(loc)).toBe('lit');
  });

  it('exits leak ambient light from neighbors', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    b.setAmbientLight(Light.of(60));

    // a is dark; b is bright; the cardinal-derived exit between them
    // leaks light into a (EXIT_TAU = 1.0, no door, no boundary).
    const totalA = LightApi.lightAt(a);
    expect(totalA.intensity).toBe(60 * EXIT_TAU);
  });

  it('a closed door on an exit blocks light leakage', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    b.setAmbientLight(Light.of(60));

    // Replace the derived exit with an explicit one carrying a closed door.
    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    door.setIsOpen(false);
    a.addBidirectionalExit(b, 'north', { door });

    expect(LightApi.lightAt(a)).toBe(Light.ZERO);
    door.open();
    const totalA = LightApi.lightAt(a);
    expect(totalA.intensity).toBe(60);
  });

  it('MAX_HOPS truncates propagation past depth 2', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    const d = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 0, 2, 0);
    zone.addLocation(d, 0, 3, 0);
    d.setAmbientLight(Light.of(100));

    // a → b → c → d. With MAX_HOPS = 2, a sees d's contribution at
    // depth 3 truncated to ZERO. c (depth 2 from a's start) is the
    // furthest neighbor whose own walk completes; but c itself is
    // empty, so a reads ZERO from this chain.
    expect(MAX_HOPS).toBe(2);
    expect(LightApi.lightAt(a)).toBe(Light.ZERO);
  });

  it('cycle: visited Set prevents infinite recursion', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new AmbientCartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    a.setAmbientLight(Light.of(10));

    // The natural a↔b loop is bounded by MAX_HOPS, but the visited
    // set ensures even pathological topologies don't recurse
    // forever. Asking lightAt(a) terminates and includes a's own
    // ambient.
    const total = LightApi.lightAt(a);
    expect(total.intensity).toBeGreaterThanOrEqual(10);
  });

  it('CartesianLocation.getSizeScale uses zone.cellSize', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    zone.setCellSize(2.0);
    loc.setAmbientLight(Light.of(40));

    // 40 / 2.0 = 20 → 'lit'. Without the size scale, 40 → 'lit' too,
    // but we verify the divisor mechanically by going the other way.
    zone.setCellSize(8.0);
    // 40 / 8 = 5 → 'dim'.
    expect(LightApi.bandAt(loc)).toBe('dim');
  });

  it('SphericalLocation.getSizeScale uses radius', () => {
    const zone = makeStuff(() => new SphericalZone());
    const loc = makeStuff(() => new AmbientSphericalLocation());
    zone.addLocation(loc);
    loc.setRadius(8.0);
    loc.setAmbientLight(Light.of(40));

    expect(LightApi.bandAt(loc)).toBe('dim'); // 40/8 = 5
    loc.setRadius(2.0);
    expect(LightApi.bandAt(loc)).toBe('lit'); // 40/2 = 20
  });

  it('shadowsAt maps each band to a shadow tier', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    expect(LightApi.shadowsAt(loc)).toBe('absolute');
    loc.setAmbientLight(Light.of(2));
    expect(LightApi.shadowsAt(loc)).toBe('deep');
    loc.setAmbientLight(Light.of(10));
    expect(LightApi.shadowsAt(loc)).toBe('partial');
    loc.setAmbientLight(Light.of(40));
    expect(LightApi.shadowsAt(loc)).toBe('faint');
    loc.setAmbientLight(Light.of(100));
    expect(LightApi.shadowsAt(loc)).toBe('none');
  });
});
