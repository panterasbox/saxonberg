/**
 * ⭐⭐ Staged vs owned (paint D7): a building nobody has bought writes no
 * record — it comes back as its row authored it every time the world
 * restages (today: every boot); one a PERSON holds keeps its coats and its
 * fabric. A ship keeps her voyage either way, and her hull's coats only
 * once she is sold.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Structure from '../../../platform/idea/Structure';
import Ship from '../../../platform/idea/Ship';
import { FacedMixin } from '../../material/Faced';
import { WeatheringMixin } from '../../material/Weathering';
import { ShellMixin } from '../Shell';
import { StuffApi } from '../../../api/stuff';
import { ParcelApi } from '../../../api/parcel';
import { MixinApi } from '../../../api/mixin';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { ParcelRecord } from '../../parcel/ParcelRecord';
import type { AnyConstructor } from '../../../api/mixin';

function held(kind: 'player' | 'organization' | null): void {
  vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockImplementation(() =>
    kind === null
      ? null
      : ({ getOwner: () => ({ kind, templatePath: '/someone' }) } as unknown as ParcelRecord),
  );
}

function slices(host: Structure): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of MixinApi.getPersistenceContributors(host.constructor as AnyConstructor)) {
    if (c.captureSlice) out[c.key] = c.captureSlice(host, {} as never);
  }
  return out;
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a building persists only once it is sold', () => {
  it('a staged building (nobody, or an organization, holds the ground) writes nothing', () => {
    const s = makeStuffAtPath(() => new Structure(), '/world/_p/cottage/structure');
    s.setExtent('/world/_p/cottage');
    held(null);
    expect(s.isTitleSold()).toBe(false);
    expect(s.shouldPersist()).toBe(false);
    held('organization');
    expect(s.shouldPersist()).toBe(false);
  });

  it('a building a person holds persists its coats and fabric', () => {
    const s = makeStuffAtPath(() => new Structure(), '/world/_p/house/structure');
    s.setExtent('/world/_p/house');
    s.setCoats({ outside: [{ material: '/x/oil', thicknessM: 0.00004, state: 'set' }] });
    held('player');
    expect(s.isTitleSold()).toBe(true);
    expect(s.shouldPersist()).toBe(true);
    const state = slices(s) as Record<string, { fields: Record<string, unknown> }>;
    expect(state.FacedMixin?.fields.coats).toBeTruthy();
  });
});

describe('a ship keeps her voyage; her hull resets until she is sold', () => {
  it('persists while staged, and her coat slices are empty until sold', () => {
    const ship = makeStuffAtPath(() => new Ship(), '/world/_p/hesper/structure');
    ship.setExtent('/world/_p/hesper');
    ship.setCoats({ outside: [{ material: '/x/tar', thicknessM: 0.001, state: 'set' }] });
    held('organization');
    expect(ship.shouldPersist()).toBe(true);
    const staged = slices(ship) as Record<string, { fields: Record<string, unknown> }>;
    for (const key of ['FacedMixin', 'WeatheringMixin', 'ShellMixin']) {
      expect(staged[key]?.fields).toEqual({});
    }
    held('player');
    const sold = slices(ship) as Record<string, { fields: Record<string, unknown> }>;
    expect(sold.FacedMixin?.fields.coats).toBeTruthy();
    expect(sold.ShellMixin?.fields.fabric).toBe(1);
  });
});

// The capability mixins are composed on the twin, never on the base.
it('the twin composes the outside; the base does not', () => {
  const s = makeStuffAtPath(() => new Structure(), '/world/_p/barn/structure');
  expect(MixinApi.isFaced(s) && MixinApi.isWeathering(s) && MixinApi.isShell(s)).toBe(true);
  void ShellMixin;
  void WeatheringMixin;
});
