/**
 * ⭐⭐ **A hand-authored mine works with no warren at all** — the claim
 * the whole trade/locality split rests on, checked against the class an
 * author would actually reach for.
 *
 * ⚠ It exists because the claim was FALSE for one wave and no unit test
 * noticed: the reads were all on `WorkingMixin`, `MineRoom` composed it,
 * and nothing composed it over a SINGLETON base — so Rejection's three
 * authored galleries, including the tutorial drift whose entire job is
 * teaching `hew` and `shore`, had no faces, no stability, no air and no
 * acts. Found by driving.
 *
 * And the second half of the same finding: ⚠ **a row's
 * `commandContributions:` is dead silently.** The affordance is a STATIC
 * ON A CLASS, and without it the five acts parse as nothing at all.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AuthoredWorking from '../AuthoredWorking';
import MineRoom from '../MineRoom';
import { WORKING_MIXIN } from '../../lib/Working';
import Deposit from '../../idea/Deposit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const ZONE = '/world/fx/mine';
const DEPOSIT = '/world/fx/idea/deposit/fx';
const SLATE = '/stuff/idea/material/rock/slate';
const MALACHITE = '/stuff/idea/material/mineral/malachite';
const QUARTZ = '/stuff/idea/material/mineral/quartz';

/** The five acts, and the view file each lives in. */
const ACTS = [
  'trade/mining/cmd/mining/hew.yaml',
  'trade/mining/cmd/mining/drive.yaml',
  'trade/mining/cmd/mining/sink.yaml',
  'trade/mining/cmd/mining/raise.yaml',
  'trade/mining/cmd/mining/shore.yaml',
];

let zone: CartesianZone;

describe('a hand-authored working', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: async () => '1', find: async () => [], findById: async () => null,
      delete: async () => undefined, isConnected: () => true,
    } as unknown as PersistenceManager);
    const m = makeStuffAtPath(() => new Material(), SLATE);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(90, 'MPa');
    zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
    zone.setCellSize(10);
    (zone as unknown as { deposit: string }).deposit = DEPOSIT;
    const d = makeStuffAtPath(() => new Deposit(), DEPOSIT);
    d.setStratigraphy([{ toZ: -4000, host: SLATE }]);
    d.setLode({
      through: [0, 0, -10], strike: 90, dip: 90,
      thickness: 6, strikeExtent: 2000, dipExtent: 2000, gangue: QUARTZ,
    });
    d.setZones([{ toZ: -4000, mineral: MALACHITE, meanGrade: 0.08, spread: 0.04 }]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ composes the reads, and answers every one of them with NO warren', async () => {
    const room = makeStuff(() => new AuthoredWorking());
    zone.addLocation(room as unknown as never, 0, 0, -1);
    expect(MixinApi.isActive(room as unknown as Stuff, WORKING_MIXIN)).toBe(true);
    expect((room as unknown as { getWarren?(): unknown }).getWarren?.() ?? null).toBeNull();
    // ⭐ Authored ground is Spine by definition — a static mine is a mine
    // that does not grow, which is coherent rather than degraded.
    expect(room.getTier()).toBe('spine');
    expect((await room.facesOf()).length).toBe(10);
    expect((await room.stabilityAt()).state).toBe('sound');
    expect(typeof (await room.airAt())).toBe('number');
    expect((await room.sampleHere())!.hostPath).toBe(SLATE);
  });

  it('⚠ it is NOT persistable — an authored room re-props itself each boot', () => {
    // The record belongs to a HELD CARVED cell, which is what shoring
    // buys. An authored gallery's fixtures come from its own `props:`,
    // and anything a player leaves in it is chattel.
    expect(MixinApi.isPersistable(makeStuff(() => new AuthoredWorking()) as unknown as Stuff)).toBe(false);
    expect(MixinApi.isPersistable(makeStuff(() => new MineRoom()) as unknown as Stuff)).toBe(true);
  });

  it('⭐⭐ BOTH working classes afford the five acts — the affordance is a class STATIC', () => {
    for (const Cls of [AuthoredWorking, MineRoom]) {
      const contributions = (Cls as unknown as {
        commandContributions: { self: string[]; inventory: string[] };
      }).commandContributions;
      // ⚠ A row's `commandContributions:` is dead silently. Without the
      // static, `hew` parses as nothing at all — which is exactly what
      // the drive found in the tutorial drift.
      expect([...contributions.self].sort()).toEqual([...ACTS].sort());
      // `inventory` reaches everything nested inside, at any depth, so a
      // character standing in the room gets the acts — and loses them on
      // the way out, which is the honest answer to "why can't I hew here".
      expect([...contributions.inventory].sort()).toEqual([...ACTS].sort());
    }
  });
});
