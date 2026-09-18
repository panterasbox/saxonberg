/**
 * Panel — the coppice panel that remembers being cut (forestry.md § The panel).
 *
 * Three claims: the STACK (persistable + singleton + bed, each omission
 * silent); the READY LINE (a cut panel says when it is ready again, in
 * words); and ⭐ the materialize ROUND-TRIP — seat six stools, cut one,
 * capture, evict, materialize a fresh shell: the cut stool comes back cut
 * and the other five come back ripe. That last one is AC 8 at unit scale;
 * the shipped `GardenBed` in a transient room came back full every boot.
 * Harness mirrors `PersistableKeyedNesting.test.ts`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Panel from '../thing/Panel';
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import Material from '@saxonberg/server/mud/lib/material/Material';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '@saxonberg/server/mud/lib/husbandry/Cultivable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import Wood from '../location/Wood';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { PersonaMixin } from '@saxonberg/server/mud/lib/character/Persona';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';

const PANEL_PATH = '/world/_test/thing/panel';
const STOOL_PATH = '/trade/forestry/thing/_stool';

let seq = 0;
function tissue(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, `/stuff/idea/material/_test/panel-tissue-${seq}`) as unknown as Material;
}

/** A hazel stool as the row authors it: mature, ripe, on a game-year cycle. */
function newStool(): Plant {
  const p = new Plant();
  p.setShortDescription('hazel stool');
  p.setMaterial(tissue());
  p.setMass(Quantity.of(12, 'kg'));
  p.setLastAmbientK(290);
  p.setLifecycleState('alive');
  p.setHarvestTemplatePath('/trade/forestry/thing/cordwood');
  p.setHarvestTool('cutting');
  p.setDiscipline('silviculture');
  p.setProfile({
    moistureHappyAt: 0.2,
    moistureWiltAt: 0.03,
    litresPerGameDay: 0.15,
    luxHappyAt: 15,
    luxDarkAt: 2,
    rootDemand: { seedling: 0.4, young: 2, established: 6, mature: 14 },
    daysToStage: { young: 60, established: 180, mature: 360 },
    fruitSetCount: 8,
    fruitFillDays: 360,
  });
  const raw = p as unknown as {
    growthStage: string; _vigor: number; _flowering: boolean; _seedSet: boolean; _fruitFill: number;
  };
  raw.growthStage = 'mature';
  raw._vigor = 0.9;
  raw._flowering = true;
  raw._seedSet = true;
  raw._fruitFill = 1;
  return p;
}

function newPanel(): Panel {
  const panel = new Panel();
  panel.setShortDescription('panel of coppiced hazel');
  panel.setLongDescription('A block of hazel stools set out in rough rows.');
  panel.setMass(Quantity.of(2400, 'kg'));
  panel.interiorBulk = true;
  panel.setInteriorCapacity(Quantity.of(180, 'L'));
  panel.setInteriorAmount(Quantity.of(180, 'L'));
  panel.setStaticSlots([{ name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 8 }]);
  panel.setReserve(new Reserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(90, 'L'), Quantity.of(90, 'L'), 'cultivation', 'wilting'));
  panel.setReserve(new Reserve(SOIL_NITROGEN_RESERVE_KEY, Quantity.of(100, '%'), Quantity.of(100, '%'), 'cultivation', 'spent'));
  return panel;
}

/* ─────────────────────────── harness ───────────────────────────────── */

let snapshots: Record<string, unknown>[];
const BASE = 40_000_000;
let now = BASE;

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  installV1QuantityTagTables();
  // Capturing a Reserved host preloads its quantity marshallers through
  // the Document seam; a no-op resolver keeps it quiet (the HarvestVerb
  // precedent).
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  WorldClockApi._resetForTesting();
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  snapshots = [];
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col !== Collections.HolderSnapshots) return [];
      return snapshots.filter((d) => Object.entries(query).every(([k, v]) => d[k] === v));
    },
  );
  vi.spyOn(PersistApi, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      if (col !== Collections.HolderSnapshots) return 'id';
      const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
      if (i >= 0) {
        snapshots[i] = { ...doc, _id: snapshots[i]!._id };
        return snapshots[i]!._id as string;
      }
      const _id = String(snapshots.length + 1);
      snapshots.push({ ...doc, _id });
      return _id;
    },
  );
  vi.spyOn(PersistApi, 'delete').mockImplementation(async (col: string, id: string) => {
    if (col !== Collections.HolderSnapshots) return;
    const i = snapshots.findIndex((d) => d._id === id);
    if (i >= 0) snapshots.splice(i, 1);
  });
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === STOOL_PATH) {
      const inst = makeStuffAtPath(newStool, path);
      await (inst as unknown as { postRegister: () => Promise<void> }).postRegister();
      return inst;
    }
    throw new Error(`no clone factory for ${path}`);
  }) as unknown as typeof StuffApi.clone);
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'rejection' });
  makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

function evict(host: Stuff): void {
  if (MixinApi.isContainer(host)) {
    for (const item of host.getDeepContents()) StuffApi.unregister(item);
  }
  StuffApi.unregister(host);
}

function seatSix(panel: Panel): Plant[] {
  const stools: Plant[] = [];
  for (let i = 0; i < 6; i += 1) {
    const s = makeStuffAtPath(newStool, STOOL_PATH);
    ContainmentApi.move(s, panel);
    panel.occupy(s, PLANT_SLOT);
    stools.push(s);
  }
  return stools;
}

/* ─────────────────────────── the tests ─────────────────────────────── */

describe('Panel — the stack', () => {
  it('is a persistable SINGLETON bed', () => {
    for (const m of [Mixins.Persistable, Mixins.Singleton, Mixins.Cultivable, Mixins.Soil, Mixins.Populates, Mixins.Slotted]) {
      expect(MixinApi.hasMixin(Panel, m), String(m)).toBe(true);
    }
  });

  it('re-declares the four cultivation views (a class static SHADOWS the mixin list)', () => {
    const peers = Panel.commandContributions.peers ?? [];
    for (const v of ['plant', 'repot', 'harvest']) {
      expect(peers).toContain(`platform/cmd/inventory/${v}.yaml`);
    }
    expect(peers).toContain('platform/cmd/bulk/feed.yaml');
  });
});

describe('Panel — the ready line', () => {
  function viewer(): Stuff {
    return makeStuffAtPath(newStool, '/trade/forestry/thing/_viewer') as unknown as Stuff;
  }

  it('a panel of ripe stools says they are ready to cut', () => {
    const panel = makeStuffAtPath(newPanel, PANEL_PATH);
    seatSix(panel);
    const text = Mml.augment(panel.getLongDescription() ?? '', panel, viewer());
    expect(text).toMatch(/The stools are ready to cut\./);
  });

  it('⭐ a cut panel says WHEN, in words — about a year', () => {
    const panel = makeStuffAtPath(newPanel, PANEL_PATH);
    const stools = seatSix(panel);
    for (const s of stools) s.settleCycle();
    const text = Mml.augment(panel.getLongDescription() ?? '', panel, viewer());
    expect(text).toMatch(/cut to the stool and regrowing/);
    expect(text).toMatch(/about three hundred and sixty days — a year, near enough/);
    expect(text).not.toMatch(/\b360\b/);
  });

  it('one cut stool among ripe ones reads as "some of the stools"', () => {
    const panel = makeStuffAtPath(newPanel, PANEL_PATH);
    const stools = seatSix(panel);
    stools[0]!.settleCycle();
    const text = Mml.augment(panel.getLongDescription() ?? '', panel, viewer());
    expect(text).toMatch(/Some of the stools are cut to the stool and regrowing/);
  });
});

describe('Panel — ⭐ the materialize round-trip (the restart claim at unit scale)', () => {
  it('a cut stool comes back cut; the others come back ripe', async () => {
    const panel = makeStuffAtPath(newPanel, PANEL_PATH);
    const stools = seatSix(panel);
    // Every stool is its own keyed host; touching the key mints it.
    for (const s of stools) expect(s.getPersistenceKey()).toBeTruthy();
    expect(stools.every((s) => s.isHarvestable())).toBe(true);

    // The cut: what `harvest` does to a polycarp — settle the cycle, then
    // capture the bed AND the plant (a polycarp is its own host).
    stools[2]!.settleCycle();
    expect(stools[2]!.isHarvestable()).toBe(false);

    await PersistableApi.captureHostOf(panel);
    await PersistableApi.captureHostOf(stools[2]!);
    const rec = snapshots.find((d) => d.scope === PANEL_PATH);
    expect(rec).toBeDefined();

    evict(panel);
    expect(StuffApi.findAllByTemplatePath(STOOL_PATH)).toHaveLength(0);

    const reborn = makeStuffAtPath(newPanel, PANEL_PATH);
    await PersistableApi.materialize(reborn);

    const back = (reborn.getPlants() as Stuff[]).filter((p): p is Plant => p instanceof Plant);
    expect(back).toHaveLength(6);
    expect(reborn.occupiedSlotCount()).toBe(6);
    const ripe = back.filter((p) => p.isHarvestable());
    expect(ripe).toHaveLength(5);
    const cut = back.find((p) => !p.isHarvestable())!;
    expect(cut.getFruitFill()).toBe(0);
    expect(cut.getGrowthStage()).toBe('mature');
  });
});

/* ─────────────── ⭐ the deed — written by the ground, told to its room (W4) ─────────────── */

class Planter extends PersonaMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestPlanter';
}

const OAK = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/fagaceae/quercus/robur';

function newStandard(opts: { stool?: boolean } = {}): Plant {
  const p = new Plant();
  p.setShortDescription(opts.stool ? 'hazel stool' : 'oak sapling');
  p.setMaterial(tissue());
  p.setMass(Quantity.of(2, 'kg'));
  p.setLastAmbientK(290);
  p.setLifecycleState('alive');
  p.setDiscipline('silviculture');
  p.setHarvestTemplatePath(opts.stool ? '/trade/forestry/thing/cordwood' : null);
  p.setProfile({
    moistureHappyAt: 0.25, moistureWiltAt: 0.05, litresPerGameDay: 0.3, luxHappyAt: 20, luxDarkAt: 3,
    rootDemand: { seedling: 0.5, young: 3, established: 10, mature: 20 },
    daysToStage: { young: 360, established: 1800, mature: 5400 },
  });
  return p;
}

describe('Panel — the planting deed', () => {
  let planter: Planter;
  let deeds: Array<{ key: string; fields: Record<string, unknown> }>;

  beforeEach(() => {
    planter = makeStuffAtPath(() => {
      const a = new Planter();
      a.setName('Tam Ferrier');
      return a;
    }, '/platform/agent/Avatar/_tam');
    deeds = [];
    vi.spyOn(planter, 'recordChronicleOnce').mockImplementation(async (key, fields) => {
      deeds.push({ key, fields: fields as Record<string, unknown> });
    });
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(planter);
  });

  function woodWithPanel(): { wood: Wood; panel: Panel } {
    const wood = makeStuffAtPath(() => {
      const w = new Wood();
      w.setShortDescription('the oak clearing');
      w.setMix([{ speciesPath: OAK, name: 'oak', woodMaterialPath: '/stuff/idea/material/wood/oak', seedPath: null, standing: 12, capacity: 14, incrementPerYear: 1 }]);
      return w;
    }, '/world/_test/hanging-wood/oak-clearing');
    const panel = makeStuffAtPath(newPanel, '/world/_test/hanging-wood/thing/panel-north');
    ContainmentApi.move(panel, wood);
    return { wood, panel };
  }

  it('⭐ a standard arriving in a Wood’s panel: the ROOM records the planting, the planter’s chronicle takes one deed keyed on the tree', () => {
    const { wood, panel } = woodWithPanel();
    const tree = makeStuffAtPath(newStandard, '/trade/forestry/thing/plant/oak-standard');
    ContainmentApi.move(tree, panel);
    panel.occupy(tree, PLANT_SLOT);

    const plantings = wood.getPlantings();
    expect(plantings).toHaveLength(1);
    expect(plantings[0]).toMatchObject({
      plantKey: tree.getPersistenceKey(),
      name: 'an oak sapling',
      planter: planter.getIdentityPath(),
      planterName: 'Tam Ferrier',
      gameDay: Math.floor(WorldClockApi.getNow().rawValue() / 86_400),
    });
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.key).toBe(`forestry:planting:${tree.getPersistenceKey()}`);
    expect(deeds[0]!.fields.tags).toEqual(['forestry', 'planting']);
    // …and the room's reading names them.
    expect(wood.standPhrase()).toMatch(/An oak sapling, planted by Tam Ferrier on the/);
  });

  it('a RE-SEAT inside somebody’s frame does not plant it twice (idempotent on the key)', () => {
    const { wood, panel } = woodWithPanel();
    const tree = makeStuffAtPath(newStandard, '/trade/forestry/thing/plant/oak-standard');
    ContainmentApi.move(tree, panel);
    panel.occupy(tree, PLANT_SLOT);
    panel.vacate(PLANT_SLOT, tree);
    panel.occupy(tree, PLANT_SLOT);
    expect(wood.getPlantings()).toHaveLength(1);
  });

  it('a stool arriving records nothing', () => {
    const { wood, panel } = woodWithPanel();
    const stool = makeStuffAtPath(() => newStandard({ stool: true }), STOOL_PATH);
    ContainmentApi.move(stool, panel);
    panel.occupy(stool, PLANT_SLOT);
    expect(wood.getPlantings()).toHaveLength(0);
    expect(deeds).toHaveLength(0);
  });

  it('no acting author (a restore at boot): nothing', () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    const { wood, panel } = woodWithPanel();
    const tree = makeStuffAtPath(newStandard, '/trade/forestry/thing/plant/oak-standard');
    ContainmentApi.move(tree, panel);
    panel.occupy(tree, PLANT_SLOT);
    expect(wood.getPlantings()).toHaveLength(0);
    expect(deeds).toHaveLength(0);
  });

  it('in a room that is NOT a wood (the fuel yard): the deed, and no planting anywhere', () => {
    const yard = makeStuffAtPath(() => new (ContainerMixin(NamedMixin(Idea)))(), '/world/_test/fuel-yard');
    const panel = makeStuffAtPath(newPanel, PANEL_PATH);
    ContainmentApi.move(panel, yard as never);
    const tree = makeStuffAtPath(newStandard, '/trade/forestry/thing/plant/oak-standard');
    ContainmentApi.move(tree, panel);
    panel.occupy(tree, PLANT_SLOT);
    expect(deeds).toHaveLength(1);
    expect(String(deeds[0]!.fields.vars && (deeds[0]!.fields.vars as { where: string }).where)).toMatch(/panel/);
  });
});
