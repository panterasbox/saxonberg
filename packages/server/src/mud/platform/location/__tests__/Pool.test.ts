/**
 * Pool (maritime review, 2026-10-13): a place that IS a small water. You
 * swim it because you are in it — no water object stands there — and
 * whether you can is read off the water it cites: a frozen pool is not
 * swum. A test-local `WaterSourceMixin` stands in for the water pack.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PoolClass from '../Pool';
import { Idea } from '../../../lib/stuff/Idea';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { WaterSourceMixin, type WaterRead } from '../../../lib/location/WaterSource';
import WorldClockRegistry from '../../idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePaths } from '../../../lib/paths';
import { Mixins } from '../../../lib/mixin';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

const SOURCE = '/test/water/source';

class FakeSource extends WaterSourceMixin(Idea) {
  public frozen = false;
  public override currentWaterRef(citation: string): string | null { return citation; }
  public override async readWater(citation: string, _place: Stuff, nowS: number): Promise<WaterRead | null> {
    return { ref: citation, atS: nowS, name: 'the sea', frozen: this.frozen, draw: null, opaque: {} };
  }
  public override waterLinesFor(): string[] { return ['The sea is cold.']; }
}

let source: FakeSource;

function pool(): InstanceType<typeof PoolClass> {
  const room = makeStuffAtPath(() => new PoolClass(), '/test/estuary/pool');
  room.setDetail(['pool', 'water'], 'Clear green water.');
  room.setWaters({ pool: 'greywater' });
  return room;
}

beforeEach(() => {
  StuffApi.clearAll();
  makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  WorldClockApi._setNowProviderForTesting(() => 1_000_000);
  source = makeStuffAtPath(() => new FakeSource(), SOURCE);
  vi.spyOn(AppApi, 'setting').mockImplementation(((key: string) =>
    key === 'water.sourcePath' ? SOURCE : null) as never);
});

afterEach(() => vi.restoreAllMocks());

describe('a Pool is the water', () => {
  it('⭐ the place itself is swimmable, every way, and cites its water like a shore', async () => {
    const room = pool();
    expect(MixinApi.hasMixin(room, Mixins.Swimmable)).toBe(true);
    expect(MixinApi.isShore(room)).toBe(true);
    expect(room.canEngageAxis('west')).toBe(true);
    expect(await room.settleWater('pool')).not.toBeNull();
    expect(room.canEngageAxis('west')).toBe(true);
  });

  it('⭐ a pool whose water reads frozen is not swum — derived, never authored', async () => {
    source.frozen = true;
    const room = pool();
    await room.settleWater('pool');
    expect(room.canEngageAxis('west')).toBe(false);
  });
});
