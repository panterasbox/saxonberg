/**
 * ⭐ Homes (size-and-carrying D14): putting a thing in a container you carry
 * makes it its home; a home is forgotten when either end leaves the body;
 * it persists by contents path — never a stuffId — and comes back after a
 * restart.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, wornBag } from './carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';
import type { CaptureContext, HomesSlice, HydrateContext } from '../../persistence/PersistenceSlice';
import type { Stuff } from '../../stuff/Stuff';

/** The contributor's own hooks, as the persistence spine finds them. */
function carryingHooks(host: Stuff) {
  const c = MixinApi.getPersistenceContributors(host.constructor as never).find((x) => x.key === 'CarryingMixin');
  if (!c?.captureSlice || !c.hydrateSlice) throw new Error('CarryingMixin contributes no slice');
  return c;
}

/** A capture context whose top-level order is the body's own contents. */
function ctxFor(host: Stuff & { getContents(): Stuff[] }): CaptureContext {
  return {
    indexOf: (item: unknown) => host.getContents().indexOf(item as Stuff),
  } as unknown as CaptureContext;
}

describe('Carrying — homes (D14)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('`put` into a container you carry makes it the home', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, me);
    const plan2 = ContainmentApi.putPlanFor(compass, pouch, { by: me });
    expect(plan2.ok).toBe(true);
    if (plan2.ok) plan2.onComplete();
    expect(compass.getContainer()).toBe(pouch);
    expect(me.homeOf(compass)).toBe(pouch);
  });

  it('forgotten when the thing leaves the body', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, pouch);
    me.setHome(compass, pouch);
    ContainmentApi.move(compass, room);
    expect(me.homeOf(compass)).toBeNull();
    ContainmentApi.move(compass, me);
    expect(me.homeOf(compass)).toBeNull();
  });

  it('captured by contents path and restored onto the same things', async () => {
    const { me, plan } = makeBody();
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, satchel); // carried in the satchel, home the pouch
    me.setHome(compass, pouch);
    const hooks = carryingHooks(me);
    const slice = hooks.captureSlice!(me, ctxFor(me)) as HomesSlice;
    expect(slice.homes).toHaveLength(1);
    const [entry] = slice.homes;
    expect(entry!.item.kind === 'path' && entry!.item.path).toEqual([me.getContents().indexOf(satchel), 0]);
    expect(JSON.stringify(slice)).not.toContain(compass.stuffId);

    // A fresh body in the same shape (what a restore rebuilds).
    const { me: back, plan: plan2 } = makeBody();
    const pouch2 = wornBag(back, plan2, 'pouch', 'torso');
    const satchel2 = wornBag(back, plan2, 'satchel', 'torso');
    const compass2 = tool('compass', 0.2);
    ContainmentApi.move(compass2, satchel2);
    // Same kinds at the same places (the path's guard).
    for (const [a, b] of [
      [pouch, pouch2],
      [satchel, satchel2],
      [compass, compass2],
    ] as const) {
      expect(a.getTemplatePath()).toBe(b.getTemplatePath());
    }
    await hooks.hydrateSlice!(back, slice, {} as HydrateContext);
    expect(back.homeOf(compass2)).toBe(pouch2);
  });
});
