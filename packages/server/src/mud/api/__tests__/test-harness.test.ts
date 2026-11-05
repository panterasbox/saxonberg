/**
 * `TestHarnessApi` — test-world staging, the one implementation behind
 * the harness routes and the `testharness` command.
 *
 * ⛔ The span rule is pinned at the Api, below both doors: a jump past
 * one game day is refused BEFORE it moves anything unless the caller is
 * a soak run. And every static here must be `@TestOnly`, so a seam added
 * later cannot forget the mark and go live in a world somebody plays in.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestHarnessApi } from '../test-harness';
import { WorldClockApi } from '../worldclock';
import { SecurityApi } from '../security';
import { StuffApi } from '../stuff';
import { PersistableApi } from '../persistable';
import { GovernmentApi } from '../government';
import ShipRegister from '../../platform/idea/ShipRegister';
import Ship from '../../platform/idea/Ship';
import ExpanseNode from '../../platform/idea/ExpanseNode';
import { Expanse } from '../../lib/expanse/Expanse';
import { GeoPosition } from '../../lib/expanse/GeoPosition';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import { Template } from '../../lib/stuff/Template';

const DAY_S = 86_400;

/** A concrete sea (Expanse is abstract). */
class TestSea extends Expanse {}

describe('TestHarnessApi', () => {
  beforeEach(() => WorldClockApi._resetForTesting());
  afterEach(() => WorldClockApi._resetForTesting());

  describe('advanceClock — the line is one game day', () => {
    it('a day or less moves the clock', async () => {
      const a = await TestHarnessApi.advanceClock('20 hours');
      expect(a.after - a.before).toBeCloseTo(20 * 3600, 3);
      const b = await TestHarnessApi.advanceClock('1 day');
      expect(b.after - b.before).toBeCloseTo(DAY_S, 3);
    });

    it('⛔ past a day is a span step: refused, naming the rule and the fix', async () => {
      await expect(TestHarnessApi.advanceClock('25 hours')).rejects.toThrow(
        /SPAN step.*one game day.*No merge waits on the clock.*\.soak\..*wire:soak/s,
      );
    });

    it('⭐ the refusal leaves the clock where it was', async () => {
      const before = TestHarnessApi.clockNow();
      await expect(TestHarnessApi.advanceClock('2 days')).rejects.toThrow();
      expect(TestHarnessApi.clockNow()).toBeCloseTo(before, 0);
    });

    it('a soak run is let through', async () => {
      const j = await TestHarnessApi.advanceClock('2 days', { soak: true });
      expect(j.after - j.before).toBeCloseTo(2 * DAY_S, 3);
      expect(typeof j.settledMs).toBe('number');
    });

    it('the clock\'s own refusals still come back', async () => {
      await expect(TestHarnessApi.advanceClock('soon')).rejects.toThrow(
        /cannot parse duration/,
      );
    });

    it('the cap is a day in seconds', () => {
      expect(TestHarnessApi.BLOCKING_JUMP_CAP_S).toBe(DAY_S);
    });
  });

  describe('stageShip — the staged twin of sailing her there (harbors P25)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('⭐ at a node: cast off from her berth, no course, lying at the node on its chart', async () => {
      const sea = makeStuffAtPath(() => new TestSea(), '/test/sea');
      sea.setOrigin(new GeoPosition(42, -8.5));
      const node = makeStuffAtPath(() => new ExpanseNode(), '/test/sea/island');
      node.setFocus({ rho: 0, theta: 0 });
      node.setFrame(sea);
      const ship = makeStuffAtPath(() => new Ship(), '/test/hesper/structure');
      const live = new Map<string, Stuff>([
        ['/test/sea', sea as unknown as Stuff],
        ['/test/sea/island', node as unknown as Stuff],
        ['/test/hesper/structure', ship as unknown as Stuff],
      ]);
      vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => {
        const s = live.get(p);
        if (!s) throw new Error(`no fixture ${p}`);
        return s;
      }) as never);
      vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined as never);
      // The sea compiles no rows of its own here (adopting her is what is asked).
      vi.spyOn(Template, 'findDescendants').mockResolvedValue([]);
      vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
      ship.setBerth('/test/landing');
      ship.setMoored(true);
      const castOff = vi.spyOn(ship, 'castOff').mockResolvedValue(undefined);
      const r = await TestHarnessApi.stageShip('/test/hesper/structure', { at: { node: '/test/sea/island' } });
      expect(castOff).toHaveBeenCalled();
      expect(r.frame).toBe('/test/sea');
      expect(ship.getCourse()).toBeNull();
      expect(ship.getExpanse()).toBe('/test/sea');
      expect(ship.getExpansePosition()?.distanceNm(new GeoPosition(42, -8.5))).toBeLessThan(0.01);
    });

    it('⭐ B6: a ship named by her register NAME is read in ONE government\'s register (Terminus by default, or `flag`)', async () => {
      const gov = (key: string, reg: string) => ({
        key, name: key, description: '', charter: '', treasury: '', departments: [], seats: [], standards: [], shipRegister: reg,
      });
      const govs = vi.spyOn(GovernmentApi, 'getGovernment').mockImplementation((k: string) =>
        k === 'terminus-city' ? gov(k, '/test/reg/terminus') : k === 'test-isle' ? gov(k, '/test/reg/isle') : null,
      );
      const terminus = makeStuffAtPath(() => new ShipRegister(), '/test/reg/terminus');
      const isle = makeStuffAtPath(() => new ShipRegister(), '/test/reg/isle');
      const named = vi.spyOn(terminus, 'entryNamed').mockResolvedValue(null);
      await expect(TestHarnessApi.stageShip('Petrel', { hull: 'worn' })).rejects.toThrow(/register of terminus-city has no ship named 'Petrel'/);
      expect(named).toHaveBeenCalledWith('Petrel');
      await expect(TestHarnessApi.stageShip('Petrel', { hull: 'worn', flag: 'nowhere' })).rejects.toThrow(/nowhere keeps no register/);
      // Named under another flag: that government's register is the one read; her handle is what is looked up.
      vi.spyOn(isle, 'entryNamed').mockResolvedValue({ key: '/stuff/idea/Ship/smack/abc' } as never);
      vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => {
        if (p === '/test/reg/isle') return isle;
        throw new Error('none');
      }) as never);
      await expect(TestHarnessApi.stageShip('Petrel', { hull: 'worn', flag: 'test-isle' })).rejects.toThrow(/'\/stuff\/idea\/Ship\/smack\/abc' is not a ship/);
      govs.mockRestore();
    });

    it('a ship that is not one, or a place that is no node, is refused in words', async () => {
      vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('none') as never);
      await expect(TestHarnessApi.stageShip('/test/nothing', { at: { node: '/n' } })).rejects.toThrow(/is not a ship/);
    });
  });

  it('⭐ every static function on TestHarnessApi is @TestOnly', () => {
    const marked = SecurityApi.getTestOnlyMembers(TestHarnessApi);
    const statics = Object.getOwnPropertyNames(TestHarnessApi).filter(
      (n) =>
        typeof (TestHarnessApi as unknown as Record<string, unknown>)[n] ===
        'function',
    );
    expect(statics.length).toBeGreaterThan(0);
    for (const name of statics) {
      expect(marked?.has(name), `${name} is not @TestOnly`).toBe(true);
    }
  });
});
