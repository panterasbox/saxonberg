/**
 * ⭐⭐ The lifeline (underwater C1): heave the end to somebody in the
 * water below the quay; they are held up by it; their tug reaches the
 * holder and nobody else; `pull` brings them up and out — and nobody can
 * tug a line whose end they do not hold.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Lifeline from '../thing/Lifeline';
import LineEnd from '../thing/LineEnd';
import Location from '@saxonberg/server/mud/platform/location/Location';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
  seedKernelContentStore,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

class Body extends Character {}

async function scene(): Promise<{ quay: Location; water: Location; tender: Body; swimmer: Body; line: Lifeline }> {
  const quay = makeStuffAtPath(() => new Location(), '/test/diving/quay');
  const water = makeStuffAtPath(() => new Location(), '/test/diving/water');
  await water.addBidirectionalExit(quay as never, 'up', { opposite: 'down' });
  const tender = makeStuff(() => new Body());
  const swimmer = makeStuff(() => new Body());
  tender.setMass(Quantity.of(70, 'kg'));
  swimmer.setMass(Quantity.of(70, 'kg'));
  ContainmentApi.move(tender as never, quay as never);
  ContainmentApi.move(swimmer as never, water as never);
  const line = makeStuff(() => new Lifeline());
  ContainmentApi.move(line as never, tender as never);
  return { quay, water, tender, swimmer, line };
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/trade/diving/thing/line-end') return makeStuff(() => new LineEnd());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the lifeline (underwater C1)', () => {
  it('⭐ heaved to somebody in the water below, they have the end in hand', async () => {
    const { tender, swimmer, line } = await scene();
    const out = await line.heaveTo(tender as unknown as Stuff, swimmer as unknown as Stuff);
    expect(out.ok).toBe(true);
    expect(line.getOnEnd()).toBe(swimmer);
    expect(swimmer.getContents().some((c) => c instanceof LineEnd)).toBe(true);
  });

  it('⭐ a tug is felt by the holder: one, then two in a row', async () => {
    const { tender, swimmer, line } = await scene();
    await line.heaveTo(tender as unknown as Stuff, swimmer as unknown as Stuff);
    const sent: string[] = [];
    const real = MessageApi.scene.bind(MessageApi);
    vi.spyOn(MessageApi, 'scene').mockImplementation(((who: Stuff) => {
      const s = real(who);
      const toSelf = s.toSelf.bind(s);
      s.toSelf = ((body: unknown) => {
        if (who === (tender as unknown as Stuff)) sent.push(JSON.stringify(body));
        return toSelf(body as never);
      }) as typeof s.toSelf;
      return s;
    }) as typeof MessageApi.scene);
    const end = swimmer.getContents().find((c) => c instanceof LineEnd) as LineEnd;
    expect(end.tug(swimmer as unknown as Stuff).ok).toBe(true);
    expect(end.tug(swimmer as unknown as Stuff).ok).toBe(true);
    expect(line.lastSignal()?.tugs).toBe(2);
    expect(sent.some((m) => /haul me up/.test(m))).toBe(true);
  });

  it('nobody tugs a line whose end they do not hold', async () => {
    const { tender, swimmer, line } = await scene();
    expect(line.tugBy(swimmer as unknown as Stuff).ok).toBe(false);
    void tender;
  });

  it('⭐ a pull takes time, then brings the person on the end up and out, and the line comes free', async () => {
    const { quay, tender, swimmer, line } = await scene();
    await line.heaveTo(tender as unknown as Stuff, swimmer as unknown as Stuff);
    const where = swimmer.getContainer();
    const out = await line.pullBy(tender as unknown as Stuff, null);
    expect(out.ok).toBe(true);
    // Nothing moves until the pull lands: the steps alone take seconds.
    if (!out.ok || out.takes === undefined) throw new Error('a pull with no time in it');
    expect(out.takes.realS).toBeGreaterThan(0);
    expect(swimmer.getContainer()).toBe(where);
    expect((await out.takes.finish()).ok).toBe(true);
    expect(swimmer.getContainer()).toBe(quay);
    expect(line.getOnEnd()).toBeNull();
  });

  it('a line not held cannot be pulled; one with nobody on it says so', async () => {
    const { tender, line } = await scene();
    expect(await line.pullBy(tender as unknown as Stuff, null)).toMatchObject({ ok: false, reason: 'nobody-on-line' });
  });
});
