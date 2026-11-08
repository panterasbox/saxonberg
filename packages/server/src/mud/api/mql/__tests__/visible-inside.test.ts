/**
 * ⭐⭐ The one visibility rule lives in the query language (maritime
 * revision 2′): descending a holder with `:i` yields what the VIEWER may
 * see inside it (`PerceptionApi.visibleContentsOf`) — so `bob:i` names
 * what Bob wears and holds, never his pockets, for `query`, `look` and a
 * script alike. Your own things, and system mode, are everything.
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
import type { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

class Holder extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestHolder';
}
class Item extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestItem';
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

describe('`:i` names only what the viewer may see', () => {
  it('⭐⭐ another holder: exactly what the visibility rule allows — the pockets stay pockets', () => {
    const rule = vi.spyOn(PerceptionApi, 'visibleContentsOf').mockImplementation((v, t) =>
      t === bob ? { worn: [shirt], held: [], carried: [], shut: false } : { worn: [], held: [], carried: [viewer, bob], shut: false },
    );
    const r = MqlApi.resolveMany('here:i:i', { commandGiver: viewer as never, scope: '' });
    expect(ids(r.stuff)).toEqual([shirt.stuffId]);
    expect(rule).toHaveBeenCalledWith(viewer, bob);
  });

  it('a shut holder yields nothing', () => {
    vi.spyOn(PerceptionApi, 'visibleContentsOf').mockImplementation((v, t) =>
      t === bob ? { worn: [], held: [], carried: [], shut: true } : { worn: [], held: [], carried: [viewer, bob], shut: false },
    );
    expect(MqlApi.resolveMany('here:i:i', { commandGiver: viewer as never, scope: '' }).stuff).toEqual([]);
  });

  it('⭐ your own things: everything (what you hid on yourself you still know)', () => {
    const rule = vi.spyOn(PerceptionApi, 'visibleContentsOf');
    const r = MqlApi.resolveMany('me:i', { commandGiver: bob as never, scope: '' });
    expect(ids(r.stuff)).toEqual(ids([shirt, coin]));
    expect(rule).not.toHaveBeenCalledWith(bob, bob);
  });
});

describe('`#<id>` names only what the viewer perceives (client-surface D7)', () => {
  it('⭐ a perceived thing resolves by id — the card\'s links address by it', () => {
    vi.spyOn(PerceptionApi, 'perceives').mockReturnValue(true);
    const r = MqlApi.resolveMany(`#${coin.stuffId}`, { commandGiver: viewer as never, scope: '' });
    expect(ids(r.stuff)).toEqual([coin.stuffId]);
  });

  it('⛔ an unperceived one resolves to nothing for a player', () => {
    vi.spyOn(PerceptionApi, 'perceives').mockImplementation((_v, t) => t !== coin);
    const r = MqlApi.resolveMany(`#${coin.stuffId}`, { commandGiver: viewer as never, scope: '' });
    expect(r.stuff).toEqual([]);
  });

  it('a system query is ungated', () => {
    vi.spyOn(PerceptionApi, 'perceives').mockReturnValue(false);
    const r = MqlApi.resolveMany(`#${coin.stuffId}`, { commandGiver: null, scope: '' });
    expect(ids(r.stuff)).toEqual([coin.stuffId]);
  });
});
