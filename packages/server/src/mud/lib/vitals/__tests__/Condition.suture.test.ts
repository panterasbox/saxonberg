/**
 * Suturing (clinical-medicine D8): a sutured laceration mends FASTER than
 * a bare dressing; taking the stitches out too early re-arms the bleed,
 * and once knitted it completes; a wound left knitted stamps its
 * readiness (which re-anchors the sepsis clock for the overstay).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { TRAUMA_BEHAVIOR, HARM_DEFAULTS } from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const wound = (over: Partial<Trauma> = {}): Trauma => ({
  kind: 'trauma',
  type: 'laceration',
  site: 'body.arm.left',
  severity: 1.2,
  dressed: true,
  bleeding: false,
  ...over,
});

describe('suture', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('a sutured wound mends faster than a bare dressing', () => {
    const host = makeStuff(() => new Creature());
    const sutured = wound({ sutured: true });
    const dressed = wound();
    TRAUMA_BEHAVIOR.laceration.mend(host, sutured, 10, 1);
    TRAUMA_BEHAVIOR.laceration.mend(host, dressed, 10, 1);
    const suturedHealed = 1.2 - sutured.severity;
    const dressedHealed = 1.2 - dressed.severity;
    expect(suturedHealed).toBeGreaterThan(dressedHealed);
    // it uses the sutured rate exactly
    expect(sutured.severity).toBeCloseTo(
      1.2 - HARM_DEFAULTS.SUTURED_HEAL_PER_SEC * 10,
      5,
    );
  });

  it('unstitching too early (still above clot) re-arms the bleed', () => {
    const host = makeStuff(() => new Creature());
    const w = wound({ sutured: true, severity: 1.0 }); // > CLOT (0.5)
    TRAUMA_BEHAVIOR.laceration.reopen(host, w);
    expect(w.sutured).toBe(false);
    expect(w.bleeding).toBe(true);
    expect(w.dressed).toBe(false);
  });

  it('unstitching once knitted (below clot) completes cleanly', () => {
    const host = makeStuff(() => new Creature());
    const w = wound({ sutured: true, severity: 0.3 }); // <= CLOT
    TRAUMA_BEHAVIOR.laceration.reopen(host, w);
    expect(w.sutured).toBe(false);
    expect(w.bleeding).not.toBe(true);
    // it stays a clotted wound that heals to clear
    TRAUMA_BEHAVIOR.laceration.mend(host, w, 60, 1);
    expect(w.severity).toBeLessThan(0.3);
  });
});
