/**
 * Every lethal driver opens the dying window instead of ending the story,
 * and each supplies its OWN window length.
 *
 * The window belongs to the physics, not to a central table: bleeding out
 * and starving to death are not the same length of story, and the producer
 * that knows the mechanism is the one that knows the number (the shipped
 * `RESPIRATION_DEFAULTS.ANOXIA_LETHAL_SEC` precedent).
 *
 * **Why the drivers no longer share an `applyDeath` method.** Thermal,
 * respiration and metabolism each used to define one, with byte-identical
 * bodies. They compose onto a single `Creature`, so the outermost
 * (ThermalRegulation) shadowed the other two — invisible while the three
 * did the same thing, and a live bug the moment they carried different
 * windows: every death would have used the thermal one. The indirection is
 * gone; each driver calls `beginDying` at its own site with its own
 * constant, and the distinctness test at the bottom is what keeps them from
 * quietly collapsing back into one number.
 *
 * The long-form scenarios — starve a body for a game-day and watch the
 * cascade — live in the drivers' own suites, which now assert the dying
 * stage (see `Metabolic.cascade`, `ThermalRegulation`, `Respiration`).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { Quantity } from '../../quantity';
import { HARM_DEFAULTS } from '../Condition';
import { THERMAL_DEFAULTS } from '../../thermal/Thermal';
import { RESPIRATION_DEFAULTS } from '../../respiration/Respiration';
import { METABOLIC_DEFAULTS } from '../../metabolism/Metabolic';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;

function tick(c: Creature, gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
  c.getVitalSign('bloodVolume');
}

function body(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('alive');
  return c;
}

describe('each driver opens a window rather than ending the story', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('exsanguination — a bleed to the floor opens the window, does not kill', () => {
    const c = body();
    // The real path: a bleeding wound drives blood volume down, and the
    // floor check inside the reconcile opens the window.
    c.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 8,
      dressed: false,
    });
    c.setVitalSign('bloodVolume', Quantity.of(0.4, 'L'));
    tick(c, 1);
    tick(c, 30);

    expect(c.isDying()).toBe(true);
    expect(c.getLifecycleState()).not.toBe('dead');
    expect(c.getDyingRemainingSec()).toBeLessThanOrEqual(
      HARM_DEFAULTS.EXSANGUINATION_DYING_WINDOW_SEC,
    );

    tick(c, HARM_DEFAULTS.EXSANGUINATION_DYING_WINDOW_SEC + 30);
    expect(c.getLifecycleState()).toBe('dead');
    expect(c.getCauseOfDeath()).toBe('exsanguination');
  });

  it('a rescue inside the exsanguination window saves the body', () => {
    const c = body();
    c.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 8,
      dressed: true, // dressed: the bleed is arrested
    });
    c.setVitalSign('bloodVolume', Quantity.of(0.4, 'L'));
    tick(c, 1);
    tick(c, 30);
    expect(c.isDying()).toBe(true);

    // Pull them back, then restore the volume the wound cost them.
    expect(c.stabilize()).toBe(true);
    c.setVitalSign('bloodVolume', Quantity.of(5, 'L'));

    tick(c, HARM_DEFAULTS.EXSANGUINATION_DYING_WINDOW_SEC * 3);
    expect(c.getLifecycleState()).not.toBe('dead');
    expect(c.getCauseOfDeath()).toBeNull();
  });

  it('the window a driver names is the window that is honored', () => {
    // Each driver passes its own constant at its own call site. Proving
    // the record honors whatever it is handed is what makes those call
    // sites meaningful.
    for (const [cause, window] of [
      ['hypothermia', THERMAL_DEFAULTS.DYING_WINDOW_SEC],
      ['asphyxiation', RESPIRATION_DEFAULTS.DYING_WINDOW_SEC],
      ['starvation', METABOLIC_DEFAULTS.DYING_WINDOW_SEC],
    ] as const) {
      const c = body();
      c.beginDying(cause, window);
      tick(c, 1);

      expect(c.getDyingRemainingSec()).toBeLessThanOrEqual(window);

      // Still alive at half the window — the interval is real, not nominal.
      tick(c, window / 2);
      expect(c.getLifecycleState()).not.toBe('dead');

      tick(c, window);
      expect(c.getLifecycleState()).toBe('dead');
      expect(c.getCauseOfDeath()).toBe(cause);
    }
  });

  it('the windows are genuinely different per driver', () => {
    // If these ever collapse to one number the physics stopped mattering —
    // which is exactly what the shared `applyDeath` was silently doing.
    const windows = new Set([
      HARM_DEFAULTS.EXSANGUINATION_DYING_WINDOW_SEC,
      HARM_DEFAULTS.ELECTROCUTION_DYING_WINDOW_SEC,
      THERMAL_DEFAULTS.DYING_WINDOW_SEC,
      RESPIRATION_DEFAULTS.DYING_WINDOW_SEC,
      METABOLIC_DEFAULTS.DYING_WINDOW_SEC,
    ]);
    expect(windows.size).toBeGreaterThan(2);

    // Suffocation is the fastest; the slow deaths leave the longest chance
    // that someone reaches you.
    expect(RESPIRATION_DEFAULTS.DYING_WINDOW_SEC).toBeLessThan(
      METABOLIC_DEFAULTS.DYING_WINDOW_SEC,
    );
  });

  it('a driver with no opinion gets the default window', () => {
    const c = body();
    c.beginDying('crushed');
    expect(c.getDyingRemainingSec()).toBe(
      HARM_DEFAULTS.DYING_WINDOW_SEC_DEFAULT,
    );
  });
});
