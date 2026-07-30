/**
 * Shared harness for the crafting-branches manual-path tests (the
 * lounge-fixtures precedent): the engaged-capable actor class, the
 * collection-keyed fake-Mongo PM, the pack materials, the authored-shape
 * recipe rows, the clone stubs for the output forms, and the
 * controller-dispatch helpers (execute-as with a tagged acting author +
 * clock advance).
 */

import { vi } from 'vitest';
import { CommandApi } from '../../../../api/command';
import type { CommandContext } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { StuffApi } from '../../../../api/stuff';
import { WorldClockApi } from '../../../../api/worldclock';
import { SchedulerApi } from '../../../../api/scheduler';
import { EventApi } from '../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Forge from '../../../Forge';
import Oven from '../../../Oven';
import { Reserve } from '../../../../lib/reserve';
import ToolItem from '../../../../lib/craft/ToolItem';
import { Idea } from '../../../../lib/stuff/Idea';
import Thing from '../../../../lib/stuff/Thing';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { EngagedMixin } from '../../../../lib/activity/Engaged';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { CraftedMixin } from '../../../../lib/craft/Crafted';
import RecipeCatalogue from '../../../RecipeCatalogue';
import { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';

export const IRON = '/lib/material/_test/mb-iron';
export const VEG = '/lib/material/food/root-vegetable';
export const MEAT = '/lib/material/food/stew-meat';
export const STEW = '/lib/material/food/hearty-stew';
export const POTLUCK = '/lib/material/food/pot-luck';
export const KNIFE_T = '/obj/arms/belt-knife';
export const DISH_T = '/obj/items/plated-dish';

export class TestActor extends CommandGiverMixin(
  SensorMixin(EngagedMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

/** The smithing output fixture — a Crafted Tangible (Thing base). */
export class TestKnife extends CraftedMixin(Thing) {
  static _mixinName = 'TestKnifeManual';
}

const stubCommand = CommandDefinition.fromYaml(
  'verbs: [x]\ncontroller: x\ndescription: d\n',
  '<test>',
);

export function makeContext(
  actor: Stuff,
  room: Stuff,
  verb: string,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: verb,
    executionId: 't',
    commandId: 't',
    verb,
    command: stubCommand,
  });
}

export function ref(stuff: Stuff | null, raw: string): MqlOneResult {
  return { stuff, raw } as unknown as MqlOneResult;
}

/** Advance the game clock past an engaged step + drain the microtasks. */
export async function completeStep(ms: number): Promise<void> {
  WorldClockApi._advanceForTesting(ms);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function registerMaterial(
  path: string,
  name: string,
  tags: string[],
  opts: { edible?: boolean; keywords?: string[] } = {},
): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setKeywords(opts.keywords ?? tags.slice(-1));
    if (opts.edible) m.setEdibility(true);
    return m;
  }, path);
}

export function makeLitForge(bellows: boolean): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(1300);
    f.setBellowsMultiplier(1.6);
    f.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    f.setBellowsActive(bellows);
    return f;
  });
}

export function makeLitOven(): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(500);
    o.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    return o;
  });
}

export function makeTool(cap: string): ToolItem {
  const t = makeStuff(() => new ToolItem());
  t.setCapabilities([cap]);
  return t;
}

export function makeStock(materialPath: string, massKg: number): Thing {
  const t = makeStuff(() => new Thing());
  t.setMass(Quantity.of(massKg, 'kg'));
  t.setMaterial(
    StuffApi.findByTemplatePath<Material>(materialPath) as unknown as Material,
  );
  return t;
}

/** The authored-shape recipe rows the manual paths reverse-match. */
export function branchRecipeRows(): Record<string, unknown>[] {
  return [
    {
      recipeId: 'belt-knife',
      name: 'Belt Knife',
      keywords: ['knife'],
      inputSlots: [
        {
          slot: 'stock',
          category: 'ferrous',
          minGrade: 'fair',
          kind: 'item',
          count: 1,
        },
      ],
      toolCapabilities: ['striking', 'anvil'],
      outputTemplate: KNIFE_T,
      outputMaterial: '',
      baseGradeBand: '',
      requiresHeatK: 1400,
      outputApplication: 'tangible',
      difficulty: 'standard',
      discipline: 'smithing',
    },
    {
      recipeId: 'hearty-stew',
      name: 'Hearty Stew',
      keywords: ['stew'],
      inputSlots: [
        {
          slot: 'roots',
          category: 'vegetable',
          minGrade: 'fair',
          kind: 'item',
          count: 2,
        },
        {
          slot: 'meat',
          category: 'meat',
          minGrade: 'fair',
          kind: 'item',
          count: 1,
        },
      ],
      toolCapabilities: ['pot'],
      outputTemplate: DISH_T,
      outputMaterial: STEW,
      baseGradeBand: '',
      requiresHeatK: 373,
      outputApplication: 'edible',
      outputPortionL: 0.4,
      difficulty: 'standard',
      discipline: 'cooking',
    },
  ];
}

export interface BranchHarness {
  store: Record<string, Record<string, unknown>[]>;
}

/**
 * Stand the harness up: collection-keyed fake Mongo (find + save — the
 * chronicle/transcript ladders round-trip through it), the event
 * registry (scheduler needs it), the game clock, the pack materials, the
 * recipe rows, the output-form clone stubs, and the warmed catalogue.
 */
export async function standUpBranchHarness(): Promise<BranchHarness> {
  WorldClockApi._resetForTesting();
  WorldClockApi.setScale(1);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  SchedulerApi._clearAllForTesting();
  StuffApi.clearAll();

  const reg = await StuffApi.create(() => new EventRegistry());
  stampTemplatePathForTest(reg, '/obj/EventRegistry');
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);

  const store: Record<string, Record<string, unknown>[]> = {
    recipes: branchRecipeRows(),
  };
  let idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const rows = (store[col] ??= []);
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      const withId = { ...doc, _id: id };
      const idx = rows.findIndex((d) => d._id === id);
      if (idx >= 0) rows[idx] = withId;
      else rows.push(withId);
      return id as never;
    },
  );

  registerMaterial(IRON, 'iron', ['metal', 'ferrous'], { keywords: ['iron'] });
  registerMaterial(VEG, 'root vegetable', ['food', 'vegetable', 'raw'], {
    edible: true,
    keywords: ['vegetable'],
  });
  registerMaterial(MEAT, 'stew meat', ['food', 'meat', 'raw'], {
    edible: true,
    keywords: ['meat'],
  });
  registerMaterial(STEW, 'hearty stew', ['food', 'cooked'], {
    edible: true,
    keywords: ['stew'],
  });
  registerMaterial(POTLUCK, 'pot luck', ['food', 'cooked'], {
    edible: true,
    keywords: ['pottage'],
  });

  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    if (path === KNIFE_T || path === '/obj/arms/fire-poker') {
      return makeStuff(() => new TestKnife()) as never;
    }
    if (path === DISH_T) {
      const { default: CraftedDrink } = await import(
        '../../../../domain/lounge/CraftedDrink'
      );
      const d = makeStuff(() => new CraftedDrink());
      (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
      d.setInteriorCapacity(Quantity.of(0.6, 'L'));
      return d as never;
    }
    if (path === '/obj/Casting') {
      const { default: Casting } = await import('../../../Casting');
      return makeStuff(() => new Casting()) as never;
    }
    throw new Error(`unexpected clone ${path}`);
  });

  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/obj/RecipeCatalogue',
  );
  await catalogue.warm();
  return { store };
}
