/**
 * ⭐ **The cooking roster, every line** (AC12) — fourteen recipes across
 * the whole grid, resolved through the real `CraftingApi.craft` path over
 * the SHIPPED rows, in a kitchen stocked from the trades that actually
 * supply one.
 *
 * The spine the suite exists to prove is the three-media root vegetable:
 * the SAME two roots come out **boiled** (373 K, in water), **roasted**
 * (430 K, dry) and **pan-fried** (440 K, in fat) as three different dishes
 * in three different vessels — and nothing in the engine knows the words
 * "boil", "roast" or "fry". Water stops at its boiling point and a fat
 * stops at its smoke point; that is the whole method vocabulary.
 *
 * And the margin: `crisp-fried-cutlet` wants 470 K, which tallow (478)
 * carries and olive oil (463) does not.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installRecordTestDb } from '@saxonberg/server/mud/lib/persistence/__tests__/record-test-db';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { CraftingApi, type CraftRequest } from '@saxonberg/server/mud/api/crafting';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ModuleApi } from '@saxonberg/server/mud/api/module';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { StoredDocument } from '@saxonberg/server/mud/lib/document/StoredDocument';
import {
  ContainerMixin,
  type Container,
} from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { MakerMixin } from '@saxonberg/server/mud/lib/craft/Maker';
import Material from '@saxonberg/server/mud/lib/material/Material';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import RecipeCatalogue from '@saxonberg/server/mud/platform/idea/RecipeCatalogue';
import Oven from '@saxonberg/server/mud/platform/thing/Oven';
import CookPot from '../thing/CookPot';

const ROOT = '/trade/cooking';
const CONTENT = fileURLToPath(new URL('../../../', import.meta.url)); // packages/content/
const COOK_SRC = fileURLToPath(new URL('../', import.meta.url));

/** Every shipped recipe in the trade — the roster this suite must cook. */
const ROSTER = [
  // wet — the medium caps at water's boiling point
  'boiled-roots',
  'root-mash',
  'hearty-stew',
  'stewed-orchard-fruit',
  'clear-broth',
  'simple-syrup',
  // dry — the fire reaches the food, so browning is possible
  'toasted-ration',
  'roasted-roots',
  'hearth-roast',
  'fine-roast',
  // the fat chain: make a fat, then cook in it
  'render-tallow',
  'press-olive-oil',
  'pan-fried-roots',
  'crisp-fried-cutlet',
];

type Row = {
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

function yamlDir(pack: string, dir: string, prefix: string): Row[] {
  const abs = join(CONTENT, pack, 'content', dir);
  if (!existsSync(abs)) return [];
  const out: Row[] = [];
  for (const f of readdirSync(abs).sort()) {
    if (!f.endsWith('.yaml')) continue;
    const raw = YAML.parse(readFileSync(join(abs, f), 'utf8')) as Row;
    out.push({ ...raw, path: `${prefix}/${f.replace(/\.yaml$/, '')}` });
  }
  return out;
}

function recipeDocs(): StoredDocument[] {
  const abs = join(CONTENT, 'trade-cooking', 'content', 'recipes');
  return readdirSync(abs)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const data = YAML.parse(readFileSync(join(abs, f), 'utf8')) as Record<
        string,
        unknown
      >;
      return {
        getPath: () => `/trade-cooking/recipes/${f.replace(/\.yaml$/, '')}`,
        getData: () => data,
        getKind: () => 'recipe',
      } as unknown as StoredDocument;
    });
}

function contentRows(): Row[] {
  const rows: Row[] = [
    ...yamlDir('platform', 'platform/idea/persistence', '/platform/idea/persistence'),
    ...yamlDir(
      'platform',
      'platform/idea/persistence/QuantityMarshaller',
      '/platform/idea/persistence/QuantityMarshaller',
    ),
    ...yamlDir('platform', 'platform/idea/material', '/platform/idea/material'),
    ...yamlDir('base-library', 'stuff/idea/material/bulk', '/stuff/idea/material/bulk'),
    ...yamlDir('base-library', 'stuff/idea/material/food', '/stuff/idea/material/food'),
    ...yamlDir('base-library', 'stuff/idea/material/ceramic', '/stuff/idea/material/ceramic'),
    ...yamlDir('base-library', 'stuff/idea/material/glass', '/stuff/idea/material/glass'),
    ...yamlDir('base-library', 'stuff/idea/material/element', '/stuff/idea/material/element'),
    ...yamlDir('base-library', 'stuff/idea/material/organic', '/stuff/idea/material/organic'),
    ...yamlDir('base-library', 'stuff/idea/material/wood', '/stuff/idea/material/wood'),
    ...yamlDir('generic-objects', 'stuff/thing/items', '/stuff/thing/items'),
    ...yamlDir('generic-objects', 'stuff/thing/cutlery', '/stuff/thing/cutlery'),
    ...yamlDir('generic-objects', 'stuff/thing/fixture', '/stuff/thing/fixture'),
    ...yamlDir('trade-farming', 'trade/farming/idea/material', '/trade/farming/idea/material'),
    ...yamlDir('trade-farming', 'trade/farming/thing', '/trade/farming/thing'),
    ...yamlDir('trade-cooking', 'trade/cooking/idea/material', `${ROOT}/idea/material`),
    ...yamlDir('trade-cooking', 'trade/cooking/thing', `${ROOT}/thing`),
  ];
  // Placed by hand here, never by the sweep.
  for (const r of rows) {
    if (r.data && 'container' in r.data) delete r.data.container;
  }
  return rows;
}

class TestKitchen extends ContainerMixin(Idea) {
  static _mixinName = 'TestKitchenRoster';
}
class TestCook extends MakerMixin(
  ThermalMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestCookRoster';
}

let kitchen: Stuff & Container;
let cook: TestCook;
const now = 1000;

const slot = (o: Stuff) => BulkableApi.slotFor(o, undefined)!;
const litres = (o: Stuff) => slot(o).getAmount().rawValue();

async function craftAs(principal: Stuff, req: CraftRequest) {
  return ExecutionContextApi.runRoot(null, 'roster.test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>;
}

async function stock(path: string): Promise<Stuff> {
  const s = await StuffApi.clone<Stuff>(path);
  if (MixinApi.isContainable(s) && s.getContainer() !== kitchen) {
    ContainmentApi.move(s as never, kitchen as never);
  }
  return s;
}

async function fill(
  path: string,
  materialPath: string,
  amountL: number,
): Promise<Stuff> {
  const v = await stock(path);
  const m = await StuffApi.singleton<Material>(materialPath);
  slot(v).setMaterial(m);
  slot(v).setAmount(Quantity.of(amountL, 'L'));
  return v;
}

/** A hearth that can reach any heat the roster asks for. */
function hearth(): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(900);
    o.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    o._setLit(true);
    return o;
  });
}

beforeAll(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  ModuleApi.registerPackSource(COOK_SRC, ROOT);
  installRecordTestDb().seed(Collections.Content, contentRows());
  vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
    kind === 'recipe' ? recipeDocs() : [],
  );

  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => now);
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(
      () => new WorldClockRegistry(),
      TemplatePaths.worldClockRegistry,
    );
  }
  await makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  ).warm();
  // What the MaterialCatalogue warm does live: every material row resident.
  for (const r of contentRows().filter((r) => r.path.includes('/idea/material/'))) {
    await StuffApi.singleton(r.path);
  }

  kitchen = makeStuff(() => new TestKitchen()) as unknown as Stuff & Container;
  cook = makeStuff(() => new TestCook());
  ContainmentApi.move(cook as never, kitchen as never);
  ContainmentApi.move(hearth() as never, kitchen as never);
}, 120_000);

afterAll(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** Stock a kitchen able to cook the whole roster, from the shipped rows. */
async function stockKitchen(): Promise<void> {
  await stock(`${ROOT}/thing/cook-pot`);
  await stock(`${ROOT}/thing/kitchen-sieve`);
  await stock(`${ROOT}/thing/fruit-press`);
  await stock('/stuff/thing/fixture/water-butt'); // the wet medium
  // Stock: roots, meat, rations, orchard fruit, olives.
  for (let i = 0; i < 12; i++) await stock('/stuff/thing/items/root-vegetables');
  for (let i = 0; i < 8; i++) await stock('/stuff/thing/items/stew-meat');
  await stock('/stuff/thing/items/prime-cut');
  await stock('/stuff/thing/items/ration-stock');
  for (let i = 0; i < 3; i++) await stock('/trade/farming/thing/cherry');
  for (let i = 0; i < 4; i++) await stock('/trade/farming/thing/olive');
  await stock(`${ROOT}/thing/sugar-sack`);
  // Crockery: one of each kind the roster's output rows name, plus the
  // vessels the fat chain fills.
  for (let i = 0; i < 4; i++) await stock('/stuff/thing/items/bowl');
  for (let i = 0; i < 3; i++) await stock('/stuff/thing/items/plated-dish');
  for (let i = 0; i < 3; i++) await stock('/stuff/thing/items/platter');
  await stock(`${ROOT}/thing/tallow-crock`);
  await stock(`${ROOT}/thing/oil-bottle`);
  await stock(`${ROOT}/thing/syrup-bottle`);
}

describe('trade-cooking — the class', () => {
  it('⭐ CookPot is a CraftVessel: a pot is a member of the dish pool', () => {
    const p = makeStuff(() => new CookPot());
    expect(MixinApi.isBulkable(p)).toBe(true); // it holds the stew
    expect(MixinApi.isContainer(p)).toBe(true); // …and what you dropped in
    expect(MixinApi.isThermal(p)).toBe(true); // …and has a temperature
    expect(MixinApi.isCrafted(p)).toBe(true);
    expect(MixinApi.isTool(p)).toBe(true);
    expect(MixinApi.isDurable(p)).toBe(true);
    expect(MixinApi.isBuildVessel(p)).toBe(true);
    expect(p.getCapabilities()).toEqual(['pot']);
    expect(ModuleApi.lookup(CookPot)).toBe(`${ROOT}/thing/CookPot`);
  });
});

describe('trade-cooking — the roster resolves (AC12)', () => {
  it('the catalogue knows every shipped recipe', () => {
    const cat = StuffApi.findByTemplatePath<RecipeCatalogue>(
      '/platform/idea/RecipeCatalogue',
    )!;
    for (const id of ROSTER) expect(cat.knows(id), id).toBe(true);
    expect(ROSTER.length).toBe(14);
  });

  it('⭐ every line cooks — fourteen recipes, one kitchen, the real resolve', async () => {
    await stockKitchen();
    // The fat chain first: nothing can be fried until a fat exists.
    for (const id of ['render-tallow', 'press-olive-oil']) {
      const out = await craftAs(cook, { recipeRef: id, makerMode: 'self' });
      expect(out.ok, `${id}: ${JSON.stringify(out)}`).toBe(true);
      if (!out.ok) return;
      expect(litres(out.output), id).toBeGreaterThan(0);
    }
    for (const id of ROSTER) {
      if (id === 'render-tallow' || id === 'press-olive-oil') continue;
      const out = await craftAs(cook, { recipeRef: id, makerMode: 'self' });
      expect(out.ok, `${id}: ${JSON.stringify(out)}`).toBe(true);
      if (!out.ok) return;
      expect(litres(out.output), id).toBeGreaterThan(0);
    }
  }, 120_000);
});

describe('⭐ the three-media root spine', () => {
  beforeAll(async () => {
    // A kitchen of its own so the roster run above cannot have eaten it.
    kitchen = makeStuff(() => new TestKitchen()) as unknown as Stuff & Container;
    cook = makeStuff(() => new TestCook());
    ContainmentApi.move(cook as never, kitchen as never);
    ContainmentApi.move(hearth() as never, kitchen as never);
    await stock(`${ROOT}/thing/cook-pot`);
    await stock('/stuff/thing/fixture/water-butt');
    for (let i = 0; i < 6; i++) await stock('/stuff/thing/items/root-vegetables');
    for (let i = 0; i < 2; i++) await stock('/stuff/thing/items/bowl');
    for (let i = 0; i < 2; i++) await stock('/stuff/thing/items/platter');
    for (let i = 0; i < 2; i++) await stock('/stuff/thing/items/plated-dish');
    await fill(
      `${ROOT}/thing/tallow-crock`,
      `${ROOT}/idea/material/tallow`,
      0.5,
    );
  }, 60_000);

  it('the same two roots become three different dishes in three different vessels', async () => {
    const boiled = await craftAs(cook, {
      recipeRef: 'boiled-roots',
      makerMode: 'self',
    });
    const roasted = await craftAs(cook, {
      recipeRef: 'roasted-roots',
      makerMode: 'self',
    });
    const fried = await craftAs(cook, {
      recipeRef: 'pan-fried-roots',
      makerMode: 'self',
    });
    for (const [id, out] of [
      ['boiled', boiled],
      ['roasted', roasted],
      ['fried', fried],
    ] as const) {
      expect(out.ok, `${id}: ${JSON.stringify(out)}`).toBe(true);
    }
    if (!boiled.ok || !roasted.ok || !fried.ok) return;

    // ⭐ Three vessel KINDS, because the output rows name three different
    // dinnerware kinds — the method shows up on the table.
    const kindOf = (s: Stuff) =>
      MixinApi.isBulkable(s) ? s.getCategory() : '';
    expect(kindOf(boiled.output)).toBe('bowl');
    expect(kindOf(roasted.output)).toBe('platter');
    expect(kindOf(fried.output)).toBe('plate');

    // …and three different dishes, by the blend's own derived identity.
    const nameOf = (s: Stuff) => slot(s).getPayload()?.name ?? '';
    const names = new Set([
      nameOf(boiled.output),
      nameOf(roasted.output),
      nameOf(fried.output),
    ]);
    expect(names.size).toBe(3);
  }, 60_000);
});

describe('⚠ the smoke-point margin decides the dish', () => {
  beforeAll(async () => {
    kitchen = makeStuff(() => new TestKitchen()) as unknown as Stuff & Container;
    cook = makeStuff(() => new TestCook());
    ContainmentApi.move(cook as never, kitchen as never);
    ContainmentApi.move(hearth() as never, kitchen as never);
    await stock(`${ROOT}/thing/cook-pot`);
    for (let i = 0; i < 3; i++) await stock('/stuff/thing/items/stew-meat');
    for (let i = 0; i < 3; i++) await stock('/stuff/thing/items/plated-dish');
  }, 60_000);

  it('⭐ 470 K in OLIVE OIL declines — the fire is willing, the oil is not', async () => {
    await fill(
      `${ROOT}/thing/oil-bottle`,
      `${ROOT}/idea/material/olive-oil`,
      0.5,
    );
    const out = await craftAs(cook, {
      recipeRef: 'crisp-fried-cutlet',
      makerMode: 'self',
    });
    expect(out).toMatchObject({ ok: false, reason: 'insufficient-heat' });
  }, 60_000);

  it('…and the same cutlet in TALLOW is simply fried', async () => {
    await fill(
      `${ROOT}/thing/tallow-crock`,
      `${ROOT}/idea/material/tallow`,
      0.5,
    );
    const out = await craftAs(cook, {
      recipeRef: 'crisp-fried-cutlet',
      makerMode: 'self',
    });
    expect(out.ok, JSON.stringify(out)).toBe(true);
  }, 60_000);
});
