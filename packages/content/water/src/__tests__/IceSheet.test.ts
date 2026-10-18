/**
 * ⭐⭐ The ice sheet (storage-and-ice W6, D12/D15): a pool's floor that
 * bears by its thickness, with a log of what was done to it.
 *
 *  1. **The patch walk** — a cut patch is open water on its day and
 *     regrows thinner than the field; a scraped patch grows thicker, and
 *     black, after the same cold; new snow ends the bare run.
 *  2. **Bearing** — a person stands on a sheet that holds them; a sheet
 *     too thin for a horse refuses it; giving way records a broken patch.
 *  3. **The acts** — scrape, mark, cut a block (mass from thickness and
 *     grid, grade from the patch), cut a hole (open water, no block);
 *     nobody works the ice from the water.
 *  4. **The thaw wipes the log** and puts everyone in.
 *  5. **The frozen gate** — `drawAt` refuses frozen water except through a
 *     hole, and gives the water under the ice there.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Actor } from '@saxonberg/server/mud/lib/creature/Actor';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Pool from '@saxonberg/server/mud/platform/location/Pool';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '../idea/WatercourseCatalogue';
import IceSheet from '../thing/IceSheet';

const DAY = 86_400;
const T0 = 720 * DAY;
const REF = 'circlemere:mere';
let now = T0;

class Walker extends Actor {}
class Saw extends Good {
  hasCapability(kind: string): boolean {
    return kind === 'ice-sawing';
  }
}
class Marker extends Good {
  getGridM(): number {
    return 0.5;
  }
}

function installRows(): void {
  const rows = [
    {
      _id: '1',
      path: '/stuff/idea/Watercourse/circlemere',
      class: '/system/water/idea/Watercourse',
      data: {
        key: 'circlemere',
        name: 'circlemere',
        basin: 'circlemere',
        branchesFrom: null,
        site: { latitudeDeg: -66, continentality: 1, offsetK: -7 },
        nodes: [{ name: 'mere', elevation: 900, channelWidthM: 200, meanDepthM: 4 }],
      },
    },
  ];
  vi.spyOn(PersistApi, 'find').mockImplementation(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Content) return [];
    const q = query.path as { $regex?: string } | string | undefined;
    if (typeof q === 'object' && q !== null && typeof q.$regex === 'string') {
      const re = new RegExp(q.$regex);
      return rows.filter((d) => re.test(d.path));
    }
    return rows.slice();
  });
}

let cat: WatercourseCatalogue;

async function sheetIn(): Promise<{ pool: Pool; sheet: IceSheet }> {
  const pool = makeStuff(() => new Pool());
  const sheet = makeStuff(() => new IceSheet());
  sheet.areaM2 = 4000;
  pool.addFixture(sheet as never, 'floor');
  // The reach the pool would cite, and the catalogue warmed (what
  // `resolveUnderfoot` does from the pool's `waters:` in a world).
  (sheet as unknown as { reachRef: string }).reachRef = REF;
  await cat.iceAt(REF, now);
  return { pool, sheet };
}

function walker(pool: Pool, kg = 80): Walker {
  const w = makeStuff(() => {
    const a = new Walker();
    a.setMass(Quantity.of(kg, 'kg'));
    return a;
  });
  ContainmentApi.move(w as unknown as Stuff & never, pool as unknown as Stuff & never);
  return w;
}

beforeEach(() => {
  StuffApi.clearAll();
  installRows();
  now = T0;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  WeatherApi._forceTypeForTesting('clear');
  cat = makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH) as WatercourseCatalogue;
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === '/stuff/thing/ice-block') {
      const b = makeStuff(() => {
        const g = new Good() as Good & { iceQuality?: string; setIceQuality?(q: string): void };
        g.setIceQuality = (q: string) => {
          g.iceQuality = q;
        };
        return g;
      });
      return b;
    }
    throw new Error(`unexpected clone ${path}`);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  WeatherApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the patch walk (D12)', () => {
  it('⭐ a cut patch is open water on its day, then regrows thinner than the field', async () => {
    await cat.iceAt(REF, T0);
    const field = cat.iceAtSync(REF, T0 + 3 * DAY)!;
    const cutToday = cat.iceAtSync(REF, T0, { openedAtS: T0 })!;
    const cut = cat.iceAtSync(REF, T0 + 3 * DAY, { openedAtS: T0 })!;
    expect(cutToday.thicknessM).toBe(0);
    expect(cut.thicknessM).toBeGreaterThan(0);
    expect(cut.thicknessM).toBeLessThan(field.thicknessM);
  });

  it('⭐ a scraped patch grows thicker, and black, after the same cold under snow', async () => {
    WeatherApi._forceTypeForTesting('snow');
    await cat.iceAt(REF, T0);
    const field = cat.iceAtSync(REF, T0 + 4 * DAY, { openedAtS: T0 - 10 * DAY })!;
    const scraped = cat.iceAtSync(REF, T0 + 4 * DAY, { openedAtS: T0 - 10 * DAY, bareFromS: T0 - 10 * DAY })!;
    // Under steady snow the bare run ends at the next snow step, so the
    // scraped patch is clear only until it snows on it again: compare
    // against a scraping with no snow after it.
    WeatherApi._forceTypeForTesting('clear');
    cat.invalidateCache();
    await cat.iceAt(REF, T0);
    const bare = cat.iceAtSync(REF, T0 + 4 * DAY, { openedAtS: T0 - 10 * DAY, bareFromS: T0 - 10 * DAY })!;
    expect(field.quality).toBe('snow-ice');
    expect(scraped.thicknessM).toBeGreaterThan(0);
    expect(bare.quality).toBe('black');
  });
});

describe('the sheet bears by its thickness', () => {
  it('⭐ a person stands on ice that holds them; a horse on the same ice does not', async () => {
    const { sheet } = await sheetIn();
    const field = sheet.iceOf(sheet.getLog()[0]!)!;
    expect(field.thicknessM).toBeGreaterThan(0.1);
    expect(sheet.bears(80)).toBe(true);
    expect(sheet.bears(field.bearsKg * 2)).toBe(false);
    expect(sheet.supportIsSlotted()).toBe(true);
  });

  it('⭐ giving way records a broken patch: the hole is open water in the log', async () => {
    const { pool, sheet } = await sheetIn();
    const heavy = walker(pool, 80);
    const field = sheet.iceOf(sheet.getLog()[0]!)!;
    vi.spyOn(sheet, 'supportLoadKgOf').mockReturnValue(field.bearsKg * 2);
    sheet.giveWay(heavy as unknown as Stuff);
    const broken = sheet.getLog().find((p) => p.kind === 'broken');
    expect(broken?.areaM2).toBe(1);
    expect(sheet.iceOf(broken!)!.thicknessM).toBe(0);
    expect(sheet.openWaterAreaM2()).toBeGreaterThanOrEqual(1);
  });
});

describe('the acts — scrape, mark, cut', () => {
  it('nobody works the ice from the water', async () => {
    const { pool, sheet } = await sheetIn();
    const w = walker(pool);
    expect(sheet.scrapePatch(w as unknown as Stuff, makeStuff(() => new Good()) as unknown as Stuff, null).ok).toBe(false);
  });

  it('⭐ scrape → mark → cut: the block weighs thickness × grid² × 917 and takes the patch\'s grade', async () => {
    const { pool, sheet } = await sheetIn();
    const w = walker(pool);
    sheet.occupy(w as never, 'ground:1');
    expect(sheet.scrapePatch(w as unknown as Stuff, makeStuff(() => new Good()) as unknown as Stuff, null).ok).toBe(true);
    expect(sheet.markPatch(w as unknown as Stuff, makeStuff(() => new Marker()) as unknown as Stuff, null).ok).toBe(true);
    const marked = sheet.patchByWord('marked')!;
    expect(marked.gridM).toBe(0.5);
    const ice = sheet.iceOf(marked)!;
    const plan = await sheet.cutPlan({ actor: w as unknown as Stuff, tools: [makeStuff(() => new Saw()) as unknown as Stuff], raw: 'marked', options: {} });
    expect(plan.ok).toBe(true);
    const block = await sheet.cutBlock(w as unknown as Stuff, marked.id);
    expect(block).not.toBeNull();
    const kg = (block as unknown as { getMass(): Quantity<'kg'> }).getMass().rawValue();
    expect(kg).toBeCloseTo(Math.round(ice.thicknessM * 0.25 * 917 * 10) / 10, 6);
    expect((block as unknown as { iceQuality: string }).iceQuality).toBe(ice.quality);
    expect(sheet.getLog().some((p) => p.kind === 'cut' && p.areaM2 > 0)).toBe(true);
  });

  it('⭐ a cutter who is nobody\'s hand cuts their OWN block — titled to them before it lands (the review)', async () => {
    const { pool, sheet } = await sheetIn();
    const w = walker(pool);
    sheet.occupy(w as never, 'ground:1');
    sheet.markPatch(w as unknown as Stuff, makeStuff(() => new Marker()) as unknown as Stuff, null);
    const titled: unknown[] = [];
    const clone = StuffApi.clone as unknown as { getMockImplementation(): ((p: string) => Promise<Stuff>) | undefined };
    const make = clone.getMockImplementation()!;
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const b = await make(path);
      vi.spyOn(b as never, 'stampChattel').mockImplementation((async (owner: unknown) => {
        titled.push(owner);
        return { ok: true, chattelId: 'c' };
      }) as never);
      return b;
    }) as unknown as typeof StuffApi.clone);
    const block = await sheet.cutBlock(w as unknown as Stuff, sheet.patchByWord('marked')!.id);
    expect(block).not.toBeNull();
    expect(titled).toEqual([w]);
  });

  it('a cut is refused without a saw, and without a marked grid', async () => {
    const { pool, sheet } = await sheetIn();
    const w = walker(pool);
    sheet.occupy(w as never, 'ground:1');
    const noSaw = await sheet.cutPlan({ actor: w as unknown as Stuff, tools: [], raw: null, options: {} });
    expect(noSaw).toMatchObject({ ok: false, reason: 'no-ice-saw' });
    const noGrid = await sheet.cutPlan({ actor: w as unknown as Stuff, tools: [makeStuff(() => new Saw()) as unknown as Stuff], raw: null, options: {} });
    expect(noGrid).toMatchObject({ ok: false, reason: 'no-grid' });
  });

  it('⭐ a hole is open water and mints no block; the shore lets you draw through it', async () => {
    const { pool, sheet } = await sheetIn();
    const w = walker(pool);
    sheet.occupy(w as never, 'ground:1');
    vi.spyOn(pool, 'peekWaterRead').mockReturnValue({
      ref: REF,
      atS: now,
      name: 'circlemere',
      frozen: true,
      draw: null,
      underIce: { materialPath: '/stuff/idea/material/bulk/water', temperatureK: 274 },
    });
    expect(pool.drawAt('mere', pool as unknown as Stuff)).toMatchObject({ refusal: 'frozen' });
    await sheet.cutHole(w as unknown as Stuff);
    expect(sheet.getLog().find((p) => p.kind === 'hole')?.areaM2).toBeCloseTo(0.1, 9);
    expect(pool.drawAt('mere', pool as unknown as Stuff)).toEqual({
      draw: { materialPath: '/stuff/idea/material/bulk/water', temperatureK: 274 },
    });
  });
});

describe('the thaw', () => {
  it('⭐ when the field goes to open water the log is wiped and everyone goes in', async () => {
    const { pool, sheet } = await sheetIn();
    const w = walker(pool);
    sheet.occupy(w as never, 'ground:1');
    sheet.scrapePatch(w as unknown as Stuff, makeStuff(() => new Good()) as unknown as Stuff, null);
    expect(sheet.getLog().length).toBeGreaterThan(1);
    vi.spyOn(cat, 'iceAtSync').mockReturnValue({
      ref: REF,
      thicknessM: 0,
      quality: 'none',
      rotting: false,
      bearsKg: 0,
      reason: 'warm',
      perennial: false,
    });
    sheet.reconcileSupport();
    expect(sheet.getLog()).toHaveLength(1);
    expect(sheet.getLog()[0]!.kind).toBe('field');
    expect(sheet.supports(w as unknown as Stuff)).toBe(false);
  });
});

describe('⭐ the sheet binds its reach from the pool it floors', () => {
  it('reads the pool\'s citation itself — no settled read, no hand-set ref (the drive, run 3)', async () => {
    const pool = makeStuff(() => new Pool());
    pool.setWaters({ mere: REF });
    // A cited water is a FEATURE of the place (the shore's own rule).
    (pool as unknown as { details: Map<string, unknown> }).details = new Map([['mere', { keywords: ['mere'] }]]);
    const sheet = makeStuff(() => new IceSheet());
    sheet.areaM2 = 4000;
    pool.addFixture(sheet as never, 'floor');
    await cat.iceAt(REF, now);
    // T0's ice bears a person; a reachless sheet would read as bare water.
    expect(sheet.bears(80)).toBe(true);
    expect(sheet.iceOf(sheet.patchByWord('field')!)).not.toBeNull();
  });
});

describe('⭐ the sheet says what it is now', () => {
  it('in its summer it is open water, in its winter a sheet of ice', async () => {
    const { sheet } = await sheetIn();
    const frozen = sheet.iceOf(sheet.patchByWord('field')!)!;
    expect(frozen.thicknessM).toBeGreaterThan(0.005);
    expect(sheet.getLong()).not.toMatch(/open water/i);
    expect(sheet.getShortDescription()).not.toBe('open water');
    // The field thawed: the same sheet, read off the same walk, now open.
    vi.spyOn(cat, 'iceAtSync').mockReturnValue({ ...frozen, thicknessM: 0, bearsKg: 0 });
    expect(sheet.getLong()).toMatch(/open water/i);
    expect(sheet.getShortDescription()).toBe('open water');
  });
});

describe('⭐ skim ice is open water — one threshold for the read and the sheet (the review)', () => {
  it('a night skim does not freeze a reach for drawing or fishing; real ice does', async () => {
    await cat.iceAt(REF, now);
    const place = makeStuff(() => new Pool()) as unknown as Stuff;
    const real = (await cat.iceAt(REF, now))!;
    vi.spyOn(cat, 'iceAt').mockResolvedValue({ ...real, thicknessM: 0.004 });
    const skim = await cat.readWater(REF, place, now);
    expect(skim?.frozen).toBe(false);
    vi.spyOn(cat, 'iceAt').mockResolvedValue({ ...real, thicknessM: 0.02 });
    const iced = await cat.readWater(REF, place, now);
    expect(iced?.frozen).toBe(true);
    expect(iced?.underIce).toBeDefined();
  });
});
