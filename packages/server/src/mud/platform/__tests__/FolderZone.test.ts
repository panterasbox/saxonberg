import "../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import FolderZone from '../idea/FolderZone';
import { Zone } from '../../lib/zone/Zone';
import { SpatialZone } from '../../lib/zone/SpatialZone';
import { ZoneApi } from '../../api/zone';
import { StuffApi } from '../../api/stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('FolderZone', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('is constructible as a Zone subclass', () => {
    const z = makeStuff(() => new FolderZone());
    expect(z).toBeInstanceOf(Zone);
  });

  it('is NOT a SpatialZone', () => {
    const z = makeStuff(() => new FolderZone());
    expect(z instanceof SpatialZone).toBe(false);
  });

  it('does not expose location-aware methods (bare Zone shape)', () => {
    const z = makeStuff(() => new FolderZone()) as unknown as
      Record<string, unknown>;
    expect(z.addLocation).toBeUndefined();
    expect(z.getLocations).toBeUndefined();
    expect(z.removeLocation).toBeUndefined();
    expect(z.contains).toBeUndefined();
    expect(z.deriveExit).toBeUndefined();
    expect(z.hasDerivedAdjacency).toBeUndefined();
  });

  it('carries the name surface from the bare Zone base', () => {
    const z = makeStuff(() => new FolderZone());
    expect(z.getName()).toBe('');
    z.setName('Eternal');
    expect(z.getName()).toBe('Eternal');
  });

  it('ZoneApi.isFolderClass returns true', async () => {
    expect(await ZoneApi.isFolderClass('/platform/idea/FolderZone')).toBe(true);
  });

  it('ZoneApi.isSpatialZoneClass returns false', async () => {
    expect(await ZoneApi.isSpatialZoneClass('/platform/idea/FolderZone')).toBe(
      false
    );
  });
});
