/**
 * ⭐⭐⭐ **Exposure — the one face rule** (rubber build).
 *
 * *A face is exterior unless the space across it is an enclosed place of
 * the same structure.* Every case the requirements name is here as one
 * fixture: a structure with a storey tree (works floor under a loft, a
 * stove house roofed in glass, a terrace on the loft's roof), a lone hut,
 * a lone pen, an open-fronted shed, a row that says nothing under each
 * kind of biome, and a vessel.
 *
 * Exits are stubbed at `getObviousNeighbours` — the read the face rule
 * makes — exactly as the envelope tests stub `openExteriorOpenings`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Stuff } from '../../stuff/Stuff';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Material from '../../material/Material';
import Biome from '../../biome/Biome';
import { SkyExposedMixin } from '../../biome/SkyExposed';
import Structure from '../../../platform/idea/Structure';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { attachGraph } from '../../location/__tests__/attachments-fixture';
import type { Exposure } from '../Exposure';
import type { RoofSpec, EnclosurePartSpec } from '../Enclosed';

const BRICK = '/stuff/idea/material/_exp/brick';
const SLATE = '/stuff/idea/material/_exp/slate';
const GLASS = '/stuff/idea/material/_exp/glass';
const INDOOR = '/stuff/idea/biome/_exp/indoor';
const OUTDOOR = '/stuff/idea/biome/_exp/outdoor';
const WORKS = '/world/_exp/works';

class SkyBiome extends SkyExposedMixin(Biome) {}

function material(path: string, k: number): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setThermalConductivity(Quantity.of(k, 'W/(m·K)'));
    m.setDensity(Quantity.of(1800, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(840, 'J/(kg·K)'));
    return m;
  }, path);
}

interface Built {
  exposure(): Exposure;
  setEnclosure(v: EnclosurePartSpec | null): void;
  setRoof(v: RoofSpec | null): void;
  getRoof(): RoofSpec | null;
}
type Room = CartesianLocation & Built;

let zone: CartesianZone;
let n = 0;

function place(
  path: string,
  opts: { enclosure?: EnclosurePartSpec; roof?: RoofSpec; biome?: string } = {},
): Room {
  const r = makeStuffAtPath(() => new CartesianLocation(), path) as Room;
  zone.addLocation(r, n++, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = opts.biome ?? INDOOR;
  if (opts.enclosure !== undefined) r.setEnclosure(opts.enclosure);
  if (opts.roof !== undefined) r.setRoof(opts.roof);
  link(r, []);
  return r;
}

/** Stub the exits the face rule reads: `[direction, dest, doored?]`. */
function link(r: Room, exits: Array<[string, Stuff, boolean?]>): void {
  (r as unknown as { getObviousNeighbours: () => unknown[] }).getObviousNeighbours =
    () =>
      exits.map(([dir, dest, doored]) => ({
        exit: { getDirection: () => dir, getDoor: () => (doored ? {} : null) },
        dest,
      }));
  // The exposure re-checks its neighbours at most once a second; a test
  // that rewires a room's exits says so (an authored change does too).
  r.setRoof(r.getRoof());
}

const brick = { material: BRICK, thicknessM: 0.23 };
const slate = { material: SLATE, thicknessM: 0.01 };
const glass = { material: GLASS, thicknessM: 0.004 };

beforeEach(() => {
  installV1QuantityMarshallers();
  material(BRICK, 0.7);
  material(SLATE, 2);
  material(GLASS, 1);
  makeStuffAtPath(() => new Biome(), INDOOR);
  makeStuffAtPath(() => new SkyBiome(), OUTDOOR);
  zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  n = 0;
});

afterEach(() => {
  StuffApi.clearAll();
});

describe('a structure: the storey tree decides the top', () => {
  function works() {
    const s = makeStuffAtPath(() => new Structure(), `${WORKS}/structure`);
    s.setExtent(WORKS);
    s.setStoreys([
      { key: 'ground', extent: `${WORKS}/location/ground` },
      { key: 'works', extent: `${WORKS}/location/ground/works` },
      { key: 'loft', extent: `${WORKS}/location/loft`, on: 'works' },
      { key: 'terrace', extent: `${WORKS}/location/terrace`, on: 'loft' },
    ]);
    attachGraph({ [WORKS]: [[`${WORKS}/structure`, 'structure']] });
    const yard = place('/world/_exp/yard', { biome: OUTDOOR });
    const floor = place(`${WORKS}/location/ground/works/floor`, { enclosure: brick, roof: slate });
    const stove = place(`${WORKS}/location/ground/stove-house`, { enclosure: glass, roof: glass });
    const loft = place(`${WORKS}/location/loft/loft`, { enclosure: brick, roof: slate });
    const terrace = place(`${WORKS}/location/terrace/terrace`, { enclosure: 'none', roof: 'none' });
    link(floor, [['up', loft], ['east', stove, true], ['west', yard, true]]);
    link(stove, [['west', floor, true], ['south', yard]]);
    link(loft, [['down', floor], ['up', terrace]]);
    link(terrace, [['down', loft]]);
    return { s, yard, floor, stove, loft, terrace };
  }

  it('the works floor sits under the loft: a ceiling, not a roof', () => {
    const { floor, s } = works();
    const e = floor.exposure();
    expect(e.structure).toBe(s);
    expect(e.storey).toBe('works');
    expect(e.top).toBe('ceiling');
    expect(e.rainReaches()).toBe(false);
    expect(e.skyVisible()).toBe(false);
    expect(e.onGrade).toBe(true);
  });

  it('the stove house has nothing over it but its own glass roof', () => {
    const { stove } = works();
    const e = stove.exposure();
    expect(e.storey).toBe('ground');
    expect(e.top).toBe('roof');
    expect(e.declared).toBe(true);
    expect(e.rainReaches()).toBe(false);
  });

  it('the loft has a roof, and the terrace standing on it does not make a ceiling', () => {
    const { loft } = works();
    const e = loft.exposure();
    expect(e.top).toBe('roof');
    expect(e.onGrade).toBe(false);
  });

  it('⭐ the terrace is open, and its floor is the loft roof', () => {
    const { terrace, loft } = works();
    const e = terrace.exposure();
    expect(e.top).toBe('open');
    expect(e.rainReaches()).toBe(true);
    expect(e.isOutside()).toBe(true);
    expect(e.floorIsRoofOf).toBe(loft);
    expect(e.onGrade).toBe(false);
  });

  it('⭐ a doorway between two enclosed members is an interior face, and loses nothing', () => {
    const { floor, stove } = works();
    const e = floor.exposure();
    const interior = e.interiorFaces();
    expect(interior.map((f) => f.neighbour)).toContain(stove);
    // the stair to the loft couples but consumes no wall: one shared wall
    // (the stove house), three exterior walls, and no roof face.
    expect(e.walls.filter((w) => w.exterior)).toHaveLength(3);
    expect(e.exteriorAreaM2()).toBeCloseTo(3 * 9, 6);
  });

  it('a doorless exit to the yard is an open side', () => {
    const { stove } = works();
    const e = stove.exposure();
    expect(e.openSides).toBe(1);
    expect(e.windEnters()).toBe(true);
  });
});

describe('⭐⭐ a lone place is complete — no structure needed', () => {
  it('a hut with brick walls and a slate roof: every face exterior, dry', () => {
    const hut = place('/world/_exp/hut', { enclosure: brick, roof: slate, biome: OUTDOOR });
    const e = hut.exposure();
    expect(e.structure).toBeNull();
    expect(e.top).toBe('roof');
    expect(e.walls.every((w) => w.exterior)).toBe(true);
    expect(e.walls).toHaveLength(4);
    expect(e.exteriorAreaM2()).toBeCloseTo(5 * 9, 6);
    expect(e.rainReaches()).toBe(false);
    expect(e.isOutside()).toBe(false);
    expect(e.holdsAir()).toBe(true);
  });

  it('a pen with walls and no roof: open top, the wind does not get in', () => {
    const pen = place('/world/_exp/pen', { enclosure: brick, roof: 'none', biome: OUTDOOR });
    const e = pen.exposure();
    expect(e.top).toBe('open');
    expect(e.rainReaches()).toBe(true);
    expect(e.windEnters()).toBe(false);
    expect(e.holdsAir()).toBe(false);
  });

  it('an awning: a roof and no walls — dry, and the wind blows through', () => {
    const awning = place('/world/_exp/awning', {
      enclosure: 'none',
      roof: { material: SLATE, thicknessM: 0.002 },
      biome: OUTDOOR,
    });
    const e = awning.exposure();
    expect(e.rainReaches()).toBe(false);
    expect(e.wallsNone).toBe(true);
    expect(e.windEnters()).toBe(true);
    expect(e.holdsAir()).toBe(false);
    expect(e.isOutside()).toBe(false);
  });

  it('a three-sided shed: one open side onto the street, three exterior walls', () => {
    const street = place('/world/_exp/street', { biome: OUTDOOR });
    const shed = place('/world/_exp/shed', { enclosure: brick, roof: slate, biome: OUTDOOR });
    link(shed, [['south', street]]);
    const e = shed.exposure();
    expect(e.openSides).toBe(1);
    expect(e.walls.filter((w) => w.exterior)).toHaveLength(3);
    expect(e.windEnters()).toBe(true);
  });

  it('⚠ a doorless exit to another ENCLOSED place of no structure leaves the wall solid', () => {
    const a = place('/world/_exp/a', { enclosure: brick, roof: slate });
    const b = place('/world/_exp/b', { enclosure: brick, roof: slate });
    link(a, [['east', b]]);
    const e = a.exposure();
    expect(e.openSides).toBe(0);
    expect(e.walls.filter((w) => w.exterior)).toHaveLength(4);
  });
});

describe('a row that says nothing: the legacy biome answers, and is counted', () => {
  it('under a sky biome it is open — today, and at the eventual default', () => {
    const street = place('/world/_exp/street', { biome: OUTDOOR });
    const e = street.exposure();
    expect(e.declared).toBe(false);
    expect(e.isOutside()).toBe(true);
    expect(e.isOutside()).toBe(BiomeApi.isSkyExposed(street));
  });

  it('under an indoor biome it is its walls on five faces, undeclared', () => {
    const shop = place('/world/_exp/shop', { biome: INDOOR });
    const e = shop.exposure();
    expect(e.declared).toBe(false);
    expect(e.top).toBe('roof');
    expect(e.walls).toHaveLength(4);
    expect(e.exteriorAreaM2()).toBeCloseTo(5 * 9, 6);
    expect(e.isOutside()).toBe(BiomeApi.isSkyExposed(shop));
    // An undeclared interior reads exactly today's sky light: none.
    expect(e.skyLightFraction()).toBe(0);
  });
});

describe('a structure with no member places is still a structure', () => {
  it('stands, attached to an extent covering nothing; no place asks it anything', () => {
    const s = makeStuffAtPath(() => new Structure(), '/world/_exp/castle/structure');
    s.setExtent('/world/_exp/castle');
    expect(s.getStoreys()).toHaveLength(0);
    expect(s.storeyOf('/world/_exp/castle/keep')).toBeNull();
    expect(s.membersOf('anything')).toHaveLength(0);
  });
});

describe('W1 — the readers answer from the construction', () => {
  type Air = Room & {
    airChangesPerHour(): number;
    envelopeApplies(): boolean;
    addAtmosphereContent(path: string, litres: number): number;
    isSkyLit(): boolean;
  };

  it('an awning holds no air: infinite air changes, no envelope, nothing accumulates', () => {
    const awning = place('/world/_exp/awning', {
      enclosure: 'none',
      roof: { material: SLATE, thicknessM: 0.002 },
      biome: OUTDOOR,
    }) as Air;
    expect(awning.airChangesPerHour()).toBe(Infinity);
    expect(awning.envelopeApplies()).toBe(false);
    expect(awning.addAtmosphereContent('/stuff/idea/material/gas/smoke', 10)).toBe(0);
  });

  it('a walled hut under the sky biome holds air of its own — the biome no longer decides', () => {
    const hut = place('/world/_exp/hut', { enclosure: brick, roof: slate, biome: OUTDOOR }) as Air;
    expect(hut.envelopeApplies()).toBe(true);
    expect(Number.isFinite(hut.airChangesPerHour())).toBe(true);
    expect(hut.isSkyLit()).toBe(false);
  });

  it('a row that says nothing reads exactly as its biome did', () => {
    const street = place('/world/_exp/street', { biome: OUTDOOR }) as Air;
    const shop = place('/world/_exp/shop', { biome: INDOOR }) as Air;
    expect(street.envelopeApplies()).toBe(false);
    expect(street.isSkyLit()).toBe(true);
    expect(shop.envelopeApplies()).toBe(true);
    expect(shop.isSkyLit()).toBe(false);
    expect(BiomeApi.exposureOf(shop)?.rainReaches()).toBe(false);
    expect(BiomeApi.exposureOf(street)?.rainReaches()).toBe(true);
  });
});
