import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { Boundary } from '../Boundary';
import Exit from '../Exit';
import Location from '../../location/Location';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import PlatformBoundary from '../../../platform/thing/Boundary';
import Door from '../../../platform/thing/Door';
import Window from '../../../platform/thing/Window';
import { BoundaryApi } from '../../../api/boundary';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { ContainableMixin } from '../../spatial/Containable';
import { MobileMixin } from '../../spatial/Mobile';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';

class TestMover extends NamedMixin(MobileMixin(ContainableMixin(Idea))) {}

describe('Boundary — one object, two sides', () => {
  let zone: CartesianZone;
  let a: Location;
  let b: Location;

  beforeEach(() => {
    seedKernelContentStore();
    zone = makeStuff(() => new CartesianZone());
    a = makeStuff(() => new Location());
    b = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  function pair(): [Exit, Exit] {
    const north = makeStuff(() => new Exit({ direction: 'north', source: a, destination: b }));
    const south = makeStuff(() => new Exit({ direction: 'south', source: b, destination: a }));
    return [north, south];
  }

  it('is Visible and Perceptible', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    expect(MixinApi.isVisible(boundary)).toBe(true);
    expect(MixinApi.isPerceptible(boundary)).toBe(true);
  });

  it('starts with no sides', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    expect(boundary.getSides()).toEqual([null, null]);
  });

  it('sides / sideOf / otherSide walk the pair, A attached first', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    const [north, south] = pair();
    BoundaryApi.attach(boundary, north, south);

    expect(boundary.getSides()).toEqual([north, south]);
    expect(boundary.sideOf(north)).toBe('A');
    expect(boundary.sideOf(south)).toBe('B');
    expect(boundary.otherSide(north)).toBe(south);
    expect(boundary.otherSide(south)).toBe(north);
    expect(north.getBoundary()).toBe(boundary);
    expect(south.getBoundary()).toBe(boundary);

    const stranger = makeStuff(() => new Exit({ direction: 'east', source: a, destination: b }));
    expect(boundary.sideOf(stranger)).toBeNull();
    expect(boundary.otherSide(stranger)).toBeNull();
  });

  it('otherSide is null while the far side is unbuilt', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    const [north] = pair();
    BoundaryApi.attach(boundary, north);
    expect(boundary.otherSide(north)).toBeNull();
  });

  describe('the channel table', () => {
    it('defaults: all open, nothing shut; a bare boundary is open', async () => {
      const boundary = await StuffApi.create(() => new Boundary());
      expect(boundary.isOpen()).toBe(true);
      expect(boundary.transmissivity('light', 'A', 'B')).toBe(1);
      expect(boundary.getChannels().shut).toEqual({
        movement: 0, light: 0, sight: 0, sound: 0, smell: 0,
      });
    });

    it('merges a partial table over the defaults', async () => {
      const boundary = await StuffApi.create(() => new Boundary());
      boundary.setChannels({ open: { sound: 0.4 }, shut: { smell: 0.1 } });
      const t = boundary.getChannels();
      expect(t.open).toEqual({ movement: 1, light: 1, sight: 1, sound: 0.4, smell: 1 });
      expect(t.shut.smell).toBe(0.1);
      expect(t.shut.light).toBe(0);
      expect(boundary.transmissivity('sound', 'A', 'B')).toBe(0.4);
    });

    it('⚠ refuses an unknown channel key — a misspelt `ligth:` must not read as dark', async () => {
      const boundary = await StuffApi.create(() => new Boundary());
      expect(() =>
        boundary.setChannels({ open: { ligth: 0.5 } as never }),
      ).toThrow(/not a channel/);
    });

    it('refuses an unknown state', async () => {
      const boundary = await StuffApi.create(() => new Boundary());
      expect(() =>
        boundary.setChannels({ ajar: { light: 0.5 } } as never),
      ).toThrow(/not a state/);
    });

    it('refuses a value outside [0, 1]', async () => {
      const boundary = await StuffApi.create(() => new Boundary());
      expect(() => boundary.setChannels({ open: { light: 1.5 } })).toThrow(RangeError);
      expect(() => boundary.setChannels({ shut: { sound: -0.1 } })).toThrow(RangeError);
    });

    it('a shut door reads its shut table; transmissivityInto reads the far side', async () => {
      const door = await StuffApi.create(() => new Door());
      door.setChannels({ shut: { sound: 0.3 } });
      const [north, south] = pair();
      BoundaryApi.attach(door, north, south);
      expect(door.isOpen()).toBe(false);
      expect(door.transmissivityInto('sound', north)).toBe(0.3);
      expect(door.transmissivityInto('light', south)).toBe(0);
      door.setOpen(true);
      expect(door.transmissivityInto('light', south)).toBe(1);
    });
  });

  it('getKeywords folds the short description tokens', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('heavy oak door');
    expect(door.getKeywords()).toEqual(expect.arrayContaining(['heavy', 'oak', 'door']));
  });

  it('⭐ a fixed grating refuses close', async () => {
    const grating = await StuffApi.create(() => new PlatformBoundary());
    grating.setShortDescription('iron grating');
    grating.setFixed(true);
    grating.setOpen(true);
    const mover = makeStuff(() => new TestMover());
    const veto = grating.canClose(mover);
    expect(veto).toMatchObject({ ok: false, reason: expect.stringMatching(/fixed open/) });
  });

  describe('Exit.wayState — one word per way', () => {
    it("a way with no boundary is 'open'", () => {
      const [north] = pair();
      expect(north.wayState()).toBe('open');
    });

    it("a shut door is 'shut', an open one 'open', a locked one 'locked'", async () => {
      const door = await StuffApi.create(() => new Door());
      const [north, south] = pair();
      BoundaryApi.attach(door, north, south);
      expect(north.wayState()).toBe('shut');
      door.setOpen(true);
      expect(north.wayState()).toBe('open');
      expect(south.wayState()).toBe('open');
      door.setOpen(false);
      door.setLocked(true);
      expect(north.wayState()).toBe('locked');
      expect(south.wayState()).toBe('locked');
    });

    it("a window is 'window', open or shut", async () => {
      const glass = await StuffApi.create(() => new Window());
      const [north, south] = pair();
      BoundaryApi.attach(glass, north, south);
      expect(north.wayState()).toBe('window');
      glass.setOpen(true);
      expect(south.wayState()).toBe('window');
    });

    it('wayRecord carries the state and the boundary', async () => {
      const door = await StuffApi.create(() => new Door());
      door.setShortDescription('oak door');
      const [north, south] = pair();
      BoundaryApi.attach(door, north, south);
      const rec = north.wayRecord();
      expect(rec.direction).toBe('north');
      expect(rec.state).toBe('shut');
      expect(rec.boundary?.stuffId).toBe(door.stuffId);
    });
  });

  describe('Exit.canTraverse through a window', () => {
    it('⭐ refuses, open or shut: the window is not a way through', async () => {
      const glass = await StuffApi.create(() => new Window());
      glass.setShortDescription('west window');
      const [north, south] = pair();
      BoundaryApi.attach(glass, north, south);
      const mover = makeStuff(() => new TestMover());
      ContainmentApi.move(mover, a);

      const shut = await north.canTraverse(mover);
      expect(shut.ok).toBe(false);
      expect(shut.gate).toBe('door');
      expect(shut.reason).toMatch(/west window is not a way through\./i);

      glass.setOpen(true);
      const open = await north.canTraverse(mover);
      expect(open.ok).toBe(false);
      expect(open.reason).toMatch(/is not a way through/);
    });
  });
});
