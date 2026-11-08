/**
 * ⭐ The room-listing predicates (controllers-are-io D22; the
 * mql-predicate-parity slate): `:loose`, `:worn`, `:carried`, and `:visible`
 * as the listing reads it. Each DELEGATES — `:loose` to the holder's
 * `getLooseContents()`, `:worn`/`:carried` to its `Slotted.getAllOccupants()`
 * — so what `look`, `sense` and the inspection card list is a query a
 * player can type: `here:i:visible:loose:[not mixin.AdornmentMixin] - me`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MqlApi } from '../../mql';
import { StuffApi } from '../../stuff';
import { ContainmentApi } from '../../containment';
import { PerceptionApi } from '../../perception';
import Place from '../../../lib/stuff/Place';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { SlottedMixin } from '../../../lib/slot/Slotted';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { VisibleMixin } from '../../../lib/description/Visible';
import { PerceptibleMixin } from '../../../lib/description/Perceptible';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

class Person extends SlottedMixin(ContainerMixin(ContainableMixin(VisibleMixin(PerceptibleMixin(Idea))))) {}
class Gear extends SlottableMixin(ContainableMixin(VisibleMixin(PerceptibleMixin(Idea)))) {}

let room: Place;
let bob: Person;
let shirt: Gear;
let coin: Gear;
let desk: Gear;
let ledger: Gear;

const ids = (xs: readonly Stuff[]): string[] => xs.map((x) => x.stuffId).sort();
const q = (query: string): string[] =>
  ids(MqlApi.resolveMany(query, { commandGiver: bob as never, scope: 'here' }).stuff);

beforeEach(() => {
  StuffApi.clearAll();
  room = makeStuff(() => new Place());
  bob = makeStuff(() => new Person());
  shirt = makeStuff(() => new Gear());
  coin = makeStuff(() => new Gear());
  desk = makeStuff(() => new Gear());
  ledger = makeStuff(() => new Gear());
  ContainmentApi.move(bob as never, room as never);
  ContainmentApi.move(shirt as never, bob as never);
  ContainmentApi.move(coin as never, bob as never);
  ContainmentApi.move(desk as never, room as never);
  ContainmentApi.move(ledger as never, room as never);
  // The shirt is in one of bob's slots; the coin is only in his pockets.
  vi.spyOn(bob, 'getAllOccupants').mockReturnValue(new Map([['torso', new Set([shirt as never])]]));
});
afterEach(() => vi.restoreAllMocks());

describe('`:worn` and `:carried` partition a holder', () => {
  it('⭐ the shirt is worn, the coin carried — never both', () => {
    expect(q('me:i:worn')).toEqual(ids([shirt]));
    expect(q('me:i:carried')).toEqual(ids([coin]));
  });

  it('a room\'s contents occupy no slot of a non-Slotted room: all carried, none worn', () => {
    expect(q('here:i:worn')).toEqual([]);
    expect(q('here:i:carried')).toEqual(ids([bob, desk, ledger]));
  });
});

describe('`:loose` delegates to the holder\'s getLooseContents()', () => {
  it('⭐ the ledger placed ON the desk is not loose; the desk is', () => {
    vi.spyOn(room, 'getLooseContents').mockImplementation(() => [bob, desk]);
    expect(q('here:i:loose')).toEqual(ids([bob, desk]));
  });
});

describe('`:visible` — composes Visible and the giver perceives it', () => {
  it('⭐ `me:i:visible` answers (the grammar\'s own example used to be empty)', () => {
    expect(q('me:i:visible')).toEqual(ids([shirt, coin]));
  });

  it('a thing the giver does not perceive is not visible', () => {
    vi.spyOn(PerceptionApi, 'perceives').mockImplementation((_v, t) => t !== desk);
    expect(q('here:i:visible - me')).toEqual(ids([ledger]));
  });
});
