/**
 * `Adornable.getFloor()` — the one read for *what is the ground here* —
 * and `applyAdornments`' rebuild.
 *
 * Before this, three resolvers each answered the same question by scanning
 * fixtures **then contents** for any Bulkable with a surface slot. That
 * shape made every open vessel standing on the floor a candidate for being
 * the floor, and the contents half was dead: no non-Floor row in
 * `packages/content` declares `surfaceBulk` at all.
 *
 * The rebuild half fixes a defect the applier's own docstring claimed was
 * already fixed — it said *"re-runs and rebuilds"* while the code only ever
 * added, so a CMS go-live (`restoreFromTemplate` re-hydrates a live clone)
 * doubled every authored fixture. With a floor in every room that would
 * have been two floors.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import CartesianLocation from '../../location/CartesianLocation';
import Thing from '../../stuff/Thing';
import Floor from '../../../platform/thing/Floor';
import { AdornmentMixin } from '../Adornment';
import { StuffApi } from '../../../api/stuff';
import { ChattelMixin } from '../../chattel/Chattel';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestFixture extends AdornmentMixin(Thing) {}
class TestHangable extends ChattelMixin(AdornmentMixin(Thing)) {}

describe('Adornable.getFloor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is null in a room with no fixtures at all', () => {
    const room = makeStuff(() => new CartesianLocation());
    expect(room.getFloor()).toBeNull();
  });

  it('is null in a room whose fixtures are not floors', () => {
    const room = makeStuff(() => new CartesianLocation());
    room.addFixture(makeStuff(() => new TestFixture()), 'sign:left');
    expect(room.getFloor()).toBeNull();
  });

  it('finds the floor among other fixtures, in any order', () => {
    const room = makeStuff(() => new CartesianLocation());
    room.addFixture(makeStuff(() => new TestFixture()), 'sign:left');
    const floor = makeStuff(() => new Floor());
    room.addFixture(floor, 'floor');
    room.addFixture(makeStuff(() => new TestFixture()), 'sconce:1');
    expect(room.getFloor()).toBe(floor);
  });

  it('⭐ a DRY floor is still the floor', () => {
    // The old resolvers keyed on `hasSurfaceBulk()`, so a floor with no
    // puddle slot was not the floor as far as any of them could tell —
    // which is exactly why `forge-floor` was invisible to two of them.
    const room = makeStuff(() => new CartesianLocation());
    const floor = makeStuff(() => new Floor());
    expect(floor.hasSurfaceBulk()).toBe(false);
    room.addFixture(floor, 'floor');
    expect(room.getFloor()).toBe(floor);
  });
});

describe('applyAdornments rebuilds rather than doubles', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a second hydrate leaves ONE fixture, not two', async () => {
    const room = makeStuff(() => new CartesianLocation());
    const first = makeStuff(() => new TestFixture());
    const second = makeStuff(() => new TestFixture());
    vi.spyOn(StuffApi, 'clone')
      .mockResolvedValueOnce(first as never)
      .mockResolvedValueOnce(second as never);
    vi.spyOn(StuffApi, 'destruct').mockResolvedValue(undefined as never);

    await room.applyAdornments([{ template: '/test/neon', slot: 'sign:left' }]);
    expect(room.getFixtures()).toHaveLength(1);

    await room.applyAdornments([{ template: '/test/neon', slot: 'sign:left' }]);
    expect(room.getFixtures()).toHaveLength(1);
    expect(room.getFixtures()[0]).toBe(second);
    expect(StuffApi.destruct).toHaveBeenCalledWith(first);
  });

  it('a room re-hydrated with a floor still has exactly one floor', async () => {
    const room = makeStuff(() => new CartesianLocation());
    const a = makeStuff(() => new Floor());
    const b = makeStuff(() => new Floor());
    vi.spyOn(StuffApi, 'clone')
      .mockResolvedValueOnce(a as never)
      .mockResolvedValueOnce(b as never);
    vi.spyOn(StuffApi, 'destruct').mockResolvedValue(undefined as never);

    await room.applyAdornments(['/test/floor']);
    await room.applyAdornments(['/test/floor']);

    expect(room.getFixtures().filter((f) => f instanceof Floor)).toHaveLength(1);
    expect(room.getFloor()).toBe(b);
  });

  it('⚠ a fixture a PLAYER hung survives the rebuild', async () => {
    // Chattel is owner-persisted, one collection over, and was never in
    // `_appliedFixtures` — so the clear pass must not see it. Getting this
    // wrong would destroy a bought lamp on every CMS go-live.
    const room = makeStuff(() => new CartesianLocation());
    const hung = makeStuff(() => new TestHangable());
    room.addFixture(hung, 'hook:1');

    const applied = makeStuff(() => new TestFixture());
    vi.spyOn(StuffApi, 'clone').mockResolvedValue(applied as never);
    vi.spyOn(StuffApi, 'destruct').mockResolvedValue(undefined as never);

    await room.applyAdornments(['/test/neon']);
    await room.applyAdornments(['/test/neon']);

    expect(room.hasFixture(hung)).toBe(true);
    expect(StuffApi.destruct).not.toHaveBeenCalledWith(hung);
  });
});
