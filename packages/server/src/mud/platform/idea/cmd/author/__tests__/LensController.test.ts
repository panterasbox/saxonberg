/**
 * ⭐ The builder lens (size-and-carrying D25) — a verb and a memo, never a
 * wizard check. `lens on` memoizes `AccessApi.heldExtents`; inside one of
 * them the builder perceives everything (perceives rule 0) and the
 * surfaces label it `[builder]` (`perceivedHow`); outside, and with the
 * lens off, plainly. A player's body is never under the lens.
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LensController from '../LensController';
import LensOnController from '../LensOnController';
import LensOffController from '../LensOffController';
import Avatar from '../../../../agent/PrimaryAvatar';
import Location from '../../../../../lib/location/Location';
import Thing from '../../../../thing/Thing';
import Holder from '../../../../../lib/stuff/Holder';
import { SealableMixin } from '../../../../../lib/spatial/Sealable';
import { AccessApi } from '../../../../../api/access';
import { MessageApi } from '../../../../../api/message';
import { PerceptionApi } from '../../../../../api/perception';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import type { CommandContext } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';

class Box extends SealableMixin(Holder) {}

let said: string[];
function quietScenes(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      said.push(String(m));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

async function lens(av: Avatar, state?: 'on' | 'off'): Promise<void> {
  const ctrl =
    state === 'on'
      ? makeStuff(() => new LensOnController())
      : state === 'off'
        ? makeStuff(() => new LensOffController())
        : makeStuff(() => new LensController());
  const context = {
    commandGiver: av,
    location: null,
    note: () => undefined,
  } as unknown as CommandContext;
  await ctrl.execute({}, context);
}

describe('lens — the builder lens', () => {
  let shop: Location;
  let street: Location;
  let me: Avatar;
  let coinInShop: Thing;
  let coinOnStreet: Thing;

  const shutBoxWith = (where: Location): Thing => {
    const box = makeStuff(() => new Box());
    const coin = makeStuff(() => new Thing());
    ContainmentApi.move(box, where);
    ContainmentApi.move(coin, box);
    box.setOpen(false);
    return coin;
  };

  beforeEach(() => {
    said = [];
    quietScenes();
    shop = makeStuffAtPath(() => new Location(), '/test/lens/mine/shop');
    street = makeStuffAtPath(() => new Location(), '/test/lens/theirs/street');
    me = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/builder');
    me.setPlayerId('builder');
    ContainmentApi.move(me, shop);
    coinInShop = shutBoxWith(shop);
    coinOnStreet = shutBoxWith(street);
    vi.spyOn(AccessApi, 'heldExtents').mockImplementation(async (subject) =>
      (subject as Stuff | null)?.stuffId === me.stuffId ? ['/test/lens/mine'] : [],
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('off by default: plain perception; bare `lens` reports', async () => {
    expect(PerceptionApi.perceives(me, coinInShop)).toBe(false);
    await lens(me);
    expect(said.join('\n')).toMatch(/off/);
  });

  it('⭐ on: inside a held extent everything is perceived, and labelled builder; outside, plainly', async () => {
    await lens(me, 'on');
    expect(me.lensExtents()).toEqual(['/test/lens/mine']);
    expect(PerceptionApi.perceives(me, coinInShop)).toBe(true);
    expect(PerceptionApi.perceivedHow(me, coinInShop)).toBe('builder');
    expect(PerceptionApi.perceives(me, coinOnStreet)).toBe(false);
    expect(PerceptionApi.perceivedHow(me, coinOnStreet)).toBe(null);
    await lens(me, 'off');
    expect(me.lensExtents()).toBeNull();
    expect(PerceptionApi.perceives(me, coinInShop)).toBe(false);
  });

  it("never another player's body, nor what is on it", async () => {
    const other = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/other');
    other.setPlayerId('other');
    ContainmentApi.move(other, shop);
    const purse = makeStuff(() => new Thing());
    ContainmentApi.move(purse, other);
    await lens(me, 'on');
    expect(PerceptionApi.perceivedHow(me, purse)).not.toBe('builder');
  });

  it('holding no extent, `lens on` says there is nothing to show and stays off', async () => {
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue([]);
    await lens(me, 'on');
    expect(me.lensExtents()).toBeNull();
    expect(said.join('\n')).toMatch(/no extent/);
  });

  it('⛔ the lens is the extents you HOLD — there is no way to hand a character others', async () => {
    expect((me as unknown as Record<string, unknown>).setLensExtents).toBeUndefined();
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue(['/test/lens/mine']);
    expect(await me.lensOn()).toEqual(['/test/lens/mine']);
  });
});
