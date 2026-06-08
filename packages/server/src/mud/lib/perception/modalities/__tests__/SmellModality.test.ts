import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SmellModality } from '../SmellModality';
import { MAX_HOPS } from '../VisionModality';
import { Smell } from '../../Smell';
import { SmellSourceMixin } from '../../SmellSource';
import { AtmosphericMixin } from '../../../biome/Atmospheric';
import { CartesianLocation } from '../../../spatial/CartesianLocation';
import { CartesianZone } from '../../../spatial/CartesianZone';
import { Door } from '../../../boundary/Door';
import { Thing } from '../../../stuff/Thing';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from './test-helpers';

class Candle extends SmellSourceMixin(Thing) {}
class AtmosphericLocation extends AtmosphericMixin(CartesianLocation) {}

describe('SmellModality.signalAt — propagation core', () => {
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
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    expect(SmellModality.smellAt(loc)).toBeNull();
  });

  it('a candle in a room is perceived at that scope', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    const candle = makeStuff(() => new Candle());
    candle.setEmittedConcentration(50);
    candle.setOdorIdentity('garlic');
    ContainmentApi.move(candle, loc);

    const smell = SmellModality.smellAt(loc);
    expect(smell).toBeInstanceOf(Smell);
    expect(smell!.concentration.rawValue()).toBe(50);
    expect(smell!.identity).toBe('garlic');
    expect(smell!.sources).toHaveLength(1);
  });

  it('odor leaks through open doorless exits', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    const candle = makeStuff(() => new Candle());
    candle.setEmittedConcentration(60);
    candle.setOdorIdentity('garlic');
    ContainmentApi.move(candle, b);

    const smellInA = SmellModality.smellAt(a);
    expect(smellInA!.concentration.rawValue()).toBe(60);
  });

  it('a closed door between rooms blocks the leak', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    const candle = makeStuff(() => new Candle());
    candle.setEmittedConcentration(60);
    candle.setOdorIdentity('garlic');
    ContainmentApi.move(candle, b);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    door.setOpen(false);
    await a.addBidirectionalExit(b, 'north', { door });

    expect(SmellModality.smellAt(a)).toBeNull();
    door.open();
    const smellInA = SmellModality.smellAt(a);
    expect(smellInA!.concentration.rawValue()).toBe(60);
  });

  it('vacuum atmosphere blocks smell at the recipient', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new AtmosphericLocation());
    zone.addLocation(a, 0, 0, 0);
    a.setAtmosphere('vacuum');
    const candle = makeStuff(() => new Candle());
    candle.setEmittedConcentration(60);
    candle.setOdorIdentity('garlic');
    ContainmentApi.move(candle, a);

    expect(SmellModality.smellAt(a)).toBeNull();
  });

  it('MAX_HOPS truncates propagation past depth 2', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    const d = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 0, 2, 0);
    zone.addLocation(d, 0, 3, 0);
    const candle = makeStuff(() => new Candle());
    candle.setEmittedConcentration(80);
    candle.setOdorIdentity('bog');
    ContainmentApi.move(candle, d);

    expect(MAX_HOPS).toBe(2);
    expect(SmellModality.smellAt(a)).toBeNull();
  });

  it('multi-identity merging: dominant by total concentration', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    const garlic = makeStuff(() => new Candle());
    garlic.setEmittedConcentration(20);
    garlic.setOdorIdentity('garlic');
    ContainmentApi.move(garlic, loc);

    const smoke = makeStuff(() => new Candle());
    smoke.setEmittedConcentration(60);
    smoke.setOdorIdentity('smoke');
    ContainmentApi.move(smoke, loc);

    const smell = SmellModality.smellAt(loc);
    expect(smell!.concentration.rawValue()).toBe(80);
    expect(smell!.identity).toBe('smoke');
  });

  it('source cap respected when many emitters contribute', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const c = makeStuff(() => new Candle());
      c.setEmittedConcentration(10 * (i + 1));
      c.setOdorIdentity(`id-${i}`);
      ContainmentApi.move(c, loc);
    }

    const smell = SmellModality.smellAt(loc);
    // Source list capped per SMELL_SOURCE_CAP (3 in v1).
    expect(smell!.sources.length).toBeLessThanOrEqual(3);
  });
});
