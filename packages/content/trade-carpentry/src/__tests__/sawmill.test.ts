/**
 * The carpentry trade's instrument and its rows.
 *
 *  1. ⭐⭐ **The sawmill's rate is the river's.** One class, two rungs: the
 *     pit saw cuts at its authored rate whatever the weather, the water
 *     sawmill at the power reaching the blade — so it is SLOWER at low
 *     flow, and with no race beside it it does not cut at all (it never
 *     falls back to hand speed).
 *  2. the yield arithmetic: a length off a bole is so many boards, and
 *     two in three of that when it is quartered;
 *  3. the rows the arithmetic and the verbs lean on, held to the code.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import Sawmill from '../thing/Sawmill';
import Blank from '../thing/Blank';
import { boardsFrom, BOARD_KG, QUARTER_YIELD } from '../idea/cmd/carpentry/SawController';
import Timber from '@saxonberg/server/mud/platform/thing/Timber';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const here = dirname(fileURLToPath(import.meta.url));
const PACK = join(here, '..', '..');
const ROWS = join(PACK, 'content', 'trade', 'carpentry', 'thing');
const RECIPES = join(PACK, 'content', 'recipes');

interface Row {
  class?: string;
  data?: Record<string, unknown>;
}
interface RecipeRow {
  recipeId: string;
  outputTemplate: string;
  discipline: string;
  toolCapabilities?: string[];
  requiresHeatK?: number;
  inputSlots: Array<{ slot: string; category: string; count?: number; kind?: string }>;
}

const row = (name: string): Row =>
  YAML.parse(readFileSync(join(ROWS, `${name}.yaml`), 'utf8')) as Row;
const recipes = (): RecipeRow[] =>
  readdirSync(RECIPES)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => YAML.parse(readFileSync(join(RECIPES, f), 'utf8')) as RecipeRow);

/** A room sibling that answers the power shape — never a ControlStructure. */
class FakeRace extends Good {
  generationW(flowM3S: number): number {
    return 1000 * 9.81 * 6 * flowM3S * 0.85;
  }
  getReachRef(): string {
    return 'delight:flats';
  }
}

function fromRow(name: string): Sawmill {
  const d = row(name).data!;
  const s = makeStuff(() => new Sawmill());
  s.setCapabilities(d.capabilities as string[]);
  s.throughputKgPerHour = Number(d.throughputKgPerHour);
  s.kgPerHourPerKw = Number(d.kgPerHourPerKw);
  s.maxThroughputKgPerHour = Number(d.maxThroughputKgPerHour);
  return s;
}

let room: Location;

beforeEach(() => {
  StuffApi.clearAll();
  WorldClockApi._resetForTesting();
  room = makeStuff(() => new Location());
});

describe('the sawmill — one class, two rungs, and the rate is the river\'s', () => {
  it('⭐⭐ a water sawmill is SLOWER at low flow', async () => {
    const mill = fromRow('sawmill');
    await ContainmentApi.move(mill as never, room as never);
    await ContainmentApi.move(makeStuff(() => new FakeRace()) as never, room as never);

    mill._setCachedPowerW(10_000); // a spring river: 10 kW at the blade
    const spring = mill.sawMs(24);
    mill._setCachedPowerW(2_000); // a dry August: 2 kW
    const august = mill.sawMs(24);

    expect(Number.isFinite(spring)).toBe(true);
    expect(august).toBeGreaterThan(spring);
    // Linear in the power below the frame's ceiling.
    expect(august / spring).toBeCloseTo(5, 5);
  });

  it('a flood does not drive the blades past the frame', async () => {
    const mill = fromRow('sawmill');
    await ContainmentApi.move(mill as never, room as never);
    await ContainmentApi.move(makeStuff(() => new FakeRace()) as never, room as never);
    mill._setCachedPowerW(1_000_000);
    expect(mill.ratePerHourNow()).toBe(mill.maxThroughputKgPerHour);
  });

  it('⚠ a sawmill with no race does not cut — it never falls back to hand speed', async () => {
    const mill = fromRow('sawmill');
    await ContainmentApi.move(mill as never, room as never);
    expect(mill.availablePowerW()).toBe(0);
    expect(mill.ratePerHourNow()).toBe(0);
    expect(mill.sawMs(24)).toBe(Number.POSITIVE_INFINITY);
  });

  it('⭐ the pit saw cuts at its own rate whatever the river is doing', async () => {
    const pit = fromRow('pit-saw');
    await ContainmentApi.move(pit as never, room as never);
    expect(pit.isPowered()).toBe(false);
    expect(pit.ratePerHourNow()).toBe(30);
    // 24 kg at 30 kg an hour is 48 game-minutes.
    expect(pit.sawMs(24)).toBe(48 * 60 * 1000);
  });

  it('both rungs offer `sawing` — the capability the view defaults on', () => {
    for (const name of ['sawmill', 'pit-saw']) {
      expect(row(name).class).toBe('/trade/carpentry/thing/Sawmill');
      expect(row(name).data!.capabilities).toEqual(['sawing']);
    }
  });
});

describe('the cut — how many boards a log gives', () => {
  it('a length off a bole through-sawn, and quartered', () => {
    expect(boardsFrom(24, BOARD_KG, false)).toBe(4);
    // ⭐ Quartering wastes the wedges: two boards in three.
    expect(boardsFrom(24, BOARD_KG, true)).toBe(Math.floor(4 * QUARTER_YIELD));
    expect(boardsFrom(24, BOARD_KG, true)).toBeLessThan(boardsFrom(24, BOARD_KG, false));
  });

  it('a piece smaller than a board gives none', () => {
    expect(boardsFrom(3, BOARD_KG, false)).toBe(0);
  });

  it('⭐ both board rows weigh what the arithmetic divides by, and are sawn', () => {
    for (const name of ['board', 'quartered-board']) {
      const d = row(name).data!;
      expect(row(name).class).toBe('/platform/thing/Timber');
      expect(d.mass).toBe(BOARD_KG);
      expect(d.constructionForm).toBe('sawn');
    }
    // A quartered board is a different stack, by an authored field.
    expect(row('quartered-board').data!.quarterSawn).toBe(true);
    expect(row('board').data!.quarterSawn).toBeUndefined();
  });
});

describe('the rows the verbs lean on', () => {
  it('⭐ the riven blank affords `carve` — and still offers the kernel `fit`', () => {
    expect(row('riven-blank').class).toBe('/trade/carpentry/thing/Blank');
    expect(row('riven-blank').data!.constructionForm).toBe('riven');
    const peers = Blank.commandContributions.peers ?? [];
    expect(Blank.commandContributions.self).toContain('trade/carpentry/cmd/carpentry/carve.yaml');
    expect(peers).toContain('trade/carpentry/cmd/carpentry/carve.yaml');
    // ⚠ Base-class statics SHADOW: Timber's own peers must be carried.
    for (const v of Timber.commandContributions.peers ?? []) expect(peers).toContain(v);
  });

  it('the sawmill affords `saw` to the room and to whoever holds it', () => {
    expect(Sawmill.commandContributions.peers).toContain('trade/carpentry/cmd/carpentry/saw.yaml');
    expect(Sawmill.commandContributions.environment).toContain('trade/carpentry/cmd/carpentry/saw.yaml');
  });

  it('every recipe is carpentry and outputs a row this pack ships', () => {
    const rs = recipes();
    expect(rs.length).toBeGreaterThan(10);
    for (const r of rs) {
      expect(r.discipline).toBe('carpentry');
      expect(r.outputTemplate.startsWith('/trade/carpentry/thing/')).toBe(true);
      const leaf = r.outputTemplate.replace('/trade/carpentry/thing/', '');
      expect(existsSync(join(ROWS, `${leaf}.yaml`))).toBe(true);
    }
  });

  it('⭐ AC 18: the pick haft is a woodworker\'s — carved, under carpentry', () => {
    const haft = recipes().find((r) => r.recipeId === 'pick-haft')!;
    expect(haft.discipline).toBe('carpentry');
    expect(haft.toolCapabilities).toEqual(['cutting']);
    expect(row('pick-haft').data!._materialPath).toBe('/stuff/idea/material/wood/ash');
  });

  it('⭐ the carvings are one piece of wood and an edge — no heat, no second piece', () => {
    const carvings = ['pick-haft', 'axe-haft', 'handle', 'peg', 'dowel', 'leg', 'rail', 'mallet'];
    const byId = new Map(recipes().map((r) => [r.recipeId, r]));
    for (const id of carvings) {
      const r = byId.get(id)!;
      expect(r.toolCapabilities, id).toEqual(['cutting']);
      expect(r.requiresHeatK ?? 0, id).toBe(0);
      expect(r.inputSlots, id).toHaveLength(1);
      expect(r.inputSlots[0]!.category, id).toBe('wood');
    }
  });

  it('⭐ the frame\'s bill and its recipe are one declaration', () => {
    const bill = row('frame').data!.bill as {
      parts: Array<{ part: string; count: number; role: string }>;
      joints: Array<{ method: string; fastener?: string }>;
    };
    const recipe = recipes().find((r) => r.recipeId === 'frame')!;
    for (const p of bill.parts) {
      const slot = recipe.inputSlots.find((s) => s.slot === p.part);
      expect(slot, p.part).toBeDefined();
      expect(slot!.count ?? 1, p.part).toBe(p.count);
    }
    expect(bill.joints[0]!.method).toBe('pegged');
    expect(bill.joints[0]!.fastener).toBe('peg');
    // The pegged joint is driven — and the trade carves the mallet.
    expect(recipe.toolCapabilities).toEqual(['driving']);
    expect(row('mallet').data!.capabilities).toEqual(['driving']);
  });

  it('⭐⭐ AC 21: the froe is a smith\'s blade on a carved handle, wedged — by hand', () => {
    const froe = row('froe').data!;
    expect(froe.capabilities).toEqual(['riving']);
    const bill = froe.bill as {
      parts: Array<{ part: string; template: string }>;
      joints: Array<{ method: string }>;
    };
    expect(bill.parts.map((p) => p.template).sort()).toEqual([
      '/trade/carpentry/thing/handle',
      '/trade/smithing/thing/froe-blade',
    ]);
    expect(bill.joints[0]!.method).toBe('wedged');
    // No tool: wedged is the by-hand joint.
    expect(recipes().find((r) => r.recipeId === 'froe')!.toolCapabilities).toEqual([]);
  });
});
