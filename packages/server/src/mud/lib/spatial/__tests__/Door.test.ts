import { describe, it, expect, afterEach } from 'vitest';
import { Door } from '../Door';
import { Exit } from '../Exit';
import { CartesianZone } from '../CartesianZone';
import { CartesianLocation } from '../CartesianLocation';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * Door has a no-arg constructor — fields are populated either by the
 * clone-pipeline hydrator (via the mixin setters) or, in unit tests, by
 * direct property assignment after construction. The setters on
 * `SealableMixin.isOpen` and `PerceptibleMixin.keywords` enforce the
 * shape of those fields regardless of the entry path.
 */

describe('Door', () => {
  it('constructs with sensible defaults', () => {
    const door = makeStuff(() => new Door());
    expect(door.getShortDescription()).toBe('');
    expect(door.getLongDescription()).toBe('');
    expect(door.getKeywords()).toEqual([]);
    expect(door.getIsOpen()).toBe(false);
  });

  it('accepts post-construction field assignment', () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('heavy oak door');
    door.setLongDescription('An iron-banded slab of oak.');
    door.setKeywords(['portal']);
    door.setOpen(true);

    expect(door.getShortDescription()).toBe('heavy oak door');
    expect(door.getLongDescription()).toBe('An iron-banded slab of oak.');
    expect(door.getIsOpen()).toBe(true);
    expect(door.getKeywords()).toContain('portal');
  });

  it('normalizes keywords assigned via the setter (lowercase, trim, dedupe)', () => {
    const door = makeStuff(() => new Door());
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

  it('isOpen setter rejects non-boolean values with TypeError', () => {
    const door = makeStuff(() => new Door());
    expect(() => {
      (door as unknown as { isOpen: unknown }).isOpen = 1;
    }).toThrow(TypeError);
    expect(() => {
      (door as unknown as { isOpen: unknown }).isOpen = 'true';
    }).toThrow(TypeError);
    expect(door.getIsOpen()).toBe(false);
  });

  it('keywords setter rejects non-arrays with TypeError', () => {
    const door = makeStuff(() => new Door());
    expect(() => {
      (door as unknown as { keywords: unknown }).keywords = 'oak';
    }).toThrow(TypeError);
  });

  it('open() and close() flip state idempotently', () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('gate');
    door.open();
    expect(door.getIsOpen()).toBe(true);
    door.open();
    expect(door.getIsOpen()).toBe(true);
    door.close();
    expect(door.getIsOpen()).toBe(false);
    door.close();
    expect(door.getIsOpen()).toBe(false);
  });

  it('getKeywords() merges explicit keywords with shortDescription tokens', () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('Heavy Oak Door');
    door.setKeywords(['portal']);

    const kw = door.getKeywords();
    expect(kw).toContain('portal');
    expect(kw).toContain('heavy');
    expect(kw).toContain('oak');
    expect(kw).toContain('door');
  });

  it('composes the expected mixins', () => {
    const door = makeStuff(() => new Door());
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

describe('Door attachedTo back-reference + break/install', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('addBidirectionalExit populates attachedTo with both exits', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');

    a.addBidirectionalExit(b, 'north', { door });

    expect(door.getAttachedTo().size).toBe(2);
    expect(door.hasAttached(a.getExits().get('north')!)).toBe(true);
    expect(door.hasAttached(b.getExits().get('south')!)).toBe(true);
  });

  it('door.detach() clears every Exit.door and empties attachedTo', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    a.addBidirectionalExit(b, 'north', { door });

    const aNorth = a.getExits().get('north')!;
    const bSouth = b.getExits().get('south')!;

    door.detach();

    expect(door.getAttachedTo().size).toBe(0);
    expect(aNorth.getDoor()).toBeNull();
    expect(bSouth.getDoor()).toBeNull();
  });

  it('detach + ContainmentApi.move plants the broken door in a location', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    a.addBidirectionalExit(b, 'north', { door });

    door.detach();
    ContainmentApi.move(door, a);

    expect(a.getContents()).toContain(door);
    expect(door.getContainer()).toBe(a);
  });

  it('re-installing a detached door updates attachedTo correctly', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 1, 0, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    a.addBidirectionalExit(b, 'north', { door });
    expect(door.getAttachedTo().size).toBe(2);

    door.detach();
    expect(door.getAttachedTo().size).toBe(0);

    // Reinstall on a different exit pair.
    a.addBidirectionalExit(c, 'east', { door });
    expect(door.getAttachedTo().size).toBe(2);
    expect(a.getExits().get('east')!.getDoor()).toBe(door);
    expect(c.getExits().get('west')!.getDoor()).toBe(door);
  });

  it('Exit.prepareDestroy unhooks itself from door.attachedTo', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');

    const exit = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
      door,
    }));
    // Registration of the exit in the door's attachedTo set is the
    // job of `addExit` — that's the only way an Exit reaches its
    // host post-construction (and post-Proxy).
    a.addExit(exit);
    expect(door.hasAttached(exit)).toBe(true);

    StuffApi.destruct(exit);
    expect(door.hasAttached(exit)).toBe(false);
  });
});
