/**
 * Plant / PlantPot / Seed — the object model (husbandry Wave 3).
 *
 * A pot is a `Slotted` fixture with one plant slot and a soil volume; the
 * plant is its `Slottable` occupant and its own persistence host. The
 * farming slate's boutique density is *"a garden bed is a `Slotted`
 * fixture with N slots; each plant is a `Slottable`"* — a pot is that at
 * N = 1, so phase 2's bed is this code with a bigger N.
 *
 * These tests build the objects by hand (the Campfire precedent) rather
 * than through the seed pipeline; the shipped templates' own numbers are
 * exercised by the Duncan Hall integration test.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Plant from '../Plant';
import PlantPot, { PLANT_SLOT } from '../PlantPot';
import Seed from '../Seed';
import Material from '../../lib/material/Material';
import { Reserve } from '../../lib/reserve';
import { type GrowthProfileData } from '../../lib/husbandry/Growing';
import { SOIL_MOISTURE_RESERVE_KEY } from '../../lib/husbandry/Cultivable';
import { Quantity } from '../../lib/quantity';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { WorldClockApi } from '../../api/worldclock';
import { AmbientLitMixin } from '../../lib/perception/AmbientLit';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import Location from '../../lib/stuff/Location';
import { Idea } from '../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../lib/perception/modalities/__tests__/test-helpers';
import '../WorldClockRegistry';

/** A lit room. */
class LitRoom extends AmbientLitMixin(Location) {}
/** A closable box — the in-dorm dark lever. */
class Box extends SealableMixin(ContainerMixin(ContainableMixin(Idea))) {}

const DAY = 86_400; // game-seconds per game-day
const BASE = 10_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

let matSeq = 0;
function tissue(): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`plant-tissue-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, `/obj/material/_test/tissue-${matSeq}`) as unknown as Material;
}

/** The shipped peace lily's profile — thirsty, light-hungry, big roots. */
function lilyProfile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.35,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0.08,
    luxHappyAt: 25,
    luxDarkAt: 3,
    rootDemand: { seedling: 0.15, young: 1.2, established: 2.0, mature: 3.0 },
    daysToStage: { young: 30, established: 90, mature: 168 },
  };
}

/** The shipped snake plant's — drought- AND low-light-tolerant. */
function snakeProfile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.15,
    moistureWiltAt: 0.02,
    litresPerGameDay: 0.03,
    luxHappyAt: 8,
    luxDarkAt: 0.5,
    rootDemand: { seedling: 0.1, young: 0.5, established: 1.2, mature: 2.0 },
    daysToStage: { young: 45, established: 130, mature: 240 },
  };
}

let plantSeq = 0;
function makePlant(
  profile: GrowthProfileData,
  opts: { short?: string; seedPath?: string } = {},
): Plant {
  plantSeq += 1;
  const path = `/obj/plant/_test-${plantSeq}`;
  return makeStuffAtPath(() => {
    const p = new Plant();
    p.setShortDescription(opts.short ?? 'a peace lily');
    p.setLongDescription('Broad dark leaves fan out of the soil.');
    p.setMaterial(tissue());
    p.setMass(Quantity.of(0.5, 'kg'));
    p.setLastAmbientK(295);
    p.setLifecycleState('alive');
    p.setProfile(profile);
    if (opts.seedPath) p.setSeedTemplatePath(opts.seedPath);
    return p;
  }, path);
}

let potSeq = 0;
/** A pot with `soil` litres already in it. */
function makePot(soil: number, capacity = soil): PlantPot {
  potSeq += 1;
  return makeStuffAtPath(() => {
    const pot = new PlantPot();
    pot.setShortDescription('a clay pot');
    pot.interiorBulk = true;
    pot.setInteriorCapacity(Quantity.of(capacity, 'L'));
    pot.setInteriorAmount(Quantity.of(soil, 'L'));
    pot.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 1 },
    ]);
    // Phase 2: the WATER lives in the ground, not the plant. A pot is a
    // bed with one slot, so it holds the moisture reserve its occupant
    // drinks from. Full at the start, as the plant's own reserve was.
    pot.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(1, 'L'),
        Quantity.of(1, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    return pot;
  }, `/obj/pot/_test-${potSeq}`);
}

/**
 * Put `plant` in `pot` the way the verbs do: into its CONTENTS **and**
 * its slot. Both are load-bearing — the Slotted capture slice names its
 * occupants by index into the container slice, so a slotted-but-not-
 * contained plant resolves to -1 and is silently dropped on restore.
 */
function pot(plant: Plant, target: PlantPot): void {
  ContainmentApi.move(plant, target);
  target.occupy(plant, PLANT_SLOT);
}

describe('Plant — the growing object', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  // NO StuffApi.clearAll() — it wipes the WorldClockRegistry from the
  // byTemplatePath index, so `growthNowSeconds()` reads null forever after
  // and every reconcile silently no-ops (the Caster / Respiration
  // precedent). Fixtures are path-unique per test instead.
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('reads its species, stage and band on look', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(30);
    const p = makePlant(lilyProfile());
    const clay = makePot(0.5);
    ContainmentApi.move(clay, room);
    pot(p, clay);

    expect(p.getGrowthStage()).toBe('seedling');
    expect(p.getConditionBand()).toBe('healthy');
    expect(MixinApi.isGrowing(p)).toBe(true);
    expect(MixinApi.isOrganism(p)).toBe(true);
    expect(p.isAlive()).toBe(true);

    const augmented = (
      p as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters.reduce(
      (text, aug) => aug(text, p, p),
      'Broad dark leaves.',
    );
    // `look` has to carry all three: species (the short description), size
    // stage, and condition band — the stage is only observable here.
    expect(augmented).toContain('It is still a seedling.');
    expect(augmented).toContain('It looks healthy.');
    expect(augmented).not.toMatch(/\d\.\d/); // prose, never a number
  });

  it('⭐ the two species diverge under identical treatment', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(6); // dim: stresses the lily, suits the snake plant
    const lily = makePlant(lilyProfile(), { short: 'a peace lily' });
    const snake = makePlant(snakeProfile(), { short: 'a snake plant' });
    const potA = makePot(3);
    const potB = makePot(3);
    ContainmentApi.move(potA, room);
    ContainmentApi.move(potB, room);
    pot(lily, potA);
    pot(snake, potB);
    lily.getVigor();
    snake.getVigor();

    // The same LIGHT level: one is limited by it, the other is not.
    expect(lily.getLimitingFactor()).toBe('light');
    expect(snake.getLimitingFactor()).toBeNull();

    // The same WATERING GAP: it kills the lily and the snake plant shrugs.
    setNow(12 * 360 * DAY);
    expect(lily.getConditionBand()).toBe('dead');
    expect(snake.isAlive()).toBe(true);
  });

  it('good care advances all four stages and latches flowering at mature', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const p = makePlant(lilyProfile());
    const big = makePot(3);
    ContainmentApi.move(big, room);
    pot(p, big);

    // Water every few game-days so water never limits.
    for (let d = 4; d <= 200; d += 4) {
      setNow(d * DAY);
      p.waterPlant(1);
    }
    expect(p.getGrowthStage()).toBe('mature');
    expect(p.isFlowering()).toBe(true);
  });

  it('flowering sets exactly one seed, into the POT (a plant is no container)', async () => {
    // The seed is minted through the gated clone path; stub it to a fresh
    // Seed (there are no Template rows in a unit test).
    let minted = 0;
    const cloneSpy = vi
      .spyOn(StuffApi, 'clone')
      .mockImplementation((async (path: string) => {
        minted += 1;
        return makeStuffAtPath(() => {
          const s = new Seed();
          s.setShortDescription('a peace lily seed');
          s.setGrowsIntoPath('/obj/plant/_seedtest');
          return s;
        }, `${path}#${minted}`);
      }) as unknown as typeof StuffApi.clone);

    try {
      const room = makeStuff(() => new LitRoom());
      room.setAmbientFlux(40);
      const p = makePlant(lilyProfile(), { seedPath: '/obj/seed/_test' });
      const big = makePot(3);
      ContainmentApi.move(big, room);
      pot(p, big);

      for (let d = 4; d <= 200; d += 4) {
        setNow(d * DAY);
        p.waterPlant(1);
      }
      expect(p.isFlowering()).toBe(true);
      await new Promise((r) => setTimeout(r, 0)); // the seed clone is async

      // The seed lands in the POT's contents — a plant is not a container.
      const seeds = big.getContents().filter((c) => c instanceof Seed);
      expect(seeds).toHaveLength(1);
      expect(p.getSeedTemplatePath()).toBe('/obj/seed/_test');

      // Further reads inside the SAME flowering episode set no second seed.
      setNow(260 * DAY);
      p.waterPlant(1);
      await new Promise((r) => setTimeout(r, 0));
      expect(big.getContents().filter((c) => c instanceof Seed)).toHaveLength(
        1,
      );
    } finally {
      cloneSpy.mockRestore();
    }
  });

  it('⭐ root-bound: names root, stalls, holds a band, and repotting resumes it', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const p = makePlant(lilyProfile());
    const small = makePot(0.5); // < the `young` demand of 1.2
    ContainmentApi.move(small, room);
    pot(p, small);

    for (let d = 4; d <= 400; d += 4) {
      setNow(d * DAY);
      p.waterPlant(1);
    }
    // Stalls at `young` — the stage whose demand the pot cannot carry.
    expect(p.getGrowthStage()).toBe('young');
    expect(p.getLimitingFactor()).toBe('root');
    // …and does NOT die, across a long span: the floored curve holds it.
    expect(p.getConditionBand()).toBe('stressed');
    expect(p.isAlive()).toBe(true);

    const cause = (
      p as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!('Leaves.', p, p);
    expect(cause).toContain('It has outgrown its pot.');

    // Repot into a big one: maturation resumes.
    const big = makePot(3);
    ContainmentApi.move(big, room);
    small.vacate(PLANT_SLOT, p);
    pot(p, big);
    for (let d = 404; d <= 700; d += 4) {
      setNow(d * DAY);
      p.waterPlant(1);
    }
    expect(p.getLimitingFactor()).toBeNull();
    expect(p.getGrowthStage()).toBe('mature');
  });

  it('fitsSlot refuses a mature plant a small pot and accepts a large one', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const p = makePlant(lilyProfile());
    const big = makePot(3);
    ContainmentApi.move(big, room);
    pot(p, big);
    for (let d = 4; d <= 200; d += 4) {
      setNow(d * DAY);
      p.waterPlant(1);
    }
    expect(p.getGrowthStage()).toBe('mature');

    const thimble = makePot(0.5);
    const another = makePot(3);
    expect(p.fitsSlot(thimble, PLANT_SLOT)).toBe(false);
    expect(p.fitsSlot(another, PLANT_SLOT)).toBe(true);
    // …and the slot chokepoint honours it.
    expect(thimble.canOccupy(p, PLANT_SLOT)).toBe(false);
    expect(another.canOccupy(p, PLANT_SLOT)).toBe(true);
  });

  it('a plant with no pot at all declines without crashing', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const p = makePlant(lilyProfile());
    ContainmentApi.move(p, room);
    expect(p.getVigor()).toBeGreaterThan(0);
    setNow(60 * DAY);
    // Unpotted is not a ROOT constraint (that would double-punish); it is
    // a water one, because nothing holds moisture for it.
    expect(p.getLimitingFactor()).toBe('water');
    expect(() => p.getConditionBand()).not.toThrow();
  });

  it('onMoved closes the light window — dark hours are not credited as lit', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const dark = makeStuff(() => new LitRoom()); // no ambient → pitch black
    const staying = makePlant(lilyProfile());
    const moving = makePlant(lilyProfile());
    const potA = makePot(3);
    const potB = makePot(3);
    ContainmentApi.move(potA, room);
    ContainmentApi.move(potB, room);
    pot(staying, potA);
    pot(moving, potB);
    staying.getVigor();
    moving.getVigor();

    // Water both often enough that WATER never limits — the only difference
    // between them must be the light.
    for (let d = 4; d <= 20; d += 4) {
      setNow(d * DAY);
      staying.waterPlant(1);
      moving.waterPlant(1);
    }
    // Move the moving one's pot into the dark, mid-window.
    ContainmentApi.move(potB, dark);
    for (let d = 24; d <= 60; d += 4) {
      setNow(d * DAY);
      staying.waterPlant(1);
      moving.waterPlant(1);
    }

    expect(moving.getVigor()).toBeLessThan(staying.getVigor());
    expect(moving.getLimitingFactor()).toBe('light');
    expect(staying.getLimitingFactor()).toBeNull();
  });

  it('a plant inside a closed container reads pitch-black', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const locker = makeStuff(() => new Box());
    ContainmentApi.move(locker, room);
    locker.setOpen(false);

    const p = makePlant(lilyProfile());
    const clay = makePot(3);
    ContainmentApi.move(clay, locker);
    pot(p, clay);
    p.getVigor();

    setNow(40 * DAY);
    p.waterPlant(1);
    // The closed lid is an honest dark: the light axis bites.
    expect(p.getLimitingFactor()).toBe('light');

    // Open it and the same box reads the room's light again.
    locker.setOpen(true);
    setNow(41 * DAY);
    p.waterPlant(1);
    setNow(120 * DAY);
    p.waterPlant(1);
    expect(p.getLimitingFactor()).toBeNull();
  });

  it('two plants cloned from the same template hold independent state', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const a = makeStuffAtPath(() => {
      const p = new Plant();
      p.setMaterial(tissue());
      p.setLastAmbientK(295);
      p.setLifecycleState('alive');
      p.setProfile(lilyProfile());
      return p;
    }, '/obj/plant/shared');
    const b = makeStuffAtPath(() => {
      const p = new Plant();
      p.setMaterial(tissue());
      p.setLastAmbientK(295);
      p.setLifecycleState('alive');
      p.setProfile(lilyProfile());
      return p;
    }, '/obj/plant/shared');
    const potA = makePot(3);
    const potB = makePot(3);
    ContainmentApi.move(potA, room);
    ContainmentApi.move(potB, room);
    pot(a, potA);
    pot(b, potB);

    // Same template path, distinct per-instance record keys.
    expect(a.getTemplatePath()).toBe(b.getTemplatePath());
    expect(a.getPersistenceKey()).not.toBe(b.getPersistenceKey());
    expect(a.getPersistenceKey()).toBeTruthy();

    // Care for one, neglect the other.
    for (let d = 4; d <= 60; d += 4) {
      setNow(d * DAY);
      a.waterPlant(1);
    }
    expect(a.getVigor()).toBeGreaterThan(b.getVigor());
    expect(a.getSoilMoisture()).toBeGreaterThan(b.getSoilMoisture());
  });

  it('⚠ the slotted plant is in the pot contents AND its slot (index alignment)', () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const p = makePlant(lilyProfile());
    const clay = makePot(3);
    ContainmentApi.move(clay, room);
    pot(p, clay);

    // Both relations hold — a slot occupant that is NOT also in contents
    // captures as index -1 and is silently dropped on restore.
    expect(clay.getContents()).toContain(p);
    expect(clay.getOccupant(PLANT_SLOT)).toBe(p);
    expect(p.getOccupiedHost()).toBe(clay);
    expect(p.getBed()).toBe(clay);
    expect(clay.getContents().indexOf(p)).toBeGreaterThanOrEqual(0);
  });
});

describe('PlantPot + Seed — the rest of the assembly', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
  });

  it('a pot reports its soil volume and whether it has any', () => {
    const empty = makePot(0, 0.5);
    const filled = makePot(0.5);
    expect(empty.hasSoil()).toBe(false);
    expect(empty.getSoilVolume()).toBe(0);
    expect(filled.hasSoil()).toBe(true);
    expect(filled.getSoilVolume()).toBeCloseTo(0.5, 6);
  });

  it('a seed names the plant it grows into and is discrete, never a stack', () => {
    const s = makeStuffAtPath(() => {
      const seed = new Seed();
      seed.setShortDescription('a peace lily seed');
      seed.setGrowsIntoPath('/obj/plant/peace-lily');
      return seed;
    }, '/obj/seed/peace-lily');
    expect(s.getGrowsIntoPath()).toBe('/obj/plant/peace-lily');
    expect(MixinApi.isGlobbable(s)).toBe(false);
  });
});
