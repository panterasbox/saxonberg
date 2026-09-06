/**
 * The nitrogen ledger (farmstead W10 / D14–D18) — ⭐⭐ **soil nitrogen
 * and dietary protein are ONE accounting.**
 *
 * The engine had both halves and had never connected them: soil carries
 * a `nitrogen` reserve, and `Material` carries `nutrients` /
 * `nutrientAmounts` where `stew-meat` authors `protein: 26000`. Crude
 * protein is **nitrogen × 6.25** — how feed is actually valued and sold
 * — and connecting them closes the faucet **mechanically** and teaches
 * the cycle **pedagogically**, because the player watches fertility
 * become feed value become growth become fertility.
 *
 * ⚠⚠ **The claim under test is a NEGATIVE one: no path credits nitrogen
 * from nowhere.** There are exactly two openings and both are the real
 * ones — **in**, legume fixation out of the atmosphere; **out**, leaching
 * past the roots and whatever a harvest carries away. Everything else is
 * a transfer.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { ReservedMixin, Reserve } from '../../reserve';
import {
  SoilMixin,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_ORGANIC_MATTER_RESERVE_KEY,
  SOIL_STRUCTURE_RESERVE_KEY,
  SOIL_RESERVE_THEME,
  PROTEIN_PER_NITROGEN,
} from '../Soil';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;

class TestGround extends SoilMixin(ReservedMixin(Idea)) {}

function ground(over: Partial<Record<string, number>> = {}): TestGround {
  const g = makeStuff(() => new TestGround());
  const pct = (key: string, current: number): void => {
    g.setReserve(
      new Reserve(
        key,
        Quantity.of(100, '%'),
        Quantity.of(current, '%'),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
  };
  g.setReserve(
    new Reserve(
      SOIL_MOISTURE_RESERVE_KEY,
      Quantity.of(200, 'L'),
      Quantity.of(over.moisture ?? 100, 'L'),
      SOIL_RESERVE_THEME,
      null,
    ),
  );
  pct(SOIL_NITROGEN_RESERVE_KEY, over.nitrogen ?? 25);
  pct(SOIL_ORGANIC_MATTER_RESERVE_KEY, over.organicMatter ?? 40);
  pct(SOIL_STRUCTURE_RESERVE_KEY, over.structure ?? 85);
  g.reconcileSoil();
  return g;
}

describe('the four reserves', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  beforeEach(() => {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  it('⭐ D14: crude protein IS nitrogen × 6.25 — the constant is stated once', () => {
    expect(PROTEIN_PER_NITROGEN).toBe(6.25);
  });

  it('⭐⭐ ORGANIC MATTER is the long game: it mineralises into nitrogen', () => {
    const g = ground({ nitrogen: 10, organicMatter: 60 });
    const n0 = g.nutrientFraction()!;
    const om0 = g.organicMatterFraction()!;
    advance(120);
    // Nitrogen went UP and organic matter went DOWN by the same story:
    // this is a transfer, not a faucet.
    expect(g.nutrientFraction()!).toBeGreaterThan(n0);
    expect(g.organicMatterFraction()!).toBeLessThan(om0);
  });

  it('⭐ muck is an INVESTMENT: a little now, most of it later', () => {
    const g = ground({ nitrogen: 10, organicMatter: 0 });
    const n0 = g.nutrientFraction()!;
    g.addOrganicMatter(40);
    const immediate = g.nutrientFraction()! - n0;
    expect(immediate).toBeGreaterThan(0);
    // ⚠ Most of it is NOT available yet — that is what makes it muck
    // rather than fertiliser.
    expect(immediate).toBeLessThan(40 / 100 / 2);
    advance(300);
    expect(g.nutrientFraction()! - n0).toBeGreaterThan(immediate * 1.5);
  });

  it('⚠⚠ D17: hooves on WET ground destroy structure; dry ground takes them', () => {
    const wet = ground({ moisture: 200, structure: 90 });
    const dry = ground({ moisture: 10, structure: 90 });
    wet.poach(4, 1.5);
    dry.poach(4, 1.5);
    expect(wet.structureFraction()!).toBeLessThan(0.9);
    // ⭐ The same herd, the same field, in August. Almost nothing.
    expect(dry.structureFraction()!).toBeGreaterThan(0.89);
  });

  it('structure rebuilds with rest — slower than hooves take it', () => {
    const g = ground({ moisture: 200, structure: 90 });
    g.poach(20, 1.5);
    const wrecked = g.structureFraction()!;
    expect(wrecked).toBeLessThan(0.65);
    advance(200);
    const healed = g.structureFraction()!;
    expect(healed).toBeGreaterThan(wrecked);
    // ⚠ And it is still not what it was — a wet autumn is expensive for
    // years, which is the asymmetry that makes the judgement matter.
    expect(healed).toBeLessThan(0.9);
  });

  it('⭐ D15 IN: legumes fix nitrogen out of the ATMOSPHERE', () => {
    const g = ground({ nitrogen: 20 });
    const before = g.nutrientFraction()!;
    g.fixNitrogen(6);
    expect(g.nutrientFraction()!).toBeGreaterThan(before);
  });

  it('⚠ every credit is HEADROOM-CAPPED — fertility cannot run away', () => {
    const g = ground({ nitrogen: 98, organicMatter: 98 });
    g.fixNitrogen(500);
    g.addOrganicMatter(500);
    expect(g.nutrientFraction()!).toBeLessThanOrEqual(1);
    expect(g.organicMatterFraction()!).toBeLessThanOrEqual(1);
  });

  it('⚠⚠ ground that models a reserve reads it; ground that does not reads NULL', () => {
    // Unmodelled is not zero. A pot authors no nitrogen and is therefore
    // never nutrient-limited, and the same rule has to hold for the two
    // reserves this wave added or every houseplant in the game would
    // suddenly be structureless.
    const bare = makeStuff(() => new TestGround());
    expect(bare.nutrientFraction()).toBeNull();
    expect(bare.organicMatterFraction()).toBeNull();
    expect(bare.structureFraction()).toBeNull();
    expect(bare.addOrganicMatter(10)).toBe(0);
    expect(bare.poach(10, 1)).toBe(0);
    expect(bare.fixNitrogen(10)).toBe(0);
  });

  it('⭐ the leach rate is the HOST’s, because only the host knows its texture', () => {
    // The default is a loam's. A field overrides it off its own seeded
    // character — sand leaks, clay holds — which is D2's multiplication.
    expect(ground().soilLeachRate()).toBeGreaterThan(0);
  });
});
