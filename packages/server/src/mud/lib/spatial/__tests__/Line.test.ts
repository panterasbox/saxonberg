/**
 * ⭐⭐ The line (underwater C1; kernel since cordage D1): heave the end to
 * somebody in the water below the quay; they are held up by it; their tug
 * reaches the holder and nobody else; `pull` brings them up and out — and
 * nobody can tug a line whose end they do not hold. Driven through a ROPE,
 * the line every lifeline is now; and the rope's tie — to a person, round a
 * post, and off again.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Rope from '../../../platform/thing/Rope';
import RopeEnd from '../../../platform/thing/RopeEnd';
import LineEnd from '../../../platform/thing/LineEnd';
import Good from '../../../platform/thing/Good';
import Location from '../../../platform/location/Location';
import { Character } from '../../character/Character';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';

class Body extends Character {}

async function scene(): Promise<{ quay: Location; water: Location; tender: Body; swimmer: Body; line: Rope }> {
  const quay = makeStuffAtPath(() => new Location(), '/test/diving/quay');
  const water = makeStuffAtPath(() => new Location(), '/test/diving/water');
  await water.addBidirectionalExit(quay as never, 'up', { opposite: 'down' });
  const tender = makeStuff(() => new Body());
  const swimmer = makeStuff(() => new Body());
  tender.setMass(Quantity.of(70, 'kg'));
  swimmer.setMass(Quantity.of(70, 'kg'));
  ContainmentApi.move(tender as never, quay as never);
  ContainmentApi.move(swimmer as never, water as never);
  const line = makeStuff(() => new Rope());
  ContainmentApi.move(line as never, tender as never);
  return { quay, water, tender, swimmer, line };
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/platform/thing/rope-end') return makeStuff(() => new RopeEnd());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the line (underwater C1, cordage D1)', () => {
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

describe('the rope\'s tie (cordage D8)', () => {
  it('⭐ tied to a person, they are on the free end; untied, they are off it', async () => {
    const { quay, tender, line } = await scene();
    const mate = makeStuff(() => new Body());
    ContainmentApi.move(mate as never, quay as never);
    const out = await line.tieTo(tender as unknown as Stuff, mate as unknown as Stuff, null);
    expect(out.ok).toBe(true);
    expect(line.getOnEnd()).toBe(mate);
    expect(mate.getContents().some((c) => c instanceof RopeEnd)).toBe(true);
    expect((await line.untieBy(tender as unknown as Stuff)).ok).toBe(true);
    expect(line.getOnEnd()).toBeNull();
  });

  it('⭐ tied round a post, the rope stays where it was tied; untied, it is in hand again', async () => {
    const { quay, tender, line } = await scene();
    const post = makeStuffAtPath(() => new Good(), '/test/diving/post');
    ContainmentApi.move(post as never, quay as never);
    const out = await line.tieTo(tender as unknown as Stuff, post as unknown as Stuff, null);
    expect(out.ok).toBe(true);
    expect(line.getContainer()).toBe(quay);
    expect(line.getAnchor()).toBe(post);
    expect(line.isFixedInPlace()).toBe(true);
    expect((await line.untieBy(tender as unknown as Stuff)).ok).toBe(true);
    expect(line.getContainer()).toBe(tender);
    expect(line.getAnchor()).toBeNull();
  });

  it('nobody ties a rope they are not holding, or to somebody not here', async () => {
    const { tender, swimmer, line } = await scene();
    expect(await line.tieTo(swimmer as unknown as Stuff, tender as unknown as Stuff, null)).toMatchObject({ ok: false });
    expect(await line.tieTo(tender as unknown as Stuff, swimmer as unknown as Stuff, null)).toMatchObject({ ok: false, reason: 'out-of-reach' });
  });
});
