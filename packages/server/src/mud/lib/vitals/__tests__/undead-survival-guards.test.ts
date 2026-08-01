/**
 * `undead` is animate WITHOUT being alive — and the survival drivers must
 * read it that way.
 *
 * Every driver that can kill you asks a question about the body before it
 * runs. Spelled "is it dead?", an `undead` body (a shade) answers "no" and
 * gets driven like a living one: it starves, it suffocates, it burns fuel
 * defending a setpoint, and it can die a second time. Spelled "is it a
 * living body?", it is inert — which is what a bodiless self should be.
 *
 * The metabolism case is not a rewording: `reconcileMetabolism` had no
 * lifecycle guard at all, so a CORPSE went on metabolizing. The guard is
 * new there, and this file is what keeps it.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;

/** Six game-hours — long enough that basal drain is plainly visible on a
 *  living body, short enough to keep the parallel control cheap. */
const A_WHILE = 60 * 60 * 6;

/** Push game-time forward, reading a reserve so the lazy reconcile fires. */
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getReserve('endurance');
    remaining -= s;
  }
}

const sat = (c: Creature) => c.getReserve('satiation')!.current.rawValue();
const hyd = (c: Creature) => c.getReserve('hydration')!.current.rawValue();
const end = (c: Creature) => c.getReserve('endurance')!.current.rawValue();

/**
 * A body with mass — basal drain is mass-scaled, so a massless fixture
 * burns nothing and every assertion below would pass vacuously.
 */
function body(state: string): Creature {
  const c = makeStuff(() => new Creature());
  c.setMass(Quantity.of(70, 'kg')); // reference mass → basal factor 1
  c.setLifecycleState(state);
  return c;
}

describe('survival drivers gate on "is a living body", not "is dead"', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    // Deliberately NOT `StuffApi.clearAll()`: it wipes the WorldClock
    // registry, after which `metabolicNowSeconds()` returns null and the
    // reconcile returns early — every assertion in this file would then
    // pass without anything having been driven at all. Fresh bodies per
    // test keep them independent (the shipped metabolism suite's rule).
  });

  it('an undead body does not starve or dehydrate', () => {
    const shade = body('undead');
    const satiation = sat(shade);
    const hydration = hyd(shade);

    // The control below runs exactly this long on a living body.
    advance(shade, A_WHILE);

    expect(sat(shade)).toBe(satiation);
    expect(hyd(shade)).toBe(hydration);
    expect(shade.getLifecycleState()).toBe('undead');
    expect(shade.getCauseOfDeath()).toBeNull();
  });

  it('a corpse does not metabolize either (the guard was missing outright)', () => {
    const corpse = body('dead');
    const satiation = sat(corpse);

    advance(corpse, A_WHILE);

    expect(sat(corpse)).toBe(satiation);
  });

  it('a LIVING body still metabolizes — the guard is not a blanket off-switch', () => {
    // The control, deliberately parallel to the undead case above: the
    // SAME elapsed game-time, differing only in lifecycle state. Without
    // it, the guard could be an off-switch for everyone and these tests
    // would still pass.
    const living = body('alive');
    const satiation = sat(living);

    advance(living, A_WHILE);

    expect(sat(living)).toBeLessThan(satiation);
  });

  it('an undead body does not defend a thermal setpoint', () => {
    const shade = body('undead');
    // Drop the core well below the defended band. A living endotherm
    // answers by spending reserve to rewarm; a shade must not.
    shade.setVitalSign('coreTemperature', Quantity.of(300, 'K'));
    const endurance = end(shade);

    advance(shade, 60 * 60);

    expect(end(shade)).toBe(endurance);
    expect(shade.getLifecycleState()).toBe('undead');
  });

  it('an undead body cannot die a second time', () => {
    const shade = body('undead');

    advance(shade, A_WHILE * 30);

    expect(shade.getLifecycleState()).toBe('undead');
    expect(shade.isDead()).toBe(false);
    expect(shade.getCauseOfDeath()).toBeNull();
  });

  it('isAlive() and isDead() are not complements — the reason all of this exists', () => {
    const shade = body('undead');
    expect(shade.isAlive()).toBe(false);
    expect(shade.isDead()).toBe(false);
    expect(shade.isUndead()).toBe(true);
  });
});
