import "../../../../../test-bootstrap";
import { aromaPath } from '../../../../lib/perception/__tests__/aroma-fixtures';
import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import { SmellModality } from '../SmellModality';
import { MAX_HOPS } from '../../../../lib/perception/Modality';
import { Smell } from '../../../../lib/perception/Smell';
import { vi } from 'vitest';
import { Quantity } from '../../../../lib/quantity';
import { AtmosphericMixin } from '../../../../lib/biome/Atmospheric';
import Location from '../../../../lib/location/Location';
import CartesianZone from '../../location/CartesianZone';
import Door from '../../../thing/Door';
import Good from '../../../../lib/stuff/Good';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import { PerceptionApi } from '../../../../api/perception';
import Soil from '../../material/Soil';

/** The smell modality singleton — `signalAt` is an instance method on it. */
const smellModality = (): SmellModality =>
  PerceptionApi.modalityByName('smell') as SmellModality;

/** A kilogram of something that smells of `word` at `ou`, at reference heat. */
function emitter(word: string, ou: number): Good {
  const material = makeStuff(() => new Soil());
  material.smells = [{ aroma: aromaPath(word), strength: ou }];
  const thing = makeStuff(() => new Good());
  vi.spyOn(thing, 'getMaterial').mockReturnValue(material);
  vi.spyOn(thing, 'getMass').mockReturnValue(Quantity.of(1, 'kg'));
  return thing;
}
class AtmosphericLocation extends AtmosphericMixin(Location) {}

describe('SmellModality.signalAt — propagation core', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('empty room with no emitters returns null', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new Location());
    zone.addLocation(loc, 0, 0, 0);

    expect(smellModality().signalAt(loc)).toBeNull();
  });

  it('a candle in a room is perceived at that scope', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new Location());
    zone.addLocation(loc, 0, 0, 0);
    const candle = emitter('garlic', 50);
    ContainmentApi.move(candle, loc);

    const smell = smellModality().signalAt(loc);
    expect(smell).toBeInstanceOf(Smell);
    expect(smell!.strength.rawValue()).toBe(50);
    expect(smell!.dominantAroma).toBe(aromaPath('garlic'));
    expect(smell!.sources).toHaveLength(1);
  });

  it('odor leaks through open doorless exits', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new Location());
    const b = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    await a.addBidirectionalExit(b, 'north'); // explicit doorless doorway
    const candle = emitter('garlic', 60);
    ContainmentApi.move(candle, b);

    const smellInA = smellModality().signalAt(a);
    // One band fainter per hop, and it remembers how far it came.
    expect(smellInA!.strength.rawValue()).toBeCloseTo(2);
    expect(smellInA!.sources[0]!.hops).toBe(1);
  });

  it('a closed door between rooms blocks the leak', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new Location());
    const b = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    const candle = emitter('garlic', 60);
    ContainmentApi.move(candle, b);

    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    door.setOpen(false);
    await a.addBidirectionalExit(b, 'north', { boundary: door });

    expect(smellModality().signalAt(a)).toBeNull();
    door.open();
    const smellInA = smellModality().signalAt(a);
    // One band fainter per hop, and it remembers how far it came.
    expect(smellInA!.strength.rawValue()).toBeCloseTo(2);
    expect(smellInA!.sources[0]!.hops).toBe(1);
  });

  it('vacuum atmosphere blocks smell at the recipient', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new AtmosphericLocation());
    zone.addLocation(a, 0, 0, 0);
    a.setAtmosphere('vacuum');
    const candle = emitter('garlic', 60);
    ContainmentApi.move(candle, a);

    expect(smellModality().signalAt(a)).toBeNull();
  });

  it('MAX_HOPS truncates propagation past depth 2', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new Location());
    const b = makeStuff(() => new Location());
    const c = makeStuff(() => new Location());
    const d = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 0, 2, 0);
    zone.addLocation(d, 0, 3, 0);
    const candle = emitter('bog', 80);
    ContainmentApi.move(candle, d);

    expect(MAX_HOPS).toBe(2);
    expect(smellModality().signalAt(a)).toBeNull();
  });

  it('each word stands on its own: the dominant is the furthest past threshold', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new Location());
    zone.addLocation(loc, 0, 0, 0);

    const garlic = emitter('garlic', 20);
    ContainmentApi.move(garlic, loc);

    const smoke = emitter('smoke', 60);
    ContainmentApi.move(smoke, loc);

    const smell = smellModality().signalAt(loc);
    expect(smell!.notes.map((n) => n.aroma)).toEqual([aromaPath('smoke'), aromaPath('garlic')]);
    expect(smell!.dominantAroma).toBe(aromaPath('smoke'));
  });

  it('every source is kept, so a nose can tell when one thing is the only one', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new Location());
    zone.addLocation(loc, 0, 0, 0);
    for (let i = 0; i < 5; i++) {
      ContainmentApi.move(emitter(`id-${i}`, 10 * (i + 1)), loc);
    }
    expect(smellModality().signalAt(loc)!.sources).toHaveLength(5);
  });

  describe('emissionOf', () => {
    it('amount is compressive: 10 g and 100 kg are two bands apart', () => {
      const small = emitter('tallow', 100);
      vi.spyOn(small, 'getMass').mockReturnValue(Quantity.of(0.01, 'kg'));
      const large = emitter('tallow', 100);
      vi.spyOn(large, 'getMass').mockReturnValue(Quantity.of(100, 'kg'));
      expect(smellModality().emissionOf(small).strength.rawValue()).toBeCloseTo(10);
      expect(smellModality().emissionOf(large).strength.rawValue()).toBeCloseTo(1000);
    });

    it('a plain thing gives off nothing, by having nothing to give', () => {
      expect(smellModality().emissionOf(makeStuff(() => new Good())).isEmpty()).toBe(true);
    });
  });
});
