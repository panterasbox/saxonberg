import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import Window from '../thing/Window';
import { Light } from '../../lib/perception/Light';
import { Colour } from '../../lib/perception/Colour';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import CartesianLocation from '../../lib/location/CartesianLocation';
import CartesianZone from '../idea/location/CartesianZone';
import Good from '../../lib/stuff/Good';
import { BoundaryApi } from '../../api/boundary';
import { ContainmentApi } from '../../api/containment';
import { VisionModality } from '../idea/modalities/VisionModality';
import { MAX_HOPS } from '../../lib/perception/Modality';
import { buildAllModalities } from '../../lib/perception/modalities/__tests__/test-helpers';
import { StuffApi } from '../../api/stuff';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../lib/security/__tests__/test-setup';
import { PerceptionApi } from '../../api/perception';

/** The vision modality singleton — these are instance methods on it. */
const vision = (): VisionModality =>
  PerceptionApi.modalityByName('vision') as VisionModality;

class Candle extends LightSourceMixin(Good) {}

/**
 * Phase 4 critical integration tests. The propagation walk's
 * highest-leverage assertions live here — multi-room scenarios are
 * the most likely place for surprise.
 */
describe('Window — multi-room propagation integration', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  beforeEach(() => {
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  /**
   * Build two rooms in *different* CartesianZones (no implicit
   * adjacency between them) and connect them with an open Window.
   * This isolates the boundary-propagation path from the
   * cardinal-derived exit propagation path so we can read the
   * window's contribution alone.
   */
  function setupTwoRoomsAcrossZones() {
    const zoneA = makeStuff(() => new CartesianZone());
    zoneA.setCellSize(1); // pre-biome light calibration: 1m² scale
    const zoneB = makeStuff(() => new CartesianZone());
    zoneB.setCellSize(1);
    const roomA = makeStuff(() => new CartesianLocation());
    const roomB = makeStuff(() => new CartesianLocation());
    zoneA.addLocation(roomA, 0, 0, 0);
    zoneB.addLocation(roomB, 0, 0, 0);
    return { roomA, roomB };
  }

  it('open window: candle in A leaks into B via the LightConduit', async () => {
    const { roomA, roomB } = setupTwoRoomsAcrossZones();
    const window = await StuffApi.create(() => new Window());
    window.setBaseTransmissivity(1);
    window.open();
    BoundaryApi.attachExistingBoundary({
      boundary: window,
      hostA: roomA,
      hostB: roomB,
    });

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, roomA);

    const totalA = vision().lightAt(roomA);
    expect(totalA.intensity.rawValue()).toBe(40);
    const totalB = vision().lightAt(roomB);
    expect(totalB.intensity.rawValue()).toBe(40);
  });

  it('closed window: A is lit, B reads ZERO', async () => {
    const { roomA, roomB } = setupTwoRoomsAcrossZones();
    const window = await StuffApi.create(() => new Window());
    window.setBaseTransmissivity(1);
    // Window starts closed.
    BoundaryApi.attachExistingBoundary({
      boundary: window,
      hostA: roomA,
      hostB: roomB,
    });

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, roomA);

    expect(vision().lightAt(roomA).intensity.rawValue()).toBe(40);
    expect(vision().lightAt(roomB)).toBe(Light.ZERO);

    window.open();
    expect(vision().lightAt(roomB).intensity.rawValue()).toBe(40);
  });

  it('partial transmissivity attenuates the leak', async () => {
    const { roomA, roomB } = setupTwoRoomsAcrossZones();
    const window = await StuffApi.create(() => new Window());
    window.setBaseTransmissivity(0.5);
    window.open();
    BoundaryApi.attachExistingBoundary({
      boundary: window,
      hostA: roomA,
      hostB: roomB,
    });

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, roomA);

    expect(vision().lightAt(roomB).intensity.rawValue()).toBe(20);
  });

  it('one-way glass: A→B leaks fully; B→A leaks not at all', async () => {
    const { roomA, roomB } = setupTwoRoomsAcrossZones();
    const window = await StuffApi.create(() => new Window());
    window.setBaseTransmissivity(1);
    window.setDirectionalOverrides({ aToB: 1, bToA: 0 });
    window.open();
    BoundaryApi.attachExistingBoundary({
      boundary: window,
      hostA: roomA,
      hostB: roomB,
    });

    const lampA = makeStuff(() => new Candle());
    lampA.setEmittedFlux(50);
    ContainmentApi.move(lampA, roomA);

    expect(vision().lightAt(roomA).intensity.rawValue()).toBe(50);
    expect(vision().lightAt(roomB).intensity.rawValue()).toBe(50);

    // Symmetric setup with the lamp on the other side.
    ContainmentApi.move(lampA, roomB);
    expect(vision().lightAt(roomB).intensity.rawValue()).toBe(50);
    expect(vision().lightAt(roomA)).toBe(Light.ZERO);
  });

  it('three-room chain through two windows respects MAX_HOPS', async () => {
    expect(MAX_HOPS).toBe(2);
    const zoneA = makeStuff(() => new CartesianZone());
    zoneA.setCellSize(1);
    const zoneB = makeStuff(() => new CartesianZone());
    zoneB.setCellSize(1);
    const zoneC = makeStuff(() => new CartesianZone());
    zoneC.setCellSize(1);
    const roomA = makeStuff(() => new CartesianLocation());
    const roomB = makeStuff(() => new CartesianLocation());
    const roomC = makeStuff(() => new CartesianLocation());
    zoneA.addLocation(roomA, 0, 0, 0);
    zoneB.addLocation(roomB, 0, 0, 0);
    zoneC.addLocation(roomC, 0, 0, 0);

    const wAB = await StuffApi.create(() => new Window());
    wAB.setBaseTransmissivity(1);
    wAB.open();
    BoundaryApi.attachExistingBoundary({
      boundary: wAB,
      hostA: roomA,
      hostB: roomB,
    });
    const wBC = await StuffApi.create(() => new Window());
    wBC.setBaseTransmissivity(1);
    wBC.open();
    BoundaryApi.attachExistingBoundary({
      boundary: wBC,
      hostA: roomB,
      hostB: roomC,
    });

    // Lamp in C. lightAt(A) is depth-2: A → wAB → B → wBC → C. Each
    // hop is depth + 1, so C is depth 2 — within budget. Read should
    // include C's lamp.
    const lamp = makeStuff(() => new Candle());
    lamp.setEmittedFlux(40);
    ContainmentApi.move(lamp, roomC);

    expect(vision().lightAt(roomC).intensity.rawValue()).toBe(40);
    expect(vision().lightAt(roomB).intensity.rawValue()).toBe(40);
    expect(vision().lightAt(roomA).intensity.rawValue()).toBe(40);

    // Now extend with a fourth room D behind a third window. D is at
    // depth 3 from A, beyond MAX_HOPS — A's read must NOT include
    // D's lamp's contribution beyond what bleeds through the
    // intermediate rooms within budget.
    const zoneD = makeStuff(() => new CartesianZone());
    zoneD.setCellSize(1);
    const roomD = makeStuff(() => new CartesianLocation());
    zoneD.addLocation(roomD, 0, 0, 0);
    const wCD = await StuffApi.create(() => new Window());
    wCD.setBaseTransmissivity(1);
    wCD.open();
    BoundaryApi.attachExistingBoundary({
      boundary: wCD,
      hostA: roomC,
      hostB: roomD,
    });
    ContainmentApi.move(lamp, roomD);

    // From A: depth 0 = A, 1 = B, 2 = C. C reads its own walk at
    // depth 0 inside that recursive call — but the walk shares the
    // visited set, so D is reachable via the recursive call from C.
    // The depth budget bounds that recursion; specifically, when we
    // reach C from A's depth = 2, we still allow C's contents to
    // contribute (we don't need a further hop), but D requires a
    // further hop — depth 3 — which truncates to ZERO.
    expect(vision().lightAt(roomA).intensity.rawValue()).toBe(0);
  });

  it('coloured pane MULTIPLIES: white light through a red window lands red in B, dimmer', async () => {
    const { roomA, roomB } = setupTwoRoomsAcrossZones();
    const window = await StuffApi.create(() => new Window());
    window.setBaseTransmissivity(1);
    window.setGlazing(Colour.of(1, 0.1, 0.1)); // red glass
    window.open();
    BoundaryApi.attachExistingBoundary({
      boundary: window,
      hostA: roomA,
      hostB: roomB,
    });

    const candle = makeStuff(() => new Candle());
    candle.setEmittedFlux(40);
    ContainmentApi.move(candle, roomA);

    // A reads white at full strength.
    const a = vision().lightAt(roomA);
    expect(a.intensity.rawValue()).toBe(40);
    expect(a.colour.r).toBe(1);

    // B reads RED, and LESS light than A (the pane subtracts g + b).
    const b = vision().lightAt(roomB);
    expect(b.colour.r).toBeCloseTo(1, 5);
    expect(b.colour.g).toBeLessThan(0.3);
    expect(b.colour.b).toBeLessThan(0.3);
    expect(b.intensity.rawValue()).toBeGreaterThan(0);
    expect(b.intensity.rawValue()).toBeLessThan(40);
  });

  it('two coloured windows ADD: a red and a blue window onto one room give magenta', async () => {
    // Three source-free zones: A (lit, red window to B), C (lit, blue
    // window to B), B (dark, reads the sum). Distinct zones isolate the
    // boundary path from cardinal exits.
    const zoneA = makeStuff(() => new CartesianZone());
    zoneA.setCellSize(1);
    const zoneB = makeStuff(() => new CartesianZone());
    zoneB.setCellSize(1);
    const zoneC = makeStuff(() => new CartesianZone());
    zoneC.setCellSize(1);
    const roomA = makeStuff(() => new CartesianLocation());
    const roomB = makeStuff(() => new CartesianLocation());
    const roomC = makeStuff(() => new CartesianLocation());
    zoneA.addLocation(roomA, 0, 0, 0);
    zoneB.addLocation(roomB, 0, 0, 0);
    zoneC.addLocation(roomC, 0, 0, 0);

    const red = await StuffApi.create(() => new Window());
    red.setBaseTransmissivity(1);
    red.setGlazing(Colour.of(1, 0.1, 0.1));
    red.open();
    BoundaryApi.attachExistingBoundary({ boundary: red, hostA: roomA, hostB: roomB });

    const blue = await StuffApi.create(() => new Window());
    blue.setBaseTransmissivity(1);
    blue.setGlazing(Colour.of(0.1, 0.1, 1));
    blue.open();
    BoundaryApi.attachExistingBoundary({ boundary: blue, hostA: roomC, hostB: roomB });

    const lampA = makeStuff(() => new Candle());
    lampA.setEmittedFlux(40);
    ContainmentApi.move(lampA, roomA);
    const lampC = makeStuff(() => new Candle());
    lampC.setEmittedFlux(40);
    ContainmentApi.move(lampC, roomC);

    const b = vision().lightAt(roomB);
    // The two hues ADD across panes — high-r, high-b, low-g.
    expect(b.colour.r).toBeGreaterThan(0.8);
    expect(b.colour.b).toBeGreaterThan(0.8);
    expect(b.colour.g).toBeLessThan(0.3);
  });

  it('BoundaryApi.destruct cleanly removes the leak', async () => {
    const { roomA, roomB } = setupTwoRoomsAcrossZones();
    const window = await StuffApi.create(() => new Window());
    window.setBaseTransmissivity(1);
    window.open();
    BoundaryApi.attachExistingBoundary({
      boundary: window,
      hostA: roomA,
      hostB: roomB,
    });

    const lamp = makeStuff(() => new Candle());
    lamp.setEmittedFlux(60);
    ContainmentApi.move(lamp, roomA);

    expect(vision().lightAt(roomB).intensity.rawValue()).toBe(60);
    BoundaryApi.destruct(window);
    expect(vision().lightAt(roomB)).toBe(Light.ZERO);
  });
});
