/**
 * ⭐ `ShoreMixin.drawAt` — the ONE answer to *what water can I have here,
 * now* (cleanliness D13): open water's draw, the water under the ice
 * through a hole, or the frozen refusal in words.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ShoreMixin } from '../Shore';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { WaterRead } from '../WaterSource';

class Bank extends ShoreMixin(Idea) {}

const OPEN: WaterRead = {
  ref: 'kestrel:confluence', atS: 0, name: 'the Kestrel', frozen: false,
  draw: { materialPath: '/stuff/idea/material/bulk/water', temperatureK: 280, hardnessDgh: 12 },
};
const ICED: WaterRead = {
  ...OPEN, frozen: true, draw: null,
  underIce: { materialPath: '/stuff/idea/material/bulk/water', temperatureK: 274, hardnessDgh: 12 },
};

function bankReading(read: WaterRead): Bank {
  const b = makeStuff(() => new Bank());
  b.setWaters({ river: 'kestrel:confluence' });
  vi.spyOn(b, 'settleWater').mockResolvedValue(read);
  return b;
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('drawAt (D13)', () => {
  it('open water: the draw, hardness and all', async () => {
    const got = await bankReading(OPEN).drawAt('river');
    expect(got).toEqual({ draw: OPEN.draw });
  });

  it('⭐ frozen, no hole: refused in words', async () => {
    const got = await bankReading(ICED).drawAt('river', null);
    expect(got).toMatchObject({ refusal: 'frozen' });
    expect('line' in got && got.line).toMatch(/frozen over; you would need a hole/);
  });

  it('⭐ frozen, through a hole in the floor: the water under the ice', async () => {
    const floor = { openWaterAreaM2: () => 0.5 };
    const room = makeStuff(() => new Idea()) as unknown as Record<string, unknown>;
    vi.spyOn(
      await import('../../../api/mixin').then((m) => m.MixinApi),
      'isAdornable',
    ).mockReturnValue(true);
    (room as { getFloor: () => unknown }).getFloor = () => floor;
    const got = await bankReading(ICED).drawAt('river', room as never);
    expect(got).toEqual({ draw: ICED.underIce });
  });
});
