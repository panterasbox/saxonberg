/**
 * A reach as a shore reads it (maritime revision 3): the catalogue is the
 * water source for a cited reach. ⭐⭐ What a pail drawn there holds is
 * what the reach is — fouled where the reach reads fouled, nothing
 * through ice — and the read in words never says *fouled*.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, {
  WATERCOURSE_CATALOGUE_PATH,
  type CompiledReach,
  type IceRecord,
} from '../idea/WatercourseCatalogue';

const REF = 'kestrel:confluence';
const bank = { getTemplatePath: () => '/test/bank' } as unknown as Stuff;
const viewer = { getTemplatePath: () => '/test/viewer' } as unknown as Stuff;
let cat: WatercourseCatalogue;

function reachWith(level: number, ice: Partial<IceRecord> | null): void {
  vi.spyOn(cat, 'reachOf').mockResolvedValue({
    courseKey: 'kestrel',
    courseName: 'the Kestrel',
    channelWidthM: 60,
  } as unknown as CompiledReach);
  vi.spyOn(cat, 'iceAt').mockResolvedValue(
    ice === null ? null : ({ ref: REF, thicknessM: 0, rotting: false, reason: null, ...ice } as IceRecord),
  );
  vi.spyOn(cat, 'contaminationAt').mockResolvedValue({
    reachRef: REF,
    level,
    byKind: { organic: level, persistent: 0, sediment: 0, nutrient: 0 },
  });
  vi.spyOn(cat, 'waterStateAt').mockResolvedValue({ temperatureK: 283 } as never);
}

beforeEach(() => {
  StuffApi.clearAll();
  cat = makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH);
  vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('no fishery here'));
  vi.spyOn(AppApi, 'setting').mockImplementation(((k: string) => (k === 'water.fouledAt' ? '0.35' : null)) as never);
});
afterEach(() => vi.restoreAllMocks());

describe('drawing from a reach', () => {
  it('clean water above the threshold\'s line: fresh water, at the reach\'s temperature', async () => {
    reachWith(0.1, null);
    const read = await cat.readWater(REF, bank, 0);
    expect(read?.name).toBe('the Kestrel');
    expect(read?.draw).toEqual({ materialPath: '/stuff/idea/material/bulk/water', temperatureK: 283 });
  });

  it('⭐⭐ below an outfall that fouls it: the pail holds FOULED water', async () => {
    reachWith(0.6, null);
    const read = await cat.readWater(REF, bank, 0);
    expect(read?.draw?.materialPath).toBe('/stuff/idea/material/bulk/fouled-water');
  });

  it('⭐ through ice nothing comes up', async () => {
    reachWith(0, { thicknessM: 0.4 });
    const read = await cat.readWater(REF, bank, 0);
    expect(read?.frozen).toBe(true);
    expect(read?.draw).toBeNull();
  });

  it('⛔ the read in words never says the water is foul — no sense announces it', async () => {
    reachWith(0.9, null);
    const read = await cat.readWater(REF, bank, 0);
    const words = cat.waterLinesFor(read!, viewer).join(' ');
    expect(words).toMatch(/This is the Kestrel/);
    expect(words).not.toMatch(/foul|filth|dirty|unsafe|sick/i);
  });

  it('a reach this catalogue does not know is not read', async () => {
    vi.spyOn(cat, 'reachOf').mockResolvedValue(null);
    expect(await cat.readWater('nowhere:at-all', bank, 0)).toBeNull();
  });
});
