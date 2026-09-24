/**
 * The foreign-body trauma (blood build D6): it bleeds slower than an open
 * puncture while embedded, never knits until extracted, and extraction
 * turns it into a dressed wound that heals. It joins BLEED_FAMILY so the
 * shipped open-wound sepsis clock is its deadline.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import {
  TRAUMA_BEHAVIOR,
  HARM_DEFAULTS,
  BLEED_FAMILY,
} from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const embedded = (): Trauma => ({
  kind: 'trauma',
  type: 'foreign-body',
  site: 'body.leg.left.foot',
  severity: 2,
  foreignBody: 'a poisoned needle',
});

const bv = (c: Creature): number =>
  c.getVitalSign('bloodVolume').rawValue();

describe('foreign-body behavior', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('is in the bleed family (can go septic)', () => {
    expect(BLEED_FAMILY.has('foreign-body')).toBe(true);
  });

  it('bleeds SLOWER than an open puncture while embedded', () => {
    const host = makeStuff(() => new Creature());
    const fb = embedded();
    const pn: Trauma = {
      kind: 'trauma',
      type: 'puncture',
      site: 'body.leg.left.foot',
      severity: 2,
      bleeding: true,
    };
    const b0 = bv(host);
    TRAUMA_BEHAVIOR['foreign-body'].tick(host, fb, 60);
    const fbLost = b0 - bv(host);

    const host2 = makeStuff(() => new Creature());
    const c0 = bv(host2);
    TRAUMA_BEHAVIOR.puncture.tick(host2, pn, 60);
    const pnLost = c0 - bv(host2);

    expect(fbLost).toBeGreaterThan(0);
    expect(fbLost).toBeCloseTo(
      pnLost * HARM_DEFAULTS.FOREIGN_BODY_BLEED_SCALE,
      6,
    );
  });

  it('never knits while the object is in', () => {
    const host = makeStuff(() => new Creature());
    const fb = embedded();
    TRAUMA_BEHAVIOR['foreign-body'].mend(host, fb, 3600, 1);
    expect(fb.severity).toBe(2); // untouched
  });

  it('extraction clears the object, arrests the bleed, and it then heals', () => {
    const host = makeStuff(() => new Creature());
    const fb = embedded();
    TRAUMA_BEHAVIOR['foreign-body'].resolve(host, fb);
    expect(fb.foreignBody).toBeUndefined();
    expect(fb.dressed).toBe(true);
    expect(fb.bleeding).toBe(false);

    // no more bleed once out
    const b0 = bv(host);
    TRAUMA_BEHAVIOR['foreign-body'].tick(host, fb, 60);
    expect(bv(host)).toBe(b0);

    // and now it mends
    TRAUMA_BEHAVIOR['foreign-body'].mend(host, fb, 60, 1);
    expect(fb.severity).toBeLessThan(2);
  });

  it('describes the thing while it is in, then a cleaned puncture', () => {
    const fb = embedded();
    expect(TRAUMA_BEHAVIOR['foreign-body'].describe(fb)).toBe(
      'a puncture of body.leg.left.foot with a poisoned needle still in it',
    );
    fb.foreignBody = undefined;
    fb.dressed = true;
    expect(TRAUMA_BEHAVIOR['foreign-body'].describe(fb)).toContain(
      'cleaned puncture',
    );
  });

  it('the resolution token is extraction', () => {
    expect(TRAUMA_BEHAVIOR['foreign-body'].resolution).toBe('extraction');
  });
});
