import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import BusinessEntity from '../idea/Business';
import { StuffApi } from '../../api/stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

const PATH = '/world/lounge/business';

function seedBusiness(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), PATH);
  b.proprietorPath = '/world/lounge/npc/dave';
  b.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 12, confers: ['MakerMixin'] },
  ];
  b.rosterSlots = [
    {
      positionKey: 'bartender',
      assignee: '/world/lounge/npc/mara',
      schedule: [{ days: [0, 1, 2, 3, 4], hours: [6, 14] }],
    },
  ];
  b.operatingLocations = ['/world/lounge/bar'];
  return b;
}

describe('BusinessEntity', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('resolves the proprietor edge', () => {
    expect(seedBusiness().getProprietor()).toBe('/world/lounge/npc/dave');
  });

  it('reports a vacant proprietor seat as undefined', () => {
    const b = seedBusiness();
    b.proprietorPath = '';
    expect(b.getProprietor()).toBeUndefined();
  });

  it('exposes positions as value objects and by key', () => {
    const b = seedBusiness();
    expect(b.getPositions().map((p) => p.key)).toEqual(['bartender']);
    expect(b.getPosition('bartender')?.wageRate).toBe(12);
    expect(b.getPosition('bartender')?.confers).toEqual(['MakerMixin']);
    expect(b.getPosition('nope')).toBeUndefined();
  });

  it('builds a Roster and reports its assignments', () => {
    const b = seedBusiness();
    const roster = b.getRoster();
    expect(roster.getAssignments()).toHaveLength(1);
    const a = b.getRosterAssignments()[0]!;
    expect(roster.evaluate(a, { weekday: 2, hour: 10 })).toBe('on-shift');
  });

  it('reports its operating locations', () => {
    expect(seedBusiness().getOperatingLocations()).toEqual([
      '/world/lounge/bar',
    ]);
  });

  it('keys its account on its own path', () => {
    expect(seedBusiness().getAccountPath()).toBe(PATH);
  });

  it('refuses ordinary destruct (singleton)', () => {
    expect(seedBusiness().canDestruct().ok).toBe(false);
  });
});
