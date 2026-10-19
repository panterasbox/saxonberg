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
  beforeEach(() => {
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
});
