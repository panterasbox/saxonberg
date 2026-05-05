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
    expect(door.shortDescription).toBe('');
    expect(door.longDescription).toBe('');
    expect(door.getKeywords()).toEqual([]);
    expect(door.isOpen).toBe(false);
  });

  it('accepts post-construction field assignment', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'heavy oak door';
    door.longDescription = 'An iron-banded slab of oak.';
    door.keywords = ['portal'];
    door.isOpen = true;

    expect(door.shortDescription).toBe('heavy oak door');
    expect(door.longDescription).toBe('An iron-banded slab of oak.');
    expect(door.isOpen).toBe(true);
    expect(door.getKeywords()).toContain('portal');
  });

  it('normalizes keywords assigned via the setter (lowercase, trim, dedupe)', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'heavy oak door';
    door.keywords = ['Oak', '  ', 'OLD', 'oak'];

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
    expect(door.isOpen).toBe(false);
  });

  it('keywords setter rejects non-arrays with TypeError', () => {
    const door = makeStuff(() => new Door());
    expect(() => {
      (door as unknown as { keywords: unknown }).keywords = 'oak';
    }).toThrow(TypeError);
  });

  it('open() and close() flip state idempotently', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'gate';
    door.open();
    expect(door.isOpen).toBe(true);
    door.open();
    expect(door.isOpen).toBe(true);
    door.close();
    expect(door.isOpen).toBe(false);
    door.close();
    expect(door.isOpen).toBe(false);
  });

  it('getKeywords() merges explicit keywords with shortDescription tokens', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'Heavy Oak Door';
    door.keywords = ['portal'];

    const kw = door.getKeywords();
    expect(kw).toContain('portal');
    expect(kw).toContain('heavy');
    expect(kw).toContain('oak');
    expect(kw).toContain('door');
  });

  it('composes the expected mixins', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'gate';
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
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.shortDescription = 'oak door';

    a.addBidirectionalExit(b, 'north', { door });

    expect(door.attachedTo.size).toBe(2);
    expect(door.attachedTo.has(a.exits.get('north')!)).toBe(true);
    expect(door.attachedTo.has(b.exits.get('south')!)).toBe(true);
  });

  it('door.detach() clears every Exit.door and empties attachedTo', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.shortDescription = 'oak door';
    a.addBidirectionalExit(b, 'north', { door });

    const aNorth = a.exits.get('north')!;
    const bSouth = b.exits.get('south')!;

    door.detach();

    expect(door.attachedTo.size).toBe(0);
    expect(aNorth.door).toBeNull();
    expect(bSouth.door).toBeNull();
  });

  it('detach + ContainmentApi.move plants the broken door in a location', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.shortDescription = 'oak door';
    a.addBidirectionalExit(b, 'north', { door });

    door.detach();
    ContainmentApi.move(door, a);

    expect(a.getContents()).toContain(door);
    expect(door.environment).toBe(a);
  });

  it('re-installing a detached door updates attachedTo correctly', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);
    zone.addRoom(c, 1, 0, 0);

    const door = makeStuff(() => new Door());
    door.shortDescription = 'oak door';
    a.addBidirectionalExit(b, 'north', { door });
    expect(door.attachedTo.size).toBe(2);

    door.detach();
    expect(door.attachedTo.size).toBe(0);

    // Reinstall on a different exit pair.
    a.addBidirectionalExit(c, 'east', { door });
    expect(door.attachedTo.size).toBe(2);
    expect(a.exits.get('east')!.door).toBe(door);
    expect(c.exits.get('west')!.door).toBe(door);
  });

  it('Exit.prepareDestroy unhooks itself from door.attachedTo', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);

    const door = makeStuff(() => new Door());
    door.shortDescription = 'oak door';

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
    expect(door.attachedTo.has(exit)).toBe(true);

    StuffApi.destruct(exit);
    expect(door.attachedTo.has(exit)).toBe(false);
  });
});
