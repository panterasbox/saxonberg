/**
 * ⭐ Percolation (sugar D3): liquid put on a porous solid works down
 * through it over the host's days; each advance tells the host how far it
 * got, and what comes out goes to the vessel below.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import { PercolatingMixin } from '../Percolating';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff } from '../../security/__tests__/test-setup';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { EventApi } from '../../../api/event';
import { stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';
import '../../../platform/idea/WorldClockRegistry';
import Place from '../../stuff/Place';
import Material from '../Material';
import Floor from '../../../platform/thing/Floor';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { PourAnswer } from '../../bulk/PourTarget';

class Jug extends BulkableMixin(Good) {
  static _mixinName = 'TestPercolatingJug';
}
class Room extends Place {}

const WATER = '/stuff/idea/material/_percolate/water';
function water(): Material {
  return (
    StuffApi.findByTemplatePath<Material>(WATER) ??
    (makeStuffAtPath(() => {
      const m = new Material();
      m.setName('water');
      m.setDensity(Quantity.of(1000, 'kg/m³'));
      m.setTags(['liquid']);
      return m;
    }, WATER) as unknown as Material)
  );
}

/** Run a pour answer to its end (a heap's pour takes no time). */
async function poured(answer: PourAnswer): Promise<string> {
  if (!answer.ok) return answer.reason;
  const done = await answer.onComplete();
  return done.ok ? done.facts.kind : done.reason;
}

const DAY = 86_400;
let now = 1_000_000;

class Loaf extends PercolatingMixin(Good) {
  static _mixinName = 'TestPercolatingLoaf';
  public steps: Array<[number, number]> = [];
  public override percolationDays(): number {
    return 10;
  }
  public override onPercolated(from: number, to: number): void {
    this.steps.push([from, to]);
  }
}

describe('PercolatingMixin', () => {
  beforeEach(async () => {
    // A host-bound clock wake (the set's, D8) listens for its host's
    // destruct, which needs the event registry.
    const events = await StuffApi.create(() => new EventRegistry());
    stampTemplatePathForTest(events, '/platform/idea/EventRegistry');
    EventApi._setRegistryForTesting(events);
    WorldClockApi._resetForTesting();
    now = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  const advance = (gameS: number): void => {
    now += (gameS / 1000) * 1000;
  };

  it('nothing moves until liquid is put on it', () => {
    const l = makeStuff(() => new Loaf());
    expect(MixinApi.isPercolating(l)).toBe(true);
    advance(5 * DAY);
    expect(l.getReach()).toBe(0);
  });

  it('⭐ reaches down over its days, telling the host each step', () => {
    const l = makeStuff(() => new Loaf());
    l.receivePercolant(2);
    advance(5 * DAY);
    expect(l.getReach()).toBeCloseTo(0.5, 6);
    advance(10 * DAY);
    expect(l.getReach()).toBe(1);
    expect(l.getPercolantL()).toBe(0);
    expect(l.getPercolant()).toBeNull();
    expect(l.steps.map(([, to]) => Number(to.toFixed(3)))).toEqual([0.5, 1]);
  });

  it('standing nowhere, nothing is under it', () => {
    expect(makeStuff(() => new Loaf()).dripSlots()).toEqual([]);
  });

  /** Move the injected clock THROUGH the clock, so due wakes fire (D8). */
  const through = (gameS: number): void => {
    WorldClockApi._advanceForTesting(gameS);
    now += gameS;
  };

  it('⭐ a heap left alone is through at its due time, with nobody reading it (crowded-rooms D8)', () => {
    const l = makeStuff(() => new Loaf());
    l.receivePercolant(2);
    through(10 * DAY - 60);
    expect(l.steps).toEqual([]);
    through(120);
    // No read of the loaf: the wake brought it through.
    expect(l.steps.map(([, to]) => to)).toEqual([1]);
    expect(l.getPercolantL()).toBe(0);
  });

  it('a loaf read every game hour and one never read come through at the same moment', () => {
    const read = makeStuff(() => new Loaf());
    const left = makeStuff(() => new Loaf());
    read.receivePercolant(2);
    left.receivePercolant(2);
    let readAt = -1;
    let leftAt = -1;
    for (let h = 1; h <= 10 * 24 + 2; h++) {
      through(3_600);
      read.getReach();
      if (readAt < 0 && read.getPercolantL() === 0) readAt = h;
      if (leftAt < 0 && left.getPercolantL() === 0) leftAt = h;
    }
    expect(leftAt).toBeGreaterThan(0);
    expect(readAt).toBe(leftAt);
  });

  it('a restart mid-leach re-arms from the persisted due time', () => {
    const before = makeStuff(() => new Loaf());
    before.receivePercolant(2);
    through(4 * DAY);
    const after = makeStuff(() => new Loaf());
    void after.setPercolant(before.getPercolant());
    after.percolationReach = before.percolationReach;
    after.percolationStamp = before.percolationStamp;
    const due = before.percolationWakeAtS;
    before.setPercolationWakeAtS(0);
    after.setPercolationWakeAtS(due);
    through(6 * DAY + 60);
    expect(after.getPercolantL()).toBe(0);
  });

  it('⭐ a liquid POURED on it comes out of the bottom as the reach advances, onto the floor (D10b)', async () => {
    const room = makeStuff(() => new Room());
    const floor = makeStuff(() => new Floor());
    floor.surfaceBulk = true;
    floor.setSurfaceCapacity(Quantity.of(100, 'L'));
    room.addFixture(floor);
    const heap = makeStuff(() => new Loaf());
    ContainmentApi.move(heap, room);
    const jug = makeStuff(() => new Jug());
    jug.interiorBulk = true;
    jug.setInteriorCapacity(Quantity.of(5, 'L'));
    jug.setBulkMaterial('interior', water());
    jug.setBulkAmount('interior', Quantity.of(2, 'L'));
    expect(MixinApi.isPourTarget(heap)).toBe(true);
    expect(await poured(heap.receivePour({ by: jug, source: jug }))).toBe('poured');
    expect(jug.getBulkAmount('interior').rawValue()).toBe(0);
    expect(heap.getPercolant()?.material).toBe(WATER);
    through(5 * DAY);
    heap.getReach();
    expect(floor.getBulkAmount('surface').rawValue()).toBeCloseTo(1, 6);
    through(5 * DAY + 60);
    expect(floor.getBulkAmount('surface').rawValue()).toBeCloseTo(2, 6);
    expect(heap.getPercolant()).toBeNull();
  });
});
