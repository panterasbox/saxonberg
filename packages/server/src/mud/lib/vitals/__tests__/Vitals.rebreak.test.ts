/**
 * ⭐⭐ Re-injury (recovery D15) — real work re-breaks a half-knit bone.
 * A fracture whose function has come back but whose structure has not goes
 * again under hard load; a gentle act does nothing, and a whole bone never.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { HARM_DEFAULTS } from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

function halfKnitFracture(c: Creature): Trauma {
  // Function back (below the 0.5 impair threshold), structure not (still > 0).
  const t: Trauma = {
    kind: 'trauma',
    type: 'fracture',
    site: 'body.leg.left',
    severity: 0.3,
    dressed: true,
    careQuality: 1,
  };
  c.afflict(t);
  return t;
}

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => StuffApi.clearAll());

describe('stressStructures — the bone that was not ready', () => {
  it('⭐⭐ hard work re-breaks a half-knit fracture and un-sets it', () => {
    const c = makeStuff(() => new Creature());
    const frac = halfKnitFracture(c);
    const rebroken = c.stressStructures(HARM_DEFAULTS.REBREAK_POWER_W + 50);
    expect(rebroken).toHaveLength(1);
    expect(frac.severity).toBe(HARM_DEFAULTS.REBREAK_SEVERITY);
    expect(frac.dressed).toBe(false); // the splint is off
    expect(frac.careQuality).toBeUndefined(); // its care is forgotten
  });

  it('⚠ gentle work does nothing (below the re-break power)', () => {
    const c = makeStuff(() => new Creature());
    const frac = halfKnitFracture(c);
    const rebroken = c.stressStructures(HARM_DEFAULTS.REBREAK_POWER_W - 200);
    expect(rebroken).toHaveLength(0);
    expect(frac.severity).toBe(0.3); // untouched
  });

  it('⚠ a still-IMPAIRING fracture is not re-broken — it never came back to break', () => {
    const c = makeStuff(() => new Creature());
    const frac: Trauma = {
      kind: 'trauma',
      type: 'fracture',
      site: 'body.leg.left',
      severity: 0.8, // at/above the impair threshold — function is NOT back
    };
    c.afflict(frac);
    expect(c.stressStructures(HARM_DEFAULTS.REBREAK_POWER_W + 50)).toHaveLength(0);
  });

  it('⚠ a whole bone (no fracture) never re-breaks', () => {
    const c = makeStuff(() => new Creature());
    expect(c.stressStructures(HARM_DEFAULTS.REBREAK_POWER_W + 500)).toHaveLength(0);
  });
});
