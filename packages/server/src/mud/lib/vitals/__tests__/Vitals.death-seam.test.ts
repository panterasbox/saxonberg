/**
 * Death seams (no driver). Vitals are body-state, not agent-state — a
 * corpse (`lifecycleState: 'dead'`) is the same Stuff with full,
 * readable vitals and reduced agency. This build ships the SEAMS only:
 * the cause-of-death field, the dead readouts, and the (empty)
 * postmortem-progression seam. NOTHING watches a vital and transitions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('VitalsMixin — death seams', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('the cause-of-death field round-trips', () => {
    const c = makeStuff(() => new Creature());
    expect(c.getCauseOfDeath()).toBeNull();
    c.setCauseOfDeath('exsanguination');
    expect(c.getCauseOfDeath()).toBe('exsanguination');
  });

  it('a floored vital reads lethal WITHOUT any lifecycle transition', () => {
    const c = makeStuff(() => new Creature());
    const before = c.getLifecycleState();
    c.setVitalSign('bloodVolume', Quantity.of(1, 'L'));
    expect(c.getConditionBand()).toBe('dead');
    // No driver — the lifecycle state is unchanged by the reading.
    expect(c.getLifecycleState()).toBe(before);
    expect(c.getLifecycleState()).not.toBe('dead');
  });

  it('a corpse keeps full readable vitals with dead readouts', () => {
    const c = makeStuff(() => new Creature());
    // Author/debug sets the lifecycle (the future driver would do this).
    c.setLifecycleState('dead');
    c.setCauseOfDeath('cardiac arrest');

    // Body-state persists on the corpse — vitals are still readable.
    expect(c.getVitalSign('coreTemperature').rawValue()).toBeGreaterThan(0);
    // Derived readouts reflect death.
    expect(c.getConsciousness()).toBe('dead');
    expect(c.getConditionBand()).toBe('dead');
    expect(c.getCauseOfDeath()).toBe('cardiac arrest');
  });

  it('the postmortem-progression seam exists and ships empty', () => {
    const c = makeStuff(() => new Creature());
    expect(c.getPostmortemProgressions()).toEqual([]);
  });
});
