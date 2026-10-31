/**
 * ⭐⭐ A rope is a mooring line (harbors P6, re-seated on cordage's rope):
 * made fast round a bollard, the rope stays aboard and its end lies on the
 * quay tied round the bollard; `untie` that end on the quay and the line is
 * off and the ship is told; brought in from aboard, she is not (she asked).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Rope from '../Rope';
import RopeEnd from '../RopeEnd';
import Good from '../Good';
import Location from '../../location/Location';
import { Character } from '../../../lib/character/Character';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath, seedKernelContentStore } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Body extends Character {}

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

async function moored(): Promise<{
  quay: Location;
  deck: Location;
  line: Rope;
  bollard: Good;
  ship: { getName(): string; lineCastOff: ReturnType<typeof vi.fn> };
}> {
  const quay = makeStuffAtPath(() => new Location(), '/test/harbor/quay');
  const deck = makeStuffAtPath(() => new Location(), '/test/ship/deck');
  const bollard = makeStuff(() => new Good());
  ContainmentApi.move(bollard as never, quay as never);
  const line = makeStuffAtPath(() => new Rope(), '/platform/thing/mooring-line');
  line.setLengthM(30);
  ContainmentApi.move(line as never, deck as never);
  const ship = { getName: () => 'the Hesper', lineCastOff: vi.fn() };
  return { quay, deck, line, bollard, ship };
}

function endOn(quay: Location): RopeEnd | undefined {
  return quay.getContents().find((c) => c instanceof RopeEnd) as RopeEnd | undefined;
}

describe('a rope is a mooring line (harbors P6)', () => {
  it('⭐ by the kernel protocol, as long as it is', async () => {
    const { line } = await moored();
    expect(MixinApi.isMooringLine(line as unknown as Stuff)).toBe(true);
    expect(line.lineLengthM()).toBe(30);
  });

  it('⭐ made fast round a bollard, the rope stays aboard and its end lies on the quay tied round it, saying whose it is', async () => {
    const { quay, deck, line, bollard, ship } = await moored();
    expect(await line.makeFastRound(bollard as unknown as Stuff, ship)).toBe(true);
    expect(deck.getContents()).toContain(line);
    const end = endOn(quay);
    expect(end).toBeDefined();
    expect(end!.getShortDescription()).toBe('line from the Hesper');
    expect(end!.getLashedTo()).toBe(bollard);
    expect(end!.isFixedInPlace()).toBe(true);
    expect(line.isMadeFast()).toBe(true);
    expect(line.madeFastTo()).toBe(bollard);
  });

  it('⭐⭐ `untie` the end on the quay: the line is off, the end goes, and the ship is told', async () => {
    const { quay, line, bollard, ship } = await moored();
    await line.makeFastRound(bollard as unknown as Stuff, ship);
    const end = endOn(quay)!;
    const hand = makeStuff(() => new Body());
    ContainmentApi.move(hand as never, quay as never);
    const out = await end.untieBy(hand as unknown as Stuff);
    expect(out.ok).toBe(true);
    expect(out.line).toMatch(/falls slack/);
    expect(ship.lineCastOff).toHaveBeenCalledWith(line);
    expect(line.isMadeFast()).toBe(false);
    expect(end.isDestroyed()).toBe(true);
    expect(hand.getContents()).not.toContain(end);
  });

  it('cast off from aboard by hand (the rope\'s own cast-off), the ship is told too', async () => {
    const { line, bollard, ship } = await moored();
    await line.makeFastRound(bollard as unknown as Stuff, ship);
    await line.castOff();
    expect(ship.lineCastOff).toHaveBeenCalledWith(line);
    expect(line.isMadeFast()).toBe(false);
  });

  it('brought in from aboard by the ship, the end goes and the ship is not told (she asked)', async () => {
    const { quay, line, bollard, ship } = await moored();
    await line.makeFastRound(bollard as unknown as Stuff, ship);
    await line.castOffMooring();
    expect(endOn(quay)).toBeUndefined();
    expect(ship.lineCastOff).not.toHaveBeenCalled();
  });

  it('a rope tied off round a post here has no end to spare for a bollard', async () => {
    const { deck, line, bollard, ship } = await moored();
    const post = makeStuff(() => new Good());
    ContainmentApi.move(post as never, deck as never);
    vi.spyOn(line, 'getAnchor').mockReturnValue(post as unknown as Stuff);
    expect(await line.makeFastRound(bollard as unknown as Stuff, ship)).toBe(false);
  });
});
