/**
 * ⭐ The producers' landing rules (cleanliness D5, D6, D15): a row's
 * `soils:` lands where it says; a careless doff moves a dirty glove's dirt
 * onto the hands and a careful one does not; feet carry the ground; hard
 * work sweats the innermost layer.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Floor from '../../../platform/thing/Floor';
import { SoilSpecs } from '../SoilSpec';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { soilBody, wear } from './soil-fixtures';
import { TRAUMA_BEHAVIOR, type Trauma } from '../../../platform/idea/Condition';

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a row\'s `soils:` (D6)', () => {
  it('lands on the hands, the trunk\'s outer layer and the feet', () => {
    const c = soilBody();
    const apron = wear(c, 'torso');
    const boots = wear(c, 'feet');
    c.soilFrom([
      { kind: 'grease', amount: 0.3, where: 'hands' },
      { kind: 'grease', amount: 0.2, where: 'apron' },
      { kind: 'mud', amount: 0.15, where: 'feet' },
    ]);
    expect(c.soilBand('body.arm.left.hand')).toBe('marked');
    expect(apron.soilKinds()).toEqual(['grease']);
    // One pair of boots, both feet: the act lands on it once per foot it
    // covers — but it is ONE layer and the floor rule is per crossing.
    expect(boots.soilLoad('mud')).toBeGreaterThan(0);
    expect(c.soilAt('body.torso')).toBe(0);
  });

  it('⚠ a misspelt key fails at READ, naming the row', () => {
    expect(() => new SoilSpecs([{ kind: 'grease', amout: 0.3, where: 'hands' }], "Recipe 'x'"))
      .toThrow(/Recipe 'x'.*amount/);
    expect(() => new SoilSpecs([{ kind: 'grease', amount: 0.3, where: 'elbow' }], "Recipe 'x'"))
      .toThrow(/where/);
    expect(new SoilSpecs(undefined, 'x').entries).toEqual([]);
  });
});

describe('gloves, and taking them off (D5, AC 3)', () => {
  it('⭐ a QUICK doff of a dirty glove dirties the hands under it', () => {
    const c = soilBody();
    const gloves = wear(c, 'hands');
    c.soilHands('blood', 0.6);
    expect(c.soilAt('body.arm.left.hand')).toBe(0);
    c.tryReleaseFromSlots(gloves);
    c.doff(gloves);
    expect(c.soilAt('body.arm.left.hand')).toBeCloseTo(0.3, 4);
  });

  it('⭐ a CAREFUL doff leaves the hands as they were', () => {
    const c = soilBody();
    const gloves = wear(c, 'hands');
    c.soilHands('blood', 0.6);
    c.tryReleaseFromSlots(gloves);
    c.doff(gloves, { careful: true });
    expect(c.handCleanliness()).toBe(1);
  });

  it('a clean glove transfers nothing however it comes off', () => {
    const c = soilBody();
    const gloves = wear(c, 'hands');
    c.tryReleaseFromSlots(gloves);
    c.doff(gloves);
    expect(c.handCleanliness()).toBe(1);
  });
});

describe('feet carry the ground (D15)', () => {
  function floorOf(kind: 'mire' | 'set-paving', slotted = false): Floor {
    const f = makeStuff(() => new Floor());
    vi.spyOn(f, 'getGroundKind').mockReturnValue(kind);
    if (slotted) vi.spyOn(f, 'supportIsSlotted').mockReturnValue(true);
    return f;
  }

  it('a mire muddies the boots, not the shirt; the next floor takes a share', () => {
    const c = soilBody();
    const boots = wear(c, 'feet');
    const shirt = wear(c, 'torso');
    floorOf('mire').soilFeetOf(c);
    expect(boots.soilKinds()).toEqual(['mud']);
    expect(shirt.soilBand()).toBe('clean');
    const shop = floorOf('set-paving');
    const before = boots.soilLoad('mud');
    for (let i = 0; i < 5; i++) {
      floorOf('mire').soilFeetOf(c);
      shop.receiveTraffic(c);
    }
    expect(shop.soilLoad('mud')).toBeGreaterThan(0.1);
    expect(shop.soilBand()).not.toBe('clean');
    expect(boots.soilLoad('mud')).toBeGreaterThan(before);
  });

  it('paving never muds; a water surface takes no traffic at all', () => {
    const c = soilBody();
    const boots = wear(c, 'feet');
    floorOf('set-paving').soilFeetOf(c);
    expect(boots.soilBand()).toBe('clean');
    boots.soil('mud', 0.5);
    const mere = floorOf('set-paving', true);
    mere.receiveTraffic(c);
    mere.soil('blood', 0.5);
    expect(mere.soilBand()).toBe('clean');
    expect(boots.soilLoad('mud')).toBeCloseTo(0.5, 4);
  });
});

describe('hard work sweats the INNER layer (D6)', () => {
  it('an hour over the threshold sweats the shirt under the coat', () => {
    const c = soilBody();
    const shirt = wear(c, 'torso');
    const coat = wear(c, 'torso');
    vi.spyOn(c, 'sustainableW').mockReturnValue(100);
    c.exert({ durationS: 3600, powerW: 300 });
    expect(shirt.soilKinds()).toEqual(['sweat']);
    expect(coat.soilBand()).toBe('clean');
  });

  it('effort under the threshold leaves nothing', () => {
    const c = soilBody();
    const shirt = wear(c, 'torso');
    vi.spyOn(c, 'sustainableW').mockReturnValue(400);
    c.exert({ durationS: 3600, powerW: 300 });
    expect(shirt.soilBand()).toBe('clean');
  });
});

describe('⭐ a bleeding wound stains what covers it (review)', () => {
  const wound = (type: Trauma['type'], site: string): Trauma => ({
    kind: 'trauma',
    type,
    site,
    severity: 0.8, // below the drip line: no floor in this fixture
    bleeding: true,
  });

  it('a cut on the torso soaks the shirt over it, with the bleeder\'s own blood', () => {
    const c = soilBody();
    const shirt = wear(c, 'torso');
    TRAUMA_BEHAVIOR.laceration.tick(c, wound('laceration', 'body.torso'), 60);
    expect(shirt.soilLoad('blood')).toBeGreaterThan(0.1);
    expect(c.soilAt('body.torso')).toBe(0); // the shirt took it, not the skin
  });

  it('a cut nothing covers bloodies the skin at the wound', () => {
    const c = soilBody();
    TRAUMA_BEHAVIOR.laceration.tick(c, wound('laceration', 'body.arm.left.hand'), 60);
    expect(c.soilLoad('blood', 'body.arm.left.hand')).toBeGreaterThan(0);
  });

  it('a rupture bleeds INTO the body and stains nothing', () => {
    const c = soilBody();
    const shirt = wear(c, 'torso');
    TRAUMA_BEHAVIOR.rupture.tick(c, wound('rupture', 'body.torso'), 60);
    expect(shirt.soilLoad('blood')).toBe(0);
    expect(c.soilAt('body.torso')).toBe(0);
  });
});

