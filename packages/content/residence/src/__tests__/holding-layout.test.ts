/**
 * A holding's LAYOUT as data (tracts build D27, D31): the open ground its
 * tracts share, a tract's share of it, and a copy read through a mirror.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import HoldingWarren from '../idea/HoldingWarren';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const FARM = [
  {
    leaf: 'yard',
    room: '/world/_t/yard',
    entry: true,
    footprintM2: 400,
    exits: [
      { to: 'barn', direction: 'north', opposite: 'south', locked: true },
      { to: 'meadow', direction: 'east', opposite: 'west' },
      { to: 'close', direction: 'northeast', opposite: 'southwest' },
      { to: 'bench', direction: 'up', opposite: 'down' },
    ],
  },
  { leaf: 'barn', room: '/world/_t/barn', footprintM2: 150 },
  { leaf: 'bench', room: '/world/_t/bench', share: 0.3 },
  { leaf: 'close', room: '/world/_t/close', share: 0.25 },
  { leaf: 'meadow', room: '/world/_t/meadow', share: 0.45 },
];

function farm(): HoldingWarren {
  const h = makeStuffAtPath(() => new HoldingWarren(), '/world/_t/farmstead');
  h.setFloorplan(FARM);
  h.setPersistenceKey('/world/_t/valley/lots/lot-2', true);
  return h;
}

describe('a holding\'s layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ open ground is the workable area less the buildings\' footprints', async () => {
    vi.spyOn(ParcelApi, 'workableAreaOf').mockResolvedValue(16000);
    const h = farm();
    expect(await h.openGroundM2()).toBe(16000 - 550);
    expect(h.shareOf('meadow')).toBe(0.45);
    expect(h.shareOf('barn')).toBeNull();
  });

  it('unmeasured ground has no open ground to share', async () => {
    vi.spyOn(ParcelApi, 'workableAreaOf').mockResolvedValue(0);
    expect(await farm().openGroundM2()).toBe(0);
  });

  it('⭐ a mirrored copy reads every direction across the axis; up stays up', () => {
    const h = farm();
    const plain = h.getFloorplanExits().map((e) => `${e.to}:${e.direction}/${e.opposite}`);
    expect(plain).toEqual([
      'barn:north/south',
      'meadow:east/west',
      'close:northeast/southwest',
      'bench:up/down',
    ]);
    h.setMirrorAxis('east-west');
    const mirrored = h.getFloorplanExits().map((e) => `${e.to}:${e.direction}/${e.opposite}`);
    expect(mirrored).toEqual([
      'barn:north/south',
      'meadow:west/east',
      'close:northwest/southeast',
      'bench:up/down',
    ]);
    h.setMirrorAxis('north-south');
    expect(h.getFloorplanExits()[0]!.direction).toBe('south');
    h.setMirrorAxis(null);
    expect(h.getMirrorAxis()).toBe('');
  });
});
