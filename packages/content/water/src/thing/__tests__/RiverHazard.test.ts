/**
 * RiverHazard — the river's killers have a side and an approach (river D12):
 * how a body meets one decides what it does, and none is ever spent.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import RiverHazard from '../RiverHazard';

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function hazard(kind: RiverHazard['hazardKind']): RiverHazard {
  const h = makeStuff(() => new RiverHazard());
  h.hazardKind = kind;
  return h;
}

describe('RiverHazard (river D12)', () => {
  it('a strainer: head-first and swimming hard you go over; feet-first or passive you go under', () => {
    const s = hazard('strainer');
    expect(s.catches('head-first')).toBe(false);
    expect(s.catches('feet-first')).toBe(true);
    expect(s.catches('passive')).toBe(true);
  });

  it('a hydraulic holds whatever way you come', () => {
    const h = hazard('hydraulic');
    for (const a of ['head-first', 'feet-first', 'passive'] as const) expect(h.catches(a)).toBe(true);
  });

  it('an undercut draws in only the passive', () => {
    const u = hazard('undercut');
    expect(u.catches('passive')).toBe(true);
    expect(u.catches('head-first')).toBe(false);
    expect(u.catches('feet-first')).toBe(false);
  });

  it('is never spent: the strainer is still there for the next one', () => {
    const s = hazard('strainer');
    s.meet(makeStuff(() => new RiverHazard()) as never, 'head-first', () => undefined);
    expect(s.isArmed()).toBe(true);
    expect(s.catches('passive')).toBe(true);
  });
});
