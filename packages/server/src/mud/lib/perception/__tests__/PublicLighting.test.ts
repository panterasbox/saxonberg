/**
 * ⭐⭐ **The town's lamps are a property of the street** (envelope D7).
 *
 * A street declares that the town lights it; whether it is burning is
 * DERIVED — the service is funded, it is after dusk, therefore it
 * burns. Nothing is minted, and `check-light-sources` clause (e)
 * refuses any class that would be a street lamp.
 *
 * ⭐ The test that decides object-or-property is *is it the target of a
 * verb?* Nobody binds a street lamp; every act that matters — funding
 * the service, the street being lit or dark, looking at it — happens at
 * street granularity. The escape hatch is the shipped forestry pattern:
 * if a later build wants ONE lamp smashed or climbed, that lamp becomes
 * a prop at THAT spot and every other street keeps the property.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianLocation from '../../location/CartesianLocation';
import StreetClass from '../../../platform/location/Street';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Locality from '../../../platform/idea/Locality';
import { VisionModality } from '../../../platform/idea/modalities/VisionModality';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { PerceptionApi } from '../../../api/perception';
import { WorldClockApi } from '../../../api/worldclock';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../modalities/__tests__/test-helpers';

const DAY = 86_400;
const SCALE = 12;
const CITY = '/platform/idea/Locality/_civic/city';
const STREET = '/world/_civic/street';

const vision = (): VisionModality =>
  PerceptionApi.modalityByName('vision') as VisionModality;

function atGameSecond(t: number): void {
  WorldClockApi._setNowProviderForTesting(() => (t / SCALE) * 1000);
}

type Street = CartesianLocation & {
  publicLighting: unknown;
  isPubliclyLitNow(): boolean;
  publicLightingFlux(): number;
  getDetail(id: string): string | null;
};

let city: Locality;
let street: Street;

function makeStreet(seniority = 1): Street {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const s = makeStuffAtPath(
    () => new StreetClass(),
    STREET,
  ) as unknown as Street;
  zone.addLocation(s as unknown as CartesianLocation, 0, 0, 0);
  s.publicLighting = {
    flux: 400,
    colorTemperature: 2200,
    detail: 'lamps',
    seniority,
  };
  // The covering locality is resolved once at postRegister in
  // production; the test wires it directly.
  (s as unknown as { _lightingLocalityPath: string })._lightingLocalityPath =
    CITY;
  return s;
}

beforeEach(() => {
  installV1QuantityTagTables();
  buildAllModalities();
  WorldClockApi._resetForTesting();
  city = makeStuffAtPath(() => new Locality(), CITY) as unknown as Locality;
  street = makeStreet();
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

/** Mark the street as lit tonight, the way a settle would. */
function fund(): void {
  (city as unknown as { _lightingLitStreets: string[] })._lightingLitStreets =
    [STREET];
}

describe('lit iff night AND funded', () => {
  it('⭐ by day it is out, funded or not', () => {
    fund();
    atGameSecond(DAY / 2); // noon
    expect(street.isPubliclyLitNow()).toBe(false);
    expect(street.publicLightingFlux()).toBe(0);
  });

  it('⭐ at night, funded, it burns — and the LIGHT WALK reads it', () => {
    fund();
    atGameSecond(0); // midnight
    expect(street.isPubliclyLitNow()).toBe(true);
    expect(street.publicLightingFlux()).toBe(400);
    // ⭐ 400 lm over a 9 m² cell ≈ 44 lux, which is `lit` — enough to
    // walk and work by, and nothing like daylight. That is the right
    // band for a street lamp, and it is what makes the difference
    // between moonlight and a lit street RELIABILITY rather than
    // brightness: the moon gives you `very-dim` when it is up and
    // clear, and the town gives you `lit` every night it pays.
    expect(vision().bandAt(street as unknown as CartesianLocation)).toBe(
      'lit',
    );
  });

  it('⚠ at night, UNFUNDED, it is dark — that is the failure mode and it is the point', () => {
    atGameSecond(0);
    expect(street.isPubliclyLitNow()).toBe(false);
    expect(street.publicLightingFlux()).toBe(0);
  });
});

describe('the lamps are PROSE, and say which of three things is true', () => {
  it('burning', () => {
    fund();
    atGameSecond(0);
    expect(street.getDetail('lamps')).toMatch(/lamps are burning/);
  });

  it('⭐ standing cold — NOT "broken", NOT "there are none"', () => {
    // A funded service that lapsed and a street the town never lit are
    // different facts, and a player must be able to tell them apart.
    atGameSecond(0);
    expect(street.getDetail('lamps')).toMatch(/stand cold/);
    expect(street.getDetail('lamps')).not.toMatch(/broken/);
  });

  it('out, because it is daylight', () => {
    fund();
    atGameSecond(DAY / 2);
    expect(street.getDetail('lamps')).toMatch(/out; it is daylight/);
  });

  it('a road the town never lit is not a lighting host AT ALL', () => {
    // ⚠⚠ **This assertion flipped, and the flip is the point** (review,
    // 2026-09-24). It used to read `isPublicLighting(dark) === true //
    // inert` on a bare `CartesianLocation` — i.e. it asserted that every
    // cell in the game is a public-lighting host that happens to be
    // switched off. That was the test agreeing with a mis-hosted mixin
    // rather than checking it: a cellar, a smithy, a mine heading and a
    // ploughed field were all lighting hosts.
    //
    // ⭐ The service lives on `Street` now, so a road the town never lit
    // does not carry the concept, and the absence is structural rather
    // than a null. `delight-road/crossroads` — the drive's unlit road —
    // is exactly this row.
    const road = makeStuff(() => new CartesianLocation());
    expect(MixinApi.isPublicLighting(road as never)).toBe(false);
    expect((road as unknown as Street).getDetail('lamps')).toBeNull();
  });
});

describe('⭐⭐ the extent decides, in an order written in ADVANCE', () => {
  it('lights as many streets as the money covers, by seniority', () => {
    // The seniority order is the whole civic claim: nobody is judged at
    // the moment of refusal, because the decision was made before
    // anybody knew there would be a shortfall.
    const second = makeStuffAtPath(
      () => new StreetClass(),
      '/world/_civic/street-2',
    ) as unknown as Street;
    second.publicLighting = { flux: 400, detail: 'lamps', seniority: 9 };
    (
      second as unknown as { _lightingLocalityPath: string }
    )._lightingLocalityPath = CITY;

    // Only the senior street is funded tonight.
    (city as unknown as { _lightingLitStreets: string[] })
      ._lightingLitStreets = [STREET];
    atGameSecond(0);
    expect(street.isPubliclyLitNow()).toBe(true);
    expect(second.isPubliclyLitNow()).toBe(false);
  });

  it('an extent that funds nothing lights nothing — no lamps, no bill', () => {
    expect(city.getPublicLightingFunding()).toBeNull();
    atGameSecond(0);
    expect(street.isPubliclyLitNow()).toBe(false);
  });
});
