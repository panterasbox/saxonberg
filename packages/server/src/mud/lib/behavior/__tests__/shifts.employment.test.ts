/**
 * `shifts` brain (employment-driven) — presence follows the roster-
 * maintained shift state, not the clock: on-shift teleports behind the bar,
 * off-shift teleports offstage, and the brain never reads the game clock.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as shifts } from '../shifts';
import { Idea } from '../../stuff/Idea';
import { MobileMixin } from '../../spatial/Mobile';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { ContainmentApi } from '../../../api/containment';
import { EmploymentApi } from '../../../api/employment';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import type { Stuff } from '../../stuff/Stuff';
import type { BrainContext } from '../brain';
import { makeStuff } from '../../security/__tests__/test-setup';
import { EmploymentLogic } from '../../../platform/idea/api/EmploymentLogic';
import { EmployedMixin } from '../../employment/Employed';

class Room extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'Room';
}
class Mover extends EmployedMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'Mover';
}

/**
 * Give a host a RESOLVED employment record.
 *
 * ⚠ Every migration test needs one now: the brain distinguishes *"the
 * roster says you are off duty"* from *"the roster has not resolved you
 * yet"*, and only the first moves anybody. The white-box write is
 * deliberate — `_upsertEmployment` carries a participant contract naming
 * the employing organization, and standing a Business up here would test
 * the employment engine rather than the brain.
 */
function employ(host: Stuff, status: 'on-shift' | 'off-shift'): void {
  (host as unknown as { employments: unknown[] }).employments = [
    {
      organizationPath: '/org/test',
      positionKey: 'tender',
      status,
      hiredAt: 0,
      onShiftSince: status === 'on-shift' ? 0 : null,
    },
  ];
}

function ctxFor(host: Stuff): BrainContext {
  return {
    host,
    config: { behindBar: '/bar', offstage: '/off' },
    state: {},
    trigger: { source: 'cadence', raw: 'cadence:30s' },
  } as unknown as BrainContext;
}

describe('shifts brain — employment-driven presence', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('teleports behind the bar when on shift', async () => {
    const behindBar = makeStuff(() => new Room());
    const source = makeStuff(() => new Room());
    const mover = makeStuff(() => new Mover());
    employ(mover, 'on-shift');
    ContainmentApi.move(mover, source);

    vi.spyOn(EmploymentLogic.prototype, 'shiftStateOf').mockReturnValue('on-shift');
    const singleton = vi
      .spyOn(StuffApi, 'singletonOrClone')
      .mockResolvedValue(behindBar as unknown as Stuff);

    await shifts.act(ctxFor(mover));

    expect(singleton).toHaveBeenCalledWith('/bar');
    expect(mover.getContainer()?.stuffId).toBe(behindBar.stuffId);
  });

  it('teleports offstage when off shift', async () => {
    const offstage = makeStuff(() => new Room());
    const source = makeStuff(() => new Room());
    const mover = makeStuff(() => new Mover());
    employ(mover, 'off-shift');
    ContainmentApi.move(mover, source);

    vi.spyOn(EmploymentLogic.prototype, 'shiftStateOf').mockReturnValue('off-shift');
    const singleton = vi
      .spyOn(StuffApi, 'singletonOrClone')
      .mockResolvedValue(offstage as unknown as Stuff);

    await shifts.act(ctxFor(mover));

    expect(singleton).toHaveBeenCalledWith('/off');
    expect(mover.getContainer()?.stuffId).toBe(offstage.stuffId);
  });

  it('never reads the game clock', async () => {
    const dest = makeStuff(() => new Room());
    const mover = makeStuff(() => new Mover());
    employ(mover, 'on-shift');
    vi.spyOn(EmploymentLogic.prototype, 'shiftStateOf').mockReturnValue('on-shift');
    vi.spyOn(StuffApi, 'singletonOrClone').mockResolvedValue(
      dest as unknown as Stuff,
    );
    const clock = vi.spyOn(WorldClockApi, 'getNow');

    await shifts.act(ctxFor(mover));

    expect(clock).not.toHaveBeenCalled();
  });

  it('stays put when already at the destination', async () => {
    const behindBar = makeStuff(() => new Room());
    const mover = makeStuff(() => new Mover());
    employ(mover, 'on-shift');
    ContainmentApi.move(mover, behindBar);

    vi.spyOn(EmploymentLogic.prototype, 'shiftStateOf').mockReturnValue('on-shift');
    vi.spyOn(StuffApi, 'singletonOrClone').mockResolvedValue(
      behindBar as unknown as Stuff,
    );

    await shifts.act(ctxFor(mover));
    expect(mover.getContainer()?.stuffId).toBe(behindBar.stuffId);
  });

  it('⭐ leaves a host whose roster has NOT resolved yet exactly where it is', async () => {
    // The Hearthworks cook, one beat after residency spawned him: standing
    // at his own hearth, 24/7 on the roster, and carrying no employment
    // record because the engine's pass has not reached him. `shiftState()`
    // answers `off-shift` — it is a `.some()` over an empty store — and the
    // brain used to believe it and teleport him out of the kitchen. In the
    // client that read as "Odo vanishes.", and `order` answered "There's no
    // one on hand to make that."
    const kitchen = makeStuff(() => new Room());
    const offstage = makeStuff(() => new Room());
    const cook = makeStuff(() => new Mover());
    ContainmentApi.move(cook, kitchen);
    expect(cook.getEmployments()).toHaveLength(0);

    const singleton = vi
      .spyOn(StuffApi, 'singletonOrClone')
      .mockResolvedValue(offstage as unknown as Stuff);

    await shifts.act(ctxFor(cook));

    // Not moved, and the destination was never even resolved.
    expect(cook.getContainer()?.stuffId).toBe(kitchen.stuffId);
    expect(singleton).not.toHaveBeenCalled();
  });

  it('…but a resolved OFF-SHIFT record still sends them offstage', async () => {
    // The complement, so the fix cannot degrade into "never migrate": an
    // NPC who has genuinely gone off duty keeps a record (`quit` and
    // `fired` are statuses, not deletions), so the brain still acts.
    const kitchen = makeStuff(() => new Room());
    const offstage = makeStuff(() => new Room());
    const cook = makeStuff(() => new Mover());
    employ(cook, 'off-shift');
    ContainmentApi.move(cook, kitchen);

    vi.spyOn(EmploymentLogic.prototype, 'shiftStateOf').mockReturnValue('off-shift');
    vi.spyOn(StuffApi, 'singletonOrClone').mockResolvedValue(
      offstage as unknown as Stuff,
    );

    await shifts.act(ctxFor(cook));

    expect(cook.getContainer()?.stuffId).toBe(offstage.stuffId);
  });
});
