/**
 * BatteryMixin (aether-devices D5, D6): the arithmetic; drawn only by a
 * live body that keeps asking (an offline body draws nothing; a new drawer
 * starts fresh); a jump while drawn drains the jump; resting on a powered
 * thing charges across the whole absence, capped; nothing charges from an
 * unpowered surface.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import { Idea } from '../../stuff/Idea';
import { BatteryMixin } from '../Battery';
import { ReservedMixin } from '../../reserve/Reserved';
import { SwitchableMixin } from '../../boundary/Switchable';
import { PoweredMixin } from '../Powered';
import { Piecewise } from '../../Trajectory';
import { ContainerMixin } from '../../spatial/Container';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Cell extends BatteryMixin(ReservedMixin(SwitchableMixin(Good))) {}

class Pad extends PoweredMixin(ContainerMixin(Good)) {
  watts = 10;
  public override availablePowerW(): number {
    return this.watts;
  }
}

/**
 * Where everything stands — a place, never containable itself. A battery
 * never settles from limbo (a thing with no container), so every fixture
 * is somewhere, as everything in the world is.
 */
class Place extends ContainerMixin(Idea) {}
let place: Place | null = null;
function standing<T extends Good>(make: () => T): T {
  place ??= makeStuff(() => new Place());
  const t = makeStuff(make);
  ContainmentApi.move(t as never, place as never);
  return t;
}

/** The Hollis row's numbers. */
function hollis(): Cell {
  const c = standing(() => new Cell());
  c.standbyW = 0.1;
  c.useWh = 0.002;
  c.acceptW = 10;
  c.setCapacityWh(12);
  c.setOn(true);
  return c;
}

const H = 3600;

describe('BatteryMixin', () => {
  afterEach(() => {
    StuffApi.clearAll();
    place = null;
  });

  it('the arithmetic: a full Hollis lasts at least four game days of standby', () => {
    const c = hollis();
    expect(c.chargeWh(0)).toBe(12);
    // capacity ÷ draw, in game hours
    expect(12 / 0.1).toBeGreaterThanOrEqual(4 * 24);
  });

  it('drawn by one live body: a three-hour jump drains 0.3 Wh', () => {
    const c = hollis();
    c.settleBattery(0, 'ana'); // ana starts drawing
    expect(c.chargeWh(3 * H, 'ana')).toBeCloseTo(12 - 0.3, 6);
    c.settleBattery(3 * H, 'ana');
    expect(c.chargeWh(3 * H)).toBeCloseTo(11.7, 6);
  });

  it('a new drawer starts a fresh interval — an offline body drew nothing', () => {
    const c = hollis();
    c.settleBattery(0, 'ana');
    // Ana logs out; the next body to ask is a fresh one, a day later.
    c.settleBattery(24 * H, 'ana-again');
    expect(c.chargeWh(24 * H)).toBe(12);
  });

  it('switched off it draws nothing', () => {
    const c = hollis();
    c.settleBattery(0, 'ana');
    c.setOn(false);
    expect(c.chargeWh(10 * H, 'ana')).toBe(12);
  });

  it('a use spends useWh', () => {
    const c = hollis();
    c.spendUse(0, 'ana');
    expect(c.chargeWh(0)).toBeCloseTo(12 - 0.002, 6);
  });

  it('dead at empty', () => {
    const c = hollis();
    c.setChargeFraction(0, 0);
    expect(c.isDead(0)).toBe(true);
    expect(c.chargeFraction(0)).toBe(0);
  });

  it('resting on a powered pad charges across the whole absence, capped', () => {
    const c = hollis();
    c.setChargeFraction(0.1, 0); // 1.2 Wh
    const pad = standing(() => new Pad());
    ContainmentApi.move(c, pad);
    // From nowhere-ish: the stamp is what it was set to (0).
    // Half a game hour at 10 W = 5 Wh.
    expect(c.chargeWh(0.5 * H)).toBeCloseTo(1.2 + 5, 4);
    // Two game hours: full, never past it.
    expect(c.chargeWh(2 * H)).toBe(12);
  });

  it('an unpowered pad charges nothing', () => {
    const c = hollis();
    c.setChargeFraction(0.5, 0);
    const pad = standing(() => new Pad());
    pad.watts = 0;
    ContainmentApi.move(c, pad);
    expect(c.chargeWh(5 * H)).toBe(6);
  });

  it('⭐ the gap is read off the trajectory, never off the meter at the visit (drive, step 13)', () => {
    // Supplied for the whole two hours, but reading dark at the moment of
    // the settle (a grid not yet compiled after a jump): it still charged.
    class DarkAtVisit extends Pad {
      public override availablePowerW(): number {
        return 0;
      }
      public override isPowered(): boolean {
        return false;
      }
      public override poweredTrajectory(fromS: number, toS: number): Piecewise {
        return new Piecewise([{ fromS, toS: Math.max(fromS, toS), startValue: 1, target: 1, tau: 0 }]);
      }
    }
    const c = hollis();
    c.setChargeFraction(0.1, 0);
    const pad = standing(() => new DarkAtVisit());
    ContainmentApi.move(c, pad);
    expect(c.chargeWh(2 * H)).toBe(12);
  });

  it('⭐ never settles from limbo: a charger re-seated by a reset keeps the gap (drive, step 13)', () => {
    // Like the grid charger: no premises under it, no supply.
    class Charger extends Pad {
      public override availablePowerW(): number {
        return this.getContainer() === null ? 0 : this.watts;
      }
    }
    const c = hollis();
    c.setChargeFraction(0, 0);
    const pad = standing(() => new Charger());
    ContainmentApi.move(c, pad);
    c.settleBattery(0, null);
    // The room resets while its tenant is away: the pad is lifted out, and
    // a read mid-reset must not bill the half hour at nothing…
    ContainmentApi.move(pad, null as never);
    c.settleBattery(0.5 * H, null);
    // …so once it is set back, the settle charges the WHOLE hour (10 Wh),
    // where a settle from limbo would have kept only the last half (5).
    ContainmentApi.move(pad, place as never);
    c.settleBattery(H, null);
    expect(c.chargeWh(H)).toBeCloseTo(10, 4);
  });

  it('settling across where it WAS keeps what a charger gave (lifted off)', () => {
    const c = hollis();
    c.setChargeFraction(0, 0);
    const pad = standing(() => new Pad());
    c.settleBattery(H, null, pad); // an hour on the pad, settled as it leaves
    expect(c.chargeWh(H)).toBeCloseTo(10, 4);
  });

  // ⚠ Found by the drive: `put phone on charger` leaves the phone IN THE
  // ROOM with the charger as its placement host (the shipped placement
  // model) — a battery that read only its container never charged.
  it('rests on its placement host: set ON a powered pad in a room, it charges; lifted off, it keeps it', () => {
    const c = hollis();
    c.setChargeFraction(0, 0);
    const pad = standing(() => new Pad());
    const room = standing(() => new Pad());
    room.watts = 0; // the room itself supplies nothing
    ContainmentApi.move(c, room);
    const placed = vi
      .spyOn(c, 'getPlacement')
      .mockReturnValue({ host: pad as never, name: 'on' });
    c.settleBattery(0, null); // set down on the pad at t=0
    expect(c.chargeWh(0.5 * H)).toBeCloseTo(5, 4); // half an hour at 10 W
    // Lifted off an hour later: the settle across the move uses the pad.
    placed.mockReturnValue(null);
    c.settleAfterMove(H);
    expect(c.chargeWh(H)).toBeCloseTo(10, 4);
    // …and resting in the unpowered room after, it gains nothing.
    expect(c.chargeWh(3 * H)).toBeCloseTo(10, 4);
  });
});
