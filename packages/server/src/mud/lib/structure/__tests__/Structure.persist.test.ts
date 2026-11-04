/**
 * ⭐⭐ Staged vs owned (paint D7): a building nobody has bought writes no
 * record — it comes back as its row authored it every time the world
 * restages (today: every boot); one a PERSON holds keeps its coats and its
 * condition. A ship keeps her voyage either way, and her hull's coats only
 * once she is sold.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Structure from '../../../platform/idea/Structure';
import Building from '../../../platform/idea/Building';
import Ship from '../../../platform/idea/Ship';
import type { Stuff } from '../../stuff/Stuff';
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

function slices(host: Stuff): Record<string, unknown> {
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
    const s = makeStuffAtPath(() => new Building(), '/world/_p/cottage/structure');
    s.setExtent('/world/_p/cottage');
    held(null);
    expect(s.isTitleSold()).toBe(false);
    expect(s.shouldPersist()).toBe(false);
    held('organization');
    expect(s.shouldPersist()).toBe(false);
  });

  it('a building a person holds persists its coats and condition', () => {
    const s = makeStuffAtPath(() => new Building(), '/world/_p/house/structure');
    s.setExtent('/world/_p/house');
    s.setCoats({ outside: [{ material: '/x/oil', thicknessM: 0.00004, state: 'set' }] });
    held('player');
    expect(s.isTitleSold()).toBe(true);
    expect(s.shouldPersist()).toBe(true);
    const state = slices(s) as Record<string, { fields: Record<string, unknown> }>;
    expect(state.FacedMixin?.fields.coats).toBeTruthy();
    expect(state.DurableMixin?.fields.condition).toBe(1);
  });
});

describe('a ship keeps her hull with her record (paint merged into harbors)', () => {
  it('her coat and her seams are captured whoever holds her', () => {
    const ship = makeStuffAtPath(() => new Ship(), '/world/_p/hesper/structure');
    ship.setExtent('/world/_p/hesper');
    ship.setCoats({ outside: [{ material: '/x/tar', thicknessM: 0.001, state: 'set' }] });
    held('organization');
    expect(ship.shouldPersist()).toBe(true);
    const kept = slices(ship) as Record<string, { fields: Record<string, unknown> }>;
    expect(kept.FacedMixin?.fields.coats).toBeTruthy();
    expect(kept.DurableMixin?.fields.condition).toBe(1);
  });
});

// ⭐ The split (paint review): a building has an outside; a bare structure
// (the Waponi Woo peak) has none; a ship's hull takes coats AND has a
// fabric under them — her seams, which `maintain` caulks (harbors).
it('a building has a face and a condition; a bare structure neither; a ship both', () => {
  const b = makeStuffAtPath(() => new Building(), '/world/_p/barn/structure');
  expect(MixinApi.isFaced(b) && MixinApi.isDurable(b)).toBe(true);
  const peak = makeStuffAtPath(() => new Structure(), '/world/_p/peak/structure');
  expect(MixinApi.isFaced(peak) || MixinApi.isDurable(peak)).toBe(false);
  const ship = makeStuffAtPath(() => new Ship(), '/world/_p/sloop/structure');
  expect(MixinApi.isFaced(ship)).toBe(true);
  expect(MixinApi.isDurable(ship)).toBe(true);
});
