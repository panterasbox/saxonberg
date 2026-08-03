import { describe, it, expect, beforeEach } from 'vitest';
import Exit from '../Exit';
import CartesianZone from '../../../obj/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

// Phase 1 (D1): Exit.hidden is subsumed by ConcealableMixin. A hidden exit
// is an exit at the migration-default concealment band; getObviousExits()
// still drops it (it reads isHidden(), now derived from the band).
describe('Exit concealment (Exit.hidden subsumed)', () => {
  let zone: CartesianZone;
  let locA: CartesianLocation;
  let locB: CartesianLocation;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
  });

  it('composes ConcealableMixin (Exit carries a concealment band)', () => {
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: locA, destination: locB }),
    );
    expect(MixinApi.hasMixin(exit, Mixins.Concealable)).toBe(true);
    expect(MixinApi.isConcealable(exit)).toBe(true);
  });

  it('a plain exit is obvious and not hidden', () => {
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: locA, destination: locB }),
    );
    expect(exit.getConcealment()).toBe('obvious');
    expect(exit.isConcealed()).toBe(false);
    expect(exit.isHidden()).toBe(false);
  });

  it('hidden: true ⇒ concealed at the migration-default band ⇒ isHidden', () => {
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destination: locB,
          hidden: true,
        }),
    );
    expect(exit.isConcealed()).toBe(true);
    expect(exit.isHidden()).toBe(true);
    // The migration default is `hidden` (the seeded literal, unwarmed).
    expect(exit.getConcealment()).toBe('hidden');
  });

  it('setConcealment round-trips and drives isHidden', () => {
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: locA, destination: locB }),
    );
    exit.setConcealment('deep');
    expect(exit.getConcealment()).toBe('deep');
    expect(exit.isHidden()).toBe(true);

    exit.setConcealment('obvious');
    expect(exit.getConcealment()).toBe('obvious');
    expect(exit.isHidden()).toBe(false);
  });

  it('setHidden forwards to the concealment band (backcompat)', () => {
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: locA, destination: locB }),
    );
    exit.setHidden(true);
    expect(exit.isHidden()).toBe(true);
    expect(exit.getConcealment()).toBe('hidden');

    exit.setHidden(false);
    expect(exit.isHidden()).toBe(false);
    expect(exit.getConcealment()).toBe('obvious');

    // setConcealment then setHidden(false) clears any band back to obvious.
    exit.setConcealment('buried');
    expect(exit.isHidden()).toBe(true);
    exit.setHidden(false);
    expect(exit.getConcealment()).toBe('obvious');
  });

  it('getObviousExits still drops a concealed exit', async () => {
    const hidden = makeStuff(
      () =>
        new Exit({
          direction: 'up',
          source: locA,
          destination: locB,
          hidden: true,
        }),
    );
    const visible = makeStuff(
      () => new Exit({ direction: 'down', source: locA, destination: locB }),
    );
    await locA.addExit(hidden);
    await locA.addExit(visible);

    const directions = locA.getObviousExits().map((e) => e.getDirection());
    expect(directions).toContain('down');
    expect(directions).not.toContain('up');

    // Reveal it by clearing the band → now obvious.
    hidden.setConcealment('obvious');
    const after = locA.getObviousExits().map((e) => e.getDirection());
    expect(after).toContain('up');
  });
});
