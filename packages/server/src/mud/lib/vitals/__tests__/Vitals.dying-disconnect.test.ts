/**
 * Disconnecting is not a cure for dying.
 *
 * Every other arm of `reconcileConditions` deliberately freezes while a
 * player is linkdead, and drops any gap longer than
 * `MAX_REASONABLE_GAP_SEC` — both so that being away never costs you
 * anything. Applied to the dying clock, that same kindness becomes an
 * exploit: cross a lethal threshold, pull the plug, come back healthy.
 *
 * So the dying arm opts out of both, and this file is what keeps it opted
 * out. The wrong version is exactly what copying the four adjacent
 * `if (linkdead)` blocks produces, which is why each case here also
 * exercises a *bleeding* body in the same fixture: if a future edit
 * "fixes" the divergence, the freeze assertions still pass and only these
 * fail, naming the reason.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { HARM_DEFAULTS } from '../../../platform/idea/Condition';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;

/** Push game-time forward, reading a vital so the lazy reconcile fires. */
function advance(c: Creature, gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
  c.getVitalSign('bloodVolume');
}

function body(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('alive');
  return c;
}

describe('the dying clock runs while disconnected', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  /**
   * Make `c` look linkdead to the reconcile. A bare Creature is not
   * `HasInteractive` (that is Character-tier), so the predicate and the
   * method are both supplied here.
   */
  function goDark(c: Creature): void {
    (c as unknown as { isLinkdead: () => boolean }).isLinkdead = () => true;
    vi.spyOn(MixinApi, 'isHasInteractive').mockReturnValue(true);
  }

  it('a LINKDEAD body still dies on schedule — while its wounds freeze', () => {
    const c = body();
    // A bleed in the same fixture, so the contrast is visible: the trauma
    // arm SHOULD freeze while linkdead, and the dying arm should not. If a
    // future edit collapses the divergence, this is the test that names it.
    c.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 3,
      dressed: false,
    });
    c.beginDying('exsanguination', 120);
    advance(c, 1); // seed both clocks
    const severityBefore = c
      .getConditions()
      .find((x) => x.kind === 'trauma')!.severity;

    goDark(c);
    advance(c, 200); // well past the 120s window

    expect(c.getLifecycleState()).toBe('dead');
    expect(c.getCauseOfDeath()).toBe('exsanguination');
    // The wound did NOT progress — the freeze is still in force for it.
    const trauma = c.getConditions().find((x) => x.kind === 'trauma');
    if (trauma) expect(trauma.severity).toBe(severityBefore);
  });

  it('a gap LONGER than the far-past guard still kills', () => {
    const c = body();
    c.beginDying('hypothermia', 120);
    advance(c, 1);

    // One step bigger than the guard that makes every other arm integrate
    // nothing. Here the long gap is not absurd — it is the answer: you
    // were dying, nobody came.
    advance(c, HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC + 600);

    expect(c.getLifecycleState()).toBe('dead');
    expect(c.getCauseOfDeath()).toBe('hypothermia');
  });

  it('the window is honored, not merely the fact of elapsed time', () => {
    const c = body();
    c.beginDying('asphyxiation', 300);
    advance(c, 1);

    advance(c, 200); // inside the window
    expect(c.getLifecycleState()).not.toBe('dead');
    expect(c.isDying()).toBe(true);
    expect(c.getDyingRemainingSec()).toBeGreaterThan(0);

    advance(c, 200); // past it
    expect(c.getLifecycleState()).toBe('dead');
  });

  it('a body rescued inside the window does not die at all', () => {
    const c = body();
    c.beginDying('exsanguination', 300);
    advance(c, 1);
    advance(c, 100);

    expect(c.stabilize()).toBe(true);

    advance(c, 100000); // however long — the clock is gone
    expect(c.getLifecycleState()).not.toBe('dead');
    expect(c.isDying()).toBe(false);
    expect(c.getCauseOfDeath()).toBeNull();
  });

  it('beginDying is idempotent — a second driver does not shorten the story', () => {
    const c = body();
    c.beginDying('exsanguination', 300);
    advance(c, 1);
    c.beginDying('hypothermia', 30); // a shorter window, arriving later

    advance(c, 60); // past the SECOND window, inside the first
    expect(c.getLifecycleState()).not.toBe('dead');

    advance(c, 300);
    expect(c.getCauseOfDeath()).toBe('exsanguination'); // the first cause
  });

  it('a later call may still attach attribution to an existing record', () => {
    const c = body();
    c.beginDying('exsanguination', 300);
    c.beginDying('exsanguination', 300, { killer: '/platform/agent/Avatar/rat' });
    advance(c, 1);
    advance(c, 400);

    // The blame rides the record to the transition (Wave 2 reads it).
    expect(c.getLifecycleState()).toBe('dead');
  });
});
