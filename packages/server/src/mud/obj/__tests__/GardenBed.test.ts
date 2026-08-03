/**
 * GardenBed / CultivableMixin — the pot generalized to N > 1
 * (Hinkley Hills Wave 3).
 *
 * The claim under test is that **a pot is a bed with one slot**: the same
 * mixin, the same soil read, the same slot vocabulary, differing only in
 * an authored `capacity`. So the interesting assertions are the ones about
 * what changes when N grows — shared soil making density a trade-off — and
 * the ones about what does NOT change at N = 1.
 *
 * Phase 1's whole `Plant.test.ts` passing untouched is the other half of
 * that proof and lives there; this file covers the bed.
 *
 * Fixtures are hand-built (the `Plant.test.ts` precedent) rather than
 * driven through the seed pipeline.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Plant from '../Plant';
import PlantPot from '../PlantPot';
import GardenBed from '../GardenBed';
import Material from '../../lib/material/Material';
import { Reserve } from '../../lib/reserve';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../lib/husbandry/Cultivable';
import { type GrowthProfileData } from '../../lib/husbandry/Growing';
import { Quantity } from '../../lib/quantity';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { WorldClockApi } from '../../api/worldclock';
import { AmbientLitMixin } from '../../lib/perception/AmbientLit';
import Location from '../../lib/stuff/Location';
import { Idea } from '../../lib/stuff/Idea';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { ContainerMixin } from '../../lib/spatial/Container';
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

class LitRoom extends AmbientLitMixin(Location) {}
/** A Slotted host that is NOT cultivable — the negative case for fitsSlot. */
class Rack extends SlottedMixin(ContainerMixin(Idea)) {}

const DAY = 86_400;
const BASE = 20_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

let matSeq = 0;
function tissue(): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`bed-tissue-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, `/obj/material/_test/bed-tissue-${matSeq}`) as unknown as Material;
}

/** A thirsty, root-hungry profile — the peace lily's shape. */
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

let plantSeq = 0;
function makePlant(short = 'a peace lily'): Plant {
  plantSeq += 1;
  return makeStuffAtPath(() => {
    const p = new Plant();
    p.setShortDescription(short);
    p.setLongDescription('Broad dark leaves fan out of the soil.');
    p.setMaterial(tissue());
    p.setMass(Quantity.of(0.5, 'kg'));
    p.setLastAmbientK(295);
    p.setLifecycleState('alive');
    p.setProfile(lilyProfile());
    p.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(1, 'L'),
        Quantity.of(1, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    return p;
  }, `/obj/plant/_bedtest-${plantSeq}`);
}

let bedSeq = 0;
/**
 * A bed holding `soil` litres of earth with room for `slots` plants, and a
 * water reserve of `water` litres (default 4). Soil volume and water
 * capacity are independent axes — the first is the ROOT ceiling, the
 * second is the drought clock — so tests that mean to starve a plant of
 * water must shrink the second, not the first.
 */
function makeBed(soil: number, slots: number, water = 4): GardenBed {
  bedSeq += 1;
  return makeStuffAtPath(() => {
    const bed = new GardenBed();
    bed.setShortDescription('a raised garden bed');
    bed.setMass(Quantity.of(340, 'kg'));
    bed.interiorBulk = true;
    bed.setInteriorCapacity(Quantity.of(soil, 'L'));
    bed.setInteriorAmount(Quantity.of(soil, 'L'));
    bed.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: slots },
    ]);
    // Phase 2: the ground holds the water AND the nutrient.
    bed.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(water, 'L'),
        Quantity.of(water, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    bed.setReserve(
      new Reserve(
        SOIL_NITROGEN_RESERVE_KEY,
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'cultivation',
        'spent',
      ),
    );
    return bed;
  }, `/obj/bed/_test-${bedSeq}`);
}

let potSeq = 0;
function makePot(soil: number): PlantPot {
  potSeq += 1;
  return makeStuffAtPath(() => {
    const p = new PlantPot();
    p.setShortDescription('a clay pot');
    p.setMass(Quantity.of(1.2, 'kg'));
    p.interiorBulk = true;
    p.setInteriorCapacity(Quantity.of(soil, 'L'));
    p.setInteriorAmount(Quantity.of(soil, 'L'));
    p.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 1 },
    ]);
    // A pot holds water but authors NO nitrogen — which is exactly why a
    // houseplant is never nutrient-limited.
    p.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(1, 'L'),
        Quantity.of(1, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    return p;
  }, `/obj/pot/_bedtest-${potSeq}`);
}

/**
 * Force a growth stage. `growthStage` is a public field on GrowingMixin,
 * and phase 1's suite reaches maturity by ~50 watering cycles — far too
 * slow for a five-plant density fixture, and the growth CURVE is not what
 * these tests are about. Writing the field is the deliberate seam.
 */
function forceStage(plant: Plant, stage: string): void {
  (plant as unknown as { growthStage: string }).growthStage = stage;
}

/** Seat a plant the way the verbs do: contents AND slot. */
function seat(plant: Plant, ground: GardenBed | PlantPot): void {
  ContainmentApi.move(plant, ground);
  ground.occupy(plant, PLANT_SLOT);
}

describe('a bed is a pot with a bigger N', () => {
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
  // byTemplatePath index and every reconcile silently no-ops thereafter.
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('both a pot and a bed are Cultivable; a plain plant is not', () => {
    expect(MixinApi.isCultivable(makePot(1))).toBe(true);
    expect(MixinApi.isCultivable(makeBed(12, 4))).toBe(true);
    expect(MixinApi.isCultivable(makePlant())).toBe(false);
  });

  it('reports its capacity from the authored slot, not a new field', () => {
    expect(makePot(1).plantSlotCount()).toBe(1);
    expect(makeBed(12, 4).plantSlotCount()).toBe(4);
  });

  it('⭐ at N = 1 root room is exactly the whole soil volume', () => {
    // The reduction that proves the generalization is inert. A pot's
    // plant must see precisely what phase 1 gave it.
    const clay = makePot(3);
    const p = makePlant();
    seat(p, clay);
    expect(clay.occupiedSlotCount()).toBe(1);
    expect(clay.rootRoomPerPlant()).toBe(3);
  });

  it('an EMPTY bed answers its full volume rather than dividing by zero', () => {
    const bed = makeBed(12, 4);
    expect(bed.occupiedSlotCount()).toBe(0);
    expect(bed.rootRoomPerPlant()).toBe(12);
  });

  it('⭐ shared soil: each occupant gets soil ÷ occupied', () => {
    const bed = makeBed(12, 4);
    const a = makePlant('the first lily');
    seat(a, bed);
    expect(bed.rootRoomPerPlant()).toBe(12);

    seat(makePlant('the second lily'), bed);
    expect(bed.rootRoomPerPlant()).toBe(6);

    seat(makePlant('the third lily'), bed);
    seat(makePlant('the fourth lily'), bed);
    expect(bed.occupiedSlotCount()).toBe(4);
    expect(bed.rootRoomPerPlant()).toBe(3);
  });

  it('⭐ density is a trade-off: the same plant root-limits crowded, not alone', () => {
    // Identical soil per bed, identical species, identical light. The ONLY
    // difference is how many plants share it — and that is enough to make
    // one of them root-limited. This is the new behaviour the shared-soil
    // division buys, through the UNCHANGED satRoot curve.
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);

    // IDENTICAL beds — same soil, same capacity, same room, same species.
    const roomy = makeBed(6, 4);
    const crowded = makeBed(6, 4);
    ContainmentApi.move(roomy, room);
    ContainmentApi.move(crowded, room);

    const alone = makePlant('the lone lily');
    seat(alone, roomy);

    const crammed = makePlant('the crowded lily');
    seat(crammed, crowded);
    for (let i = 0; i < 3; i++) seat(makePlant(`filler ${i}`), crowded);

    // A mature lily demands 3.0 L of root room. Alone in 6 L it has
    // double what it needs; sharing that same 6 L four ways it has half.
    for (const p of [alone, crammed]) forceStage(p, 'mature');
    expect(roomy.rootRoomPerPlant()).toBe(6);
    expect(crowded.rootRoomPerPlant()).toBe(1.5);

    // Water both to full so WATER cannot be the limiting factor, then
    // read. The only difference between them is how many share the soil.
    setNow(DAY);
    alone.waterPlant(1);
    crammed.waterPlant(1);
    alone.getVigor();
    crammed.getVigor();

    expect(alone.getLimitingFactor()).not.toBe('root');
    expect(crammed.getLimitingFactor()).toBe('root');
  });

  it('removing a plant gives the survivors more room on the next read', () => {
    const bed = makeBed(12, 4);
    const a = makePlant('a');
    const b = makePlant('b');
    seat(a, bed);
    seat(b, bed);
    expect(bed.rootRoomPerPlant()).toBe(6);

    bed.vacate(PLANT_SLOT, b);
    expect(bed.occupiedSlotCount()).toBe(1);
    expect(bed.rootRoomPerPlant()).toBe(12);
  });

  it('getPlants lists every occupant; getPlant answers the first', () => {
    const bed = makeBed(12, 4);
    expect(bed.getPlant()).toBeNull();
    expect(bed.getPlants()).toHaveLength(0);

    const a = makePlant('a');
    const b = makePlant('b');
    seat(a, bed);
    seat(b, bed);

    expect(bed.getPlants()).toHaveLength(2);
    // getPlant must not throw on a multi-occupant slot (getOccupant does).
    expect(bed.getPlant()).not.toBeNull();
  });

  it('⭐ a plant lives in the bed CONTENTS and its SLOT, index-aligned', () => {
    // The -1 trap: the Slotted capture slice names occupants by index into
    // the container slice, so a slotted-but-not-contained plant is dropped
    // on restore. Assert both memberships directly.
    const bed = makeBed(12, 4);
    const a = makePlant('a');
    const b = makePlant('b');
    seat(a, bed);
    seat(b, bed);

    const contents: unknown[] = [...bed.getContents()];
    for (const plant of bed.getPlants()) {
      expect(contents).toContain(plant);
      expect(contents.indexOf(plant)).toBeGreaterThanOrEqual(0);
    }
  });

  it('reports free capacity, and stops at full', () => {
    const bed = makeBed(12, 2);
    expect(bed.hasFreePlantSlot()).toBe(true);
    seat(makePlant('a'), bed);
    expect(bed.hasFreePlantSlot()).toBe(true);
    seat(makePlant('b'), bed);
    expect(bed.hasFreePlantSlot()).toBe(false);
  });

  it('soil reads through the bulk interior, so pouring raises it', () => {
    const bed = makeBed(0, 4);
    expect(bed.hasSoil()).toBe(false);
    expect(bed.getSoilVolume()).toBe(0);

    bed.setInteriorCapacity(Quantity.of(12, 'L'));
    bed.setInteriorAmount(Quantity.of(8, 'L'));
    expect(bed.hasSoil()).toBe(true);
    expect(bed.getSoilVolume()).toBe(8);
  });
});

describe('fitsSlot measures the room a plant WOULD get', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('⭐ refuses a mature plant entry to a bed already sharing its soil', () => {
    // 12 L across 3 sitting plants leaves a fourth arrival 3 L — exactly a
    // mature plant's demand, so it fits. Fill one more place and the same
    // arrival is refused. The check is PROSPECTIVE: a non-prospective
    // divisor would wave the arrival in and only bind it afterwards.
    const roomy = makeBed(12, 5);
    for (let i = 0; i < 3; i++) seat(makePlant(`sitting ${i}`), roomy);
    const arrival = makePlant('the arrival');
    forceStage(arrival, 'mature');
    expect(roomy.rootRoomPerPlant(1)).toBe(3);
    expect(arrival.fitsSlot(roomy, PLANT_SLOT)).toBe(true);

    seat(makePlant('one more'), roomy);
    expect(roomy.rootRoomPerPlant(1)).toBe(2.4);
    expect(arrival.fitsSlot(roomy, PLANT_SLOT)).toBe(false);
  });

  it('still refuses a mature plant a thimble — the phase-1 rule, unchanged', () => {
    const thimble = makePot(0.5);
    const grown = makePlant();
    forceStage(grown, 'mature');
    expect(grown.fitsSlot(thimble, PLANT_SLOT)).toBe(false);
  });

  it('⭐ still PERMITS re-seating a plant already in the contents (restore)', () => {
    // The sizing rule is a PLACEMENT policy. Refusing a re-seat would make
    // a root-bound plant unrestorable, and root-bound is a designed state.
    const bed = makeBed(1, 4);
    const grown = makePlant();
    forceStage(grown, 'mature');
    ContainmentApi.move(grown, bed); // in contents, not yet slotted
    expect(grown.fitsSlot(bed, PLANT_SLOT)).toBe(true);
  });

  it('refuses a Slotted host that is not cultivable ground', () => {
    // A plant does not go in a coat rack. The check is the mixin, not a
    // concrete class — which is exactly what let the bed join without
    // touching `fitsSlot`.
    const rack = makeStuffAtPath(() => {
      const r = new Rack();
      r.setStaticSlots([
        { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 1 },
      ]);
      return r;
    }, `/obj/_test/rack-${bedSeq + 900}`);

    expect(MixinApi.isCultivable(rack)).toBe(false);
    expect(makePlant().fitsSlot(rack, PLANT_SLOT)).toBe(false);
    // …and the slot chokepoint honours the refusal.
    expect(rack.canOccupy(makePlant(), PLANT_SLOT)).toBe(false);
  });
});

describe('the land draw — what makes production scarce', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('⭐ the draw rides the BED, so a parcel total is countable', () => {
    // Land's job is to make production scarce, and the number that does
    // it is authored on the productive object — expressive (compose beds
    // of any size) and honest (backed by things a player can walk up to
    // and count), where a cell count is neither.
    const beds = [makeBed(12, 4), makeBed(12, 4), makeBed(6, 2)];
    for (const b of beds) b.setLandRequirementM2(8);

    const draw = beds.reduce((n, b) => n + b.getLandRequirementM2(), 0);
    expect(draw).toBe(24);
  });

  it('⭐ only PRODUCTIVE things draw — a pot is furniture', () => {
    // The distinction was never spatial. Paths, farmhouses, barns and
    // decoration are free; so is a houseplant, which is why 0 is the
    // default rather than something a pot has to opt out of.
    expect(makePot(3).getLandRequirementM2()).toBe(0);
    expect(makeBed(12, 4).getLandRequirementM2()).toBe(0); // until authored
  });

  it('refuses a negative requirement rather than crediting land', () => {
    const bed = makeBed(12, 4);
    bed.setLandRequirementM2(-50);
    expect(bed.getLandRequirementM2()).toBe(0);
  });

  it('⭐ over-draw carries NO penalty — crowding is the limiting factor', () => {
    // A hard cap is dishonest (real land does not refuse) and a soft cap
    // is worse (an administered multiplier pretending to be physics). So
    // nothing here reads the draw and reduces a yield: two beds far past
    // any sane parcel behave exactly as two beds.
    const a = makeBed(12, 4);
    const b = makeBed(12, 4);
    a.setLandRequirementM2(100_000);
    b.setLandRequirementM2(100_000);
    seat(makePlant('a'), a);
    seat(makePlant('b'), b);

    // Same soil each, same root room each — the draw is inert to growth.
    expect(a.rootRoomPerPlant()).toBe(b.rootRoomPerPlant());
    expect(a.rootRoomPerPlant()).toBe(12);
  });
});

describe('a bed cannot be carried — by mass, not by class', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('⭐ a bed IS Containable — it has to be, to stand in a yard', () => {
    // The land-use gate has no placement to gate if a bed cannot be
    // placed, and containment is how a thing is in a room.
    const bed = makeBed(12, 4);
    expect(MixinApi.isContainable(bed)).toBe(true);

    const yard = makeStuff(() => new LitRoom());
    ContainmentApi.move(bed, yard);
    expect(yard.getContents()).toContain(bed);
  });

  it('⭐ immovability is its MASS, which no class flag encodes', () => {
    // A bed outweighs a pot by ~280×, which is what GetController's
    // encumbrance ceiling reads. There is deliberately no `portable`
    // field to assert instead — that is the point.
    const bed = makeBed(12, 4);
    const pot = makePot(3);
    expect(bed.getMass().rawValue()).toBeGreaterThan(300);
    expect(pot.getMass().rawValue()).toBeLessThan(5);
    // Well past any character's strain ceiling (≈ their own body mass).
    expect(bed.getMass().rawValue()).toBeGreaterThan(200);
  });
});

describe('soil state — water lives in the ground now', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  /** A lit room holding `ground`, with both clocks started at t = 0. */
  function place(ground: GardenBed | PlantPot): LitRoom {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);
    ContainmentApi.move(ground, room);
    return room;
  }

  it('a plant reads its moisture from the GROUND, not from itself', () => {
    const bed = makeBed(12, 4);
    place(bed);
    const p = makePlant();
    seat(p, bed);

    expect(p.getSoilMoisture()).toBeCloseTo(1, 5);
    // Drain the bed directly; the plant sees it, having no reserve of
    // its own to fall back on.
    bed.drawNutrient(0); // no-op, keeps the shape honest
    setNow(20 * DAY);
    const after = p.getSoilMoisture();
    expect(after).toBeLessThan(1);
    expect(bed.soilMoistureFraction()).toBeCloseTo(after, 5);
  });

  it('⭐ an UNROOTED plant has no water at all — literally, not by gloss', () => {
    // husbandry.md always said "nothing can hold moisture for it"; since
    // the water moved to the ground that is the mechanism rather than a
    // description, because there is no private reserve left to drain.
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);
    const loose = makePlant();
    ContainmentApi.move(loose, room);

    expect(loose.getBed()).toBeNull();
    expect(loose.getSoilMoisture()).toBe(0);

    setNow(10 * DAY);
    loose.getVigor(); // must not crash
    expect(loose.getLimitingFactor()).toBe('water');
  });

  it('⭐ water competition is emergent: four plants dry a bed faster than one', () => {
    // Same bed, same soil, same species — only the head count differs.
    // Nothing new was written to make this true: the bed drains by the
    // SUMMED demand of whoever is standing in it.
    const lonely = makeBed(12, 4);
    const crowded = makeBed(12, 4);
    place(lonely);
    place(crowded);

    seat(makePlant(), lonely);
    for (let i = 0; i < 4; i++) seat(makePlant(`crowd ${i}`), crowded);

    setNow(10 * DAY);
    const lonelyLeft = lonely.soilMoistureFraction()!;
    const crowdedLeft = crowded.soilMoistureFraction()!;

    expect(crowdedLeft).toBeLessThan(lonelyLeft);
    // …and all four read the same drier soil — they share it.
    for (const plant of crowded.getPlants()) {
      expect((plant as unknown as { getSoilMoisture(): number })
        .getSoilMoisture()).toBeCloseTo(crowdedLeft, 5);
    }
  });

  it('⭐ NO read-order artifact: A-then-B equals B-then-A', () => {
    // The fairness bug this shape exists to avoid. Had each plant debited
    // the bed as it was read, whoever was looked at first would drink
    // first once the bed ran low.
    function runDryWindow(readFirst: 'a' | 'b'): [number, number] {
      // Meagre WATER (0.5 L) but ample earth, so the only thing the two
      // plants can compete over is the reserve — which is the point.
      const bed = makeBed(12, 4, 0.5);
      place(bed);
      const a = makePlant('a');
      const b = makePlant('b');
      seat(a, bed);
      seat(b, bed);
      setNow(40 * DAY);
      const first = readFirst === 'a' ? a : b;
      const second = readFirst === 'a' ? b : a;
      first.getVigor();
      second.getVigor();
      return readFirst === 'a'
        ? [a.getVigor(), b.getVigor()]
        : [b.getVigor(), a.getVigor()];
    }

    setNow(0);
    const [aFirstA, aFirstB] = runDryWindow('a');
    setNow(0);
    const [bFirstB, bFirstA] = runDryWindow('b');

    // Same window, same pair, opposite read order → same world.
    expect(aFirstA).toBeCloseTo(bFirstA, 10);
    expect(aFirstB).toBeCloseTo(bFirstB, 10);
    // …and the two plants in one bed fared identically as each other.
    expect(aFirstA).toBeCloseTo(aFirstB, 10);
  });

  it('⭐ the bed reconcile does NOT recurse through its occupants', () => {
    // The bed sums occupant demand; each occupant reads the bed's
    // moisture. Demand is read through waterDemandPerGameDay(), which is
    // pure — reading getSoilMoisture() there would re-enter.
    const bed = makeBed(12, 4);
    place(bed);
    const p = makePlant();
    seat(p, bed);
    setNow(15 * DAY);

    expect(() => bed.reconcileSoil()).not.toThrow();
    expect(() => p.getVigor()).not.toThrow();
    // The demand read really is pure: calling it does not move the clock
    // stamp or the reserve.
    const before = bed.soilMoistureFraction();
    const stamp = bed.soilClockStamp;
    expect(p.waterDemandPerGameDay()).toBeGreaterThan(0);
    expect(bed.soilClockStamp).toBe(stamp);
    expect(bed.soilMoistureFraction()).toBe(before);
  });

  it('watering a PLANT credits the ground; watering a full bed spends nothing', () => {
    const bed = makeBed(12, 4);
    place(bed);
    const p = makePlant();
    seat(p, bed);

    // Full at the start — no headroom, so nothing is absorbed.
    expect(p.waterPlant(1)).toBe(0);

    setNow(20 * DAY);
    p.getVigor(); // drain the window
    const drained = bed.soilMoistureFraction()!;
    expect(drained).toBeLessThan(1);
    const absorbed = p.waterPlant(1);
    expect(absorbed).toBeGreaterThan(0);
    // The litre went into the GROUND, not into the plant.
    expect(bed.soilMoistureFraction()!).toBeGreaterThan(drained);
  });
});

describe('nutrient — the fourth limiting factor', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('⭐ a POT is unchanged — it authors no nitrogen, so it never limits', () => {
    // The reduction that keeps phase 1 honest: the fourth factor exists
    // and a houseplant cannot see it.
    const clay = makePot(3);
    expect(clay.nutrientFraction()).toBeNull();

    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);
    ContainmentApi.move(clay, room);
    const p = makePlant();
    seat(p, clay);
    setNow(5 * DAY);
    p.getVigor();
    expect(p.getLimitingFactor()).not.toBe('nutrient');
  });

  it('a depleted bed limits growth and NAMES nutrient', () => {
    const bed = makeBed(12, 4);
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);
    ContainmentApi.move(bed, room);
    const p = makePlant();
    seat(p, bed);

    // Strip the soil bare.
    expect(bed.drawNutrient(100)).toBe(100);
    expect(bed.nutrientFraction()).toBe(0);

    setNow(2 * DAY);
    p.waterPlant(1); // water is NOT the constraint
    p.getVigor();
    expect(p.getLimitingFactor()).toBe('nutrient');
  });

  it('feeding clears it, and credits only the headroom', () => {
    const bed = makeBed(12, 4);
    bed.drawNutrient(100);
    expect(bed.nutrientFraction()).toBe(0);

    expect(bed.feedSoil(40)).toBe(40);
    expect(bed.nutrientFraction()).toBeCloseTo(0.4, 5);

    // Overfeeding takes only what fits and says so.
    expect(bed.feedSoil(1000)).toBe(60);
    expect(bed.nutrientFraction()).toBe(1);
    expect(bed.feedSoil(10)).toBe(0);
  });

  it('drawNutrient takes only what is there', () => {
    const bed = makeBed(12, 4);
    bed.drawNutrient(90);
    expect(bed.drawNutrient(50)).toBe(10);
    expect(bed.nutrientFraction()).toBe(0);
  });
});

describe('_worstLimiting — the quality substrate', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('starts at 1 on an untouched plant', () => {
    expect(makePlant().getWorstLimiting()).toBe(1);
  });

  it('⭐ is MONOTONE: a plant nursed back keeps its worst reading', () => {
    // This is what makes farming reward your worst moment rather than
    // your average, and it cannot be recovered afterwards from the
    // smoothed vigor — a rescued plant looks fine and must still grade
    // badly.
    // Plenty of ROOT room (12 L of earth) so nothing but WATER can be the
    // constraint, and a small reserve so the drought bites quickly.
    const bed = makeBed(12, 4, 0.5);
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(300);
    ContainmentApi.move(bed, room);
    const p = makePlant();
    seat(p, bed);

    // A long drought — nobody waters it for two months, and the bed's
    // reserve covers about a week.
    setNow(60 * DAY);
    const vigorAtBottom = p.getVigor();
    const worstAfterDrought = p.getWorstLimiting();
    expect(worstAfterDrought).toBeLessThan(0.9);
    expect(bed.soilMoistureFraction()).toBe(0); // it really did run dry

    // Nurse it back: keep it watered for a long, kind stretch.
    for (let d = 62; d <= 160; d += 2) {
      setNow(d * DAY);
      p.waterPlant(1);
    }

    // The plant RECOVERS — by vigor it now looks well kept…
    const vigorAfterCare = p.getVigor();
    expect(vigorAfterCare).toBeGreaterThan(vigorAtBottom);
    expect(p.getConditionBand()).not.toBe('failing');

    // …and the scar STAYS. This is the whole point: the worst moment is
    // not recoverable from the smoothed vigor after the fact, which is
    // why harvest quality reads this field and not that one.
    expect(p.getWorstLimiting()).toBeLessThanOrEqual(worstAfterDrought);
    expect(p.getWorstLimiting()).toBeLessThan(vigorAfterCare);
  });
});
