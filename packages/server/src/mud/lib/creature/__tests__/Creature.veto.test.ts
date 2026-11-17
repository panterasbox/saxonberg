/**
 * ⭐⭐ Nothing sits loose on a body — every body's rule, and it fails closed
 * (size and carrying W8). A body that does not carry has no honest place
 * for a loose arrival, so `move` throws; no unloaded species row lets a
 * thing through. The admissions — seated, placed, an agent, admitted (the
 * restore) — pass. The capability composes only on the classes that carry.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi, ContainmentError } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Creature } from '../Creature';
import Beast from '../../../platform/agent/Beast';
import DraftAnimal from '../../../platform/agent/DraftAnimal';
import KeptAnimal from '../../../platform/agent/KeptAnimal';
import { Character } from '../../character/Character';
import PrimaryAvatar from '../../../platform/agent/PrimaryAvatar';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Body, tool } from '../../slot/__tests__/carrying-fixture';
import Location from '../../location/Location';

const mug = () => tool('mug', 0.35, [0.09, 0.09, 0.1]);

describe('Creature.arrivalFor — nothing loose on a body, fail closed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a body that does not carry: move throws nowhere-to-carry, nothing moved', () => {
    const wolf = makeStuff(() => new Creature());
    const m = mug();
    expect(() => ContainmentApi.move(m, wolf)).toThrow(ContainmentError);
    expect(m.getContainer()).toBeNull();
  });

  it('a carrier whose species row is not loaded is NOT let off (no plan escape)', () => {
    // A fresh carrier with no species: no hands, nothing worn — nowhere.
    const bare = makeStuff(() => new Body());
    expect(() => ContainmentApi.move(mug(), bare)).toThrow(/has no place/);
  });

  it('the admissions pass: seated, placed (host-follow), an agent, admitted', () => {
    const wolf = makeStuff(() => new Creature());
    const room = makeStuff(() => new Location());
    ContainmentApi.move(wolf, room);
    // admitted — the restore's path
    // (`admitWhile` is gated to the body and the restore; the test stands in.)
    const a = mug();
    const admit = vi.spyOn(wolf, 'isAdmitting').mockReturnValue(true);
    ContainmentApi.move(a, wolf);
    admit.mockRestore();
    expect(a.getContainer()).toBe(wolf);
    // an agent — a rider
    const rider = makeStuff(() => new Creature());
    ContainmentApi.move(rider, wolf);
    expect(rider.getContainer()).toBe(wolf);
    // the rule reads the mark and the pair
    const b = mug();
    expect(wolf.arrivalFor(b, { placed: true }).kind).toBe('contents');
    expect(wolf.arrivalFor(b).kind).toBe('refuse');
  });

  it('a non-carrier restored with contents is not refused (the restore admits every body)', () => {
    const hog = makeStuff(() => new Beast());
    const halter = mug();
    vi.spyOn(hog, 'isAdmitting').mockReturnValue(true);
    ContainmentApi.move(halter, hog);
    expect(hog.getContents()).toContain(halter);
  });

  it('who carries: Character, DraftAnimal, KeptAnimal; not Creature, not Beast', () => {
    expect(MixinApi.hasMixin(Character, Mixins.Carrying)).toBe(true);
    expect(MixinApi.hasMixin(PrimaryAvatar, Mixins.Carrying)).toBe(true);
    expect(MixinApi.hasMixin(DraftAnimal, Mixins.Carrying)).toBe(true);
    expect(MixinApi.hasMixin(KeptAnimal, Mixins.Carrying)).toBe(true);
    expect(MixinApi.hasMixin(Creature, Mixins.Carrying)).toBe(false);
    expect(MixinApi.hasMixin(Beast, Mixins.Carrying)).toBe(false);
  });
});
