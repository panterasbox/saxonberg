/**
 * The trade-farming families (farming A5) — a row-shape test over the
 * shipped YAML, the libations-annexes shape: for each of the TEN grown
 * produce keys the whole family resolves — seed → plant → produce →
 * material — the plant rides the FRUIT CYCLE (both cycle fields
 * authored), the seed loops back, the species row exists, and the
 * general store sells the packet at a price. The mechanism (plant, grow,
 * pick, press) is proven in the kernel suites; this is the content's
 * half — that its rows fit it.
 *
 * The carrot is the ANNUAL PIN: no cycle fields, byte-identical phase-1
 * behavior.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const PACKS = fileURLToPath(new URL('../../../../../content/', import.meta.url));

const KEYS = [
  'lime',
  'lemon',
  'orange',
  'grapefruit',
  'cherry',
  'olive',
  'mint',
  'cranberry',
  'grape',
  'juniper',
];

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

function allRows(): Row[] {
  const rows: Row[] = [];
  for (const pack of readdirSync(PACKS)) {
    const root = join(PACKS, pack, 'content');
    if (!existsSync(join(PACKS, pack, 'pack.yaml')) || !existsSync(root)) continue;
    for (const file of walk(root)) {
      const rel = relative(root, file);
      if (rel.startsWith('recipes/') || rel.startsWith('settings/') || rel.startsWith('archetypes/') || rel.startsWith('name-banks/')) continue;
      const raw = parse(readFileSync(file, 'utf8')) as {
        class?: string;
        data?: Record<string, unknown>;
      } | null;
      if (!raw || typeof raw.class !== 'string') continue;
      rows.push({
        pack,
        path: '/' + rel.replace(/\.yaml$/, ''),
        class: raw.class,
        data: raw.data ?? {},
      });
    }
  }
  return rows;
}

const rows = allRows();
const byPath = new Map(rows.map((r) => [r.path, r]));

function profileOf(plant: Row): Record<string, unknown> {
  return (plant.data.profile ?? {}) as Record<string, unknown>;
}

describe('trade-farming — the ten grown families resolve end to end', () => {
  for (const key of KEYS) {
    it(`${key}: seed → plant → produce → material, on the cycle`, () => {
      const seed = byPath.get(`/trade/farming/thing/seed/${key}`);
      expect(seed, 'seed row').toBeDefined();
      expect(seed!.class).toBe('/platform/thing/Seed');

      const plantPath = seed!.data.growsIntoPath as string;
      const plant = byPath.get(plantPath);
      expect(plant, `plant row ${plantPath}`).toBeDefined();
      expect(plant!.class).toBe('/platform/thing/Plant');
      // The seed loops back — a flowering episode re-mints THIS packet.
      expect(plant!.data.seedTemplatePath).toBe(`/trade/farming/thing/seed/${key}`);

      // ⭐ The cycle fields are the polycarp marker — authored on all ten.
      const profile = profileOf(plant!);
      expect(Number(profile.fruitSetCount), 'fruitSetCount').toBeGreaterThan(0);
      expect(Number(profile.fruitFillDays), 'fruitFillDays').toBeGreaterThan(0);
      // Nitrogen exports with the take.
      expect(Number(plant!.data.nutrientDraw)).toBeGreaterThan(0);

      const producePath = plant!.data.harvestTemplatePath as string;
      const produce = byPath.get(producePath);
      expect(produce, `produce row ${producePath}`).toBeDefined();
      expect(produce!.class).toBe('/platform/thing/Provision');

      const materialPath = produce!.data._materialPath as string;
      const material = byPath.get(materialPath);
      expect(material, `material row ${materialPath}`).toBeDefined();
      expect(material!.class).toBe('/platform/idea/material/ConsumableMaterial');
      // Edible matter (the A4 gather predicate) tagged with its category.
      expect(material!.data.edibility).toBe(true);
      expect(material!.data.tags as string[]).toContain(key);

      // The species row exists at the plant's own path.
      const species = byPath.get(plant!.data._speciesPath as string);
      expect(species, `species ${String(plant!.data._speciesPath)}`).toBeDefined();
      expect(species!.class).toBe('/platform/idea/species/Species');
    });
  }

  it('⭐ the carrot is the ANNUAL PIN — no cycle fields', () => {
    const carrot = byPath.get('/trade/farming/thing/plant/carrot');
    expect(carrot).toBeDefined();
    const profile = profileOf(carrot!);
    expect(profile.fruitSetCount).toBeUndefined();
    expect(profile.fruitFillDays).toBeUndefined();
  });

  it('the general store sells every packet, at a price', () => {
    const counter = byPath.get('/world/terminus/general-store/counter');
    expect(counter).toBeDefined();
    const lines = (counter!.data.stockLines ?? []) as Array<{
      itemTemplatePath: string;
      par: number;
    }>;
    const prices = (counter!.data.prices ?? {}) as Record<string, number>;
    for (const key of KEYS) {
      const seedPath = `/trade/farming/thing/seed/${key}`;
      const line = lines.find((l) => l.itemTemplatePath === seedPath);
      expect(line, `stock line ${seedPath}`).toBeDefined();
      expect(line!.par).toBeGreaterThan(0);
      expect(prices[seedPath], `price ${seedPath}`).toBeGreaterThan(0);
    }
  });

  it('the farmers market resolves: square ↔ avenue pair, stalls, operator (A6)', () => {
    const square = byPath.get('/world/terminus/market/square');
    expect(square).toBeDefined();
    const exits = square!.data.exits as Record<string, { destination: string }>;
    expect(exits.northeast.destination).toBe(
      '/world/terminus/counting-houses/avenue-block',
    );
    // Both sides explicit (the cash-and-carry precedent).
    const avenue = byPath.get('/world/terminus/counting-houses/avenue-block')!;
    const avenueExits = avenue.data.exits as Record<string, { destination: string }>;
    expect(avenueExits.southwest.destination).toBe('/world/terminus/market/square');
    // The zone row is the sibling .yaml.
    expect(byPath.get('/world/terminus/market')!.class).toBe(
      '/platform/idea/location/CartesianZone',
    );

    const stalls = byPath.get('/world/terminus/market/stalls');
    expect(stalls).toBeDefined();
    expect(stalls!.class).toBe('/platform/thing/Stock');
    expect(stalls!.data.stockLines).toEqual([]); // consignment-only, no par
    expect(Number(stalls!.data.listingCapOverride)).toBeGreaterThan(24);
    expect((square!.data.populates as string[])).toContain(
      '/world/terminus/market/stalls',
    );

    const business = byPath.get(stalls!.data.businessPath as string);
    expect(business, 'market business').toBeDefined();
    expect(business!.data.proprietorPath ?? '').toBe(''); // municipal
    expect(business!.data.banksAt).toBe('goodkin');
    expect(business!.data.operatingLocations).toContain(
      '/world/terminus/market/stalls',
    );
  });

  it('a tree fits a garden bed alone — the D0 suburban-garden invariant', () => {
    // The Hinkley-yard acceptance leg plants a lime in a 12 L bed: every
    // grown family's MATURE root demand must fit a whole bed to itself,
    // or the drive's tree stalls below thriving and never fruits.
    for (const key of KEYS) {
      const seed = byPath.get(`/trade/farming/thing/seed/${key}`)!;
      const plant = byPath.get(seed.data.growsIntoPath as string)!;
      const demand = (
        profileOf(plant).rootDemand as Record<string, number>
      ).mature;
      expect(demand, `${key} mature rootDemand`).toBeLessThanOrEqual(12);
    }
  });
});
