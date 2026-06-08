import { describe, it, expect, afterEach } from 'vitest';
import { Window } from '../Window';
import { Boundary } from '../Boundary';
import { CartesianLocation } from '../../spatial/CartesianLocation';
import { CartesianZone } from '../../spatial/CartesianZone';
import { BoundaryApi } from '../../../api/boundary';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ProxyApi } from '../../../api/proxy';
import { PersistentHydrator } from '../../persistence/PersistentHydrator';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { LightConduit, LineOfSight } from '../Conduit';

describe('Window', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('is a Boundary and a Sealable, defaults to closed + base 1.0', () => {
    const w = makeStuff(() => new Window());
    expect(w).toBeInstanceOf(Boundary);
    expect(MixinApi.isSealable(w)).toBe(true);
    expect(w.isOpen()).toBe(false);
    expect(w.getBaseTransmissivity()).toBe(1.0);
    expect(w.getDirectionalOverrides()).toBeNull();
    expect(w.getColorTint()).toBeNull();
  });

  it('transmissivity is 0 when closed regardless of base / overrides', () => {
    const w = makeStuff(() => new Window());
    w.setBaseTransmissivity(0.7);
    w.setDirectionalOverrides({ aToB: 1, bToA: 0.3 });
    expect(w.transmissivity('A', 'B')).toBe(0);
    expect(w.transmissivity('B', 'A')).toBe(0);
  });

  it('symmetric: transmissivity returns base in both directions when open', () => {
    const w = makeStuff(() => new Window());
    w.open();
    w.setBaseTransmissivity(0.6);
    expect(w.transmissivity('A', 'B')).toBe(0.6);
    expect(w.transmissivity('B', 'A')).toBe(0.6);
  });

  it('one-way glass: aToB=1, bToA=0', () => {
    const w = makeStuff(() => new Window());
    w.open();
    w.setBaseTransmissivity(1);
    w.setDirectionalOverrides({ aToB: 1, bToA: 0 });
    expect(w.transmissivity('A', 'B')).toBe(1);
    expect(w.transmissivity('B', 'A')).toBe(0);
    expect(w.canSeeThrough('A', 'B')).toBe(true);
    expect(w.canSeeThrough('B', 'A')).toBe(false);
  });

  it('rejects out-of-range transmissivity / overrides', () => {
    const w = makeStuff(() => new Window());
    expect(() => w.setBaseTransmissivity(-0.1)).toThrow(RangeError);
    expect(() => w.setBaseTransmissivity(1.5)).toThrow(RangeError);
    expect(() => w.setDirectionalOverrides({ aToB: 2 })).toThrow(RangeError);
  });

  it('getConduits returns a light + sight + smell triple', () => {
    const w = makeStuff(() => new Window());
    const conduits = w.getConduits();
    const kinds = conduits.map((c) => c.conduitKind).sort();
    expect(kinds).toEqual(['light', 'sight', 'smell']);

    w.open();
    w.setBaseTransmissivity(0.5);
    const light = conduits.find((c) => c.conduitKind === 'light') as LightConduit;
    const sight = conduits.find((c) => c.conduitKind === 'sight') as LineOfSight;
    expect(light.transmissivity('A', 'B')).toBe(0.5);
    expect(sight.canSeeThrough('A', 'B')).toBe(true);
    w.close();
    expect(light.transmissivity('A', 'B')).toBe(0);
    expect(sight.canSeeThrough('A', 'B')).toBe(false);
  });

  it('hydrates configuration via the PersistentHydrator (scalar fields)', async () => {
    const w = makeStuff(() => new Window());
    await makeStuff(() => new PersistentHydrator()).hydrate(w, {
      baseTransmissivity: 0.4,
      aToBOverride: 0.4,
      bToAOverride: 0,
      colorTint: 'amber',
      open: true,
    });
    expect(w.getBaseTransmissivity()).toBe(0.4);
    // The structured runtime API is reconstructed from the two scalars.
    expect(w.getDirectionalOverrides()).toEqual({ aToB: 0.4, bToA: 0 });
    expect(w.getColorTint()).toBe('amber');
    expect(w.isOpen()).toBe(true);

    // toDocument bracket-read shape — the persistence layer sees the
    // two scalars directly, not the structured object.
    const raw = ProxyApi.unwrap(w) as unknown as {
      baseTransmissivity: number;
      aToBOverride: number | null;
      bToAOverride: number | null;
      colorTint: string | null;
    };
    expect(raw.baseTransmissivity).toBe(0.4);
    expect(raw.aToBOverride).toBe(0.4);
    expect(raw.bToAOverride).toBe(0);
    expect(raw.colorTint).toBe('amber');
  });

  it('one-side-only override hydrates correctly', async () => {
    const w = makeStuff(() => new Window());
    await makeStuff(() => new PersistentHydrator()).hydrate(w, {
      aToBOverride: 0.5,
      // bToAOverride absent — should stay null
    });
    expect(w.getDirectionalOverrides()).toEqual({ aToB: 0.5 });
  });

  it('null overrides round-trip through the runtime API', () => {
    const w = makeStuff(() => new Window());
    w.setDirectionalOverrides({ aToB: 1, bToA: 0 });
    expect(w.getDirectionalOverrides()).toEqual({ aToB: 1, bToA: 0 });
    w.setDirectionalOverrides(null);
    expect(w.getDirectionalOverrides()).toBeNull();
  });

  it('attachExistingBoundary plus destruct round-trip', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const w = makeStuff(() => new Window());
    BoundaryApi.attachExistingBoundary({ boundary: w, hostA: a, hostB: b });
    expect(a.getFixtureBoundaries()).toEqual([w]);
    expect(b.getFixtureBoundaries()).toEqual([w]);

    BoundaryApi.destruct(w);
    expect(a.getFixtureBoundaries()).toEqual([]);
    expect(b.getFixtureBoundaries()).toEqual([]);
  });
});
