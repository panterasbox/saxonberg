/**
 * ⭐⭐ **The landing** (paint build, W0) — *a place that does not hold its
 * own air, with an exit into a member that is enclosed or is the
 * structure's entrance, or with the structure lying alongside.*
 *
 * The face rule that answers `holdsAir()` has its own suite
 * (`Exposure.test.ts`); here each room's exposure and exits are stubbed to
 * the answer the case needs, so what is under test is the landing rule:
 * a street before a house, a closet, a neighbour's parlour, a courtyard,
 * a shed inside a warehouse, a ship alongside and the berth she left.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Stuff } from '../../stuff/Stuff';
import Location from '../../location/Location';
import Structure from '../../../platform/idea/Structure';
import { StuffApi } from '../../../api/stuff';
import { NavigationApi } from '../../../api/navigation';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import { attachGraph } from '../../location/__tests__/attachments-fixture';

const TOWN = '/world/_land';

interface FakeExit {
  alongsideNow(): Stuff | null;
  lyingAlongside(): Promise<Stuff | null>;
  peekDestination(): Stuff | null;
  getDestinationTemplatePath(): string | null;
}

function room(path: string, holdsAir: boolean): Location {
  const r = makeStuffAtPath(() => new Location(), path);
  (r as unknown as { exposure: () => unknown }).exposure = () => ({ holdsAir: () => holdsAir });
  exits(r, []);
  return r;
}

function to(dest: Stuff | string, alongside: Stuff | null = null): FakeExit {
  const isPath = typeof dest === 'string';
  return {
    alongsideNow: () => alongside,
    lyingAlongside: async () => alongside,
    peekDestination: () => (isPath ? null : dest),
    getDestinationTemplatePath: () => (isPath ? dest : dest.getTemplatePath()),
  };
}

function exits(r: Stuff, list: FakeExit[]): void {
  const map = new Map(list.map((e, i) => [`e${i}`, e]));
  (r as unknown as { getExits: () => unknown }).getExits = () => map;
}

function building(key: string, entrance: string | null): Structure {
  const s = makeStuffAtPath(() => new Structure(), `${TOWN}/${key}/structure`);
  s.setExtent(`${TOWN}/${key}`);
  s.setEntrance(entrance);
  return s;
}

afterEach(() => {
  StuffApi.clearAll();
});

describe('a street before a house', () => {
  let house: Structure;
  let street: Location;
  let hall: Location;
  let closet: Location;

  beforeEach(() => {
    house = building('house', `${TOWN}/house/hall`);
    street = room(`${TOWN}/street`, false);
    hall = room(`${TOWN}/house/hall`, true);
    closet = room(`${TOWN}/house/closet`, true);
    exits(street, [to(hall)]);
    exits(hall, [to(street), to(closet)]);
    exits(closet, [to(hall)]);
    attachGraph({ [`${TOWN}/house`]: [[`${TOWN}/house/structure`, 'structure']] });
  });

  it('the street is a landing: it holds no air and leads into the hall', () => {
    expect(house.isLandedAt(street)).toBe(true);
  });

  it('the entrance clause holds even when the hall is not standing', () => {
    exits(street, [to(`${TOWN}/house/hall`)]);
    expect(house.isLandedAt(street)).toBe(true);
  });

  it('a closet holds its own air, so it is no landing', () => {
    expect(house.isLandedAt(closet)).toBe(false);
    expect(house.isLandedAt(hall)).toBe(false);
  });

  it('the house finds its own landings among what is standing', () => {
    expect(house.landingsNow().map((r) => r.getTemplatePath())).toEqual([`${TOWN}/street`]);
  });

  it('the navigation read names the house from the street and not from the hall', () => {
    expect(NavigationApi.structuresLandedAtNow(street).map((s) => s.getTemplatePath())).toEqual([
      `${TOWN}/house/structure`,
    ]);
    expect(NavigationApi.structuresLandedAtNow(hall)).toEqual([]);
  });
});

describe('a back door into an unenclosed member is no landing', () => {
  it('a yard behind the house leads into a member that holds no air', () => {
    const house = building('row', `${TOWN}/row/front`);
    const lane = room(`${TOWN}/lane`, false);
    const scullery = room(`${TOWN}/row/scullery`, false);
    exits(lane, [to(scullery)]);
    expect(house.isLandedAt(lane)).toBe(false);
  });

  it('…but a back door into an enclosed member is one', () => {
    const house = building('row', `${TOWN}/row/front`);
    const lane = room(`${TOWN}/lane`, false);
    const kitchen = room(`${TOWN}/row/kitchen`, true);
    exits(lane, [to(kitchen)]);
    expect(house.isLandedAt(lane)).toBe(true);
  });
});

describe("a neighbour's parlour", () => {
  it('a member of another building is not a landing of this one', () => {
    const ours = building('ours', `${TOWN}/ours/hall`);
    building('theirs', `${TOWN}/theirs/parlour`);
    const street = room(`${TOWN}/street`, false);
    const parlour = room(`${TOWN}/theirs/parlour`, true);
    exits(street, [to(parlour)]);
    expect(ours.isLandedAt(street)).toBe(false);
  });
});

describe('a courtyard open to the sky', () => {
  it('is a landing of its own building — it holds no air and leads into an enclosed member', () => {
    const college = building('college', `${TOWN}/college/gate`);
    const court = room(`${TOWN}/college/court`, false);
    const hall = room(`${TOWN}/college/hall`, true);
    exits(court, [to(hall)]);
    expect(college.isLandedAt(court)).toBe(true);
  });
});

describe('a shed inside a warehouse', () => {
  it('has no landing: the warehouse floor holds air', () => {
    const shed = building('shed', `${TOWN}/shed/inside`);
    const floor = room(`${TOWN}/warehouse/floor`, true);
    const inside = room(`${TOWN}/shed/inside`, true);
    exits(floor, [to(inside)]);
    expect(shed.isLandedAt(floor)).toBe(false);
  });
});

describe('a ship alongside', () => {
  it('the quay is her landing while she lies there, and not once she has sailed', () => {
    const ship = building('hesper', `${TOWN}/hesper/deck`);
    const quay = room(`${TOWN}/quay`, false);
    exits(quay, [to(`${TOWN}/hesper/deck`, ship)]);
    expect(ship.isLandedAt(quay)).toBe(true);
    expect(NavigationApi.structuresLandedAtNow(quay).map((s) => s.stuffId)).toEqual([ship.stuffId]);

    // She sails: the exit's authored berth still names her deck, but
    // nothing lies alongside — and a moving ship lands nowhere.
    const sailed = to(`${TOWN}/hesper/deck`, null);
    sailed.alongsideNow = () => null;
    exits(quay, [{ ...sailed, alongsideNow: () => building('other', null) }]);
    expect(ship.isLandedAt(quay)).toBe(false);
  });
});
