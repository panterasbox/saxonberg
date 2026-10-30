/**
 * `water` — the tool-afforded watering verb (husbandry Wave 5).
 *
 * The verb is conferred by a watering can **in inventory**, through the
 * closed `TOOL_CAPABILITIES` vocabulary's `watering` row at
 * `placement: 'carried'` — the standing "instruments confer working verbs"
 * rule getting its first non-crafting consumer. A can on the floor confers
 * nothing.
 */

import "../../../../../../test-bootstrap";
import { AdvancementMixin } from '../../../../../lib/advancement/Advancement';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaterController from '../WaterController';
import WateringCan from '../../../../thing/WateringCan';
import Plant from '../../../../thing/Plant';
import PlantPot, { PLANT_SLOT } from '../../../../thing/PlantPot';
import Material from '../../../../../lib/material/Material';
import { Reserve, ReservedMixin } from '../../../../../lib/reserve';
import { SoilMixin } from '../../../../../lib/husbandry/Soil';
import { Mixins } from '../../../../../lib/mixin';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { type GrowthProfileData } from '../../../../../lib/husbandry/Growing';
import { SOIL_MOISTURE_RESERVE_KEY } from '../../../../../lib/husbandry/Cultivable';
import { Quantity } from '../../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../../lib/description/Named';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { AmbientLitMixin } from '../../../../../lib/perception/AmbientLit';
import { Idea } from '../../../../../lib/stuff/Idea';
import Place from '../../../../../lib/stuff/Place';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { ShadowApi } from '../../../../../api/shadow';
import { MixinApi } from '../../../../../api/mixin';
import { ContainmentApi } from '../../../../../api/containment';
import { PersistableApi } from '../../../../../api/persistable';
import { WorldClockApi } from '../../../../../api/worldclock';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../../lib/perception/modalities/__tests__/test-helpers';
import '../../../WorldClockRegistry';

class TestGiver extends AdvancementMixin(
  SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
)
) {
  static _mixinName = 'TestGiver';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}
class TestItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestItem';
}
class LitRoom extends AmbientLitMixin(Place) {}

/** A named part of a divided field — the `Patch` shape, in the kernel. */
class TestPart extends SoilMixin(ReservedMixin(NamedMixin(Idea))) {
  key = '';
  area = 0;
  public override soilPartKey(): string {
    return this.key;
  }
  public override soilCatchmentAreaM2(): number {
    return this.area;
  }
}

/** Soil-bearing ground holding no slot: a field. Parts optional. */
class TestField extends SoilMixin(ReservedMixin(AmbientLitMixin(Place))) {
  parts: TestPart[] = [];
  area = 1000;
  public override soilParts(): readonly TestPart[] {
    return this.parts;
  }
  public override soilCatchmentAreaM2(): number {
    return this.parts.length > 0
      ? this.parts.reduce((n, p) => n + p.area, 0)
      : this.area;
  }
}

const BASE = 10_000_000;
let now = BASE;
let seq = 0;
function freshPath(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

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

function water(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setAppearance('clear water');
    m.setTags(['liquid', 'beverage', 'drinkable']);
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, freshPath('/stuff/idea/material/_test/water')) as unknown as Material;
}

function tissue(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, freshPath('/stuff/idea/material/_test/tissue')) as unknown as Material;
}

function makePlant(): Plant {
  return makeStuffAtPath(() => {
    const p = new Plant();
    p.setShortDescription('a peace lily');
    p.setMaterial(tissue());
    p.setMass(Quantity.of(0.5, 'kg'));
    p.setLastAmbientK(295);
    p.setLifecycleState('alive');
    p.setProfile(lilyProfile());
    return p;
  }, freshPath('/trade/farming/thing/plant/_water'));
}

function makePot(soil = 3): PlantPot {
  return makeStuffAtPath(() => {
    const pot = new PlantPot();
    pot.setShortDescription('a clay pot');
    pot.interiorBulk = true;
    pot.setInteriorCapacity(Quantity.of(soil, 'L'));
    pot.setInteriorAmount(Quantity.of(soil, 'L'));
    pot.setStaticSlots([
      { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 1 },
    ]);
    // Phase 2: the WATER lives in the ground, not the plant.
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
  }, freshPath('/trade/farming/thing/pot/_water'));
}

function makeCan(litres: number, capacity = 2): WateringCan {
  return makeStuffAtPath(() => {
    const can = new WateringCan();
    can.setShortDescription('a tin watering can');
    can.interiorBulk = true;
    can.setInteriorCapacity(Quantity.of(capacity, 'L'));
    if (litres > 0) {
      can.setBulkMaterial('interior', water());
      can.setBulkAmount('interior', Quantity.of(litres, 'L'));
    }
    return can;
  }, freshPath('/stuff/thing/vessel/_can'));
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: TestGiver, location: Place): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'water',
    executionId: 'test',
    commandId: 'test',
    verb: 'water',
    command: stubCommand('water'),
  });
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

type WaterExecModel = Parameters<WaterController['execute']>[0];

/**
 * What the binder binds for `water.yaml`'s `source`: the NAMED vessel
 * when one was named, else every vessel the giver carries (the view's
 * `me:i:[mixin.BulkableMixin]` default). ⚠ A controller test SKIPS the
 * binder, so the carried walk that used to live in the controller is
 * reproduced here, once, as the fixture (`lint:instrument-args`).
 */
function model(
  target: MqlOneResult,
  source?: MqlOneResult,
  holder?: Stuff,
  patch?: MqlOneResult,
): WaterExecModel {
  let bound: MqlManyResult | undefined;
  if (source) {
    bound = {
      stuff: source.stuff ? [source.stuff] : [],
      raw: source.raw,
      prep: source.prep,
    } as unknown as MqlManyResult;
  } else if (holder && MixinApi.isContainer(holder)) {
    bound = {
      stuff: holder.getContents().filter((c) => MixinApi.isBulkable(c)),
      raw: '',
    } as unknown as MqlManyResult;
  }
  return { target, source: bound, patch } as ModelData as unknown as WaterExecModel;
}

function noteReasons(ctx: CommandContext): string[] {
  return ctx.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
}

let captured: Stuff[];
let deeds: Array<{ discipline: string; difficulty: string; outcome: string }>;

describe('the watering capability', () => {
  it('a carried can affords water; the same can on the floor does not', () => {
    // ⭐ Declared once, on the class: `water` is in the ENVIRONMENT
    // bucket only — the can grants OUTWARD to whoever holds it — so a
    // can lying in the room confers nothing on the occupants (which
    // would be `peers`). The whetstone rule, in the bucket vocabulary
    // the statics always had. (It was `placement: carried` on the row's
    // capability entry until verbs became a single class-level record.)
    const c = WateringCan.commandContributions;
    expect(c.environment ?? []).toContain('platform/cmd/bulk/water.yaml');
    expect(c.peers ?? []).not.toContain('platform/cmd/bulk/water.yaml');
  });
});

describe('water <plant>', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    now = BASE;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    captured = [];
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async (s: Stuff) => {
        captured.push(s);
      }) as unknown as typeof PersistableApi.captureHostOf,
    );
    deeds = [];
  });

  // No StuffApi.clearAll() — it wipes the WorldClockRegistry (the Caster
  // precedent) and every growth reconcile would silently no-op.
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function scene(): {
    giver: TestGiver;
    room: LitRoom;
    plant: Plant;
    pot: PlantPot;
  } {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    // Credits land on the giver's own creditDeed since the OO sweep —
    // the instance is the capture seam.
    vi.spyOn(
      giver as unknown as {
        creditDeed(sub: {
          discipline: string;
          difficulty: string;
          outcome: string;
        }): Promise<void>;
      },
      'creditDeed',
    ).mockImplementation(async (subcheck) => {
      deeds.push(subcheck);
    });
    ContainmentApi.move(giver, room);
    const pot = makePot();
    ContainmentApi.move(pot, room);
    const plant = makePlant();
    ContainmentApi.move(plant, pot);
    pot.occupy(plant, PLANT_SLOT);
    return { giver, room, plant, pot };
  }

  /** Let game-time run so the soil is dry enough to take water. */
  function dryOut(plant: Plant, gameDays: number): void {
    plant.getVigor(); // seed the stamp
    now = BASE + gameDays * 86_400;
    plant.getSoilMoisture();
  }

  it('raises soil moisture and debits the can', async () => {
    const { giver, room, plant, pot } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    dryOut(plant, 6); // ~0.48 L transpired

    const before = plant.getSoilMoisture();
    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), makeContext(giver, room));

    expect(plant.getSoilMoisture()).toBeGreaterThan(before);
    expect(plant.getSoilMoisture()).toBeCloseTo(1, 3);
    // The can kept the rest: only the headroom moved.
    expect(can.getBulkAmount('interior').rawValue()).toBeGreaterThan(1.4);
    expect(can.getBulkAmount('interior').rawValue()).toBeLessThan(1.6);
    // ⭐ The act captures the GROUND, not the plant. Since phase 2 the
    // litres land in the pot's moisture reserve, so capturing only the
    // plant would durably record everything about this act except the
    // water — the watering would not survive a restart.
    expect(captured).toContain(pot);
  });

  it('naming the POT waters its occupant — a player types both', async () => {
    const { giver, room, plant, pot } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    dryOut(plant, 6);
    const before = plant.getSoilMoisture();

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(pot, 'pot'), undefined, giver), makeContext(giver, room));

    expect(plant.getSoilMoisture()).toBeGreaterThan(before);
    expect(captured).toContain(pot);
  });

  it('watering an EMPTY pot says there is nothing planted in it', async () => {
    const room = makeStuff(() => new LitRoom());
    room.setAmbientFlux(40);
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    // Credits land on the giver's own creditDeed since the OO sweep —
    // the instance is the capture seam.
    vi.spyOn(
      giver as unknown as {
        creditDeed(sub: {
          discipline: string;
          difficulty: string;
          outcome: string;
        }): Promise<void>;
      },
      'creditDeed',
    ).mockImplementation(async (subcheck) => {
      deeds.push(subcheck);
    });
    ContainmentApi.move(giver, room);
    const pot = makePot();
    ContainmentApi.move(pot, room);
    const can = makeCan(2);
    ContainmentApi.move(can, giver);

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(pot, 'pot'), undefined, giver), ctx);

    expect(noteReasons(ctx)).toContain('nothing-planted');
    expect(can.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    expect(JSON.stringify(giver.received)).toContain('nothing planted');
    expect(captured).toHaveLength(0);
  });

  it('watering an already-wet plant changes nothing and keeps the water', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    plant.getVigor(); // full root zone, no elapsed time

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), ctx);

    expect(noteReasons(ctx)).toContain('already-wet');
    expect(can.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    expect(captured).toHaveLength(0);
  });

  it('rejects a non-plant target and a missing source, changing no state', async () => {
    const { giver, room, plant } = scene();
    const rock = makeStuff(() => {
      const t = new TestItem();
      t.setName('rock');
      return t;
    });
    ContainmentApi.move(rock, room);

    // Not a plant.
    const ctrl = makeStuff(() => new WaterController());
    const ctx1 = makeContext(giver, room);
    await ctrl.execute(model(one(rock, 'rock'), undefined, giver), ctx1);
    expect(noteReasons(ctx1)).toContain('not-a-plant');

    // No source at all (nothing carried).
    dryOut(plant, 6);
    const before = plant.getSoilMoisture();
    const ctx2 = makeContext(giver, room);
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), ctx2);
    expect(noteReasons(ctx2)).toContain('no-water-source');
    expect(plant.getSoilMoisture()).toBeCloseTo(before, 6);
    expect(captured).toHaveLength(0);
  });

  it('rejects an empty named source', async () => {
    const { giver, room, plant } = scene();
    const empty = makeCan(0);
    ContainmentApi.move(empty, giver);
    dryOut(plant, 6);

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(
      model(one(plant, 'lily'), one(empty, 'can', 'with')),
      ctx,
    );
    expect(noteReasons(ctx)).toContain('source-empty');
    expect(captured).toHaveLength(0);
  });

  it('a can on the FLOOR is not picked up as a carried source', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, room); // in the room, not the pack
    dryOut(plant, 6);

    const ctrl = makeStuff(() => new WaterController());
    const ctx = makeContext(giver, room);
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), ctx);

    expect(noteReasons(ctx)).toContain('no-water-source');
    // …but naming it explicitly still works (it is reachable).
    const ctx2 = makeContext(giver, room);
    await ctrl.execute(
      model(one(plant, 'lily'), one(can, 'can', 'with')),
      ctx2,
    );
    expect(plant.getSoilMoisture()).toBeCloseTo(1, 3);
  });

  it('credits horticulture, and the difficulty tracks the plant\'s state', async () => {
    // The anti-grind property, at the verb: difficulty is a measurement of
    // the world (how far gone the plant was), not a tag on the act. A routine
    // top-up grades trivially — and the estimator makes a trivial success
    // barely move the estimate, so watering cannot be farmed.
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    dryOut(plant, 6); // still healthy — a routine top-up
    expect(plant.getConditionBand()).toBe('healthy');

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), makeContext(giver, room));
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.discipline).toBe('horticulture');
    expect(deeds[0]!.difficulty).toBe('easy');
    expect(deeds[0]!.outcome).toBe('success');
  });

  it('a rescue grades harder than a top-up', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    // Let it fall to `failing` — pulling it back is a rescue, not a top-up.
    plant.getVigor();
    now = BASE + 90 * 86_400;
    expect(plant.getConditionBand()).toBe('failing');

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), makeContext(giver, room));
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.difficulty).toBe('hard');
  });

  it('going through the motions earns nothing — no headroom, no deed', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    plant.getVigor(); // full root zone, no elapsed time

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), makeContext(giver, room));
    expect(deeds).toHaveLength(0);
  });

  it('a dead plant cannot be revived by watering', async () => {
    const { giver, room, plant } = scene();
    const can = makeCan(2);
    ContainmentApi.move(can, giver);
    plant.getVigor();
    now = BASE + 12 * 360 * 86_400; // a simulated real year of neglect
    expect(plant.getConditionBand()).toBe('dead');

    const ctrl = makeStuff(() => new WaterController());
    await ctrl.execute(model(one(plant, 'lily'), undefined, giver), makeContext(giver, room));

    expect(plant.getConditionBand()).toBe('dead');
    expect(plant.getVigor()).toBe(0);
  });
});

/**
 * ⭐ Field population D18 / R5: `water` reaches a plant, a bed, a patch
 * and a field. The view's target gate was `CultivableMixin`, so a bare
 * plant never bound — `water the lily` worked only as `water the pot`.
 */
describe('water.yaml — a plant, a bed, a patch or a field', () => {
  const VIEW = join(
    __dirname,
    '..', '..', '..', '..', '..', '..', '..', '..',
    'content', 'platform', 'content', 'platform', 'cmd', 'bulk', 'water.yaml',
  );
  interface ArgSpec {
    name: string;
    requires?: string | string[];
    prepositions?: string[];
    greedy?: boolean;
    required?: boolean;
  }
  const args = (): ArgSpec[] =>
    (YAML.parse(readFileSync(VIEW, 'utf8')) as { args: ArgSpec[] }).args;

  it('⭐ a bare plant binds: the target is Growing OR Soil', () => {
    const target = args().find((a) => a.name === 'target')!;
    expect([target.requires].flat()).toEqual([
      'VisibleMixin',
      'GrowingMixin|SoilMixin',
    ]);
    expect(MixinApi.hasMixin(Plant, Mixins.Growing)).toBe(true);
    expect(MixinApi.hasMixin(Plant, Mixins.Visible)).toBe(true);
  });

  it('declares `at <patch>` — optional, greedy, gated on SoilMixin', () => {
    const patch = args().find((a) => a.name === 'patch')!;
    expect(patch.required).toBe(false);
    expect(patch.greedy).toBe(true);
    expect(patch.prepositions).toEqual(['at']);
    expect([patch.requires].flat()).toEqual(['SoilMixin']);
    expect(() => CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), VIEW)).not.toThrow();
  });
});

describe('water <crop> [at <patch>] — on a field', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    now = BASE;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    captured = [];
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async (s: Stuff) => {
        captured.push(s);
      }) as unknown as typeof PersistableApi.captureHostOf,
    );
    deeds = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function moisture(host: Stuff & { getReserve(k: string): Reserve | undefined }): number {
    return host.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue();
  }

  function soil(capacity: number, current: number): Reserve {
    return new Reserve(
      SOIL_MOISTURE_RESERVE_KEY,
      Quantity.of(capacity, 'L'),
      Quantity.of(current, 'L'),
      'cultivation',
      'wilting',
    );
  }

  function makePart(key: string, area: number, current: number): TestPart {
    return makeStuffAtPath(() => {
      const p = new TestPart();
      p.key = key;
      p.area = area;
      p.setName(key.replace('-', ' '));
      p.setReserve(soil(300, current));
      return p;
    }, freshPath(`/trade/farming/thing/_water-part-${key}`));
  }

  function fieldScene(parts: TestPart[]): { giver: TestGiver; field: TestField } {
    const field = makeStuffAtPath(() => {
      const f = new TestField();
      f.setAmbientFlux(400);
      if (parts.length === 0) f.setReserve(soil(300, 0));
      f.parts = parts;
      return f;
    }, freshPath('/trade/farming/location/_water-field'));
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Alice');
      return g;
    });
    vi.spyOn(
      giver as unknown as { creditDeed(): Promise<void> },
      'creditDeed',
    ).mockImplementation(async () => {});
    ContainmentApi.move(giver, field);
    return { giver, field };
  }

  function cropIn(field: TestField, part?: TestPart): Plant {
    const p = makePlant();
    // Broadcast, so an AREA crop — a stand, not one plant.
    p.setProfile({ ...lilyProfile(), seedRateKgPerM2: 0.1 });
    // One crop over separate rows — the bench's `extends:` stands.
    p.setHarvestTemplatePath('/trade/farming/thing/crop/_water-grain');
    p.setSownAreaM2(100);
    if (part) p.setGroundPart(part.key);
    ContainmentApi.move(p, field);
    return p;
  }

  it('⭐ a bare field crop binds and is watered — and the reply says how much', async () => {
    const { giver, field } = fieldScene([]);
    const crop = cropIn(field);
    expect(crop.getBed()).toBe(field);
    const can = makeCan(2);
    ContainmentApi.move(can, giver);

    await makeStuff(() => new WaterController()).execute(
      model(one(crop, 'lily'), undefined, giver),
      makeContext(giver, field),
    );

    expect(moisture(field)).toBeCloseTo(2, 3);
    expect(can.getBulkAmount('interior').rawValue()).toBeCloseTo(0, 3);
    expect(JSON.stringify(giver.received)).toContain('You tip 2 L of clear water');
    expect(captured).toContain(field);
  });

  it('⭐ on a field of two parts, naming neither is refused — by the ground, listing both', async () => {
    const top = makePart('top-end', 100, 0);
    const lane = makePart('lane-end', 100, 0);
    const { giver, field } = fieldScene([top, lane]);
    const crop = cropIn(field, top);
    const can = makeCan(2);
    ContainmentApi.move(can, giver);

    const ctx = makeContext(giver, field);
    await makeStuff(() => new WaterController()).execute(
      model(one(crop, 'lily'), undefined, giver),
      ctx,
    );

    expect(noteReasons(ctx)).toContain('patch-unnamed');
    const said = JSON.stringify(giver.received);
    expect(said).toContain('Which part?');
    expect(said).toContain('top end');
    expect(said).toContain('lane end');
    expect(can.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    expect(moisture(top) + moisture(lane)).toBe(0);
  });

  it('⭐ at the dry part, only THAT part takes the water', async () => {
    const top = makePart('top-end', 100, 0);
    const lane = makePart('lane-end', 100, 0);
    const { giver, field } = fieldScene([top, lane]);
    // Named by the lane end's stand, watered at the top end's.
    const topCrop = cropIn(field, top);
    const laneCrop = cropIn(field, lane);
    const can = makeCan(2);
    ContainmentApi.move(can, giver);

    await makeStuff(() => new WaterController()).execute(
      model(one(laneCrop, 'lily'), undefined, giver, one(top, 'the top end', 'at')),
      makeContext(giver, field),
    );

    expect(moisture(top)).toBeCloseTo(2, 3);
    expect(moisture(lane)).toBe(0);
    expect(topCrop.getSoilMoisture()).toBeGreaterThan(laneCrop.getSoilMoisture());
    expect(JSON.stringify(giver.received)).toMatch(/into the soil around .*lily.* at .*top end/);
  });

  it('⭐ a bystander sees which part was watered', async () => {
    const top = makePart('top-end', 100, 0);
    const lane = makePart('lane-end', 100, 0);
    const { giver, field } = fieldScene([top, lane]);
    cropIn(field, top);
    const laneCrop = cropIn(field, lane);
    const watcher = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Bob');
      return g;
    });
    ContainmentApi.move(watcher, field);
    const can = makeCan(2);
    ContainmentApi.move(can, giver);

    await makeStuff(() => new WaterController()).execute(
      model(one(laneCrop, 'lily'), undefined, giver, one(top, 'the top end', 'at')),
      makeContext(giver, field),
    );

    expect(JSON.stringify(watcher.received)).toMatch(/waters .*lily.* at .*top end/);
  });

  it('⭐ a bucket on a thousand square meters barely shows — and says so', async () => {
    const big = makePart('middle', 1000, 0);
    const other = makePart('lane-end', 100, 0);
    const { giver, field } = fieldScene([big, other]);
    const crop = cropIn(field, big);
    const bucket = makeCan(10, 10);
    ContainmentApi.move(bucket, giver);

    await makeStuff(() => new WaterController()).execute(
      model(one(crop, 'lily'), undefined, giver, one(big, 'the middle', 'at')),
      makeContext(giver, field),
    );

    expect(moisture(big)).toBeCloseTo(10, 3);
    const said = JSON.stringify(giver.received);
    expect(said).toContain('You tip 10 L of clear water');
    expect(said).toContain('On 1,000 square meters it barely shows.');
  });

  it('a part with nothing sown on it is watered itself', async () => {
    const top = makePart('top-end', 100, 0);
    const lane = makePart('lane-end', 100, 0);
    const { giver, field } = fieldScene([top, lane]);
    const can = makeCan(2);
    ContainmentApi.move(can, giver);

    await makeStuff(() => new WaterController()).execute(
      model(one(top, 'top end'), undefined, giver),
      makeContext(giver, field),
    );

    expect(moisture(top)).toBeCloseTo(2, 3);
    expect(moisture(lane)).toBe(0);
    expect(JSON.stringify(giver.received)).toContain('into the soil of');
  });
});

