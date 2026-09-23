/**
 * ⭐ Scars (recovery D14) — a grave wound leaves a mark the body keeps,
 * even after it heals to nothing. Never a penalty: a scar is description.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { HARM_DEFAULTS } from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { Postures } from '../../slot/Postured';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;
function advance(c: Creature, gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
  c.getVitalSign('bloodVolume'); // fire the lazy reconcile
}

function lying(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('alive');
  c.setPosture(Postures.Lie);
  return c;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  // ⚠ Monotonic across tests — never rewind the clock (a backwards jump
  // between tests confuses a fresh wound's first-touch integration).
  real += 10_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('a body remembers what it survived', () => {
  it('⭐⭐ a grave laceration that heals away leaves a scar', () => {
    const c = lying();
    const cut: Trauma = {
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 2, // past SCAR_SEVERITY (1.5)
      dressed: true,
      bleeding: false,
    };
    c.afflict(cut);
    advance(c, 1); // seed + raise peak
    // Heal it away (past the safety delay so mending runs).
    advance(c, HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY + 600);

    const scars = c.getScars();
    expect(scars).toHaveLength(1);
    expect(scars[0]!.type).toBe('laceration');
    expect(scars[0]!.site).toBe('body.arm.left');
    expect(scars[0]!.peak).toBeGreaterThanOrEqual(HARM_DEFAULTS.SCAR_SEVERITY);
    // ⭐ A scar is NEVER a penalty — the wound is gone and the part is whole.
    expect(c.functionAt('body.arm.left')).toBe('full');
  });

  it('⚠ a bruise leaves nothing — a contusion is a fee, not an injury', () => {
    const c = lying();
    c.afflict({
      kind: 'trauma',
      type: 'contusion',
      site: 'body.arm.left',
      severity: 2,
    });
    advance(c, 1);
    advance(c, HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY + 600);
    expect(c.getScars()).toHaveLength(0);
  });

  it('⚠ a shallow cut leaves nothing — it never got grave enough', () => {
    const c = lying();
    c.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 0.8, // below SCAR_SEVERITY
      dressed: true,
      bleeding: false,
    });
    advance(c, 1);
    advance(c, HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY + 600);
    expect(c.getScars()).toHaveLength(0);
  });
});
