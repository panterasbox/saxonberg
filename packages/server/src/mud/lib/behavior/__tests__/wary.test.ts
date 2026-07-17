/**
 * `wary` brain — the detection *response*, driven through the REAL
 * perception path (`PerceptionApi.perceives`) against a real hiding
 * intruder in a real room. Asserts:
 *   - a lax sentry (low `alertness`) does NOT react to a decent hider
 *     (stays oblivious);
 *   - a sharp sentry (high `alertness`) reacts once on the seen-set →
 *     detected transition, and not again while the intruder stays detected;
 *   - a plainly-visible intruder is caught at any alertness;
 *   - an intruder that leaves and returns re-arms the alert.
 */

import { describe, it, expect, vi } from 'vitest';
import { brain as wary } from '../wary';
import type { BrainContext } from '../brain';
import { HidingMixin } from '../../concealment/Hiding';
import { ConcealableMixin } from '../../concealment/Concealable';
import { MobileMixin } from '../../spatial/Mobile';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { Idea } from '../../stuff/Idea';
import { ContainmentApi } from '../../../api/containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class Room extends ContainerMixin(Idea) {}
class Sentry extends ContainableMixin(Idea) {}
class Intruder extends HidingMixin(
  ConcealableMixin(MobileMixin(ContainableMixin(Idea))),
) {}

let counter = 0;
function scene(): { room: Room; sentry: Sentry; intruder: Intruder } {
  const room = makeStuff(() => new Room());
  const sentry = makeStuff(() => new Sentry());
  const intruder = makeStuffAtPath(
    () => new Intruder(),
    `/obj/test/intruder-${counter++}`,
  );
  ContainmentApi.move(sentry, room);
  ContainmentApi.move(intruder, room);
  return { room, sentry, intruder };
}

function ctx(
  host: unknown,
  config: Record<string, unknown>,
  state: Record<string, unknown> = {},
): BrainContext & { say: ReturnType<typeof vi.fn> } {
  return {
    host: host as never,
    config,
    state,
    trigger: { source: 'cadence', raw: 'cadence:3s' },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  } as BrainContext & { say: ReturnType<typeof vi.fn> };
}

const LINES = { lines: ['Halt! Who goes there?'] };

describe('wary brain — contract', () => {
  it('declares the label, claims attention, is a functional (non-ambient) poller', () => {
    expect(wary.label).toBe('wary');
    expect(wary.claims).toEqual(['attention']);
    expect(wary.ambient).toBe(false);
  });
});

describe('wary brain — detection', () => {
  it('a lax sentry does not react to a decent hider', () => {
    const { sentry, intruder } = scene();
    intruder.enterHide('hidden'); // requirement 4
    const c = ctx(sentry, { ...LINES, alertness: 1 });
    wary.act(c);
    expect(c.say).not.toHaveBeenCalled();
  });

  it('a sharp sentry catches the hider and challenges once', () => {
    const { sentry, intruder } = scene();
    intruder.enterHide('hidden'); // requirement 4
    const state: Record<string, unknown> = {};
    const c1 = ctx(sentry, { ...LINES, alertness: 5 }, state);
    wary.act(c1);
    expect(c1.say).toHaveBeenCalledWith('Halt! Who goes there?', intruder);

    // Still detected on the next tick → no repeat challenge (seen-set).
    const c2 = ctx(sentry, { ...LINES, alertness: 5 }, state);
    wary.act(c2);
    expect(c2.say).not.toHaveBeenCalled();
  });

  it('a plainly-visible intruder is caught at any alertness', () => {
    const { sentry, intruder } = scene(); // not hiding → obvious
    const c = ctx(sentry, { ...LINES, alertness: 0 });
    wary.act(c);
    expect(c.say).toHaveBeenCalledWith('Halt! Who goes there?', intruder);
  });

  it('re-arms after the intruder leaves and returns', () => {
    const { room, sentry, intruder } = scene();
    intruder.enterHide('hidden');
    const state: Record<string, unknown> = {};
    wary.act(ctx(sentry, { ...LINES, alertness: 5 }, state));

    // Intruder leaves — a scan finds nobody, clearing the seen-set.
    const elsewhere = makeStuff(() => new Room());
    ContainmentApi.move(intruder, elsewhere);
    wary.act(ctx(sentry, { ...LINES, alertness: 5 }, state));

    // Intruder returns — the alert fires again.
    ContainmentApi.move(intruder, room);
    const back = ctx(sentry, { ...LINES, alertness: 5 }, state);
    wary.act(back);
    expect(back.say).toHaveBeenCalledWith('Halt! Who goes there?', intruder);
  });
});
