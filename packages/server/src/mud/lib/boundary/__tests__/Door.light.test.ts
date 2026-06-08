import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Door } from '../Door';
import { Boundary } from '../Boundary';
import { CartesianLocation } from '../../spatial/CartesianLocation';
import { CartesianZone } from '../../spatial/CartesianZone';
import { VisionModality } from '../../perception/modalities/VisionModality';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import { Light } from '../../perception/Light';
import { LightSourceMixin } from '../../perception/LightSource';
import { Thing } from '../../stuff/Thing';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { LightConduit, LineOfSight, MovementConduit } from '../Conduit';

class Candle extends LightSourceMixin(Thing) {}

describe('Door retrofit — Boundary identity and conduit registry', () => {
  beforeEach(() => {
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Door is a Boundary and a Sealable', () => {
    const door = makeStuff(() => new Door());
    expect(door).toBeInstanceOf(Boundary);
    expect(MixinApi.isSealable(door)).toBe(true);
    expect(MixinApi.isVisible(door)).toBe(true);
    expect(MixinApi.isPerceptible(door)).toBe(true);
    expect(MixinApi.isContainable(door)).toBe(true);
  });

  it('getConduits returns Light, Sight, Movement, and Smell conduits', () => {
    const door = makeStuff(() => new Door());
    const kinds = door.getConduits().map((c) => c.conduitKind).sort();
    expect(kinds).toEqual(['light', 'movement', 'sight', 'smell']);
  });

  it('all three conduits gate on isOpen', () => {
    const door = makeStuff(() => new Door());
    const conduits = door.getConduits();
    const light = conduits.find((c) => c.conduitKind === 'light') as LightConduit;
    const sight = conduits.find((c) => c.conduitKind === 'sight') as LineOfSight;
    const movement = conduits.find((c) => c.conduitKind === 'movement') as MovementConduit;

    expect(light.transmissivity('A', 'B')).toBe(0);
    expect(sight.canSeeThrough('A', 'B')).toBe(false);
    expect(movement.canPassThrough('A', 'B', 'walk')).toBe(false);

    door.open();
    expect(light.transmissivity('A', 'B')).toBe(1);
    expect(sight.canSeeThrough('A', 'B')).toBe(true);
    expect(movement.canPassThrough('A', 'B', 'walk')).toBe(true);
  });

  it('addBidirectionalExit({door}) installs anchors on both rooms', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² receiving-surface scale
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { door });

    // Existing attachedTo wiring still works.
    expect(door.getAttachedExits().size).toBe(2);
    // New: anchors live in each room's fixtures.
    expect(door.getAnchorA()).not.toBeNull();
    expect(door.getAnchorB()).not.toBeNull();
    expect(a.getFixtureBoundaries()).toContain(door);
    expect(b.getFixtureBoundaries()).toContain(door);
  });

  it('door.detach() clears BOTH attachedTo AND boundary anchors', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² receiving-surface scale
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { door });
    expect(door.getAttachedExits().size).toBe(2);
    expect(door.getAnchorA()).not.toBeNull();

    door.detach();

    expect(door.getAttachedExits().size).toBe(0);
    expect(door.getAnchorA()).toBeNull();
    expect(door.getAnchorB()).toBeNull();
    expect(a.getFixtureBoundaries()).toEqual([]);
    expect(b.getFixtureBoundaries()).toEqual([]);
  });
});

describe('Door retrofit — closed door blocks light propagation', () => {
  beforeEach(() => {
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  /**
   * Two rooms in DIFFERENT cartesian zones so there is no
   * cardinal-derived exit between them. The boundary path is the
   * only way light can flow.
   */
  function setupTwoRoomsAcrossZones() {
    const zoneA = makeStuff(() => new CartesianZone());
    zoneA.setCellSize(1);
    const zoneB = makeStuff(() => new CartesianZone());
    zoneB.setCellSize(1);
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zoneA.addLocation(a, 0, 0, 0);
    zoneB.addLocation(b, 0, 0, 0);
    return { a, b };
  }

  it('closed door between rooms blocks the candle leak via the boundary walk', async () => {
    const { a, b } = setupTwoRoomsAcrossZones();
    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { door, opposite: 'south' });

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, a);

    expect(VisionModality.lightAt(a).intensity.rawValue()).toBe(40);
    expect(VisionModality.lightAt(b)).toBe(Light.ZERO);

    door.open();
    expect(VisionModality.lightAt(b).intensity.rawValue()).toBe(40);
  });

  it('an exit with no door still leaks light fully', async () => {
    const { a, b } = setupTwoRoomsAcrossZones();
    await a.addBidirectionalExit(b, 'north', { opposite: 'south' });
    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, a);
    expect(VisionModality.lightAt(b).intensity.rawValue()).toBe(40);
  });

  it('shares neighbor across two paths only when no double-counting', async () => {
    // Same-zone setup: cardinal-derived exit + an explicit doored
    // exit could lead to the same neighbor counting twice. The walk
    // skips doored exits so the boundary-side contribution wins.
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² receiving-surface scale
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { door });
    door.open();

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(20);
    ContainmentApi.move(candle, b);

    // Single contribution through the door — not 2×.
    expect(VisionModality.lightAt(a).intensity.rawValue()).toBe(20);
  });
});
