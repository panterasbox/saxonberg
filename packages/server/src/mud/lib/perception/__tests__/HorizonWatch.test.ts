import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HorizonWatch } from '../HorizonWatch';
import { PerceptionApi, type HorizonView } from '../../../api/perception';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import type { Stuff } from '../../stuff/Stuff';
import type { Engaged } from '../../activity/Engaged';

/**
 * A kept watch (maritime R6) says only what CHANGED: the first look
 * reports what is in view, later looks what came into view and what went
 * out of it, and a look that changes nothing says nothing.
 */

const thing = (id: string, name: string): Stuff =>
  ({ stuffId: id, getPresentation: () => name, isDestroyed: () => false }) as unknown as Stuff;

const watcher = { stuffId: 'w', isDestroyed: () => false } as unknown as Stuff & Engaged;
let told: string[] = [];
let views: HorizonView[] = [];

beforeEach(() => {
  told = [];
  views = [];
  vi.spyOn(PerceptionApi, 'horizonFor').mockImplementation(async () => views.shift()!);
  vi.spyOn(MixinApi, 'isSensor').mockReturnValue(true);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => { told.push(m.toString()); return b; };
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => vi.restoreAllMocks());

const light = thing('light', 'the light on Gannet Rock');
const brig = thing('brig', 'the brig');

describe('HorizonWatch', () => {
  it('⭐ reports what came into view and what went out of it — and nothing when nothing changed', async () => {
    const w = new HorizonWatch(watcher);
    views.push(
      { things: [{ stuff: light, bearingDeg: 45, rangeNm: 9 }], traffic: [], atSea: true },
      { things: [{ stuff: light, bearingDeg: 46, rangeNm: 8 }], traffic: [], atSea: true },
      {
        things: [{ stuff: brig, bearingDeg: 180, rangeNm: 3 }],
        traffic: [{ name: 'a fishing boat', bearingDeg: 270, rangeNm: 1.5 }],
        atSea: true,
      },
    );
    await w.watch();
    expect(told).toEqual(['You make out the light on Gannet Rock, to the north-east, some 9 miles off.']);
    told = [];
    await w.watch();
    expect(told).toEqual([]);
    await w.watch();
    expect(told).toEqual([
      'You make out the brig, to the south, some 3 miles off.',
      'You make out a fishing boat, to the west, about a mile off.',
      'The light on Gannet Rock is lost to sight.',
    ]);
  });

  it('keeps the news for whoever reads it on the watcher\'s behalf, and drains it', async () => {
    const w = new HorizonWatch(watcher);
    views.push({ things: [{ stuff: light, bearingDeg: 45, rangeNm: 9 }], traffic: [], atSea: true });
    await w.watch();
    expect(w.takeNews().map((n) => [n.change, n.name])).toEqual([['sighted', 'the light on Gannet Rock']]);
    expect(w.takeNews()).toEqual([]);
  });

  it('ashore there is no number to give — only what is seen', async () => {
    const w = new HorizonWatch(watcher);
    views.push({ things: [{ stuff: thing('t', 'the terminal clock tower'), bearingDeg: null, rangeNm: null }], traffic: [], atSea: false });
    await w.watch();
    expect(told).toEqual(['You make out the terminal clock tower.']);
  });

  it('a stood-down watch looks no more', async () => {
    const w = new HorizonWatch(watcher);
    w.onAbort('cancelled');
    await w.watch();
    expect(PerceptionApi.horizonFor).not.toHaveBeenCalled();
  });
});
