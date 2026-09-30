/**
 * The oil works (energy build A3) — ⭐ **a producer that is not a retailer.**
 *
 * The street-lighting market was paying a placeholder (the general store) that
 * makes nothing. The oil works is the fuel trade's real producer: an outfit in
 * the goods yards that spawns lamp-oil casks on its floor and consigns them to
 * the cash-and-carry, where a town's public-works department buys them.
 *
 * This file proves the rows are WELL-FORMED and CROSS-REFERENCE — the outfit,
 * its stock, its hand and its floor point at each other, and the cask's faucet
 * is this stock. The LIVE consignment (the hand actually walking casks to the
 * counter) is the Stage A wire drive's job.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const TERMINUS = fileURLToPath(new URL('../../content/', import.meta.url));
const OILWORKS = `${TERMINUS}world/terminus/goods-yards/oilworks`;
const FUEL = fileURLToPath(
  new URL('../../../trade-fuel/content/', import.meta.url),
);

function doc(file: string): { data: Record<string, unknown>; class: string } {
  return YAML.parse(readFileSync(file, 'utf8')) as {
    data: Record<string, unknown>;
    class: string;
  };
}

const OUTFIT_PATH = '/world/terminus/goods-yards/oilworks/idea/outfit';
const STOCK_PATH = '/world/terminus/goods-yards/oilworks/thing/stock';
const HAND_PATH = '/world/terminus/goods-yards/oilworks/agent/hand';
const DISTRIBUTOR = '/world/terminus/counting-houses/distributor/thing/counter';

describe('the oil works outfit', () => {
  it('the outfit is a Business appointed by the Ministry of Trade, staffed by the hand', () => {
    const outfit = doc(`${OILWORKS}/idea/outfit.yaml`);
    expect(outfit.class).toBe('/platform/idea/Business');
    expect(outfit.data.appointingAuthority).toEqual({
      kind: 'office',
      office: 'minister-of-trade',
    });
    const slots = outfit.data.rosterSlots as Array<{ assignee: string }>;
    expect(slots[0]!.assignee).toBe(HAND_PATH);
    expect(outfit.data.operatingLocations).toEqual(
      expect.arrayContaining([
        '/world/terminus/goods-yards/oilworks/location/floor',
        STOCK_PATH,
      ]),
    );
    // ⭐ The hand PURCHASES (dealt the house card) so it consigns as the outfit.
    const positions = outfit.data.positions as Array<{
      key: string;
      purchases?: boolean;
    }>;
    expect(positions.find((p) => p.key === 'hand')?.purchases).toBe(true);
  });

  it('the stock belongs to the outfit and sells nothing (a producer, not a shop)', () => {
    const stock = doc(`${OILWORKS}/thing/stock.yaml`);
    expect(stock.class).toBe('/trade/shopkeeping/thing/Stock');
    expect(stock.data.businessPath).toBe(OUTFIT_PATH);
    expect(stock.data.stockLines).toEqual([]);
    expect(stock.data.prices).toEqual({});
    expect(stock.data._materialPath).toBeTruthy(); // lint:mass
  });

  it("the hand consigns the oil to the cash-and-carry, priced by the cask's census key", () => {
    const hand = doc(`${OILWORKS}/agent/hand.yaml`);
    const behaviors = hand.data.behaviors as Array<{
      brain: string;
      config?: { stock?: string; shelf?: string; ask?: Record<string, number> };
    }>;
    const consigns = behaviors.find((b) =>
      b.brain.endsWith('/consigns'),
    );
    expect(consigns).toBeTruthy();
    expect(consigns!.config?.stock).toBe(STOCK_PATH);
    expect(consigns!.config?.shelf).toBe(DISTRIBUTOR);
    expect(consigns!.config?.ask?.['fuel:lamp-oil']).toBeGreaterThan(0);
  });

  it("the floor props the stock and has a door onto the yard", () => {
    const floor = doc(`${OILWORKS}/location/floor.yaml`);
    expect(floor.data.props).toEqual(expect.arrayContaining([STOCK_PATH]));
    const exits = floor.data.exits as Record<string, { destination: string }>;
    expect(exits.southeast?.destination).toBe('/world/terminus/goods-yards/yard');
    expect(floor.data.cast).toEqual(expect.arrayContaining([HAND_PATH]));
  });

  it("⭐ the cask's faucet is this stock, and its census key matches the ask", () => {
    const cask = doc(`${FUEL}trade/fuel/thing/lamp-oil-cask.yaml`);
    expect(cask.data.container).toBe(STOCK_PATH);
    expect(cask.data.censusKey).toBe('fuel:lamp-oil');
    expect(cask.data.regionTarget).toBeGreaterThan(0);
  });
});
