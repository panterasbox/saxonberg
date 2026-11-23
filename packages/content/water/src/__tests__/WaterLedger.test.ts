/**
 * ⭐ The water ledger (persistence-model D5) — the commons' history is
 * filed as documents, so a restage never refills a valley a junior pumped
 * dry and never forgets who opened a gate.
 *
 *  - An aquifer's draws and a gate's setting are filed by the act, and a
 *    fresh instance (the restart) reads them back as it stands up.
 *  - A burst of acts is single-flight: one write in flight, the latest
 *    state queued behind it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { StoredDocument } from '@saxonberg/server/mud/lib/document/StoredDocument';
import Aquifer from '../idea/Aquifer';
import Gate from '../thing/Gate';
import WaterLedger from '../idea/WaterLedger';

let docs: Map<string, Record<string, unknown>>;
let writes: number;

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
}

beforeEach(() => {
  StuffApi.clearAll();
  docs = new Map();
  writes = 0;
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(1_000_000, 's'));
  const ledger = makeStuffAtPath(() => {
    const l = new WaterLedger();
    l.setRegisterPrefix('/system/water/ledger');
    l.setRegisterOwner('/system/water');
    l.setRegisterKind('water-ledger');
    return l;
  }, WaterLedger.PATH);
  vi.spyOn(WaterLedger, 'get').mockResolvedValue(ledger);
  vi.spyOn(DocumentApi, 'saveToRegister').mockImplementation(async (_r, path, data) => {
    writes++;
    docs.set(path, JSON.parse(JSON.stringify(data)) as Record<string, unknown>);
  });
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const data = docs.get(path);
    return (data ? ({ getData: () => data } as unknown as StoredDocument) : null);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const AQUIFER = '/stuff/idea/Aquifer/_test-valley';

describe('⭐ the water ledger', () => {
  it('an aquifer’s draws are filed by the draw and read back by a fresh aquifer (the restart)', async () => {
    const a = makeStuffAtPath(() => {
      const x = new Aquifer();
      x.setCapacityM3(1000);
      return x;
    }, AQUIFER);
    a.recordDraw(250_000, 1_000_000); // 250 m³
    await settle();
    expect(docs.get(`/system/water/ledger${AQUIFER}`)?.drawnM3).toBeCloseTo(250, 6);

    StuffApi.unregister(a);
    const b = makeStuffAtPath(() => {
      const x = new Aquifer();
      x.setCapacityM3(1000);
      return x;
    }, AQUIFER);
    expect((await Aquifer.hydrateFromSource(b)).status).toBe('hydrated');
    // No rain to recharge it in a test world: the level is what was left.
    expect(b.levelM3(1_000_000)).toBeCloseTo(750, 6);
  });

  it('a gate’s setting and work log are filed by the turn and read back', async () => {
    const g = makeStuffAtPath(() => {
      const x = new Gate();
      x.setCapacityM3S(0.1);
      return x;
    }, '/world/_test/thing/headgate');
    g.setOpening(0.5);
    await settle();
    const filed = docs.get('/system/water/ledger/world/_test/thing/headgate');
    expect(filed?.opening).toBe(0.5);

    StuffApi.unregister(g);
    const g2 = makeStuffAtPath(() => new Gate(), '/world/_test/thing/headgate');
    expect(g2.getOpening()).toBe(0);
    await Gate.hydrateFromSource(g2);
    expect(g2.getOpening()).toBe(0.5);
    expect(g2.ledgerRecord().workLog).toEqual(filed?.workLog);
  });

  it('a burst of draws is single-flight: at most one write in flight and one queued', async () => {
    const a = makeStuffAtPath(() => {
      const x = new Aquifer();
      x.setCapacityM3(1000);
      return x;
    }, AQUIFER);
    for (let i = 0; i < 20; i++) a.recordDraw(1000, 1_000_000);
    await settle();
    expect(writes).toBeLessThanOrEqual(3);
    expect(docs.get(`/system/water/ledger${AQUIFER}`)?.drawnM3).toBeCloseTo(20, 6);
  });
});
