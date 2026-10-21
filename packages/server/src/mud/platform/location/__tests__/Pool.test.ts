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
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import GoodClass from '../../thing/Good';
import { BuoyMixin } from '../../../lib/location/Buoy';
import Material from '../../idea/material/Material';
import { Quantity } from '../../../lib/quantity';
import { ContainmentApi } from '../../../api/containment';

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

  it('⭐ a dense thing sinks — unless something in the same water buoys it (drive run 34)', () => {
    const room = pool();
    const iron = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('pool-test-iron');
      m.setDensity(Quantity.of(7870, 'kg/m³'));
      return m;
    }, '/stuff/idea/material/_test/pool-test-iron') as unknown as Material;
    const anchor = makeStuff(() => {
      const g = new GoodClass();
      g.setMass(Quantity.of(300, 'kg'));
      g.setMaterial(iron);
      return g;
    });
    ContainmentApi.move(anchor as never, room as never);
    expect(room.sinks(anchor as unknown as Stuff)).toBe(true);
    class Bag extends BuoyMixin(GoodClass) {
      public held: Stuff | null = null;
      public override buoys(thing: Stuff): boolean { return thing === this.held; }
    }
    const bag = makeStuff(() => new Bag());
    ContainmentApi.move(bag as never, room as never);
    expect(room.sinks(anchor as unknown as Stuff)).toBe(true);
    bag.held = anchor as unknown as Stuff;
    expect(room.sinks(anchor as unknown as Stuff)).toBe(false);
  });
});
