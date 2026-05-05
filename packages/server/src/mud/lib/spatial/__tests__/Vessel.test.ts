import { describe, it, expect, beforeEach } from 'vitest';
import { Vessel } from '../Vessel';
import { Thing } from '../../stuff/Thing';
import { Location } from '../../stuff/Location';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
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
});
