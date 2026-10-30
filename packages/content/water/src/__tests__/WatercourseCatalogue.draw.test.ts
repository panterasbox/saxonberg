/**
 * ⭐⭐ What a pail drawn from a dirty reach holds, by the KIND of its dirt
 * (ceramics W8, S9 — watershed's contamination by kind on the draw).
 *
 * The level decides THAT the draw is dirty (`water.fouledAt`); the dominant
 * kind decides WHICH dirty: organic and sediment are carried — fouled water,
 * which a boil or a stoneware filter makes water — and persistent and
 * nutrient are dissolved — tainted water, which neither does. The rows'
 * own arrows are pinned too, since the branch is only worth anything if the
 * two materials answer the two remedies differently.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, {
  WATERCOURSE_CATALOGUE_PATH,
  type CompiledReach,
  type ContaminantKind,
} from '../idea/WatercourseCatalogue';

const REF = 'kestrel:below-the-works';
const bank = { getTemplatePath: () => '/test/bank' } as unknown as Stuff;
const FRESH = '/stuff/idea/material/bulk/water';
const FOULED = '/stuff/idea/material/bulk/fouled-water';
const TAINTED = '/stuff/idea/material/bulk/tainted-water';
let cat: WatercourseCatalogue;

function reachCarrying(byKind: Partial<Record<ContaminantKind, number>>): void {
  const k = { organic: 0, persistent: 0, sediment: 0, nutrient: 0, ...byKind };
  const level = k.organic + k.persistent + k.sediment + k.nutrient;
  vi.spyOn(cat, 'reachOf').mockResolvedValue({
    courseKey: 'kestrel',
    courseName: 'the Kestrel',
    channelWidthM: 60,
  } as unknown as CompiledReach);
  vi.spyOn(cat, 'iceAt').mockResolvedValue(null);
  vi.spyOn(cat, 'contaminationAt').mockResolvedValue({ reachRef: REF, level, byKind: k });
  vi.spyOn(cat, 'waterStateAt').mockResolvedValue({ temperatureK: 283 } as never);
}

async function drawn(): Promise<string | undefined> {
  return (await cat.readWater(REF, bank, 0))?.draw?.materialPath;
}

beforeEach(() => {
  StuffApi.clearAll();
  cat = makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH);
  vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('no fishery here'));
  vi.spyOn(AppApi, 'setting').mockImplementation(((k: string) => (k === 'water.fouledAt' ? '0.35' : null)) as never);
});
afterEach(() => vi.restoreAllMocks());

describe('⭐⭐ the draw picks its dirt by kind', () => {
  it('under the threshold the pail is fresh, whatever the dirt is', async () => {
    reachCarrying({ persistent: 0.2 });
    expect(await drawn()).toBe(FRESH);
  });

  it('below a sewer (organic dominant): FOULED water', async () => {
    reachCarrying({ organic: 0.6, persistent: 0.1 });
    expect(await drawn()).toBe(FOULED);
  });

  it('silt counts with the sewage — sediment is carried, not dissolved', async () => {
    reachCarrying({ sediment: 0.5, nutrient: 0.2 });
    expect(await drawn()).toBe(FOULED);
  });

  it('⭐ below a smelter (persistent dominant): TAINTED water', async () => {
    reachCarrying({ persistent: 0.6, organic: 0.1 });
    expect(await drawn()).toBe(TAINTED);
  });

  it('a field\'s run-off (nutrient) is dissolved too: TAINTED', async () => {
    reachCarrying({ nutrient: 0.4, organic: 0.1 });
    expect(await drawn()).toBe(TAINTED);
  });

  it('a tie goes to fouled — the cheaper remedy', async () => {
    reachCarrying({ organic: 0.3, persistent: 0.3 });
    expect(await drawn()).toBe(FOULED);
  });
});

describe('the two rows answer the two remedies differently', () => {
  const ROWS = fileURLToPath(new URL('../../content/stuff/idea/material/bulk/', import.meta.url));
  const data = (leaf: string): Record<string, unknown> =>
    (YAML.parse(readFileSync(`${ROWS}${leaf}`, 'utf8')) as { data: Record<string, unknown> }).data;

  it('fouled water boils AND filters to water', () => {
    expect(data('fouled-water.yaml').purifiedByBoiling).toBe(FRESH);
    expect(data('fouled-water.yaml').filteredTo).toBe(FRESH);
  });

  it('⭐ tainted water names neither arrow — it is dissolved', () => {
    const t = data('tainted-water.yaml');
    expect(t.purifiedByBoiling).toBeUndefined();
    expect(t.filteredTo).toBeUndefined();
    expect((t.toxicity as Array<{ type: string }>).map((x) => x.type)).toContain('lead-poisoning');
    // It looks and answers like water — no sense announces it.
    expect(t.appearance).toBe('clear water');
  });
});
