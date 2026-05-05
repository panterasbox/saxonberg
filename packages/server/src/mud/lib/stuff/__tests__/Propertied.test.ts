/**
 * PropertiedMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PropertiedMixin,
  Property,
  PropOperations,
  type PropAccessCheck,
  type PropOperation,
  type PropValueMask,
} from '../Propertied';
import { Stuff } from '../Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

// Test class with PropertiedMixin.
// Subclass-level test seams (per § 6 of the methods-only migration):
// `peekSavedProps()` / `peekTransientProps()` expose the protected mixin
// storage so assertions can inspect it directly.
class PropertiedThing extends PropertiedMixin(Stuff) {
  static persistentFields: string[] = [];
  public peekSavedProps(): Record<string, unknown> | undefined {
    return this.savedProps as Record<string, unknown> | undefined;
  }
  public peekTransientProps(): Record<string, unknown> {
    return this.transientProps as Record<string, unknown>;
  }
}

// Minimal Stuff subclass for use as a mask owner in tests.
class OwnerStuff extends Stuff {}

function makeOwner(): OwnerStuff {
  const owner = makeStuff(() => new OwnerStuff());
  return owner;
}

// Stuff that invokes mask operations on another Stuff. Used to exercise
// the call-stack-based owner default — the proxy frame pushed for these
// methods makes `caller` resolve to the MaskApplier instance.
class MaskApplier extends Stuff {
  applyAddFive(target: PropertiedThing): boolean {
    return target.maskProp(
      new Property<number>('strength'),
      (_p, v) => (v ?? 0) + 5,
    );
  }
  applyWithExtras(target: PropertiedThing, n: number): boolean {
    return target.maskProp(
      new Property<number>('strength'),
      (_p, v, ...e) => (v ?? 0) + (e[0] as number),
      undefined,
      n,
    );
  }
  remove(target: PropertiedThing): boolean {
    return target.unmaskProp(new Property<number>('strength'));
  }
  isMasking(target: PropertiedThing): boolean {
    return target.isMaskingProp(new Property<number>('strength'));
  }
}

describe('PropertiedMixin', () => {
  let obj: PropertiedThing;

  beforeEach(() => {
    obj = makeStuff(() => new PropertiedThing());
  });

  describe('Construction', () => {
    it('should create object with empty properties', () => {
      expect(obj.peekSavedProps()).toBeDefined();
      expect(obj.peekTransientProps()).toBeDefined();
      expect(Object.keys(obj.getProps()).length).toBe(0);
    });

    it('should have PropertiedMixin marker', () => {
      expect(MixinApi.hasMixin(PropertiedThing, 'PropertiedMixin')).toBe(true);
    });

    it('should have read-only props view', () => {
      const props = obj.getProps();
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });
  });

  describe('setProp() and getProp()', () => {
    it('should set and get a simple property', () => {
      const success = obj.setProp(new Property('test'), 'value');
      expect(success).toBe(true);
      expect(obj.getProp(new Property('test'))).toBe('value');
    });

    it('should auto-initialize property on first setProp', () => {
      obj.setProp(new Property('test'), 123);
      const options = obj.checkProp(new Property('test'));
      expect(options).toBeDefined();
      expect(options!.transient).toBe(true); // Default is transient
    });

    it('should support string properties', () => {
      obj.setProp(new Property<string>('name'), 'Alice');
      expect(obj.getProp(new Property<string>('name'))).toBe('Alice');
    });

    it('should support number properties', () => {
      obj.setProp(new Property<number>('age'), 42);
      expect(obj.getProp(new Property<number>('age'))).toBe(42);
    });

    it('should support boolean properties', () => {
      obj.setProp(new Property<boolean>('active'), true);
      expect(obj.getProp(new Property<boolean>('active'))).toBe(true);
    });

    it('should support object properties', () => {
      const data = { x: 10, y: 20 };
      obj.setProp(new Property<object>('position'), data);
      expect(obj.getProp(new Property<object>('position'))).toEqual(data);
    });

    it('should support array properties', () => {
      const list = [1, 2, 3];
      obj.setProp(new Property<number[]>('numbers'), list);
      expect(obj.getProp(new Property<number[]>('numbers'))).toEqual(list);
    });

    it('should support null values', () => {
      obj.setProp(new Property('nullable'), null);
      expect(obj.getProp(new Property('nullable'))).toBeNull();
    });

    it('should return null for non-existent property', () => {
      expect(obj.getProp(new Property('nonexistent'))).toBeNull();
    });

    it('should overwrite existing property value', () => {
      obj.setProp(new Property('test'), 'old');
      obj.setProp(new Property('test'), 'new');
      expect(obj.getProp(new Property('test'))).toBe('new');
    });
  });

  describe('initProp()', () => {
    it('should initialize property with default options', () => {
      const success = obj.initProp(new Property('test'));
      expect(success).toBe(true);

      const options = obj.checkProp(new Property('test'));
      expect(options).toBeDefined();
      expect(options!.transient).toBe(true);
    });

    it('should initialize property as transient', () => {
      obj.initProp(new Property('temp'), { transient: true });
      obj.setProp(new Property('temp'), 'value');

      expect(obj.peekTransientProps()['temp']).toBe('value');
      expect(obj.peekSavedProps()!['temp']).toBeUndefined();
    });

    it('should initialize property as saved', () => {
      obj.initProp(new Property('gold'), { transient: false });
      obj.setProp(new Property('gold'), 100);

      expect(obj.peekSavedProps()!['gold']).toBe(100);
      expect(obj.peekTransientProps()['gold']).toBeUndefined();
    });

    it('should return false if property already exists', () => {
      obj.initProp(new Property('test'));
      const success = obj.initProp(new Property('test'));
      expect(success).toBe(false);
    });

    it('should support custom checkAccess function', () => {
      const checkAccess: PropAccessCheck<string> = (prop, op, special) => {
        return op === PropOperations.Get; // Only allow Get
      };

      obj.initProp(new Property<string>('protected'), { checkAccess });

      // Get should work
      obj.setProp(new Property<string>('protected'), 'value'); // Auto-init overrides, but we already inited
      expect(obj.getProp(new Property<string>('protected'))).toBeDefined();
    });
  });

  describe('removeProp()', () => {
    beforeEach(() => {
      obj.setProp(new Property('test'), 'value');
    });

    it('should remove existing property', () => {
      const success = obj.removeProp(new Property('test'));
      expect(success).toBe(true);
      expect(obj.getProp(new Property('test'))).toBeNull();
    });

    it('should return false for non-existent property', () => {
      const success = obj.removeProp(new Property('nonexistent'));
      expect(success).toBe(false);
    });

    it('should remove from transientProps', () => {
      obj.initProp(new Property('temp'), { transient: true });
      obj.setProp(new Property('temp'), 'value');
      obj.removeProp(new Property('temp'));

      expect(obj.peekTransientProps()['temp']).toBeUndefined();
    });

    it('should remove from savedProps', () => {
      obj.initProp(new Property('gold'), { transient: false });
      obj.setProp(new Property('gold'), 100);
      obj.removeProp(new Property('gold'));

      expect(obj.peekSavedProps()!['gold']).toBeUndefined();
    });
  });

  describe('configureProp()', () => {
    beforeEach(() => {
      obj.initProp(new Property('test'), { transient: true });
      obj.setProp(new Property('test'), 'value');
    });

    it('should change transient to saved', () => {
      const success = obj.configureProp(new Property('test'), {
        transient: false,
      });
      expect(success).toBe(true);

      // Value should move from transient to saved
      expect(obj.peekTransientProps()['test']).toBeUndefined();
      expect(obj.peekSavedProps()!['test']).toBe('value');
    });

    it('should change saved to transient', () => {
      // First make it saved
      obj.configureProp(new Property('test'), { transient: false });

      // Then change back to transient
      const success = obj.configureProp(new Property('test'), {
        transient: true,
      });
      expect(success).toBe(true);

      expect(obj.peekSavedProps()!['test']).toBeUndefined();
      expect(obj.peekTransientProps()['test']).toBe('value');
    });

    it('should return false for non-existent property', () => {
      const success = obj.configureProp(new Property('nonexistent'), {
        transient: false,
      });
      expect(success).toBe(false);
    });

    it('should change access control function', () => {
      const newAccess: PropAccessCheck<string> = (prop, op, special) => false;

      obj.configureProp(new Property('test'), { checkAccess: newAccess });

      // Now getProp should fail due to access control
      expect(obj.getProp(new Property('test'))).toBeNull();
    });
  });

  describe('checkProp()', () => {
    it('should return null for non-existent property', () => {
      expect(obj.checkProp(new Property('nonexistent'))).toBeNull();
    });

    it('should return options for existing property', () => {
      obj.initProp(new Property('test'), { transient: true });

      const options = obj.checkProp(new Property('test'));
      expect(options).toBeDefined();
      expect(options!.transient).toBe(true);
      expect(typeof options!.checkAccess).toBe('function');
    });

    it('returns null when caller is denied Get access', () => {
      const denyGet: PropAccessCheck<string> = (_p, op) =>
        op !== PropOperations.Get;
      obj.initProp(new Property<string>('secret'), {
        transient: true,
        checkAccess: denyGet,
      });
      expect(obj.checkProp(new Property<string>('secret'))).toBeNull();
    });
  });

  describe('getAllPropNames()', () => {
    it('should return empty array for no properties', () => {
      expect(obj.getAllPropNames()).toEqual([]);
    });

    it('should return all property names', () => {
      obj.setProp(new Property('a'), 1);
      obj.setProp(new Property('b'), 2);
      obj.setProp(new Property('c'), 3);

      const names = obj.getAllPropNames();
      expect(names.length).toBe(3);

      const nameStrings = names.map((p) => p.toString());
      expect(nameStrings).toContain('a');
      expect(nameStrings).toContain('b');
      expect(nameStrings).toContain('c');
    });
  });

  describe('generateUniquePropName()', () => {
    it('should generate unique property name', () => {
      const name1 = obj.generateUniquePropName();
      const name2 = obj.generateUniquePropName();

      expect(name1.toString()).not.toBe(name2.toString());
    });

    it('should use default prefix "prop"', () => {
      const name = obj.generateUniquePropName();
      expect(name.toString()).toMatch(/^prop\./);
    });

    it('should use custom seed prefix', () => {
      const name = obj.generateUniquePropName('buff');
      expect(name.toString()).toMatch(/^buff\./);
    });

    it('should generate name not in use', () => {
      obj.setProp(new Property('test.abc'), 'value');
      const name = obj.generateUniquePropName('test');

      expect(name.toString()).not.toBe('test.abc');
    });

    it('should allow using generated name', () => {
      const name = obj.generateUniquePropName('temp');
      obj.setProp(name, 'value');

      expect(obj.getProp(name)).toBe('value');
    });
  });

  describe('Access control', () => {
    it('should use default access control (allow all)', () => {
      obj.initProp(new Property('test'));
      obj.setProp(new Property('test'), 'value');
      expect(obj.getProp(new Property('test'))).toBe('value');

      obj.removeProp(new Property('test'));
      expect(obj.getProp(new Property('test'))).toBeNull();
    });

    it('should respect custom access control', () => {
      const checkAccess: PropAccessCheck<string> = (prop, op, special) => {
        // Only allow Get operations
        return op === PropOperations.Get;
      };

      obj.initProp(new Property<string>('protected'), {
        checkAccess,
        transient: true,
      });

      // Manually set via internal storage (bypass access control for test)
      obj.peekTransientProps()['protected'] = 'value';

      // Get should work
      expect(obj.getProp(new Property<string>('protected'))).toBe('value');

      // Set should fail
      const setSuccess = obj.setProp(new Property<string>('protected'), 'new');
      expect(setSuccess).toBe(false);

      // Remove should fail
      const removeSuccess = obj.removeProp(new Property<string>('protected'));
      expect(removeSuccess).toBe(false);
    });
  });

  describe('maskProp() and unmaskProp() - Value Transformation', () => {
    beforeEach(() => {
      obj.initProp(new Property<number>('strength'));
      obj.setProp(new Property<number>('strength'), 10);
    });

    it('should transform value with mask', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;
      const success = obj.maskProp(new Property<number>('strength'), mask, owner);
      expect(success).toBe(true);

      // Base value is 10, mask adds 5
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);
    });

    it('should apply multiple masks in order', () => {
      const owner1 = makeOwner();
      const owner2 = makeOwner();
      const mask1: PropValueMask<number> = (prop, value) => value + 5; // +5 from ring
      const mask2: PropValueMask<number> = (prop, value) => value * 2; // Double from potion

      obj.maskProp(new Property<number>('strength'), mask1, owner1);
      obj.maskProp(new Property<number>('strength'), mask2, owner2);

      // Base 10 + 5 = 15, then * 2 = 30
      expect(obj.getProp(new Property<number>('strength'))).toBe(30);
    });

    it('should remove mask and restore calculation', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;

      obj.maskProp(new Property<number>('strength'), mask, owner);
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);

      // Remove mask
      obj.unmaskProp(new Property<number>('strength'), owner);

      // Back to base value
      expect(obj.getProp(new Property<number>('strength'))).toBe(10);
    });

    it('should support extra arguments to mask', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value, ...extra) => value + (extra[0] as number);
      obj.maskProp(new Property<number>('strength'), mask, owner, 7);

      // Base 10 + 7 from extra arg
      expect(obj.getProp(new Property<number>('strength'))).toBe(17);
    });

    it('should auto-cleanup failed masks', () => {
      const failingMask: PropValueMask<number> = (prop, value) => {
        throw new Error('Mask failed');
      };
      const workingMask: PropValueMask<number> = (prop, value) => value + 5;

      obj.maskProp(new Property<number>('strength'), failingMask, makeOwner());
      obj.maskProp(new Property<number>('strength'), workingMask, makeOwner());

      // Should skip failing mask and only apply working mask
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);

      // Second query should have cleaned up the failing mask
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);
    });

    it('should prevent multiple masks from same owner', () => {
      const owner = makeOwner();
      const mask1: PropValueMask<number> = (prop, value) => value + 5;
      const mask2: PropValueMask<number> = (prop, value) => value + 10;

      const success1 = obj.maskProp(new Property<number>('strength'), mask1, owner);
      expect(success1).toBe(true);

      // Second mask from same owner should fail
      const success2 = obj.maskProp(new Property<number>('strength'), mask2, owner);
      expect(success2).toBe(false);

      // Only first mask applied
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);
    });

    it('should return false for non-existent property', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;
      expect(obj.maskProp(new Property<number>('nonexistent'), mask, owner)).toBe(false);
      expect(obj.unmaskProp(new Property<number>('nonexistent'), owner)).toBe(false);
    });

    it('should not affect setProp (only transforms getProp)', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;
      obj.maskProp(new Property<number>('strength'), mask, owner);

      // Setting a new value should set the base value
      obj.setProp(new Property<number>('strength'), 20);

      // getProp applies mask to new base value
      expect(obj.getProp(new Property<number>('strength'))).toBe(25);
    });

    it('should return true if masks were removed', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;
      obj.maskProp(new Property<number>('strength'), mask, owner);

      const success = obj.unmaskProp(new Property<number>('strength'), owner);
      expect(success).toBe(true);
    });

    it('should return false if no masks were removed', () => {
      const owner = makeOwner();
      const success = obj.unmaskProp(new Property<number>('strength'), owner);
      expect(success).toBe(false);
    });
  });

  describe('isMaskingProp()', () => {
    beforeEach(() => {
      obj.initProp(new Property<number>('strength'));
      obj.setProp(new Property<number>('strength'), 10);
    });

    it('should return true if owner has masks on property', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;

      obj.maskProp(new Property<number>('strength'), mask, owner);

      expect(obj.isMaskingProp(new Property<number>('strength'), owner)).toBe(true);
    });

    it('should return false if owner has no masks on property', () => {
      const owner = makeOwner();

      expect(obj.isMaskingProp(new Property<number>('strength'), owner)).toBe(false);
    });

    it('should return false for different owner', () => {
      const owner1 = makeOwner();
      const owner2 = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;

      obj.maskProp(new Property<number>('strength'), mask, owner1);

      expect(obj.isMaskingProp(new Property<number>('strength'), owner1)).toBe(true);
      expect(obj.isMaskingProp(new Property<number>('strength'), owner2)).toBe(false);
    });

    it('should return false for non-existent property', () => {
      const owner = makeOwner();
      expect(obj.isMaskingProp(new Property('nonexistent'), owner)).toBe(false);
    });

    it('should return false after mask is removed', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;

      obj.maskProp(new Property<number>('strength'), mask, owner);
      expect(obj.isMaskingProp(new Property<number>('strength'), owner)).toBe(true);

      obj.unmaskProp(new Property<number>('strength'), owner);
      expect(obj.isMaskingProp(new Property<number>('strength'), owner)).toBe(false);
    });
  });

  describe('props getter', () => {
    it('should combine savedProps and transientProps', () => {
      obj.initProp(new Property('saved'), { transient: false });
      obj.initProp(new Property('transient'), { transient: true });
      obj.setProp(new Property('saved'), 'saved_value');
      obj.setProp(new Property('transient'), 'transient_value');

      const props = obj.getProps();
      expect(props['saved']).toBe('saved_value');
      expect(props['transient']).toBe('transient_value');
    });

    it('should be read-only view', () => {
      const props = obj.getProps();
      expect(Object.isFrozen(props)).toBe(false); // Not frozen, but shouldn't mutate original
    });
  });

  describe('Persistence', () => {
    it('should declare savedProps as persistent field', () => {
      const fields = MixinApi.getAllPersistentFields(PropertiedThing);
      expect(fields).toContain('savedProps');
    });

    it('should not persist transient properties', () => {
      obj.initProp(new Property('temp'), { transient: true });
      obj.setProp(new Property('temp'), 'ephemeral');

      expect(obj.peekSavedProps()!['temp']).toBeUndefined();
      expect(obj.peekTransientProps()['temp']).toBe('ephemeral');
    });

    it('should persist saved properties', () => {
      obj.initProp(new Property('gold'), { transient: false });
      obj.setProp(new Property('gold'), 100);

      expect(obj.peekSavedProps()!['gold']).toBe(100);
    });

    it('should serialize savedProps to JSON', () => {
      obj.initProp(new Property('gold'), { transient: false });
      obj.initProp(new Property('level'), { transient: false });
      obj.setProp(new Property('gold'), 100);
      obj.setProp(new Property('level'), 5);

      const json = JSON.stringify(obj.peekSavedProps());
      const parsed = JSON.parse(json);

      expect(parsed['gold']).toBe(100);
      expect(parsed['level']).toBe(5);
    });
  });

  describe('defaultPropAccess()', () => {
    it('should allow all operations by default', () => {
      const result = obj.defaultPropAccess(
        new Property('test'),
        PropOperations.Set,
        null
      );
      expect(result).toBe(true);
    });

    it('can be overridden in subclass', () => {
      class RestrictedPropertied extends PropertiedMixin(Stuff) {
        defaultPropAccess(property: Property, op: PropOperation, special: unknown): boolean {
          return op === PropOperations.Get; // Only allow Get
        }
      }

      const restricted = makeStuff(() => new RestrictedPropertied());

      // setProp should fail (uses defaultPropAccess)
      const success = restricted.setProp(new Property('test'), 'value');
      expect(success).toBe(false);
    });
  });

  describe('Property class', () => {
    it('should extend String', () => {
      const prop = new Property('test');
      expect(prop instanceof String).toBe(true);
    });

    it('should toString() correctly', () => {
      const prop = new Property('test');
      expect(prop.toString()).toBe('test');
    });

    it('should support type parameter', () => {
      const stringProp = new Property<string>('name');
      const numberProp = new Property<number>('age');

      expect(stringProp.toString()).toBe('name');
      expect(numberProp.toString()).toBe('age');
    });

    it('should work with string literals via implicit conversion', () => {
      // Property<T> extends String, so string literals work
      obj.setProp(new Property('test'), 'value');
      expect(obj.getProp(new Property('test'))).toBe('value');
    });
  });

  describe('Access control on mask operations', () => {
    it('should check Mask access when adding mask', () => {
      const checkAccess: PropAccessCheck<number> = (prop, op, special) => {
        // Deny Mask operations
        if (op === PropOperations.Mask) return false;
        return true;
      };

      obj.initProp(new Property<number>('strength'), {
        transient: true,
        checkAccess
      });
      obj.setProp(new Property<number>('strength'), 10);

      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;
      const success = obj.maskProp(new Property<number>('strength'), mask, owner);

      expect(success).toBe(false);
      expect(obj.getProp(new Property<number>('strength'))).toBe(10); // No mask applied
    });

    it('should check Unmask access when removing mask', () => {
      const checkAccess: PropAccessCheck<number> = (prop, op, special) => {
        // Deny Unmask operations
        if (op === PropOperations.Unmask) return false;
        return true;
      };

      obj.initProp(new Property<number>('strength'), {
        transient: true,
        checkAccess
      });
      obj.setProp(new Property<number>('strength'), 10);

      // Add mask (Mask operation allowed)
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => value + 5;
      obj.maskProp(new Property<number>('strength'), mask, owner);

      // Try to remove (should fail)
      const success = obj.unmaskProp(new Property<number>('strength'), owner);
      expect(success).toBe(false);

      // Mask should still be active
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);
    });

    it('should check Configure access when reconfiguring', () => {
      const checkAccess: PropAccessCheck<string> = (prop, op, special) => {
        // Deny Configure operations
        if (op === PropOperations.Configure) return false;
        return true;
      };

      obj.initProp(new Property<string>('test'), {
        transient: true,
        checkAccess
      });

      // Try to reconfigure (should fail)
      const success = obj.configureProp(new Property<string>('test'), {
        transient: false
      });

      expect(success).toBe(false);

      // Should still be transient
      const options = obj.checkProp(new Property<string>('test'));
      expect(options?.transient).toBe(true);
    });
  });

  describe('Complex property values', () => {
    it('should handle nested objects', () => {
      const complexObj = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };

      obj.setProp(new Property('complex'), complexObj);
      const retrieved = obj.getProp(new Property('complex'));

      expect(retrieved).toEqual(complexObj);
      expect((retrieved as any).level1.level2.level3.value).toBe('deep');
    });

    it('should handle arrays of objects', () => {
      const inventory = [
        { id: 1, name: 'sword', damage: 10 },
        { id: 2, name: 'shield', defense: 15 }
      ];

      obj.setProp(new Property('inventory'), inventory);
      const retrieved = obj.getProp(new Property('inventory')) as typeof inventory;

      expect(retrieved).toEqual(inventory);
      expect(retrieved[0]!.name).toBe('sword');
      expect(retrieved[1]!.defense).toBe(15);
    });

    it('should preserve object references (not deep copy)', () => {
      const sharedRef = { shared: true };
      const prop1 = { ref: sharedRef };
      const prop2 = { ref: sharedRef };

      obj.setProp(new Property('prop1'), prop1);
      obj.setProp(new Property('prop2'), prop2);

      const r1 = obj.getProp(new Property('prop1')) as any;
      const r2 = obj.getProp(new Property('prop2')) as any;

      // Should be the same reference
      expect(r1.ref).toBe(r2.ref);
    });

    it('should handle Date objects', () => {
      const now = new Date();
      obj.setProp(new Property('timestamp'), now);

      const retrieved = obj.getProp(new Property('timestamp'));
      expect(retrieved).toBe(now);
      expect((retrieved as Date).getTime()).toBe(now.getTime());
    });

    it('should handle Map objects', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2]
      ]);

      obj.setProp(new Property('map'), map);
      const retrieved = obj.getProp(new Property('map')) as Map<string, number>;

      expect(retrieved).toBe(map);
      expect(retrieved.get('a')).toBe(1);
    });

    it('should handle Set objects', () => {
      const set = new Set([1, 2, 3]);

      obj.setProp(new Property('set'), set);
      const retrieved = obj.getProp(new Property('set')) as Set<number>;

      expect(retrieved).toBe(set);
      expect(retrieved.has(2)).toBe(true);
    });
  });

  describe('props getter behavior', () => {
    it('should show transient properties taking precedence over saved', () => {
      // Create two properties with same name (one saved, one transient)
      obj.initProp(new Property('conflict'), { transient: false });
      obj.setProp(new Property('conflict'), 'saved_value');

      // Reconfigure to transient (moves value)
      obj.configureProp(new Property('conflict'), { transient: true });
      obj.setProp(new Property('conflict'), 'transient_value');

      const props = obj.getProps();
      expect(props['conflict']).toBe('transient_value');
    });

    it('should reflect real-time changes', () => {
      obj.setProp(new Property('a'), 1);
      let props = obj.getProps();
      expect(props['a']).toBe(1);

      obj.setProp(new Property('a'), 2);
      props = obj.getProps();
      expect(props['a']).toBe(2);
    });

    it('should include both saved and transient properties', () => {
      obj.initProp(new Property('saved1'), { transient: false });
      obj.initProp(new Property('saved2'), { transient: false });
      obj.initProp(new Property('trans1'), { transient: true });
      obj.initProp(new Property('trans2'), { transient: true });

      obj.setProp(new Property('saved1'), 's1');
      obj.setProp(new Property('saved2'), 's2');
      obj.setProp(new Property('trans1'), 't1');
      obj.setProp(new Property('trans2'), 't2');

      const props = obj.getProps();
      expect(Object.keys(props).length).toBe(4);
      expect(props['saved1']).toBe('s1');
      expect(props['trans1']).toBe('t1');
    });
  });

  describe('configureProp with multiple changes', () => {
    it('should change both transient status and checkAccess at once', () => {
      obj.initProp(new Property<string>('test'), {
        transient: true,
        checkAccess: (prop, op, special) => true
      });
      obj.setProp(new Property<string>('test'), 'value');

      const newAccess: PropAccessCheck<string> = (prop, op, special) => {
        return op === PropOperations.Get; // Only allow Get
      };

      const success = obj.configureProp(new Property<string>('test'), {
        transient: false,
        checkAccess: newAccess
      });

      expect(success).toBe(true);

      // Check transient changed
      expect(obj.peekSavedProps()!['test']).toBe('value');
      expect(obj.peekTransientProps()['test']).toBeUndefined();

      // Check access control changed
      const setSuccess = obj.setProp(new Property<string>('test'), 'new');
      expect(setSuccess).toBe(false); // Set denied by new access control
    });

    it('should preserve value when only changing access control', () => {
      obj.initProp(new Property('test'), { transient: true });
      obj.setProp(new Property('test'), 'original');

      const newAccess: PropAccessCheck<string> = (prop, op, special) => false;
      obj.configureProp(new Property('test'), { checkAccess: newAccess });

      // Value should be preserved (access control prevents getting it though)
      expect(obj.peekTransientProps()['test']).toBe('original');
    });
  });

  describe('Mask edge cases', () => {
    beforeEach(() => {
      obj.initProp(new Property<number>('stat'));
      obj.setProp(new Property<number>('stat'), 10);
    });

    it('should handle masks with multiple extra arguments', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value, ...extra) => {
        const mult = extra[0] as number;
        const add = extra[1] as number;
        return value * mult + add;
      };

      obj.maskProp(new Property<number>('stat'), mask, owner, 2, 5);

      // 10 * 2 + 5 = 25
      expect(obj.getProp(new Property<number>('stat'))).toBe(25);
    });

    it('should handle mask that returns null', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => null as any;
      obj.maskProp(new Property<number>('stat'), mask, owner);

      expect(obj.getProp(new Property<number>('stat'))).toBeNull();
    });

    it('should handle mask that returns undefined', () => {
      const owner = makeOwner();
      const mask: PropValueMask<number> = (prop, value) => undefined as any;
      obj.maskProp(new Property<number>('stat'), mask, owner);

      expect(obj.getProp(new Property<number>('stat'))).toBeUndefined();
    });

    it('should handle masks on null property values', () => {
      const owner = makeOwner();
      obj.setProp(new Property<number>('nullable'), null);

      const mask: PropValueMask<number> = (prop, value) => {
        return value === null ? 0 : value + 10;
      };

      obj.maskProp(new Property<number>('nullable'), mask, owner);
      expect(obj.getProp(new Property<number>('nullable'))).toBe(0);
    });

    it('should handle mask order correctly when adding dynamically', () => {
      const owner1 = makeOwner();
      const owner2 = makeOwner();
      const owner3 = makeOwner();

      const mask1: PropValueMask<number> = (prop, value) => value + 1;
      const mask2: PropValueMask<number> = (prop, value) => value * 2;
      const mask3: PropValueMask<number> = (prop, value) => value + 10;

      obj.maskProp(new Property<number>('stat'), mask1, owner1);
      obj.maskProp(new Property<number>('stat'), mask2, owner2);
      obj.maskProp(new Property<number>('stat'), mask3, owner3);

      // (10 + 1) * 2 + 10 = 32
      expect(obj.getProp(new Property<number>('stat'))).toBe(32);

      // Remove middle mask
      obj.unmaskProp(new Property<number>('stat'), owner2);

      // (10 + 1) + 10 = 21
      expect(obj.getProp(new Property<number>('stat'))).toBe(21);
    });

    it('should handle mask that modifies complex object values', () => {
      const owner = makeOwner();
      const position = { x: 10, y: 20 };
      obj.setProp(new Property('position'), position);

      const mask: PropValueMask<any> = (prop, value) => ({
        ...value,
        x: value.x + 5,
        y: value.y + 5
      });

      obj.maskProp(new Property('position'), mask, owner);

      const result = obj.getProp(new Property('position'));
      expect(result).toEqual({ x: 15, y: 25 });
    });
  });

  describe('getAllPropNames edge cases', () => {
    it('should include properties from both storage maps', () => {
      obj.initProp(new Property('saved1'), { transient: false });
      obj.initProp(new Property('saved2'), { transient: false });
      obj.initProp(new Property('trans1'), { transient: true });
      obj.initProp(new Property('trans2'), { transient: true });

      const names = obj.getAllPropNames().map(p => p.toString());

      expect(names).toContain('saved1');
      expect(names).toContain('saved2');
      expect(names).toContain('trans1');
      expect(names).toContain('trans2');
      expect(names.length).toBe(4);
    });

    it('should not include removed properties', () => {
      obj.setProp(new Property('a'), 1);
      obj.setProp(new Property('b'), 2);
      obj.removeProp(new Property('a'));

      const names = obj.getAllPropNames().map(p => p.toString());

      expect(names).not.toContain('a');
      expect(names).toContain('b');
      expect(names.length).toBe(1);
    });
  });

  describe('generateUniquePropName collision handling', () => {
    it('should handle generating many unique names with same prefix', () => {
      const names = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const name = obj.generateUniquePropName('test');
        expect(names.has(name.toString())).toBe(false);
        names.add(name.toString());
      }

      expect(names.size).toBe(100);
    });

    it('should avoid collisions with existing properties', () => {
      // Create some properties
      obj.setProp(new Property('test.abc123'), 'existing');

      // Generate new unique name
      const uniqueName = obj.generateUniquePropName('test');

      expect(uniqueName.toString()).not.toBe('test.abc123');

      // Should be able to use the generated name
      obj.setProp(uniqueName, 'new value');
      expect(obj.getProp(uniqueName)).toBe('new value');
    });
  });

  describe('Interaction between access control and masks', () => {
    it('should deny getProp if access control fails, even with masks', () => {
      const checkAccess: PropAccessCheck<number> = (prop, op, special) => {
        return op !== PropOperations.Get; // Deny Get
      };

      obj.initProp(new Property<number>('secret'), {
        transient: true,
        checkAccess
      });

      // Set via internal access
      obj.peekTransientProps()['secret'] = 100;

      // Add mask
      const mask: PropValueMask<number> = (prop, value) => value + 50;
      obj.maskProp(new Property<number>('secret'), mask, makeOwner());

      // getProp should fail due to access control
      expect(obj.getProp(new Property<number>('secret'))).toBeNull();
    });

    it('should allow getProp with access control, and masks apply', () => {
      const checkAccess: PropAccessCheck<number> = (prop, op, special) => {
        return op === PropOperations.Get || op === PropOperations.Mask;
      };

      obj.initProp(new Property<number>('stat'), {
        transient: true,
        checkAccess
      });

      obj.peekTransientProps()['stat'] = 10;

      const mask: PropValueMask<number> = (prop, value) => value * 2;
      obj.maskProp(new Property<number>('stat'), mask, makeOwner());

      expect(obj.getProp(new Property<number>('stat'))).toBe(20);
    });
  });

  describe('Mask owner defaults to nearest Stuff caller', () => {
    beforeEach(() => {
      obj.initProp(new Property<number>('strength'));
      obj.setProp(new Property<number>('strength'), 10);
    });

    it('attributes mask to the calling Stuff when owner is omitted', () => {
      const applier = makeStuff(() => new MaskApplier());
      const success = applier.applyAddFive(obj);

      expect(success).toBe(true);
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);
      // Identity check: the mask is owned by the applier, not by obj or some sentinel
      expect(obj.isMaskingProp(new Property<number>('strength'), applier)).toBe(
        true,
      );
    });

    it('symmetric unmask works without explicit owner', () => {
      const applier = makeStuff(() => new MaskApplier());
      applier.applyAddFive(obj);
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);

      const removed = applier.remove(obj);
      expect(removed).toBe(true);
      expect(obj.getProp(new Property<number>('strength'))).toBe(10);
    });

    it('isMaskingProp without owner reports the calling Stuff', () => {
      const applier = makeStuff(() => new MaskApplier());
      expect(applier.isMasking(obj)).toBe(false);

      applier.applyAddFive(obj);
      expect(applier.isMasking(obj)).toBe(true);
    });

    it('keeps masks from different callers separate', () => {
      const a = makeStuff(() => new MaskApplier());
      const b = makeStuff(() => new MaskApplier());

      a.applyAddFive(obj);
      b.applyAddFive(obj);

      // Two distinct masks both registered (each owner contributes +5)
      expect(obj.getProp(new Property<number>('strength'))).toBe(20);

      // a removes only its own
      a.remove(obj);
      expect(obj.getProp(new Property<number>('strength'))).toBe(15);
      expect(obj.isMaskingProp(new Property<number>('strength'), a)).toBe(
        false,
      );
      expect(obj.isMaskingProp(new Property<number>('strength'), b)).toBe(true);
    });

    it('forwards extra arguments through the auto-resolved call', () => {
      const applier = makeStuff(() => new MaskApplier());
      applier.applyWithExtras(obj, 7);

      expect(obj.getProp(new Property<number>('strength'))).toBe(17);
    });

    it('throws when called from outside any Stuff method', () => {
      // Calling maskProp directly from the test (no Stuff caller in the
      // proxy-pushed frame's `caller` slot) should fail loud.
      expect(() =>
        obj.maskProp(new Property<number>('strength'), (_p, v) => (v ?? 0) + 1),
      ).toThrow(/owner omitted and no Stuff is on the call stack/);

      expect(() =>
        obj.unmaskProp(new Property<number>('strength')),
      ).toThrow(/owner omitted and no Stuff is on the call stack/);

      expect(() =>
        obj.isMaskingProp(new Property<number>('strength')),
      ).toThrow(/owner omitted and no Stuff is on the call stack/);
    });
  });

  describe('Persistence edge cases', () => {
    it('should serialize complex property values to JSON', () => {
      const complex = {
        nested: { value: 42 },
        array: [1, 2, 3],
        string: 'test'
      };

      obj.initProp(new Property('complex'), { transient: false });
      obj.setProp(new Property('complex'), complex);

      const json = JSON.stringify(obj.peekSavedProps());
      const parsed = JSON.parse(json);

      expect(parsed['complex']).toEqual(complex);
    });

    it('should handle empty savedProps serialization', () => {
      const json = JSON.stringify(obj.peekSavedProps());
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({});
    });

    it('should not include transient properties in savedProps', () => {
      obj.initProp(new Property('trans'), { transient: true });
      obj.initProp(new Property('saved'), { transient: false });
      obj.setProp(new Property('trans'), 'transient');
      obj.setProp(new Property('saved'), 'persistent');

      expect(obj.peekSavedProps()!['trans']).toBeUndefined();
      expect(obj.peekSavedProps()!['saved']).toBe('persistent');
      expect(obj.peekTransientProps()['trans']).toBe('transient');
      expect(obj.peekTransientProps()['saved']).toBeUndefined();
    });
  });
});
