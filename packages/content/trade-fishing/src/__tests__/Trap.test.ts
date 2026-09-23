/**
 * Trap (fishing D13) — one class, two rows, reconcile at the haul.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Trap from '../thing/Trap';

const pot = (): Trap => {
  const t = makeStuff(() => new Trap());
  t.setDrawPerHour(0.4);
  t.setTakesRoles(['bait', 'forage']);
  t.setCapacity(2);
  return t;
};
const net = (): Trap => {
  const t = makeStuff(() => new Trap());
  t.setDrawPerHour(20);
  t.setTakesRoles(['bait', 'forage', 'predator', 'apex']);
  t.setCapacity(30);
  return t;
};
/** The confluence at one kilometre: crab 60, forage ~100 (mullet, eel, a few carp), sturgeon 2. */
const REACH = [
  { role: 'bait' as const, level: 60, capacity: 60 },
  { role: 'forage' as const, level: 100, capacity: 100 },
  { role: 'apex' as const, level: 2, capacity: 2 },
];

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('the expectation', () => {
  it('a pot over a game-hour at a full reach takes under one crab; over a night, its two', () => {
    expect(pot().expectedTake(1, REACH)).toBeCloseTo(0.8, 6);
    expect(pot().expectedTake(8, REACH)).toBe(2); // capped by what it holds
  });

  it('⭐ a net takes thirty in an afternoon — and only what the water still holds', () => {
    expect(net().expectedTake(3, REACH)).toBe(30);
    // Five lifts of thirty empty the confluence's ~160: the fourth is
    // thin, the fifth is empty — the requirements' afternoon.
    const thin = [{ role: 'forage' as const, level: 3, capacity: 100 }];
    // 20/h × 3 h × (3/100) = 1.8 — the record is nearly empty and the net knows it.
    expect(net().expectedTake(3, thin)).toBeCloseTo(1.8, 2);
  });

  it('a pot takes nothing of an apex; a net takes it', () => {
    const apexOnly = [{ role: 'apex' as const, level: 2, capacity: 2 }];
    expect(pot().expectedTake(24, apexOnly)).toBe(0);
    expect(net().expectedTake(24, apexOnly)).toBe(2);
  });

  it('no time, no take; a set trap is fixed and vetoes eviction, a lifted one is neither', () => {
    const t = pot();
    expect(t.expectedTake(0, REACH)).toBe(0);
    expect(t.isSet()).toBe(false);
    expect(t.canEvict({} as never).ok).not.toBe(false);
    t.markSet(1000, 'kestrel:confluence', '/platform/agent/Avatar/x');
    expect(t.isSet()).toBe(true);
    expect(t.fixedInPlace).toBe(true);
    expect(t.canEvict({} as never).ok).toBe(false);
    t.markLifted();
    expect(t.isSet()).toBe(false);
    expect(t.fixedInPlace).toBe(false);
  });

  it('an unknown role authored on a row is dropped, not kept as a silent nothing', () => {
    const t = makeStuff(() => new Trap());
    t.setTakesRoles(['bait', 'king' as never]);
    expect(t.getTakesRoles()).toEqual(['bait']);
  });
});
