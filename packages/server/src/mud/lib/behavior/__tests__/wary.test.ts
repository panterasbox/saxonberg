/**
 * `wary` brain — the detection *response* logic. Detection itself is folded
 * into the MQL `peers:living` query resolved at the sentry's `alertness`
 * (proven in `api/mql/__tests__/scope-walk.attention.test.ts`); here that
 * query is stubbed so the brain's OWN logic is under test: it challenges a
 * newly-detected intruder once (the seen-set delta), stays quiet while the
 * intruder stays detected, and re-arms when they leave and return.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { brain as wary } from '../wary';
import { MqlApi } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import type { BrainContext } from '../brain';
import type { Stuff } from '../../stuff/Stuff';

function stub(id: string): Stuff {
  return { stuffId: id } as unknown as Stuff;
}

// What the (stubbed) MQL detection returns for the next act().
let detected: Stuff[] = [];

function ctx(
  config: Record<string, unknown>,
  state: Record<string, unknown> = {},
): BrainContext & { say: ReturnType<typeof vi.fn> } {
  return {
    host: stub('sentry'),
    config,
    state,
    trigger: { source: 'cadence', raw: 'cadence:6s' },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  } as BrainContext & { say: ReturnType<typeof vi.fn> };
}

const LINES = { lines: ['Halt! Who goes there?'] };

beforeEach(() => {
  vi.spyOn(MixinApi, 'isCommandGiver').mockReturnValue(true);
  vi.spyOn(MqlApi, 'resolveMany').mockImplementation(
    () => ({ stuff: detected }) as never,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  detected = [];
});

describe('wary brain — contract', () => {
  it('declares the label, claims attention, is a functional (non-ambient) poller', () => {
    expect(wary.label).toBe('wary');
    expect(wary.claims).toEqual(['attention']);
    expect(wary.ambient).toBe(false);
  });

  it('resolves detection via MQL peers:living at the config alertness', () => {
    detected = [];
    const c = ctx({ ...LINES, alertness: 7 });
    wary.act(c);
    expect(MqlApi.resolveMany).toHaveBeenCalledWith(
      'peers:living',
      expect.objectContaining({ commandGiver: c.host, attention: 7 }),
    );
  });
});

describe('wary brain — reaction to detection', () => {
  it('stays silent when nothing is detected', () => {
    detected = [];
    const c = ctx({ ...LINES, alertness: 3 });
    wary.act(c);
    expect(c.say).not.toHaveBeenCalled();
  });

  it('challenges a newly-detected intruder once (the seen-set delta)', () => {
    const intruder = stub('intruder');
    detected = [intruder];
    const state: Record<string, unknown> = {};

    const c1 = ctx({ ...LINES, alertness: 5 }, state);
    wary.act(c1);
    expect(c1.say).toHaveBeenCalledWith('Halt! Who goes there?', intruder);

    // Still detected next tick → no repeat challenge.
    const c2 = ctx({ ...LINES, alertness: 5 }, state);
    wary.act(c2);
    expect(c2.say).not.toHaveBeenCalled();
  });

  it('re-arms after the intruder leaves and returns', () => {
    const intruder = stub('intruder');
    const state: Record<string, unknown> = {};

    detected = [intruder];
    wary.act(ctx({ ...LINES, alertness: 5 }, state));

    // Gone → no detection, clears the seen-set.
    detected = [];
    wary.act(ctx({ ...LINES, alertness: 5 }, state));

    // Back → the alert fires again.
    detected = [intruder];
    const back = ctx({ ...LINES, alertness: 5 }, state);
    wary.act(back);
    expect(back.say).toHaveBeenCalledWith('Halt! Who goes there?', intruder);
  });

  it('no-ops for a host that cannot anchor a query', () => {
    vi.mocked(MixinApi.isCommandGiver).mockReturnValue(false);
    detected = [stub('intruder')];
    const c = ctx({ ...LINES, alertness: 9 });
    wary.act(c);
    expect(c.say).not.toHaveBeenCalled();
  });
});
