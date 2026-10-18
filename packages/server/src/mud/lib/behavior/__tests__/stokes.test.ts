/**
 * `stokes` — a hand on shift keeps the house's fire going (the repair
 * build's browser walk: nothing ever lit Berta's forge, so every metal
 * mend she was paid for was refused until a player lit it for her).
 *
 * Real forge, real stoke and ignite; only "on shift, serving here" is
 * stubbed (`isFulfilling`), because that is the employment suite's claim.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as stokes } from '../stokes';
import type { BrainContext } from '../brain';
import Forge from '../../../platform/thing/Forge';
import Scrap from '../../../platform/thing/Scrap';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { EmployedMixin } from '../../employment/Employed';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { fuelMaterial } from '../../fire/__tests__/burner-fuel';
import { makeStuff } from '../../security/__tests__/test-setup';

class Room extends ContainerMixin(Idea) {
  static _mixinName = 'StokesTestRoom';
}
class Hand extends EmployedMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'StokesTestHand';
}

let room: Room;
let hand: Hand;
let forge: Forge;
let said: string[];

/** A lump of `kg` of something that burns — tagged `fuel`, or not. */
function lump(kg: number, isFuel: boolean): Scrap {
  const s = makeStuff(() => new Scrap());
  const m = fuelMaterial(30, isFuel ? 'charcoal' : 'ash-wood');
  m.setTags(isFuel ? ['fuel', 'carbon'] : ['wood']);
  s.setMaterial(m);
  s.setMass(Quantity.of(kg, 'kg'));
  s.setShortDescription(isFuel ? 'basket of charcoal' : 'ash handle');
  return s;
}

function ctx(): BrainContext {
  return {
    host: hand as unknown as Stuff,
    config: {},
    state: {},
    trigger: { source: 'candidate', raw: 'candidate' },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  };
}

beforeEach(() => {
  said = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toPeers = (m: unknown) => {
      said.push(String(m));
      return b;
    };
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
  room = makeStuff(() => new Room());
  hand = makeStuff(() => new Hand());
  forge = makeStuff(() => new Forge());
  forge.setFuelCapacityKg(20);
  // Banked, as the smithy's row authors it (a Burner defaults to lit).
  (forge as unknown as { lit: boolean }).lit = false;
  ContainmentApi.move(forge, room);
  ContainmentApi.move(hand, room);
  vi.spyOn(hand, 'isFulfilling').mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('stokes', () => {
  it('⭐ on shift at a cold forge with charcoal to hand: lays it in and lights it', async () => {
    ContainmentApi.move(lump(2, true), room);
    expect(forge.isLit()).toBe(false);
    expect(stokes.urgency(ctx()).band).toBe('wanted');
    await stokes.act(ctx());
    expect(forge.fuelRemaining()).toBeCloseTo(2, 6);
    expect(forge.isLit()).toBe(true);
    expect(said.join(' ')).toMatch(/lays a basket of charcoal in/);
    expect(said.join(' ')).toMatch(/alight/);
  });

  it('⛔ never feeds the house its own goods — a burnable thing that is not FUEL stays put', async () => {
    const handle = lump(2, false);
    ContainmentApi.move(handle, room);
    expect(stokes.urgency(ctx()).band).toBe('idle');
    await stokes.act(ctx());
    expect(forge.fuelRemaining()).toBe(0);
    expect(forge.isLit()).toBe(false);
    expect(handle.isDestroyed()).toBe(false);
  });

  it('off shift, the fire is not hers to tend', async () => {
    vi.spyOn(hand, 'isFulfilling').mockReturnValue(false);
    ContainmentApi.move(lump(2, true), room);
    expect(stokes.urgency(ctx()).band).toBe('idle');
    await stokes.act(ctx());
    expect(forge.isLit()).toBe(false);
  });

  it('a lit forge with a full bed wants nothing; a failing one is fed from the hand\'s own pockets', async () => {
    ContainmentApi.move(lump(5, true), room);
    await stokes.act(ctx());
    expect(forge.isLit()).toBe(true);
    expect(stokes.urgency(ctx()).band).toBe('idle');
    // Burnt down to a scrap, with charcoal carried:
    (forge as unknown as { fuelBed: Record<string, number> }).fuelBed = Object.fromEntries(
      Object.keys((forge as unknown as { fuelBed: Record<string, number> }).fuelBed).map((k) => [k, 0.2]),
    );
    ContainmentApi.move(lump(2, true), hand);
    expect(stokes.urgency(ctx()).band).toBe('wanted');
    await stokes.act(ctx());
    expect(forge.fuelRemaining()).toBeCloseTo(2.2, 6);
  });
});
