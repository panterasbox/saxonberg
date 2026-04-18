import { describe, it, expect, beforeEach } from 'vitest';
import { Vessel } from './Vessel';
import { Thing } from '../stuff/Thing';
import { Location } from '../stuff/Location';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';

describe('Vessel', () => {
  let vessel: Vessel;

  beforeEach(() => {
    vessel = new Vessel();
    StuffApi.register(vessel);
  });

  describe('Container side', () => {
    it('starts with empty inventory', () => {
      expect(vessel.inventory.size).toBe(0);
      expect(vessel.getContents()).toEqual([]);
    });

    it('holds Things via ContainmentApi', () => {
      const item = new Thing();
      StuffApi.register(item);

      ContainmentApi.move(item, vessel);

      expect(vessel.hasInInventory(item)).toBe(true);
      expect(item.getEnvironment()).toBe(vessel);
    });
  });

  describe('Containable side', () => {
    it('starts with null environment', () => {
      expect(vessel.getEnvironment()).toBeNull();
    });

    it('can be placed inside a Location', () => {
      const room = new Location();
      StuffApi.register(room);

      ContainmentApi.move(vessel, room);

      expect(vessel.getEnvironment()).toBe(room);
      expect(room.hasInInventory(vessel)).toBe(true);
    });

    it('can itself be placed inside another Vessel', () => {
      const outer = new Vessel();
      StuffApi.register(outer);

      ContainmentApi.move(vessel, outer);

      expect(vessel.getEnvironment()).toBe(outer);
      expect(outer.hasInInventory(vessel)).toBe(true);
    });
  });

  describe('Both sides together', () => {
    it('holds items while itself sitting in a room', () => {
      const room = new Location();
      const coin = new Thing();
      StuffApi.register(room);
      StuffApi.register(coin);

      ContainmentApi.move(vessel, room);
      ContainmentApi.move(coin, vessel);

      expect(vessel.getEnvironment()).toBe(room);
      expect(coin.getEnvironment()).toBe(vessel);
      expect(vessel.hasInInventory(coin)).toBe(true);
      expect(room.hasInInventory(vessel)).toBe(true);
      expect(room.hasInInventory(coin)).toBe(false);
    });
  });
});
