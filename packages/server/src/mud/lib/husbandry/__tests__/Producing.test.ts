/**
 * The taps — **three renewable products, three genuine neglect failures,
 * and no invented punishments.**
 *
 * ⭐ Moved here from `trade-ranching/src/__tests__/taps.test.ts` by the
 * taps build (W0) when `ProducingMixin` was promoted to the kernel: its
 * composers — a cow, a hive and a sap-bearing tree — have no common pack
 * ancestor. The breeding cases stayed in ranching with the species dial
 * they exercise.
 *
 * ⚠⚠ The load-bearing claim, and the one a `Stock`-shaped implementation
 * would have got wrong: **a tap fills from the production slice of the
 * energy budget and mints nothing.** An animal in poor flesh gives less,
 * because it has less to give. Copy the reset SWEEP; never the `par`
 * semantics, which is a faucet wearing a hat.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducingMixin } from '../Producing';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../platform/idea/species/Species';
import type { TapSpec } from '../../../platform/idea/species/Species';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { CelestialApi } from '../../../api/celestial';

import { EARTH_LIKE } from '../../time/CelestialProfile';

const DAY = 86_400;
const SPECIES_PATH = '/stuff/idea/species/_test/beast';

const TAPS: TapSpec[] = [
  // A dairy cow: twice a game day, and she dries off if you do not come.
  { key: 'milk', yieldRow: '/x/milk', perGameDay: 20, behaviour: 'expire', windowDays: 1 },
  // A hen: collect whenever, up to what a clutch holds.
  { key: 'eggs', yieldRow: '/x/eggs', perGameDay: 0.2, behaviour: 'accrue', windowDays: 10 },
  // A sheep: it just keeps growing.
  { key: 'wool', yieldRow: '/x/fleece', perGameDay: 0.008, behaviour: 'continuous', windowDays: 0 },
];

class TestBeast extends ProducingMixin(Creature) {}

describe('the taps', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  const beast = (flesh = 55): TestBeast => {
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES_PATH;
      return x;
    });
    const current = b.getReserve('flesh')!.current.rawValue();
    b.adjustReserve('flesh', Quantity.of(flesh - current, '%'));
    b.reconcileProduction();
    return b;
  };

  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    makeStuffAtPath(() => {
      const s = new Species();
      s.setProduction(TAPS);
      return s;
    }, SPECIES_PATH);
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('reads its taps off its species, and a species with none has none', () => {
    expect(beast().taps().map((t) => t.key)).toEqual(['milk', 'eggs', 'wool']);
    const nobody = makeStuff(() => new TestBeast());
    expect(nobody.taps()).toEqual([]);
  });

  it('⚠⚠ an animal in POOR FLESH gives less — the tap is not a faucet', () => {
    const fat = beast(80);
    const thin = beast(20);
    // ⚠ Seeded BEFORE the advance. It used to be created after it, which
    // gave it an elapsed interval of zero — so it read 0 whatever the
    // arithmetic did, and the assertion could not fail. (Found while
    // moving this file to the kernel.)
    const wasted = beast(8);
    advance(0.5);
    expect(fat.standingIn('milk')).toBeGreaterThan(thin.standingIn('milk'));
    expect(thin.standingIn('milk')).toBeGreaterThan(0);
    // …and one with nothing to give gives nothing at all.
    expect(wasted.standingIn('milk')).toBe(0);
  });

  it('⭐⭐ MILK expires: leave her and she DRIES OFF for the lactation', () => {
    const cow = beast();
    advance(0.5);
    expect(cow.standingIn('milk')).toBeGreaterThan(0);
    expect(cow.isDriedOff('milk')).toBe(false);

    advance(3);
    expect(cow.isDriedOff('milk')).toBe(true);
    expect(cow.standingIn('milk')).toBe(0);

    // ⚠ A SLOPE, not a cliff: the next lactation is unaffected, so an
    // absence costs a season and never an animal.
    cow.freshen('milk');
    advance(3.5);
    expect(cow.isDriedOff('milk')).toBe(false);
    expect(cow.standingIn('milk')).toBeGreaterThan(0);
  });

  it('⭐ EGGS accrue, and past a clutch they spoil in the nest', () => {
    const hen = beast();
    advance(5);
    const atFive = hen.standingIn('eggs');
    expect(atFive).toBeGreaterThan(0);
    advance(200);
    // Bounded by the clutch, not unbounded: the surplus is gone.
    expect(hen.standingIn('eggs')).toBeCloseTo(0.2 * 10, 1);
  });

  it('⭐ WOOL is continuous — no window to miss, and it just grows', () => {
    const sheep = beast();
    advance(360);
    const year = sheep.standingIn('wool');
    advance(720);
    expect(sheep.standingIn('wool')).toBeGreaterThan(year * 1.8);
  });

  it('⭐ taking RESETS the neglect clock, which is why it is an act', () => {
    const cow = beast();
    advance(0.5);
    const got = cow.takeFrom('milk').units;
    expect(got).toBeGreaterThan(0);
    expect(cow.standingIn('milk')).toBeLessThan(got);
    advance(1.2);
    // Taken 0.7 game days ago — inside the window, so she is fine.
    expect(cow.isDriedOff('milk')).toBe(false);
  });

  it('⚠ no far-past guard: a kept animal’s clock runs while you are away', () => {
    // That is the whole of D29. What an absence costs is a lactation, a
    // clutch and a fleece — never the animal.
    const cow = beast();
    advance(400);
    expect(cow.isDriedOff('milk')).toBe(true);
    expect(cow.standingIn('wool')).toBeGreaterThan(1);
  });
});

/* ──────────────────────────────────────────────────────────────────
 * TapSpec v2 — the window, and the three judgments the biology asks
 * for. ⭐ Each of these reads exactly ONE behaviour: `vigour` is milk's,
 * `brooding` is the hen's, `worst` is the fleece's. A test that could
 * pass for two of them would mean the feedback law had been flattened
 * back into "they are all the same thing", which is the mistake this
 * design was corrected out of.
 * ────────────────────────────────────────────────────────────────── */

const SPECIES_2 = '/stuff/idea/species/_test/beast2';

/**
 * ⚠ The suites below start the clock here, not at zero.
 *
 * `productionStamp === 0` is `reconcileProduction`'s "never stamped"
 * sentinel, so a world sitting exactly at game-second zero takes the
 * seeding branch on every read and never accrues. That is a real (if
 * tiny) edge — a fresh world's first reconcile defers by one read — and
 * it is NOT what these tests are about, so they run where every shipped
 * world actually is: well past second zero.
 */
const T0 = 1_000 * DAY;

describe('the window — when a tap is open at all', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  // ⚠ One species path PER CALL — `makeStuffAtPath` does not replace,
  // so two calls in one test used to mint two singletons at the same
  // path and `getSpecies()` threw.
  let speciesSeq = 0;
  const withTaps = (taps: TapSpec[], flesh = 55): TestBeast => {
    const path = `${SPECIES_2}-${++speciesSeq}`;
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction(taps);
      return sp;
    }, path);
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = path;
      return x;
    });
    const current = b.getReserve('flesh')!.current.rawValue();
    b.adjustReserve('flesh', Quantity.of(flesh - current, '%'));
    b.reconcileProduction();
    return b;
  };

  /** Game-seconds of the first day whose daylength satisfies `want`. */
  const findDay = (want: (frac: number, rising: boolean) => boolean): number => {
    for (let d = 1; d < 360; d++) {
      const f = dayFraction(d);
      if (want(f, f > dayFraction(d - 1))) return d * DAY;
    }
    throw new Error('no day in the year satisfies that predicate');
  };

  const at = (gameS: number): void => {
    clock.mockReturnValue(Quantity.of(gameS, 's'));
  };

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = 0;
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ `always` is the DEFAULT — every shipped row keeps its meaning', () => {
    const b = withTaps([
      { key: 'x', yieldRow: '/x', perGameDay: 1, behaviour: 'accrue', windowDays: 10 },
    ]);
    expect(b.tapWindow('x')).toEqual({ open: true, reason: null });
  });

  it('a tap the species does not author has no window and no standing', () => {
    const b = withTaps([]);
    expect(b.tapWindow('nope').open).toBe(false);
    expect(b.standingIn('nope')).toBe(0);
  });

  it('⭐⭐ a PHOTOPERIOD tap fills in long days and not in short ones', () => {
    const longDays: TapSpec[] = [
      {
        key: 'eggs',
        yieldRow: '/x/egg',
        perGameDay: 1,
        behaviour: 'accrue',
        windowDays: 10,
        window: { kind: 'photoperiod', daylightFrom: 0.5, daylightTo: 1 },
      },
    ];
    const summer = findDay((f) => f > 0.55);
    const winter = findDay((f) => f < 0.45);

    // In the long days she lays.
    at(summer);
    const hen = withTaps(longDays);
    expect(hen.tapWindow('eggs').open).toBe(true);
    at(summer + 2 * DAY);
    expect(hen.standingIn('eggs')).toBeGreaterThan(0);

    // In the short days she does not. ⭐ And the refusal says WHICH
    // side of the season we are on, which is what makes the curtain
    // sentence land at the right moment.
    at(winter);
    const winterHen = withTaps(longDays);
    const shut = winterHen.tapWindow('eggs');
    expect(shut.open).toBe(false);
    expect(['before-season', 'after-season']).toContain(shut.reason);
    at(winter + 2 * DAY);
    expect(winterHen.standingIn('eggs')).toBe(0);
  });

  it('⚠ a closed window stops the FILL and never confiscates the standing', () => {
    // A season ending is not a reason to take away what the season made.
    const spec: TapSpec[] = [
      {
        key: 'eggs',
        yieldRow: '/x/egg',
        perGameDay: 1,
        behaviour: 'accrue',
        windowDays: 10,
        window: { kind: 'photoperiod', daylightFrom: 0.5, daylightTo: 1 },
      },
    ];
    const summer = findDay((f) => f > 0.55);
    at(summer);
    const hen = withTaps(spec);
    at(summer + 3 * DAY);
    const made = hen.standingIn('eggs');
    expect(made).toBeGreaterThan(0);

    // Walk out of the band entirely.
    const winter = findDay((f) => f < 0.45);
    at(winter > summer ? winter : winter + 360 * DAY);
    expect(hen.tapWindow('eggs').open).toBe(false);
    expect(hen.standingIn('eggs')).toBeCloseTo(made, 6);
    // …and it is still takeable.
    expect(hen.takeFrom('eggs').units).toBeCloseTo(made, 6);
  });

  it('⭐⭐ a WRAPPING band is one season, not an empty one', () => {
    const spec: TapSpec[] = [
      {
        key: 'x',
        yieldRow: '/x',
        perGameDay: 1,
        behaviour: 'accrue',
        windowDays: 10,
        // Deep winter either side of the turn.
        window: { kind: 'photoperiod', daylightFrom: 0.9, daylightTo: 0.1 },
      },
    ];
    const mid = findDay((f) => f > 0.45 && f < 0.55);
    at(mid);
    expect(withTaps(spec).tapWindow('x').open).toBe(false);
  });

  it('⭐⭐⭐ `rising` tells SPRING from AUTUMN at the same daylength', () => {
    // The two cross the same band and are not the same season for a
    // tree: sap runs on the way up and not on the way down. Without
    // this term a birch would run twice a year.
    const band = { daylightFrom: 0.42, daylightTo: 0.52 };
    const spec = (rising: boolean): TapSpec[] => [
      {
        key: 'sap',
        yieldRow: '/stuff/idea/material/food/birch-sap',
        perGameDay: 3,
        behaviour: 'accrue',
        windowDays: 4,
        yieldShape: 'volume',
        window: { kind: 'weather', ...band, rising, minK: 200, maxK: 400 },
      },
    ];
    const springDay = findDay(
      (f, up) => f > band.daylightFrom && f < band.daylightTo && up,
    );
    const autumnDay = findDay(
      (f, up) => f > band.daylightFrom && f < band.daylightTo && !up,
    );
    expect(springDay).not.toBe(autumnDay);

    at(springDay);
    expect(withTaps(spec(true)).tapWindow('sap').open).toBe(true);
    at(autumnDay);
    const shut = withTaps(spec(true)).tapWindow('sap');
    expect(shut.open).toBe(false);
    expect(shut.reason).toBe('after-season');

    // …and a tap that wants the FALLING side is the mirror image.
    at(autumnDay);
    expect(withTaps(spec(false)).tapWindow('sap').open).toBe(true);
  });

  it('⭐ a THERMAL host IS gated by its own temperature — cold and warm', () => {
    // The shipped path a birch takes: inside the daylength band, the
    // tree's own temperature still has to be in range.
    const spec = (minK: number, maxK: number): TapSpec[] => [
      {
        key: 'sap',
        yieldRow: '/x/sap',
        perGameDay: 3,
        behaviour: 'accrue',
        windowDays: 4,
        window: { kind: 'weather', daylightFrom: 0, daylightTo: 1, minK, maxK },
      },
    ];
    at(findDay((f) => f > 0.4));
    // A body sits around 310 K, so a band above it reads COLD…
    expect(withTaps(spec(400, 500)).tapWindow('sap')).toEqual({
      open: false,
      reason: 'cold',
    });
    // …and one below it reads WARM.
    expect(withTaps(spec(100, 200)).tapWindow('sap')).toEqual({
      open: false,
      reason: 'warm',
    });
    // In range, open.
    expect(withTaps(spec(200, 400)).tapWindow('sap').open).toBe(true);
  });

  it('⚠⚠ the TRI-STATE rule: an UNMODELLED term reads OPEN, never closed', () => {
    // A host that answers no temperature leaves the weather opener's
    // thermal term unmodelled, and the daylength band does the work
    // alone. A term this world does not model yet may not silently kill
    // a tap — that is the fails-closed-and-silent class the whole
    // reachability discipline exists against.
    //
    // ⚠ `Creature` is NOT that host (it composes `ThermalMixin`), which
    // was this test's first premise and was wrong. The honest stand-in
    // is a producer whose temperature read comes back empty.
    class Coldless extends ProducingMixin(Creature) {
      public override getTemperature(): never {
        return undefined as never;
      }
    }
    const path = `${SPECIES_2}-unmodelled`;
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction([
        {
          key: 'sap',
          yieldRow: '/x/sap',
          perGameDay: 3,
          behaviour: 'accrue',
          windowDays: 4,
          // A band nothing could ever satisfy, if it were read at all.
          window: {
            kind: 'weather',
            daylightFrom: 0,
            daylightTo: 1,
            minK: 5_000,
            maxK: 6_000,
          },
        },
      ]);
      return sp;
    }, path);
    const host = makeStuff(() => {
      const x = new Coldless();
      x.setLifecycleState('alive');
      x._speciesPath = path;
      return x;
    });
    at(findDay((f) => f > 0.4));
    expect(host.getTemperature()).toBeUndefined();
    expect(host.tapWindow('sap').open).toBe(true);
  });

  it('⭐ the `biome` kind asks the HOST, and the default host says yes', () => {
    const spec: TapSpec[] = [
      {
        key: 'honey',
        yieldRow: '/x/comb',
        perGameDay: 0.5,
        behaviour: 'accrue',
        windowDays: 400,
        window: { kind: 'biome' },
      },
    ];
    expect(withTaps(spec).tapWindow('honey').open).toBe(true);

    // A host that knows better overrides the hook — the hive's shape.
    class Starved extends ProducingMixin(Creature) {
      public override biomeWindowOpen(): boolean {
        return false;
      }
    }
    const starvedPath = `${SPECIES_2}-starved`;
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction(spec);
      return sp;
    }, starvedPath);
    const hive = makeStuff(() => {
      const x = new Starved();
      x.setLifecycleState('alive');
      x._speciesPath = starvedPath;
      return x;
    });
    const shut = hive.tapWindow('honey');
    expect(shut.open).toBe(false);
    expect(shut.reason).toBe('no-forage');
  });

  it('⚠⚠ no refusal the kernel writes contains a DIGIT', () => {
    const b = withTaps([]);
    const reasons = [
      'before-season',
      'after-season',
      'cold',
      'warm',
      'dried-off',
      'brooding',
      'no-forage',
    ] as const;
    for (const r of reasons) {
      const prose = b.tapRefusal('x', r);
      expect(prose).not.toMatch(/\d/);
      expect(prose.length).toBeGreaterThan(10);
    }
  });
});

describe('⭐ MILK: no judgment at the act, and the loss visible coming', () => {
  let clock: ReturnType<typeof vi.spyOn>;

  const MILK: TapSpec[] = [
    {
      key: 'milk',
      yieldRow: '/stuff/idea/material/food/milk',
      perGameDay: 22,
      behaviour: 'expire',
      windowDays: 0.6,
      yieldShape: 'volume',
      window: { kind: 'event' },
    },
  ];

  const cow = (): TestBeast => {
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction(MILK);
      return sp;
    }, SPECIES_2);
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES_2;
      return x;
    });
    const current = b.getReserve('flesh')!.current.rawValue();
    b.adjustReserve('flesh', Quantity.of(55 - current, '%'));
    b.reconcileProduction();
    return b;
  };

  const at = (d: number): void => {
    clock.mockReturnValue(Quantity.of(T0 + d * DAY, 's'));
  };

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(T0, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⚠⚠ a take ALWAYS empties her — there is no now-vs-later in milk', () => {
    // The agreed answer, and the reason milk carries no per-tap
    // judgment: lactation is demand-driven, so holding some back would
    // suppress her rather than save it for later. The VESSEL decides
    // what you keep; the surplus is spilled.
    const c = cow();
    at(0.5);
    const before = c.standingIn('milk');
    expect(before).toBeGreaterThan(0);
    const took = c.takeFrom('milk');
    expect(took.units).toBeCloseTo(before, 6);
    expect(c.tapState['milk']?.standing).toBe(0);
  });

  it('⭐⭐ coming every window SUSTAINS her, indefinitely', () => {
    const c = cow();
    for (let i = 1; i <= 40; i++) {
      at(i * 0.5);
      expect(c.takeFrom('milk').units).toBeGreaterThan(0);
      expect(c.isDriedOff('milk')).toBe(false);
    }
  });

  it('⭐⭐⭐ AC 8 — going off is VISIBLE before it is lost', () => {
    // Banded off the window clock: the player who reads her is told, in
    // words and in time, that she is about to be lost. ⚠ This is the
    // whole of AC 8, and it holds no state — the one number milk was
    // ever about is how long since somebody came.
    const c = cow();
    at(0.1);
    expect(c.productionRead()).toContain('She is in full milk.');
    at(0.4);
    expect(c.productionRead()).toContain('She is heavy and wants milking.');
    at(0.55);
    expect(c.productionRead()).toContain(
      'She is overdue, and will dry off for the season if nobody comes.',
    );
    // …and only THEN is it lost.
    expect(c.isDriedOff('milk')).toBe(false);
    at(0.7);
    expect(c.isDriedOff('milk')).toBe(true);
    expect(c.productionRead()).toContain('She has dried off for this season.');
  });

  it('⚠ the window CLIFF is a slope: the next lactation is unaffected', () => {
    const c = cow();
    at(2);
    expect(c.isDriedOff('milk')).toBe(true);
    c.freshen('milk');
    at(2.4);
    expect(c.isDriedOff('milk')).toBe(false);
    expect(c.standingIn('milk')).toBeGreaterThan(0);
  });

  it('⚠⚠ her ceiling IS one window of fill — which is why no suppression curve fits', () => {
    // Recorded as a test because it is the structural fact that killed
    // the plan's D6: `ceiling = perGameDay × windowDays`, so she reaches
    // full exactly as the window closes. There is no interval in which
    // she sits full and suppresses herself — that region begins where
    // the neglect cliff already fires.
    const c = cow();
    const ceiling = 22 * 0.6;
    // Right at the window's edge she is essentially full…
    at(0.59);
    expect(c.standingIn('milk') / ceiling).toBeGreaterThan(0.95);
    // …and immediately past it the cliff has her. There is no interval
    // between "full" and "lost" for a second mechanism to live in.
    at(0.61);
    expect(c.isDriedOff('milk')).toBe(true);
  });
});

describe("⭐ the HEN's judgment: the clutch choice", () => {
  let clock: ReturnType<typeof vi.spyOn>;

  const EGGS = (broodAfterDays?: number): TapSpec[] => [
    {
      key: 'eggs',
      yieldRow: '/trade/ranching/thing/egg',
      perGameDay: 0.8,
      behaviour: 'accrue',
      windowDays: 10,
      yieldShape: 'count',
      ...(broodAfterDays === undefined ? {} : { broodAfterDays }),
    },
  ];

  const hen = (taps: TapSpec[]): TestBeast => {
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction(taps);
      return sp;
    }, SPECIES_2);
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES_2;
      return x;
    });
    const current = b.getReserve('flesh')!.current.rawValue();
    b.adjustReserve('flesh', Quantity.of(55 - current, '%'));
    b.reconcileProduction();
    return b;
  };

  const at = (d: number): void => {
    clock.mockReturnValue(Quantity.of(T0 + d * DAY, 's'));
  };

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(T0, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ a full clutch left sitting makes her BROODY, and she stops laying', () => {
    const h = hen(EGGS(4));
    // Fill the clutch: ceiling 0.8 × 10 = 8 eggs, so she is full on
    // game-day 10 and the brooding clock starts THERE — not when
    // somebody next happens to look at her.
    at(12);
    expect(h.standingIn('eggs')).toBeCloseTo(8, 6);
    expect(h.tapWindow('eggs').open).toBe(true);

    // Leave it sitting past the brooding clock.
    at(30);
    expect(h.standingIn('eggs')).toBeCloseTo(8, 6);
    const shut = h.tapWindow('eggs');
    expect(shut.open).toBe(false);
    expect(shut.reason).toBe('brooding');
    expect(h.productionRead()).toContain(
      'She is sitting tight on a clutch and has stopped laying.',
    );
  });

  it('⭐⭐⭐ TAKING THE CLUTCH restarts her — that is the choice', () => {
    const h = hen(EGGS(4));
    at(30);
    expect(h.tapWindow('eggs').reason).toBe('brooding');

    const took = h.takeFrom('eggs');
    expect(took.units).toBeCloseTo(8, 6);
    expect(h.tapWindow('eggs').open).toBe(true);
    at(35);
    expect(h.standingIn('eggs')).toBeGreaterThan(0);
  });

  it('⚠ a tap that authors NO `broodAfterDays` never broods — honey is untouched', () => {
    const h = hen(EGGS(undefined));
    at(400);
    expect(h.standingIn('eggs')).toBeCloseTo(8, 6);
    expect(h.tapWindow('eggs').open).toBe(true);
    expect(h.tapState['eggs']?.brooding).toBe(false);
  });

  it('⭐ she adds NOTHING to a full clutch — the surplus is never made', () => {
    // The prose changed with the mechanism: eggs do not pile up and rot
    // in the nest, because a hen sitting on a full clutch stops laying.
    const h = hen(EGGS(400));
    at(20);
    const full = h.standingIn('eggs');
    at(200);
    expect(h.standingIn('eggs')).toBeCloseTo(full, 6);
  });
});

describe("⭐ the FLEECE's judgment: the year it records", () => {
  let clock: ReturnType<typeof vi.spyOn>;

  const WOOL = (capUnits?: number): TapSpec[] => [
    {
      key: 'wool',
      yieldRow: '/trade/ranching/thing/fleece',
      perGameDay: 0.008,
      behaviour: 'continuous',
      windowDays: 0,
      ...(capUnits === undefined ? {} : { capUnits }),
    },
  ];

  const sheep = (taps: TapSpec[]): TestBeast => {
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction(taps);
      return sp;
    }, SPECIES_2);
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES_2;
      return x;
    });
    const current = b.getReserve('flesh')!.current.rawValue();
    b.adjustReserve('flesh', Quantity.of(55 - current, '%'));
    b.reconcileProduction();
    return b;
  };

  const at = (d: number): void => {
    clock.mockReturnValue(Quantity.of(T0 + d * DAY, 's'));
  };
  const starve = (b: TestBeast, flesh: number): void => {
    const current = b.getReserve('flesh')!.current.rawValue();
    b.adjustReserve('flesh', Quantity.of(flesh - current, '%'));
  };

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(T0, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ a LEAN SPELL leaves a weak point, and the fleece carries it to the shears', () => {
    const s = sheep(WOOL());
    at(100);
    s.standingIn('wool');
    expect(s.tapState['wool']?.worst).toBeCloseTo(1, 2);

    // A hungry month. ⚠ The WORST of the year, not the average and not
    // the state at the end — a break is a weak point wherever it falls.
    starve(s, 20);
    at(130);
    s.standingIn('wool');
    const lean = s.tapState['wool']?.worst ?? 1;
    expect(lean).toBeLessThan(0.3);

    // Recovering does NOT heal the fleece. The weak point is in the wool.
    starve(s, 70);
    at(300);
    s.standingIn('wool');
    expect(s.tapState['wool']?.worst ?? 1).toBeCloseTo(lean, 6);
    expect(s.productionRead()).toContain(
      'A lean spell has left a weak point in the fleece.',
    );
  });

  it('⭐⭐ the take CARRIES the year away and resets it', () => {
    const s = sheep(WOOL());
    starve(s, 20);
    at(60);
    s.standingIn('wool');
    starve(s, 70);
    at(120);

    const took = s.takeFrom('wool');
    expect(took.units).toBeGreaterThan(0);
    expect(took.worst).toBeLessThan(0.3);
    // The next fleece starts clean — it did not live through that year.
    expect(s.tapState['wool']?.worst).toBe(1);
    at(180);
    s.standingIn('wool');
    expect(s.tapState['wool']?.worst ?? 0).toBeGreaterThan(0.9);
  });

  it('⭐ `capUnits` caps the standing and the overflow is LOST', () => {
    const capped = sheep(WOOL(1));
    at(1000);
    expect(capped.standingIn('wool')).toBeCloseTo(1, 6);
    expect(capped.productionRead()).toContain(
      'The fleece is so heavy it is starting to shed.',
    );
  });

  it('⚠ absent `capUnits` is UNBOUNDED — what wool meant before the cap', () => {
    const s = sheep(WOOL());
    at(360);
    const year = s.standingIn('wool');
    at(1080);
    expect(s.standingIn('wool')).toBeGreaterThan(year * 2.5);
  });
});

/** Daylength as a fraction of the rotation on game-day `d`. */
function dayFraction(d: number): number {
  return (
    CelestialApi.daylightSecondsFor(
      EARTH_LIKE,
      CelestialApi.CAMPUS_LATITUDE,
      d * DAY,
    ) / EARTH_LIKE.dayLengthSeconds
  );
}
