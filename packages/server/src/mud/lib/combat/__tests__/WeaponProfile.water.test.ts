/**
 * ⭐ The fight under water (underwater D28): the medium's drag slows a
 * SWUNG weapon to a fraction of its dry self and a thrust hardly at all —
 * a sword barely hurts, a spear thrust does.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { WeaponProfile, DEFAULT_WEAPON_PROFILE_CONFIG } from '../WeaponProfile';

const sword = { deliveryForm: 'bladed' as const, massKg: 1.2, lengthM: 0.9, handSlots: 1 };
const spear = { deliveryForm: 'pointed' as const, massKg: 1.8, lengthM: 2, handSlots: 2 };

describe('weapons in water (D28)', () => {
  it('⭐ a sword lands at most a quarter of its dry blow; a spear at least 60 %', () => {
    const dry = WeaponProfile.derive(sword, DEFAULT_WEAPON_PROFILE_CONFIG);
    const wet = WeaponProfile.derive({ ...sword, mediumDrag: 1 }, DEFAULT_WEAPON_PROFILE_CONFIG);
    expect(wet.poiseDamageFactor()).toBeLessThanOrEqual(dry.poiseDamageFactor() / 4);
    expect(wet.tempoFactor()).toBeLessThan(dry.tempoFactor());
    const sDry = WeaponProfile.derive(spear, DEFAULT_WEAPON_PROFILE_CONFIG);
    const sWet = WeaponProfile.derive({ ...spear, mediumDrag: 1 }, DEFAULT_WEAPON_PROFILE_CONFIG);
    expect(sWet.poiseDamageFactor()).toBeGreaterThanOrEqual(sDry.poiseDamageFactor() * 0.6);
  });

  it('in air nothing changes', () => {
    const a = WeaponProfile.derive(sword, DEFAULT_WEAPON_PROFILE_CONFIG);
    const b = WeaponProfile.derive({ ...sword, mediumDrag: 0 }, DEFAULT_WEAPON_PROFILE_CONFIG);
    expect(b.poiseDamageFactor()).toBe(a.poiseDamageFactor());
  });
});
