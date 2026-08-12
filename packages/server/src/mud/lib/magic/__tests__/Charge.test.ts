/**
 * Wave 3 — charge, decay, and the item economy.
 *
 * AC 6  — charge is a `Reserve` that decays on read; **stock converges
 *         to `inflow/decay` rather than growing without bound**. This is
 *         the load-bearing one: without decay, no inflow throttle can
 *         bound the world's charged stock, and the whole item economy
 *         inflates.
 * AC 7  — a charged item absorbs its own recoil and waste heat: a caster
 *         using a shove-FOCUS is displaced, a caster firing a braced
 *         charged item is not.
 * AC 8  — `recharge` moves energy from a caster's mana into an item's
 *         charge, and is refused when the caster lacks it.
 * AC 9  — a worn always-on item depletes measurably faster than the same
 *         item used as a trigger.
 * (AC 11's focus/pattern arm is retired — see the implements slate.)
 *         refreshed through the same `recharge` path.
 *
 * (AC 10 — mana recovery consumes satiation and hydration — lives in
 * `Caster.coupled.test.ts`, next to the keystone it now rides.)
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { Charge } from '../Charge';
import { ChargedMixin, CHARGE_DEFAULTS } from '../Charged';
import { ArcaneMixin } from '../Arcane';
import Thing from '../../stuff/Thing';
import { ReservedMixin } from '../../reserve';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestWand extends ChargedMixin(ReservedMixin(ArcaneMixin(Thing))) {}

const SCALE = 12;
let real = 0;

/** Advance GAME seconds. Deliberately in ONE jump where the point is
 * that an item decays unwatched — there is no far-past guard to dodge. */
function advance(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

describe('Charge — the arithmetic (pure)', () => {
  it('AC6 — decay is exponential: a leak proportional to what is stored', () => {
    // S(t) = S₀·e^(−d·t). Not a linear drain — that would empty a big
    // tank and a small one at the same rate, which no charge separation
    // does.
    const halfLifeSec = Math.LN2 / 1e-6;
    expect(Charge.decayFor(1000, halfLifeSec, 1e-6)).toBeCloseTo(500, 6);
    expect(Charge.decayFor(1000, 2 * halfLifeSec, 1e-6)).toBeCloseTo(250, 6);
    // Nothing to leak, no leak.
    expect(Charge.decayFor(0, 1000, 1e-6)).toBe(0);
    // No elapsed time, no loss — and no invented energy on a bad input.
    expect(Charge.decayFor(1000, 0, 1e-6)).toBe(1000);
    expect(Charge.decayFor(1000, -5, 1e-6)).toBe(1000);
    expect(Charge.lossOver(1000, halfLifeSec, 1e-6)).toBeCloseTo(500, 6);
  });

  it('AC6 — S* = inflow/d, and is INFINITE without decay', () => {
    expect(Charge.equilibrium(2, 0.001)).toBe(2000);
    expect(Charge.equilibrium(10, 0.1)).toBe(100);
    // The failure mode D7 exists to prevent, stated as arithmetic: with
    // no decay there is no equilibrium at all, at ANY inflow throttle.
    expect(Charge.equilibrium(0.0001, 0)).toBe(Infinity);
    expect(Charge.equilibrium(1e9, 0)).toBe(Infinity);
    expect(Charge.equilibrium(0, 0.1)).toBe(0);
  });

  it('AC6 — stock CONVERGES to inflow/decay rather than growing without bound', () => {
    // The headline acceptance criterion, driven as the actual stock
    // equation: dS/dt = inflow − d·S.
    const inflow = 5; // kJ per game-second pushed into circulation
    const decay = 0.002;
    const target = Charge.equilibrium(inflow, decay); // 2500

    let stock = 0;
    for (let i = 0; i < 20_000; i++) {
      stock = Charge.stepStock(stock, inflow, decay, 1);
    }
    expect(stock).toBeCloseTo(target, 3);

    // …and it converges from ABOVE too — an over-filled world drains
    // back down rather than staying flooded. That is what makes an
    // author's twenty extra wands self-correcting instead of permanent.
    let flooded = target * 10;
    for (let i = 0; i < 20_000; i++) {
      flooded = Charge.stepStock(flooded, inflow, decay, 1);
    }
    expect(flooded).toBeCloseTo(target, 3);
  });

  it('AC6 — with NO decay the same stock grows without bound', () => {
    // The control case. Throttle the inflow as hard as you like; it
    // still runs away, because nothing ever leaves.
    let stock = 0;
    for (let i = 0; i < 20_000; i++) {
      stock = Charge.stepStock(stock, 0.001, 0, 1);
    }
    expect(stock).toBeCloseTo(20, 6);
    let longer = 0;
    for (let i = 0; i < 200_000; i++) {
      longer = Charge.stepStock(longer, 0.001, 0, 1);
    }
    // Ten times the time, ten times the stock. No fixed point.
    expect(longer).toBeCloseTo(200, 6);
  });

  it('AC9 — standby draw converts through the GAME-TIME scale, not around it', () => {
    // 12 game-seconds is ONE real second, so a 1 W draw costs 1 J.
    expect(Charge.standbyDraw(1, 12, 12)).toBeCloseTo(0.001, 9); // kJ
    // At scale 1 the same interval is 12 real seconds → 12 J.
    expect(Charge.standbyDraw(1, 12, 1)).toBeCloseTo(0.012, 9);
    // The 12× factor is the likeliest place a dishonest number hides —
    // getting it backwards would drain an item 144× wrong.
    expect(Charge.standbyDraw(1, 12, 12)).not.toBeCloseTo(
      Charge.standbyDraw(1, 12, 1),
      9,
    );
    expect(Charge.standbyDraw(0, 100, 12)).toBe(0);
  });
});

describe('ChargedMixin — the battery', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('installs its tank at the authored capacity, in kJ', () => {
    const wand = makeStuff(() => new TestWand());
    wand.setCapacityKJ(900);
    const pool = wand.getCharge()!;
    expect(pool.capacity.unit).toBe('kJ');
    expect(pool.capacity.rawValue()).toBe(900);
    expect(wand.getChargeFraction()).toBe(1);
    expect(wand.isDepleted()).toBe(false);
    expect(() => wand.setCapacityKJ(0)).toThrow(/positive/);
  });

  it('AC6 — decays on read, and does so with NOBODY WATCHING', () => {
    const wand = makeStuff(() => new TestWand());
    wand.setCapacityKJ(1000);
    const before = wand.getStoredKJ(); // seeds the stamp
    expect(before).toBe(1000);

    // ONE enormous jump — far past anything metabolism would integrate.
    // An item is not a body: there is deliberately no far-past guard and
    // no linkdead freeze here, because `S* = inflow/d` is only true if
    // stock leaks while unobserved. Copying metabolism's guard would
    // silently break distribution.
    advance(20_000_000);
    const after = wand.getStoredKJ();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0); // asymptotic, never a cliff
  });

  it('spends all-or-nothing; a spend it cannot cover takes NOTHING', () => {
    const wand = makeStuff(() => new TestWand());
    wand.setCapacityKJ(100);
    expect(wand.spendCharge(40)).toBe(true);
    expect(wand.getStoredKJ()).toBeCloseTo(60, 6);

    // A half-powered firing is not a thing — and a partial spend would
    // make "depleted" unreportable.
    expect(wand.spendCharge(1000)).toBe(false);
    expect(wand.getStoredKJ()).toBeCloseTo(60, 6);

    expect(wand.spendCharge(60)).toBe(true);
    expect(wand.isDepleted()).toBe(true);
    // A flat wand refuses further spends. It does NOT stop being a wand.
    expect(wand.spendCharge(1)).toBe(false);
  });

  it('AC8 — takes charge in, clamped at capacity, reporting what it took', () => {
    const wand = makeStuff(() => new TestWand());
    wand.setCapacityKJ(100);
    wand.spendCharge(80); // 20 left
    expect(wand.receiveCharge(50)).toBeCloseTo(50, 6);
    expect(wand.getStoredKJ()).toBeCloseTo(70, 6);
    // Only the room is taken — the rest of the offer is not consumed.
    expect(wand.receiveCharge(1000)).toBeCloseTo(30, 6);
    expect(wand.getStoredKJ()).toBeCloseTo(100, 6);
    expect(wand.receiveCharge(10)).toBe(0);
  });

  it('AC9 — a worn ALWAYS-ON item depletes measurably faster than a trigger', () => {
    const ring = makeStuff(() => new TestWand());
    const wand = makeStuff(() => new TestWand());
    for (const item of [ring, wand]) item.setCapacityKJ(1000);
    ring.setAlwaysOn(true);
    ring.setDrawActive(true);
    // Seed both stamps at the same moment.
    ring.getStoredKJ();
    wand.getStoredKJ();

    advance(500_000);
    const ringLeft = ring.getStoredKJ();
    const wandLeft = wand.getStoredKJ();

    // Always-on is the EXPENSIVE mode (D8) — and it bites hardest on
    // exactly the class most prone to inflation, because people wear
    // rings and stow wands.
    expect(ringLeft).toBeLessThan(wandLeft);
    expect(wandLeft - ringLeft).toBeGreaterThan(0);
    // The draw dominates the idle leak by a wide margin, not a rounding
    // difference: D8's claim is days-versus-months, and a ratio near 1
    // would make always-on a free choice.
    const leak = 1000 - wandLeft;
    const draw = 1000 - ringLeft;
    expect(draw).toBeGreaterThan(leak * 3);
  });

  it('AC9 — turning the draw OFF bills the interval that just ended, then stops', () => {
    const ring = makeStuff(() => new TestWand());
    ring.setCapacityKJ(1000);
    ring.setAlwaysOn(true);
    ring.getStoredKJ();

    ring.setDrawActive(true);
    advance(200_000);
    const afterDrawing = ring.getStoredKJ();
    ring.setDrawActive(false);
    const atSwitchOff = ring.getStoredKJ();

    advance(200_000);
    const afterIdle = ring.getStoredKJ();
    const drawingLoss = 1000 - afterDrawing;
    const idleLoss = atSwitchOff - afterIdle;
    expect(drawingLoss).toBeGreaterThan(idleLoss);
  });

  it('a depleted item is still CHARGED — composition, never state (D34)', () => {
    const wand = makeStuff(() => new TestWand());
    wand.setCapacityKJ(10);
    wand.spendCharge(10);
    expect(wand.isDepleted()).toBe(true);
    // The affordance reflects the kind. If a flat wand stopped being a
    // charged thing, its verb would vanish and the affordance list would
    // become a free charge meter.
    const contributions = (
      TestWand as unknown as { commandContributions?: { environment?: string[] } }
    ).commandContributions;
    // A held wand grants OUTWARD to its wielder — `environment`.
    expect(contributions?.environment).toContain('magic/zap.yaml');
  });
});
