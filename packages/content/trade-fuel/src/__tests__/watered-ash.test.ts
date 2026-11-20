/**
 * ⭐⭐ Water poured on a heap of ash comes out of the bottom as lye
 * (matter-model-overlaps D10b): the heap is a pour target, keeps what was
 * poured on it, and as the water works down it leaves by the one drip — on
 * a bare floor, a puddle of lye as strong as the heap's alkali makes it.
 * (The hopper's own leach, in place, is the chandlery's soap test,
 * unchanged.)
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ash from '../thing/Ash';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Floor from '@saxonberg/server/mud/platform/thing/Floor';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { EventApi } from '@saxonberg/server/mud/api/event';
import EventRegistry from '@saxonberg/server/mud/platform/idea/EventRegistry';
import { LyeStrength } from '@saxonberg/server/mud/lib/cleanliness/LyeStrength';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

class Pail extends BulkableMixin(Good) {
  static _mixinName = 'WateredAshPail';
}
class Room extends Place {}

const POTASH = '/stuff/idea/material/mineral/potash';
const WATER = '/stuff/idea/material/_ash/water';
const LYE = '/stuff/idea/material/_ash/lye';
const DAY = 86_400;
let now = 1_000_000;

function liquid(path: string, tags: string[]): Material {
  return (
    StuffApi.findByTemplatePath<Material>(path) ??
    (makeStuffAtPath(() => {
      const m = new Material();
      m.setName(path.split('/').pop()!);
      m.setDensity(Quantity.of(1000, 'kg/m³'));
      m.setTags(tags);
      return m;
    }, path) as unknown as Material)
  );
}

function through(gameS: number): void {
  WorldClockApi._advanceForTesting(gameS);
  now += gameS;
}

describe('⭐⭐ ash heaped on a floor and watered', () => {
  beforeEach(async () => {
    const events = await StuffApi.create(() => new EventRegistry());
    stampTemplatePathForTest(events, '/platform/idea/EventRegistry');
    EventApi._setRegistryForTesting(events);
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    now = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const c = makeStuff(() => new Good());
      stampTemplatePathForTest(c, path);
      return c;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('pools lye on the floor, as strong as the heap makes it', async () => {
    liquid(LYE, ['liquid', 'lye', 'caustic']);
    const room = makeStuff(() => new Room());
    const floor = makeStuff(() => new Floor());
    floor.surfaceBulk = true;
    floor.setSurfaceCapacity(Quantity.of(100, 'L'));
    room.addFixture(floor);

    const heap = makeStuff(() => new Ash());
    heap.setMass(Quantity.of(2, 'kg'));
    heap.setMakeup([{ materialPath: POTASH, fraction: 0.15 }]);
    heap.setLeachesTo(LYE);
    ContainmentApi.move(heap, room);

    const pail = makeStuff(() => new Pail());
    pail.interiorBulk = true;
    pail.setInteriorCapacity(Quantity.of(5, 'L'));
    pail.setBulkMaterial('interior', liquid(WATER, ['liquid', 'water']));
    pail.setBulkAmount('interior', Quantity.of(1, 'L'));
    ContainmentApi.move(pail, room);

    // ⭐ The destination decides: the heap answers `pour`.
    expect(MixinApi.isPourTarget(heap)).toBe(true);
    const answer = heap.receivePour({ by: pail, source: pail });
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    const done = await answer.onComplete();
    expect(done.ok && done.facts.kind).toBe('poured');
    expect(pail.getBulkAmount('interior').rawValue()).toBe(0);

    // Half a game day for the water to work down through a heap of ash.
    through(0.25 * DAY);
    heap.getReach();
    expect(floor.getBulkMaterialPath('surface')).toBe(LYE);
    expect(floor.getBulkAmount('surface').rawValue()).toBeCloseTo(0.5, 6);
    through(0.25 * DAY + 60);
    expect(floor.getBulkAmount('surface').rawValue()).toBeCloseTo(1, 6);
    // 2 kg × 0.15 alkali, all of it into the one litre.
    const payload = floor.getBulkPayload('surface');
    expect(payload?.dissolvedSolidsKgPerL).toBeCloseTo(0.3, 6);
    expect(payload?.grade).toBe(new LyeStrength(0.3).gradeBand());
  });
});
