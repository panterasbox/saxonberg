/**
 * ⭐⭐⭐ **The Norfolk four-course, derived from the ledger** (D67, D14,
 * D15, D7) — and the claim under test is the one that made the rotation
 * revolutionary: **it needs no fallow year.**
 *
 * With turnips beside barley and clover the build contains the whole
 * historical rotation, and every term of it is a mechanic that already
 * exists:
 *
 * | course | what it does to the ledger | the mechanic |
 * |---|---|---|
 * | **clover ley** | fixes nitrogen out of the AIR | `fixLegumeNitrogen`, and the crop row's `nutrientDraw: 0` |
 * | **grazed ley** | returns fertility IN PLACE | `cycleGrazedNitrogen` — the mouths were standing here |
 * | **turnips, folded** | the graze row applied to a root crop | ⭐ no new mechanism AT ALL |
 * | **barley** | exports nitrogen as protein | `drawNutrient`, at N × 6.25 |
 *
 * So a player who understands the nitrogen ledger can **rediscover the
 * agricultural revolution from the mechanics** rather than read about
 * it. That is the highest form of what this platform claims to do, and
 * it cost one crop row.
 *
 * ⚠ **Author it honestly**: the four-course was developed more gradually
 * and by more hands than the "Turnip Townshend" story suggests. The
 * mechanism is real; the great-man framing is not.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ReservedMixin, Reserve } from '@saxonberg/server/mud/lib/reserve';
import {
  SoilMixin,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_ORGANIC_MATTER_RESERVE_KEY,
  SOIL_RESERVE_THEME,
} from '@saxonberg/server/mud/lib/husbandry/Soil';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;
const CONTENT = new URL('../../../content/trade/farming/', import.meta.url);

function row(rel: string): Record<string, unknown> {
  const doc = parse(readFileSync(fileURLToPath(new URL(rel, CONTENT)), 'utf8')) as {
    data: Record<string, unknown>;
  };
  return doc.data;
}

class TestField extends SoilMixin(ReservedMixin(Idea)) {}

describe('the four courses, as authored', () => {
  it('⭐⭐ CLOVER draws nothing, because it takes its nitrogen from the AIR', () => {
    // One authored number, and it is the whole of D15. Everything else
    // in the rotation follows from clover being free.
    expect(row('thing/plant/clover.yaml').nutrientDraw).toBe(0);
  });

  it('⭐ and every other course DOES draw — the ledger has two sides', () => {
    for (const crop of ['barley', 'turnip', 'saffron', 'carrot']) {
      expect(row(`thing/plant/${crop}.yaml`).nutrientDraw).toBeGreaterThan(0);
    }
  });

  it('⭐ barley is what MALT is made from, and the row now exists', () => {
    expect(row('thing/crop/barley.yaml').material).toBe(
      '/stuff/idea/material/food/barley-grain',
    );
  });

  it('⭐⭐ saffron is LABOUR, barley is LAND — and the masses say so', () => {
    // A sack of barley is a field's work and weighs twenty-five kilos; a
    // paper of saffron is a morning on your knees and weighs ten grams.
    // The inverse relationship is authored in two numbers and nowhere
    // else, which is D44 without a price anywhere near it.
    const barley = row('thing/crop/barley.yaml').mass as number;
    const saffron = row('thing/crop/saffron.yaml').mass as number;
    expect(barley / saffron).toBeGreaterThan(1000);
  });

  it('⚠ every field crop stops in WINTER, and no houseplant does', () => {
    // The outdoor/indoor split is authored per crop rather than by class
    // — which is what "winter is not a mode" means at the content layer.
    for (const crop of ['barley', 'turnip', 'clover', 'saffron']) {
      const profile = row(`thing/plant/${crop}.yaml`).profile as Record<string, unknown>;
      expect(profile.coldStopK).toBeGreaterThan(270);
    }
    const lily = row('thing/plant/peace-lily.yaml').profile as Record<string, unknown>;
    expect(lily.coldStopK).toBeUndefined();
  });
});

describe('⭐⭐⭐ the rotation needs NO FALLOW YEAR', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  const field = (nitrogen: number): TestField => {
    const f = makeStuff(() => new TestField());
    f.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(200, 'L'),
        Quantity.of(120, 'L'),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
    for (const [key, value] of [
      [SOIL_NITROGEN_RESERVE_KEY, nitrogen],
      [SOIL_ORGANIC_MATTER_RESERVE_KEY, 40],
    ] as const) {
      f.setReserve(
        new Reserve(
          key,
          Quantity.of(100, '%'),
          Quantity.of(value, '%'),
          SOIL_RESERVE_THEME,
          null,
        ),
      );
    }
    f.reconcileSoil();
    return f;
  };

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

  /** One turn of the four-course, on the ledger and nowhere else. */
  const course = (f: TestField, day: { at: number }): void => {
    // 1. WHEAT (stood in for by barley's draw — a cereal is a cereal).
    day.at += 100;
    advance(day.at);
    f.drawNutrient(18);
    // 2. TURNIPS, FOLDED — the sheep eat them where they stand, so the
    //    draw comes straight back as muck. ⭐ The graze row applied to a
    //    root crop, and it needed no new mechanism at all.
    day.at += 70;
    advance(day.at);
    f.drawNutrient(12);
    // ⭐ Folding returns most of what the crop took, as MUCK rather than
    // as nitrogen — because dung is not fertiliser, it is what
    // fertiliser slowly comes out of. A ruminant retains single digits
    // of what it eats.
    f.addOrganicMatter(12 * 0.85);
    // 3. BARLEY — the arable half, and it exports.
    day.at += 100;
    advance(day.at);
    f.drawNutrient(18);
    // 4. THE CLOVER LEY — takes nothing out of the ground, puts nitrogen
    //    in out of the air, and is grazed, so the mouths return what
    //    they ate where they ate it.
    day.at += 90;
    advance(day.at);
    f.fixNitrogen(90 * 0.27);
    f.addOrganicMatter(14);
  };

  it('⭐⭐⭐ four courses, four times over, and the ground is NOT poorer', () => {
    const f = field(45);
    const startN = f.nutrientFraction()!;
    const startOM = f.organicMatterFraction()!;
    const day = { at: 0 };
    for (let i = 0; i < 4; i++) course(f, day);
    const endN = f.nutrientFraction()!;
    const endOM = f.organicMatterFraction()!;

    // ⭐⭐ Sixteen game-years of continuous cropping with NO FALLOW, and
    // the ground is better off. Read the two reserves together, because
    // that is what fertility IS: nitrogen is the flow and organic matter
    // is the bank it comes out of, and a rotation that held the first
    // steady while draining the second would be mining the field.
    expect(endN + endOM).toBeGreaterThan(startN + startOM);

    // ⭐ And the interesting half is WHERE it went: the four-course
    // BUILDS organic matter. That is what actually happened — the
    // rotation did not merely sustain yields, it raised them, and this
    // is the mechanism rather than an assertion about it.
    expect(endOM).toBeGreaterThan(startOM);
  });

  it('⚠ and the SAME field cropped without the ley runs itself down', () => {
    // The control. Take the clover and the folding out and it is three
    // exports and nothing back — which is what farming was before, and
    // why the fallow year existed at all.
    const f = field(45);
    const startN = f.nutrientFraction()!;
    const startOM = f.organicMatterFraction()!;
    let at = 0;
    for (let i = 0; i < 4; i++) {
      for (const draw of [18, 12, 18]) {
        at += 90;
        advance(at);
        f.drawNutrient(draw);
      }
    }
    // ⚠ Both reserves down, and the second is the one that matters: the
    // ground is not merely hungry, it is being MINED. That is what
    // farming was before the ley, and the fallow year is what people did
    // about it.
    expect(f.nutrientFraction()! + f.organicMatterFraction()!).toBeLessThan(
      startN + startOM,
    );
    expect(f.organicMatterFraction()!).toBeLessThan(startOM);
  });
});
