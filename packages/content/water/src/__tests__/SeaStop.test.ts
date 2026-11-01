/**
 * SeaStop — ⭐ the sea over a ship that went down (harbors B5, P20): a
 * stop at her position with the sea's depth under it, the way into her on
 * its bed band (wired when the bed buds), and her deck's way back up.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import SeaStop from '../location/SeaStop';
import SeaWarren from '../idea/SeaWarren';

const SEA = '/sea';
const STOP_ROW = '/system/water/location/sea/stop/water';

/** A thing with ways: records what is installed on it, by direction. */
function exitable(name: string) {
  const ways: Record<string, { kind: string; destination: string; configured: unknown[] }> = {};
  return {
    name,
    ways,
    getExit: (d: string) => (ways[d] ? ({} as never) : undefined),
    installExit: async (kind: string, o: { direction: string; destinationPath: string }, cfg: (e: unknown) => void) => {
      const configured: unknown[] = [];
      cfg({
        configureSea: (...a: unknown[]) => configured.push(...a),
        configureColumn: (...a: unknown[]) => configured.push(...a),
      });
      ways[o.direction] = { kind, destination: o.destinationPath, configured };
      return {};
    },
  };
}

function ship(pos: GeoPosition, deck: ReturnType<typeof exitable>) {
  return {
    getName: () => 'the Hesper',
    getDurableHandle: () => '/ship/hesper',
    getTemplatePath: () => '/ship/hesper',
    getEntrance: () => '/ship/hesper/deck',
    getExpanse: () => SEA,
    getExpansePosition: () => pos,
    getCourse: () => null,
    watchRoom: async () => deck as never,
  };
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined as never);
  vi.spyOn(MixinApi, 'isExitable').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isVoyaging').mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('SeaStop (harbors B5)', () => {
  it('⭐⭐ a wreck marked under it: the way into her goes on its bed band, her deck leads back up to it', async () => {
    const deck = exitable('deck');
    const bed = exitable('bed');
    const hesper = ship(new GeoPosition(42, -8.47), deck);
    vi.spyOn(ExpanseApi, 'standUpCraft').mockResolvedValue(hesper as never);
    const stop = makeStuffAtPath(() => new SeaStop(), STOP_ROW);
    vi.spyOn(stop, 'wreckBed').mockResolvedValue(bed as never);
    vi.spyOn(stop, 'getDurableHandle').mockReturnValue(`${STOP_ROW}#here`);
    await stop.markWreck(hesper);
    expect(stop.getWrecks()).toEqual([
      { ship: '/ship/hesper', name: 'the Hesper', word: 'hesper', deck: '/ship/hesper/deck' },
    ]);
    // ⭐ On the bed: a way named for her, onto her deck, by her handle.
    expect(bed.ways.hesper).toMatchObject({ destination: '/ship/hesper/deck', configured: ['wreck', '/ship/hesper'] });
    // ⭐ Her deck's `up`: out of her to the stop's bed band.
    expect(deck.ways.up).toMatchObject({ configured: [`${STOP_ROW}#here`, 'bed'] });
    // Marked twice, recorded once.
    await stop.markWreck(hesper);
    expect(stop.getWrecks()).toHaveLength(1);
  });

  it('⭐ the bed band budding is what wires the way in — no other band', async () => {
    const stop = makeStuffAtPath(() => new SeaStop(), STOP_ROW);
    (stop as unknown as { wrecks: unknown[] }).wrecks = [
      { ship: '/ship/hesper', name: 'the Hesper', word: 'hesper', deck: '/ship/hesper/deck' },
    ];
    const lit = exitable('lit');
    const bed = exitable('bed');
    await stop.onBandBudded('lit', lit as never);
    expect(Object.keys(lit.ways)).toEqual([]);
    await stop.onBandBudded('bed', bed as never);
    expect(Object.keys(bed.ways)).toEqual(['hesper']);
  });

  it('⭐ the deep water under a stop has a column — derived from the depth, a bed at the bottom', () => {
    const stop = makeStuffAtPath(() => new SeaStop(), STOP_ROW);
    stop.setWater({ of: SEA, depthM: 20 });
    expect(stop.bandsNow()).toContain('bed');
    expect(stop.isWaterNow()).toBe(true);
  });

  it('⭐ SeaWarren.stopOver: the stop at her position, the sea\'s depth, the wreck marked', async () => {
    const deck = exitable('deck');
    const hesper = ship(new GeoPosition(42, -8.47), deck);
    const stood = makeStuffAtPath(() => new SeaStop(), STOP_ROW);
    vi.spyOn(PersistableApi, 'standUpKeyed').mockResolvedValue(stood as never);
    const mark = vi.spyOn(stood, 'markWreck').mockResolvedValue(undefined);
    vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) =>
      p === SEA ? { depthAt: async () => 30 } : { stuffId: p }) as never);
    vi.spyOn(StuffApi, 'clone').mockResolvedValue({ adopt: () => undefined } as never);
    const w = makeStuff(() => new SeaWarren());
    const stop = await w.stopOver(hesper as never);
    expect(stop).toBe(stood);
    expect(stood.getExpanse()).toBe(SEA);
    expect(stood.getWater()).toMatchObject({ of: SEA, depthM: 30 });
    expect(mark).toHaveBeenCalledWith(hesper);
    // The same spot again is the same stop.
    expect(await w.stopOver(hesper as never)).toBe(stood);
  });
});
