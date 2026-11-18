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
    expect(l.steps.map(([, to]) => Number(to.toFixed(3)))).toEqual([0.5, 1]);
  });

  it('with nothing beneath, what comes out goes nowhere', () => {
    expect(makeStuff(() => new Loaf()).percolatesInto()).toBeNull();
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
    expect(l.percolantL).toBe(0);
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
      if (readAt < 0 && read.percolantL === 0) readAt = h;
      if (leftAt < 0 && left.percolantL === 0) leftAt = h;
    }
    expect(leftAt).toBeGreaterThan(0);
    expect(readAt).toBe(leftAt);
  });

  it('a restart mid-leach re-arms from the persisted due time', () => {
    const before = makeStuff(() => new Loaf());
    before.receivePercolant(2);
    through(4 * DAY);
    const after = makeStuff(() => new Loaf());
    after.percolantL = before.percolantL;
    after.percolationReach = before.percolationReach;
    after.percolationStamp = before.percolationStamp;
    const due = before.percolationWakeAtS;
    before.setPercolationWakeAtS(0);
    after.setPercolationWakeAtS(due);
    through(6 * DAY + 60);
    expect(after.percolantL).toBe(0);
  });
});
