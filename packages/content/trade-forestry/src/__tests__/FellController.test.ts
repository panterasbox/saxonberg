/**
 * `fell` (forestry D3) — the refusals, the felling, the cross-cut, the
 * planted tree, and the credits.
 *
 * ⚠ A controller test starts AFTER the binder. The view's arg gates
 * (`target` declares NO `requires`; `axe` requires `ToolMixin`) and the
 * raw-word landing (`fell oak` → `{ stuff: null, raw: 'oak' }`) are pinned
 * in `verb-gates.test.ts`, which drives the real YAML through the
 * binder. This file hands the controller pre-bound models.
 *
 * The giver here has no engagement capacity, so `engageStep` applies the
 * effect at once (the degenerate fallback); the completions are async
 * and awaited by settling the microtask queue.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FellController, { LOGS_PER_STANDARD, type FellModel } from '../idea/cmd/forestry/FellController';
import Wood from '../location/Wood';
import Bole, { BOLE_LENGTHS } from '../thing/Bole';
import Panel from '../thing/Panel';
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import Firewood from '@saxonberg/server/mud/platform/thing/Firewood';
import Seed from '@saxonberg/server/mud/platform/thing/Seed';
import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { CommandApi, type CommandContext, type ModelData } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ShadowApi } from '@saxonberg/server/mud/api/shadow';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { PLANT_SLOT, SOIL_MOISTURE_RESERVE_KEY, SOIL_NITROGEN_RESERVE_KEY } from '@saxonberg/server/mud/lib/husbandry/Cultivable';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

class TestGiver extends AdvancementMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'TestGiverFell';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

const OAK = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/fagaceae/quercus/robur';
const OAK_WOOD = '/stuff/idea/material/wood/oak';
const ACORN = '/trade/forestry/thing/seed/acorn';
const ROOM = '/world/_test/hanging-wood/ride';

let seq = 0;
const fresh = (p: string): string => `${p}-${++seq}`;

function oakWood(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('oak');
    m.setDensity(Quantity.of(750, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.17, 'W/(m·K)'));
    return m;
  }, OAK_WOOD) as unknown as Material;
}

function makeWood(standing = 8): Wood {
  return makeStuffAtPath(() => {
    const w = new Wood();
    w.setShortDescription('the ride');
    w.setAreaM2(100);
    w.setMix([{ speciesPath: OAK, name: 'oak', woodMaterialPath: OAK_WOOD, seedPath: ACORN, standing, capacity: 10, incrementPerYear: 1 }]);
    return w;
  }, fresh(ROOM));
}

function makeAxe(caps: string[] = ['felling', 'cutting']): ToolItem {
  return makeStuffAtPath(() => {
    const t = new ToolItem();
    t.setShortDescription(caps.includes('felling') ? 'a felling axe' : 'a billhook');
    t.setCapabilities(caps);
    return t;
  }, fresh('/trade/forestry/thing/_axe'));
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(`verbs: [fell]\ncontroller: NoopController\ndescription: stub\n`, '<test>');
}
function ctx(giver: TestGiver, room: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: room as never,
    commandText: 'fell',
    executionId: 'test',
    commandId: 'test',
    verb: 'fell',
    command: stubCommand(),
  });
}
const one = (stuff: Stuff | null, raw: string): MqlOneResult => ({ stuff, raw });
function model(target?: MqlOneResult, axe?: MqlOneResult): FellModel {
  return { target, axe } as ModelData as unknown as FellModel;
}
const reasons = (c: CommandContext): string[] => c.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 0));
};

let deeds: Array<{ discipline: string; difficulty: string }>;
let captured: Stuff[];
let wood: Material;

describe('fell', () => {
  let base: number;
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(base, 's'));
    deeds = [];
    captured = [];
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation((async (s: Stuff) => {
      captured.push(s);
    }) as unknown as typeof PersistableApi.captureHostOf);
    wood = oakWood();
    // The oak, so a planted tree can say what it is.
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setBinomial('Quercus robur');
      return sp;
    }, OAK);
    vi.spyOn(StuffApi, 'singleton').mockImplementation((async (path: string) => {
      if (path === OAK_WOOD) return wood;
      throw new Error(`no singleton ${path}`);
    }) as unknown as typeof StuffApi.singleton);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      switch (path) {
        case '/trade/forestry/thing/bole':
          return makeStuffAtPath(() => {
            const b = new Bole();
            b.setShortDescription('felled trunk');
            return b;
          }, path);
        case '/trade/forestry/thing/log':
          return makeStuffAtPath(() => {
            const l = new Firewood();
            l.setShortDescription('log');
            return l;
          }, path);
        case '/trade/forestry/thing/timber':
          return makeStuffAtPath(() => {
            const t = new Thing();
            t.setShortDescription('length of green timber');
            return t;
          }, path);
        case '/trade/forestry/thing/felled-tree':
          return makeStuffAtPath(() => {
            const t = new Thing();
            t.setShortDescription('felled sapling');
            return t;
          }, path);
        case ACORN:
          return makeStuffAtPath(() => {
            const s = new Seed();
            s.setShortDescription('acorn');
            return s;
          }, path);
        default:
          throw new Error(`no template ${path}`);
      }
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function scene(standing = 8): { giver: TestGiver; room: Wood } {
    const room = makeWood(standing);
    const giver = makeStuffAtPath(() => {
      const g = new TestGiver();
      g.setName('Tam');
      return g;
    }, fresh('/platform/agent/Avatar/_feller'));
    vi.spyOn(giver as unknown as { creditDeed(d: { discipline: string; difficulty: string }): Promise<void> }, 'creditDeed')
      .mockImplementation(async (d) => {
        deeds.push(d);
      });
    ContainmentApi.move(giver, room);
    return { giver, room };
  }

  describe('the refusals', () => {
    it('no-axe: nothing bound', async () => {
      const { giver, room } = scene();
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak')), c);
      expect(reasons(c)).toContain('no-axe');
    });

    it('wrong-tool: a billhook, in words', async () => {
      const { giver, room } = scene();
      const hook = makeAxe(['cutting']);
      ContainmentApi.move(hook, giver);
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak'), one(hook, 'billhook')), c);
      expect(reasons(c)).toContain('wrong-tool');
      expect(JSON.stringify(giver.received)).toMatch(/will not take an oak/);
    });

    it('no-stand: a room with no stand', async () => {
      const room = makeStuff(() => new (ContainerMixin(NamedMixin(Idea)))());
      const giver = makeStuffAtPath(() => new TestGiver(), fresh('/platform/agent/Avatar/_x'));
      ContainmentApi.move(giver, room as never);
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const c = ctx(giver, room as unknown as Stuff);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak'), one(axe, 'axe')), c);
      expect(reasons(c)).toContain('no-stand');
    });

    it('no-such-species: a word the stand does not know', async () => {
      const { giver, room } = scene();
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(null, 'beech'), one(axe, 'axe')), c);
      expect(reasons(c)).toContain('no-such-species');
    });

    it('⭐ stand-empty: in words about the wood', async () => {
      const { giver, room } = scene(0);
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak'), one(axe, 'axe')), c);
      expect(reasons(c)).toContain('stand-empty');
      expect(JSON.stringify(giver.received)).toMatch(/nothing left here that is worth the axe/);
    });
  });

  describe('⭐⭐ the felling', () => {
    it('drops ONE bole of the species’ wood and mass, four logs on the floor, a seed in hand; the stand reads smaller', async () => {
      const { giver, room } = scene();
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak'), one(axe, 'axe')), c);
      await settle();

      const boles = room.getContents().filter((s): s is Bole => s instanceof Bole);
      expect(boles).toHaveLength(1);
      const bole = boles[0]!;
      expect(bole.getMaterial()?.getName()).toBe('oak');
      expect(bole.getMass().rawValue()).toBe(675);
      expect(bole.getLengthsLeft()).toBe(BOLE_LENGTHS);
      expect(room.getContents().filter((s) => s instanceof Firewood)).toHaveLength(LOGS_PER_STANDARD);
      expect(giver.getContents().filter((s) => s instanceof Seed)).toHaveLength(1);
      expect(room.standingNow(room.getMix()[0]!)).toBe(7);
      expect(room.getStandStamp()).toBe(base);
      expect(captured).toContain(room);
      expect(deeds).toEqual([{ discipline: 'silviculture', difficulty: 'standard', outcome: 'success' }]);
      expect(JSON.stringify(giver.received)).toMatch(/too much for any one back/);
    });

    it('bare `fell` takes the thickest species', async () => {
      const { giver, room } = scene();
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(null, ''), one(axe, 'axe')), c);
      await settle();
      expect(room.standingNow(room.getMix()[0]!)).toBe(7);
    });

    it('a stand of one: the second felling refuses', async () => {
      const { giver, room } = scene(1);
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak'), one(axe, 'axe')), ctx(giver, room));
      await settle();
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak'), one(axe, 'axe')), c);
      expect(reasons(c)).toContain('stand-empty');
      expect(room.getContents().filter((s) => s instanceof Bole)).toHaveLength(1);
    });
  });

  describe('⭐ the cross-cut', () => {
    it('`fell bole` ×6 yields six timber of the bole’s wood and destructs the bole', async () => {
      const { giver, room } = scene();
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      await makeStuff(() => new FellController()).execute(model(one(null, 'oak'), one(axe, 'axe')), ctx(giver, room));
      await settle();
      const bole = room.getContents().find((s): s is Bole => s instanceof Bole)!;
      for (let i = 0; i < BOLE_LENGTHS; i += 1) {
        const c = ctx(giver, room);
        await makeStuff(() => new FellController()).execute(model(one(bole, 'bole'), one(axe, 'axe')), c);
        await settle();
        expect(reasons(c)).not.toContain('bole-spent');
      }
      const timber = giver.getContents().filter((s) => (s as unknown as { getShortDescription?(): string }).getShortDescription?.() === 'length of green timber');
      expect(timber).toHaveLength(BOLE_LENGTHS);
      expect((timber[0] as Thing).getMaterial()?.getName()).toBe('oak');
      expect(bole.isDestroyed()).toBe(true);
      expect(deeds.filter((d) => d.difficulty === 'easy')).toHaveLength(BOLE_LENGTHS);
      expect(JSON.stringify(giver.received)).toMatch(/the wood can have it back/);
    });

    it('a bole affords its cut with no stand in the room', async () => {
      const room = makeStuff(() => new (ContainerMixin(NamedMixin(Idea)))());
      const giver = makeStuffAtPath(() => new TestGiver(), fresh('/platform/agent/Avatar/_y'));
      ContainmentApi.move(giver, room as never);
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const bole = makeStuffAtPath(() => {
        const b = new Bole();
        b.setMaterial(wood);
        b.setMass(Quantity.of(675, 'kg'));
        return b;
      }, fresh('/trade/forestry/thing/bole'));
      ContainmentApi.move(bole, room as never);
      const c = ctx(giver, room as unknown as Stuff);
      await makeStuff(() => new FellController()).execute(model(one(bole, 'bole'), one(axe, 'axe')), c);
      await settle();
      expect(bole.getLengthsLeft()).toBe(BOLE_LENGTHS - 1);
      expect(giver.getContents()).toHaveLength(2); // the axe and a timber
    });
  });

  describe('a planted tree', () => {
    function tissue(): Material {
      return makeStuffAtPath(() => {
        const m = new Material();
        m.setName('plant-tissue');
        m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
        m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
        return m;
      }, fresh('/stuff/idea/material/_tissue')) as unknown as Material;
    }
    function panelIn(room: Stuff): Panel {
      const p = makeStuffAtPath(() => {
        const panel = new Panel();
        panel.setShortDescription('panel');
        panel.setMass(Quantity.of(2400, 'kg'));
        panel.interiorBulk = true;
        panel.setInteriorCapacity(Quantity.of(180, 'L'));
        panel.setInteriorAmount(Quantity.of(180, 'L'));
        panel.setStaticSlots([{ name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 8 }]);
        panel.setReserve(new Reserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(90, 'L'), Quantity.of(90, 'L'), 'cultivation', 'wilting'));
        panel.setReserve(new Reserve(SOIL_NITROGEN_RESERVE_KEY, Quantity.of(100, '%'), Quantity.of(100, '%'), 'cultivation', 'spent'));
        return panel;
      }, fresh('/world/_test/thing/panel'));
      ContainmentApi.move(p, room as never);
      return p;
    }
    function standardIn(panel: Panel, stage: string, opts: { stool?: boolean; standardMaterial?: string } = {}): Plant {
      const p = makeStuffAtPath(() => {
        const t = new Plant();
        t.setShortDescription(opts.stool ? 'hazel stool' : 'oak sapling');
        t.setMaterial(tissue());
        t.setMass(Quantity.of(5, 'kg'));
        t.setLastAmbientK(290);
        t.setLifecycleState('alive');
        t.setDiscipline('silviculture');
        t.setSpecies(StuffApi.findByTemplatePath<Species>(OAK)!);
        t.setHarvestTemplatePath(opts.stool ? '/trade/forestry/thing/cordwood' : null);
        if (opts.standardMaterial) t.setStandardMaterialPath(opts.standardMaterial);
        t.setProfile({ moistureHappyAt: 0.25, moistureWiltAt: 0.05, litresPerGameDay: 0.3, luxHappyAt: 20, luxDarkAt: 3, rootDemand: { seedling: 0.5, young: 3, established: 10, mature: 20 }, daysToStage: { young: 360, established: 1800, mature: 5400 } });
        (t as unknown as { growthStage: string }).growthStage = stage;
        return t;
      }, fresh('/trade/forestry/thing/plant/_std'));
      ContainmentApi.move(p, panel);
      panel.occupy(p, PLANT_SLOT);
      return p;
    }

    it('a mature planted standard in a Wood’s panel → bole + logs + seed, with the STAND’s wood', async () => {
      const { giver, room } = scene();
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const panel = panelIn(room);
      const tree = standardIn(panel, 'mature');
      const c = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(tree, 'sapling'), one(axe, 'axe')), c);
      await settle();
      expect(tree.isDestroyed()).toBe(true);
      expect(panel.occupiedSlotCount()).toBe(0);
      const bole = room.getContents().find((s): s is Bole => s instanceof Bole)!;
      expect(bole).toBeDefined();
      expect(bole.getMaterial()?.getName()).toBe('oak');
      // The stand itself is untouched — a planted tree was never in its count.
      expect(room.standingNow(room.getMix()[0]!)).toBe(8);
      expect(deeds[0]!.difficulty).toBe('standard');
    });

    it('established → one whole felled tree of 30 kg in hand; young → 8 kg', async () => {
      for (const [stage, kg] of [['established', 30], ['young', 8]] as const) {
        const { giver, room } = scene();
        const axe = makeAxe();
        ContainmentApi.move(axe, giver);
        const tree = standardIn(panelIn(room), stage);
        await makeStuff(() => new FellController()).execute(model(one(tree, 'sapling'), one(axe, 'axe')), ctx(giver, room));
        await settle();
        const felled = giver.getContents().find((s) => (s as unknown as { getShortDescription?(): string }).getShortDescription?.() === 'felled sapling') as unknown as Thing;
        expect(felled, stage).toBeDefined();
        expect(felled.getMass().rawValue()).toBe(kg);
        expect(room.getContents().some((s) => s instanceof Bole)).toBe(false);
      }
    });

    it('a seedling refuses; a stool refuses (cut it with a billhook)', async () => {
      const { giver, room } = scene();
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const panel = panelIn(room);
      const seedling = standardIn(panel, 'seedling');
      const stool = standardIn(panel, 'mature', { stool: true });
      const c1 = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(seedling, 'sapling'), one(axe, 'axe')), c1);
      expect(reasons(c1)).toContain('not-yet-a-tree');
      const c2 = ctx(giver, room);
      await makeStuff(() => new FellController()).execute(model(one(stool, 'stool'), one(axe, 'axe')), c2);
      expect(reasons(c2)).toContain('not-a-standard');
      expect(seedling.isDestroyed()).toBe(false);
      expect(stool.isDestroyed()).toBe(false);
    });

    it('in a room that is NOT a wood, a mature standard is made of its own standardMaterialPath', async () => {
      const room = makeStuff(() => new (ContainerMixin(NamedMixin(Idea)))());
      const giver = makeStuffAtPath(() => new TestGiver(), fresh('/platform/agent/Avatar/_z'));
      ContainmentApi.move(giver, room as never);
      const axe = makeAxe();
      ContainmentApi.move(axe, giver);
      const tree = standardIn(panelIn(room as unknown as Stuff), 'mature', { standardMaterial: OAK_WOOD });
      await makeStuff(() => new FellController()).execute(model(one(tree, 'sapling'), one(axe, 'axe')), ctx(giver, room as unknown as Stuff));
      await settle();
      const bole = (room as unknown as { getContents(): Stuff[] }).getContents().find((s): s is Bole => s instanceof Bole)!;
      expect(bole).toBeDefined();
      expect(bole.getMaterial()?.getName()).toBe('oak');
    });
  });
});
