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
import { PLANT_SLOT } from '../../lib/husbandry/Cultivable';
import {
  MOISTURE_RESERVE_KEY,
  type GrowthProfileData,
} from '../../lib/husbandry/Growing';
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
  }, `/lib/material/_test/bed-tissue-${matSeq}`) as unknown as Material;
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
        MOISTURE_RESERVE_KEY,
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
/** A bed holding `soil` litres with room for `slots` plants. */
function makeBed(soil: number, slots: number): GardenBed {
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
