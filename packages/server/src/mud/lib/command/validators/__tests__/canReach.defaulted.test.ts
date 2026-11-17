/**
 * ⭐ `canReach` after `readies:` retired (size and carrying D-W10-1/-7/-12):
 * a tool is used where it sits. A named tool packed on the back or in a
 * shut holder is refused naming the next command; one in an OPEN pouch
 * passes and nothing moves; a DEFAULTED tool list passes whole and the
 * controller narrows it (`PerceptionApi.reachableAmong`).
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import canReach from '../canReach';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { PerceptionApi } from '../../../../api/perception';
import { installV1QuantityMarshallers } from '../../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, wornBag } from '../../../slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../security/__tests__/test-setup';
import Location from '../../../location/Location';
import type { Stuff } from '../../../stuff/Stuff';

function staged() {
  const { me, plan } = makeBody();
  const room = makeStuff(() => new Location());
  ContainmentApi.move(me, room);
  const pouch = wornBag(me, plan, 'pouch', 'waist');
  const compass = tool('compass', 0.2);
  ContainmentApi.move(compass, pouch);
  const pack = wornBag(me, plan, 'rucksack', 'back');
  const spare = tool('dial', 0.2);
  ContainmentApi.move(spare, pack);
  const ctx = { commandGiver: me, location: room } as never;
  return { me, room, pouch, compass, pack, spare, ctx };
}

const named = (stuff: Stuff[]) => ({ stuff, raw: 'x' });

describe('canReach — used where it sits (D-W10-7/-12)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a named compass packed on the back is refused naming `remove`', () => {
    const { spare, ctx } = staged();
    expect(canReach(named([spare]), 'tool', ctx)).toBe(
      'Your rucksack is on your back — take it off first (`remove rucksack`).',
    );
  });

  it('a named compass in a SHUT belt pouch is refused naming `open pouch` — never an implicit open', () => {
    const { pouch, compass, ctx } = staged();
    pouch.setOpen(false);
    expect(canReach(named([compass]), 'tool', ctx)).toBe('Your pouch is shut — `open pouch` first.');
    expect(pouch.isOpen()).toBe(false);
  });

  it('in the OPEN pouch it passes, and the compass is still in the pouch after', () => {
    const { me, pouch, compass, ctx } = staged();
    expect(canReach(named([compass]), 'tool', ctx)).toBeUndefined();
    expect(PerceptionApi.reachableAmong(me, [compass])).toEqual([compass]);
    expect(compass.getContainer()).toBe(pouch);
    expect(me.tierOf(compass)).toBe('ready');
  });

  it('a defaulted tool list containing a packed spare passes the validator, and the controller narrows it', () => {
    const { me, compass, spare, ctx, room } = staged();
    const pool = { stuff: [compass, spare], raw: 'reachable:[mixin.ToolMixin]', defaulted: true as const };
    expect(canReach(pool, 'tool', ctx)).toBeUndefined();
    expect(PerceptionApi.reachableAmong(me, pool.stuff, { location: room })).toEqual([compass]);
  });
});
