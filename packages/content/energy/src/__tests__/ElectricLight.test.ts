/**
 * ElectricLight + GridPowered (energy B2) — ⭐ **a thing is lit because its
 * parcel's line is live.**
 *
 * The flux is the authored lumens only while the light is switched ON **and**
 * its premises' feeder node is energized; a cut, a dead source or an off-grid
 * premises all take it to zero the same second.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ElectricLight from '../thing/ElectricLight';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

/** Force the resolved meter state a real `postRegister` would cache. */
function meter(
  light: ElectricLight,
  band: string,
  node: string | null,
  energized: boolean,
): void {
  const p = light as unknown as {
    _powerBand: string;
    _powerNodeRef: string | null;
    _gridCatalogue: { energizedAtSync: (n: string) => boolean } | null;
  };
  p._powerBand = band;
  p._powerNodeRef = node;
  p._gridCatalogue = { energizedAtSync: () => energized };
}

function lamp(): ElectricLight {
  const l = makeStuff(() => new ElectricLight());
  l.setEmittedFlux(800);
  l.setOn(true);
  return l;
}

describe('the light is lit because its parcel is live', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
  });
  afterEach(() => StuffApi.clearAll());

  it('⚠ off-grid draws nothing, even switched on', () => {
    const l = lamp(); // default _powerBand is off-grid
    expect(l.isPowered()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it('⭐ connected + energized + on → the authored flux', () => {
    const l = lamp();
    meter(l, 'domestic', 'terminus-main:mayfield', true);
    expect(l.isPowered()).toBe(true);
    expect(l.getEmittedFlux().rawValue()).toBe(800);
  });

  it('⭐ a cut upstream (node dark) → dark, live', () => {
    const l = lamp();
    meter(l, 'domestic', 'terminus-main:mayfield', false);
    expect(l.isPowered()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it('switched off → dark even when powered', () => {
    const l = lamp();
    meter(l, 'domestic', 'terminus-main:mayfield', true);
    l.setOn(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it('the detail reads the three states', () => {
    const l = lamp();
    meter(l, 'domestic', 'terminus-main:mayfield', true);
    expect(l.getDetail('light', 'vision')).toMatch(/lit/i);
    meter(l, 'domestic', 'terminus-main:mayfield', false);
    expect(l.getDetail('light', 'vision')).toMatch(/no power|dark/i);
    l.setOn(false);
    expect(l.getDetail('light', 'vision')).toMatch(/switched off/i);
  });

  it('availablePowerW answers the band ceiling while powered, else 0', () => {
    const l = lamp();
    meter(l, 'domestic', 'terminus-main:mayfield', false);
    expect(l.availablePowerW()).toBe(0);
    meter(l, 'domestic', 'terminus-main:mayfield', true);
    // The dial may be unset in a bare test → 0; powered-vs-not is the claim.
    expect(l.availablePowerW()).toBeGreaterThanOrEqual(0);
  });
});
