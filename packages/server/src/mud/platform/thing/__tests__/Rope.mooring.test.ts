/**
 * ⭐⭐ The end across (cordage's rope, no mooring
 * protocol): a STRUCTURE ties the free end of a rope lying in one of its
 * rooms round a fixture in another. The rope stays aboard and its end lies
 * on the quay tied round the bollard; `untie` that end on the quay (it comes
 * into your hands — cordage's act) or cast the rope off aboard, and the
 * structure is told.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Rope from '../Rope';
import RopeEnd from '../RopeEnd';
import Bollard from '../Bollard';
import Structure from '../../../lib/structure/Structure';
import { TemplatePaths } from '../../../lib/paths';
import Location from '../../location/Location';
import { Character } from '../../../lib/character/Character';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath, seedKernelContentStore } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Body extends Character {}

/** A ship, as a rope sees her: a structure whose extent holds her deck. */
class Hull extends Structure {
  public told: Stuff[] = [];
  public override onLineLetGo(line: Stuff): void {
    this.told.push(line);
  }
}

const KNOTS = { warmed: async () => ({ label: 'made fast with a clove hitch', strength: 0.6 }) };

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/platform/thing/rope-end') return makeStuff(() => new RopeEnd());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
  const realSingleton = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === TemplatePaths.jointCatalogue) return KNOTS;
    return (realSingleton as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.singleton);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

async function moored(): Promise<{ quay: Location; deck: Location; line: Rope; bollard: Bollard; ship: Hull }> {
  const quay = makeStuffAtPath(() => new Location(), '/test/harbor/quay');
  const deck = makeStuffAtPath(() => new Location(), '/test/ship/deck');
  const bollard = makeStuff(() => new Bollard());
  bollard.setShortDescription('bollard');
  ContainmentApi.move(bollard as never, quay as never);
  const line = makeStuffAtPath(() => new Rope(), '/platform/thing/mooring-line');
  line.setLengthM(30);
  line.setShortDescription('mooring line');
  ContainmentApi.move(line as never, deck as never);
  const ship = makeStuffAtPath(() => new Hull(), '/test/ship/structure');
  ship.setName('the Hesper');
  ship.setExtent('/test/ship');
  return { quay, deck, line, bollard, ship };
}

function endOn(quay: Location): RopeEnd | undefined {
  return quay.getContents().find((c) => c instanceof RopeEnd) as RopeEnd | undefined;
}

describe('the end across (harbors P6, review 1)', () => {
  it('⭐ a structure ties the end of its rope round a bollard in another room: the rope stays aboard, its end lies on the quay tied round it, saying whose it is', async () => {
    const { quay, deck, line, bollard, ship } = await moored();
    const out = await line.tieTo(ship as unknown as Stuff, bollard as unknown as Stuff, 'clove-hitch');
    expect(out.ok).toBe(true);
    expect(deck.getContents()).toContain(line);
    const end = endOn(quay);
    expect(end).toBeDefined();
    expect(end!.getShortDescription()).toBe('line from the Hesper');
    expect(end!.getLongDescription()).toMatch(/A mooring line comes ashore from the Hesper, made fast round .*bollard with a clove hitch/);
    expect(end!.getLashedTo()).toBe(bollard);
    expect(end!.isFixedInPlace()).toBe(true);
    expect(line.acrossTo()).toBe(bollard);
    expect(line.acrossFor()).toBe(ship);
    // ⭐ Made fast across, the rope stays where it is.
    expect(line.isFixedInPlace()).toBe(true);
  });

  it('⭐⭐ `untie` the end on the quay: it comes into your hands (cordage), and the structure is told', async () => {
    const { quay, line, bollard, ship } = await moored();
    await line.tieTo(ship as unknown as Stuff, bollard as unknown as Stuff, 'clove-hitch');
    const end = endOn(quay)!;
    const hand = makeStuff(() => new Body());
    ContainmentApi.move(hand as never, quay as never);
    const out = await end.untieBy(hand as unknown as Stuff);
    expect(out.ok).toBe(true);
    expect(hand.getContents()).toContain(end);
    expect(ship.told).toEqual([line]);
    expect(line.acrossTo()).toBeNull();
    expect(line.isFixedInPlace()).toBe(false);
  });

  it('cast off aboard by hand (`untie` the rope where it lies), the end comes in and the structure is told', async () => {
    const { quay, deck, line, bollard, ship } = await moored();
    await line.tieTo(ship as unknown as Stuff, bollard as unknown as Stuff, 'clove-hitch');
    const hand = makeStuff(() => new Body());
    ContainmentApi.move(hand as never, deck as never);
    const out = await line.untieBy(hand as unknown as Stuff);
    expect(out.ok).toBe(true);
    expect(endOn(quay)).toBeUndefined();
    expect(ship.told).toEqual([line]);
  });

  it('only the structure the rope lies in can throw its end across', async () => {
    const { line, bollard } = await moored();
    const other = makeStuffAtPath(() => new Hull(), '/test/other/structure');
    other.setExtent('/test/other');
    const out = await line.tieTo(other as unknown as Stuff, bollard as unknown as Stuff, null);
    expect(out).toMatchObject({ ok: false, reason: 'not-hers' });
  });

  it('a thing that is no fixture, or one in the same room, is refused', async () => {
    const { deck, quay, line, ship } = await moored();
    const loose = makeStuff(() => new Body());
    ContainmentApi.move(loose as never, quay as never);
    expect(await line.tieTo(ship as unknown as Stuff, loose as unknown as Stuff, null)).toMatchObject({ ok: false, reason: 'not-a-fixture' });
    const bitts = makeStuff(() => new Bollard());
    ContainmentApi.move(bitts as never, deck as never);
    expect(await line.tieTo(ship as unknown as Stuff, bitts as unknown as Stuff, null)).toMatchObject({ ok: false, reason: 'same-room' });
  });
});
