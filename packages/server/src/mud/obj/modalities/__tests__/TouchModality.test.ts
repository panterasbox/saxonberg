import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TouchModality } from '../TouchModality';
import { Touch } from '../../../lib/perception/Touch';
import { AtmosphericMixin } from '../../../lib/biome/Atmospheric';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import CartesianZone from '../../location/CartesianZone';
import { StuffApi } from '../../../api/stuff';
import { PerceptionApi } from '../../../api/perception';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import { Quantity } from '../../../lib/quantity';
import { installV1QuantityTagTables } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../lib/perception/modalities/__tests__/test-helpers';

const touchSingleton = () =>
  PerceptionApi.modalityByName('touch') as TouchModality;

class AtmosphericLocation extends AtmosphericMixin(CartesianLocation) {}

describe('TouchModality', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('signalAt returns null for a non-Atmospheric location', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    expect(touchSingleton().signalAt(loc)).toBeNull();
  });

  it('signalAt returns Touch when scope has inline _temperature', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new AtmosphericLocation());
    zone.addLocation(loc, 0, 0, 0);
    loc.setTemperature(Quantity.of(295, 'K'));
    const touch = touchSingleton().signalAt(loc);
    expect(touch).toBeInstanceOf(Touch);
    expect(touch!.band).toBe('comfortable');
  });

  it('signalAt scalding tier maps 700K to scalding', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new AtmosphericLocation());
    zone.addLocation(loc, 0, 0, 0);
    loc.setTemperature(Quantity.of(700, 'K'));
    const touch = touchSingleton().signalAt(loc);
    expect(touch!.band).toBe('scalding');
  });
});
