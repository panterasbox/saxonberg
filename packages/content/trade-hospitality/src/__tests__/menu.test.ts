/**
 * The hospitality pack's own suite (libations 3e): the venue is built
 * from the `hospitality` ARCHETYPE (`ArchetypeApi.materialize`), stocked
 * from the trades' own shipped rows (one floor bottle per spirit, kegs,
 * wine, the mixers, bagged ice, a crate of each fruit, the pantry sacks,
 * the glass rack), and every line of the menu is ordered through the
 * real resolve path (`CraftingApi.craft` as the maker) — the 21 recipes
 * here plus the pint (brewing), the three wines (winemaking) and the
 * mixer (bottling) = the slate's 24 lines; the four presses feed the
 * sours. Each order consumes real matter; a garnish is a thing IN the
 * glass; an iced drink carries ice; the technique is stamped from the
 * tool; the coupe pool bounds service and a washed glass serves again.
 *
 * The rows are the shipped YAML, read from disk into an in-memory
 * `content` store (the lounge fixtures' shape); the two pack classes
 * resolve through `ModuleApi.registerPackSource`. `container:` is
 * stripped from the stocked rows — here they are placed by hand, not by
 * the sweep.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installRecordTestDb } from '@saxonberg/server/mud/lib/persistence/__tests__/record-test-db';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { ArchetypeApi } from '@saxonberg/server/mud/api/archetype';
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
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { StoredDocument } from '@saxonberg/server/mud/lib/document/StoredDocument';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MakerMixin } from '@saxonberg/server/mud/lib/craft/Maker';
import Material from '@saxonberg/server/mud/lib/material/Material';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import RecipeCatalogue from '@saxonberg/server/mud/platform/idea/RecipeCatalogue';
import ArchetypeCatalogue from '@saxonberg/server/mud/platform/idea/ArchetypeCatalogue';
import CraftedDrink from '@saxonberg/server/mud/platform/thing/CraftedDrink';
import IceBin from '../thing/IceBin';
import Tap from '../thing/Tap';

const ROOT = '/trade/hospitality';
const CONTENT = fileURLToPath(new URL('../../../', import.meta.url)); // packages/content/
const HOSP_SRC = fileURLToPath(new URL('../', import.meta.url));
const DIST_SRC = join(CONTENT, 'trade-distilling', 'src');

/** The slate's 24 lines: 21 here, the pint, the three wines, the mixer. */
const MENU = [
  'martini', 'gin-tonic', 'negroni', 'tom-collins', 'gimlet', 'vodka-soda',
  'moscow-mule', 'cosmopolitan', 'screwdriver', 'old-fashioned', 'whiskey-sour',
  'manhattan', 'whiskey-ginger', 'daiquiri', 'mojito', 'dark-and-stormy',
  'cuba-libre', 'margarita', 'paloma', 'aperol-spritz', 'coffee',
  'pint', 'glass-of-red', 'glass-of-white', 'glass-of-sparkling', 'mixer',
];
const PRESSES = ['press-lime', 'press-lemon', 'press-orange', 'press-grapefruit'];

type Row = { path: string; class: string; hydratorClass?: string; data: Record<string, unknown> };

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

function docsOf(pack: string, dir: string): StoredDocument[] {
  const abs = join(CONTENT, pack, 'content', dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const data = YAML.parse(readFileSync(join(abs, f), 'utf8')) as Record<string, unknown>;
      const kind = dir === 'recipes' ? 'recipe' : 'archetype';
      return {
        getPath: () => `/${pack}/${dir}/${f.replace(/\.yaml$/, '')}`,
        getData: () => data,
        getKind: () => kind,
      } as unknown as StoredDocument;
    });
}

/** Every template row the venue and its stock clone from — the shipped YAML. */
function contentRows(): Row[] {
  const rows: Row[] = [
    ...yamlDir('platform', 'platform/idea/persistence', '/platform/idea/persistence'),
    ...yamlDir('platform', 'platform/idea/persistence/QuantityMarshaller', '/platform/idea/persistence/QuantityMarshaller'),
    ...yamlDir('platform', 'platform/idea/material', '/platform/idea/material'),
    ...yamlDir('platform', 'platform/location', '/platform/location'),
    ...yamlDir('base-library', 'stuff/idea/material/bulk', '/stuff/idea/material/bulk'),
    ...yamlDir('base-library', 'stuff/idea/material/glass', '/stuff/idea/material/glass'),
    ...yamlDir('base-library', 'stuff/idea/material/element', '/stuff/idea/material/element'),
    ...yamlDir('generic-objects', 'stuff/thing/fixture', '/stuff/thing/fixture'),
    ...yamlDir('trade-hospitality', 'trade/hospitality/thing', `${ROOT}/thing`),
    ...yamlDir('trade-hospitality', 'trade/hospitality/idea/material', `${ROOT}/idea/material`),
    ...yamlDir('trade-distilling', 'trade/distilling/idea/material', '/trade/distilling/idea/material'),
    ...yamlDir('trade-distilling', 'trade/distilling/thing', '/trade/distilling/thing'),
    ...yamlDir('trade-brewing', 'trade/brewing/idea/material', '/trade/brewing/idea/material'),
    ...yamlDir('trade-brewing', 'trade/brewing/thing', '/trade/brewing/thing'),
    ...yamlDir('trade-winemaking', 'trade/winemaking/idea/material', '/trade/winemaking/idea/material'),
    ...yamlDir('trade-winemaking', 'trade/winemaking/thing', '/trade/winemaking/thing'),
    ...yamlDir('trade-bottling', 'trade/bottling/idea/material', '/trade/bottling/idea/material'),
    ...yamlDir('trade-bottling', 'trade/bottling/thing', '/trade/bottling/thing'),
    ...yamlDir('trade-produce', 'trade/produce/idea/material', '/trade/produce/idea/material'),
    ...yamlDir('trade-produce', 'trade/produce/thing', '/trade/produce/thing'),
    ...yamlDir('trade-hearth-cooking', 'trade/hearth-cooking/idea/material', '/trade/hearth-cooking/idea/material'),
    ...yamlDir('trade-hearth-cooking', 'trade/hearth-cooking/thing', '/trade/hearth-cooking/thing'),
  ];
  // Placed by hand here, never by the sweep.
  for (const r of rows) {
    if (r.data && 'container' in r.data) delete r.data.container;
  }
  return rows;
}

class TestBartender extends MakerMixin(ContainerMixin(ContainableMixin(Idea))) {}

let venue: Stuff;
let maker: TestBartender;
const now = 1000;

const slot = (o: Stuff) => BulkableApi.slotFor(o, undefined)!;
const litres = (o: Stuff) => slot(o).getAmount().rawValue();

async function craftAs(principal: Stuff, req: CraftRequest) {
  return ExecutionContextApi.runRoot(null, 'menu.test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>;
}

async function stock(path: string): Promise<Stuff> {
  const s = await StuffApi.clone<Stuff>(path);
  if (MixinApi.isContainable(s) && s.getContainer() !== venue) {
    ContainmentApi.move(s as never, venue as never);
  }
  return s;
}

/** A house-made bottle filled by hand (the syrup — hearth-cooking's recipe wants a lit range). */
async function fill(path: string, materialPath: string, amountL: number): Promise<Stuff> {
  const b = await stock(path);
  const m = await StuffApi.singleton<Material>(materialPath);
  slot(b).setMaterial(m);
  slot(b).setAmount(Quantity.of(amountL, 'L'));
  return b;
}

beforeAll(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  ModuleApi.registerPackSource(HOSP_SRC, ROOT);
  ModuleApi.registerPackSource(DIST_SRC, '/trade/distilling');

  installRecordTestDb().seed(Collections.Content, contentRows());

  vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
    kind === 'archetype'
      ? docsOf('trade-hospitality', 'archetypes')
      : [
          ...docsOf('trade-hospitality', 'recipes'),
          ...docsOf('trade-brewing', 'recipes'),
          ...docsOf('trade-winemaking', 'recipes'),
          ...docsOf('trade-bottling', 'recipes'),
          ...docsOf('trade-hearth-cooking', 'recipes'),
        ],
  );

  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => now);
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  }
  await makeStuffAtPath(() => new ArchetypeCatalogue(), '/platform/idea/ArchetypeCatalogue').warm();
  await makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue').warm();

  // What MaterialLogic.boot does live: every material row resident, so a
  // Provision's `getMaterial()` (a sync read) resolves its singleton.
  for (const r of contentRows().filter((r) => r.path.includes('/idea/material/'))) {
    await StuffApi.singleton(r.path);
  }
  venue = await ArchetypeApi.materialize('hospitality');
  maker = makeStuff(() => new TestBartender());
  ContainmentApi.move(maker as never, venue as never);

  // The rail: one floor bottle per spirit material, the kegs, the wines,
  // the mixers, bagged ice, a crate of each fruit, the pantry, the syrup.
  for (const p of [
    'gin', 'vodka', 'whiskey', 'rum-light', 'rum-dark', 'tequila',
    'orange-liqueur', 'bitter-liqueur', 'aperitivo', 'bitters',
  ]) await stock(`/trade/distilling/thing/${p}`);
  await stock('/trade/distilling/thing/gin'); // the well's second gin
  await stock('/trade/brewing/thing/keg-ale');
  for (const p of ['red', 'white', 'sparkling', 'dry-vermouth', 'sweet-vermouth']) {
    await stock(`/trade/winemaking/thing/${p}`);
  }
  for (const p of ['soda-water', 'tonic', 'ginger-beer', 'cola', 'grapefruit-soda', 'cranberry-juice', 'orange-juice', 'ice-bag']) {
    await stock(`/trade/bottling/thing/${p}`);
  }
  for (const p of ['limes', 'lemons', 'oranges', 'grapefruits', 'mint', 'cherries', 'olives', 'cranberries']) {
    await stock(`/trade/produce/thing/crate-of-${p}`);
  }
  await stock('/trade/hearth-cooking/thing/sugar-sack');
  await stock('/trade/hearth-cooking/thing/coffee-sack');
  await fill('/trade/hearth-cooking/thing/syrup-bottle', '/trade/hearth-cooking/idea/material/simple-syrup', 0.5);
  await stock(`${ROOT}/thing/glass-rack`);
}, 120_000);

afterAll(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('trade-hospitality — the classes', () => {
  it('IceBin is an insulated, sealable ice holder; Tap is a Surfaced fixture that is a `tap` tool', () => {
    const bin = makeStuff(() => new IceBin());
    expect(MixinApi.isThermal(bin)).toBe(true);
    expect(MixinApi.isSealable(bin)).toBe(true);
    expect(MixinApi.isBulkable(bin)).toBe(true);
    expect(bin.getBarrier()).toBe('vacuum');
    const tap = makeStuff(() => new Tap());
    expect(MixinApi.isTool(tap)).toBe(true);
    expect(MixinApi.isSurfaced(tap)).toBe(true);
    expect(tap.getCapabilities()).toEqual(['tap']);
    expect(ModuleApi.lookup(IceBin)).toBe(`${ROOT}/thing/IceBin`);
    expect(ModuleApi.lookup(Tap)).toBe(`${ROOT}/thing/Tap`);
  });
});

describe('trade-hospitality — the venue from the archetype', () => {
  it('materialize stands every default up; the checklist REPORTS (the cold range is short of 340 K, nothing refuses)', () => {
    const rows = ArchetypeApi.checklist('hospitality', venue)!;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows.filter((r) => !('heatK' in r.needs))) {
      expect(r.satisfied, r.key).toBe(true);
    }
    // The tool rows the recipes DERIVE are on the effective floor too.
    const keys = ArchetypeApi.describe('hospitality')!.rows.map((r) => JSON.stringify(r.needs));
    for (const cap of ['shaker', 'mixing-glass', 'muddler', 'bar-spoon', 'juicer', 'tap']) {
      expect(keys, cap).toContain(JSON.stringify({ tool: cap }));
    }
  });

  it('the catalogue knows every menu line and every press', () => {
    const cat = StuffApi.findByTemplatePath<RecipeCatalogue>('/platform/idea/RecipeCatalogue')!;
    for (const id of [...MENU, ...PRESSES]) expect(cat.knows(id), id).toBe(true);
    expect(MENU.length).toBe(26);
  });
});

describe('trade-hospitality — the menu, every line', () => {
  const pressed: Record<string, Stuff> = {};

  it('the presses yield real juice into pool bottles that the sours then draw from', async () => {
    for (const id of PRESSES) {
      const out = await craftAs(maker, { recipeRef: id, makerMode: 'self' });
      expect(out.ok, `${id}: ${JSON.stringify(out)}`).toBe(true);
      const bottle = (out as { output: Stuff }).output;
      expect(litres(bottle)).toBeGreaterThan(0);
      pressed[id] = bottle;
    }
    // The lime sours want ~0.1 L between them, the lemon ones 0.06 L:
    // more presses TOP UP the day's bottle (one juice bottle, not one per lime).
    const limeBefore = litres(pressed['press-lime']!);
    for (let i = 0; i < 4; i++) {
      const out = await craftAs(maker, { recipeRef: 'press-lime', makerMode: 'self' });
      expect(out.ok, `press-lime ${i}: ${JSON.stringify(out)}`).toBe(true);
    }
    expect(litres(pressed['press-lime']!)).toBeCloseTo(limeBefore + 4 * 0.03, 6);
    const out = await craftAs(maker, { recipeRef: 'press-lemon', makerMode: 'self' });
    expect(out.ok).toBe(true);
    expect((out as { output: Stuff }).output).toBe(pressed['press-lemon']);
  });

  it('every one of the 24 lines is orderable and consumes real matter', async () => {
    const gin = (venue as unknown as { getContents(): Stuff[] })
      .getContents()
      .find((c) => c.getTemplatePath() === '/trade/distilling/thing/gin')!;
    const ginBefore = litres(gin);
    const served: Record<string, CraftedDrink> = {};
    for (const id of MENU) {
      const out = await craftAs(maker, { recipeRef: id, makerMode: 'self' });
      expect(out.ok, `${id}: ${JSON.stringify(out)}`).toBe(true);
      const drink = (out as { output: Stuff }).output as CraftedDrink;
      expect(drink).toBeInstanceOf(CraftedDrink);
      expect(litres(drink)).toBeGreaterThan(0);
      expect(drink.isSoiled()).toBe(true);
      served[id] = drink;
      // Move the served glass out of the pool's way (the patron takes it).
      ContainmentApi.move(drink as never, maker as never);
    }
    // Real matter: the gin bottle fell by the gin lines' draws.
    expect(litres(gin)).toBeLessThan(ginBefore - 0.2);

    // A garnish is a thing IN the glass.
    for (const id of ['martini', 'gin-tonic', 'negroni', 'manhattan', 'aperol-spritz']) {
      const g = served[id]!;
      expect(g.getContents().length, `${id} garnish`).toBeGreaterThan(0);
    }
    // Ice on the iced ones, none on the neat ones.
    for (const id of ['gin-tonic', 'moscow-mule', 'mojito', 'old-fashioned', 'mixer']) {
      expect(served[id]!.getIceKg(), `${id} ice`).toBeGreaterThan(0);
    }
    for (const id of ['martini', 'daiquiri', 'gimlet', 'coffee', 'glass-of-red']) {
      expect(served[id]!.getIceKg(), `${id} no ice`).toBe(0);
    }
    // The technique is the tool's.
    expect(served['martini']!.getTechnique()).toBe('stirred');
    expect(served['daiquiri']!.getTechnique()).toBe('shaken');
    expect(served['mojito']!.getTechnique()).toBe('muddled');
    expect(served['gin-tonic']!.getTechnique()).toBe('built');
    // Carbonation rides the payload; the glass is the recipe's.
    expect(slot(served['aperol-spritz']!).getPayload()?.tags).toContain('carbonated');
    expect(served['pint']!.getTemplatePath()).toBe(`${ROOT}/thing/pint`);
    expect(served['glass-of-sparkling']!.getTemplatePath()).toBe(`${ROOT}/thing/flute`);
    expect(served['moscow-mule']!.getTemplatePath()).toBe(`${ROOT}/thing/copper-mug`);
  });

  it('the coupe pool bounds service: the rack runs dry, a washed coupe serves again', async () => {
    let made = 0;
    let decline: unknown = null;
    for (let i = 0; i < 20; i++) {
      const out = await craftAs(maker, { recipeRef: 'martini', makerMode: 'self' });
      if (!out.ok) {
        decline = out;
        break;
      }
      made++;
      ContainmentApi.move((out as { output: Stuff }).output as never, maker as never);
    }
    expect(decline).toMatchObject({ ok: false, reason: 'no-glass', detail: `${ROOT}/thing/coupe` });
    // Twelve coupes racked, six already served above.
    expect(made).toBe(6);

    // Bus one, wash it at the basin, rack it: it serves again.
    const dirty = (maker.getContents() as Stuff[]).find(
      (c) => c.getTemplatePath() === `${ROOT}/thing/coupe`,
    )!;
    ContainmentApi.move(dirty as never, venue as never);
    expect(CraftingApi.washGlass(dirty)).toBe(true);
    expect((dirty as CraftedDrink).isClaimable()).toBe(true);
    const again = await craftAs(maker, { recipeRef: 'martini', makerMode: 'self' });
    expect(again.ok, JSON.stringify(again)).toBe(true);
    expect((again as { output: Stuff }).output).toBe(dirty);
  });
});
