import "../../../../../test-bootstrap";
import { aromaPath } from '../../../../lib/perception/__tests__/aroma-fixtures';
import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import { SmellModality } from '../SmellModality';
import { MAX_HOPS } from '../../../../lib/perception/Modality';
import { Smell } from '../../../../lib/perception/Smell';
import { vi } from 'vitest';
import { Quantity } from '../../../../lib/quantity';
import { AtmosphericMixin } from '../../../../lib/biome/Atmospheric';
import Location from '../../../../lib/place/Location';
import CartesianZone from '../../place/CartesianZone';
import Door from '../../../thing/Door';
import Good from '../../../../lib/stuff/Good';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import {
  makeStuff,
  makeStuffAtPath,
  seedKernelContentStore,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import { PerceptionApi } from '../../../../api/perception';
import Soil from '../../material/Soil';
import Gas from '../../material/Gas';
import { BiomeApi } from '../../../../api/biome';
import { WorldClockApi } from '../../../../api/worldclock';
import WorldClockRegistry from '../../WorldClockRegistry';
import { TemplatePaths } from '../../../../lib/paths';
import type { Stuff } from '../../../../lib/stuff/Stuff';

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

describe('⭐ SmellModality — the air carries a smell (D18)', () => {
  beforeEach(() => {
    seedKernelContentStore();
    installV1QuantityTagTables();
    buildAllModalities();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
    }
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('smell finds a gas in the air — nothing in the room gives it off — and the fold writes nothing', () => {
    const gasPath = '/stuff/idea/material/gas/_smell-naphtha';
    const gas = makeStuffAtPath(() => {
      const g = new Gas();
      g.setName('naphtha vapour');
      g.setDensity(Quantity.of(3.5, 'kg/m³'));
      return g;
    }, gasPath) as unknown as Gas;
    gas.smells = [{ aroma: aromaPath('naphtha'), strength: 3000 }];
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new Location());
    zone.addLocation(loc, 0, 0, 0); // 27 m³
    loc.addAtmosphereContent(gasPath, 270); // one part in a hundred

    // kg = 0.01 × 27 m³ × 3.5 kg/m³; strength × √kg.
    const smell = smellModality().signalAt(loc)!;
    expect(smell.dominantAroma).toBe(aromaPath('naphtha'));
    expect(smell.strength.rawValue()).toBeCloseTo(3000 * Math.sqrt(0.01 * 27 * 3.5), 0);
    expect(smell.sources[0]!.stuffId).toBe(loc.stuffId);

    // An hour on, the air has partly cleared — but a walk holding the world
    // still reads it AS BANKED and writes nothing (a write in a hold throws
    // in a test world), so the fold sees the same air twice.
    WorldClockApi._advanceForTesting(3600 * 1000);
    expect(smellModality().signalAt(loc)!.strength.rawValue()).toBeCloseTo(smell.strength.rawValue(), 6);
    // The next deliberate read decays it.
    const after = BiomeApi.resolveAtmosphereContentsFor(loc as unknown as Stuff)[0]!.amount;
    expect(after).toBeLessThan(0.01);
  });

  it('the restore door keeps what the air carries and asks no load for a live row', () => {
    const gasPath = '/stuff/idea/material/gas/_smell-restore';
    makeStuffAtPath(() => new Gas(), gasPath);
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new Location());
    zone.addLocation(loc, 0, 0, 0);
    expect(loc.set_atmosphereContents([{ type: gasPath, amount: 0.02 }])).toBeUndefined();
    expect(BiomeApi.resolveAtmosphereContentsFor(loc as unknown as Stuff)).toEqual([{ type: gasPath, amount: 0.02 }]);
  });
});

