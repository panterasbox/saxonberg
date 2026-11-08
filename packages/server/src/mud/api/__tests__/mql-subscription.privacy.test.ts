/**
 * ⛔ What a card may be told about ANOTHER PERSON (client-surface W0,
 * #103/#104): the inspection card's `contents` and `mass` fields read the
 * same rule `look` and `inventory` do — never their pockets, never their
 * weight. Your own things, and a chest, are unchanged.
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectSubscribableFields } from '../mql-subscription';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { TangibleMixin } from '../../lib/material/Tangible';
import { VisibleMixin } from '../../lib/description/Visible';
import { Idea } from '../../lib/stuff/Idea';
import { ContainmentApi } from '../containment';
import { PerceptionApi } from '../perception';
import { MixinApi } from '../mixin';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

class Item extends VisibleMixin(ContainableMixin(Idea)) {}
class Holder extends TangibleMixin(ContainerMixin(Idea)) {}

type Read = (stuff: Stuff, viewer: never) => unknown;
const readOf = (host: Stuff, name: string): Read =>
  collectSubscribableFields(host).get(name)!.read as unknown as Read;

describe('card fields about another person', () => {
  let holder: Holder;
  let sword: Item;
  let coin: Item;
  let viewer: Item;

  beforeEach(() => {
    StuffApi.clearAll();
    holder = makeStuff(() => new Holder());
    sword = makeStuff(() => new Item());
    coin = makeStuff(() => new Item());
    viewer = makeStuff(() => new Item());
    ContainmentApi.move(sword, holder);
    ContainmentApi.move(coin, holder);
  });
  afterEach(() => vi.restoreAllMocks());

  it('⛔ contents: only what they hold in view — the coin in their pocket never reaches the wire', () => {
    vi.spyOn(PerceptionApi, 'isAnotherPerson').mockReturnValue(true);
    vi.spyOn(PerceptionApi, 'visibleContentsOf').mockReturnValue({
      worn: [],
      held: [sword],
      carried: [],
      shut: false,
    });
    const refs = readOf(holder, 'contents')(holder, viewer as never) as { stuffId: string }[];
    expect(refs.map((r) => r.stuffId)).toEqual([sword.stuffId]);
  });

  it('a container (or yourself): every visible child, as before', () => {
    vi.spyOn(PerceptionApi, 'isAnotherPerson').mockReturnValue(false);
    const refs = readOf(holder, 'contents')(holder, viewer as never) as { stuffId: string }[];
    expect(refs.map((r) => r.stuffId).sort()).toEqual([sword.stuffId, coin.stuffId].sort());
  });

  it('⛔ mass: absent for another person — a body is weighed by a scale, never a look', () => {
    // The descriptor states `isAnotherPerson`'s rule inline (B6); pin that
    // they agree.
    vi.spyOn(holder, 'isAgent').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isSlotted').mockImplementation(((x: unknown) => x === holder) as never);
    expect(PerceptionApi.isAnotherPerson(viewer, holder)).toBe(true);
    expect(readOf(holder, 'mass')(holder, viewer as never)).toBeUndefined();
  });
});
