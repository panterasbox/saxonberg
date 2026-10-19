/**
 * ⭐ Hollow Mere's tuned climate (storage-and-ice D22), pinned against the
 * SHIPPED rows: a fresh world's day 0 is the mere's first days of cold.
 *
 *  - day 0: ice that will not hold a person (a body walking out goes in);
 *  - by day 2: ice that holds one;
 *  - a horse only some days later;
 *  - open water before day 280, and through the late summer.
 *
 * The zone and the water must author the SAME site — the rooms' air and the
 * ice must be the same cold.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '@saxonberg/content-water/src/idea/WatercourseCatalogue';

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, '..', '..', 'content');
const DAY = 86_400;
const read = (rel: string): { data: Record<string, unknown> } =>
  YAML.parse(readFileSync(join(CONTENT, rel), 'utf8'));

let cat: WatercourseCatalogue;

beforeEach(() => {
  StuffApi.clearAll();
  const water = read('stuff/idea/Watercourse/hollowmere.yaml');
  vi.spyOn(PersistApi, 'find').mockImplementation(async (c: string) =>
    c !== Collections.Content
      ? []
      : [{ _id: '1', path: '/stuff/idea/Watercourse/hollowmere', class: '/system/water/idea/Watercourse', data: water.data }],
  );
  // The locality pins the type CLEAR (alive): the seasons run, the weather
  // type does not wander — so the drive repeats.
  WeatherApi._forceTypeForTesting('clear');
  cat = makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH) as WatercourseCatalogue;
});

afterEach(() => {
  WeatherApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const iceAt = async (day: number) => {
  cat.invalidateCache();
  return (await cat.iceAt('hollowmere:mere', day * DAY + 12 * 3600))!;
};

describe('Hollow Mere — the first days of cold', () => {
  it('⭐ the zone and the water author the same site', () => {
    const zone = read('world/terminus/hollow-mere.yaml').data;
    const site = read('stuff/idea/Watercourse/hollowmere.yaml').data.site as Record<string, number>;
    expect(zone.latitude).toBe(site.latitudeDeg);
    expect(zone.climateOffsetK).toBe(site.offsetK);
    expect(zone.continentality).toBe(site.continentality);
  });

  it('⭐ day 0 will not hold a person; day 2 will; a horse only days later', async () => {
    expect((await iceAt(0)).bearsKg).toBeLessThan(80);
    expect((await iceAt(2)).bearsKg).toBeGreaterThanOrEqual(80);
    expect((await iceAt(2)).bearsKg).toBeLessThan(700);
    expect((await iceAt(20)).bearsKg).toBeGreaterThanOrEqual(700);
  });

  it('⭐ open water before day 280 and through the late summer', async () => {
    for (const day of [280, 300, 330]) expect((await iceAt(day)).thicknessM).toBe(0);
  });
});
