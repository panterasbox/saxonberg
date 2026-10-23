/**
 * `ferries` — ⭐ the ferryman answers the bell (river D31): rung on the far
 * landing since he last answered, he crosses by the landing's ferry way —
 * and at high water he shouts the refusal across instead.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import FerryService from '@saxonberg/content-transport/src/idea/FerryService';
import FerryExit from '@saxonberg/content-transport/src/idea/FerryExit';
import { brain } from '../ferries';

const A = '/landing/a';
const B = '/landing/b';
let rungAt = Number.NEGATIVE_INFINITY;
let gate: { ok: boolean; reason?: string } = { ok: true };
let ferryHere = true;
const said: string[] = [];

const room = {
  getTemplatePath: () => A,
  getExit: (d: string) =>
    d === 'across'
      ? Object.assign(Object.create(FerryExit.prototype), {
          ferryHere: () => (ferryHere ? {} : null),
          canTraverse: async () => gate,
        })
      : undefined,
};
const host = {
  getContainer: () => room,
  forceCommand: async (c: string) => {
    said.push(c);
  },
};

function ctx(state: Record<string, unknown> = {}) {
  return {
    host,
    state,
    config: { landings: [A, B], bells: ['/bell/a', '/bell/b'], way: 'across' },
    trigger: { source: 'cadence', raw: 'candidate' },
  } as never;
}

beforeEach(() => {
  rungAt = Number.NEGATIVE_INFINITY;
  gate = { ok: true };
  ferryHere = true;
  said.length = 0;
  vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isCommandGiver').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isExitable').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isRingable').mockReturnValue(true);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) =>
    p === '/bell/b' ? { getLastRungAtS: () => rungAt } : { getLastRungAtS: () => Number.NEGATIVE_INFINITY }) as never);
});

afterEach(() => vi.restoreAllMocks());

describe('the ferries brain (river D31)', () => {
  it('nothing rang: he stays', async () => {
    await brain.act(ctx());
    expect(said).toEqual([]);
  });

  it('⭐ the far bell rang: he takes her across by the ferry way — once per ring', async () => {
    rungAt = 100;
    const state: Record<string, unknown> = {};
    await brain.act(ctx(state));
    expect(said).toEqual(['go across']);
    await brain.act(ctx(state));
    expect(said).toEqual(['go across']);
  });

  it('⭐ at high water he shouts it across instead of going', async () => {
    rungAt = 100;
    gate = { ok: false, reason: 'Not at this water.' };
    await brain.act(ctx());
    expect(said).toEqual(['shout Not at this water.']);
  });

  it('she is not at his landing: there is nothing to bring over', async () => {
    rungAt = 100;
    ferryHere = false;
    await brain.act(ctx());
    expect(said).toEqual([]);
  });
});

describe('⭐ to the timetable (river W12)', () => {
  let phase = 'on-call';
  let lastDepart: number | null = null;
  function timed(state: Record<string, unknown> = {}) {
    return {
      host,
      state,
      config: { landings: [A, B], bells: ['/bell/a', '/bell/b'], way: 'across', service: '/svc' },
      trigger: { source: 'cadence', raw: 'candidate' },
    } as never;
  }
  beforeEach(() => {
    phase = 'on-call';
    lastDepart = null;
    vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) =>
      p === '/svc'
        ? Object.assign(Object.create(FerryService.prototype), {
            isTimetabled: () => phase !== 'on-call',
            phaseNow: () => phase,
            wantedAt: (l: string) => phase === `boarding:${l}`,
            lastDepartureFrom: () => lastDepart,
          })
        : { getLastRungAtS: () => (p === '/bell/b' ? rungAt : Number.NEGATIVE_INFINITY) }) as never);
  });

  it('boarding called at the other landing, and she is here with him: he takes her over to it', async () => {
    phase = `boarding:${B}`;
    await brain.act(timed());
    expect(said).toEqual(['go across']);
  });

  it('⭐ a departure from here has come and she is still here: away — once per departure', async () => {
    phase = 'crossing';
    lastDepart = 21_600;
    const state: Record<string, unknown> = {};
    await brain.act(timed(state));
    await brain.act(timed(state));
    expect(said).toEqual(['go across']);
  });

  it('in the timetable’s hours the bell waits', async () => {
    phase = `alongside:${A}`;
    rungAt = 100;
    await brain.act(timed());
    expect(said).toEqual([]);
  });

  it('on call, the bell rules as before', async () => {
    rungAt = 100;
    await brain.act(timed());
    expect(said).toEqual(['go across']);
  });
});
