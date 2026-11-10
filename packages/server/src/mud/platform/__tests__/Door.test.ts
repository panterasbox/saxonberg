import "../../../test-bootstrap";
import { describe, it, expect, afterEach , beforeEach } from 'vitest';
import Door from '../thing/Door';
import Exit from '../../lib/boundary/Exit';
import CartesianZone from '../idea/location/CartesianZone';
import Location from '../../lib/location/Location';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import { StuffApi } from '../../api/stuff';
import { BoundaryApi } from '../../api/boundary';
import { ContainmentApi } from '../../api/containment';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../lib/security/__tests__/test-setup';

/**
 * Door has a no-arg constructor — fields are populated either by the
 * clone-pipeline hydrator (via the mixin setters) or, in unit tests, by
 * direct property assignment after construction. The setters on
 * `SealableMixin.isOpen` and `PerceptibleMixin.keywords` enforce the
 * shape of those fields regardless of the entry path.
 */

describe('Door', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  it('constructs with sensible defaults', async () => {
    const door = await StuffApi.create(() => new Door());
    expect(door.getShortDescription()).toBe('');
    expect(door.getLongDescription()).toBe('');
    expect(door.getKeywords()).toEqual([]);
    expect(door.isOpen()).toBe(false);
  });

  it('accepts post-construction field assignment', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('heavy oak door');
    door.setLongDescription('An iron-banded slab of oak.');
    door.setKeywords(['portal']);
    door.setOpen(true);

    expect(door.getShortDescription()).toBe('heavy oak door');
    expect(door.getLongDescription()).toBe('An iron-banded slab of oak.');
    expect(door.isOpen()).toBe(true);
    expect(door.getKeywords()).toContain('portal');
  });

  it('normalizes keywords assigned via the setter (lowercase, trim, dedupe)', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('heavy oak door');
    door.setKeywords(['Oak', '  ', 'OLD', 'oak']);

    const kw = door.getKeywords();
    expect(kw).toContain('oak');
    expect(kw).toContain('old');
    expect(kw).not.toContain('');
    expect(kw).not.toContain('  ');
    // Dedupe: the duplicate 'Oak'/'oak' results in a single entry.
    expect(kw.filter((k) => k === 'oak')).toHaveLength(1);
  });

  it('setOpen rejects non-boolean values with TypeError', async () => {
    const door = await StuffApi.create(() => new Door());
    expect(() => door.setOpen(1 as unknown as boolean)).toThrow(TypeError);
    expect(() => door.setOpen('true' as unknown as boolean)).toThrow(TypeError);
    expect(door.isOpen()).toBe(false);
  });

  it('keywords setter rejects non-arrays with TypeError', async () => {
    const door = await StuffApi.create(() => new Door());
    expect(() => {
      (door as unknown as { keywords: unknown }).keywords = 'oak';
    }).toThrow(TypeError);
  });

  it('open() and close() flip state idempotently', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('gate');
    door.open();
    expect(door.isOpen()).toBe(true);
    door.open();
    expect(door.isOpen()).toBe(true);
    door.close();
    expect(door.isOpen()).toBe(false);
    door.close();
    expect(door.isOpen()).toBe(false);
  });

  it('getKeywords() merges explicit keywords with shortDescription tokens', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('Heavy Oak Door');
    door.setKeywords(['portal']);

    const kw = door.getKeywords();
    expect(kw).toContain('portal');
    expect(kw).toContain('heavy');
    expect(kw).toContain('oak');
    expect(kw).toContain('door');
  });

  it('composes the expected mixins', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('gate');
    expect(MixinApi.isSealable(door)).toBe(true);
    expect(MixinApi.isPerceptible(door)).toBe(true);
    expect(MixinApi.isVisible(door)).toBe(true);
    // Phase 4: Door is now a Thing — composes Containable so a broken
    // door can be moved into a Location and picked up.
    expect(MixinApi.isContainable(door)).toBe(true);
    expect(MixinApi.hasMixin(Door, Mixins.Containable)).toBe(true);
  });
});

describe('Door — one object, two sides; break/install', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  async function rooms(): Promise<[Location, Location, Location]> {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new Location());
    const b = makeStuff(() => new Location());
    const c = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 1, 0, 0);
    return [a, b, c];
  }

  it('addBidirectionalExit attaches both exits as the sides', async () => {
    const [a, b] = await rooms();
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');

    await a.addBidirectionalExit(b, 'north', { boundary: door });

    const aNorth = a.getExits().get('north')!;
    const bSouth = b.getExits().get('south')!;
    expect(door.getSides()).toEqual([aNorth, bSouth]);
    expect(aNorth.getBoundary()).toBe(door);
    expect(bSouth.getBoundary()).toBe(door);
  });

  it('⭐ locked from one side is locked from the other', async () => {
    const [a, b] = await rooms();
    const door = await StuffApi.create(() => new Door());
    await a.addBidirectionalExit(b, 'north', { boundary: door });
    door.lock();
    expect(a.getExit('north')!.wayState()).toBe('locked');
    expect(b.getExit('south')!.wayState()).toBe('locked');
  });

  it('BoundaryApi.detach of both sides frees every exit', async () => {
    const [a, b] = await rooms();
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { boundary: door });

    const aNorth = a.getExits().get('north')!;
    const bSouth = b.getExits().get('south')!;

    BoundaryApi.detach(...door.getSides().filter((x): x is Exit => x !== null));

    expect(door.getSides()).toEqual([null, null]);
    expect(aNorth.getBoundary()).toBeNull();
    expect(bSouth.getBoundary()).toBeNull();
    expect(aNorth.wayState()).toBe('open');
  });

  it('detach + ContainmentApi.move plants the broken door in a location', async () => {
    const [a, b] = await rooms();
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { boundary: door });

    BoundaryApi.detach(a.getExit('north')!, b.getExit('south')!);
    ContainmentApi.move(door, a);

    expect(a.getContents()).toContain(door);
    expect(door.getContainer()).toBe(a);
  });

  it('re-installing a detached door on another pair moves both sides', async () => {
    const [a, b, c] = await rooms();
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    await a.addBidirectionalExit(b, 'north', { boundary: door });

    BoundaryApi.detach(a.getExit('north')!, b.getExit('south')!);
    await a.addBidirectionalExit(c, 'east', { boundary: door });

    expect(a.getExits().get('east')!.getBoundary()).toBe(door);
    expect(c.getExits().get('west')!.getBoundary()).toBe(door);
    expect(a.getExits().get('north')!.getBoundary()).toBeNull();
  });

  it('a destroyed side self-heals out of the door (weak ref)', async () => {
    const [a, b] = await rooms();
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');

    const exit = makeStuff(() => new Exit({ direction: 'east', source: a, destination: b }));
    await a.addExit(exit);
    BoundaryApi.attach(door, exit);
    expect(door.sideOf(exit)).toBe('A');

    StuffApi.destruct(exit);
    expect(door.getSides()[0]).toBeNull();
  });
});
