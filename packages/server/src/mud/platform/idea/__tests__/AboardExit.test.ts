/**
 * ⭐⭐ The way aboard answers for whatever lies ALONGSIDE (paint review):
 * derived from where the ship IS, synchronously, over what is standing —
 * never the authored berth. A ship that has sailed lands nowhere, even
 * though the exit's destination still names her deck; a sea whose nodes
 * nothing has loaded yet answers "nothing", never a guess; an ordinary exit
 * answers `undefined` (its far side is its path).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AboardExit from '../AboardExit';
import ExpanseNode from '../ExpanseNode';
import Ship from '../Ship';
import Exit from '../../../lib/boundary/Exit';
import { Expanse } from '../../../lib/expanse/Expanse';
import { GeoPosition } from '../../../lib/expanse/GeoPosition';
import Location from '../../location/Location';
import { Template } from '../../../lib/stuff/Template';
import { StuffApi } from '../../../api/stuff';
import { attachGraph } from '../../../lib/location/__tests__/attachments-fixture';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';

class TestSea extends Expanse {}

const SEA = '/test/_aboard/sea';
const ORIGIN = new GeoPosition(50, -4);
const HESPER = '/world/_aboard/hesper';
const DECK = `${HESPER}/deck`;
const QUAY = '/world/_aboard/quay';

let sea: TestSea;
let ship: Ship;
let quay: Location;
let aboard: AboardExit;
const live = new Map<string, Stuff>();

beforeEach(() => {
  StuffApi.clearAll();
  live.clear();
  sea = makeStuffAtPath(() => new TestSea(), SEA);
  sea.setOrigin(ORIGIN);
  live.set(SEA, sea);
  // The node that lands at the quay: at the origin, 500 m across.
  const node = makeStuffAtPath(() => new ExpanseNode(), `${SEA}/the-quay`);
  node.setKind('place');
  node.setFocus({ rho: 0, theta: 0, radius: 500 });
  node.setDestination(QUAY);
  live.set(`${SEA}/the-quay`, node);
  vi.spyOn(Template, 'findDescendants').mockImplementation(async () =>
    [...live.keys()].filter((p) => p !== SEA).map((path) => ({ path, data: {} }) as unknown as Template),
  );
  vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
    const s = live.get(path);
    if (!s) throw new Error(`no fixture at ${path}`);
    return s as never;
  });

  ship = makeStuffAtPath(() => new Ship(), `${HESPER}/structure`);
  ship.setExtent(HESPER);
  ship.setEntrance(DECK);
  ship.setExpanse(SEA);
  ship.setExpansePosition(ORIGIN);
  attachGraph({ [HESPER]: [[`${HESPER}/structure`, 'structure']] });

  quay = makeStuffAtPath(() => new Location(), QUAY);
  aboard = makeStuff(() => new AboardExit({ direction: 'aboard', source: quay as Stuff & Container, destinationTemplatePath: DECK } as never));
});

afterEach(() => vi.restoreAllMocks());

describe('the way aboard — alongside, derived', () => {
  it('⭐ a ship lying inside the node that lands here is alongside', async () => {
    await sea.nodes();
    expect(aboard.alongsideNow()).toBe(ship);
  });

  it('⭐ before anything has loaded the sea’s nodes it answers nothing — null, never the berth', () => {
    expect(aboard.alongsideNow()).toBeNull();
  });

  it('⭐ a ship that has sailed lands nowhere, though the berth still names her deck', async () => {
    await sea.nodes();
    ship.setCourse({ bearingDeg: 90 } as never);
    expect(aboard.getDestinationTemplatePath()).toBe(DECK);
    expect(aboard.alongsideNow()).toBeNull();
  });

  it('a ship lying elsewhere on her sea is not alongside', async () => {
    await sea.nodes();
    ship.setExpansePosition(new GeoPosition(50.5, -4));
    expect(aboard.alongsideNow()).toBeNull();
  });

  it('an ordinary exit answers undefined: its far side is its path', () => {
    const lane = makeStuffAtPath(() => new Location(), '/world/_aboard/lane');
    const plain = makeStuff(() => new Exit({ direction: 'north', source: quay as Stuff & Container, destination: lane as Stuff & Container }));
    expect(plain.alongsideNow()).toBeUndefined();
  });
});
