/**
 * `frequents` — a regular goes to a place at set hours, takes a free seat,
 * and leaves when the hours are up; never while working a shift.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as frequents } from '../frequents';
import type { BrainContext } from '../brain';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';

const BAR = '/test/frequents/bar';
const BACK = '/test/frequents/back';

class Room extends ContainerMixin(Idea) {
  static _mixinName = 'FrequentsTestRoom';
}
class Regular extends ContainableMixin(Idea) {
  static _mixinName = 'FrequentsTestRegular';
}

let bar: Room;
let back: Room;
let host: Regular;

function at(weekday: number, hour: number): void {
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(weekday * 86_400 + hour * 3_600, 's'));
}

function ctx(state: Record<string, unknown> = {}): BrainContext {
  return {
    host: host as unknown as Stuff,
    config: { place: BAR, sit: 'stool', visits: [{ days: [2], hours: [19, 22] }] },
    state,
    trigger: { source: 'candidate', raw: 'candidate' },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
    go: vi.fn(async () => true),
    goTo: vi.fn(async () => true),
    knows: () => true,
  };
}

beforeEach(() => {
  bar = makeStuff(() => new Room());
  back = makeStuff(() => new Room());
  stampTemplatePathForTest(bar, BAR);
  stampTemplatePathForTest(back, BACK);
  host = makeStuff(() => new Regular());
  ContainmentApi.move(host as never, back as never);
});
afterEach(() => vi.restoreAllMocks());

describe('frequents', () => {
  it('outside the hours, it wants nothing', () => {
    at(2, 15);
    expect(frequents.wants(ctx())).toBeNull();
    expect(frequents.urgency(ctx()).band).toBe('idle');
  });

  it('⭐ in the hours and elsewhere, it goes', () => {
    at(2, 20);
    expect(frequents.wants(ctx())).toBe('go');
  });

  it('there, unseated, with a free seat — it sits; with none, it stands content', () => {
    at(2, 20);
    ContainmentApi.move(host as never, bar as never);
    const free = vi.spyOn(frequents, 'freeSeat').mockReturnValue(bar as unknown as Stuff);
    expect(frequents.wants(ctx())).toBe('sit');
    free.mockReturnValue(null);
    expect(frequents.wants(ctx())).toBeNull();
  });

  it('⭐ after the hours it leaves — but only a visit it made', () => {
    at(2, 23);
    ContainmentApi.move(host as never, bar as never);
    expect(frequents.wants(ctx({ visiting: true }))).toBe('leave');
    expect(frequents.wants(ctx())).toBeNull();
  });

  it('⚠ never while on shift — the roster tick owns a working hand', () => {
    at(2, 20);
    vi.spyOn(MixinApi, 'isEmployed').mockReturnValue(true as never);
    (host as unknown as { shiftState: () => string }).shiftState = () => 'on-shift';
    expect(frequents.wants(ctx())).toBeNull();
  });
});
