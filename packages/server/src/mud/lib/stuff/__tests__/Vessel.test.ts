import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Vessel } from '../Vessel';
import Thing from '../Thing';
import Location from '../Location';
import ExitableVessel from '../../boundary/ExitableVessel';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Vessel', () => {
  let vessel: Vessel;

  beforeEach(() => {
    vessel = makeStuff(() => new Vessel());
  });

  describe('Container side', () => {
    it('starts with empty inventory', () => {
      expect(vessel.getContents()).toEqual([]);
    });

    it('holds Things via ContainmentApi', () => {
      const item = makeStuff(() => new Thing());

      ContainmentApi.move(item, vessel);

      expect(vessel.hasContainable(item)).toBe(true);
      expect(item.getContainer()).toBe(vessel);
    });
  });

  describe('Containable side', () => {
    it('starts with null environment', () => {
      expect(vessel.getContainer()).toBeNull();
    });

    it('can be placed inside a Location', () => {
      const loc = makeStuff(() => new Location());

      ContainmentApi.move(vessel, loc);

      expect(vessel.getContainer()).toBe(loc);
      expect(loc.hasContainable(vessel)).toBe(true);
    });

    it('can itself be placed inside another Vessel', () => {
      const outer = makeStuff(() => new Vessel());

      ContainmentApi.move(vessel, outer);

      expect(vessel.getContainer()).toBe(outer);
      expect(outer.hasContainable(vessel)).toBe(true);
    });
  });

  describe('Both sides together', () => {
    it('holds items while itself sitting in a location', () => {
      const loc = makeStuff(() => new Location());
      const coin = makeStuff(() => new Thing());

      ContainmentApi.move(vessel, loc);
      ContainmentApi.move(coin, vessel);

      expect(vessel.getContainer()).toBe(loc);
      expect(coin.getContainer()).toBe(vessel);
      expect(vessel.hasContainable(coin)).toBe(true);
      expect(loc.hasContainable(vessel)).toBe(true);
      expect(loc.hasContainable(coin)).toBe(false);
    });
  });

  describe('transmissionFactor (encumbrance attenuation)', () => {
    afterEach(() => StuffApi.clearAll());

    it('defaults to 1.0', () => {
      expect(vessel.getTransmissionFactor()).toBe(1.0);
    });

    it('round-trips a valid in-range value', () => {
      vessel.setTransmissionFactor(0);
      expect(vessel.getTransmissionFactor()).toBe(0);
      vessel.setTransmissionFactor(0.5);
      expect(vessel.getTransmissionFactor()).toBe(0.5);
    });

    it('rejects out-of-range / non-finite values', () => {
      expect(() => vessel.setTransmissionFactor(-0.1)).toThrow(RangeError);
      expect(() => vessel.setTransmissionFactor(1.5)).toThrow(RangeError);
      expect(() => vessel.setTransmissionFactor(Number.NaN)).toThrow(RangeError);
    });
  });

  describe('Adornable narrowed to ExitableVessel', () => {
    afterEach(() => StuffApi.clearAll());

    it('a bare Vessel is NOT Adornable and has no fixtures surface', () => {
      expect(MixinApi.isAdornable(vessel)).toBe(false);
      expect(
        (vessel as unknown as { getFixtures?: unknown }).getFixtures,
      ).toBeUndefined();
    });

    it('an ExitableVessel IS Adornable (declares its own fixture need)', () => {
      const ev = makeStuff(() => new ExitableVessel());
      expect(MixinApi.isAdornable(ev)).toBe(true);
    });
  });
});
