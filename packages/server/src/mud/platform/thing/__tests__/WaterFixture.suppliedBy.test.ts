/**
 * A tap reads the main it is plumbed to (pump build D10).
 *
 * ⭐⭐ The vocabulary shipped and the tap's reading of it did not: no
 * fixture in the realm knew what fed it. A tap with `suppliedBy` runs only
 * while its main delivers, says why in the six-word vocabulary's own gloss
 * when it does not, and `analyze water` at the tap reads the MAIN.
 *
 * ⚠ An empty `suppliedBy` is every tap that shipped before, unchanged; an
 * unresolvable main fails OPEN and logs once.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaterFixture from '../WaterFixture';
import Good from '../../../lib/stuff/Good';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { Mml } from '../../../api/mml';
import type { SupplyReport, SupplyState } from '../../../lib/supply/SupplyState';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

const MAIN = '/test/thing/main';

class FakeMain extends Good {
  public state: SupplyState | null = null;
  supplyStateNow(): SupplyState | null {
    return this.state;
  }
  async supplyReport(): Promise<SupplyReport> {
    return { label: 'the main', state: this.state, lines: ['it is the main'] };
  }
}

function tap(suppliedBy: string): WaterFixture {
  return makeStuff(() => {
    const t = new WaterFixture();
    t.setShortDescription('standpipe');
    t.setLongDescription('A pipe with a tap on it.');
    t.interiorBulk = true;
    (t as unknown as { suppliedBy: string }).suppliedBy = suppliedBy;
    const water = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('water');
      return m;
    }, '/stuff/idea/material/bulk/water') as unknown as Material;
    t.setBulkMaterial('interior', water);
    return t;
  });
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a tap on a main', () => {
  it('runs while the main delivers', () => {
    const main = makeStuffAtPath(() => new FakeMain(), MAIN) as FakeMain;
    main.state = null;
    const t = tap(MAIN);
    expect(t.supplyStateNow()).toBeNull();
    expect(t.isBulkEmpty('interior')).toBe(false);
    expect(t.getBulkAvailable('interior')).toBe(Infinity);
  });

  it('⭐ reads empty and says why when the main is off', () => {
    const main = makeStuffAtPath(() => new FakeMain(), MAIN) as FakeMain;
    main.state = 'off';
    const t = tap(MAIN);
    expect(t.supplyStateNow()).toBe('off');
    expect(t.isBulkEmpty('interior')).toBe(true);
    expect(t.getBulkAvailable('interior')).toBe(0);
    const text = Mml.augment('A pipe with a tap on it.', t, t);
    expect(text).toContain('Nothing comes out of it: it has been shut off.');
  });

  it('analyze water at the tap reads the main', async () => {
    const main = makeStuffAtPath(() => new FakeMain(), MAIN) as FakeMain;
    main.state = 'off';
    const report = await tap(MAIN).supplyReport(0);
    expect(report.label).toBe('the main');
    expect(report.state).toBe('off');
  });

  it('an unplumbed tap is every tap that shipped before', () => {
    const t = tap('');
    expect(t.supplyStateNow()).toBeNull();
    expect(t.isBulkEmpty('interior')).toBe(false);
    expect(Mml.augment('A pipe.', t, t)).not.toContain('Nothing comes out');
  });

  it('an unresolvable main fails OPEN and logs once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const t = tap('/test/nowhere/thing/main');
    expect(t.supplyStateNow()).toBeNull();
    expect(t.isBulkEmpty('interior')).toBe(false);
    t.supplyStateNow();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
