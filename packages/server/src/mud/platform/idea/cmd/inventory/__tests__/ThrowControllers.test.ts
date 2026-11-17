/**
 * The three shapes of `throw` (controllers-are-io D10): one controller per
 * act. Which line binds which shape is `command-binder-throw.test.ts`; this is
 * what each says and calls.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import { CombatApi } from '../../../../../api/combat';
import { ContainmentApi } from '../../../../../api/containment';
import type { CommandContext } from '../../../../../api/command';
import { Idea } from '../../../../../lib/stuff/Idea';
import Place from '../../../../../lib/stuff/Place';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { ThrownLanding } from '../../../../../lib/material/ThrownLanding';
import ThrowController from '../ThrowController';
import ThrowToController from '../ThrowToController';
import ThrowAtController from '../ThrowAtController';

class Rock extends ContainableMixin(NamedMixin(Idea)) {}
class Thrower extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {
  public deliverThrown = vi.fn();
  public mayDeliverTo = vi.fn(() => ({ ok: true }));
}

let lines: string[];
let notes: { kind: string; reason?: string }[];

function context(giver: unknown): CommandContext {
  return {
    commandGiver: giver,
    location: null,
    note: (n: { kind: string; reason?: string }) => notes.push(n),
  } as unknown as CommandContext;
}

function scene(): { room: Place; giver: Thrower; rock: Rock } {
  const room = makeStuff(() => new Place());
  const giver = makeStuff(() => new Thrower());
  ContainmentApi.move(giver, room);
  const rock = makeStuff(() => new Rock());
  rock.setName('rock');
  ContainmentApi.move(rock, giver);
  return { room, giver, rock };
}

beforeEach(() => {
  lines = [];
  notes = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      lines.push(String(m));
      return b;
    };
    b.toPeers = () => b;
    b.toTarget = () => b;
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(CombatApi, 'splashSetFor').mockReturnValue([]);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('throw', () => {
  it('pitches it onto the floor: no target, no fight', async () => {
    const { room, giver, rock } = scene();
    await makeStuff(() => new ThrowController()).execute(
      { item: { stuff: rock, raw: 'rock' } } as never,
      context(giver),
    );
    expect(rock.getContainer()).toBe(room);
    expect(lines.join(' ')).toMatch(/hurl/);
    expect(giver.deliverThrown).not.toHaveBeenCalled();
  });
});

describe('throw to', () => {
  it('a thing with no answer to being caught is refused, and stays', async () => {
    const { giver, rock } = scene();
    await makeStuff(() => new ThrowToController()).execute(
      { item: { stuff: rock, raw: 'rock' }, recipient: 'ann' } as never,
      context(giver),
    );
    expect(notes.map((n) => n.reason)).toEqual(['not-tossable']);
    expect(rock.getContainer()).toBe(giver);
  });
});

describe('throw at', () => {
  it('the arrival is the thrower\'s; the words are the controller\'s', async () => {
    const { room, giver, rock } = scene();
    const post = makeStuff(() => new Rock());
    ContainmentApi.move(post, room);
    giver.deliverThrown.mockResolvedValue({ arrived: 'wide' });
    await makeStuff(() => new ThrowAtController()).execute(
      { item: { stuff: rock, raw: 'rock' }, target: { stuff: post, raw: 'post' } } as never,
      context(giver),
    );
    expect(giver.deliverThrown).toHaveBeenCalledWith(rock, post);
    expect(lines.join(' ')).toMatch(/goes wide/);
  });

  it('it starts nothing when it would catch a bystander', async () => {
    const { room, giver, rock } = scene();
    const post = makeStuff(() => new Rock());
    ContainmentApi.move(post, room);
    giver.mayDeliverTo.mockReturnValue({ ok: false, refusedBy: post } as never);
    await makeStuff(() => new ThrowAtController()).execute(
      { item: { stuff: rock, raw: 'rock' }, target: { stuff: post, raw: 'post' } } as never,
      context(giver),
    );
    expect(giver.deliverThrown).not.toHaveBeenCalled();
    expect(notes.map((n) => n.reason)).toEqual(['splash-would-catch-a-bystander']);
  });

  it('you cannot throw it at yourself', async () => {
    const { giver, rock } = scene();
    await makeStuff(() => new ThrowAtController()).execute(
      { item: { stuff: rock, raw: 'rock' }, target: { stuff: giver, raw: 'me' } } as never,
      context(giver),
    );
    expect(notes.map((n) => n.reason)).toEqual(['self-target']);
  });
});

describe('what becomes of the thing', () => {
  it('a thing with no strength of its own shatters; the landing ends it', async () => {
    const { room, rock } = scene();
    const post = makeStuff(() => new Rock());
    ContainmentApi.move(post, room);
    const out = await new ThrownLanding(rock, post, {
      profile: { energyJ: 50 },
      shares: [],
      spilled: 0,
    }).land();
    expect(out.arrived).toBe('shattered');
    if (out.arrived !== 'shattered') return;
    // Not until the words for the shattering have been said.
    expect(rock.isDestroyed()).toBe(false);
    expect(await out.spatter()).toEqual([]);
    expect(rock.isDestroyed()).toBe(true);
  });

  it('a throw that goes wide or strikes leaves the hand and lands by the target (C50)', async () => {
    const { room, giver, rock } = scene();
    const post = makeStuff(() => new Rock());
    ContainmentApi.move(post, room);
    new ThrownLanding(rock, post, { profile: { energyJ: 1 }, shares: [], spilled: 0 }).settle();
    expect(rock.getContainer()).toBe(room);
    expect(rock.getContainer()).not.toBe(giver);
  });
});

describe('letting go (C51)', () => {
  it('a thing the body will not release is not thrown', async () => {
    const { room, giver, rock } = scene();
    (giver as unknown as Record<string, unknown>).tryReleaseFromSlots = vi.fn(
      () => ({ released: false, dumpedTau: 0 }),
    );
    const { MixinApi } = await import('../../../../../api/mixin');
    vi.spyOn(MixinApi, 'isSlotted').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isSlottable').mockReturnValue(true);
    await makeStuff(() => new ThrowController()).execute(
      { item: { stuff: rock, raw: 'rock' } } as never,
      context(giver),
    );
    expect(notes.map((n) => n.reason)).toEqual(['cursed-will-not-release']);
    expect(rock.getContainer()).toBe(giver);
    expect(rock.getContainer()).not.toBe(room);
  });

  it('a released thing leaves its slot before it flies', async () => {
    const { room, giver, rock } = scene();
    const release = vi.fn(() => ({ released: true, vacated: 1 }));
    (giver as unknown as Record<string, unknown>).tryReleaseFromSlots = release;
    // The giver poses as slotted (below); the chokepoint reads its slots as
    // a thing leaves it (size and carrying: no phantom occupant), so it
    // answers with none — the release above already vacated.
    (giver as unknown as Record<string, unknown>).getAllOccupants = () => new Map();
    const { MixinApi } = await import('../../../../../api/mixin');
    vi.spyOn(MixinApi, 'isSlotted').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isSlottable').mockReturnValue(true);
    await makeStuff(() => new ThrowController()).execute(
      { item: { stuff: rock, raw: 'rock' } } as never,
      context(giver),
    );
    expect(release).toHaveBeenCalledWith(rock);
    expect(rock.getContainer()).toBe(room);
  });
});
