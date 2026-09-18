/**
 * Trap (fishing D13) — one class, two rows, reconcile at the lift.
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
  t.setDrawPerHour(6);
  t.setTakesRoles(['bait', 'forage', 'predator', 'apex']);
  t.setCapacity(12);
  return t;
};
const REACH = [
  { role: 'bait' as const, level: 360, capacity: 360 },
  { role: 'forage' as const, level: 420, capacity: 420 },
  { role: 'apex' as const, level: 6, capacity: 6 },
];

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('the expectation', () => {
  it('a pot over a game-hour at a full reach takes under one crab; over a night, its two', () => {
    expect(pot().expectedTake(1, REACH)).toBeCloseTo(0.8, 6);
    expect(pot().expectedTake(8, REACH)).toBe(2); // capped by what it holds
  });

  it('⭐ a net takes twelve in an afternoon — and only what the water still holds', () => {
    expect(net().expectedTake(3, REACH)).toBe(12);
    const thin = [{ role: 'forage' as const, level: 3, capacity: 420 }];
    // 6/h × 3 h × (3/420) = 0.13 — the record is nearly empty and the net knows it.
    expect(net().expectedTake(3, thin)).toBeCloseTo(0.1286, 3);
  });

  it('a pot takes nothing of an apex; a net takes it', () => {
    const apexOnly = [{ role: 'apex' as const, level: 6, capacity: 6 }];
    expect(pot().expectedTake(24, apexOnly)).toBe(0);
    expect(net().expectedTake(24, apexOnly)).toBe(6);
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
