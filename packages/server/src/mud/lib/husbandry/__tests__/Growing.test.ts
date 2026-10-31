/**
 * GrowingMixin — the living-world growth model (husbandry phase 1).
 * Reconcile-on-read over game-time with NO far-past guard and NO linkdead
 * freeze (the two lines this build exists to not inherit from `Wet.ts`);
 * three inputs combined by the limiting factor; a step cap, never a time
 * cap. See docs/subsystems/husbandry.md.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import { GrowingMixin, type GrowthProfileData } from '../Growing';
import { SoilMixin } from '../Soil';
import { COMPETENCE_BANDS, COMPETENCE_HALF_WIDTH } from '../../advancement/CompetenceBand';
import { ContainerMixin } from '../../spatial/Container';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi } from '../../../api/biome';
import { SOIL_MOISTURE_RESERVE_KEY } from '../Cultivable';
import { ReservedMixin, Reserve } from '../../reserve';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { ThermalMixin } from '../../thermal/Thermal';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity, type Unit } from '../../quantity';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';
import { AdvancementMixin } from '../../advancement/Advancement';
import { PersonaMixin } from '../../character/Persona';
import TranscriptEntry from '../../advancement/TranscriptEntry';
import { Competence } from '../../advancement/Competence';
import { PersistApi } from '../../../api/persist';
import { DerivedStandingCache } from '../../standing/DerivedStandingCache';

/**
 * The mixin under test, in isolation. Since phase 2 the WATER lives in the
 * ground rather than the plant, so this fixture plays **both** roles: it
 * holds the moisture reserve and implements the soil seams against it,
 * standing in for the `Cultivable` a real plant would be rooted in.
 *
 * Keeping the reserve here is deliberate — it lets every existing
 * assertion about the growth CURVE (drain rate, wilt ramp, step cap, death
 * latch) go on saying exactly what it said, which is the point of a
 * storage move: the fixtures move, the assertions do not. The bed's own
 * drain/competition behaviour is proven separately in GardenBed.test.ts.
 */
class GrowFixture extends GrowingMixin(ReservedMixin(Good)) {
  /** Test lever for the light window (no perception substrate here). */
  public luxOverride = 0;
  /** Test lever for the pot seam (null = unpotted). */
  public rootOverride: number | null = null;
  /** Test lever for the nutrient seam (null = ground declares none). */
  public nutrientOverride: number | null = null;
  /** When false, the fixture stands in for an UNROOTED plant. */
  public rootedInSoil = true;
  public floweringLatches = 0;

  protected override sampleLux(): number {
    return this.luxOverride;
  }
  protected override rootRoom(): number | null {
    return this.rootOverride;
  }
  protected override nutrientLevel(): number | null {
    return this.nutrientOverride;
  }
  protected override onFloweringLatched(): void {
    this.floweringLatches += 1;
  }

  // ── the soil seams, backed by this fixture's own reserve ──

  protected override soilMoisture(): number | null {
    if (!this.rootedInSoil) return null;
    const reserve = this.getReserve(SOIL_MOISTURE_RESERVE_KEY);
    if (!reserve) return null;
    const capacity = reserve.capacity.rawValue();
    if (capacity <= 0) return null;
    return reserve.current.rawValue() / capacity;
  }

  /**
   * Drain-then-report, the shape a real bed's `reconcileSoil` has: the
   * ground consumes its occupants' demand over the elapsed window and
   * reports the MEAN across it. Called once per plant reconcile.
   */
  protected override meanSoilMoisture(): number | null {
    if (!this.rootedInSoil) return null;
    const reserve = this.getReserve(SOIL_MOISTURE_RESERVE_KEY);
    if (!reserve) return null;
    const capacity = reserve.capacity.rawValue();
    if (capacity <= 0) return null;
    const nowS = now;
    const elapsed = Math.max(0, nowS - this._soilStamp);
    this._soilStamp = nowS;
    const start = reserve.current.rawValue();
    const draw =
      this.waterDemandPerGameDay() * (elapsed / DAY) * this.testWarmth;
    const end = Math.max(0, start - draw);
    if (draw > 0) this.adjustReserve(
      SOIL_MOISTURE_RESERVE_KEY,
      Quantity.of(-(start - end), 'L'),
    );
    const startF = start / capacity;
    const endF = end / capacity;
    if (draw <= 0) return startF;
    return end > 0 ? (startF + endF) / 2 : (startF * (start / draw)) / 2;
  }

  protected override waterTheSoil(litres: number): number {
    const reserve = this.getReserve(SOIL_MOISTURE_RESERVE_KEY);
    if (!reserve) return 0;
    const headroom = reserve.capacity.rawValue() - reserve.current.rawValue();
    const applied = Math.min(litres, Math.max(0, headroom));
    if (applied <= 0) return 0;
    this.adjustReserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(applied, 'L'));
    return applied;
  }

  /** The soil's own stamp — the fixture's stand-in for the bed's. */
  public _soilStamp = BASE;
  /** Warmth multiplier the stand-in soil applies (1 = neutral). */
  public testWarmth = 1;
}

/** Counts moisture drains — one per reconcile step (the step-cap proof). */
class CountingFixture extends GrowFixture {
  public drainCalls = 0;
  public override adjustReserve(key: string, delta: Quantity<Unit>): void {
    this.drainCalls += 1;
    super.adjustReserve(key, delta);
  }
}

class LinkdeadFixture extends GrowingMixin(
  ReservedMixin(HasInteractiveMixin(Good)),
) {
  protected override sampleLux(): number {
    return 0;
  }
}


const DAY = 86_400; // game-seconds per game-day
// A realistic game-time base — production clocks never sit at exactly 0, so
// the `stamp === 0` first-touch sentinel is only a fresh-object marker.
const BASE = 10_000_000;

let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

/** A light-indifferent, unpotted default profile; override per test. */
function profile(over: Partial<GrowthProfileData> = {}): GrowthProfileData {
  return {
    moistureHappyAt: 0.35,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0.15,
    luxHappyAt: 0, // 0/0 ramp reads 1 — light-indifferent
    luxDarkAt: 0,
    rootDemand: { seedling: 0.1, young: 0.3, established: 0.8, mature: 2 },
    daysToStage: { young: 30, established: 90, mature: 170 },
    ...over,
  };
}

function installMoisture(
  t: { setReserve(r: Reserve): void },
  capacity = 1,
  current = capacity,
): void {
  t.setReserve(
    new Reserve(
      SOIL_MOISTURE_RESERVE_KEY,
      Quantity.of(capacity, 'L'),
      Quantity.of(current, 'L'),
      'cultivation',
      'wilting',
    ),
  );
}

function fixture(over: Partial<GrowthProfileData> = {}): GrowFixture {
  const t = makeStuff(() => new GrowFixture());
  installMoisture(t);
  t.setProfile(profile(over));
  return t;
}

describe('GrowingMixin — the growth model', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('a plant names its tool and its Discipline — by hand and horticulture unless the row says', () => {
    const f = fixture();
    expect(f.getHarvestTool()).toBe('');
    expect(f.getDiscipline()).toBe('horticulture');
    f.setHarvestTool('cutting');
    f.setDiscipline('silviculture');
    expect(f.getHarvestTool()).toBe('cutting');
    expect(f.getDiscipline()).toBe('silviculture');
    // An empty Discipline falls back rather than crediting nothing.
    f.setDiscipline('');
    expect(f.getDiscipline()).toBe('horticulture');
  });

  it('first touch seeds the stamp and integrates nothing from epoch', () => {
    const f = fixture();
    setNow(10 * DAY); // never read before — the stamp seeds NOW
    expect(f.getSoilMoisture()).toBe(1);
    expect(f.getVigor()).toBeCloseTo(0.7, 5);
    expect(f.getConditionBand()).toBe('healthy');
  });

  it('moisture drains over elapsed game-time on read', () => {
    const f = fixture();
    f.getVigor(); // seed the stamp
    setNow(4 * DAY);
    // ET 0.15 L/game-day against a 1 L root zone → 0.4 left after 4 days.
    expect(f.getSoilMoisture()).toBeCloseTo(1 - 0.15 * 4, 3);
  });

  it('a watered plant holds; an unwatered one declines', () => {
    const cared = fixture();
    const neglected = fixture();
    cared.getVigor();
    neglected.getVigor();
    for (let d = 6; d <= 60; d += 6) {
      setNow(d * DAY);
      cared.waterPlant(1);
      neglected.getVigor();
    }
    expect(cared.getVigor()).toBeGreaterThanOrEqual(0.55); // healthy+
    expect(neglected.getVigor()).toBeLessThan(0.3); // failing
  });

  it('waterPlant credits only the headroom and reports what it applied', () => {
    const f = fixture();
    f.getVigor();
    setNow(2 * DAY); // 0.3 L transpired
    const applied = f.waterPlant(2);
    expect(applied).toBeCloseTo(0.3, 3);
    expect(f.getSoilMoisture()).toBe(1);
    expect(f.waterPlant(1)).toBe(0); // already full
  });

  it('starving water alone caps vigor and names water as limiting', () => {
    const f = fixture();
    f.getVigor();
    setNow(40 * DAY);
    expect(f.getLimitingFactor()).toBe('water');
    expect(f.getVigor()).toBeLessThan(0.55);
  });

  it('starving light alone caps vigor and names light as limiting', () => {
    const f = fixture({ litresPerGameDay: 0, luxHappyAt: 25, luxDarkAt: 1 });
    f.luxOverride = 0; // pitch dark, water plentiful
    f.getVigor();
    setNow(40 * DAY);
    expect(f.getLimitingFactor()).toBe('light');
    expect(f.getVigor()).toBeLessThan(0.55);
  });

  it('a root-bound plant names root, stalls, and never dies of it', () => {
    const f = fixture({ litresPerGameDay: 0 });
    f.rootOverride = 0.05; // half the seedling demand (0.1)
    f.getVigor();
    setNow(40 * DAY);
    expect(f.getLimitingFactor()).toBe('root');
    // Holds at the floored satisfaction — visible, not lethal.
    setNow(300 * DAY);
    expect(f.getConditionBand()).not.toBe('dead');
    expect(f.getVigor()).toBeCloseTo(0.5, 1); // ratio 0.5 > floor 0.4
    expect(f.getGrowthStage()).toBe('seedling'); // maturity stalled
  });

  it('with rootRoom() null the root axis never limits (the bare fixture)', () => {
    const f = fixture({ litresPerGameDay: 0 });
    f.getVigor();
    setNow(20 * DAY);
    expect(f.getLimitingFactor()).toBeNull();
    expect(f.getVigor()).toBeGreaterThan(0.7); // rising toward 1
  });

  it('good care advances all four stages and latches flowering once', () => {
    const f = fixture({ litresPerGameDay: 0 });
    f.getVigor();
    setNow(35 * DAY);
    expect(f.getGrowthStage()).toBe('young');
    setNow(95 * DAY);
    expect(f.getGrowthStage()).toBe('established');
    setNow(175 * DAY);
    expect(f.getGrowthStage()).toBe('mature');
    expect(f.isFlowering()).toBe(true);
    expect(f.floweringLatches).toBe(1);
    setNow(400 * DAY);
    expect(f.isFlowering()).toBe(true);
    expect(f.floweringLatches).toBe(1); // one seed per episode
  });

  it('flowering clears when vigor falls back, and a new episode re-latches', () => {
    const f = fixture({ litresPerGameDay: 0 });
    f.getVigor();
    setNow(200 * DAY);
    expect(f.isFlowering()).toBe(true);
    // Bind the roots: limiting drops to the 0.4 floor, vigor follows.
    f.rootOverride = 0.05;
    setNow(240 * DAY);
    expect(f.isFlowering()).toBe(false);
    // Repot (unbind): vigor recovers, flowering re-latches — episode two.
    f.rootOverride = null;
    setNow(320 * DAY);
    expect(f.isFlowering()).toBe(true);
    expect(f.floweringLatches).toBe(2);
  });

  it('the band ladder walks in order and never skips a band', () => {
    const ORDER = ['dead', 'failing', 'stressed', 'healthy', 'thriving'];
    const f = fixture();
    f.getVigor();
    const seen: string[] = [f.getConditionBand()];
    // Care phase — water every other game-day for 40 days (→ thriving)…
    for (let d = 2; d <= 40; d += 2) {
      setNow(d * DAY);
      f.waterPlant(1);
      const band = f.getConditionBand();
      if (band !== seen[seen.length - 1]) seen.push(band);
    }
    expect(seen[seen.length - 1]).toBe('thriving');
    // …then total neglect, sampled finely (→ dead).
    for (let half = 81; half <= 380; half++) {
      setNow(half * (DAY / 2));
      const band = f.getConditionBand();
      if (band !== seen[seen.length - 1]) seen.push(band);
    }
    expect(seen[seen.length - 1]).toBe('dead');
    for (let i = 1; i < seen.length; i++) {
      const step = Math.abs(
        ORDER.indexOf(seen[i]!) - ORDER.indexOf(seen[i - 1]!),
      );
      expect(step).toBe(1); // adjacent bands only — never a skip
    }
  });

  it('⭐ a multi-real-day gap reconciles fully (no far-past guard)', () => {
    const f = fixture();
    f.getVigor();
    setNow(36 * DAY); // three real days of absence, ONE read
    expect(f.getSoilMoisture()).toBe(0); // the absence was integrated
    expect(f.getVigor()).toBeLessThan(0.55); // and it cost the plant
  });

  it('⭐ an absurd gap completes in bounded work (a step cap, not a time cap)', () => {
    const f = makeStuff(() => new CountingFixture());
    installMoisture(f);
    // A trickle ET: every step drains (counts), but a year cannot kill it.
    f.setProfile(profile({ litresPerGameDay: 1e-9 }));
    f.getVigor();
    setNow(12 * 360 * DAY); // a simulated real year of absence
    f.getVigor();
    expect(f.drainCalls).toBeGreaterThan(0);
    expect(f.drainCalls).toBeLessThanOrEqual(2000); // the step cap
    expect(f.getConditionBand()).toBe('thriving'); // sane, fully integrated
  });

  it('a simulated year of neglect kills it — and the death is terminal', () => {
    const f = fixture();
    f.getVigor();
    setNow(12 * 360 * DAY);
    expect(f.getConditionBand()).toBe('dead');
    expect(f.waterPlant(5)).toBe(0); // watering does not revive
    setNow(13 * 360 * DAY);
    expect(f.getConditionBand()).toBe('dead');
    expect(f.getVigor()).toBe(0);
  });

  it('a linkdead-flagged host still reconciles (the freeze branch is absent)', () => {
    const f = makeStuff(() => new LinkdeadFixture());
    installMoisture(f);
    f.setProfile(profile());
    expect(MixinApi.isHasInteractive(f) && f.isLinkdead()).toBe(true);
    f.getVigor();
    setNow(36 * DAY);
    expect(f.getSoilMoisture()).toBe(0); // integrated despite linkdead
  });

  it('the augmenter reports SIZE, condition and cause — in that order', () => {
    const f = fixture({ litresPerGameDay: 0 });
    f.getVigor();
    const aug = (
      f as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!;

    // Size first: a fresh plant is a seedling, and the stage has to reach the
    // player — `look` is the only place growth is observable.
    expect(aug('A peace lily.', f, f)).toContain('It is still a seedling.');

    // The ladder is legible at every stage.
    setNow(35 * DAY);
    expect(aug('', f, f)).toContain('It is a young plant.');
    setNow(95 * DAY);
    expect(aug('', f, f)).toContain('It is well established.');

    // At maturity, flowering rides the size line — otherwise the seed it sets
    // into the pot would appear from nowhere.
    setNow(200 * DAY);
    expect(f.isFlowering()).toBe(true);
    expect(aug('', f, f)).toContain('in flower');

    // Order: size, then condition, then (when limiting) cause.
    const text = aug('', f, f);
    expect(text.indexOf('fully grown')).toBeLessThan(text.indexOf('thriving'));
  });

  it('a dead plant reports only that — no size, no cause to infer', () => {
    const f = fixture();
    f.getVigor();
    setNow(12 * 360 * DAY);
    expect(f.getConditionBand()).toBe('dead');
    const aug = (
      f as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!;
    const text = aug('A peace lily.', f, f);
    expect(text).toContain('It is dead.');
    expect(text).not.toContain('seedling');
    expect(text).not.toContain('The soil is dry.');
  });

  it('the augmenter reads through the getter without recursing', () => {
    const f = fixture();
    f.getVigor();
    const aug = (
      f as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!;
    const healthy = aug('A peace lily.', f, f);
    expect(healthy).toContain('It looks healthy.');
    expect(healthy).not.toMatch(/0\.\d/); // band only, never a number

    setNow(40 * DAY); // dry it out — the cause line appears
    const dry = aug('A peace lily.', f, f);
    expect(dry).toContain('The soil is dry.');
  });

});

/**
 * ⭐ Field population (W0): the plant that stands in a PART of its ground,
 * the read by band, and the specimen that does not grow.
 */
class PartSoil extends SoilMixin(ReservedMixin(Idea)) {
  public key = '';
  public override soilPartKey(): string {
    return this.key;
  }
}

/** Ground a plant stands in by containment — divided into two parts. */
class PartedGround extends SoilMixin(ReservedMixin(ContainerMixin(Idea))) {
  public parts: PartSoil[] = [];
  public override soilParts(): readonly PartSoil[] {
    return this.parts;
  }
}

function partSoil(key: string): PartSoil {
  return makeStuff(() => {
    const p = new PartSoil();
    p.key = key;
    installMoisture(p, 100, 50);
    return p;
  });
}

describe('GrowingMixin — field population seams', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('⭐ getBed resolves the part by key, and falls back to the whole ground on a missing key', () => {
    const top = partSoil('top-end');
    const lane = partSoil('lane-end');
    const ground = makeStuff(() => new PartedGround());
    ground.parts = [top, lane];
    const plant = fixture();
    ContainmentApi.move(plant, ground);
    expect(plant.getBed()).toBe(ground);
    plant.setGroundPart('lane-end');
    expect(plant.getBed()).toBe(lane);
    plant.setGroundPart('top-end');
    expect(plant.getBed()).toBe(top);
    // A patch deleted from the row never orphans the crop.
    plant.setGroundPart('far-side');
    expect(plant.getBed()).toBe(ground);
  });

  it('⭐ D17: a field\'s loose contents leave out the stand and keep a labeled plant', () => {
    // The one shared rule look, the sense verbs and the inspection card
    // read (the browser walk: the entry look and the card listed "a stand
    // of wheat" three times over — only `look` had the rule).
    const ground = makeStuff(() => new PartedGround());
    const stand = fixture({ seedRateKgPerM2: 0.015, yieldRatio: 20 });
    stand.setSownAreaM2(500);
    const plant = fixture();
    ContainmentApi.move(stand, ground);
    ContainmentApi.move(plant, ground);
    const loose = ground.getLooseContents();
    expect(loose).toContain(plant);
    expect(loose).not.toContain(stand);
  });

  it('⚠ a plant moved while its warmth resolves takes the warmth of where it ENDS UP', async () => {
    // A labeled stem is minted somewhere warm and moved straight into the
    // field; the walk begun at the mint must not answer for the field
    // (the drive's trial read a kitchen's 297 K all winter).
    const warm = makeStuff(() => new PartedGround());
    const cold = makeStuff(() => new PartedGround());
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    vi.spyOn(BiomeApi, 'resolveTemperatureFor').mockImplementation(
      async (env: unknown) => {
        if (env === warm) {
          await gate;
          return { rawValue: () => 297 } as never;
        }
        return { rawValue: () => 270 } as never;
      },
    );
    const p = fixture();
    ContainmentApi.move(p, warm);
    const first = p.restampWarmth();
    ContainmentApi.move(p, cold);
    const second = p.restampWarmth();
    release();
    await first;
    await second;
    expect(p._lastAmbientK).toBe(270);
  });

  it('standIn finds the crop of this kind rooted in the named part', () => {
    const top = partSoil('top-end');
    const lane = partSoil('lane-end');
    const ground = makeStuff(() => new PartedGround());
    ground.parts = [top, lane];
    const sown = (part: string): GrowFixture => {
      const f = fixture({ seedRateKgPerM2: 0.015, yieldRatio: 20 });
      f.setSownAreaM2(500);
      f.setGroundPart(part);
      f.setHarvestTemplatePath('/test/crop/grain');
      ContainmentApi.move(f, ground);
      return f;
    };
    const atTop = sown('top-end');
    const atLane = sown('lane-end');
    expect(atTop.standIn(lane)).toBe(atLane);
    expect(atTop.standIn(top)).toBe(atTop);
    expect(atLane.standIn(top)).toBe(atTop);
  });

  it('⭐ readLines says strictly more at each band, and never contradicts the next', () => {
    const f = fixture();
    f.getVigor();
    setNow(40 * DAY); // dry — something is short
    const reads = COMPETENCE_BANDS.map((band) => f.readLines(band));
    for (let i = 1; i < reads.length; i++) {
      const lower = reads[i - 1]!;
      const higher = reads[i]!;
      expect(higher.length).toBe(lower.length + 1);
      // Every lower band's sentence is the start of the higher one's.
      expect(higher.slice(0, lower.length)).toEqual(lower);
    }
    const expert = reads[reads.length - 1]!.join(' ');
    expect(expert).toContain('The soil is dry there.');
    expect(expert).not.toMatch(/\d/); // never a digit
    // The beginner sees only the stage and the look.
    expect(reads[0]!).toHaveLength(1);
    expect(reads[0]![0]).not.toContain('dry');
  });

  it('the read is masked by band — a caller cannot know more than its eyes do', () => {
    const f = fixture();
    f.getVigor();
    setNow(40 * DAY);
    const novice = f.readFor('novice');
    expect(novice.short).toBe(true);
    expect(novice.cause).toBeNull();
    const competent = f.readFor('competent');
    expect(competent.cause).toBe('water');
    expect(competent.severity).toBeNull();
    expect(f.readFor('proficient').severity).not.toBeNull();
  });

  it('⭐ readFor with a seed keeps the truth inside the band\'s bracket, stable per seed', () => {
    const f = fixture();
    f.getVigor();
    const truth = f.getSoilMoisture();
    for (const band of COMPETENCE_BANDS) {
      for (const seed of [1, 77, 4242, 0xdeadbeef]) {
        const a = f.readFor(band, seed).moisture!;
        const b = f.readFor(band, seed).moisture!;
        expect(a).toBe(b);
        expect(Math.abs(a - truth)).toBeLessThanOrEqual(
          COMPETENCE_HALF_WIDTH[band] + 1e-12,
        );
      }
    }
    // Without a seed there is no figure at all.
    expect(f.readFor('expert').moisture).toBeUndefined();
  });

  it('⭐ a specimen does not grow and keeps its stamped cause', () => {
    const f = fixture();
    f.getVigor();
    f._specimen = {
      from: 'the upper bench',
      part: 'top-end',
      partName: 'the top end',
      limiting: 'nutrient',
      roots: 'shallow',
      severe: true,
      next: 'water',
    };
    const vigor = f.getVigor();
    const stage = f.getGrowthStage();
    setNow(200 * DAY);
    expect(f.getVigor()).toBe(vigor);
    expect(f.getGrowthStage()).toBe(stage);
    // Not what a pocket would make of it now — what it was pulled with.
    expect(f.getLimitingFactor()).toBe('nutrient');
    expect(f.readFor('expert').next).toBe('water');
    expect(f.isSpecimen()).toBe(true);
  });

  it('takeSpecimen copies the growth and stamps the read; uncut, it stays a living plant', async () => {
    const f = makeStuffAtPathOf(fixture({ seedRateKgPerM2: 0.015, yieldRatio: 20 }));
    f.setSownAreaM2(500);
    f.setSpecimenNoun('stem of grain');
    f.getVigor();
    setNow(40 * DAY);
    const mint = (): GrowFixture => makeStuff(() => new GrowFixture());
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => mint() as never);
    const cut = await f.takeSpecimen(0.05);
    expect(cut.isSpecimen()).toBe(true);
    expect(cut.getSownAreaM2()).toBe(0);
    expect(cut.getGrowthStage()).toBe(f.getGrowthStage());
    expect(cut.getSpecimen()!.limiting).toBe(f.getLimitingFactor());
    expect(cut.getVigor()).toBeCloseTo(Math.min(1, f.getVigor() + 0.05), 6);
    const living = await f.takeSpecimen(0, { cut: false });
    expect(living.isSpecimen()).toBe(false);
    expect(living.getSownAreaM2()).toBe(0);
  });

  it('⭐ a labeled stem ripens WITH its stand under moderate stress; a pot plant under the same stress stalls', async () => {
    // Light at 0.4 of happy: under the good mark (0.6), well above death.
    const stressed = { litresPerGameDay: 0, luxHappyAt: 1000, luxDarkAt: 0 };
    const stand = makeStuffAtPathOf(
      fixture({ ...stressed, seedRateKgPerM2: 0.015, yieldRatio: 20 }),
    );
    stand.setSownAreaM2(500);
    stand.luxOverride = 400;
    const mint = (): GrowFixture => {
      const m = makeStuff(() => new GrowFixture());
      installMoisture(m);
      m.luxOverride = 400;
      return m;
    };
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => mint() as never);
    const labeled = (await stand.takeSpecimen(0, { cut: false })) as GrowFixture;
    expect(labeled.isAreaCrop()).toBe(false);
    expect(labeled._fromStand).toBe(true);
    // A cut specimen is not a field-rule individual — it does not grow.
    expect(((await stand.takeSpecimen(0)) as GrowFixture)._fromStand).toBe(false);
    const pot = fixture(stressed);
    pot.luxOverride = 400;

    for (const p of [stand, labeled, pot]) p.getVigor();
    setNow(400 * DAY);
    expect(stand.getLimitingFactor()).toBe('light');
    expect(stand.getGrowthStage()).toBe('mature');
    expect(labeled.getGrowthStage()).toBe('mature');
    expect(labeled.getConditionBand()).not.toBe('dead');
    // The pot rule: only a well-kept plant matures.
    expect(pot.getGrowthStage()).toBe('seedling');
  });

  it('the specimen variation is SEEDED — the same spot gives the same stem', () => {
    const f = fixture();
    f.setGroundPart('top-end');
    const a = f.specimenVariation();
    expect(f.specimenVariation()).toBe(a);
    expect(Math.abs(a)).toBeLessThanOrEqual(0.05);
  });
});

/**
 * ⭐ Field population W2 (D9/D10): the augmenter's BAND branch. A viewer
 * whose competence digest has been warmed reads the stand at its band; a
 * viewer that is not Advancing — or one whose digest is cold — reads the
 * floor. The digest is real (the transcript is stubbed, the fold runs),
 * so this proves the augmenter takes the band the look preload warmed.
 */
class Reader extends AdvancementMixin(PersonaMixin(Idea)) {
  static _mixinName = 'GrowingTestReader';
}

describe('GrowingMixin — the stand reads at the viewer\'s band', () => {
  interface Row {
    owner: string;
    discipline: string;
    difficulty: string;
    outcome: string;
    when: number | null;
    kind: string;
  }
  let rows: Row[] = [];

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    DerivedStandingCache._clearAllForTesting();
    rows = [];
    // ⚠ Every competence read is the FLOOR while the store is not
    // connected, which would make the expert half vacuous.
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
    vi.spyOn(TranscriptEntry, 'find').mockImplementation(
      async (query: Record<string, unknown>) =>
        rows.filter((r) =>
          Object.entries(query).every(
            ([k, v]) => (r as unknown as Record<string, unknown>)[k] === v,
          ),
        ) as never,
    );
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  function reader(path: string, band?: 'novice' | 'competent' | 'expert'): Reader {
    const r = makeStuffAtPath(() => new Reader(), path);
    if (band) {
      const run = Competence.seedRunFor(band)!;
      for (let i = 0; i < run.count; i++) {
        rows.push({
          owner: path,
          discipline: 'horticulture',
          difficulty: run.difficulty,
          outcome: 'success',
          when: null,
          kind: 'claim',
        });
      }
    }
    return r;
  }

  function dryStand(): GrowFixture {
    const f = fixture({ seedRateKgPerM2: 0.015, yieldRatio: 20 });
    f.setSownAreaM2(500);
    f.getVigor();
    setNow(40 * DAY); // dry — something is short, and the cause is water
    return f;
  }

  function augment(f: GrowFixture, viewer: unknown): string {
    const aug = (
      f as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!;
    return aug('', f, viewer);
  }

  it('⭐ an expert reads more than an untrained eye, and the untrained read is where it starts', async () => {
    const f = dryStand();
    const expert = reader('/test/agent/expert', 'expert');
    await expert.warmCompetenceDigest();
    expect(expert.competenceBandCached('horticulture')).toBe('expert');
    const untrained = reader('/test/agent/untrained');
    await untrained.warmCompetenceDigest();

    const hi = augment(f, expert);
    const lo = augment(f, untrained);
    expect(hi).toBe(f.readLines('expert').join(' '));
    expect(lo).toBe(f.readLines('untrained').join(' '));
    // Less detail, never a different truth.
    expect(hi.startsWith(lo)).toBe(true);
    expect(hi.length).toBeGreaterThan(lo.length);
    expect(hi).toContain('The soil is dry there.');
    expect(lo).not.toContain('dry');
    expect(hi).not.toMatch(/\d/);
  });

  it('a cold digest reads the floor — never a guess upward', () => {
    const f = dryStand();
    const expert = reader('/test/agent/cold-expert', 'expert');
    // No warm: the preload has not run for this reader.
    expect(augment(f, expert)).toBe(f.readLines('untrained').join(' '));
  });

  it('a viewer that is not Advancing reads the floor', () => {
    const f = dryStand();
    const stranger = makeStuff(() => new GrowFixture());
    expect(augment(f, stranger)).toBe(f.readLines('untrained').join(' '));
  });

  it('a pot plant is not banded — every viewer reads it in full', async () => {
    const f = fixture();
    f.getVigor();
    setNow(40 * DAY);
    const untrained = reader('/test/agent/potter');
    await untrained.warmCompetenceDigest();
    expect(augment(f, untrained)).toContain('The soil is dry.');
  });
});

/** Give a fixture a template path, so it has a kind to copy. */
function makeStuffAtPathOf(f: GrowFixture): GrowFixture {
  stampTemplatePathForTest(f, '/test/thing/plant/grain');
  return f;
}
