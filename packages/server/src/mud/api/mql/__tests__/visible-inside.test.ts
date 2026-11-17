/**
 * ⭐⭐ MQL names; acts perceive (size-and-carrying D23, 2026-11-11). ⚠
 * Meaning REVERSED from maritime revision 2′: descending a holder with
 * `:i` yields everything inside it for every viewer — `bob:i` names Bob's
 * pockets too — and the surface that binds or shows it applies
 * `PerceptionApi.perceived` (where a stranger's pockets drop out).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MqlApi } from '../../mql';
import { PerceptionApi } from '../../perception';
import { StuffApi } from '../../stuff';
import { ContainmentApi } from '../../containment';
import Place from '../../../lib/stuff/Place';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { NamedMixin } from '../../../lib/description/Named';
import { SealableMixin } from '../../../lib/spatial/Sealable';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

class Holder extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestHolder';
}
class Item extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestItem';
}
class Chest extends SealableMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))) {
  static _mixinName = 'TestChest';
}

let room: Place;
let viewer: Holder;
let bob: Holder;
let shirt: Item;
let coin: Item;

beforeEach(() => {
  StuffApi.clearAll();
  room = makeStuff(() => new Place());
  viewer = makeStuff(() => new Holder());
  bob = makeStuff(() => new Holder());
  shirt = makeStuff(() => new Item());
  coin = makeStuff(() => new Item());
  for (const [x, into] of [[viewer, room], [bob, room], [shirt, bob], [coin, bob]] as const) {
    ContainmentApi.move(x as never, into as never);
  }
});
afterEach(() => vi.restoreAllMocks());

const ids = (xs: readonly Stuff[]): string[] => xs.map((x) => x.stuffId).sort();

describe('`:i` names everything inside, for everyone (D23)', () => {
  it('⭐⭐ another holder: MQL names the pockets too; the act perceives', () => {
    const rule = vi.spyOn(PerceptionApi, 'visibleContentsOf');
    const r = MqlApi.resolveMany('here:i:i', { commandGiver: viewer as never, scope: '' });
    expect(ids(r.stuff)).toEqual(ids([shirt, coin]));
    expect(rule).not.toHaveBeenCalled();
  });

  it('a shut holder still names its contents; the system and a player get the same list', () => {
    const player = MqlApi.resolveMany(`#${bob.stuffId}:i`, { commandGiver: viewer as never, scope: '' });
    const system = MqlApi.resolveMany(`#${bob.stuffId}:i`, { commandGiver: null, scope: '' });
    expect(ids(player.stuff)).toEqual(ids(system.stuff));
  });

  it('⭐ your own things: everything', () => {
    const r = MqlApi.resolveMany('me:i', { commandGiver: bob as never, scope: '' });
    expect(ids(r.stuff)).toEqual(ids([shirt, coin]));
  });
});

describe('`#<id>` names the thing for everyone; the surface perceives (D23, keeping client-surface D7)', () => {
  it('⭐ an id resolves whatever the viewer perceives', () => {
    vi.spyOn(PerceptionApi, 'perceives').mockReturnValue(false);
    const r = MqlApi.resolveMany(`#${coin.stuffId}`, { commandGiver: viewer as never, scope: '' });
    expect(ids(r.stuff)).toEqual([coin.stuffId]);
  });

  it('⛔ and `perceived` is what keeps an id from reaching a thing out of sight', () => {
    const chest = makeStuff(() => new Chest());
    ContainmentApi.move(chest as never, room as never);
    ContainmentApi.move(coin as never, chest as never);
    chest.setOpen(false);
    const r = MqlApi.resolveMany(`#${coin.stuffId}`, { commandGiver: viewer as never, scope: '' });
    expect(ids(r.stuff)).toEqual([coin.stuffId]);
    expect(PerceptionApi.perceived(viewer, r.stuff)).toEqual([]);
  });

  it('a system query names it too', () => {
    const r = MqlApi.resolveMany(`#${coin.stuffId}`, { commandGiver: null, scope: '' });
    expect(ids(r.stuff)).toEqual([coin.stuffId]);
  });
});
