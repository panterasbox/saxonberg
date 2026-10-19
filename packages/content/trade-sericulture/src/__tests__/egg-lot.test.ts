/**
 * ⭐ The egg lot — whose race, laid where and when, and ⚠ NOTHING about
 * the disease it carries. A one-brood race will not hatch until it has
 * wintered, and the tray says so in words.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import EggLot from '../thing/EggLot';
import RearingTray from '../thing/RearingTray';
import Strain from '../idea/Strain';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};
const WHITE = '/trade/sericulture/idea/strain/white-one-brood';

function pin(t: Stuff, k: number): void {
  (t as unknown as { lastAmbientK: number }).lastAmbientK = k;
  (t as unknown as { stampedTemperatureK: number }).stampedTemperatureK = k;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  if (!StuffApi.findByTemplatePath(WHITE)) {
    makeStuffAtPath(() => {
      const s = new Strain();
      s.setKey('white-one-brood');
      s.setLabel('one-brood white');
      s.setColour('white');
      s.setBroods(1);
      return s;
    }, WHITE);
  }
});
afterEach(() => WorldClockApi._resetForTesting());

function whiteLot(wintered: boolean, load: number): EggLot {
  const l = makeStuff(() => new EggLot());
  l.setStrainPath(WHITE);
  l.setEggCount(300);
  l.setWintered(wintered);
  l.setPebrineLoad(load);
  l.setLaidWhere('from a grainer over the mountains');
  return l;
}

describe('the egg lot', () => {
  it('⭐ AC 12 — says strain, where and when, and nothing about disease', () => {
    const clean = whiteLot(true, 0.02).provenanceLine();
    const sick = whiteLot(true, 0.8).provenanceLine();
    expect(clean).toMatch(/one-brood white/);
    expect(clean).toMatch(/over the mountains/);
    // ⚠ The two cards read identically.
    expect(sick).toBe(clean);
    expect(clean).not.toMatch(/disease|pebrine|pébrine|speck|sick|infect/i);
  });

  it('a one-brood lot that has not wintered is refused by the tray, in words', () => {
    const t = makeStuff(() => new RearingTray());
    const lot = whiteLot(false, 0);
    pin(lot as unknown as Stuff, 293);
    const veto = t.canAddContainable(lot as never);
    expect(veto.ok).toBe(false);
    expect((veto as { reason: string }).reason).toMatch(/not wintered/);
    expect(lot.provenanceLine()).toMatch(/have not had a winter/);
  });

  it('…and hatches once it has been through a cold spell', () => {
    const t = makeStuff(() => new RearingTray());
    const lot = whiteLot(false, 0);
    pin(lot as unknown as Stuff, 273);
    lot.reconcileChill();
    for (let d = 5; d <= 70; d += 5) {
      setNow(d * DAY);
      pin(lot as unknown as Stuff, 273);
      lot.reconcileChill();
    }
    expect(lot.isReadyToHatch()).toBe(true);
    expect(t.canAddContainable(lot as never).ok).toBe(true);
  });

  it('a lot laid today says so', () => {
    const l = whiteLot(true, 0);
    l.setLaidAt(now);
    expect(l.provenanceLine()).toMatch(/Laid today/);
  });
});
