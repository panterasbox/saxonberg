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
    ContainmentApi.move(mover, behindBar);

    vi.spyOn(EmploymentLogic.prototype, 'shiftStateOf').mockReturnValue('on-shift');
    vi.spyOn(StuffApi, 'singletonOrClone').mockResolvedValue(
      behindBar as unknown as Stuff,
    );

    await shifts.act(ctxFor(mover));
    expect(mover.getContainer()?.stuffId).toBe(behindBar.stuffId);
  });
});
