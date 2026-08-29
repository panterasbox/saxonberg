/**
 * The libations annexes (phase 3b + 3c): the five stub trades are DATA
 * packs, and the two corpo-owned yards (Veshko's, Hollis's) are rows the
 * distilling trade ships — a corpo pack supplies capital + the mark, never
 * products — so their proof is a row-shape test over the shipped YAML — every floor product is drawable (a census key, a
 * target, a home `container:` that is a Stock the same pack ships), over a
 * material some pack ships whose tags carry the recipe category; every
 * hand names the distilling counter as its host shelf and asks a price for
 * every key homed in its stock; every serving recipe parses through the
 * kernel's own reader; and the Veshko zone's `stocks:` hydrates into the
 * field `ResidencyLogic` reads. The mechanism (sweep → consign → buy) is
 * proven once, in the distilling pack's own suite; this is the annexes'
 * half — that their rows fit it.
 *
 * Lives under `mud/world/` beside the other content-shaped tests (it
 * names no `/world/` path since the yards moved into the trade).
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { Recipe } from '../../lib/craft/Recipe';
import { MixinApi } from '../../api/mixin';
import { makeStuff, stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import Crate from '../../platform/thing/Crate';
import CartesianZone from '../../platform/idea/location/CartesianZone';

const PACKS = fileURLToPath(new URL('../../../../../content/', import.meta.url));
const ANNEXES = ['trade-brewing', 'trade-winemaking', 'trade-bottling', 'trade-produce', 'trade-hearth-cooking'];
/** The two corpo-owned yards: distilling's rows, owned via `parentOrganization`. */
const VESHKO = '/trade/distilling/location/veshko-yard';
const HOLLIS = '/trade/distilling';
const HOLLIS_ROWS = ['agent/hollis-hand', 'idea/hollis-outfit', 'location/hollis-floor', 'thing/hollis-stock', 'thing/old-hollis', 'thing/hollis-cane'].map((r) => `${HOLLIS}/${r}`);
const VESHKO_STOCK = `${VESHKO}/thing/stock`;
const HOLLIS_STOCK = `${HOLLIS}/thing/hollis-stock`;
/**
 * ⭐ A yard's rows are the ones HOMED there, not the ones pathed there.
 * The unbranded rail lives at the trade's own paths — it carries no mark,
 * so nothing about it should shout Veshko — while its `container:` says
 * who makes it. That gap is deliberate: the corpo is in your glass even
 * when there is no mark on the bottle.
 */
const isYardRow = (path: string, data?: Record<string, unknown>): boolean =>
  path.startsWith(`${VESHKO}/`) ||
  HOLLIS_ROWS.includes(path) ||
  data?.container === VESHKO_STOCK ||
  data?.container === HOLLIS_STOCK;
const YARDS = ['veshko', 'hollis'];
const COUNTER = '/trade/distilling/thing/counter';

interface Row {
  pack: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.yaml')) out.push(full);
  }
  return out;
}

/** Every template row every shipped pack carries (recipes excluded). */
function allRows(): Row[] {
  const rows: Row[] = [];
  for (const pack of readdirSync(PACKS)) {
    const root = join(PACKS, pack, 'content');
    if (!existsSync(join(PACKS, pack, 'pack.yaml')) || !existsSync(root)) continue;
    for (const file of walk(root)) {
      const rel = relative(root, file);
      if (rel.startsWith('recipes/') || rel.startsWith('settings/') || rel.startsWith('archetypes/')) continue;
      const raw = parse(readFileSync(file, 'utf8')) as { class?: string; data?: Record<string, unknown> } | null;
      if (!raw || typeof raw.class !== 'string') continue;
      rows.push({ pack, path: '/' + rel.replace(/\.yaml$/, ''), class: raw.class, data: raw.data ?? {} });
    }
  }
  return rows;
}

const rows = allRows();
const byPath = new Map(rows.map((r) => [r.path, r]));
const annexRows = rows.filter((r) => ANNEXES.includes(r.pack) || isYardRow(r.path, r.data));
const floorRows = annexRows.filter((r) => typeof r.data.censusKey === 'string');

describe('libations annexes — the floor rows fit the faucet', () => {
  it('the five stubs and the two corpo yards each ship floor product; no corpo pack ships any', () => {
    for (const pack of ANNEXES) {
      expect(floorRows.filter((r) => r.pack === pack).length, pack).toBeGreaterThan(0);
    }
    // ⭐ A producer is counted by the Stock its rows spawn INTO, not by
    // their path. The unbranded rail lives at the TRADE's paths — it
    // carries no mark, so nothing about it should shout Veshko — while
    // its `container:` says who makes it. That gap is the design: the
    // corpo is in your glass even when there is no mark on the bottle.
    const homedIn = (stockPath: string) =>
      floorRows.filter((r) => r.data.container === stockPath).length;
    expect(homedIn(VESHKO_STOCK), 'veshko').toBe(7);
    expect(floorRows.filter((r) => HOLLIS_ROWS.includes(r.path)).length, 'hollis').toBe(2);
    // A corpo pack is capital + the mark: no product, no locality.
    for (const r of rows.filter((r) => r.pack.startsWith('corpo-'))) {
      expect(r.path.startsWith('/corpo/') || r.path.startsWith('/stuff/idea/corpo/'), r.path).toBe(true);
    }
    // bottling ships 9: seven mixers + the ice bag + the can of cola (the
    // 330 mL can is its own price point, not a smaller bottle).
    // hearth-cooking: three sacks + the syrup bottle (the bar's syrup line is bought, not cooked)
    expect(floorRows.length).toBe(2 + 5 + 9 + 8 + 4 + 7 + 2);
  });

  it('every floor row has a target and a home container that is a Stock the SAME pack ships', () => {
    for (const r of floorRows) {
      expect(typeof r.data.regionTarget, r.path).toBe('number');
      const home = byPath.get(r.data.container as string);
      expect(home, `${r.path} container ${String(r.data.container)}`).toBeDefined();
      expect(home!.class, r.path).toBe('/platform/thing/Stock');
      expect(home!.pack, r.path).toBe(r.pack);
      expect(home!.data.stockLines, `${home!.path} must not reset`).toEqual([]);
    }
  });

  it('every bottle row holds a shipped material whose tags carry a recipe category; every crate populates a shipped item', () => {
    for (const r of floorRows) {
      if (r.class === '/platform/thing/Crate') {
        const items = r.data.populates as string[];
        expect(items.length, r.path).toBeGreaterThan(0);
        const item = byPath.get(items[0]!);
        expect(item, `${r.path} populates ${items[0]}`).toBeDefined();
        const mat = byPath.get(item!.data._materialPath as string);
        expect(mat, `${item!.path} material`).toBeDefined();
        expect(mat!.data.tags, mat!.path).toContain(item!.data.primaryKeyword);
        continue;
      }
      const mat = byPath.get(r.data.interiorMaterial as string);
      expect(mat, `${r.path} interiorMaterial`).toBeDefined();
      expect(String(mat!.class).startsWith('/platform/idea/material/'), mat!.path).toBe(true);
      expect((mat!.data.tags as string[]).length, mat!.path).toBeGreaterThan(1);
      expect(Number(r.data.interiorAmount), r.path).toBeLessThanOrEqual(Number(r.data.interiorCapacity));
    }
  });

  it('the private-label fact: Hollis bottles hold the material Veshko\'s unbranded bottles hold', () => {
    const old = byPath.get(`${HOLLIS}/thing/old-hollis`)!;
    const cane = byPath.get(`${HOLLIS}/thing/hollis-cane`)!;
    // The same liquid, three positions: unbranded rail, Volk, Old Hollis.
    const rail = (n: string) => byPath.get(`/trade/distilling/thing/${n}`)!;
    expect(old.data.interiorMaterial).toBe(rail('whiskey').data.interiorMaterial);
    expect(cane.data.interiorMaterial).toBe(rail('rum-dark').data.interiorMaterial);
    expect(rail('whiskey').data._brandKey).toBeUndefined();
    expect(rail('whiskey').data.container).toBe(`${VESHKO}/thing/stock`);
    expect(old.data._brandKey).toBe('old-hollis');
    expect(byPath.get(`${VESHKO}/thing/volk`)!.data._brandKey).toBe('volk');
    // Every brand key an annex names is a Brand row some pack ships.
    const brands = new Set(rows.filter((r) => r.class === '/platform/idea/corpo/Brand').map((r) => r.data.key));
    for (const r of floorRows.filter((r) => typeof r.data._brandKey === 'string')) {
      expect(brands.has(r.data._brandKey), r.path).toBe(true);
    }
  });

  it('the mixers and the sparkling wine are carbonated; ice is frozen water; produce tags = the category', () => {
    for (const key of ['soda-water', 'tonic', 'ginger-beer', 'cola', 'grapefruit-soda']) {
      expect(byPath.get(`/trade/bottling/idea/material/${key}`)!.data.tags).toContain('carbonated');
    }
    expect(byPath.get('/trade/winemaking/idea/material/sparkling')!.data.tags).toContain('carbonated');
    const ice = byPath.get('/trade/bottling/idea/material/ice')!.data;
    expect(ice.meltingPoint).toBe(273);
    expect(ice.latentHeatOfFusion).toBe(334000);
    expect(ice.tags).toContain('ice');
    for (const key of ['lime', 'lemon', 'orange', 'grapefruit', 'mint', 'cherry', 'olive', 'cranberry']) {
      expect(byPath.get(`/trade/produce/idea/material/${key}`)!.data.tags, key).toContain(key);
    }
  });
});

describe('libations annexes — the hands name the host', () => {
  const hands = annexRows.filter((r) =>
    Array.isArray(r.data.behaviors) &&
    (r.data.behaviors as Array<{ brain: string }>).some((b) => b.brain === '/lib/behavior/consigns'),
  );

  it('one consigning hand per annex; each names the distilling counter and asks for every key homed in its stock', () => {
    expect(hands.length).toBe(ANNEXES.length + YARDS.length);
    for (const hand of hands) {
      const spec = (hand.data.behaviors as Array<{ brain: string; config: Record<string, unknown> }>).find(
        (b) => b.brain === '/lib/behavior/consigns',
      )!;
      expect(spec.config.shelf, hand.path).toBe(COUNTER);
      const stock = byPath.get(spec.config.stock as string);
      expect(stock?.pack, `${hand.path} stock`).toBe(hand.pack);
      const asks = spec.config.ask as Record<string, number>;
      for (const r of floorRows.filter((r) => r.data.container === spec.config.stock)) {
        expect(asks[r.data.censusKey as string], `${hand.path} asks ${r.path}`).toBeGreaterThan(0);
      }
      // The hand holds a purchasing position on the stock's business.
      const biz = byPath.get(stock!.data.businessPath as string)!;
      const positions = biz.data.positions as Array<{ key: string; purchases?: boolean }>;
      const slots = biz.data.rosterSlots as Array<{ positionKey: string; assignee: string }>;
      const slot = slots.find((s) => s.assignee === hand.path)!;
      expect(slot, `${biz.path} rosters ${hand.path}`).toBeDefined();
      expect(positions.find((p) => p.key === slot.positionKey)!.purchases).toBe(true);
    }
  });

  it('the corpo yards hang off their charts (the trade points UP at its owner); the stubs are independent', () => {
    expect(byPath.get(`${VESHKO}/idea/outfit`)!.data.parentOrganization).toBe('/corpo/veshko');
    expect(byPath.get(`${HOLLIS}/idea/hollis-outfit`)!.data.parentOrganization).toBe('/corpo/hollis');
    for (const r of annexRows.filter((r) => r.class === '/platform/idea/Business' && !isYardRow(r.path))) {
      expect(r.data.parentOrganization, r.path).toBeUndefined();
    }
  });
});

describe('libations annexes — the serving recipes and the zone', () => {
  it('every annex recipe parses through the kernel reader and outputs a bulk pour into a glass row', () => {
    const files = ANNEXES.flatMap((p) => {
      const dir = join(PACKS, p, 'content', 'recipes');
      return existsSync(dir) ? walk(dir) : [];
    }).filter((f) => !/(toasted-ration|root-mash|fine-roast|hearty-stew)\.yaml$/.test(f));
    expect(files.length).toBe(1 + 3 + 1 + 1);
    for (const f of files) {
      const r = Recipe.fromData(parse(readFileSync(f, 'utf8')) as Record<string, unknown>);
      expect(r.outputApplication, f).toBe('bulk');
      expect(r.outputTemplate.startsWith('/trade/hospitality/thing/') || r.outputTemplate === '/trade/hearth-cooking/thing/syrup-bottle', f).toBe(true);
    }
    const syrup = Recipe.fromData(parse(readFileSync(join(PACKS, 'trade-hearth-cooking/content/recipes/simple-syrup.yaml'), 'utf8')) as Record<string, unknown>);
    expect(syrup.requiresHeatK).toBe(340);
    expect(syrup.outputPortionL).toBe(0.5);
    expect(syrup.inputSlots[0]).toMatchObject({ kind: 'item', category: 'sugar', count: 1 });
    const mixer = Recipe.fromData(parse(readFileSync(join(PACKS, 'trade-bottling/content/recipes/soft-drink.yaml'), 'utf8')) as Record<string, unknown>);
    expect(mixer.ice).toBe('cubes');
  });

  it('a Crate is an open circulating container that populates', () => {
    const c = makeStuff(() => new Crate());
    stampTemplatePathForTest(c, '/obj/test/crate');
    expect(MixinApi.isCirculating(c)).toBe(true);
    expect(MixinApi.isContainer(c)).toBe(true);
    expect(MixinApi.isSealable(c)).toBe(false);
    expect(MixinApi.isChattel(c)).toBe(true);
  });

  it("the Veshko zone's stocks: reaches the field ResidencyLogic reads (lookupField), and favours with it", async () => {
    const zoneRow = byPath.get(VESHKO)!;
    expect(zoneRow.class).toBe('/platform/idea/location/CartesianZone');
    const z = makeStuff(() => new CartesianZone());
    stampTemplatePathForTest(z, VESHKO);
    z.setStocks(zoneRow.data.stocks as Record<string, number>);
    z.setFavours(zoneRow.data.favours as string[]);
    expect(await z.lookupField<Record<string, number>>('stocks')).toMatchObject({ 'spirit:volk': 24 });
    expect(await z.lookupField<string[]>('favours')).toEqual(['spirit']);
    // Every key the zone stocks is a floor row homed in the yard.
    for (const key of Object.keys(zoneRow.data.stocks as Record<string, number>)) {
      const row = floorRows.find((r) => r.data.censusKey === key);
      expect(row?.data.container, key).toBe(`${VESHKO}/thing/stock`);
    }
  });
});
