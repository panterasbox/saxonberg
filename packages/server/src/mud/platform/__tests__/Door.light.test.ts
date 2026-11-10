import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import Door from '../thing/Door';
import { Boundary } from '../../lib/boundary/Boundary';
import Location from '../../lib/location/Location';
import CartesianZone from '../idea/location/CartesianZone';
import { VisionModality } from '../idea/modalities/VisionModality';
import { buildAllModalities } from '../../lib/perception/modalities/__tests__/test-helpers';
import { Light } from '../../lib/perception/Light';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import Good from '../../lib/stuff/Good';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../lib/security/__tests__/test-setup';
import { BOUNDARY_CHANNELS as CHANNELS } from '../../lib/boundary/Conduit';
import { PerceptionApi } from '../../api/perception';

/** The vision modality singleton — these are instance methods on it. */
const vision = (): VisionModality =>
  PerceptionApi.modalityByName('vision') as VisionModality;

class Candle extends LightSourceMixin(Good) {}

describe('Door — a Boundary with a bolt', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  beforeEach(() => {
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Door is a Boundary and a Sealable', async () => {
    const door = await StuffApi.create(() => new Door());
    expect(door).toBeInstanceOf(Boundary);
    expect(MixinApi.isSealable(door)).toBe(true);
    expect(MixinApi.isVisible(door)).toBe(true);
    expect(MixinApi.isPerceptible(door)).toBe(true);
    expect(MixinApi.isContainable(door)).toBe(true);
  });

  it('⭐ its channel table gates every channel on isOpen', async () => {
    const door = await StuffApi.create(() => new Door());
    for (const ch of CHANNELS) {
      expect(door.transmissivity(ch, 'A', 'B'), `${ch} shut`).toBe(0);
    }
    door.open();
    for (const ch of CHANNELS) {
      expect(door.transmissivity(ch, 'A', 'B'), `${ch} open`).toBe(1);
    }
  });

  it('passes bodies when open — it is a way, not a window', async () => {
    const door = await StuffApi.create(() => new Door());
    expect(door.passesBodiesWhenOpen()).toBe(true);
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
    const a = makeStuff(() => new Location());
    const b = makeStuff(() => new Location());
    zoneA.addLocation(a, 0, 0, 0);
    zoneB.addLocation(b, 0, 0, 0);
    return { a, b };
  }

  it('closed door between rooms blocks the candle leak via the boundary walk', async () => {
    const { a, b } = setupTwoRoomsAcrossZones();
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { boundary: door, opposite: 'south' });

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, a);

    expect(vision().lightAt(a).intensity.rawValue()).toBe(40);
    expect(vision().lightAt(b)).toBe(Light.ZERO);

    door.open();
    expect(vision().lightAt(b).intensity.rawValue()).toBe(40);
  });

  it('an exit with no door still leaks light fully', async () => {
    const { a, b } = setupTwoRoomsAcrossZones();
    await a.addBidirectionalExit(b, 'north', { opposite: 'south' });
    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, a);
    expect(vision().lightAt(b).intensity.rawValue()).toBe(40);
  });

  it('shares neighbor across two paths only when no double-counting', async () => {
    // The doored way is ONE leg: the walk takes it through the boundary
    // and never again as an open way, so it is not counted twice.
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² receiving-surface scale
    const a = makeStuff(() => new Location());
    const b = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { boundary: door });
    door.open();

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(20);
    ContainmentApi.move(candle, b);

    // Single contribution through the door — not 2×.
    expect(vision().lightAt(a).intensity.rawValue()).toBe(20);
  });
});
