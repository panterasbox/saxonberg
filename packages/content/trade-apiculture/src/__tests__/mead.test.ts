/**
 * Mead and wild honey — ⭐⭐ **AC 15: one mechanism, twice.**
 *
 * Honey left **open** ferments by itself and that is a defect; honey
 * deliberately diluted and fermented is mead and that is a product. Same
 * microbial clock, same row shape, and the only thing that tells them
 * apart is that somebody meant one of them.
 *
 * ⭐ And both are **spontaneous** — `spontaneousLagDays > 0` is the
 * shipped `requiresFlora` predicate's third clause, so a must left open
 * catches wild yeast out of the air after a few days, a pitched one
 * starts at once, and a sealed one never starts. Three behaviours, two
 * rows, no code.
 *
 * ⚠⚠ **These tests build their profiles FROM THE SHIPPED ROWS**, parsed
 * off disk, rather than from hand-made copies. A hand-made copy proves
 * the mechanism, which the kernel already tests; reading the row proves
 * the CONTENT, which is what this build actually shipped.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import type MaturationProfile from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import { forgetProfiles, rememberShipped } from '@saxonberg/server/mud/lib/maturation/__tests__/profiles';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Drink from '@saxonberg/server/mud/platform/idea/material/Drink';
import Food from '@saxonberg/server/mud/platform/idea/material/Food';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

// The profile and schedule documents outlive a test (load-on-use W4).
afterEach(() => forgetProfiles());

const DAY = 86_400;
const here = dirname(fileURLToPath(import.meta.url));
const APICULTURE = join(here, '..', '..', 'content', 'trade', 'apiculture');
const WINEMAKING = join(
  here, '..', '..', '..', 'trade-winemaking', 'content', 'trade', 'winemaking',
);

let now = 400_000_000;
function setNow(s: number): void {
  now = s;
}

function singleton<T extends Stuff>(path: string, factory: () => T): T {
  const found = StuffApi.findByTemplatePath<T>(path);
  if (found) return found;
  return makeStuffAtPath(factory, path);
}

function rowData(file: string): Record<string, unknown> {
  const doc = YAML.parse(readFileSync(file, 'utf-8')) as {
    data?: Record<string, unknown>;
  };
  return doc.data ?? {};
}

/** Stand a Material from its shipped row — tags and sugar included. */
function material(file: string, path: string): Material {
  const data = rowData(file);
  return singleton(path, () => {
    const cls = (YAML.parse(readFileSync(file, 'utf-8')) as { class: string }).class;
    const m: Material = cls.endsWith('/Drink') ? new Drink() : new Food();
    m.setName(String(data.name ?? 'thing'));
    m.setTags((data.tags as string[]) ?? []);
    const amounts = data.nutrientAmounts as Record<string, number> | undefined;
    if (amounts?.sugar && MixinApi.hasEdibility(m)) {
      m.setNutrients(['water', 'sugar']);
      m.setNutrientAmounts({ sugar: amounts.sugar });
    }
    return m;
  });
}

/** The SHIPPED profile document at `path`, read from disk and parsed (load-on-use W4). */
function profile(path: string): MaturationProfile {
  return rememberShipped<MaturationProfile>(path);
}

const HONEY = '/trade/apiculture/idea/material/honey';
const FERMENTED = '/trade/apiculture/idea/material/fermented-honey';
const HONEY_MUST = '/trade/winemaking/idea/material/honey-must';
const MEAD = '/trade/winemaking/idea/material/mead';

function stand(): void {
  material(join(APICULTURE, 'idea/material/honey.yaml'), HONEY);
  material(join(APICULTURE, 'idea/material/fermented-honey.yaml'), FERMENTED);
  material(join(WINEMAKING, 'idea/material/honey-must.yaml'), HONEY_MUST);
  material(join(WINEMAKING, 'idea/material/mead.yaml'), MEAD);
  profile('/trade/apiculture/maturation-profiles/honey-wild');
  profile('/trade/winemaking/maturation-profiles/mead');
}

/** A vessel at a stated temperature, open or shut. */
function vessel(tempK: number, open: boolean, capacityL = 5): Vat {
  const v = makeStuff(() => new Vat());
  v.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  v.lastAmbientK = tempK;
  v.stampedTemperatureK = tempK;
  v.setOpen(open);
  return v;
}

function fill(v: Vat, materialPath: string, litres: number): void {
  const m = StuffApi.findByTemplatePath<Material>(materialPath)!;
  v.setBulkMaterial('interior', m);
  v.setBulkAmount('interior', Quantity.of(litres, 'L'));
  // ⚠ The batch is KEYED on the first phase read, not on the fill — the
  // Yeast suite's own shape. Without this the vessel has a material and
  // no profile, which reads exactly like a material nothing matches.
  v.getMaturationPhase();
}

describe('mead, and the honey that ferments by itself', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    setNow(400_000_000);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    singleton('/platform/idea/WorldClockRegistry', () => new WorldClockRegistry());
    stand();
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('⭐ the shipped rows key on the profiles the tags name', () => {
    const honey = StuffApi.findByTemplatePath<Material>(HONEY)!;
    const must = StuffApi.findByTemplatePath<Material>(HONEY_MUST)!;
    expect(honey.getTags()).toContain('honey');
    expect(must.getTags()).toContain('honey-must');
    // ⚠⚠ The DOUBLE-MATCH rule: `honey-must` must NOT also carry `honey`,
    // or a jar of must would match both profiles and the catalogue would
    // warn (and pick one, silently).
    expect(must.getTags()).not.toContain('honey');
  });

  it('⭐⭐ AC 15 — honey left OPEN ferments by itself', () => {
    const jar = vessel(297, true, 2);
    fill(jar, HONEY, 1);
    expect(jar.getMaturationProfile()?.getKey()).toBe('honey-wild');
    // Nothing for the first few days: the wild flora has to find it.
    setNow(400_000_000 + 4 * DAY);
    expect(jar.getFractionConverted()).toBe(0);
    // …and then it goes.
    setNow(400_000_000 + 60 * DAY);
    expect(jar.getFractionConverted()).toBeGreaterThan(0.5);
  });

  it('⭐⭐ …and SEALED it keeps, which is why honey is honey', () => {
    const jar = vessel(297, false, 2);
    fill(jar, HONEY, 1);
    setNow(400_000_000 + 400 * DAY);
    expect(jar.getFractionConverted()).toBe(0);
  });

  it('⚠ cold honey keeps too, open or not', () => {
    const jar = vessel(280, true, 2);
    fill(jar, HONEY, 1);
    setNow(400_000_000 + 400 * DAY);
    expect(jar.getFractionConverted()).toBe(0);
  });

  it('⭐⭐ AC 15 — an OPEN honey must becomes mead: the same mechanism', () => {
    const bucket = vessel(293, true, 10);
    fill(bucket, HONEY_MUST, 4);
    expect(bucket.getMaturationProfile()?.getKey()).toBe('mead');
    setNow(400_000_000 + 3 * DAY);
    expect(bucket.getFractionConverted()).toBe(0); // still catching
    setNow(400_000_000 + 60 * DAY);
    expect(bucket.getFractionConverted()).toBeGreaterThan(0.5);
  });

  it('a must sealed from the start never starts at all', () => {
    const bucket = vessel(293, false, 10);
    fill(bucket, HONEY_MUST, 4);
    setNow(400_000_000 + 200 * DAY);
    expect(bucket.getFractionConverted()).toBe(0);
  });

  it('⭐ mead is SLOWER than a grape must — honey is a poor nitrogen source', () => {
    const mead = profile('/trade/winemaking/maturation-profiles/mead');
    const white = profile('/trade/winemaking/maturation-profiles/white-wine');
    expect(mead.getRatePerDay()).toBeLessThan(white.getRatePerDay());
  });

  it('⭐ wild honey does NOT go on to vinegar — it just stays disappointing', () => {
    const wild = profile('/trade/apiculture/maturation-profiles/honey-wild');
    const mead = profile('/trade/winemaking/maturation-profiles/mead');
    expect(wild.getTurnedMaterial()).toBeFalsy();
    // Mead does, because mead is wine.
    expect(mead.getTurnedMaterial()).toBeTruthy();
  });
});
