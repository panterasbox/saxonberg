/**
 * The `flesh` reserve (farmstead W7 / D24, P7) — ⭐⭐ **body condition is
 * fat cover, which is a STOCK.**
 *
 * It is not a summary of history and not a derived buffer. It is a
 * reserve in exactly the sense this engine already means, and the
 * substrate was not merely available — it was already biological: every
 * living body installs its reserves in the `Creature` constructor,
 * metabolism drives them, and flooring one spawns a named condition.
 *
 * > **`satiation` is hours; `flesh` is months.** Satiation is the flow;
 * > flesh is the stock the flow deposits into.
 *
 * ## Why this is its own wave
 *
 * ⚠ The blast radius is **every living body in the game** — the player,
 * the pet, the NPC, the livestock that do not exist yet. So it lands
 * alone, with its own regression run, and not inside the livestock wave
 * where a failure would read as a ranching bug.
 *
 * ⭐ And it lands three things for free, all asserted below: starvation
 * stops being a special case, one physiological model covers player and
 * livestock alike (which is what makes D29's *one mortality rule for
 * every kept animal* true rather than asserted), and chronic
 * under-nutrition degrades acute body state **with no new wiring**,
 * because `VitalsMixin.getConditionBand` already sums floored biological
 * reserves.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { BIOLOGICAL_RESERVE_KEYS } from '../../reserve';
import { METABOLIC_DEFAULTS } from '../Metabolic';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;

/**
 * A body somebody owns — the one kind that integrates an absence longer
 * than the far-past guard.
 *
 * ⚠ The guard exists so real-life absence never starves the PLAYER, and
 * an NPC is spared for a different reason (nobody is responsible for
 * feeding it). A kept animal is neither, and the whole winter-feed budget
 * rests on its clock running while its keeper is away. In this wave
 * `ChattelMixin` is still Thing-only, so the seam is overridden here
 * rather than stamped — which is also the cheapest possible statement of
 * what the seam MEANS.
 */
class KeptCreature extends Creature {
  /**
   * The ration this animal is on, held constant. ⭐ The scenario every
   * test here wants is *fed at this level for months*, not *fed once* —
   * and the basal drain would otherwise empty satiation inside a day and
   * turn every test into the same test.
   */
  public ration = 55;

  protected override integratesLongAbsence(): boolean {
    return true;
  }

  protected override basalDrain(stepMin: number): void {
    super.basalDrain(stepMin);
    const current = this.getReserve('satiation')?.current.rawValue() ?? 0;
    this.adjustReserve('satiation', Quantity.of(this.ration - current, '%'));
    // ⚠ And WATER. An animal on short rations still gets water, and
    // without this every scenario here dies of thirst in eight hours —
    // the cascade returns at the first lethal condition, so a dehydrated
    // body never reaches the flesh leg at all. A real find: the acute
    // conditions genuinely do outrank the chronic one.
    const hyd = this.getReserve('hydration')?.current.rawValue() ?? 0;
    this.adjustReserve('hydration', Quantity.of(60 - hyd, '%'));
  }
}

describe('flesh — the stock the flow deposits into', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const body = (ration: number): KeptCreature => {
    const c = makeStuff(() => new KeptCreature());
    c.setLifecycleState('alive');
    c.ration = ration;
    const raw = c.getReserve('satiation')!;
    c.adjustReserve('satiation', Quantity.of(ration - raw.current.rawValue(), '%'));
    return c;
  };

  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  it('⭐ every living body installs it, and it is BIOLOGICAL', () => {
    const c = makeStuff(() => new Creature());
    expect([...c.getReserves().keys()].sort()).toEqual(
      [...BIOLOGICAL_RESERVE_KEYS].sort(),
    );
    expect(c.getFlesh().theme).toBe('biological');
    expect(c.getFlesh().floorEffect).toBe('emaciation');
  });

  it('⚠ starts IN GOOD FLESH, not full — 100 % fat cover is not healthy', () => {
    const c = makeStuff(() => new Creature());
    expect(c.bodyConditionBand()).toBe('good');
    expect(c.getFlesh().current.rawValue()).toBeLessThan(100);
  });

  it('⭐⭐ fed above maintenance it GAINS; fed below it LOSES', () => {
    const fat = body(100);
    // ⚠ Five, not zero. A body on NOTHING starves to death in a day —
    // that is the acute arc and it is untouched. What wastes an animal
    // over months is a ration that is not quite enough, which is the
    // whole distinction `flesh` exists to model.
    const starved = body(5);
    const before = fat.getFlesh().current.rawValue();
    advance(20);
    fat.reconcileMetabolism();
    starved.reconcileMetabolism();
    expect(fat.getFlesh().current.rawValue()).toBeGreaterThan(before);
    expect(starved.getFlesh().current.rawValue()).toBeLessThan(before);
  });

  it('⭐ and BETWEEN the two it does nothing — that is maintenance', () => {
    // The ordinary state of an adequately fed animal is no change, which
    // is what stops flesh drifting in one direction forever.
    const fed = body(
      (METABOLIC_DEFAULTS.FLESH_SURPLUS_AT + METABOLIC_DEFAULTS.FLESH_DEFICIT_AT) / 2,
    );
    const before = fed.getFlesh().current.rawValue();
    advance(20);
    fed.reconcileMetabolism();
    expect(fed.getFlesh().current.rawValue()).toBeCloseTo(before, 4);
  });

  it('⚠ losing is FASTER than gaining — a hard winter beats a good summer', () => {
    const gaining = body(100);
    const losing = body(5);
    const start = gaining.getFlesh().current.rawValue();
    advance(30);
    gaining.reconcileMetabolism();
    losing.reconcileMetabolism();
    const gained = gaining.getFlesh().current.rawValue() - start;
    const lost = start - losing.getFlesh().current.rawValue();
    expect(lost).toBeGreaterThan(gained);
  });

  it('⭐⭐ MONTHS, not hours — the whole reason it is a second reserve', () => {
    const c = body(1);
    advance(2);
    c.reconcileMetabolism();
    // Two game days of nothing has barely touched it, while satiation
    // would long since have bottomed out. Different clocks.
    expect(c.getFlesh().current.rawValue()).toBeGreaterThan(50);
    advance(120);
    c.reconcileMetabolism();
    expect(c.getFlesh().current.rawValue()).toBe(0);
  });

  it('⭐ flooring it spawns EMACIATION — not lethal, and it degrades the body', () => {
    const c = body(1);
    advance(200);
    c.reconcileMetabolism();
    expect(c.bodyConditionBand()).toBe('emaciated');
    expect(
      c
        .getConditions()
        .some(
          (a) =>
            a.kind === 'affliction' && a.templatePath.endsWith('/emaciation'),
        ),
    ).toBe(true);
  });

  it('⚠⚠ it does NOT cushion starvation — the acute arc is untouched', () => {
    // A body with fat on it still starves in a day of nothing at all.
    // Flesh is what months of shortfall leave behind, and confusing the
    // two would quietly make every well-conditioned animal immortal.
    const c = body(0);
    expect(c.getFlesh().current.rawValue()).toBeGreaterThan(0);
    advance(2);
    c.reconcileMetabolism();
    expect(
      c
        .getConditions()
        .some(
          (a) =>
            a.kind === 'affliction' && a.templatePath.endsWith('/starvation'),
        ),
    ).toBe(true);
    // …and it is still carrying most of its condition while it does so.
    expect(c.getFlesh().current.rawValue()).toBeGreaterThan(45);
  });

  it('⭐ the bands are percepts and every one is distinct (D86)', () => {
    const c = makeStuff(() => new Creature());
    const seen = new Set<string>();
    for (const level of [5, 20, 55, 80, 95]) {
      const flesh = c.getReserve('flesh')!;
      c.adjustReserve('flesh', Quantity.of(level - flesh.current.rawValue(), '%'));
      seen.add(c.bodyConditionPhrase());
      expect(c.bodyConditionPhrase()).not.toMatch(/\d/);
    }
    expect(seen.size).toBe(5);
  });

  it('⚠ a body carrying no flesh reserve is a NO-OP, never a zero', () => {
    const c = body(55);
    c.removeReserve('flesh');
    advance(50);
    expect(() => c.reconcileMetabolism()).not.toThrow();
    expect(c.hasReserve('flesh')).toBe(false);
    // And the band answers honestly rather than reading as starving.
    expect(c.bodyConditionBand()).toBe('good');
  });
});
